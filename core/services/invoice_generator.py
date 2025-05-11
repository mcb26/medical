from datetime import datetime, date, timedelta
from typing import List, Optional
from decimal import Decimal

from django.template.loader import render_to_string
from django.conf import settings
import pdfkit  # Für PDF-Generierung aus HTML

from core.models import (
    Practice,
    Patient,
    BillingItem,
    Prescription,
    BillingCycle,
    PatientInvoice
)

class InvoiceGenerator:
    @staticmethod
    def generate_patient_invoice(
        patient: Patient,
        billing_items: List[BillingItem],
        invoice_number: str
    ) -> bytes:
        """Generiert eine PDF-Rechnung für Patientenzuzahlungen"""
        practice = Practice.objects.first()
        invoice_date = date.today()
        due_date = invoice_date + timedelta(days=30)  # 30 Tage Zahlungsziel
        
        # Berechnung der Gesamtsumme
        total_amount = sum(item.patient_copay for item in billing_items)
        
        # Kontext für das Template
        context = {
            'practice': practice,
            'patient': patient,
            'billing_items': billing_items,
            'invoice_number': invoice_number,
            'invoice_date': invoice_date,
            'total_amount': total_amount,
            'due_date': due_date,
        }
        
        # HTML generieren
        html_content = render_to_string('invoice/patient_invoice.html', context)
        
        # PDF-Optionen
        options = {
            'page-size': 'A4',
            'margin-top': '20mm',
            'margin-right': '20mm',
            'margin-bottom': '20mm',
            'margin-left': '20mm',
            'encoding': 'UTF-8',
        }
        
        # PDF generieren
        pdf = pdfkit.from_string(html_content, False, options=options)
        return pdf

    @staticmethod
    def generate_invoice_number(patient: Patient) -> str:
        """Generiert eine eindeutige Rechnungsnummer"""
        year = date.today().year
        # Zähler für Patienten in diesem Jahr
        count = PatientInvoice.objects.filter(
            created_at__year=year,
            patient=patient
        ).count() + 1
        
        return f"RE{year}-{patient.id:04d}-{count:03d}"

    @staticmethod
    def get_patient_items_for_period(
        patient: Patient,
        start_date: date,
        end_date: date,
        only_unbilled: bool = True
    ) -> List[BillingItem]:
        """Findet alle abrechenbaren Positionen für einen Patienten im Zeitraum"""
        items = BillingItem.objects.filter(
            patient=patient,
            date__range=[start_date, end_date]
        )
        if only_unbilled:
            items = items.filter(invoice__isnull=True)
        return items

    @staticmethod
    def mark_items_as_billed(billing_items: List[BillingItem]) -> None:
        """Markiert Abrechnungspositionen als abgerechnet"""
        for item in billing_items:
            item.is_billed = True
            item.save()

    @staticmethod
    def create_patient_invoice(
        patient: Patient,
        billing_items: List[BillingItem]
    ) -> PatientInvoice:
        """Erstellt eine neue Patientenrechnung"""
        invoice_number = InvoiceGenerator.generate_invoice_number(patient)
        total_amount = sum(item.patient_copay for item in billing_items)
        invoice_date = date.today()
        due_date = invoice_date + timedelta(days=30)  # 30 Tage Zahlungsziel
        
        invoice = PatientInvoice.objects.create(
            patient=patient,
            invoice_number=invoice_number,
            total_amount=total_amount,
            invoice_date=invoice_date,
            due_date=due_date,
            status='created'
        )
        
        # Verknüpfe BillingItems mit der Rechnung
        for item in billing_items:
            item.patient_invoice = invoice
            item.is_billed = True
            item.save()
            
        return invoice 