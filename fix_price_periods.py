#!/usr/bin/env python3
"""
Skript zum Korrigieren der zeitlichen Gültigkeiten der bestehenden Preise
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import Treatment, Surcharge, InsuranceProviderGroup
from core.services.price_service import PriceService

def fix_price_periods():
    """Korrigiert die zeitlichen Gültigkeiten der bestehenden Preise"""
    
    print("Korrigiere zeitliche Gültigkeiten der Preise...")
    
    # 1. Lösche alle bestehenden Surcharges
    print("1. Lösche alle bestehenden Preisperioden...")
    Surcharge.objects.all().delete()
    
    # 2. Hole die Krankenkassen-Gruppen
    gesetzlich = InsuranceProviderGroup.objects.get(name='Gesetzliche Krankenkassen')
    privat = InsuranceProviderGroup.objects.get(name='Private Krankenversicherungen')
    
    # 3. GKV-Preise 2023 (bis 30.06.2025)
    gkv_prices_2023 = {
        'Krankengymnastik': Decimal('26.12'),
        'Krankengymnastik Telemedizin': Decimal('26.12'),
        'Manuelle Therapie': Decimal('31.37'),
        'Manuelle Therapie Telemedizin': Decimal('31.37'),
        'Klassische Massage': Decimal('19.06'),
        'Bindegewebsmassage': Decimal('22.90'),
        'Manuelle Lymphdrainage 45min': Decimal('47.54'),
        'Manuelle Lymphdrainage 60min': Decimal('63.40'),
        'KG Atmungsorgane': Decimal('78.38'),
        'KG-ZNS Bobath Kinder': Decimal('51.85'),
        'KG-ZNS Bobath Erwachsene': Decimal('41.48'),
        'Elektrotherapie': Decimal('7.43'),
        'Warmpackung': Decimal('14.24'),
        'Übungsbehandlung Einzel': Decimal('12.06'),
    }
    
    # 4. GKV-Preise 2025 (ab 01.07.2025)
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
    
    # 5. Private Preise (konstant)
    private_prices = {
        'Krankengymnastik': Decimal('35.00'),
        'Krankengymnastik Telemedizin': Decimal('35.00'),
        'Manuelle Therapie': Decimal('45.00'),
        'Manuelle Therapie Telemedizin': Decimal('45.00'),
        'Klassische Massage': Decimal('30.00'),
        'Bindegewebsmassage': Decimal('35.00'),
        'Manuelle Lymphdrainage 45min': Decimal('65.00'),
        'Manuelle Lymphdrainage 60min': Decimal('85.00'),
        'KG Atmungsorgane': Decimal('95.00'),
        'KG-ZNS Bobath Kinder': Decimal('70.00'),
        'KG-ZNS Bobath Erwachsene': Decimal('60.00'),
        'Elektrotherapie': Decimal('15.00'),
        'Warmpackung': Decimal('25.00'),
        'Übungsbehandlung Einzel': Decimal('20.00'),
    }
    
    # 6. Erstelle Preisperioden für GKV 2023
    print("2. Erstelle GKV-Preise 2023 (01.01.2023 - 30.06.2025)...")
    treatments = Treatment.objects.filter(is_self_pay=False)
    
    for treatment in treatments:
        if treatment.treatment_name in gkv_prices_2023:
            try:
                PriceService.create_price_period(
                    treatment=treatment,
                    insurance_provider_group=gesetzlich,
                    insurance_payment=gkv_prices_2023[treatment.treatment_name],
                    patient_payment=Decimal('5.00'),  # Standard GKV-Zuzahlung
                    valid_from=date(2023, 1, 1),
                    valid_until=date(2025, 6, 30)
                )
                print(f"✓ {treatment.treatment_name} 2023: {gkv_prices_2023[treatment.treatment_name]}€")
            except Exception as e:
                print(f"✗ Fehler bei {treatment.treatment_name}: {e}")
    
    # 7. Erstelle Preisperioden für GKV 2025
    print("\n3. Erstelle GKV-Preise 2025 (01.07.2025 - 31.12.2026)...")
    for treatment in treatments:
        if treatment.treatment_name in gkv_prices_2025:
            try:
                PriceService.create_price_period(
                    treatment=treatment,
                    insurance_provider_group=gesetzlich,
                    insurance_payment=gkv_prices_2025[treatment.treatment_name],
                    patient_payment=Decimal('5.00'),  # Standard GKV-Zuzahlung
                    valid_from=date(2025, 7, 1),
                    valid_until=date(2026, 12, 31)
                )
                print(f"✓ {treatment.treatment_name} 2025: {gkv_prices_2025[treatment.treatment_name]}€")
            except Exception as e:
                print(f"✗ Fehler bei {treatment.treatment_name}: {e}")
    
    # 8. Erstelle Preisperioden für Private Krankenversicherungen
    print("\n4. Erstelle Private Preise (01.01.2023 - 31.12.2026)...")
    for treatment in treatments:
        if treatment.treatment_name in private_prices:
            try:
                PriceService.create_price_period(
                    treatment=treatment,
                    insurance_provider_group=privat,
                    insurance_payment=private_prices[treatment.treatment_name],
                    patient_payment=Decimal('0.00'),  # Keine Zuzahlung bei Privaten
                    valid_from=date(2023, 1, 1),
                    valid_until=date(2026, 12, 31)
                )
                print(f"✓ {treatment.treatment_name} Privat: {private_prices[treatment.treatment_name]}€")
            except Exception as e:
                print(f"✗ Fehler bei {treatment.treatment_name}: {e}")
    
    # 9. Validiere alle Preisperioden
    print("\n5. Validiere Preisperioden...")
    errors = PriceService.validate_price_periods()
    
    if errors:
        print(f"⚠️  {len(errors)} Validierungsfehler gefunden:")
        for error in errors:
            print(f"  - {error['message']}")
    else:
        print("✅ Alle Preisperioden sind gültig!")
    
    # 10. Zeige Zusammenfassung
    print("\n=== ZUSAMMENFASSUNG ===")
    total_surcharges = Surcharge.objects.count()
    print(f"Gesamtanzahl Preisperioden: {total_surcharges}")
    
    # Zeige Preise für verschiedene Zeitpunkte
    test_dates = [
        date(2024, 6, 15),  # 2023er Preise
        date(2025, 8, 15),  # 2025er Preise
        date(2027, 1, 15),  # Keine Preise
    ]
    
    for test_date in test_dates:
        prices = PriceService.get_all_valid_prices_for_date(test_date)
        print(f"\nGültige Preise zum {test_date}: {len(prices)} Preise")
        
        # Zeige einige Beispiele
        gkv_prices = [p for p in prices.values() if p['insurance_group'].name == 'Gesetzliche Krankenkassen']
        if gkv_prices:
            example = gkv_prices[0]
            print(f"  Beispiel GKV: {example['treatment'].treatment_name} - {example['insurance_payment']}€")

if __name__ == '__main__':
    fix_price_periods() 