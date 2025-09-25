#!/usr/bin/env python
"""
Skript zum Setzen von Beispiel-LEGS-Codes für bestehende Behandlungen
"""

import os
import sys
import django

# Django-Setup
sys.path.append('/media/marvin/sda1/Code/medical')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import Treatment

def create_legs_codes():
    """Setzt Beispiel-LEGS-Codes für bestehende Behandlungen"""
    
    # Beispiel-LEGS-Codes für verschiedene Behandlungen
    legs_codes_data = {
        'Manuelle Therapie': {
            'accounting_code': '123',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Krankengymnastik': {
            'accounting_code': '124',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Massage': {
            'accounting_code': '125',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Elektrotherapie': {
            'accounting_code': '126',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Wärmetherapie': {
            'accounting_code': '127',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Kältetherapie': {
            'accounting_code': '128',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Ultraschalltherapie': {
            'accounting_code': '129',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Hydrotherapie': {
            'accounting_code': '130',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Atemtherapie': {
            'accounting_code': '131',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        },
        'Bewegungstherapie': {
            'accounting_code': '132',
            'tariff_indicator': '10',
            'prescription_type_indicator': 'VKZ 10',
            'is_telemedicine': False
        }
    }
    
    updated_count = 0
    
    for treatment_name, legs_data in legs_codes_data.items():
        try:
            # Suche nach Behandlungen mit ähnlichem Namen
            treatments = Treatment.objects.filter(
                treatment_name__icontains=treatment_name
            )
            
            if treatments.exists():
                for treatment in treatments:
                    treatment.accounting_code = legs_data['accounting_code']
                    treatment.tariff_indicator = legs_data['tariff_indicator']
                    treatment.prescription_type_indicator = legs_data['prescription_type_indicator']
                    treatment.is_telemedicine = legs_data['is_telemedicine']
                    treatment.save()
                    
                    print(f"✅ {treatment.treatment_name}: LEGS-Code {treatment.get_legs_code_display()} gesetzt")
                    updated_count += 1
            else:
                print(f"⚠️  Keine Behandlung gefunden für: {treatment_name}")
                
        except Exception as e:
            print(f"❌ Fehler bei {treatment_name}: {e}")
    
    # Setze auch für alle anderen Behandlungen Standard-LEGS-Codes
    remaining_treatments = Treatment.objects.filter(
        accounting_code__isnull=True
    )
    
    for i, treatment in enumerate(remaining_treatments):
        # Generiere eindeutige Codes für verbleibende Behandlungen
        base_code = 200 + i
        treatment.accounting_code = str(base_code).zfill(3)
        treatment.tariff_indicator = '10'
        treatment.prescription_type_indicator = 'VKZ 10'
        treatment.is_telemedicine = False
        treatment.save()
        
        print(f"✅ {treatment.treatment_name}: Standard LEGS-Code {treatment.get_legs_code_display()} gesetzt")
        updated_count += 1
    
    print(f"\n🎉 Insgesamt {updated_count} Behandlungen mit LEGS-Codes aktualisiert!")
    
    # Zeige Übersicht
    print("\n📊 Übersicht der LEGS-Codes:")
    for treatment in Treatment.objects.all().order_by('treatment_name'):
        print(f"  {treatment.treatment_name}: {treatment.get_legs_code_display()}")

if __name__ == '__main__':
    create_legs_codes() 