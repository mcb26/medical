from django.core.management.base import BaseCommand
from django.utils import timezone

from core.services.appointment_workflow_service import AppointmentWorkflowService
from core.services.validation_service import ValidationService


class Command(BaseCommand):
    help = 'Verarbeitet automatische Workflow-Prozesse und führt Datenvalidierung durch'

    def add_arguments(self, parser):
        parser.add_argument(
            '--workflow-only',
            action='store_true',
            help='Führt nur Workflow-Prozesse aus, keine Validierung',
        )
        parser.add_argument(
            '--validation-only',
            action='store_true',
            help='Führt nur Datenvalidierung aus, keine Workflow-Prozesse',
        )
        parser.add_argument(
            '--fix-errors',
            action='store_true',
            help='Versucht automatisch gefundene Fehler zu beheben',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Starte Workflow-Verarbeitung...')
        )

        if options['validation_only']:
            self.run_validation_only(options)
        elif options['workflow_only']:
            self.run_workflow_only()
        else:
            self.run_full_process(options)

    def run_workflow_only(self):
        """Führt nur Workflow-Prozesse aus"""
        self.stdout.write('🔄 Führe Workflow-Automatisierung aus...')
        
        try:
            results = AppointmentWorkflowService.process_workflow_automation()
            
            # Zeige Ergebnisse
            if 'completed_appointments' in results:
                completed = results['completed_appointments']
                self.stdout.write(
                    f"✅ {completed['processed_count']} Termine auf 'ready_to_bill' gesetzt"
                )
                if completed['errors']:
                    self.stdout.write(
                        self.style.WARNING(f"⚠️  {len(completed['errors'])} Fehler aufgetreten")
                    )
                    for error in completed['errors']:
                        self.stdout.write(f"   - {error}")
            
            if 'billing_cycles' in results:
                billing = results['billing_cycles']
                if 'created_cycles' in billing:
                    self.stdout.write(
                        f"✅ {billing['created_cycles']} neue Abrechnungszyklen erstellt"
                    )
                if 'message' in billing:
                    self.stdout.write(f"ℹ️  {billing['message']}")
            
            self.stdout.write(
                self.style.SUCCESS('✅ Workflow-Verarbeitung abgeschlossen')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler bei der Workflow-Verarbeitung: {str(e)}')
            )

    def run_validation_only(self, options):
        """Führt nur Datenvalidierung aus"""
        self.stdout.write('🔍 Führe Datenvalidierung aus...')
        
        try:
            results = ValidationService.run_full_validation()
            
            # Zeige Zusammenfassung
            total_errors = results['summary']['total_errors']
            
            if total_errors == 0:
                self.stdout.write(
                    self.style.SUCCESS('✅ Keine Datenprobleme gefunden!')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  {total_errors} Probleme gefunden:')
                )
                
                # Zeige Details
                if results['prescriptions']:
                    self.stdout.write(f"📋 Verordnungen: {len(results['prescriptions'])} Probleme")
                    for prescription in results['prescriptions'][:3]:  # Zeige nur erste 3
                        self.stdout.write(f"   - ID {prescription['id']}: {prescription['patient']}")
                        for error in prescription['errors']:
                            self.stdout.write(f"     • {error}")
                
                if results['appointments']:
                    self.stdout.write(f"📅 Termine: {len(results['appointments'])} Probleme")
                    for appointment in results['appointments'][:3]:  # Zeige nur erste 3
                        self.stdout.write(f"   - ID {appointment['id']}: {appointment['patient']}")
                        for error in appointment['errors']:
                            self.stdout.write(f"     • {error}")
                
                if results['billing_items']:
                    self.stdout.write(f"💰 Abrechnungspositionen: {len(results['billing_items'])} Probleme")
                
                if results['treatments']:
                    self.stdout.write(f"🏥 Behandlungen: {len(results['treatments'])} Probleme")
                    for error in results['treatments'][:3]:  # Zeige nur erste 3
                        self.stdout.write(f"   - {error}")
                
                if results['insurance_providers']:
                    self.stdout.write(f"🏢 Krankenkassen: {len(results['insurance_providers'])} Probleme")
                    for error in results['insurance_providers'][:3]:  # Zeige nur erste 3
                        self.stdout.write(f"   - {error}")
                
                # Versuche Fehler zu beheben
                if options['fix_errors']:
                    self.stdout.write('🔧 Versuche Fehler automatisch zu beheben...')
                    self.auto_fix_errors(results)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler bei der Datenvalidierung: {str(e)}')
            )

    def run_full_process(self, options):
        """Führt vollständigen Prozess aus"""
        # 1. Workflow-Automatisierung
        self.run_workflow_only()
        
        # 2. Datenvalidierung
        self.run_validation_only(options)

    def auto_fix_errors(self, results):
        """Versucht automatisch gefundene Fehler zu beheben"""
        fixed_count = 0
        
        # Behebe Termin-Probleme
        for appointment_data in results['appointments']:
            try:
                from core.models import Appointment
                appointment = Appointment.objects.get(id=appointment_data['id'])
                
                # Automatische Status-Änderung für abgeschlossene Termine
                if (appointment.status == 'completed' and 
                    appointment.appointment_date < timezone.now() - timezone.timedelta(hours=1)):
                    if appointment.mark_as_ready_to_bill():
                        fixed_count += 1
                        self.stdout.write(f"   ✅ Termin {appointment.id} auf 'ready_to_bill' gesetzt")
                
            except Appointment.DoesNotExist:
                continue
            except Exception as e:
                self.stdout.write(f"   ❌ Fehler beim Beheben von Termin {appointment_data['id']}: {str(e)}")
        
        if fixed_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'✅ {fixed_count} Probleme automatisch behoben')
            )
        else:
            self.stdout.write('ℹ️  Keine Probleme konnten automatisch behoben werden') 