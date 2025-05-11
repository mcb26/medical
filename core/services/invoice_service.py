from datetime import date
from typing import List, Dict
from django.db import transaction
from decimal import Decimal
from django.template.loader import render_to_string
from django.utils import timezone

from core.models import (
    Appointment,
    PatientInvoice,
    BillingItem,
    Patient,
    BillingCycle
)

class InvoiceService:
    @staticmethod
    @transaction.atomic
    def create_patient_invoice_items(appointments: List[Appointment]) -> Dict:
        """
        Erstellt Rechnungspositionen für Patientenzuzahlungen aus ready_to_bill Terminen
        """
        results = {
            'total_items': 0,
            'patients': {}
        }
        
        for appointment in appointments:
            patient = appointment.prescription.patient
            if patient.id not in results['patients']:
                results['patients'][patient.id] = {
                    'name': str(patient),
                    'items': [],
                    'total_amount': Decimal('0.00')
                }
            
            # Hole BillingItem für diesen Termin
            billing_item = appointment.billing_items.first()
            if billing_item and billing_item.patient_copay > 0:
                results['patients'][patient.id]['items'].append({
                    'appointment': appointment,
                    'treatment': billing_item.treatment.treatment_name,
                    'amount': billing_item.patient_copay,
                    'date': appointment.appointment_date
                })
                results['patients'][patient.id]['total_amount'] += billing_item.patient_copay
                results['total_items'] += 1
        
        return results

    @staticmethod
    def create_insurance_export(billing_cycle: BillingCycle) -> str:
        """
        Erstellt eine Abrechnungsübersicht für eine Krankenkasse
        """
        items = billing_cycle.billing_items.all().select_related(
            'prescription__patient',
            'prescription__patient_insurance',
            'treatment',
            'appointment'
        )
        
        # Kontext für das Template vorbereiten
        context = {
            'insurance_provider': billing_cycle.insurance_provider,
            'start_date': billing_cycle.start_date,
            'end_date': billing_cycle.end_date,
            'items': items,
            'total_amount': sum(item.insurance_amount for item in items),
            'generated_at': timezone.now()
        }
        
        # Template rendern
        try:
            export_data = render_to_string('billing/insurance_statement.txt', context)
        except Exception as e:
            # Fallback wenn Template nicht gefunden wird
            export_data = f"""
ABRECHNUNGSÜBERSICHT
===============================

Krankenkasse: {billing_cycle.insurance_provider.name}
Abrechnungszeitraum: {billing_cycle.start_date.strftime('%d.m.%Y')} - {billing_cycle.end_date.strftime('%d.m.%Y')}

ABRECHNUNGSPOSITIONEN:
-------------------------------
"""
            for item in items:
                export_data += f"""
Patient: {item.prescription.patient.last_name}, {item.prescription.patient.first_name}
Versichertennummer: {item.prescription.patient_insurance.insurance_number}
Behandlung: {item.treatment.treatment_name}
Datum: {item.appointment.appointment_date.strftime('%d.m.%Y')}
Betrag: {item.insurance_amount} EUR
-------------------------------
"""
            export_data += f"""
ZUSAMMENFASSUNG:
===============================
Gesamtanzahl Positionen: {items.count()}
Gesamtbetrag: {sum(item.insurance_amount for item in items)} EUR
"""
        
        return export_data 