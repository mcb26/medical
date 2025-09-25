from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from core.models import Appointment, BillingItem, Patient, PatientInsurance
from datetime import date
from django.db import models


class Command(BaseCommand):
    help = 'Berechnet GKV-Zuzahlungen für Termine und erstellt entsprechende BillingItems'

    def add_arguments(self, parser):
        parser.add_argument(
            '--appointment-id',
            type=int,
            help='Spezifische Termin-ID für die Zuzahlungsberechnung'
        )
        parser.add_argument(
            '--patient-id',
            type=int,
            help='Patient-ID für die Zuzahlungsberechnung aller Termine'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt nur die Berechnungen an, ohne Änderungen zu speichern'
        )

    def handle(self, *args, **options):
        self.stdout.write("Berechne GKV-Zuzahlungen...")
        
        # GKV-Zuzahlungsregeln (Stand 2024)
        ZUZAHLUNG_PRO_TERMIN = Decimal('5.00')  # 5€ pro Termin
        ZUZAHLUNG_MAX_PRO_QUARTAL = Decimal('60.00')  # Max 60€ pro Quartal
        ZUZAHLUNG_MAX_PRO_JAHR = Decimal('240.00')  # Max 240€ pro Jahr
        
        # Bestimme zu verarbeitende Termine
        if options['appointment_id']:
            appointments = Appointment.objects.filter(id=options['appointment_id'])
        elif options['patient_id']:
            appointments = Appointment.objects.filter(patient_id=options['patient_id'])
        else:
            # Alle Termine der letzten 30 Tage
            from datetime import timedelta
            cutoff_date = date.today() - timedelta(days=30)
            appointments = Appointment.objects.filter(
                appointment_date__gte=cutoff_date,
                status='completed'
            )
        
        total_copayments = Decimal('0.00')
        processed_appointments = 0
        
        for appointment in appointments:
            if not appointment.treatment or appointment.treatment.is_self_pay:
                continue
                
            # Prüfe ob Patient GKV-versichert ist
            patient_insurance = appointment.patient_insurance
            if not patient_insurance or patient_insurance.is_private:
                continue
            
            # Berechne Zuzahlung für diesen Termin
            copayment = self.calculate_copayment_for_appointment(
                appointment, 
                ZUZAHLUNG_PRO_TERMIN,
                ZUZAHLUNG_MAX_PRO_QUARTAL,
                ZUZAHLUNG_MAX_PRO_JAHR
            )
            
            if options['dry_run']:
                self.stdout.write(
                    f"Termin {appointment.id}: {appointment.patient.full_name} - "
                    f"{appointment.treatment.treatment_name} - Zuzahlung: {copayment}€"
                )
            else:
                # Erstelle oder aktualisiere BillingItem für Zuzahlung
                billing_item, created = BillingItem.objects.get_or_create(
                    appointment=appointment,
                    item_type='copayment',
                    defaults={
                        'description': f'GKV-Zuzahlung: {appointment.treatment.treatment_name}',
                        'quantity': 1,
                        'unit_price': copayment,
                        'total_amount': copayment,
                        'is_copayment': True
                    }
                )
                
                if not created:
                    billing_item.unit_price = copayment
                    billing_item.total_amount = copayment
                    billing_item.save()
            
            total_copayments += copayment
            processed_appointments += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Zuzahlungsberechnung abgeschlossen: '
                f'{processed_appointments} Termine verarbeitet, '
                f'Gesamtzuzahlung: {total_copayments}€'
            )
        )

    def calculate_copayment_for_appointment(self, appointment, base_copayment, max_quarterly, max_yearly):
        """
        Berechnet die Zuzahlung für einen Termin unter Berücksichtigung der Grenzen
        """
        patient = appointment.patient
        appointment_date = appointment.appointment_date
        
        # Berechne Quartal und Jahr
        quarter_start = date(appointment_date.year, ((appointment_date.month - 1) // 3) * 3 + 1, 1)
        year_start = date(appointment_date.year, 1, 1)
        
        # Zähle bereits geleistete Zuzahlungen im Quartal
        quarterly_copayments = BillingItem.objects.filter(
            appointment__patient=patient,
            appointment__appointment_date__gte=quarter_start,
            appointment__appointment_date__lt=quarter_start.replace(month=quarter_start.month + 3),
            is_copayment=True
        ).aggregate(total=models.Sum('total_amount'))['total'] or Decimal('0.00')
        
        # Zähle bereits geleistete Zuzahlungen im Jahr
        yearly_copayments = BillingItem.objects.filter(
            appointment__patient=patient,
            appointment__appointment_date__gte=year_start,
            appointment__appointment_date__lt=year_start.replace(year=year_start.year + 1),
            is_copayment=True
        ).aggregate(total=models.Sum('total_amount'))['total'] or Decimal('0.00')
        
        # Berechne verfügbare Zuzahlung
        available_quarterly = max_quarterly - quarterly_copayments
        available_yearly = max_yearly - yearly_copayments
        
        # Zuzahlung ist das Minimum aus Basis-Zuzahlung und verfügbaren Grenzen
        copayment = min(base_copayment, available_quarterly, available_yearly)
        
        return max(copayment, Decimal('0.00'))  # Nicht negativ 