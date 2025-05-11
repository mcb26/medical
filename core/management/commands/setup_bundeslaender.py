from django.core.management.base import BaseCommand
from core.models import Bundesland

class Command(BaseCommand):
    help = 'Erstellt die Standard-Bundesländer'

    def handle(self, *args, **kwargs):
        bundeslaender = [
            {'name': 'Baden-Württemberg', 'abbreviation': 'BW'},
            {'name': 'Bayern', 'abbreviation': 'BY'},
            {'name': 'Berlin', 'abbreviation': 'BE'},
            {'name': 'Brandenburg', 'abbreviation': 'BB'},
            {'name': 'Bremen', 'abbreviation': 'HB'},
            {'name': 'Hamburg', 'abbreviation': 'HH'},
            {'name': 'Hessen', 'abbreviation': 'HE'},
            {'name': 'Mecklenburg-Vorpommern', 'abbreviation': 'MV'},
            {'name': 'Niedersachsen', 'abbreviation': 'NI'},
            {'name': 'Nordrhein-Westfalen', 'abbreviation': 'NW'},
            {'name': 'Rheinland-Pfalz', 'abbreviation': 'RP'},
            {'name': 'Saarland', 'abbreviation': 'SL'},
            {'name': 'Sachsen', 'abbreviation': 'SN'},
            {'name': 'Sachsen-Anhalt', 'abbreviation': 'ST'},
            {'name': 'Schleswig-Holstein', 'abbreviation': 'SH'},
            {'name': 'Thüringen', 'abbreviation': 'TH'},
        ]

        for bundesland in bundeslaender:
            obj, created = Bundesland.objects.update_or_create(
                abbreviation=bundesland['abbreviation'],
                defaults={'name': bundesland['name']}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Bundesland {bundesland['name']} erstellt")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"Bundesland {bundesland['name']} aktualisiert")
                ) 