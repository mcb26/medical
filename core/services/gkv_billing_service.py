#!/usr/bin/env python3
"""
Service für die strukturierte GKV-Abrechnung
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
import uuid

from django.db import transaction
from django.utils import timezone

from core.models import (
    BillingItem, BillingCycle, InsuranceProvider, 
    GKVInsuranceClaim, PatientCopayInvoice, PrivatePatientInvoice,
    Patient, Treatment, Prescription
)


class GKVBillingService:
    """Service für die strukturierte GKV-Abrechnung"""
    
    @staticmethod
    def create_gkv_claims_from_billing_cycle(billing_cycle: BillingCycle) -> List[GKVInsuranceClaim]:
        """
        Erstellt GKV-Krankenkassen-Ansprüche aus einem BillingCycle
        
        Args:
            billing_cycle: Der BillingCycle
            
        Returns:
            Liste der erstellten GKV-Ansprüche
        """
        # Gruppiere BillingItems nach Krankenkasse
        gkv_items = billing_cycle.billing_items.filter(is_gkv_billing=True)
        
        claims = []
        insurance_providers = set()
        
        for item in gkv_items:
            if item.prescription and item.prescription.patient_insurance:
                insurance_provider = item.prescription.patient_insurance.insurance_provider
                insurance_providers.add(insurance_provider)
        
        # Erstelle einen Anspruch pro Krankenkasse
        for insurance_provider in insurance_providers:
            claim = GKVBillingService._create_gkv_claim(billing_cycle, insurance_provider)
            claims.append(claim)
        
        return claims
    
    @staticmethod
    def _create_gkv_claim(billing_cycle: BillingCycle, insurance_provider: InsuranceProvider) -> GKVInsuranceClaim:
        """Erstellt einen einzelnen GKV-Anspruch"""
        
        # Generiere eindeutige Anspruchsnummer
        claim_number = f"GKV-{billing_cycle.id}-{insurance_provider.provider_id}-{uuid.uuid4().hex[:8].upper()}"
        
        claim = GKVInsuranceClaim.objects.create(
            billing_cycle=billing_cycle,
            insurance_provider=insurance_provider,
            claim_number=claim_number,
            status='draft'
        )
        
        # Verknüpfe BillingItems mit diesem Anspruch
        gkv_items = billing_cycle.billing_items.filter(
            is_gkv_billing=True,
            prescription__patient_insurance__insurance_provider=insurance_provider
        )
        
        for item in gkv_items:
            item.gkv_claim = claim
            item.insurance_claim_created = True
            item.save()
        
        # Aktualisiere Gesamtbeträge
        claim.update_totals()
        
        return claim
    
    @staticmethod
    def create_patient_copay_invoices(gkv_claim: GKVInsuranceClaim) -> List[PatientCopayInvoice]:
        """
        Erstellt Patientenrechnungen für GKV-Zuzahlungen
        
        Args:
            gkv_claim: Der GKV-Anspruch
            
        Returns:
            Liste der erstellten Patientenrechnungen
        """
        invoices = []
        
        # Gruppiere BillingItems nach Patienten
        patients_data = gkv_claim.get_patients_summary()
        
        for patient_id, data in patients_data.items():
            patient = data['patient']
            total_copay = data['total_copay']
            
            if total_copay > 0:  # Nur Rechnungen erstellen wenn Zuzahlung anfällt
                invoice = GKVBillingService._create_copay_invoice(gkv_claim, patient, total_copay)
                invoices.append(invoice)
        
        return invoices
    
    @staticmethod
    def _create_copay_invoice(gkv_claim: GKVInsuranceClaim, patient: Patient, total_copay: Decimal) -> PatientCopayInvoice:
        """Erstellt eine einzelne Zuzahlungsrechnung"""
        
        # Generiere eindeutige Rechnungsnummer
        invoice_number = f"Z-{gkv_claim.claim_number}-{patient.id}-{uuid.uuid4().hex[:6].upper()}"
        
        # Fälligkeitsdatum (30 Tage nach Rechnungsdatum)
        due_date = date.today() + timedelta(days=30)
        
        invoice = PatientCopayInvoice.objects.create(
            patient=patient,
            gkv_claim=gkv_claim,
            invoice_number=invoice_number,
            due_date=due_date,
            total_copay=total_copay,
            status='created'
        )
        
        # Markiere BillingItems als Patientenrechnung erstellt
        items = gkv_claim.billing_items.filter(appointment__patient=patient)
        for item in items:
            item.patient_invoice_created = True
            item.save()
        
        return invoice
    
    @staticmethod
    def create_private_patient_invoices(billing_cycle: BillingCycle) -> List[PrivatePatientInvoice]:
        """
        Erstellt vollständige Patientenrechnungen für Privatversicherte
        
        Args:
            billing_cycle: Der BillingCycle
            
        Returns:
            Liste der erstellten privaten Patientenrechnungen
        """
        invoices = []
        
        # Gruppiere private BillingItems nach Patienten
        private_items = billing_cycle.billing_items.filter(is_private_billing=True)
        
        patients_data = {}
        for item in private_items:
            patient = item.appointment.patient
            if patient.id not in patients_data:
                patients_data[patient.id] = {
                    'patient': patient,
                    'total_amount': Decimal('0.00')
                }
            patients_data[patient.id]['total_amount'] += item.get_total_amount()
        
        # Erstelle eine Rechnung pro Patient
        for patient_id, data in patients_data.items():
            patient = data['patient']
            total_amount = data['total_amount']
            
            invoice = GKVBillingService._create_private_invoice(billing_cycle, patient, total_amount)
            invoices.append(invoice)
        
        return invoices
    
    @staticmethod
    def _create_private_invoice(billing_cycle: BillingCycle, patient: Patient, total_amount: Decimal) -> PrivatePatientInvoice:
        """Erstellt eine einzelne private Patientenrechnung"""
        
        # Generiere eindeutige Rechnungsnummer
        invoice_number = f"P-{billing_cycle.id}-{patient.id}-{uuid.uuid4().hex[:6].upper()}"
        
        # Fälligkeitsdatum (30 Tage nach Rechnungsdatum)
        due_date = date.today() + timedelta(days=30)
        
        invoice = PrivatePatientInvoice.objects.create(
            patient=patient,
            billing_cycle=billing_cycle,
            invoice_number=invoice_number,
            due_date=due_date,
            total_amount=total_amount,
            status='created'
        )
        
        return invoice
    
    @staticmethod
    def generate_billing_summary(billing_cycle: BillingCycle) -> Dict:
        """
        Generiert eine Zusammenfassung der Abrechnung
        
        Args:
            billing_cycle: Der BillingCycle
            
        Returns:
            Dictionary mit der Abrechnungszusammenfassung
        """
        summary = {
            'billing_cycle': billing_cycle,
            'total_items': billing_cycle.billing_items.count(),
            'gkv_items': billing_cycle.billing_items.filter(is_gkv_billing=True).count(),
            'private_items': billing_cycle.billing_items.filter(is_private_billing=True).count(),
            'self_pay_items': billing_cycle.billing_items.filter(is_self_pay_billing=True).count(),
            'total_insurance_amount': Decimal('0.00'),
            'total_patient_amount': Decimal('0.00'),
            'gkv_claims': [],
            'patient_copay_invoices': [],
            'private_invoices': []
        }
        
        # Berechne Gesamtbeträge
        for item in billing_cycle.billing_items.all():
            summary['total_insurance_amount'] += item.get_insurance_amount()
            summary['total_patient_amount'] += item.get_patient_amount()
        
        # GKV-Ansprüche
        gkv_claims = GKVInsuranceClaim.objects.filter(billing_cycle=billing_cycle)
        for claim in gkv_claims:
            claim_summary = {
                'claim': claim,
                'insurance_provider': claim.insurance_provider,
                'total_insurance_amount': claim.total_insurance_amount,
                'total_patient_copay': claim.total_patient_copay,
                'patients_count': len(claim.get_patients_summary()),
                'prescriptions_count': len(claim.get_prescriptions_summary())
            }
            summary['gkv_claims'].append(claim_summary)
        
        # Patienten-Zuzahlungsrechnungen
        copay_invoices = PatientCopayInvoice.objects.filter(gkv_claim__billing_cycle=billing_cycle)
        for invoice in copay_invoices:
            invoice_summary = {
                'invoice': invoice,
                'patient': invoice.patient,
                'total_copay': invoice.total_copay,
                'status': invoice.status,
                'is_overdue': invoice.is_overdue
            }
            summary['patient_copay_invoices'].append(invoice_summary)
        
        # Private Patientenrechnungen
        private_invoices = PrivatePatientInvoice.objects.filter(billing_cycle=billing_cycle)
        for invoice in private_invoices:
            invoice_summary = {
                'invoice': invoice,
                'patient': invoice.patient,
                'total_amount': invoice.total_amount,
                'status': invoice.status,
                'is_overdue': invoice.is_overdue
            }
            summary['private_invoices'].append(invoice_summary)
        
        return summary
    
    @staticmethod
    def get_structured_billing_data(gkv_claim: GKVInsuranceClaim) -> Dict:
        """
        Generiert strukturierte Abrechnungsdaten für GKV-Export
        
        Args:
            gkv_claim: Der GKV-Anspruch
            
        Returns:
            Strukturierte Abrechnungsdaten
        """
        structured_data = {
            'claim_info': {
                'claim_number': gkv_claim.claim_number,
                'insurance_provider': gkv_claim.insurance_provider.name,
                'claim_date': gkv_claim.claim_date,
                'total_insurance_amount': gkv_claim.total_insurance_amount,
                'total_patient_copay': gkv_claim.total_patient_copay
            },
            'patients': [],
            'prescriptions': [],
            'treatments': []
        }
        
        # Patienten-Daten
        patients_summary = gkv_claim.get_patients_summary()
        for patient_id, data in patients_summary.items():
            patient_data = {
                'patient': {
                    'id': data['patient'].id,
                    'name': data['patient'].full_name,
                    'insurance_number': data['patient'].insurances.first().insurance_number if data['patient'].insurances.exists() else None
                },
                'total_insurance': data['total_insurance'],
                'total_copay': data['total_copay'],
                'items_count': len(data['items'])
            }
            structured_data['patients'].append(patient_data)
        
        # Verordnungs-Daten
        prescriptions_summary = gkv_claim.get_prescriptions_summary()
        for prescription_id, data in prescriptions_summary.items():
            prescription_data = {
                'prescription': {
                    'id': data['prescription'].id,
                    'diagnosis': data['prescription'].diagnosis_text,
                    'doctor': f"{data['prescription'].doctor.first_name} {data['prescription'].doctor.last_name}",
                    'prescription_date': data['prescription'].prescription_date
                },
                'total_insurance': data['total_insurance'],
                'total_copay': data['total_copay'],
                'items_count': len(data['items'])
            }
            structured_data['prescriptions'].append(prescription_data)
        
        # Behandlungs-Daten
        treatments_data = {}
        for item in gkv_claim.billing_items.all():
            treatment = item.treatment
            if treatment.id not in treatments_data:
                treatments_data[treatment.id] = {
                    'treatment': {
                        'id': treatment.id,
                        'name': treatment.treatment_name,
                        'legs_code': treatment.legs_code,
                        'is_telemedicine': treatment.is_telemedicine
                    },
                    'count': 0,
                    'total_insurance': Decimal('0.00'),
                    'total_copay': Decimal('0.00')
                }
            treatments_data[treatment.id]['count'] += 1
            treatments_data[treatment.id]['total_insurance'] += item.insurance_amount
            treatments_data[treatment.id]['total_copay'] += item.patient_copay
        
        structured_data['treatments'] = list(treatments_data.values())
        
        return structured_data
    
    @staticmethod
    @transaction.atomic
    def process_complete_billing_cycle(billing_cycle: BillingCycle) -> Dict:
        """
        Verarbeitet einen kompletten BillingCycle und erstellt alle notwendigen Abrechnungen
        
        Args:
            billing_cycle: Der zu verarbeitende BillingCycle
            
        Returns:
            Dictionary mit den Ergebnissen der Verarbeitung
        """
        results = {
            'billing_cycle': billing_cycle,
            'gkv_claims_created': 0,
            'copay_invoices_created': 0,
            'private_invoices_created': 0,
            'errors': []
        }
        
        try:
            # 1. Erstelle GKV-Ansprüche
            gkv_claims = GKVBillingService.create_gkv_claims_from_billing_cycle(billing_cycle)
            results['gkv_claims_created'] = len(gkv_claims)
            
            # 2. Erstelle Patienten-Zuzahlungsrechnungen für GKV
            for gkv_claim in gkv_claims:
                copay_invoices = GKVBillingService.create_patient_copay_invoices(gkv_claim)
                results['copay_invoices_created'] += len(copay_invoices)
            
            # 3. Erstelle private Patientenrechnungen
            private_invoices = GKVBillingService.create_private_patient_invoices(billing_cycle)
            results['private_invoices_created'] = len(private_invoices)
            
            # 4. Markiere BillingCycle als verarbeitet
            billing_cycle.status = 'ready'
            billing_cycle.save()
            
        except Exception as e:
            results['errors'].append(str(e))
            raise
        
        return results 