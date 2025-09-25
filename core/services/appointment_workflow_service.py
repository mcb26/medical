from datetime import datetime, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.models import Appointment, BillingCycle, BillingItem


class AppointmentWorkflowService:
    """
    Service für automatische Workflow-Status-Änderungen bei Terminen
    """
    
    @staticmethod
    def process_completed_appointments():
        """
        Verarbeitet alle abgeschlossenen Termine und setzt sie auf 'ready_to_bill'
        wenn sie abrechnungsfähig sind.
        """
        completed_appointments = Appointment.objects.filter(
            status='completed',
            appointment_date__lt=timezone.now() - timedelta(hours=1)  # Mindestens 1 Stunde alt
        ).select_related(
            'prescription',
            'prescription__patient_insurance',
            'treatment'
        )
        
        processed_count = 0
        errors = []
        
        for appointment in completed_appointments:
            try:
                if appointment.mark_as_ready_to_bill():
                    processed_count += 1
                    print(f"✅ Termin {appointment.id} auf 'ready_to_bill' gesetzt")
                else:
                    print(f"⚠️  Termin {appointment.id} kann nicht abgerechnet werden")
            except Exception as e:
                error_msg = f"Fehler bei Termin {appointment.id}: {str(e)}"
                errors.append(error_msg)
                print(f"❌ {error_msg}")
        
        return {
            'processed_count': processed_count,
            'errors': errors
        }
    
    @staticmethod
    def validate_appointment_for_billing(appointment):
        """
        Validiert ob ein Termin abgerechnet werden kann
        """
        errors = []
        
        # Prüfe Status
        if appointment.status != 'ready_to_bill':
            errors.append(f"Status muss 'ready_to_bill' sein, ist aber '{appointment.status}'")
        
        # Prüfe ob bereits abgerechnet
        if BillingItem.objects.filter(appointment=appointment).exists():
            errors.append("Termin wurde bereits abgerechnet")
        
        # Prüfe Verordnung (außer bei Selbstzahler)
        if not appointment.is_self_pay():
            if not appointment.prescription:
                errors.append("Keine Verordnung vorhanden")
            elif not appointment.prescription.patient_insurance:
                errors.append("Keine gültige Krankenkasse in der Verordnung")
        
        # Prüfe Behandlung
        if not appointment.treatment:
            errors.append("Keine Behandlung zugeordnet")
        
        # Prüfe Abrechnungsbeträge
        billing_amount = appointment.get_billing_amount()
        if not billing_amount:
            errors.append("Keine Abrechnungsbeträge verfügbar")
        
        return errors
    
    @staticmethod
    def auto_create_billing_cycles():
        """
        Erstellt automatisch Abrechnungszyklen für ready_to_bill Termine
        """
        from core.services.bulk_billing_service import BulkBillingService
        
        # Finde alle ready_to_bill Termine
        ready_appointments = Appointment.objects.filter(
            status='ready_to_bill'
        ).select_related(
            'prescription__patient_insurance__insurance_provider'
        )
        
        if not ready_appointments.exists():
            return {'message': 'Keine ready_to_bill Termine gefunden'}
        
        # Gruppiere nach Krankenkasse und Zeitraum
        insurance_periods = {}
        for appointment in ready_appointments:
            # Prüfe ob Verordnung und Krankenkasse vorhanden sind
            if not appointment.prescription or not appointment.prescription.patient_insurance:
                print(f"⚠️  Termin {appointment.id} hat keine gültige Verordnung/Krankenkasse - überspringe")
                continue
                
            provider = appointment.prescription.patient_insurance.insurance_provider
            date = appointment.appointment_date.date()
            
            if provider not in insurance_periods:
                insurance_periods[provider] = {'start': date, 'end': date}
            else:
                insurance_periods[provider]['start'] = min(insurance_periods[provider]['start'], date)
                insurance_periods[provider]['end'] = max(insurance_periods[provider]['end'], date)
        
        # Erstelle Abrechnungszyklen
        created_cycles = []
        for provider, period in insurance_periods.items():
            try:
                # Prüfe ob bereits ein Zyklus existiert
                existing_cycle = BillingCycle.objects.filter(
                    insurance_provider=provider,
                    start_date__lte=period['end'],
                    end_date__gte=period['start']
                ).first()
                
                if existing_cycle:
                    print(f"⚠️  Zyklus für {provider.name} bereits vorhanden: {existing_cycle.id}")
                    continue
                
                # Erstelle neuen Zyklus
                cycle = BillingCycle.objects.create(
                    insurance_provider=provider,
                    start_date=period['start'],
                    end_date=period['end'],
                    status='draft'
                )
                created_cycles.append(cycle)
                print(f"✅ Neuer Abrechnungszyklus erstellt: {cycle.id} für {provider.name}")
                
            except Exception as e:
                print(f"❌ Fehler beim Erstellen des Zyklus für {provider.name}: {str(e)}")
        
        return {
            'created_cycles': len(created_cycles),
            'cycles': created_cycles
        }
    
    @staticmethod
    def process_workflow_automation():
        """
        Führt alle automatischen Workflow-Prozesse aus
        """
        results = {}
        
        # 1. Verarbeite abgeschlossene Termine
        print("🔄 Verarbeite abgeschlossene Termine...")
        results['completed_appointments'] = AppointmentWorkflowService.process_completed_appointments()
        
        # 2. Erstelle Abrechnungszyklen
        print("🔄 Erstelle Abrechnungszyklen...")
        results['billing_cycles'] = AppointmentWorkflowService.auto_create_billing_cycles()
        
        return results 