from django.core.management.base import BaseCommand
from core.services.waitlist_service import WaitlistService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Führt Wartelisten-Wartung durch (Bereinigung, Termin-Angebote)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt an was gemacht würde, ohne tatsächlich zu ändern',
        )
        parser.add_argument(
            '--stats-only',
            action='store_true',
            help='Zeigt nur Statistiken an',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        stats_only = options['stats_only']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODUS - Es werden keine Änderungen vorgenommen!')
            )
        
        try:
            # Zeige Statistiken
            self.stdout.write('📊 Wartelisten-Statistiken:')
            stats = WaitlistService.get_waitlist_statistics()
            
            self.stdout.write(f"  • Wartende Patienten: {stats.get('total_waiting', 0)}")
            self.stdout.write(f"  • Dringende Fälle: {stats.get('urgent_waiting', 0)}")
            self.stdout.write(f"  • Abgelaufene Einträge: {stats.get('expired_entries', 0)}")
            self.stdout.write(f"  • Durchschnittliche Wartezeit: {stats.get('avg_wait_time_days', 0)} Tage")
            
            if stats_only:
                return
            
            if not dry_run:
                # Führe Wartung durch
                self.stdout.write('🔧 Starte Wartelisten-Wartung...')
                
                # Bereinige abgelaufene Einträge
                self.stdout.write('🧹 Bereinige abgelaufene Einträge...')
                expired_count = WaitlistService.cleanup_expired_entries()
                self.stdout.write(f"  • {expired_count} abgelaufene Einträge bereinigt")
                
                # Biete Termine an
                self.stdout.write('🎯 Biete Termine an Warteliste...')
                offered_count = WaitlistService.offer_appointments_to_waitlist()
                self.stdout.write(f"  • {offered_count} Termine angeboten")
                
                self.stdout.write(
                    self.style.SUCCESS('✅ Wartelisten-Wartung erfolgreich abgeschlossen!')
                )
            else:
                self.stdout.write('DRY RUN: Wartung würde durchgeführt werden...')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler bei der Wartelisten-Wartung: {e}')
            )
            logger.error(f"Fehler im Wartelisten-Wartungs-Kommando: {e}")
            raise 