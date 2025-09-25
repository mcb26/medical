#!/usr/bin/env python3
"""
Debug-Script um series_identifier zu überprüfen
"""

import os
import sys
import django

# Django Setup
sys.path.append('/media/marvin/sda1/Code/medical')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import Appointment

def debug_series_identifiers():
    """Debug series_identifier in der Datenbank"""
    print("=== DEBUG: Series Identifiers ===")
    
    # Alle Termine mit series_identifier
    appointments_with_series = Appointment.objects.filter(series_identifier__isnull=False).exclude(series_identifier='')
    
    print(f"Termine mit series_identifier: {appointments_with_series.count()}")
    
    # Gruppiere nach series_identifier
    series_groups = {}
    for appointment in appointments_with_series:
        series_id = appointment.series_identifier
        if series_id not in series_groups:
            series_groups[series_id] = []
        series_groups[series_id].append(appointment)
    
    print(f"\nGefundene Serien:")
    for series_id, appointments in series_groups.items():
        print(f"\nSerie: {series_id}")
        print(f"  Anzahl Termine: {len(appointments)}")
        for appt in appointments[:3]:  # Zeige nur die ersten 3
            print(f"    - {appt.id}: {appt.appointment_date} - {appt.patient}")
        if len(appointments) > 3:
            print(f"    ... und {len(appointments) - 3} weitere")
    
    # Alle Termine ohne series_identifier
    appointments_without_series = Appointment.objects.filter(series_identifier__isnull=True) | Appointment.objects.filter(series_identifier='')
    print(f"\nTermine ohne series_identifier: {appointments_without_series.count()}")
    
    # Zeige einige Beispiele
    print("\nBeispiele für Termine ohne series_identifier:")
    for appt in appointments_without_series[:5]:
        print(f"  - {appt.id}: {appt.appointment_date} - {appt.patient}")

if __name__ == '__main__':
    debug_series_identifiers()
