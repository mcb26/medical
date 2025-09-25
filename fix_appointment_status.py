#!/usr/bin/env python3
"""
Skript zum Korrigieren der Terminstati für die Abrechnung
"""

import os
import sys
import django
from datetime import date, timedelta

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import Appointment

def fix_appointment_status():
    """Korrigiert die Terminstati für die Abrechnung"""
    print("Korrigiere Terminstati für die Abrechnung...")
    
    # Setze vergangene Termine auf 'ready_to_bill' (für Abrechnung)
    past_date = date.today() - timedelta(days=1)
    
    # Finde alle scheduled Termine in der Vergangenheit
    past_scheduled = Appointment.objects.filter(
        appointment_date__date__lt=past_date,
        status='scheduled',
        prescription__isnull=False  # Nur Termine mit Verordnung
    )
    
    print(f"Gefunden: {past_scheduled.count()} vergangene scheduled Termine mit Verordnung")
    
    # Setze sie auf 'ready_to_bill'
    updated_count = past_scheduled.update(status='ready_to_bill')
    print(f"✅ {updated_count} Termine auf 'ready_to_bill' gesetzt")
    
    # Zeige Statistik
    print("\n📊 Terminstati Übersicht:")
    status_counts = Appointment.objects.values('status').annotate(
        count=django.db.models.Count('id')
    )
    
    for status_info in status_counts:
        print(f"  - {status_info['status']}: {status_info['count']} Termine")
    
    # Zeige abrechnungsbereite Termine
    ready_to_bill = Appointment.objects.filter(
        status='ready_to_bill',
        prescription__isnull=False
    ).count()
    
    print(f"\n💰 Abrechnungsbereite Termine: {ready_to_bill}")
    
    if ready_to_bill > 0:
        print("✅ Termine sind bereit für die Abrechnung!")
        
        # Zeige Termine nach Krankenkasse
        print("\n📋 Termine nach Krankenkasse:")
        from django.db.models import Count
        kk_counts = Appointment.objects.filter(
            status='ready_to_bill'
        ).values(
            'patient__insurances__insurance_provider__name'
        ).annotate(
            count=Count('id')
        )
        
        for kk in kk_counts:
            provider_name = kk['patient__insurances__insurance_provider__name'] or 'Unbekannt'
            print(f"  - {provider_name}: {kk['count']} Termine")
            
    else:
        print("⚠️  Keine abrechnungsbereiten Termine gefunden")

if __name__ == "__main__":
    fix_appointment_status() 