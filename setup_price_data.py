#!/usr/bin/env python
"""
Skript zum Anlegen der Basisdaten für das Preissystem
- Behandlungstypen
- Standard-Preisliste für aktuelles Jahr
- Behandlungspreise (Platzhalter)
"""

import os
import sys
import django
from datetime import date, datetime
from decimal import Decimal

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import TreatmentType, PriceList, TreatmentPrice, Treatment

def create_treatment_types():
    """Erstellt die Standard-Behandlungstypen"""
    print("1. Erstelle Behandlungstypen...")
    
    treatment_types = [
        {
            'name': 'GKV/LEGS',
            'type_code': 'gkv',
            'description': 'Gesetzliche Krankenversicherung mit LEGS-Codes'
        },
        {
            'name': 'Privatleistung',
            'type_code': 'private',
            'description': 'Private Krankenversicherung'
        },
        {
            'name': 'Selbstzahler',
            'type_code': 'self_pay',
            'description': 'Selbstzahler ohne Versicherung'
        },
        {
            'name': 'Gemischt',
            'type_code': 'mixed',
            'description': 'Gemischt (GKV + Privat)'
        }
    ]
    
    created_count = 0
    for tt_data in treatment_types:
        treatment_type, created = TreatmentType.objects.get_or_create(
            type_code=tt_data['type_code'],
            defaults={
                'name': tt_data['name'],
                'description': tt_data['description'],
                'is_active': True
            }
        )
        if created:
            created_count += 1
            print(f"  ✓ {treatment_type.name}")
    
    print(f"  {created_count} neue Behandlungstypen erstellt")

def create_price_lists():
    """Erstellt Standard-Preislisten für das aktuelle Jahr"""
    print("2. Erstelle Preislisten...")
    
    current_year = date.today().year
    gkv_type = TreatmentType.objects.get(type_code='gkv')
    private_type = TreatmentType.objects.get(type_code='private')
    self_pay_type = TreatmentType.objects.get(type_code='self_pay')
    
    price_lists = [
        {
            'name': f'GKV Standard {current_year}',
            'treatment_type': gkv_type,
            'valid_from': date(current_year, 1, 1),
            'valid_until': None,  # Unbegrenzt
            'description': f'Standard GKV-Preise für {current_year}'
        },
        {
            'name': f'Privat Standard {current_year}',
            'treatment_type': private_type,
            'valid_from': date(current_year, 1, 1),
            'valid_until': None,
            'description': f'Standard Privatpreise für {current_year}'
        },
        {
            'name': f'Selbstzahler Standard {current_year}',
            'treatment_type': self_pay_type,
            'valid_from': date(current_year, 1, 1),
            'valid_until': None,
            'description': f'Standard Selbstzahler-Preise für {current_year}'
        }
    ]
    
    created_count = 0
    for pl_data in price_lists:
        price_list, created = PriceList.objects.get_or_create(
            name=pl_data['name'],
            defaults={
                'treatment_type': pl_data['treatment_type'],
                'valid_from': pl_data['valid_from'],
                'valid_until': pl_data['valid_until'],
                'description': pl_data['description'],
                'is_active': True
            }
        )
        if created:
            created_count += 1
            print(f"  ✓ {price_list.name}")
    
    print(f"  {created_count} neue Preislisten erstellt")
    return PriceList.objects.all()

def create_treatment_prices(price_lists):
    """Erstellt Behandlungspreise für bestehende Behandlungen"""
    print("3. Erstelle Behandlungspreise...")
    
    treatments = Treatment.objects.all()
    if not treatments.exists():
        print("  Keine Behandlungen gefunden. Führe zuerst create_test_data.py aus.")
        return
    
    gkv_price_list = price_lists.get(treatment_type__type_code='gkv')
    private_price_list = price_lists.get(treatment_type__type_code='private')
    self_pay_price_list = price_lists.get(treatment_type__type_code='self_pay')
    
    created_count = 0
    
    for treatment in treatments:
        # GKV-Preise (nur für GKV-Behandlungen)
        if not treatment.is_self_pay:
            gkv_price, created = TreatmentPrice.objects.get_or_create(
                treatment=treatment,
                price_list=gkv_price_list,
                defaults={
                    'gkv_price': Decimal('25.00'),  # Platzhalter
                    'copayment_amount': Decimal('5.00'),  # Platzhalter
                    'notes': 'Platzhalter-Preise - bitte anpassen',
                    'is_active': True
                }
            )
            if created:
                created_count += 1
        
        # Privatpreise
        private_price, created = TreatmentPrice.objects.get_or_create(
            treatment=treatment,
            price_list=private_price_list,
            defaults={
                'private_price': Decimal('35.00'),  # Platzhalter
                'notes': 'Platzhalter-Preise - bitte anpassen',
                'is_active': True
            }
        )
        if created:
            created_count += 1
        
        # Selbstzahler-Preise
        self_pay_price, created = TreatmentPrice.objects.get_or_create(
            treatment=treatment,
            price_list=self_pay_price_list,
            defaults={
                'self_pay_price': Decimal('45.00'),  # Platzhalter
                'notes': 'Platzhalter-Preise - bitte anpassen',
                'is_active': True
            }
        )
        if created:
            created_count += 1
    
    print(f"  {created_count} neue Behandlungspreise erstellt")

def main():
    """Hauptfunktion"""
    print("=== Preissystem Basisdaten Setup ===")
    print(f"Datum: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print()
    
    try:
        create_treatment_types()
        print()
        
        price_lists = create_price_lists()
        print()
        
        create_treatment_prices(price_lists)
        print()
        
        print("=== Setup abgeschlossen ===")
        print("Hinweise:")
        print("- Alle Preise sind Platzhalter und sollten angepasst werden")
        print("- Verwende die Preisverwaltung im Frontend (/price-management)")
        print("- Surcharge kann für kassengruppenspezifische Abweichungen verwendet werden")
        
    except Exception as e:
        print(f"Fehler beim Setup: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
