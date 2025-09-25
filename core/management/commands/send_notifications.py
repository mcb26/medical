from django.core.management.base import BaseCommand
from core.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sendet automatische Benachrichtigungen (Termin-Erinnerungen, Verordnungsablauf, etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt an was gesendet würde, ohne tatsächlich zu senden',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODUS - Es werden keine E-Mails gesendet!')
            )
        
        try:
            self.stdout.write('Starte automatische Benachrichtigungen...')
            
            # Termin-Erinnerungen
            self.stdout.write('📅 Prüfe Termin-Erinnerungen...')
            NotificationService.send_appointment_reminders()
            
            # Verordnungsablauf
            self.stdout.write('📋 Prüfe ablaufende Verordnungen...')
            NotificationService.check_prescription_expiry()
            
            # No-Show Nachverfolgung
            self.stdout.write('❓ Prüfe No-Show Nachverfolgungen...')
            NotificationService.check_no_show_followup()
            
            self.stdout.write(
                self.style.SUCCESS('✅ Automatische Benachrichtigungen erfolgreich abgeschlossen!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler beim Senden der Benachrichtigungen: {e}')
            )
            logger.error(f"Fehler im Benachrichtigungs-Kommando: {e}")
            raise 