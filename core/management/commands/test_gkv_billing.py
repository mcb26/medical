#!/usr/bin/env python3
"""
Management-Command zum Testen der GKV-Abrechnung
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta, datetime, time
from decimal import Decimal

from core.models import (
    BillingCycle, InsuranceProvider, InsuranceProviderGroup,
    Patient, Treatment, Prescription, Appointment, Practitioner, Doctor, ICDCode, BillingItem
)
from core.services.gkv_billing_service import GKVBillingService


class Command(BaseCommand):
    help = 'Testet die GKV-Abrechnung mit Beispieldaten'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-test-data',
            action='store_true',
            help='Erstellt Testdaten für die Abrechnung'
        )
        parser.add_argument(
            '--process-billing',
            action='store_true',
            help='Verarbeitet einen BillingCycle'
        )
        parser.add_argument(
            '--billing-cycle-id',
            type=int,
            help='ID des zu verarbeitenden BillingCycle'
        )

    def handle(self, *args, **options):
        if options['create_test_data']:
            self.create_test_data()
        elif options['process_billing']:
            self.process_billing(options['billing_cycle_id'])
        else:
            self.stdout.write("Verwende --create-test-data oder --process-billing")

    def create_test_data(self):
        """Erstellt Testdaten für die GKV-Abrechnung"""
        self.stdout.write("Erstelle Testdaten für GKV-Abrechnung...")
        
        # 1. Hole oder erstelle Krankenkassen
        gesetzlich_group = InsuranceProviderGroup.objects.get(name='Gesetzliche Krankenkassen')
        privat_group = InsuranceProviderGroup.objects.get(name='Private Krankenversicherungen')
        
        # AOK
        aok, created = InsuranceProvider.objects.get_or_create(
            provider_id='AOK001',
            defaults={
                'name': 'AOK Bayern',
                'group': gesetzlich_group
            }
        )
        if created:
            self.stdout.write(f"✓ Krankenkasse erstellt: {aok.name}")
        
        # Barmer
        barmer, created = InsuranceProvider.objects.get_or_create(
            provider_id='BAR001',
            defaults={
                'name': 'Barmer',
                'group': gesetzlich_group
            }
        )
        if created:
            self.stdout.write(f"✓ Krankenkasse erstellt: {barmer.name}")
        
        # Private Krankenkasse
        private_kk, created = InsuranceProvider.objects.get_or_create(
            provider_id='PRIV001',
            defaults={
                'name': 'Allianz Private Krankenversicherung',
                'group': privat_group
            }
        )
        if created:
            self.stdout.write(f"✓ Krankenkasse erstellt: {private_kk.name}")
        
        # 2. Hole Behandlungen
        krankengymnastik = Treatment.objects.filter(treatment_name='Krankengymnastik').first()
        manuelle_therapie = Treatment.objects.filter(treatment_name='Manuelle Therapie').first()
        
        if not krankengymnastik or not manuelle_therapie:
            self.stdout.write(self.style.ERROR("Behandlungen nicht gefunden. Führe zuerst create_test_data aus."))
            return
        
        # 3. Hole oder erstelle Patienten
        patients = []
        
        # GKV-Patient 1
        patient1, created = Patient.objects.get_or_create(
            email='max.mustermann@example.com',
            defaults={
                'first_name': 'Max',
                'last_name': 'Mustermann',
                'dob': date(1980, 5, 15),
                'gender': 'Male',
                'phone_number': '089123456',
                'street_address': 'Musterstraße 1',
                'city': 'München',
                'postal_code': '80331',
                'country': 'Deutschland'
            }
        )
        if created:
            self.stdout.write(f"✓ Patient erstellt: {patient1.full_name}")
        patients.append(patient1)
        
        # GKV-Patient 2
        patient2, created = Patient.objects.get_or_create(
            email='anna.schmidt@example.com',
            defaults={
                'first_name': 'Anna',
                'last_name': 'Schmidt',
                'dob': date(1975, 8, 22),
                'gender': 'Female',
                'phone_number': '089654321',
                'street_address': 'Beispielweg 5',
                'city': 'München',
                'postal_code': '80335',
                'country': 'Deutschland'
            }
        )
        if created:
            self.stdout.write(f"✓ Patient erstellt: {patient2.full_name}")
        patients.append(patient2)
        
        # Privat-Patient
        patient3, created = Patient.objects.get_or_create(
            email='dr.mueller@example.com',
            defaults={
                'first_name': 'Dr. Hans',
                'last_name': 'Müller',
                'dob': date(1965, 3, 10),
                'gender': 'Male',
                'phone_number': '089987654',
                'street_address': 'Privatstraße 10',
                'city': 'München',
                'postal_code': '80339',
                'country': 'Deutschland'
            }
        )
        if created:
            self.stdout.write(f"✓ Patient erstellt: {patient3.full_name}")
        patients.append(patient3)
        
        # 4. Hole oder erstelle Patientenversicherungen
        from core.models import PatientInsurance
        
        # GKV-Versicherungen
        for patient in [patient1, patient2]:
            # Prüfe ob bereits eine Versicherung existiert
            existing_insurance = PatientInsurance.objects.filter(
                patient=patient,
                valid_from__lte=date.today(),
                valid_to__gte=date.today()
            ).first()
            
            if existing_insurance:
                self.stdout.write(f"✓ Bestehende Versicherung gefunden für {patient.full_name}: {existing_insurance.insurance_provider.name}")
            else:
                insurance, created = PatientInsurance.objects.get_or_create(
                    patient=patient,
                    insurance_provider=aok if patient == patient1 else barmer,
                    defaults={
                        'insurance_number': f'GKV{patient.id:06d}',
                        'valid_from': date(2023, 1, 1),
                        'valid_to': date(2026, 12, 31),
                        'is_private': False
                    }
                )
                if created:
                    self.stdout.write(f"✓ GKV-Versicherung erstellt für {patient.full_name}")
        
        # Private Versicherung
        existing_private_insurance = PatientInsurance.objects.filter(
            patient=patient3,
            valid_from__lte=date.today(),
            valid_to__gte=date.today()
        ).first()
        
        if existing_private_insurance:
            self.stdout.write(f"✓ Bestehende private Versicherung gefunden für {patient3.full_name}: {existing_private_insurance.insurance_provider.name}")
        else:
            insurance, created = PatientInsurance.objects.get_or_create(
                patient=patient3,
                insurance_provider=private_kk,
                defaults={
                    'insurance_number': f'PRIV{patient3.id:06d}',
                    'valid_from': date(2023, 1, 1),
                    'valid_to': date(2026, 12, 31),
                    'is_private': True
                }
            )
            if created:
                self.stdout.write(f"✓ Private Versicherung erstellt für {patient3.full_name}")
        
        # 5. Hole oder erstelle Arzt
        doctor, created = Doctor.objects.get_or_create(
            license_number='ARZT001',
            defaults={
                'first_name': 'Dr. Maria',
                'last_name': 'Weber',
                'email': 'dr.weber@example.com',
                'phone_number': '089111222'
            }
        )
        if created:
            self.stdout.write(f"✓ Arzt erstellt: {doctor.first_name} {doctor.last_name}")
        
        # 6. Hole oder erstelle Therapeut
        practitioner, created = Practitioner.objects.get_or_create(
            email='therapeut@example.com',
            defaults={
                'first_name': 'Thomas',
                'last_name': 'Fischer',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(f"✓ Therapeut erstellt: {practitioner.first_name} {practitioner.last_name}")
        
        # 7. Hole ICD-Code
        icd_code, created = ICDCode.objects.get_or_create(
            code='M51.1',
            defaults={
                'title': 'Lumbale und andere Bandscheibenschäden mit Radikulopathie',
                'description': 'Bandscheibenschaden mit Nervenwurzelreizung'
            }
        )
        if created:
            self.stdout.write(f"✓ ICD-Code erstellt: {icd_code.code}")
        
        # 8. Erstelle Verordnungen
        prescriptions = []
        
        # GKV-Verordnungen
        for i, patient in enumerate([patient1, patient2]):
            # Hole die gültige Versicherung für den Patienten
            patient_insurance = PatientInsurance.objects.filter(
                patient=patient,
                valid_from__lte=date.today(),
                valid_to__gte=date.today()
            ).first()
            
            prescription, created = Prescription.objects.get_or_create(
                patient=patient,
                doctor=doctor,
                diagnosis_code=icd_code,
                treatment_1=krankengymnastik,
                treatment_2=manuelle_therapie,
                defaults={
                    'patient_insurance': patient_insurance,
                    'number_of_sessions': 10,
                    'therapy_frequency_type': 'weekly_2',
                    'prescription_date': date.today() - timedelta(days=30),
                    'status': 'In_Progress'
                }
            )
            if created:
                self.stdout.write(f"✓ Verordnung erstellt für {patient.full_name}")
            prescriptions.append(prescription)
        
        # Private Verordnung
        patient_insurance = PatientInsurance.objects.filter(
            patient=patient3,
            valid_from__lte=date.today(),
            valid_to__gte=date.today()
        ).first()
        
        prescription, created = Prescription.objects.get_or_create(
            patient=patient3,
            doctor=doctor,
            diagnosis_code=icd_code,
            treatment_1=krankengymnastik,
            defaults={
                'patient_insurance': patient_insurance,
                'number_of_sessions': 8,
                'therapy_frequency_type': 'weekly_1',
                'prescription_date': date.today() - timedelta(days=20),
                'status': 'In_Progress'
            }
        )
        if created:
            self.stdout.write(f"✓ Private Verordnung erstellt für {patient3.full_name}")
        prescriptions.append(prescription)
        
        # 9. Erstelle Termine
        appointments = []
        start_date = date.today() - timedelta(days=14)
        
        for i, prescription in enumerate(prescriptions):
            for j in range(5):  # 5 Termine pro Verordnung
                appointment_date = start_date + timedelta(days=j*3 + i*2)
                
                appointment, created = Appointment.objects.get_or_create(
                    patient=prescription.patient,
                    practitioner=practitioner,
                    appointment_date=timezone.make_aware(
                        datetime.combine(appointment_date, time(10, 0))
                    ),
                    treatment=krankengymnastik if j % 2 == 0 else manuelle_therapie,
                    prescription=prescription,
                    defaults={
                        'status': 'completed',
                        'duration_minutes': 30,
                        'notes': f'Testtermin {j+1}'
                    }
                )
                if created:
                    self.stdout.write(f"✓ Termin erstellt: {appointment.patient.full_name} - {appointment.treatment.treatment_name}")
                appointments.append(appointment)
        
        # 10. Erstelle BillingCycle
        billing_cycle, created = BillingCycle.objects.get_or_create(
            insurance_provider=aok,
            start_date=start_date,
            end_date=date.today(),
            defaults={
                'status': 'draft'
            }
        )
        if created:
            self.stdout.write(f"✓ BillingCycle erstellt: {billing_cycle}")
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ Testdaten erfolgreich erstellt!"))
        self.stdout.write(f"BillingCycle ID: {billing_cycle.id}")
        self.stdout.write(f"Termine erstellt: {len(appointments)}")
        self.stdout.write(f"Verordnungen erstellt: {len(prescriptions)}")

    def process_billing(self, billing_cycle_id):
        """Verarbeitet einen BillingCycle"""
        try:
            billing_cycle = BillingCycle.objects.get(id=billing_cycle_id)
        except BillingCycle.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"BillingCycle mit ID {billing_cycle_id} nicht gefunden"))
            return
        
        self.stdout.write(f"Verarbeite BillingCycle: {billing_cycle}")
        
        # Erstelle BillingItems für alle abgeschlossenen Termine
        from core.management.commands.create_billing_items import Command as CreateBillingItemsCommand
        
        cmd = CreateBillingItemsCommand()
        cmd.stdout = self.stdout
        cmd.style = self.style
        
        # Erstelle BillingItems
        billing_items_created = 0
        for appointment in Appointment.objects.filter(
            status='completed',
            appointment_date__date__gte=billing_cycle.start_date,
            appointment_date__date__lte=billing_cycle.end_date
        ):
            if not appointment.billing_items.exists():
                try:
                    billing_item = BillingItem(
                        billing_cycle=billing_cycle,
                        prescription=appointment.prescription,
                        appointment=appointment,
                        treatment=appointment.treatment
                    )
                    billing_item.calculate_amounts()
                    billing_item.save(skip_validation=True)
                    billing_items_created += 1
                    self.stdout.write(f"✓ BillingItem erstellt: {appointment.patient.full_name} - {appointment.treatment.treatment_name}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Fehler beim Erstellen BillingItem: {e}"))
        
        self.stdout.write(f"BillingItems erstellt: {billing_items_created}")
        
        # Verarbeite BillingCycle
        try:
            results = GKVBillingService.process_complete_billing_cycle(billing_cycle)
            
            self.stdout.write(self.style.SUCCESS(f"\n✅ BillingCycle erfolgreich verarbeitet!"))
            self.stdout.write(f"GKV-Ansprüche erstellt: {results['gkv_claims_created']}")
            self.stdout.write(f"Zuzahlungsrechnungen erstellt: {results['copay_invoices_created']}")
            self.stdout.write(f"Private Rechnungen erstellt: {results['private_invoices_created']}")
            
            # Zeige Zusammenfassung
            summary = GKVBillingService.generate_billing_summary(billing_cycle)
            self.stdout.write(f"\n=== ABRECHNUNGSZUSAMMENFASSUNG ===")
            self.stdout.write(f"Gesamtpositionen: {summary['total_items']}")
            self.stdout.write(f"GKV-Positionen: {summary['gkv_items']}")
            self.stdout.write(f"Private Positionen: {summary['private_items']}")
            self.stdout.write(f"Selbstzahler-Positionen: {summary['self_pay_items']}")
            self.stdout.write(f"Gesamt Krankenkasse: {summary['total_insurance_amount']}€")
            self.stdout.write(f"Gesamt Patienten: {summary['total_patient_amount']}€")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Fehler bei der Verarbeitung: {e}")) 