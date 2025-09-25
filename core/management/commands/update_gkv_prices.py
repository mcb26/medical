from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from core.models import BillingItem, Treatment, Appointment
from datetime import date


class Command(BaseCommand):
    help = 'Aktualisiert bestehende BillingItems mit korrekten GKV-Preisen 2023'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt nur an, was geändert würde, ohne Änderungen zu speichern'
        )
        parser.add_argument(
            '--appointment-id',
            type=int,
            help='Spezifische Termin-ID für die Preisaktualisierung'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        appointment_id = options.get('appointment_id')
        
        # GKV-Preise 2023
        gkv_prices_2023 = {
            '050.01': Decimal('26.12'),  # Krankengymnastik
            '052.01': Decimal('26.12'),  # Krankengymnastik Telemedizin
            '120.01': Decimal('31.37'),  # Manuelle Therapie
            '122.01': Decimal('31.37'),  # Manuelle Therapie Telemedizin
            '010.06': Decimal('19.06'),  # Klassische Massage
            '010.07': Decimal('22.90'),  # Bindegewebsmassage
            '020.01': Decimal('47.54'),  # MLD 45 Min
            '020.02': Decimal('63.40'),  # MLD 60 Min
            '070.02': Decimal('78.38'),  # KG Atmung
            '070.08': Decimal('51.85'),  # KG Bobath Kinder
            '070.10': Decimal('41.48'),  # KG Bobath Erwachsene
            '005.01': Decimal('15.50'),  # Elektrotherapie
            '150.01': Decimal('12.50'),  # Warmpackung
            '150.02': Decimal('15.50'),  # Kaltpackung
            '150.03': Decimal('18.50'),  # Ultraschall
            '150.04': Decimal('22.50'),  # Reizstrom
        }
        
        # Zuzahlungsregeln
        copayment_rules = {
            'gesetzlich': {
                'base_amount': Decimal('10.00'),
                'max_per_month': Decimal('40.00'),
                'max_per_year': Decimal('400.00'),
                'exemptions': ['children_under_18', 'chronically_ill']
            }
        }
        
        if appointment_id:
            appointments = Appointment.objects.filter(id=appointment_id)
        else:
            appointments = Appointment.objects.filter(
                status__in=['completed', 'ready_to_bill'],
                patient_insurance__isnull=False
            )
        
        updated_count = 0
        total_amount = Decimal('0.00')
        
        self.stdout.write(f"Verarbeite {appointments.count()} Termine...")
        
        for appointment in appointments:
            if not appointment.treatment or not appointment.patient_insurance:
                continue
                
            # LEGS-Code erstellen
            legs_code = f"{appointment.treatment.accounting_code}.{appointment.treatment.tariff_indicator}"
            
            # GKV-Preis ermitteln
            gkv_price = gkv_prices_2023.get(legs_code, Decimal('0.00'))
            
            if gkv_price == Decimal('0.00'):
                self.stdout.write(
                    self.style.WARNING(
                        f"Kein GKV-Preis gefunden für LEGS-Code {legs_code} "
                        f"(Behandlung: {appointment.treatment.treatment_name})"
                    )
                )
                continue
            
            # Zuzahlung berechnen (vereinfacht)
            copayment = copayment_rules['gesetzlich']['base_amount'] if not appointment.patient_insurance.is_private else Decimal('0.00')
            
            # BillingItem finden
            try:
                billing_item = BillingItem.objects.get(appointment=appointment)
                
                # Bestehendes BillingItem aktualisieren
                old_insurance_amount = billing_item.insurance_amount
                old_copayment = billing_item.patient_copay
                
                if not dry_run:
                    billing_item.insurance_amount = gkv_price
                    billing_item.patient_copay = copayment
                    billing_item.save()
                
                self.stdout.write(
                    f"Termin {appointment.id}: "
                    f"Versicherung {old_insurance_amount}€ → {gkv_price}€, "
                    f"Zuzahlung {old_copayment}€ → {copayment}€"
                )
                
            except BillingItem.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"Termin {appointment.id}: Kein BillingItem gefunden - überspringe"
                    )
                )
                continue
            
            updated_count += 1
            total_amount += gkv_price
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"DRY RUN: {updated_count} BillingItems würden aktualisiert werden. "
                    f"Gesamtbetrag: {total_amount}€"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"{updated_count} BillingItems erfolgreich aktualisiert. "
                    f"Gesamtbetrag: {total_amount}€"
                )
            ) 