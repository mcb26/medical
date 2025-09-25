import logging
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.models import (
    Prescription, Appointment, BillingItem, PatientInsurance,
    Treatment, Surcharge, InsuranceProvider
)

logger = logging.getLogger(__name__)

class ValidationService:
    """
    Service für umfassende Datenintegritäts-Validierung
    """
    
    @staticmethod
    def validate_prescription_integrity(prescription):
        """
        Validiert die Integrität einer Verordnung
        """
        errors = []
        
        # Prüfe Patient
        if not prescription.patient:
            errors.append("Kein Patient zugeordnet")
        
        # Prüfe Krankenkasse
        if not prescription.patient_insurance:
            errors.append("Keine Krankenkasse zugeordnet")
        else:
            # Prüfe ob die Krankenkasse gültig ist
            if not prescription.patient_insurance.is_valid():
                errors.append("Krankenkasse ist nicht gültig")
        
        # Prüfe Behandlungen
        if not prescription.treatment_1:
            errors.append("Mindestens eine Behandlung muss angegeben werden")
        
        # Prüfe Diagnose
        if not prescription.diagnosis_code:
            errors.append("ICD-Diagnose muss angegeben werden")
        
        # Prüfe Verordnungsdatum
        if prescription.prescription_date > timezone.now().date():
            errors.append("Verordnungsdatum kann nicht in der Zukunft liegen")
        
        # Prüfe Anzahl Einheiten
        if prescription.number_of_sessions <= 0:
            errors.append("Anzahl der Einheiten muss größer als 0 sein")
        
        return errors
    
    @staticmethod
    def validate_appointment_integrity(appointment):
        """
        Validiert die Integrität eines Termins
        """
        errors = []
        
        # Prüfe Patient
        if not appointment.patient:
            errors.append("Kein Patient zugeordnet")
        
        # Prüfe Behandler
        if not appointment.practitioner:
            errors.append("Kein Behandler zugeordnet")
        
        # Prüfe Behandlung
        if not appointment.treatment:
            errors.append("Keine Behandlung zugeordnet")
        
        # Prüfe Termindatum
        if appointment.appointment_date < timezone.now() - timezone.timedelta(days=365):
            errors.append("Termin kann nicht mehr als 1 Jahr in der Vergangenheit liegen")
        
        # Prüfe Dauer
        if appointment.duration_minutes <= 0:
            errors.append("Behandlungsdauer muss größer als 0 sein")
        
        # Prüfe Verordnung (außer bei Selbstzahler)
        if not appointment.is_self_pay():
            if not appointment.prescription:
                errors.append("Keine Verordnung vorhanden (außer bei Selbstzahler)")
            else:
                # Prüfe ob die Verordnung gültig ist
                prescription_errors = ValidationService.validate_prescription_integrity(appointment.prescription)
                if prescription_errors:
                    errors.extend([f"Verordnungsfehler: {error}" for error in prescription_errors])
        
        # Prüfe Raum-Verfügbarkeit
        if appointment.room:
            # Hier könnte eine komplexere Raum-Verfügbarkeitsprüfung implementiert werden
            pass
        
        return errors
    
    @staticmethod
    def validate_billing_integrity(billing_item):
        """
        Validiert die Integrität einer Abrechnungsposition
        """
        errors = []
        
        # Prüfe Abrechnungszyklus
        if not billing_item.billing_cycle:
            errors.append("Kein Abrechnungszyklus zugeordnet")
        
        # Prüfe Termin
        if not billing_item.appointment:
            errors.append("Kein Termin zugeordnet")
        
        # Prüfe Behandlung
        if not billing_item.treatment:
            errors.append("Keine Behandlung zugeordnet")
        
        # Prüfe Beträge
        if billing_item.insurance_amount < 0:
            errors.append("KK-Betrag kann nicht negativ sein")
        
        if billing_item.patient_copay < 0:
            errors.append("Zuzahlung kann nicht negativ sein")
        
        # Prüfe Surcharge (außer bei Selbstzahler)
        if billing_item.prescription and not billing_item.appointment.is_self_pay():
            try:
                surcharge = Surcharge.objects.get(
                    treatment=billing_item.treatment,
                    insurance_provider_group=billing_item.prescription.patient_insurance.insurance_provider.group,
                    valid_from__lte=billing_item.appointment.appointment_date.date(),
                    valid_until__gte=billing_item.appointment.appointment_date.date()
                )
                
                # Prüfe ob die Beträge mit der Surcharge übereinstimmen
                if surcharge.insurance_payment != billing_item.insurance_amount:
                    errors.append(f"KK-Betrag stimmt nicht mit Surcharge überein: {surcharge.insurance_payment} vs {billing_item.insurance_amount}")
                
                if surcharge.patient_payment != billing_item.patient_copay:
                    errors.append(f"Zuzahlung stimmt nicht mit Surcharge überein: {surcharge.patient_payment} vs {billing_item.patient_copay}")
                    
            except Surcharge.DoesNotExist:
                errors.append("Keine gültige Surcharge für diesen Termin gefunden")
        
        return errors
    
    @staticmethod
    def validate_treatment_legs_codes():
        """
        Validiert die LEGS-Codes aller Behandlungen
        """
        errors = []
        
        treatments = Treatment.objects.all()
        
        for treatment in treatments:
            treatment_errors = []
            
            # Prüfe ob LEGS-Code oder AC/TK vorhanden sind
            if not treatment.legs_code and not (treatment.accounting_code and treatment.tariff_indicator):
                treatment_errors.append("Weder LEGS-Code noch AC/TK angegeben")
            
            # Prüfe AC-Länge
            if treatment.accounting_code and len(str(treatment.accounting_code)) != 3:
                treatment_errors.append("Abrechnungscode muss 3-stellig sein")
            
            # Prüfe TK-Länge
            if treatment.tariff_indicator and len(str(treatment.tariff_indicator)) != 2:
                treatment_errors.append("Tarifkennzeichen muss 2-stellig sein")
            
            if treatment_errors:
                errors.append(f"Behandlung '{treatment.treatment_name}' (ID: {treatment.id}): {', '.join(treatment_errors)}")
        
        return errors
    
    @staticmethod
    def validate_insurance_provider_integrity():
        """
        Validiert die Integrität der Krankenkassen
        """
        errors = []
        
        providers = InsuranceProvider.objects.all()
        
        for provider in providers:
            provider_errors = []
            
            # Prüfe Name
            if not provider.name:
                provider_errors.append("Kein Name angegeben")
            
            # Prüfe Gruppe
            if not provider.group:
                provider_errors.append("Keine Gruppe zugeordnet")
            
            # Prüfe ob Patienten mit dieser Krankenkasse existieren
            if not PatientInsurance.objects.filter(insurance_provider=provider).exists():
                provider_errors.append("Keine Patienten mit dieser Krankenkasse")
            
            if provider_errors:
                errors.append(f"Krankenkasse '{provider.name}' (ID: {provider.id}): {', '.join(provider_errors)}")
        
        return errors
    
    @staticmethod
    def run_full_validation():
        """
        Führt eine vollständige Validierung aller Daten durch
        """
        results = {
            'prescriptions': [],
            'appointments': [],
            'billing_items': [],
            'treatments': [],
            'insurance_providers': [],
            'summary': {
                'total_errors': 0,
                'total_warnings': 0
            }
        }
        
        print("🔍 Starte vollständige Datenvalidierung...")
        
        # 1. Validiere Verordnungen
        print("📋 Validiere Verordnungen...")
        prescriptions = Prescription.objects.all()
        for prescription in prescriptions:
            errors = ValidationService.validate_prescription_integrity(prescription)
            if errors:
                results['prescriptions'].append({
                    'id': prescription.id,
                    'patient': prescription.patient.full_name if prescription.patient else 'Unbekannt',
                    'errors': errors
                })
        
        # 2. Validiere Termine
        print("📅 Validiere Termine...")
        appointments = Appointment.objects.all()
        for appointment in appointments:
            errors = ValidationService.validate_appointment_integrity(appointment)
            if errors:
                results['appointments'].append({
                    'id': appointment.id,
                    'patient': appointment.patient.full_name if appointment.patient else 'Unbekannt',
                    'date': appointment.appointment_date,
                    'errors': errors
                })
        
        # 3. Validiere Abrechnungspositionen
        print("💰 Validiere Abrechnungspositionen...")
        billing_items = BillingItem.objects.all()
        for billing_item in billing_items:
            errors = ValidationService.validate_billing_integrity(billing_item)
            if errors:
                results['billing_items'].append({
                    'id': billing_item.id,
                    'appointment_id': billing_item.appointment.id if billing_item.appointment else None,
                    'errors': errors
                })
        
        # 4. Validiere Behandlungen
        print("🏥 Validiere Behandlungen...")
        results['treatments'] = ValidationService.validate_treatment_legs_codes()
        
        # 5. Validiere Krankenkassen
        print("🏢 Validiere Krankenkassen...")
        results['insurance_providers'] = ValidationService.validate_insurance_provider_integrity()
        
        # Zusammenfassung
        results['summary']['total_errors'] = (
            len(results['prescriptions']) +
            len(results['appointments']) +
            len(results['billing_items']) +
            len(results['treatments']) +
            len(results['insurance_providers'])
        )
        
        print(f"✅ Validierung abgeschlossen: {results['summary']['total_errors']} Probleme gefunden")
        
        return results 