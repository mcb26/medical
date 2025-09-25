#!/usr/bin/env python3
"""
Management-Command für die Verwaltung von Preisperioden mit zeitlichen Gültigkeiten
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import json

from core.models import Treatment, InsuranceProviderGroup, Surcharge
from core.services.price_service import PriceService


class Command(BaseCommand):
    help = 'Verwaltet Preisperioden mit zeitlichen Gültigkeiten'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['list', 'create', 'update', 'validate', 'history', 'changes'],
            help='Aktion die ausgeführt werden soll'
        )
        
        # Argumente für create
        parser.add_argument(
            '--treatment-id',
            type=int,
            help='ID der Behandlung'
        )
        parser.add_argument(
            '--treatment-name',
            type=str,
            help='Name der Behandlung'
        )
        parser.add_argument(
            '--insurance-group-id',
            type=int,
            help='ID der Krankenkassen-Gruppe'
        )
        parser.add_argument(
            '--insurance-group-name',
            type=str,
            help='Name der Krankenkassen-Gruppe'
        )
        parser.add_argument(
            '--insurance-payment',
            type=Decimal,
            help='Krankenkassen-Betrag'
        )
        parser.add_argument(
            '--patient-payment',
            type=Decimal,
            default=Decimal('0.00'),
            help='Patienten-Zuzahlung (Standard: 0.00)'
        )
        parser.add_argument(
            '--valid-from',
            type=str,
            help='Gültig ab (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--valid-until',
            type=str,
            help='Gültig bis (YYYY-MM-DD, Standard: 2099-12-31)'
        )
        
        # Argumente für update
        parser.add_argument(
            '--surcharge-id',
            type=int,
            help='ID der zu aktualisierenden Preisperiode'
        )
        
        # Argumente für history und changes
        parser.add_argument(
            '--start-date',
            type=str,
            help='Startdatum für Suche (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='Enddatum für Suche (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--check-date',
            type=str,
            help='Datum für Preisabfrage (YYYY-MM-DD)'
        )
        
        # Output-Format
        parser.add_argument(
            '--format',
            choices=['table', 'json'],
            default='table',
            help='Ausgabeformat (Standard: table)'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'list':
            self.list_prices(options)
        elif action == 'create':
            self.create_price_period(options)
        elif action == 'update':
            self.update_price_period(options)
        elif action == 'validate':
            self.validate_price_periods(options)
        elif action == 'history':
            self.show_price_history(options)
        elif action == 'changes':
            self.show_price_changes(options)

    def list_prices(self, options):
        """Listet alle aktuellen Preise"""
        check_date = self.parse_date(options.get('check_date')) or date.today()
        
        prices = PriceService.get_all_valid_prices_for_date(check_date)
        
        if options['format'] == 'json':
            self.stdout.write(json.dumps(prices, default=str, indent=2))
        else:
            self.stdout.write(f"\nGültige Preise zum {check_date}:\n")
            self.stdout.write("-" * 80)
            
            for key, price_info in prices.items():
                self.stdout.write(f"{key}")
                self.stdout.write(f"  Krankenkasse: {price_info['insurance_payment']}€")
                self.stdout.write(f"  Zuzahlung: {price_info['patient_payment']}€")
                self.stdout.write(f"  Gültig: {price_info['valid_from']} - {price_info['valid_until']}")
                self.stdout.write()

    def create_price_period(self, options):
        """Erstellt eine neue Preisperiode"""
        # Behandlung finden
        treatment = self.get_treatment(options)
        insurance_group = self.get_insurance_group(options)
        
        # Preise
        insurance_payment = options.get('insurance_payment')
        if not insurance_payment:
            raise CommandError("--insurance-payment ist erforderlich")
        
        patient_payment = options.get('patient_payment', Decimal('0.00'))
        
        # Datum
        valid_from = self.parse_date(options.get('valid_from'))
        if not valid_from:
            raise CommandError("--valid-from ist erforderlich")
        
        valid_until = self.parse_date(options.get('valid_until')) or date(2099, 12, 31)
        
        try:
            surcharge = PriceService.create_price_period(
                treatment=treatment,
                insurance_provider_group=insurance_group,
                insurance_payment=insurance_payment,
                patient_payment=patient_payment,
                valid_from=valid_from,
                valid_until=valid_until
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Preisperiode erstellt: {surcharge.treatment.treatment_name} "
                    f"({surcharge.insurance_provider_group.name}) - "
                    f"{surcharge.insurance_payment}€ / {surcharge.patient_payment}€ "
                    f"gültig {surcharge.valid_from} - {surcharge.valid_until}"
                )
            )
            
        except ValueError as e:
            raise CommandError(f"Fehler beim Erstellen der Preisperiode: {e}")

    def update_price_period(self, options):
        """Aktualisiert eine bestehende Preisperiode"""
        surcharge_id = options.get('surcharge_id')
        if not surcharge_id:
            raise CommandError("--surcharge-id ist erforderlich")
        
        try:
            surcharge = PriceService.update_price_period(
                surcharge_id=surcharge_id,
                insurance_payment=options.get('insurance_payment'),
                patient_payment=options.get('patient_payment'),
                valid_from=self.parse_date(options.get('valid_from')),
                valid_until=self.parse_date(options.get('valid_until'))
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Preisperiode aktualisiert: {surcharge.treatment.treatment_name} "
                    f"({surcharge.insurance_provider_group.name}) - "
                    f"{surcharge.insurance_payment}€ / {surcharge.patient_payment}€ "
                    f"gültig {surcharge.valid_from} - {surcharge.valid_until}"
                )
            )
            
        except Surcharge.DoesNotExist:
            raise CommandError(f"Preisperiode mit ID {surcharge_id} nicht gefunden")

    def validate_price_periods(self, options):
        """Validiert alle Preisperioden"""
        errors = PriceService.validate_price_periods()
        
        if options['format'] == 'json':
            self.stdout.write(json.dumps(errors, default=str, indent=2))
        else:
            if errors:
                self.stdout.write(self.style.ERROR(f"\n{len(errors)} Validierungsfehler gefunden:\n"))
                for error in errors:
                    self.stdout.write(f"  {error['message']}")
                    if error['type'] == 'overlap':
                        self.stdout.write(f"    Periode 1: {error['period1']}")
                        self.stdout.write(f"    Periode 2: {error['period2']}")
                    self.stdout.write()
            else:
                self.stdout.write(self.style.SUCCESS("\nAlle Preisperioden sind gültig!"))

    def show_price_history(self, options):
        """Zeigt die Preisgeschichte für eine Behandlung"""
        treatment = self.get_treatment(options)
        insurance_group = self.get_insurance_group(options)
        
        start_date = self.parse_date(options.get('start_date'))
        end_date = self.parse_date(options.get('end_date'))
        
        history = PriceService.get_price_history(
            treatment=treatment,
            insurance_provider_group=insurance_group,
            start_date=start_date,
            end_date=end_date
        )
        
        if options['format'] == 'json':
            self.stdout.write(json.dumps(history, default=str, indent=2))
        else:
            self.stdout.write(f"\nPreisgeschichte für {treatment.treatment_name} ({insurance_group.name}):\n")
            self.stdout.write("-" * 80)
            
            for entry in history:
                self.stdout.write(f"{entry['valid_from']} - {entry['valid_until']}")
                self.stdout.write(f"  Krankenkasse: {entry['insurance_payment']}€")
                self.stdout.write(f"  Zuzahlung: {entry['patient_payment']}€")
                self.stdout.write()

    def show_price_changes(self, options):
        """Zeigt alle Preisänderungen in einem Zeitraum"""
        start_date = self.parse_date(options.get('start_date'))
        end_date = self.parse_date(options.get('end_date'))
        
        insurance_group = None
        if options.get('insurance_group_id'):
            insurance_group = InsuranceProviderGroup.objects.get(id=options['insurance_group_id'])
        elif options.get('insurance_group_name'):
            insurance_group = InsuranceProviderGroup.objects.get(name=options['insurance_group_name'])
        
        changes = PriceService.get_price_changes(
            start_date=start_date,
            end_date=end_date,
            insurance_provider_group=insurance_group
        )
        
        if options['format'] == 'json':
            self.stdout.write(json.dumps(changes, default=str, indent=2))
        else:
            self.stdout.write(f"\nPreisänderungen {start_date or 'letztes Jahr'} - {end_date or 'nächstes Jahr'}:\n")
            self.stdout.write("-" * 80)
            
            for change in changes:
                self.stdout.write(f"{change['treatment_name']} ({change['insurance_group']})")
                self.stdout.write(f"  {change['valid_from']} - {change['valid_until']}")
                self.stdout.write(f"  Krankenkasse: {change['insurance_payment']}€")
                self.stdout.write(f"  Zuzahlung: {change['patient_payment']}€")
                self.stdout.write()

    def get_treatment(self, options):
        """Hilfsfunktion zum Finden einer Behandlung"""
        if options.get('treatment_id'):
            return Treatment.objects.get(id=options['treatment_id'])
        elif options.get('treatment_name'):
            return Treatment.objects.get(treatment_name=options['treatment_name'])
        else:
            raise CommandError("--treatment-id oder --treatment-name ist erforderlich")

    def get_insurance_group(self, options):
        """Hilfsfunktion zum Finden einer Krankenkassen-Gruppe"""
        if options.get('insurance_group_id'):
            return InsuranceProviderGroup.objects.get(id=options['insurance_group_id'])
        elif options.get('insurance_group_name'):
            return InsuranceProviderGroup.objects.get(name=options['insurance_group_name'])
        else:
            raise CommandError("--insurance-group-id oder --insurance-group-name ist erforderlich")

    def parse_date(self, date_str):
        """Hilfsfunktion zum Parsen von Datums-Strings"""
        if not date_str:
            return None
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            raise CommandError(f"Ungültiges Datum: {date_str} (erwartet: YYYY-MM-DD)") 