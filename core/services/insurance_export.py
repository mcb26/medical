from datetime import datetime
from typing import List, Dict
import csv
import io
from decimal import Decimal

from django.template.loader import render_to_string
from django.conf import settings

from core.models import BillingCycle, BillingItem, Practice, InsuranceProvider

class InsuranceExportService:
    @staticmethod
    def generate_csv(billing_cycle: BillingCycle) -> str:
        """Generiert CSV-Datei für Krankenkassenabrechnung"""
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        practice = Practice.objects.first()  # Wir haben nur eine Praxis

        # Header
        writer.writerow([
            'Abrechnungszeitraum',
            f'{billing_cycle.start_date.strftime("%d.%m.%Y")} - {billing_cycle.end_date.strftime("%d.%m.%Y")}'
        ])
        writer.writerow([
            'Betriebsstättennummer',
            practice.institution_code
        ])
        writer.writerow([
            'Krankenkasse',
            billing_cycle.insurance_provider.name,
            billing_cycle.insurance_provider.provider_id
        ])
        writer.writerow([])  # Leerzeile

        # Spaltennamen
        writer.writerow([
            'Versichertennummer',
            'Patient',
            'Behandlungsdatum',
            'Leistung',
            'Anzahl',
            'Einzelpreis',
            'Gesamtpreis',
            'Rezeptnummer'
        ])

        # Abrechnungspositionen
        for item in billing_cycle.billing_items.all():
            writer.writerow([
                item.prescription.patient_insurance.insurance_number,
                f"{item.prescription.patient.last_name}, {item.prescription.patient.first_name}",
                item.appointment.appointment_date.strftime("%d.%m.%Y"),
                item.treatment.treatment_name,
                "1",  # Anzahl ist immer 1 pro Termin
                f"{item.insurance_amount:.2f}",
                f"{item.insurance_amount:.2f}",
                item.prescription.id
            ])

        # Summenzeile
        total_amount = billing_cycle.total_amount
        writer.writerow([])
        writer.writerow(['Gesamtsumme', '', '', '', '', '', f"{total_amount:.2f}"])

        return output.getvalue()

    @staticmethod
    def generate_text_file(billing_cycle: BillingCycle) -> str:
        """Generiert formatierte Textdatei für Krankenkassenabrechnung"""
        practice = Practice.objects.first()
        items = billing_cycle.billing_items.all()
        
        context = {
            'practice': practice,
            'billing_cycle': billing_cycle,
            'items': items,
            'total_amount': billing_cycle.total_amount,
            'generated_at': datetime.now(),
        }
        
        return render_to_string('export/insurance_export.txt', context)

    @staticmethod
    def get_filename(billing_cycle: BillingCycle, file_type: str) -> str:
        """Generiert standardisierten Dateinamen für Export"""
        date_str = datetime.now().strftime("%Y%m%d")
        insurance_id = billing_cycle.insurance_provider.provider_id
        
        return f"Abrechnung_{insurance_id}_{date_str}.{file_type}"

    @staticmethod
    def generate_summary(billing_cycle: BillingCycle) -> Dict:
        """Erstellt eine Zusammenfassung der Abrechnung"""
        items = billing_cycle.billing_items.all()
        
        treatments_summary = {}
        for item in items:
            treatment_name = item.treatment.treatment_name
            if treatment_name not in treatments_summary:
                treatments_summary[treatment_name] = {
                    'count': 0,
                    'total': Decimal('0.00')
                }
            treatments_summary[treatment_name]['count'] += 1
            treatments_summary[treatment_name]['total'] += item.insurance_amount

        return {
            'cycle_id': billing_cycle.id,
            'insurance_provider': billing_cycle.insurance_provider.name,
            'period': f"{billing_cycle.start_date} - {billing_cycle.end_date}",
            'total_items': items.count(),
            'total_amount': billing_cycle.total_amount,
            'treatments': treatments_summary
        } 