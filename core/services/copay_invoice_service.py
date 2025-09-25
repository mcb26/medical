from datetime import date, timedelta
from typing import List, Dict, Optional
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
import uuid

from core.models import (
    Appointment,
    Patient,
    BillingItem,
    PatientCopayInvoice,
    GKVInsuranceClaim,
    InsuranceProvider
)


class CopayInvoiceService:
    """Service für die automatische Erstellung von Zuzahlungsrechnungen"""
    
    @staticmethod
    @transaction.atomic
    def create_copay_invoices_from_appointments(
        appointments: List[Appointment],
        due_date_days: int = 30
    ) -> Dict:
        """
        Erstellt Zuzahlungsrechnungen für die gegebenen Termine
        
        Args:
            appointments: Liste der Termine
            due_date_days: Anzahl Tage bis zur Fälligkeit (Standard: 30)
            
        Returns:
            Dictionary mit Ergebnissen
        """
        results = {
            'total_invoices_created': 0,
            'total_amount': Decimal('0.00'),
            'patients_processed': 0,
            'errors': [],
            'invoices': []
        }
        
        # Gruppiere Termine nach Patient
        patient_appointments = {}
        for appointment in appointments:
            if not appointment.prescription or not appointment.prescription.patient:
                results['errors'].append(f"Termin {appointment.id}: Kein Patient zugeordnet")
                continue
                
            patient = appointment.prescription.patient
            if patient.id not in patient_appointments:
                patient_appointments[patient.id] = {
                    'patient': patient,
                    'appointments': [],
                    'total_copay': Decimal('0.00')
                }
            
            # Berechne Zuzahlung für diesen Termin
            billing_amount = appointment.get_billing_amount()
            if billing_amount and billing_amount['patient_copay'] > 0:
                patient_appointments[patient.id]['appointments'].append(appointment)
                patient_appointments[patient.id]['total_copay'] += billing_amount['patient_copay']
        
        # Erstelle Rechnungen für jeden Patient
        for patient_data in patient_appointments.values():
            try:
                invoice = CopayInvoiceService._create_copay_invoice_for_patient(
                    patient_data['patient'],
                    patient_data['appointments'],
                    patient_data['total_copay'],
                    due_date_days
                )
                
                results['invoices'].append({
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'patient': patient_data['patient'].full_name,
                    'amount': float(invoice.total_copay),
                    'appointments_count': len(patient_data['appointments'])
                })
                
                results['total_invoices_created'] += 1
                results['total_amount'] += invoice.total_copay
                results['patients_processed'] += 1
                
            except Exception as e:
                error_msg = f"Fehler bei Patient {patient_data['patient'].full_name}: {str(e)}"
                results['errors'].append(error_msg)
        
        return results
    
    @staticmethod
    @transaction.atomic
    def create_copay_invoices_from_billing_items(
        billing_items: List[BillingItem],
        due_date_days: int = 30
    ) -> Dict:
        """
        Erstellt Zuzahlungsrechnungen aus BillingItems
        
        Args:
            billing_items: Liste der BillingItems
            due_date_days: Anzahl Tage bis zur Fälligkeit (Standard: 30)
            
        Returns:
            Dictionary mit Ergebnissen
        """
        results = {
            'total_invoices_created': 0,
            'total_amount': Decimal('0.00'),
            'patients_processed': 0,
            'errors': [],
            'invoices': []
        }
        
        # Gruppiere BillingItems nach Patient
        patient_items = {}
        for item in billing_items:
            if not item.appointment or not item.appointment.prescription:
                results['errors'].append(f"BillingItem {item.id}: Kein Termin/Verordnung zugeordnet")
                continue
                
            patient = item.appointment.prescription.patient
            if patient.id not in patient_items:
                patient_items[patient.id] = {
                    'patient': patient,
                    'billing_items': [],
                    'total_copay': Decimal('0.00')
                }
            
            if item.patient_copay > 0:
                patient_items[patient.id]['billing_items'].append(item)
                patient_items[patient.id]['total_copay'] += item.patient_copay
        
        # Erstelle Rechnungen für jeden Patient
        for patient_data in patient_items.values():
            try:
                invoice = CopayInvoiceService._create_copay_invoice_from_billing_items(
                    patient_data['patient'],
                    patient_data['billing_items'],
                    patient_data['total_copay'],
                    due_date_days
                )
                
                results['invoices'].append({
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'patient': patient_data['patient'].full_name,
                    'amount': float(invoice.total_copay),
                    'items_count': len(patient_data['billing_items'])
                })
                
                results['total_invoices_created'] += 1
                results['total_amount'] += invoice.total_copay
                results['patients_processed'] += 1
                
            except Exception as e:
                error_msg = f"Fehler bei Patient {patient_data['patient'].full_name}: {str(e)}"
                results['errors'].append(error_msg)
        
        return results
    
    @staticmethod
    def _create_copay_invoice_for_patient(
        patient: Patient,
        appointments: List[Appointment],
        total_copay: Decimal,
        due_date_days: int
    ) -> PatientCopayInvoice:
        """Erstellt eine Zuzahlungsrechnung für einen Patienten"""
        
        # Generiere eindeutige Rechnungsnummer
        invoice_number = f"Z-{patient.id}-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Fälligkeitsdatum
        due_date = date.today() + timedelta(days=due_date_days)
        
        # Erstelle Rechnung
        invoice = PatientCopayInvoice.objects.create(
            patient=patient,
            gkv_claim=None,  # Kein GKV-Anspruch verknüpft
            invoice_number=invoice_number,
            due_date=due_date,
            total_copay=total_copay,
            status='created',
            notes=f"Zuzahlungsrechnung für {len(appointments)} Termin(e)"
        )
        
        # Markiere Termine als abgerechnet
        for appointment in appointments:
            appointment.status = 'billed'
            appointment.save()
        
        return invoice
    
    @staticmethod
    def _create_copay_invoice_from_billing_items(
        patient: Patient,
        billing_items: List[BillingItem],
        total_copay: Decimal,
        due_date_days: int
    ) -> PatientCopayInvoice:
        """Erstellt eine Zuzahlungsrechnung aus BillingItems"""
        
        # Generiere eindeutige Rechnungsnummer
        invoice_number = f"Z-{patient.id}-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Fälligkeitsdatum
        due_date = date.today() + timedelta(days=due_date_days)
        
        # Erstelle Rechnung
        invoice = PatientCopayInvoice.objects.create(
            patient=patient,
            gkv_claim=None,  # Kein GKV-Anspruch verknüpft
            invoice_number=invoice_number,
            due_date=due_date,
            total_copay=total_copay,
            status='created',
            notes=f"Zuzahlungsrechnung für {len(billing_items)} Abrechnungsposition(en)"
        )
        
        # Markiere BillingItems als Patientenrechnung erstellt
        for item in billing_items:
            item.patient_invoice_created = True
            item.save()
        
        return invoice
    
    @staticmethod
    def get_pending_copay_appointments(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        patient_id: Optional[int] = None
    ) -> List[Appointment]:
        """
        Holt Termine mit ausstehenden Zuzahlungen
        
        Args:
            start_date: Startdatum für Filter
            end_date: Enddatum für Filter
            patient_id: Optional Patient-ID für Filter
            
        Returns:
            Liste der Termine mit ausstehenden Zuzahlungen
        """
        queryset = Appointment.objects.filter(
            status='completed',  # Nur abgeschlossene Termine
            prescription__isnull=False,  # Mit Verordnung
            prescription__patient_insurance__isnull=False,  # Mit Versicherung
            prescription__patient_insurance__is_private=False  # Nur GKV
        ).select_related(
            'prescription__patient',
            'prescription__patient_insurance__insurance_provider'
        )
        
        # Datum-Filter
        if start_date:
            queryset = queryset.filter(appointment_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(appointment_date__date__lte=end_date)
        
        # Patient-Filter
        if patient_id:
            queryset = queryset.filter(prescription__patient_id=patient_id)
        
        # Nur Termine mit Zuzahlung
        appointments_with_copay = []
        for appointment in queryset:
            billing_amount = appointment.get_billing_amount()
            if billing_amount and billing_amount['patient_copay'] > 0:
                # Prüfe ob bereits eine Rechnung existiert
                existing_invoice = PatientCopayInvoice.objects.filter(
                    patient=appointment.prescription.patient,
                    created_at__date__gte=appointment.appointment_date.date()
                ).first()
                
                if not existing_invoice:
                    appointments_with_copay.append(appointment)
        
        return appointments_with_copay
    
    @staticmethod
    def get_pending_copay_billing_items(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        patient_id: Optional[int] = None
    ) -> List[BillingItem]:
        """
        Holt BillingItems mit ausstehenden Zuzahlungen
        
        Args:
            start_date: Startdatum für Filter
            end_date: Enddatum für Filter
            patient_id: Optional Patient-ID für Filter
            
        Returns:
            Liste der BillingItems mit ausstehenden Zuzahlungen
        """
        queryset = BillingItem.objects.filter(
            patient_copay__gt=0,  # Nur mit Zuzahlung
            patient_invoice_created=False,  # Noch keine Patientenrechnung erstellt
            appointment__prescription__isnull=False,  # Mit Verordnung
            appointment__prescription__patient_insurance__isnull=False,  # Mit Versicherung
            appointment__prescription__patient_insurance__is_private=False  # Nur GKV
        ).select_related(
            'appointment__prescription__patient',
            'appointment__prescription__patient_insurance__insurance_provider'
        )
        
        # Datum-Filter
        if start_date:
            queryset = queryset.filter(appointment__appointment_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(appointment__appointment_date__date__lte=end_date)
        
        # Patient-Filter
        if patient_id:
            queryset = queryset.filter(appointment__prescription__patient_id=patient_id)
        
        return list(queryset)
    
    @staticmethod
    def create_copay_invoices_for_date_range(
        start_date: date,
        end_date: date,
        due_date_days: int = 30
    ) -> Dict:
        """
        Erstellt Zuzahlungsrechnungen für einen Datumsbereich
        
        Args:
            start_date: Startdatum
            end_date: Enddatum
            due_date_days: Anzahl Tage bis zur Fälligkeit
            
        Returns:
            Dictionary mit Ergebnissen
        """
        # Hole ausstehende Termine
        pending_appointments = CopayInvoiceService.get_pending_copay_appointments(
            start_date=start_date,
            end_date=end_date
        )
        
        if not pending_appointments:
            return {
                'total_invoices_created': 0,
                'total_amount': Decimal('0.00'),
                'patients_processed': 0,
                'errors': [],
                'invoices': [],
                'message': 'Keine ausstehenden Zuzahlungen im angegebenen Zeitraum gefunden.'
            }
        
        # Erstelle Rechnungen
        return CopayInvoiceService.create_copay_invoices_from_appointments(
            pending_appointments,
            due_date_days
        )
