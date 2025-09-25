from django.core.management.base import BaseCommand
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta
import logging

from core.models import (
    Appointment, Prescription, PatientInsurance, BillingItem,
    Patient, Practitioner, Treatment, InsuranceProvider,
    WorkingHour, Room
)
from core.validators import validate_data_integrity

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Validiert die Datenintegrität des gesamten Systems'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Versucht automatisch gefundene Probleme zu beheben',
        )
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Zeigt detaillierte Informationen zu gefundenen Problemen',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Exportiert Probleme in eine JSON-Datei',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🔍 Starte Datenintegritäts-Validierung...')
        )

        issues = []
        
        try:
            # 1. Termine ohne gültige Verordnung
            issues.extend(self.check_appointments_without_prescription())
            
            # 2. Abgelaufene Versicherungen
            issues.extend(self.check_expired_insurances())
            
            # 3. Doppelte Abrechnungen
            issues.extend(self.check_duplicate_billing())
            
            # 4. Terminkonflikte
            issues.extend(self.check_appointment_conflicts())
            
            # 5. Ungültige Arbeitszeiten
            issues.extend(self.check_invalid_working_hours())
            
            # 6. Patienten ohne Kontaktdaten
            issues.extend(self.check_patients_without_contact())
            
            # 7. Ungültige Verordnungen
            issues.extend(self.check_invalid_prescriptions())
            
            # 8. Termine außerhalb der Arbeitszeiten
            issues.extend(self.check_appointments_outside_hours())
            
            # 9. Ungültige Abrechnungsbeträge
            issues.extend(self.check_invalid_billing_amounts())
            
            # 10. Verwaiste Datensätze
            issues.extend(self.check_orphaned_records())

            # Ergebnisse anzeigen
            self.display_results(issues, options)
            
            # Automatische Behebung
            if options['fix'] and issues:
                self.fix_issues(issues)
            
            # Export
            if options['export']:
                self.export_issues(issues, options['export'])

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler bei der Validierung: {e}')
            )
            logger.error(f'Data integrity validation failed: {e}')

    def check_appointments_without_prescription(self):
        """Prüft Termine ohne gültige Verordnung"""
        issues = []
        
        appointments = Appointment.objects.filter(
            prescription__isnull=True,
            treatment__is_self_pay=False,
            status__in=['planned', 'completed', 'ready_to_bill']
        )
        
        for appointment in appointments:
            issues.append({
                'type': 'appointment_without_prescription',
                'severity': 'high',
                'message': f'Termin {appointment.id} hat keine Verordnung',
                'object_id': appointment.id,
                'object_type': 'Appointment',
                'fix_action': 'add_prescription_or_mark_self_pay'
            })
        
        return issues

    def check_expired_insurances(self):
        """Prüft abgelaufene Versicherungen"""
        issues = []
        
        expired_insurances = PatientInsurance.objects.filter(
            valid_to__lt=timezone.now().date(),
            valid_to__isnull=False
        )
        
        for insurance in expired_insurances:
            issues.append({
                'type': 'expired_insurance',
                'severity': 'medium',
                'message': f'Versicherung {insurance.id} ist abgelaufen',
                'object_id': insurance.id,
                'object_type': 'PatientInsurance',
                'fix_action': 'extend_insurance_or_remove'
            })
        
        return issues

    def check_duplicate_billing(self):
        """Prüft doppelte Abrechnungen"""
        issues = []
        
        from django.db.models import Count
        duplicate_billing = BillingItem.objects.values('appointment').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        for item in duplicate_billing:
            issues.append({
                'type': 'duplicate_billing',
                'severity': 'high',
                'message': f'Doppelte Abrechnung für Termin {item["appointment"]}',
                'object_id': item['appointment'],
                'object_type': 'Appointment',
                'fix_action': 'remove_duplicate_billing_items'
            })
        
        return issues

    def check_appointment_conflicts(self):
        """Prüft Terminkonflikte"""
        issues = []
        
        appointments = Appointment.objects.filter(
            status__in=['planned', 'completed']
        ).order_by('practitioner', 'appointment_date')
        
        for i, appointment in enumerate(appointments):
            if i > 0:
                prev_appointment = appointments[i-1]
                if (prev_appointment.practitioner == appointment.practitioner and
                    prev_appointment.appointment_date + timedelta(minutes=prev_appointment.duration_minutes) > appointment.appointment_date):
                    issues.append({
                        'type': 'appointment_conflict',
                        'severity': 'high',
                        'message': f'Terminkonflikt zwischen {prev_appointment.id} und {appointment.id}',
                        'object_id': appointment.id,
                        'object_type': 'Appointment',
                        'fix_action': 'reschedule_appointment'
                    })
        
        return issues

    def check_invalid_working_hours(self):
        """Prüft ungültige Arbeitszeiten"""
        issues = []
        
        working_hours = WorkingHour.objects.all()
        
        for wh in working_hours:
            if wh.start_time >= wh.end_time:
                issues.append({
                    'type': 'invalid_working_hours',
                    'severity': 'medium',
                    'message': f'Ungültige Arbeitszeiten für {wh.practitioner}',
                    'object_id': wh.id,
                    'object_type': 'WorkingHour',
                    'fix_action': 'fix_working_hours'
                })
        
        return issues

    def check_patients_without_contact(self):
        """Prüft Patienten ohne Kontaktdaten"""
        issues = []
        
        patients = Patient.objects.filter(
            phone_number__isnull=True,
            email__isnull=True
        )
        
        for patient in patients:
            issues.append({
                'type': 'patient_without_contact',
                'severity': 'low',
                'message': f'Patient {patient.id} hat keine Kontaktdaten',
                'object_id': patient.id,
                'object_type': 'Patient',
                'fix_action': 'add_contact_information'
            })
        
        return issues

    def check_invalid_prescriptions(self):
        """Prüft ungültige Verordnungen"""
        issues = []
        
        # Prüfe abgelaufene Verordnungen (basierend auf prescription_date + number_of_sessions)
        from datetime import timedelta
        expired_prescriptions = []
        
        for prescription in Prescription.objects.all():
            if prescription.prescription_date and prescription.number_of_sessions:
                # Schätze das Ablaufdatum basierend auf der Anzahl der Sitzungen
                estimated_end_date = prescription.prescription_date + timedelta(
                    days=prescription.number_of_sessions * 7  # 1 Sitzung pro Woche
                )
                
                if estimated_end_date < timezone.now().date():
                    expired_prescriptions.append(prescription)
        
        for prescription in expired_prescriptions:
            issues.append({
                'type': 'expired_prescription',
                'severity': 'medium',
                'message': f'Verordnung {prescription.id} ist abgelaufen',
                'object_id': prescription.id,
                'object_type': 'Prescription',
                'fix_action': 'extend_prescription_or_remove'
            })
        
        return issues

    def check_appointments_outside_hours(self):
        """Prüft Termine außerhalb der Arbeitszeiten"""
        issues = []
        
        appointments = Appointment.objects.filter(
            status='planned',
            appointment_date__gt=timezone.now()
        )
        
        for appointment in appointments:
            # Prüfe ob der Termin außerhalb der Arbeitszeiten liegt
            day_of_week = appointment.appointment_date.strftime('%A')
            working_hours = WorkingHour.objects.filter(
                practitioner=appointment.practitioner,
                day_of_week=day_of_week
            )
            
            if not working_hours.exists():
                issues.append({
                    'type': 'appointment_outside_hours',
                    'severity': 'medium',
                    'message': f'Termin {appointment.id} außerhalb der Arbeitszeiten',
                    'object_id': appointment.id,
                    'object_type': 'Appointment',
                    'fix_action': 'reschedule_appointment'
                })
        
        return issues

    def check_invalid_billing_amounts(self):
        """Prüft ungültige Abrechnungsbeträge"""
        issues = []
        
        billing_items = BillingItem.objects.filter(
            insurance_amount__lt=0
        )
        
        for item in billing_items:
            issues.append({
                'type': 'invalid_billing_amount',
                'severity': 'high',
                'message': f'Ungültiger Abrechnungsbetrag für {item.id}',
                'object_id': item.id,
                'object_type': 'BillingItem',
                'fix_action': 'fix_billing_amount'
            })
        
        return issues

    def check_orphaned_records(self):
        """Prüft verwaiste Datensätze"""
        issues = []
        
        # Verwaiste Abrechnungspositionen
        orphaned_billing = BillingItem.objects.filter(
            appointment__isnull=True
        )
        
        for item in orphaned_billing:
            issues.append({
                'type': 'orphaned_billing_item',
                'severity': 'medium',
                'message': f'Verwaiste Abrechnungsposition {item.id}',
                'object_id': item.id,
                'object_type': 'BillingItem',
                'fix_action': 'delete_orphaned_record'
            })
        
        return issues

    def display_results(self, issues, options):
        """Zeigt die Validierungsergebnisse an"""
        if not issues:
            self.stdout.write(
                self.style.SUCCESS('✅ Keine Datenintegritätsprobleme gefunden!')
            )
            return
        
        # Gruppiere nach Schweregrad
        high_issues = [i for i in issues if i['severity'] == 'high']
        medium_issues = [i for i in issues if i['severity'] == 'medium']
        low_issues = [i for i in issues if i['severity'] == 'low']
        
        self.stdout.write(f'\n📊 Validierungsergebnisse:')
        self.stdout.write(f'  🔴 Kritisch: {len(high_issues)}')
        self.stdout.write(f'  🟡 Mittel: {len(medium_issues)}')
        self.stdout.write(f'  🟢 Niedrig: {len(low_issues)}')
        self.stdout.write(f'  📋 Gesamt: {len(issues)}')
        
        if options['detailed']:
            self.stdout.write(f'\n📋 Detaillierte Probleme:')
            for issue in issues:
                color = {
                    'high': 'ERROR',
                    'medium': 'WARNING',
                    'low': 'SUCCESS'
                }[issue['severity']]
                
                self.stdout.write(
                    getattr(self.style, color)(
                        f"  {issue['type']}: {issue['message']}"
                    )
                )

    def fix_issues(self, issues):
        """Versucht automatisch Probleme zu beheben"""
        self.stdout.write(f'\n🔧 Starte automatische Behebung...')
        
        fixed_count = 0
        
        with transaction.atomic():
            for issue in issues:
                try:
                    if issue['fix_action'] == 'delete_orphaned_record':
                        # Lösche verwaiste Datensätze
                        if issue['object_type'] == 'BillingItem':
                            BillingItem.objects.filter(id=issue['object_id']).delete()
                            fixed_count += 1
                    
                    elif issue['fix_action'] == 'fix_billing_amount':
                        # Korrigiere ungültige Abrechnungsbeträge
                        if issue['object_type'] == 'BillingItem':
                            item = BillingItem.objects.get(id=issue['object_id'])
                            if item.insurance_amount < 0:
                                item.insurance_amount = abs(item.insurance_amount)
                                item.save()
                                fixed_count += 1
                    
                    # Weitere automatische Behebungen können hier hinzugefügt werden
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️ Konnte Problem {issue["id"]} nicht beheben: {e}')
                    )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ {fixed_count} Probleme automatisch behoben')
        )

    def export_issues(self, issues, filename):
        """Exportiert Probleme in eine JSON-Datei"""
        import json
        
        export_data = {
            'timestamp': timezone.now().isoformat(),
            'total_issues': len(issues),
            'issues': issues
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(
            self.style.SUCCESS(f'📄 Probleme in {filename} exportiert')
        )
