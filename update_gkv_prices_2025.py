#!/usr/bin/env python3
"""
Skript zum Aktualisieren der GKV-Preise 2025
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import Treatment, Surcharge, InsuranceProviderGroup, InsuranceProvider

def update_gkv_prices_2025():
    """Aktualisiert die GKV-Preise auf die 2025er Preise"""
    
    print("Aktualisiere GKV-Preise 2025...")
    
    # GKV-Preise 2025 (ab 01.07.2025) - 4,01% Erhöhung gegenüber 2023
    # Quelle: https://thevea.de/praxis-wissen/preisliste-zuzahlung-physiotherapie/
    gkv_prices_2025 = {
        'Krankengymnastik': Decimal('27.17'),
        'Krankengymnastik Telemedizin': Decimal('27.17'),
        'Manuelle Therapie': Decimal('32.63'),
        'Manuelle Therapie Telemedizin': Decimal('32.63'),
        'Klassische Massage': Decimal('19.82'),
        'Bindegewebsmassage': Decimal('23.82'),
        'Manuelle Lymphdrainage 45min': Decimal('49.45'),
        'Manuelle Lymphdrainage 60min': Decimal('65.94'),
        'KG Atmungsorgane': Decimal('81.52'),
        'KG-ZNS Bobath Kinder': Decimal('53.93'),
        'KG-ZNS Bobath Erwachsene': Decimal('43.14'),
        'Elektrotherapie': Decimal('7.73'),
        'Warmpackung': Decimal('14.81'),
        'Übungsbehandlung Einzel': Decimal('12.54'),
    }
    
    # Hole die gesetzliche Krankenkassen-Gruppe
    gesetzlich = InsuranceProviderGroup.objects.get(name='Gesetzliche Krankenkassen')
    
    # Hole alle GKV-Behandlungen
    treatments = Treatment.objects.filter(is_self_pay=False)
    
    updated = 0
    for treatment in treatments:
        if treatment.treatment_name in gkv_prices_2025:
            surcharge, created = Surcharge.objects.get_or_create(
                treatment=treatment,
                insurance_provider_group=gesetzlich,
                defaults={
                    'insurance_payment': gkv_prices_2025[treatment.treatment_name],
                    'patient_payment': Decimal('0.00'),
                    'valid_from': date(2025, 7, 1),
                    'valid_until': date(2026, 12, 31)
                }
            )
            
            if not created:
                surcharge.insurance_payment = gkv_prices_2025[treatment.treatment_name]
                surcharge.valid_from = date(2025, 7, 1)
                surcharge.valid_until = date(2026, 12, 31)
                surcharge.save()
            
            updated += 1
            print(f"✓ {treatment.treatment_name}: {gkv_prices_2025[treatment.treatment_name]}€")
    
    print(f"\nPreise für {updated} Behandlungen aktualisiert!")
    
    # Zeige auch die neuen Krankenkassen-Gruppen
    print("\n=== KRANKENKASSEN GRUPPEN ===")
    groups = InsuranceProviderGroup.objects.all()
    for group in groups:
        print(f"Gruppe {group.id}: {group.name}")
        if group.description:
            print(f"  Beschreibung: {group.description}")
        
        providers = InsuranceProvider.objects.filter(group=group)
        if providers:
            print(f"  Krankenkassen ({providers.count()}):")
            for provider in providers:
                print(f"    - {provider.name} ({provider.provider_id})")
        print()

if __name__ == '__main__':
    update_gkv_prices_2025() 