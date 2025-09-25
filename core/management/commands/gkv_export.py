from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import datetime, date, timedelta
from core.services.gkv_export_service import GKVExportService
from core.models import BillingCycle


class Command(BaseCommand):
    help = 'Exportiert GKV-Abrechnungsdaten mit korrekten Preisen und LEGS-Codes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--billing-cycle-id',
            type=int,
            help='ID des Abrechnungszyklus für den Export'
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Startdatum (YYYY-MM-DD) für den Export'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='Enddatum (YYYY-MM-DD) für den Export'
        )
        parser.add_argument(
            '--format',
            choices=['csv', 'xml'],
            default='csv',
            help='Export-Format (Standard: csv)'
        )
        parser.add_argument(
            '--output-file',
            type=str,
            help='Ausgabedatei (optional)'
        )
        parser.add_argument(
            '--validate-only',
            action='store_true',
            help='Nur Validierung, kein Export'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt nur die Daten an, ohne Export'
        )

    def handle(self, *args, **options):
        self.stdout.write("Starte GKV-Export...")
        
        # Initialisiere Service
        export_service = GKVExportService()
        
        # Bestimme Export-Parameter
        billing_cycle = None
        start_date = None
        end_date = None
        
        if options['billing_cycle_id']:
            try:
                billing_cycle = BillingCycle.objects.get(id=options['billing_cycle_id'])
                self.stdout.write(f"Export für Abrechnungszyklus: {billing_cycle.name}")
            except BillingCycle.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Abrechnungszyklus {options['billing_cycle_id']} nicht gefunden")
                )
                return
        else:
            if options['start_date'] and options['end_date']:
                start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
                end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()
                self.stdout.write(f"Export für Zeitraum: {start_date} bis {end_date}")
            else:
                # Standard: Letzter Monat
                end_date = date.today()
                start_date = end_date - timedelta(days=30)
                self.stdout.write(f"Export für letzten Monat: {start_date} bis {end_date}")
        
        # Generiere Export-Daten
        export_data = export_service.generate_gkv_export_data(
            billing_cycle=billing_cycle,
            start_date=start_date,
            end_date=end_date
        )
        
        if not export_data:
            self.stdout.write(self.style.WARNING("Keine GKV-Export-Daten gefunden"))
            return
        
        self.stdout.write(f"Gefunden: {len(export_data)} Termine für GKV-Export")
        
        # Validiere Daten
        validation_result = export_service.validate_gkv_compliance(export_data)
        
        if validation_result['errors']:
            self.stdout.write(self.style.ERROR("Validierungsfehler gefunden:"))
            for error in validation_result['errors']:
                self.stdout.write(f"  - {error}")
        
        if validation_result['warnings']:
            self.stdout.write(self.style.WARNING("Warnungen:"))
            for warning in validation_result['warnings']:
                self.stdout.write(f"  - {warning}")
        
        if options['validate_only']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Validierung abgeschlossen: {validation_result['total_items']} Termine, "
                    f"{len(validation_result['errors'])} Fehler, "
                    f"{len(validation_result['warnings'])} Warnungen"
                )
            )
            return
        
        if options['dry_run']:
            self.stdout.write("DRY RUN - Zeige erste 5 Einträge:")
            for i, item in enumerate(export_data[:5]):
                self.stdout.write(
                    f"  {i+1}. {item['patient_name']} - {item['treatment_name']} "
                    f"({item['legs_code']}) - {item['net_amount']:.2f}€"
                )
            return
        
        # Export
        try:
            if options['format'] == 'csv':
                content, filename = export_service.export_to_csv(
                    export_data, 
                    options['output_file']
                )
            else:  # xml
                content, filename = export_service.export_to_xml(
                    export_data, 
                    options['output_file']
                )
            
            # Speichere Datei
            if options['output_file']:
                with open(options['output_file'], 'w', encoding='utf-8') as f:
                    f.write(content)
                self.stdout.write(
                    self.style.SUCCESS(f"Export gespeichert: {options['output_file']}")
                )
            else:
                # Zeige Inhalt in Konsole
                self.stdout.write(f"Export-Datei: {filename}")
                self.stdout.write("=" * 50)
                self.stdout.write(content[:1000] + "..." if len(content) > 1000 else content)
            
            # Statistiken
            total_amount = sum(item['net_amount'] for item in export_data)
            total_copayment = sum(item['copayment_amount'] for item in export_data)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Export erfolgreich: {len(export_data)} Termine, "
                    f"Gesamtbetrag: {total_amount:.2f}€, "
                    f"Zuzahlungen: {total_copayment:.2f}€"
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Export-Fehler: {str(e)}")
            )
    
    def show_gkv_price_info(self):
        """Zeigt Informationen zu GKV-Preisen an"""
        self.stdout.write("GKV-Preise 2023 (gültig ab 01.03.2023):")
        self.stdout.write("-" * 50)
        
        prices = {
            "X0501": ("Krankengymnastik", "26,12€"),
            "X0521": ("Krankengymnastik Telemedizin", "26,12€"),
            "X1201": ("Manuelle Therapie", "31,37€"),
            "X1221": ("Manuelle Therapie Telemedizin", "31,37€"),
            "X0106": ("Klassische Massage", "19,06€"),
            "X0107": ("Bindegewebsmassage", "22,90€"),
            "X0201": ("MLD 45min", "47,54€"),
            "X0202": ("MLD 60min", "63,40€"),
            "X0702": ("KG Atmungsorgane", "78,38€"),
            "X0708": ("KG-ZNS Bobath Kinder", "51,85€"),
            "X0710": ("KG-ZNS Bobath Erwachsene", "41,48€"),
            "X1302": ("Elektrotherapie", "7,43€"),
            "X1501": ("Warmpackung", "14,24€"),
            "X0301": ("Übungsbehandlung Einzel", "12,06€"),
        }
        
        for code, (name, price) in prices.items():
            self.stdout.write(f"  {code}: {name} - {price}")
        
        self.stdout.write("\nZuzahlungsregeln:")
        self.stdout.write("  - 5€ pro Termin")
        self.stdout.write("  - Max. 60€ pro Quartal")
        self.stdout.write("  - Max. 240€ pro Jahr") 