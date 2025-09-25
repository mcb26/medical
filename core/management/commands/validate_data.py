from django.core.management.base import BaseCommand
from core.services.validation_service import ValidationService
from core.models import Patient, Prescription, Appointment, BillingItem
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Validiert Datenintegrität und bereinigt ungültige Daten'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Bereinigt ungültige Daten automatisch',
        )
        parser.add_argument(
            '--check-duplicates',
            action='store_true',
            help='Prüft auf Patientenduplikate',
        )
        parser.add_argument(
            '--validate-all',
            action='store_true',
            help='Validiert alle Daten',
        )

    def handle(self, *args, **options):
        cleanup = options['cleanup']
        check_duplicates = options['check_duplicates']
        validate_all = options['validate_all']
        
        try:
            if validate_all:
                self.stdout.write('🔍 Starte umfassende Datenvalidierung...')
                self._validate_all_data()
            
            if check_duplicates:
                self.stdout.write('🔍 Prüfe auf Patientenduplikate...')
                self._check_patient_duplicates()
            
            if cleanup:
                self.stdout.write('🧹 Starte Datenbereinigung...')
                self._cleanup_invalid_data()
            
            if not any([cleanup, check_duplicates, validate_all]):
                self.stdout.write('ℹ️ Verwende --validate-all, --check-duplicates oder --cleanup')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler bei der Datenvalidierung: {e}')
            )
            logger.error(f"Fehler im Datenvalidierungs-Kommando: {e}")
            raise
    
    def _validate_all_data(self):
        """Validiert alle Daten"""
        validation_errors = []
        
        # Validiere Patienten
        self.stdout.write('  📋 Validiere Patienten...')
        patients = Patient.objects.all()
        for patient in patients:
            try:
                ValidationService.validate_patient_data({
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'dob': patient.dob,
                    'email': patient.email,
                    'phone_number': patient.phone_number
                }, patient.id)
            except Exception as e:
                validation_errors.append(f"Patient {patient.id}: {e}")
        
        # Validiere Verordnungen
        self.stdout.write('  📋 Validiere Verordnungen...')
        prescriptions = Prescription.objects.all()
        for prescription in prescriptions:
            try:
                ValidationService.validate_prescription_data({
                    'patient': prescription.patient,
                    'doctor': prescription.doctor,
                    'diagnosis_code': prescription.diagnosis_code,
                    'treatment_1': prescription.treatment_1,
                    'treatment_2': prescription.treatment_2,
                    'treatment_3': prescription.treatment_3,
                    'prescription_date': prescription.prescription_date,
                    'patient_insurance': prescription.patient_insurance
                })
            except Exception as e:
                validation_errors.append(f"Verordnung {prescription.id}: {e}")
        
        # Validiere Termine
        self.stdout.write('  📋 Validiere Termine...')
        appointments = Appointment.objects.all()
        for appointment in appointments:
            try:
                ValidationService.validate_appointment_data({
                    'patient': appointment.patient,
                    'practitioner': appointment.practitioner,
                    'treatment': appointment.treatment,
                    'appointment_date': appointment.appointment_date,
                    'duration_minutes': appointment.duration_minutes
                }, appointment.id)
            except Exception as e:
                validation_errors.append(f"Termin {appointment.id}: {e}")
        
        # Validiere Abrechnungen
        self.stdout.write('  📋 Validiere Abrechnungen...')
        billing_items = BillingItem.objects.all()
        for item in billing_items:
            try:
                ValidationService.validate_billing_data({
                    'appointment': item.appointment,
                    'billing_cycle': item.billing_cycle,
                    'insurance_amount': item.insurance_amount,
                    'patient_copay': item.patient_copay
                })
            except Exception as e:
                validation_errors.append(f"BillingItem {item.id}: {e}")
        
        if validation_errors:
            self.stdout.write(
                self.style.WARNING(f'⚠️ {len(validation_errors)} Validierungsfehler gefunden:')
            )
            for error in validation_errors[:10]:  # Zeige nur die ersten 10
                self.stdout.write(f'    • {error}')
            if len(validation_errors) > 10:
                self.stdout.write(f'    ... und {len(validation_errors) - 10} weitere')
        else:
            self.stdout.write(
                self.style.SUCCESS('✅ Alle Daten sind valide!')
            )
    
    def _check_patient_duplicates(self):
        """Prüft auf Patientenduplikate"""
        patients = Patient.objects.all()
        duplicate_groups = []
        
        for patient in patients:
            duplicates = ValidationService.find_potential_duplicates({
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'dob': patient.dob,
                'email': patient.email,
                'phone_number': patient.phone_number
            })
            
            if duplicates:
                duplicate_groups.append({
                    'patient': patient,
                    'duplicates': duplicates
                })
        
        if duplicate_groups:
            self.stdout.write(
                self.style.WARNING(f'⚠️ {len(duplicate_groups)} Patienten mit potenziellen Duplikaten:')
            )
            for group in duplicate_groups[:5]:  # Zeige nur die ersten 5
                patient = group['patient']
                self.stdout.write(f'  📋 {patient.first_name} {patient.last_name} (ID: {patient.id}):')
                for duplicate in group['duplicates']:
                    dup_patient = duplicate['patient']
                    self.stdout.write(f'    • {dup_patient.first_name} {dup_patient.last_name} (ID: {dup_patient.id}) - {duplicate["reason"]} ({duplicate["confidence"]})')
            
            if len(duplicate_groups) > 5:
                self.stdout.write(f'    ... und {len(duplicate_groups) - 5} weitere Patienten')
        else:
            self.stdout.write(
                self.style.SUCCESS('✅ Keine Duplikate gefunden!')
            )
    
    def _cleanup_invalid_data(self):
        """Bereinigt ungültige Daten"""
        cleanup_stats = ValidationService.cleanup_invalid_data()
        
        if cleanup_stats:
            self.stdout.write('🧹 Datenbereinigung abgeschlossen:')
            for key, value in cleanup_stats.items():
                if value > 0:
                    self.stdout.write(f'  • {key}: {value} Datensätze bereinigt')
            
            total_cleaned = sum(cleanup_stats.values())
            self.stdout.write(
                self.style.SUCCESS(f'✅ Insgesamt {total_cleaned} Datensätze bereinigt!')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('✅ Keine ungültigen Daten gefunden!')
            ) 