from datetime import date
from typing import List, Dict
from django.db import transaction
from django.core.exceptions import ValidationError

from core.models import InsuranceProvider, BillingCycle, Appointment, Surcharge, BillingItem
from core.services.billing_service import BillingService
from core.services.invoice_service import InvoiceService


class BulkBillingService:
    @staticmethod
    @transaction.atomic
    def create_bulk_billing_cycles(start_date: date, end_date: date) -> List[Dict]:
        """
        Erstellt Abrechnungszyklen für alle Krankenkassen mit Terminen im angegebenen Zeitraum.
        
        Returns:
            List[Dict]: Liste mit Ergebnissen pro Krankenkasse
            [
                {
                    'insurance_provider': 'AOK',
                    'cycle_id': 123,
                    'appointments_count': 45,
                    'total_amount': '1234.56'
                },
                ...
            ]
        """
        results = []
        
        # Finde alle Krankenkassen mit abgeschlossenen oder abrechnungsbereiten Terminen
        insurance_providers = InsuranceProvider.objects.filter(
            patientinsurance__patient__appointment__appointment_date__date__range=[start_date, end_date],
            patientinsurance__patient__appointment__status__in=['completed', 'ready_to_bill']
        ).distinct()

        print(f"Gefundene Krankenkassen: {[p.name for p in insurance_providers]}")  # Debug-Ausgabe

        for provider in insurance_providers:
            try:
                # Prüfe ob bereits ein Abrechnungszyklus existiert
                existing_cycle = BillingCycle.objects.filter(
                    insurance_provider=provider,
                    start_date__lte=end_date,
                    end_date__gte=start_date
                ).first()

                if existing_cycle:
                    results.append({
                        'insurance_provider': provider.name,
                        'status': 'skipped',
                        'message': f'Bereits existierender Zyklus: {existing_cycle.id}'
                    })
                    continue

                # Finde alle abrechenbaren Termine für diese Krankenkasse
                appointments = Appointment.objects.filter(
                    appointment_date__date__range=[start_date, end_date],
                    status__in=['completed', 'ready_to_bill'],
                    prescription__patient_insurance__insurance_provider=provider,
                    billing_items__isnull=True
                ).select_related(
                    'prescription',
                    'prescription__patient_insurance',
                    'prescription__treatment_1'
                )

                print(f"Gefundene Termine für {provider.name}: {appointments.count()}")  # Debug-Ausgabe

                if not appointments:
                    results.append({
                        'insurance_provider': provider.name,
                        'status': 'skipped',
                        'message': 'Keine abrechenbaren Termine gefunden'
                    })
                    continue

                # Markiere Termine als abrechnungsbereit
                for appointment in appointments:
                    if appointment.status == 'completed':
                        appointment.status = 'ready_to_bill'
                        appointment.save()

                # Erstelle neuen Abrechnungszyklus
                cycle = BillingService.create_billing_cycle(
                    insurance_provider=provider,
                    start_date=start_date,
                    end_date=end_date
                )

                # Erstelle Abrechnungspositionen
                billing_items = BillingService.create_billing_items(cycle, appointments)

                results.append({
                    'insurance_provider': provider.name,
                    'status': 'success',
                    'cycle_id': cycle.id,
                    'appointments_count': len(billing_items),
                    'total_amount': str(cycle.total_amount)
                })

            except Exception as e:
                print(f"Fehler bei {provider.name}: {str(e)}")  # Debug-Ausgabe
                results.append({
                    'insurance_provider': provider.name,
                    'status': 'error',
                    'message': str(e)
                })
                continue

        return results

    @staticmethod
    def get_preview(start_date: date, end_date: date) -> List[Dict]:
        """
        Gibt eine Vorschau der zu erwartenden Abrechnungen zurück.
        """
        preview = []
        
        insurance_providers = InsuranceProvider.objects.filter(
            patientinsurance__prescription__appointment__appointment_date__date__range=[start_date, end_date],
            patientinsurance__prescription__appointment__status='ready_to_bill'
        ).distinct()

        for provider in insurance_providers:
            appointments = Appointment.objects.filter(
                appointment_date__date__range=[start_date, end_date],
                status='ready_to_bill',
                prescription__patient_insurance__insurance_provider=provider,
                billing_items__isnull=True
            )

            if appointments.exists():
                preview.append({
                    'insurance_provider': provider.name,
                    'appointments_count': appointments.count(),
                    'existing_cycle': BillingCycle.objects.filter(
                        insurance_provider=provider,
                        start_date__lte=end_date,
                        end_date__gte=start_date
                    ).exists()
                })

        return preview

    @staticmethod
    def create_billing_cycle(insurance_provider, start_date, end_date):
        with transaction.atomic():
            billing_cycle = BillingCycle.objects.create(
                insurance_provider=insurance_provider,
                start_date=start_date,
                end_date=end_date,
                status='draft'
            )

            # Debug: Zeige Suchparameter
            print(f"Suche Termine für:")
            print(f"- Start: {start_date}")
            print(f"- Ende: {end_date}")
            print(f"- Provider: {insurance_provider}")

            # Finde alle relevanten Termine
            appointments = Appointment.objects.filter(
                appointment_date__date__gte=start_date,
                appointment_date__date__lte=end_date,
                status='ready_to_bill',
                prescription__patient_insurance__insurance_provider=insurance_provider,
                billing_items__isnull=True
            ).select_related(
                'prescription',
                'prescription__patient_insurance',
                'prescription__patient_insurance__insurance_provider',
                'prescription__treatment_1'
            )

            print(f"SQL Query: {appointments.query}")
            print(f"Gefundene Termine: {appointments.count()}")

            for appointment in appointments:
                treatment = appointment.prescription.treatment_1
                insurance_group = appointment.prescription.patient_insurance.insurance_provider.group
                appointment_date = appointment.appointment_date.date()

                # Debug: Zeige Surcharge-Suche
                print(f"\nSuche Surcharge für:")
                print(f"- Treatment: {treatment}")
                print(f"- Insurance Group: {insurance_group}")
                print(f"- Datum: {appointment_date}")

                surcharge = Surcharge.objects.filter(
                    treatment=treatment,
                    insurance_provider_group=insurance_group,
                    valid_from__lte=appointment_date,
                    valid_until__gte=appointment_date
                ).first()

                if surcharge:
                    print(f"Surcharge gefunden: {surcharge.insurance_payment} / {surcharge.patient_payment}")
                    BillingItem.objects.create(
                        billing_cycle=billing_cycle,
                        prescription=appointment.prescription,
                        appointment=appointment,
                        treatment=treatment,
                        insurance_amount=surcharge.insurance_payment,
                        patient_copay=surcharge.patient_payment
                    )
                else:
                    print("Keine Surcharge gefunden!")

            return billing_cycle

    @staticmethod
    def create_bulk_billing(start_date, end_date):
        """Erstellt Abrechnungszyklen für alle Krankenkassen mit Terminen im Zeitraum"""
        results = []
        
        # Finde alle Krankenkassen mit Terminen im Zeitraum
        providers = InsuranceProvider.objects.filter(
            patient_insurances__prescriptions__appointments__appointment_date__date__gte=start_date,
            patient_insurances__prescriptions__appointments__appointment_date__date__lte=end_date,
            patient_insurances__prescriptions__appointments__status='completed',
            patient_insurances__prescriptions__appointments__billing_items__isnull=True
        ).distinct()

        for provider in providers:
            try:
                cycle = BulkBillingService.create_billing_cycle(
                    insurance_provider=provider,
                    start_date=start_date,
                    end_date=end_date
                )
                results.append({
                    'insurance_provider': provider.name,
                    'status': 'success',
                    'billing_cycle_id': cycle.id,
                    'items_count': cycle.billing_items.count()
                })
            except Exception as e:
                results.append({
                    'insurance_provider': provider.name,
                    'status': 'error',
                    'message': str(e)
                })

        return results

    @staticmethod
    @transaction.atomic
    def prepare_appointments_for_billing(start_date: date, end_date: date) -> Dict:
        """
        Bereitet abgeschlossene Termine für die Abrechnung vor.
        """
        print("\nSuche abgeschlossene Termine:")
        appointments = Appointment.objects.filter(
            appointment_date__date__range=[start_date, end_date],
            status='completed',  # Nur completed Termine
            prescription__treatment_1__is_self_pay=False  # Keine Selbstzahler
        ).select_related(
            'prescription__patient',
            'prescription__treatment_1',
            'prescription__patient_insurance__insurance_provider'
        )
        
        # Debug: Zeige gefundene Termine
        print(f"\nGefundene abgeschlossene Termine: {appointments.count()}")
        for app in appointments:
            print(f"ID {app.id}: {app.appointment_date.strftime('%d.m.%Y')}, " +
                  f"Patient: {app.prescription.patient.last_name}, " +
                  f"Behandlung: {app.prescription.treatment_1.treatment_name}, " +
                  f"Krankenkasse: {app.prescription.patient_insurance.insurance_provider.name}")
        
        results = {
            'total': appointments.count(),
            'updated': 0,
            'providers': []
        }
        
        if appointments:
            # Markiere als abrechnungsbereit
            updated = appointments.update(status='ready_to_bill')
            results['updated'] = updated
            
            print(f"\n{updated} Termine auf 'ready_to_bill' gesetzt")
            
            # Gruppiere nach Krankenkassen
            providers = {}
            for app in appointments:
                provider = app.prescription.patient_insurance.insurance_provider
                if provider.id not in providers:
                    providers[provider.id] = {
                        'name': provider.name,
                        'count': 0
                    }
                providers[provider.id]['count'] += 1
            
            results['providers'] = [
                {
                    'insurance_provider': p['name'],
                    'total_appointments': p['count']
                } for p in providers.values()
            ]
        
        return results

    @staticmethod
    @transaction.atomic
    def process_ready_to_bill_appointments() -> Dict:
        """
        Verarbeitet alle ready_to_bill Termine:
        1. Erstellt Patientenrechnungspositionen
        2. Erstellt Krankenkassenabrechnungen
        """
        results = {
            'patient_invoices': {},
            'insurance_exports': []
        }
        
        # Hole alle ready_to_bill Termine
        appointments = Appointment.objects.filter(
            status='ready_to_bill'
        ).select_related(
            'prescription__patient',
            'prescription__patient_insurance__insurance_provider'
        )
        
        # Erstelle Patientenrechnungspositionen
        invoice_results = InvoiceService.create_patient_invoice_items(appointments)
        results['patient_invoices'] = invoice_results
        
        # Erstelle Krankenkassenabrechnungen
        billing_cycles = BillingCycle.objects.filter(
            billing_items__appointment__in=appointments
        ).distinct()
        
        for cycle in billing_cycles:
            export_data = InvoiceService.create_insurance_export(cycle)
            results['insurance_exports'].append({
                'insurance_provider': cycle.insurance_provider.name,
                'cycle_id': cycle.id,
                'export_data': export_data
            })
        
        return results

# Debug-Ausgaben hinzufügen
start_date = date(2025, 2, 1)
end_date = date(2025, 3, 31)

print("\nTeste BulkBillingService:")
result = BulkBillingService.create_bulk_billing_cycles(start_date, end_date)
print(f"Result: {result}") 