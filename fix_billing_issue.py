#!/usr/bin/env python3
"""
Behebt Billing-Probleme durch Erstellung fehlender Surcharges
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import (
    InsuranceProvider, InsuranceProviderGroup, Treatment, 
    Surcharge, Appointment, BillingItem
)

def fix_billing_issues():
    """Behebt Billing-Probleme"""
    print("🔧 Behebe Billing-Probleme...")
    
    # 1. Stelle sicher, dass alle Krankenkassen eine Gruppe haben
    print("\n1. Prüfe Krankenkassen-Gruppen...")
    
    # Erstelle Standard-Gruppen falls nicht vorhanden
    gesetzlich, created = InsuranceProviderGroup.objects.get_or_create(
        name="Gesetzliche Krankenkassen"
    )
    if created:
        print(f"✅ Gruppe erstellt: {gesetzlich.name}")
    
    privat, created = InsuranceProviderGroup.objects.get_or_create(
        name="Private Krankenversicherungen"
    )
    if created:
        print(f"✅ Gruppe erstellt: {privat.name}")
    
    # Ordne alle Krankenkassen Gruppen zu
    print("\nOrdne Krankenkassen Gruppen zu...")
    
    for kasse in InsuranceProvider.objects.all():
        if not kasse.group:
            # Bestimme Gruppe basierend auf Namen
            if any(keyword in kasse.name.lower() for keyword in ['aok', 'barmer', 'gek', 'techniker', 'tk']):
                kasse.group = gesetzlich
                print(f"✅ {kasse.name} → {gesetzlich.name}")
            elif any(keyword in kasse.name.lower() for keyword in ['allianz', 'private', 'privat']):
                kasse.group = privat
                print(f"✅ {kasse.name} → {privat.name}")
            else:
                # Standard: Gesetzlich
                kasse.group = gesetzlich
                print(f"✅ {kasse.name} → {gesetzlich.name} (Standard)")
            kasse.save()
    
    # 2. Erstelle fehlende Surcharges
    print("\n2. Erstelle fehlende Surcharges...")
    
    treatments = Treatment.objects.all()
    groups = InsuranceProviderGroup.objects.all()
    
    # Standard-Preise für verschiedene Behandlungen
    standard_prices = {
        'Krankengymnastik': {'insurance': Decimal('15.50'), 'patient': Decimal('5.00')},
        'Krankengymnastik im Bewegungsbad': {'insurance': Decimal('18.00'), 'patient': Decimal('5.00')},
        'Manuelle Therapie': {'insurance': Decimal('20.00'), 'patient': Decimal('5.00')},
        'Klassische Massage': {'insurance': Decimal('12.00'), 'patient': Decimal('5.00')},
        'Elektrotherapie': {'insurance': Decimal('8.00'), 'patient': Decimal('5.00')},
        'Ergotherapie': {'insurance': Decimal('16.00'), 'patient': Decimal('5.00')},
        'Wärmetherapie': {'insurance': Decimal('6.00'), 'patient': Decimal('5.00')},
    }
    
    created_count = 0
    for treatment in treatments:
        for group in groups:
            # Prüfe ob Surcharge bereits existiert
            existing = Surcharge.objects.filter(
                treatment=treatment,
                insurance_provider_group=group
            ).exists()
            
            if not existing:
                # Verwende Standard-Preis oder Fallback
                treatment_name = treatment.treatment_name
                if treatment_name in standard_prices:
                    prices = standard_prices[treatment_name]
                else:
                    # Fallback-Preise
                    prices = {'insurance': Decimal('15.00'), 'patient': Decimal('5.00')}
                
                Surcharge.objects.create(
                    treatment=treatment,
                    insurance_provider_group=group,
                    insurance_payment=prices['insurance'],
                    patient_payment=prices['patient'],
                    valid_from=date(2024, 1, 1),
                    valid_until=date(2099, 12, 31)
                )
                created_count += 1
                print(f"✅ Surcharge erstellt: {treatment.treatment_name} für {group.name}")
    
    print(f"✅ {created_count} Surcharges erstellt")
    
    # 3. Lösche bestehende BillingItems für Test
    print("\n3. Lösche bestehende BillingItems für Test...")
    
    existing_items = BillingItem.objects.count()
    if existing_items > 0:
        BillingItem.objects.all().delete()
        print(f"✅ {existing_items} bestehende BillingItems gelöscht")
    else:
        print("✅ Keine bestehenden BillingItems gefunden")
    
    # 4. Teste Billing-Funktionalität
    print("\n4. Teste Billing-Funktionalität...")
    
    ready_to_bill = Appointment.objects.filter(
        status='ready_to_bill',
        prescription__isnull=False
    ).count()
    
    print(f"✅ {ready_to_bill} abrechnungsbereite Termine gefunden")
    
    # Teste ein paar Termine
    test_appointments = Appointment.objects.filter(
        status='ready_to_bill',
        prescription__isnull=False
    )[:3]
    
    for appointment in test_appointments:
        can_bill = appointment.can_be_billed()
        billing_amount = appointment.get_billing_amount()
        
        print(f"  - Termin {appointment.id}: can_bill={can_bill}, amount={billing_amount}")
        
        if not can_bill:
            print(f"    ❌ Problem: Termin kann nicht abgerechnet werden")
        elif not billing_amount:
            print(f"    ❌ Problem: Keine Abrechnungsbeträge gefunden")
        else:
            print(f"    ✅ OK: KK={billing_amount['insurance_amount']}€, Patient={billing_amount['patient_copay']}€")

if __name__ == "__main__":
    fix_billing_issues() 