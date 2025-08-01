from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

from django.db import transaction, models
from django.db.models import Sum
from django.core.exceptions import ValidationError

from core.models import (
    BillingCycle,
    BillingItem,
    Appointment,
    Prescription,
    InsuranceProvider,
    PatientInsurance,
    Surcharge
)

class BillingService:
    @staticmethod
    def create_billing_cycle(
        insurance_provider: InsuranceProvider,
        start_date: date,
        end_date: date
    ) -> BillingCycle:
        """Erstellt einen neuen Abrechnungszyklus für eine Krankenkasse"""
        if start_date >= end_date:
            raise ValidationError("Enddatum muss nach Startdatum liegen")

        # Prüfen ob es überlappende Zyklen gibt
        existing_cycle = BillingCycle.objects.filter(
            insurance_provider=insurance_provider,
            start_date__lte=end_date,
            end_date__gte=start_date
        ).first()

        if existing_cycle:
            raise ValidationError(
                f"Es existiert bereits ein Abrechnungszyklus für diesen Zeitraum: {existing_cycle}"
            )

        return BillingCycle.objects.create(
            insurance_provider=insurance_provider,
            start_date=start_date,
            end_date=end_date,
            status='draft'
        )

    @staticmethod
    def generate_billing_report(billing_cycle: BillingCycle) -> dict:
        """Generiert einen Abrechnungsbericht für einen Zyklus"""
        items = billing_cycle.billing_items.all()
        
        return {
            'total_items': items.count(),
            'total_insurance_amount': items.aggregate(Sum('insurance_amount'))['insurance_amount__sum'] or Decimal('0.00'),
            'total_patient_copay': items.aggregate(Sum('patient_copay'))['patient_copay__sum'] or Decimal('0.00'),
            'treatments_breakdown': items.values('treatment__treatment_name').annotate(
                count=models.Count('id'),
                total_amount=models.Sum('insurance_amount')
            )
        }

    @staticmethod
    def get_billable_appointments(
        start_date: date,
        end_date: date,
        insurance_provider: InsuranceProvider
    ) -> List[Appointment]:
        """
        Findet alle abrechenbaren Termine für eine Krankenkasse im gegebenen Zeitraum
        """
        return Appointment.objects.filter(
            appointment_date__date__gte=start_date,
            appointment_date__date__lte=end_date,
            status='ready_to_bill',
            prescription__patient_insurance__insurance_provider=insurance_provider,
            prescription__treatment_1__is_self_pay=False
        ).exclude(
            billing_items__isnull=False
        )

    @staticmethod
    def get_self_pay_appointments(
        start_date: date,
        end_date: date
    ) -> List[Appointment]:
        """
        Findet alle Selbstzahler-Termine im gegebenen Zeitraum
        """
        return Appointment.objects.filter(
            appointment_date__date__gte=start_date,
            appointment_date__date__lte=end_date,
            status='ready_to_bill',
            treatment__is_self_pay=True
        ).exclude(
            billing_items__isnull=False
        )

    @staticmethod
    @transaction.atomic
    def create_billing_items(billing_cycle: BillingCycle, appointments: List[Appointment]) -> List[BillingItem]:
        """Erstellt Abrechnungspositionen für die gegebenen Termine"""
        billing_items = []
        insurance_total = Decimal('0.00')
        copay_total = Decimal('0.00')
        
        for appointment in appointments:
            try:
                # Prüfe ob der Termin abgerechnet werden kann
                if not appointment.can_be_billed():
                    raise ValidationError(f"Termin {appointment.id} kann nicht abgerechnet werden.")
                
                # Hole die Abrechnungsbeträge
                billing_amount = appointment.get_billing_amount()
                if not billing_amount:
                    raise ValidationError(f"Keine Abrechnungsbeträge für Termin {appointment.id} gefunden.")
                
                # Erstelle BillingItem
                billing_item = BillingItem.objects.create(
                    billing_cycle=billing_cycle,
                    prescription=appointment.prescription,  # Kann null sein für Selbstzahler
                    appointment=appointment,
                    treatment=appointment.treatment,
                    insurance_amount=billing_amount['insurance_amount'],
                    patient_copay=billing_amount['patient_copay']
                )
                billing_items.append(billing_item)
                
                # Summen aktualisieren
                insurance_total += billing_amount['insurance_amount']
                copay_total += billing_amount['patient_copay']
                
            except Exception as e:
                raise ValidationError(f"Fehler beim Erstellen der Abrechnungsposition für Termin {appointment.id}: {str(e)}")

        # Gesamtsummen im Abrechnungszyklus aktualisieren
        billing_cycle.total_insurance_amount = insurance_total
        billing_cycle.total_patient_copay = copay_total
        billing_cycle.save()
        
        return billing_items

    @staticmethod
    @transaction.atomic
    def create_self_pay_billing_items(appointments: List[Appointment]) -> List[BillingItem]:
        """Erstellt Abrechnungspositionen für Selbstzahler-Termine"""
        billing_items = []
        
        for appointment in appointments:
            try:
                # Prüfe ob es sich um eine Selbstzahler-Behandlung handelt
                if not appointment.is_self_pay():
                    raise ValidationError(f"Termin {appointment.id} ist keine Selbstzahler-Behandlung.")
                
                # Prüfe ob der Termin abgerechnet werden kann
                if not appointment.can_be_billed():
                    raise ValidationError(f"Termin {appointment.id} kann nicht abgerechnet werden.")
                
                # Hole die Abrechnungsbeträge
                billing_amount = appointment.get_billing_amount()
                if not billing_amount:
                    raise ValidationError(f"Keine Abrechnungsbeträge für Termin {appointment.id} gefunden.")
                
                # Erstelle BillingItem ohne BillingCycle (für separate Patientenrechnung)
                billing_item = BillingItem.objects.create(
                    billing_cycle=None,  # Wird später zugeordnet
                    prescription=None,  # Keine Verordnung bei Selbstzahlern
                    appointment=appointment,
                    treatment=appointment.treatment,
                    insurance_amount=Decimal('0.00'),  # Keine KK-Beteiligung
                    patient_copay=billing_amount['patient_copay']
                )
                billing_items.append(billing_item)
                
            except Exception as e:
                raise ValidationError(f"Fehler beim Erstellen der Selbstzahler-Abrechnung für Termin {appointment.id}: {str(e)}")
        
        return billing_items

    @staticmethod
    def submit_billing_cycle(billing_cycle: BillingCycle) -> None:
        """Reicht einen Abrechnungszyklus ein"""
        if billing_cycle.status != 'draft':
            raise ValidationError(
                f"Abrechnungszyklus kann nicht eingereicht werden. Aktueller Status: {billing_cycle.status}"
            )

        if not billing_cycle.billing_items.exists():
            raise ValidationError("Keine Abrechnungspositionen vorhanden")

        billing_cycle.status = 'submitted'
        billing_cycle.save()

    @staticmethod
    def mark_cycle_as_paid(
        billing_cycle: BillingCycle,
        payment_date: date = None
    ) -> None:
        """Markiert einen Abrechnungszyklus als bezahlt"""
        if billing_cycle.status != 'submitted':
            raise ValidationError(
                f"Abrechnungszyklus muss erst eingereicht werden. Aktueller Status: {billing_cycle.status}"
            )

        billing_cycle.status = 'paid'
        billing_cycle.payment_date = payment_date or date.today()
        billing_cycle.save()

    @staticmethod
    def get_cycle_statistics(billing_cycle: BillingCycle) -> dict:
        """Berechnet Statistiken für einen Abrechnungszyklus"""
        items = billing_cycle.billing_items.all()
        
        return {
            'total_items': items.count(),
            'total_insurance_amount': items.aggregate(Sum('insurance_amount'))['insurance_amount__sum'] or Decimal('0.00'),
            'total_patient_copay': items.aggregate(Sum('patient_copay'))['patient_copay__sum'] or Decimal('0.00'),
            'treatments_breakdown': items.values('treatment__treatment_name').annotate(
                count=models.Count('id'),
                total_amount=models.Sum('insurance_amount')
            )
        }

    @staticmethod
    def mark_appointments_ready_to_bill(appointments: List[Appointment]) -> int:
        """
        Markiert abgeschlossene Termine als abrechnungsbereit.
        Returns: Anzahl der aktualisierten Termine
        """
        updated = Appointment.objects.filter(
            id__in=[a.id for a in appointments],
            status='completed'
        ).update(status='ready_to_bill')
        
        return updated

    @staticmethod
    def get_completed_appointments(
        start_date: date,
        end_date: date,
        insurance_provider: InsuranceProvider
    ) -> List[Appointment]:
        """
        Findet alle abgeschlossenen Termine für eine Krankenkasse im gegebenen Zeitraum
        """
        return Appointment.objects.filter(
            appointment_date__date__gte=start_date,
            appointment_date__date__lte=end_date,
            status='completed',
            prescription__patient_insurance__insurance_provider=insurance_provider,
            prescription__treatment_1__is_self_pay=False
        ).exclude(
            billing_items__isnull=False
        )
