#!/usr/bin/env python3
"""
Vereinfachtes Skript zum Erstellen von Testdaten für die Abrechnung
"""

import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import (
    InsuranceProvider, InsuranceProviderGroup, Treatment, 
    Surcharge, Patient, PatientInsurance, Prescription, 
    Appointment, Practitioner, Room, Practice, Bundesland,
    Doctor, ICDCode
)

def create_test_data():
    """Erstellt Testdaten für die Abrechnung"""
    
    print("Erstelle Testdaten für die Abrechnung...")
    
    # 1. Versicherungsgruppen erstellen
    print("1. Erstelle Versicherungsgruppen...")
    gesetzlich, created = InsuranceProviderGroup.objects.get_or_create(
        name="Gesetzliche Krankenkassen"
    )
    
    # 2. Krankenkassen erstellen
    print("2. Erstelle Krankenkassen...")
    aok, created = InsuranceProvider.objects.get_or_create(
        name="AOK",
        provider_id="AOK001",
        group=gesetzlich
    )
    
    # 3. Behandlungen erstellen
    print("3. Erstelle Behandlungen...")
    physio, created = Treatment.objects.get_or_create(
        treatment_name="Physiotherapie",
        description="Standard Physiotherapie",
        duration_minutes=30,
        is_self_pay=False
    )
    
    # 4. Preiskonfigurationen erstellen
    print("4. Erstelle Preiskonfigurationen...")
    Surcharge.objects.get_or_create(
        treatment=physio,
        insurance_provider_group=gesetzlich,
        insurance_payment=Decimal('25.00'),
        patient_payment=Decimal('5.00'),
        valid_from=date(2024, 1, 1),
        valid_until=date(2025, 12, 31)
    )
    
    # 5. Patienten erstellen
    print("5. Erstelle Patienten...")
    patient, created = Patient.objects.get_or_create(
        first_name="Max",
        last_name="Mustermann",
        defaults={
            "dob": date(1980, 1, 1),
            "gender": "Other",
            "email": "max.mustermann@example.com",
            "phone_number": "0123456789",
            "street_address": "Musterstraße 1",
            "city": "Musterstadt",
            "postal_code": "12345",
            "country": "Deutschland"
        }
    )
    
    # Versicherung erstellen
    PatientInsurance.objects.get_or_create(
        patient=patient,
        insurance_provider=aok,
        insurance_number="INS0001",
        valid_from=date(2024, 1, 1),
        valid_to=date(2025, 12, 31),
        is_private=False
    )
    
    # 6. Behandler und Räume erstellen
    print("6. Erstelle Behandler und Räume...")
    practitioner, created = Practitioner.objects.get_or_create(
        first_name="Dr.",
        last_name="Therapeut",
        email="therapeut@example.com"
    )
    
    # Erstelle zuerst eine Praxis, falls keine existiert
    bundesland, created = Bundesland.objects.get_or_create(
        name="Nordrhein-Westfalen",
        defaults={"abbreviation": "NW"}
    )
    
    practice, created = Practice.objects.get_or_create(
        name="Testpraxis",
        defaults={
            "owner_name": "Dr. Test",
            "bundesland": bundesland,
            "street_address": "Teststraße 1",
            "postal_code": "12345",
            "city": "Teststadt",
            "phone": "0123456789",
            "email": "test@example.com",
            "opening_hours": {
                "monday": {"start": "08:00", "end": "18:00"},
                "tuesday": {"start": "08:00", "end": "18:00"},
                "wednesday": {"start": "08:00", "end": "18:00"},
                "thursday": {"start": "08:00", "end": "18:00"},
                "friday": {"start": "08:00", "end": "18:00"},
                "saturday": {"start": "08:00", "end": "12:00"},
                "sunday": {"start": "00:00", "end": "00:00"}
            }
        }
    )
    
    room, created = Room.objects.get_or_create(
        name="Behandlungsraum 1",
        description="Standard Behandlungsraum",
        practice=practice,
        is_active=True,
        defaults={
            "opening_hours": {
                "monday": {"start": "08:00", "end": "18:00"},
                "tuesday": {"start": "08:00", "end": "18:00"},
                "wednesday": {"start": "08:00", "end": "18:00"},
                "thursday": {"start": "08:00", "end": "18:00"},
                "friday": {"start": "08:00", "end": "18:00"},
                "saturday": {"start": "08:00", "end": "12:00"},
                "sunday": {"start": "00:00", "end": "00:00"}
            }
        }
    )
    
    # 7. Verordnung erstellen
    print("7. Erstelle Verordnung...")
    patient_insurance = patient.insurances.filter(
        valid_from__lte=date.today(),
        valid_to__gte=date.today()
    ).first()
    
    # Erstelle einen Test-Arzt
    doctor, created = Doctor.objects.get_or_create(
        license_number="TEST001",
        defaults={
            "first_name": "Dr.",
            "last_name": "Testarzt",
            "email": "testarzt@example.com",
            "phone_number": "0123456789"
        }
    )
    
    # Erstelle einen ICD-Code
    icd_code, created = ICDCode.objects.get_or_create(
        code="M79.3",
        defaults={
            "title": "Schmerzen in der Hand",
            "description": "Schmerzen in der Hand, nicht näher bezeichnet"
        }
    )
    
    if patient_insurance:
        # Prüfe ob bereits eine Verordnung existiert
        existing_prescription = Prescription.objects.filter(
            patient=patient,
            treatment_1=physio,
            patient_insurance=patient_insurance
        ).first()
        
        if existing_prescription:
            prescription = existing_prescription
            print(f"  - Bestehende Verordnung gefunden für {patient}")
        else:
            # Erstelle neue Verordnung
            prescription = Prescription.objects.create(
                patient=patient,
                treatment_1=physio,
                patient_insurance=patient_insurance,
                doctor=doctor,
                diagnosis_code=icd_code,
                number_of_sessions=10,
                therapy_frequency_type="weekly_2",
                status="Open",
                prescription_date=date.today()
            )
            print(f"  - Neue Verordnung erstellt für {patient}")
    else:
        print(f"  - Keine gültige Versicherung für {patient}")
        return
    
    # 8. Termine erstellen
    print("8. Erstelle Termine...")
    start_date = date.today() - timedelta(days=30)
    end_date = date.today()
    
    # Erstelle 5 Termine in den letzten 30 Tagen
    for i in range(5):
        appointment_date = start_date + timedelta(days=i * 7)
        if appointment_date <= end_date:
            # Konvertiere date zu datetime
            from datetime import datetime
            appointment_datetime = datetime.combine(appointment_date, datetime.min.time().replace(hour=9, minute=0))
            
            appointment, created = Appointment.objects.get_or_create(
                patient=patient,
                prescription=prescription,
                practitioner=practitioner,
                treatment=physio,
                room=room,
                appointment_date=appointment_datetime,
                status='completed',
                duration_minutes=30
            )
            print(f"  - Termin erstellt: {appointment.patient} am {appointment_date}")
    
    print("\n✅ Testdaten erfolgreich erstellt!")
    print(f"  - 1 Patient")
    print(f"  - 1 Verordnung")
    print(f"  - {Appointment.objects.count()} Termine")
    print(f"  - {Surcharge.objects.count()} Preiskonfigurationen")

if __name__ == "__main__":
    create_test_data() 