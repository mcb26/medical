#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import (
    BillingCycle, BillingItem, Appointment, Prescription, 
    Treatment, Patient, InsuranceProvider, Surcharge
)
from core.services.billing_service import BillingService

def create_billing_items_for_cycles():
    """Erstellt BillingItems für alle bestehenden BillingCycles"""
    
    print("🔍 Prüfe bestehende BillingCycles...")
    billing_cycles = BillingCycle.objects.all()
    
    if not billing_cycles.exists():
        print("❌ Keine BillingCycles gefunden!")
        return
    
    print(f"✅ {billing_cycles.count()} BillingCycles gefunden")
    
    for cycle in billing_cycles:
        print(f"\n📊 Verarbeite BillingCycle {cycle.id}: {cycle.insurance_provider.name}")
        print(f"   Zeitraum: {cycle.start_date} - {cycle.end_date}")
        
        # Prüfe ob bereits BillingItems existieren
        existing_items = BillingItem.objects.filter(billing_cycle=cycle)
        if existing_items.exists():
            print(f"   ⚠️  Bereits {existing_items.count()} BillingItems vorhanden")
            continue
        
        # Finde Termine im Zeitraum für diese Krankenkasse
        appointments = Appointment.objects.filter(
            appointment_date__date__gte=cycle.start_date,
            appointment_date__date__lte=cycle.end_date,
            prescription__patient_insurance__insurance_provider=cycle.insurance_provider
        ).select_related(
            'prescription__patient_insurance__insurance_provider',
            'treatment',
            'prescription'
        )
        
        print(f"   📅 {appointments.count()} Termine im Zeitraum gefunden")
        
        if not appointments.exists():
            print("   ⚠️  Keine Termine für diesen Zeitraum gefunden")
            continue
        
        # Erstelle BillingItems
        created_items = 0
        for appointment in appointments:
            try:
                # Prüfe ob bereits ein BillingItem für diesen Termin existiert
                if BillingItem.objects.filter(appointment=appointment).exists():
                    print(f"   ⚠️  BillingItem für Termin {appointment.id} bereits vorhanden")
                    continue
                
                # Berechne Abrechnungsbeträge
                billing_amount = appointment.get_billing_amount()
                if not billing_amount:
                    print(f"   ❌ Keine Abrechnungsbeträge für Termin {appointment.id}")
                    continue
                
                # Erstelle BillingItem
                billing_item = BillingItem.objects.create(
                    billing_cycle=cycle,
                    prescription=appointment.prescription,
                    appointment=appointment,
                    treatment=appointment.treatment,
                    insurance_amount=billing_amount['insurance_amount'],
                    patient_copay=billing_amount['patient_copay']
                )
                
                created_items += 1
                print(f"   ✅ BillingItem {billing_item.id} erstellt: {billing_amount['insurance_amount']}€ KK, {billing_amount['patient_copay']}€ Zuzahlung")
                
            except Exception as e:
                print(f"   ❌ Fehler bei Termin {appointment.id}: {str(e)}")
        
        # Aktualisiere Gesamtsummen im BillingCycle
        cycle.update_totals()
        print(f"   💰 Gesamtsummen aktualisiert: {cycle.total_insurance_amount}€ KK, {cycle.total_patient_copay}€ Zuzahlung")
        print(f"   📊 {created_items} neue BillingItems erstellt")

def check_surcharge_configuration():
    """Prüft die Surcharge-Konfiguration"""
    print("\n🔍 Prüfe Surcharge-Konfiguration...")
    
    surcharges = Surcharge.objects.all()
    print(f"✅ {surcharges.count()} Surcharge-Konfigurationen gefunden")
    
    for surcharge in surcharges:
        print(f"   💰 {surcharge.treatment.treatment_name} - {surcharge.insurance_provider_group.name}: {surcharge.insurance_payment}€ KK, {surcharge.patient_payment}€ Zuzahlung")

def main():
    print("🚀 Starte BillingItems-Erstellung...")
    
    # Prüfe Surcharge-Konfiguration
    check_surcharge_configuration()
    
    # Erstelle BillingItems
    create_billing_items_for_cycles()
    
    print("\n✅ BillingItems-Erstellung abgeschlossen!")

if __name__ == '__main__':
    main() 