#!/usr/bin/env python3
"""
Service für die Preisverwaltung mit zeitlichen Gültigkeiten
"""

from datetime import date
from decimal import Decimal
from typing import Optional, Dict, List
from django.db.models import Q

from core.models import Treatment, Surcharge, InsuranceProviderGroup, InsuranceProvider


class PriceService:
    """Service für die Verwaltung von Preisen mit zeitlichen Gültigkeiten"""
    
    @staticmethod
    def get_valid_price_for_date(
        treatment: Treatment,
        insurance_provider_group: InsuranceProviderGroup,
        check_date: date = None
    ) -> Optional[Decimal]:
        """
        Ermittelt den gültigen Preis für eine Behandlung zu einem bestimmten Datum
        
        Args:
            treatment: Die Behandlung
            insurance_provider_group: Die Krankenkassen-Gruppe
            check_date: Das Datum für das der Preis ermittelt werden soll (Standard: heute)
            
        Returns:
            Der gültige Preis oder None wenn kein Preis gefunden wurde
        """
        if check_date is None:
            check_date = date.today()
            
        try:
            surcharge = Surcharge.objects.get(
                treatment=treatment,
                insurance_provider_group=insurance_provider_group,
                valid_from__lte=check_date,
                valid_until__gte=check_date
            )
            return surcharge.insurance_payment
        except Surcharge.DoesNotExist:
            return None
    
    @staticmethod
    def get_valid_patient_copay_for_date(
        treatment: Treatment,
        insurance_provider_group: InsuranceProviderGroup,
        check_date: date = None
    ) -> Optional[Decimal]:
        """
        Ermittelt die gültige Zuzahlung für eine Behandlung zu einem bestimmten Datum
        
        Args:
            treatment: Die Behandlung
            insurance_provider_group: Die Krankenkassen-Gruppe
            check_date: Das Datum für das die Zuzahlung ermittelt werden soll (Standard: heute)
            
        Returns:
            Die gültige Zuzahlung oder None wenn keine Zuzahlung gefunden wurde
        """
        if check_date is None:
            check_date = date.today()
            
        try:
            surcharge = Surcharge.objects.get(
                treatment=treatment,
                insurance_provider_group=insurance_provider_group,
                valid_from__lte=check_date,
                valid_until__gte=check_date
            )
            return surcharge.patient_payment
        except Surcharge.DoesNotExist:
            return None
    
    @staticmethod
    def get_price_history(
        treatment: Treatment,
        insurance_provider_group: InsuranceProviderGroup,
        start_date: date = None,
        end_date: date = None
    ) -> List[Dict]:
        """
        Ermittelt die Preisgeschichte für eine Behandlung
        
        Args:
            treatment: Die Behandlung
            insurance_provider_group: Die Krankenkassen-Gruppe
            start_date: Startdatum für die Suche (Standard: 1 Jahr zurück)
            end_date: Enddatum für die Suche (Standard: 1 Jahr in die Zukunft)
            
        Returns:
            Liste von Preisänderungen mit Datum und Betrag
        """
        if start_date is None:
            start_date = date.today().replace(year=date.today().year - 1)
        if end_date is None:
            end_date = date.today().replace(year=date.today().year + 1)
            
        surcharges = Surcharge.objects.filter(
            treatment=treatment,
            insurance_provider_group=insurance_provider_group,
            valid_from__lte=end_date,
            valid_until__gte=start_date
        ).order_by('valid_from')
        
        history = []
        for surcharge in surcharges:
            history.append({
                'valid_from': surcharge.valid_from,
                'valid_until': surcharge.valid_until,
                'insurance_payment': surcharge.insurance_payment,
                'patient_payment': surcharge.patient_payment,
                'surcharge_id': surcharge.id
            })
            
        return history
    
    @staticmethod
    def get_all_valid_prices_for_date(
        check_date: date = None,
        insurance_provider_group: InsuranceProviderGroup = None
    ) -> Dict:
        """
        Ermittelt alle gültigen Preise zu einem bestimmten Datum
        
        Args:
            check_date: Das Datum für das die Preise ermittelt werden sollen (Standard: heute)
            insurance_provider_group: Optional: Nur Preise für eine bestimmte Gruppe
            
        Returns:
            Dictionary mit Behandlung -> Preis Mapping
        """
        if check_date is None:
            check_date = date.today()
            
        query = Q(valid_from__lte=check_date, valid_until__gte=check_date)
        if insurance_provider_group:
            query &= Q(insurance_provider_group=insurance_provider_group)
            
        surcharges = Surcharge.objects.filter(query).select_related('treatment', 'insurance_provider_group')
        
        prices = {}
        for surcharge in surcharges:
            key = f"{surcharge.treatment.treatment_name} ({surcharge.insurance_provider_group.name})"
            prices[key] = {
                'treatment': surcharge.treatment,
                'insurance_group': surcharge.insurance_provider_group,
                'insurance_payment': surcharge.insurance_payment,
                'patient_payment': surcharge.patient_payment,
                'valid_from': surcharge.valid_from,
                'valid_until': surcharge.valid_until
            }
            
        return prices
    
    @staticmethod
    def create_price_period(
        treatment: Treatment,
        insurance_provider_group: InsuranceProviderGroup,
        insurance_payment: Decimal,
        patient_payment: Decimal,
        valid_from: date,
        valid_until: date = None
    ) -> Surcharge:
        """
        Erstellt eine neue Preisperiode
        
        Args:
            treatment: Die Behandlung
            insurance_provider_group: Die Krankenkassen-Gruppe
            insurance_payment: Der Krankenkassen-Betrag
            patient_payment: Die Patienten-Zuzahlung
            valid_from: Gültig ab
            valid_until: Gültig bis (Standard: 31.12.2099)
            
        Returns:
            Das erstellte Surcharge-Objekt
        """
        if valid_until is None:
            valid_until = date(2099, 12, 31)
            
        # Prüfe auf Überschneidungen
        overlapping = Surcharge.objects.filter(
            treatment=treatment,
            insurance_provider_group=insurance_provider_group,
            valid_from__lt=valid_until,
            valid_until__gt=valid_from
        )
        
        if overlapping.exists():
            raise ValueError(f"Preisperiode überschneidet sich mit bestehenden Perioden: {overlapping}")
            
        return Surcharge.objects.create(
            treatment=treatment,
            insurance_provider_group=insurance_provider_group,
            insurance_payment=insurance_payment,
            patient_payment=patient_payment,
            valid_from=valid_from,
            valid_until=valid_until
        )
    
    @staticmethod
    def update_price_period(
        surcharge_id: int,
        insurance_payment: Decimal = None,
        patient_payment: Decimal = None,
        valid_from: date = None,
        valid_until: date = None
    ) -> Surcharge:
        """
        Aktualisiert eine bestehende Preisperiode
        
        Args:
            surcharge_id: ID der zu aktualisierenden Preisperiode
            insurance_payment: Neuer Krankenkassen-Betrag (optional)
            patient_payment: Neue Patienten-Zuzahlung (optional)
            valid_from: Neues Gültig-ab-Datum (optional)
            valid_until: Neues Gültig-bis-Datum (optional)
            
        Returns:
            Das aktualisierte Surcharge-Objekt
        """
        surcharge = Surcharge.objects.get(id=surcharge_id)
        
        if insurance_payment is not None:
            surcharge.insurance_payment = insurance_payment
        if patient_payment is not None:
            surcharge.patient_payment = patient_payment
        if valid_from is not None:
            surcharge.valid_from = valid_from
        if valid_until is not None:
            surcharge.valid_until = valid_until
            
        surcharge.save()
        return surcharge
    
    @staticmethod
    def get_price_changes(
        start_date: date = None,
        end_date: date = None,
        insurance_provider_group: InsuranceProviderGroup = None
    ) -> List[Dict]:
        """
        Ermittelt alle Preisänderungen in einem Zeitraum
        
        Args:
            start_date: Startdatum (Standard: 1 Jahr zurück)
            end_date: Enddatum (Standard: 1 Jahr in die Zukunft)
            insurance_provider_group: Optional: Nur für eine bestimmte Gruppe
            
        Returns:
            Liste von Preisänderungen
        """
        if start_date is None:
            start_date = date.today().replace(year=date.today().year - 1)
        if end_date is None:
            end_date = date.today().replace(year=date.today().year + 1)
            
        query = Q(valid_from__lte=end_date, valid_until__gte=start_date)
        if insurance_provider_group:
            query &= Q(insurance_provider_group=insurance_provider_group)
            
        surcharges = Surcharge.objects.filter(query).select_related(
            'treatment', 'insurance_provider_group'
        ).order_by('valid_from')
        
        changes = []
        for surcharge in surcharges:
            changes.append({
                'treatment_name': surcharge.treatment.treatment_name,
                'insurance_group': surcharge.insurance_provider_group.name,
                'insurance_payment': surcharge.insurance_payment,
                'patient_payment': surcharge.patient_payment,
                'valid_from': surcharge.valid_from,
                'valid_until': surcharge.valid_until,
                'change_type': 'price_update'
            })
            
        return changes
    
    @staticmethod
    def validate_price_periods() -> List[Dict]:
        """
        Validiert alle Preisperioden auf Überschneidungen und Lücken
        
        Returns:
            Liste von Validierungsfehlern
        """
        errors = []
        
        # Prüfe auf Überschneidungen
        surcharges = Surcharge.objects.all().select_related('treatment', 'insurance_provider_group')
        
        for i, surcharge1 in enumerate(surcharges):
            for surcharge2 in surcharges[i+1:]:
                if (surcharge1.treatment == surcharge2.treatment and 
                    surcharge1.insurance_provider_group == surcharge2.insurance_provider_group):
                    
                    # Prüfe auf Überschneidung
                    if (surcharge1.valid_from < surcharge2.valid_until and 
                        surcharge1.valid_until > surcharge2.valid_from):
                        
                        errors.append({
                            'type': 'overlap',
                            'message': f"Überschneidung bei {surcharge1.treatment.treatment_name} ({surcharge1.insurance_provider_group.name})",
                            'surcharge1_id': surcharge1.id,
                            'surcharge2_id': surcharge2.id,
                            'period1': f"{surcharge1.valid_from} - {surcharge1.valid_until}",
                            'period2': f"{surcharge2.valid_from} - {surcharge2.valid_until}"
                        })
        
        return errors 