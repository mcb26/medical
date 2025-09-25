#!/usr/bin/env python3
"""
Skript zum Erstellen von Terminserien für August
"""

import os
import sys
import django
from datetime import date, timedelta, datetime, time
from decimal import Decimal
from django.utils import timezone

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import (
    Patient, PatientInsurance, Prescription, Appointment, 
    Practitioner, Room, Practice, Treatment, WorkingHour,
    InsuranceProvider, InsuranceProviderGroup
)

def create_working_hours():
    """Erstellt erweiterte Arbeitszeiten für August"""
    print("Erstelle erweiterte Arbeitszeiten...")
    
    # Hole den ersten Practitioner
    practitioner = Practitioner.objects.first()
    if not practitioner:
        print("❌ Kein Practitioner gefunden!")
        return
    
    # Lösche bestehende Arbeitszeiten für August
    WorkingHour.objects.filter(
        practitioner=practitioner,
        day_of_week__in=[1, 2, 3, 4, 5]  # Montag bis Freitag
    ).delete()
    
    # Erstelle erweiterte Arbeitszeiten für August
    working_hours = [
        # Montag
        {'day_of_week': 1, 'start_time': time(8, 0), 'end_time': time(18, 0)},
        # Dienstag  
        {'day_of_week': 2, 'start_time': time(8, 0), 'end_time': time(18, 0)},
        # Mittwoch
        {'day_of_week': 3, 'start_time': time(8, 0), 'end_time': time(18, 0)},
        # Donnerstag
        {'day_of_week': 4, 'start_time': time(8, 0), 'end_time': time(18, 0)},
        # Freitag
        {'day_of_week': 5, 'start_time': time(8, 0), 'end_time': time(16, 0)},
    ]
    
    for wh_data in working_hours:
        WorkingHour.objects.create(
            practitioner=practitioner,
            **wh_data
        )
    
    print(f"✅ {len(working_hours)} Arbeitszeiten erstellt")

def create_august_series():
    """Erstellt Terminserien für die ersten beiden Augustwochen"""
    print("Erstelle Terminserien für August...")
    
    # Hole benötigte Daten
    practitioner = Practitioner.objects.first()
    room = Room.objects.first()
    patients = list(Patient.objects.all()[:5])  # Erste 5 Patienten
    treatments = list(Treatment.objects.all()[:6])  # Erste 6 Behandlungen
    prescriptions = list(Prescription.objects.all()[:5])  # Erste 5 Verordnungen
    
    if not all([practitioner, room, patients, treatments, prescriptions]):
        print("❌ Nicht alle benötigten Daten gefunden!")
        return
    
    # August 2025 - erste beiden Wochen
    august_start = date(2025, 8, 1)
    august_end = date(2025, 8, 14)
    
    # Verschiedene Terminserien erstellen
    series_configs = [
        # Serie 1: Max Mustermann - Krankengymnastik (Mo, Mi, Fr)
        {
            'patient': patients[0],
            'treatment': treatments[0],  # Krankengymnastik
            'prescription': prescriptions[0],
            'days': [1, 3, 5],  # Mo, Mi, Fr
            'start_time': time(9, 0),
            'duration': 30,
            'series_name': 'Max KG Serie'
        },
        # Serie 2: Anna Schmidt - Massage (Di, Do)
        {
            'patient': patients[1],
            'treatment': treatments[1],  # Massage
            'prescription': prescriptions[1],
            'days': [2, 4],  # Di, Do
            'start_time': time(10, 30),
            'duration': 20,
            'series_name': 'Anna Massage Serie'
        },
        # Serie 3: Hans Müller - Elektrotherapie (Mo, Mi)
        {
            'patient': patients[2],
            'treatment': treatments[2],  # Elektrotherapie
            'prescription': prescriptions[2],
            'days': [1, 3],  # Mo, Mi
            'start_time': time(14, 0),
            'duration': 15,
            'series_name': 'Hans Elektro Serie'
        },
        # Serie 4: Maria Weber - Manuelle Therapie (Di, Fr)
        {
            'patient': patients[3],
            'treatment': treatments[3],  # Manuelle Therapie
            'prescription': prescriptions[3],
            'days': [2, 5],  # Di, Fr
            'start_time': time(11, 15),
            'duration': 25,
            'series_name': 'Maria Manuelle Serie'
        },
        # Serie 5: Peter Fischer - Wärmetherapie (Mo, Do)
        {
            'patient': patients[4],
            'treatment': treatments[4],  # Wärmetherapie
            'prescription': prescriptions[4],
            'days': [1, 4],  # Mo, Do
            'start_time': time(16, 0),
            'duration': 20,
            'series_name': 'Peter Wärme Serie'
        }
    ]
    
    total_appointments = 0
    
    for config in series_configs:
        print(f"\nErstelle Serie: {config['series_name']}")
        appointments_created = 0
        
        current_date = august_start
        while current_date <= august_end:
            # Prüfe ob der Tag in der Serie ist
            if current_date.weekday() + 1 in config['days']:  # weekday() ist 0-basiert
                # Erstelle Termin mit timezone-aware datetime
                appointment_datetime = timezone.make_aware(
                    datetime.combine(current_date, config['start_time'])
                )
                
                # Prüfe ob Termin bereits existiert
                existing = Appointment.objects.filter(
                    patient=config['patient'],
                    practitioner=practitioner,
                    appointment_date=appointment_datetime,
                    treatment=config['treatment']
                ).exists()
                
                if not existing:
                    Appointment.objects.create(
                        patient=config['patient'],
                        practitioner=practitioner,
                        room=room,
                        treatment=config['treatment'],
                        prescription=config['prescription'],
                        appointment_date=appointment_datetime,
                        duration_minutes=config['duration'],
                        status='scheduled',
                        series_identifier=config['series_name'],
                        is_recurring=True
                    )
                    appointments_created += 1
                    print(f"  - {config['patient'].first_name} {config['patient'].last_name} am {current_date.strftime('%d.%m.%Y')} - {config['treatment'].treatment_name}")
            
            current_date += timedelta(days=1)
        
        total_appointments += appointments_created
        print(f"  ✅ {appointments_created} Termine erstellt")
    
    print(f"\n✅ Insgesamt {total_appointments} neue Termine für August erstellt!")

def main():
    """Hauptfunktion"""
    print("🚀 Erstelle Terminserien für August...")
    
    # Erstelle Arbeitszeiten
    create_working_hours()
    
    # Erstelle Terminserien
    create_august_series()
    
    print("\n✅ Terminserien für August erfolgreich erstellt!")

if __name__ == "__main__":
    main() 