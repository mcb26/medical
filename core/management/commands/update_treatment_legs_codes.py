from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from core.models import Treatment


class Command(BaseCommand):
    help = 'Aktualisiert Behandlungen mit korrekten LEGS-Codes und GKV-Preisen 2023'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt nur an, was geändert würde, ohne Änderungen zu speichern'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Mapping für Behandlungsnamen zu korrekten LEGS-Codes
        treatment_mapping = {
            'Krankengymnastik': {
                'accounting_code': '050',
                'tariff_indicator': '01',
                'legs_code': '050.01',
                'description': 'Krankengymnastik: Einzelbehandlung nach Heilmittelkatalog'
            },
            'Krankengymnastik Telemedizin': {
                'accounting_code': '052',
                'tariff_indicator': '01',
                'legs_code': '052.01',
                'description': 'Krankengymnastik: Telemedizinische Behandlung'
            },
            'Manuelle Therapie': {
                'accounting_code': '120',
                'tariff_indicator': '01',
                'legs_code': '120.01',
                'description': 'Manuelle Therapie: Einzelbehandlung'
            },
            'Manuelle Therapie Telemedizin': {
                'accounting_code': '122',
                'tariff_indicator': '01',
                'legs_code': '122.01',
                'description': 'Manuelle Therapie: Telemedizinische Behandlung'
            },
            'Klassische Massage': {
                'accounting_code': '010',
                'tariff_indicator': '06',
                'legs_code': '010.06',
                'description': 'Klassische Massage: Einzelbehandlung'
            },
            'Bindegewebsmassage': {
                'accounting_code': '010',
                'tariff_indicator': '07',
                'legs_code': '010.07',
                'description': 'Bindegewebsmassage: Einzelbehandlung'
            },
            'MLD 45 Min': {
                'accounting_code': '020',
                'tariff_indicator': '01',
                'legs_code': '020.01',
                'description': 'Manuelle Lymphdrainage: 45 Minuten'
            },
            'MLD 60 Min': {
                'accounting_code': '020',
                'tariff_indicator': '02',
                'legs_code': '020.02',
                'description': 'Manuelle Lymphdrainage: 60 Minuten'
            },
            'KG Atmungsorgane': {
                'accounting_code': '070',
                'tariff_indicator': '02',
                'legs_code': '070.02',
                'description': 'Krankengymnastik Atmungsorgane'
            },
            'KG-ZNS Bobath Kinder': {
                'accounting_code': '070',
                'tariff_indicator': '08',
                'legs_code': '070.08',
                'description': 'Krankengymnastik ZNS nach Bobath: Kinder'
            },
            'KG-ZNS Bobath Erwachsene': {
                'accounting_code': '070',
                'tariff_indicator': '10',
                'legs_code': '070.10',
                'description': 'Krankengymnastik ZNS nach Bobath: Erwachsene'
            },
            'Elektrotherapie': {
                'accounting_code': '005',
                'tariff_indicator': '01',
                'legs_code': '005.01',
                'description': 'Elektrotherapie: Einzelbehandlung'
            },
            'Warmpackung': {
                'accounting_code': '150',
                'tariff_indicator': '01',
                'legs_code': '150.01',
                'description': 'Wärmetherapie: Warmpackung'
            },
            'Kaltpackung': {
                'accounting_code': '150',
                'tariff_indicator': '02',
                'legs_code': '150.02',
                'description': 'Kältetherapie: Kaltpackung'
            },
            'Ultraschall': {
                'accounting_code': '150',
                'tariff_indicator': '03',
                'legs_code': '150.03',
                'description': 'Ultraschalltherapie'
            },
            'Reizstrom': {
                'accounting_code': '150',
                'tariff_indicator': '04',
                'legs_code': '150.04',
                'description': 'Reizstromtherapie'
            }
        }
        
        updated_count = 0
        
        for treatment in Treatment.objects.all():
            if treatment.treatment_name in treatment_mapping:
                mapping = treatment_mapping[treatment.treatment_name]
                
                old_legs_code = treatment.legs_code
                old_accounting_code = treatment.accounting_code
                old_tariff_indicator = treatment.tariff_indicator
                
                if not dry_run:
                    treatment.accounting_code = mapping['accounting_code']
                    treatment.tariff_indicator = mapping['tariff_indicator']
                    treatment.legs_code = mapping['legs_code']
                    treatment.description = mapping['description']
                    treatment.save()
                
                self.stdout.write(
                    f"Behandlung '{treatment.treatment_name}': "
                    f"LEGS-Code {old_legs_code} → {mapping['legs_code']}, "
                    f"AC {old_accounting_code} → {mapping['accounting_code']}, "
                    f"TK {old_tariff_indicator} → {mapping['tariff_indicator']}"
                )
                
                updated_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Kein Mapping gefunden für Behandlung: {treatment.treatment_name}"
                    )
                )
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"DRY RUN: {updated_count} Behandlungen würden aktualisiert werden."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"{updated_count} Behandlungen erfolgreich aktualisiert."
                )
            ) 