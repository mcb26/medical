from django.core.management.base import BaseCommand
from core.models import Surcharge, Treatment, InsuranceProviderGroup

class Command(BaseCommand):
    help = 'Überprüft die Preiskonfigurationen (Surcharges)'

    def handle(self, *args, **options):
        surcharges = Surcharge.objects.all().select_related(
            'treatment', 
            'insurance_provider_group'
        )
        
        self.stdout.write("=== Vorhandene Preiskonfigurationen ===")
        if not surcharges:
            self.stdout.write(self.style.WARNING("Keine Preiskonfigurationen gefunden!"))
        
        for s in surcharges:
            self.stdout.write(
                f"\nBehandlung: {s.treatment}\n"
                f"Versicherungsgruppe: {s.insurance_provider_group}\n"
                f"Kassenzahlung: {s.insurance_payment}€\n"
                f"Zuzahlung: {s.patient_payment}€\n"
                f"Gültig von: {s.valid_from} bis {s.valid_until}\n"
                f"-------------------"
            )

        # Zeige auch Behandlungen ohne Preiskonfiguration
        treatments = Treatment.objects.all()
        groups = InsuranceProviderGroup.objects.all()
        
        self.stdout.write("\n=== Fehlende Preiskonfigurationen ===")
        for t in treatments:
            for g in groups:
                if not Surcharge.objects.filter(
                    treatment=t, 
                    insurance_provider_group=g
                ).exists():
                    self.stdout.write(
                        self.style.WARNING(
                            f"Keine Preiskonfiguration für:\n"
                            f"- Behandlung: {t}\n"
                            f"- Versicherungsgruppe: {g}\n"
                        )
                    ) 