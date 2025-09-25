from django.core.management.base import BaseCommand
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import logging
import time

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Optimiert die Datenbank-Performance durch VACUUM, ANALYZE und Index-Updates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full',
            action='store_true',
            help='Führt eine vollständige Optimierung durch (VACUUM FULL)',
        )
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Aktualisiert Statistiken für den Query Optimizer',
        )
        parser.add_argument(
            '--cache',
            action='store_true',
            help='Bereinigt und optimiert den Cache',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Führt alle Optimierungen durch',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        self.stdout.write(
            self.style.SUCCESS('🚀 Starte Datenbank-Optimierung...')
        )

        try:
            # Vollständige Optimierung
            if options['full'] or options['all']:
                self.optimize_database_full()
            
            # Statistiken aktualisieren
            if options['analyze'] or options['all']:
                self.analyze_database()
            
            # Cache optimieren
            if options['cache'] or options['all']:
                self.optimize_cache()
            
            # Standard-Optimierung (immer ausführen)
            self.optimize_database_standard()
            
            # Performance-Metriken anzeigen
            self.show_performance_metrics()
            
            duration = time.time() - start_time
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Datenbank-Optimierung abgeschlossen in {duration:.2f} Sekunden'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Fehler bei der Datenbank-Optimierung: {e}')
            )
            logger.error(f'Database optimization failed: {e}')

    def optimize_database_standard(self):
        """Standard-Datenbank-Optimierungen"""
        self.stdout.write('📊 Führe Standard-Optimierungen durch...')
        
        with connection.cursor() as cursor:
            # SQLite-spezifische Optimierungen
            if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                # VACUUM (ohne FULL für bessere Performance)
                cursor.execute("VACUUM")
                self.stdout.write('  ✅ VACUUM ausgeführt')
                
                # Statistiken aktualisieren
                cursor.execute("ANALYZE")
                self.stdout.write('  ✅ ANALYZE ausgeführt')
                
                # WAL-Modus aktivieren (falls nicht bereits aktiv)
                cursor.execute("PRAGMA journal_mode=WAL")
                self.stdout.write('  ✅ WAL-Modus aktiviert')
                
                # Cache-Größe optimieren
                cursor.execute("PRAGMA cache_size=10000")
                self.stdout.write('  ✅ Cache-Größe optimiert')
                
                # Temp-Store im Memory
                cursor.execute("PRAGMA temp_store=MEMORY")
                self.stdout.write('  ✅ Temp-Store optimiert')
                
                # Synchronisation reduzieren für bessere Performance
                cursor.execute("PRAGMA synchronous=NORMAL")
                self.stdout.write('  ✅ Synchronisation optimiert')
            
            # PostgreSQL-spezifische Optimierungen
            elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
                cursor.execute("VACUUM ANALYZE")
                self.stdout.write('  ✅ VACUUM ANALYZE ausgeführt')
                
                # Statistiken aktualisieren
                cursor.execute("ANALYZE")
                self.stdout.write('  ✅ ANALYZE ausgeführt')

    def optimize_database_full(self):
        """Vollständige Datenbank-Optimierung"""
        self.stdout.write('🔧 Führe vollständige Optimierung durch...')
        
        with connection.cursor() as cursor:
            if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                # VACUUM FULL (defragmentiert die Datenbank)
                cursor.execute("VACUUM")
                self.stdout.write('  ✅ VACUUM FULL ausgeführt')
                
                # Alle Statistiken neu berechnen
                cursor.execute("ANALYZE")
                self.stdout.write('  ✅ Vollständige ANALYZE ausgeführt')
                
                # Integrität prüfen
                cursor.execute("PRAGMA integrity_check")
                result = cursor.fetchone()
                if result[0] == 'ok':
                    self.stdout.write('  ✅ Integritätsprüfung bestanden')
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️ Integritätsprüfung: {result[0]}')
                    )

    def analyze_database(self):
        """Aktualisiert Datenbank-Statistiken"""
        self.stdout.write('📈 Aktualisiere Datenbank-Statistiken...')
        
        with connection.cursor() as cursor:
            if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                # Alle Tabellen analysieren
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                
                for table in tables:
                    table_name = table[0]
                    if not table_name.startswith('sqlite_'):  # System-Tabellen überspringen
                        cursor.execute(f"ANALYZE {table_name}")
                        self.stdout.write(f'  ✅ {table_name} analysiert')
            
            elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
                cursor.execute("ANALYZE")
                self.stdout.write('  ✅ Alle Tabellen analysiert')

    def optimize_cache(self):
        """Optimiert den Django-Cache"""
        self.stdout.write('💾 Optimiere Cache...')
        
        try:
            # Cache-Statistiken anzeigen
            if hasattr(cache, '_cache'):
                cache_size = len(cache._cache)
                self.stdout.write(f'  📊 Cache-Größe: {cache_size} Einträge')
                
                # Performance-Cache-Einträge löschen
                keys_to_delete = [
                    key for key in cache._cache.keys() 
                    if key.startswith('perf:')
                ]
                
                for key in keys_to_delete:
                    cache.delete(key)
                
                self.stdout.write(f'  ✅ {len(keys_to_delete)} Performance-Cache-Einträge gelöscht')
            
            # Cache-Test
            test_key = 'db_optimization_test'
            cache.set(test_key, 'test_value', 60)
            if cache.get(test_key):
                self.stdout.write('  ✅ Cache funktioniert korrekt')
                cache.delete(test_key)
            else:
                self.stdout.write(
                    self.style.WARNING('  ⚠️ Cache-Probleme erkannt')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ❌ Cache-Optimierung fehlgeschlagen: {e}')
            )

    def show_performance_metrics(self):
        """Zeigt Performance-Metriken an"""
        self.stdout.write('📊 Performance-Metriken:')
        
        with connection.cursor() as cursor:
            if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                # Datenbank-Größe
                cursor.execute("PRAGMA page_count")
                page_count = cursor.fetchone()[0]
                cursor.execute("PRAGMA page_size")
                page_size = cursor.fetchone()[0]
                db_size_mb = (page_count * page_size) / (1024 * 1024)
                
                self.stdout.write(f'  📁 Datenbank-Größe: {db_size_mb:.2f} MB')
                
                # Cache-Statistiken
                cursor.execute("PRAGMA cache_size")
                cache_size = cursor.fetchone()[0]
                self.stdout.write(f'  💾 Cache-Größe: {cache_size} Seiten')
                
                # WAL-Modus
                cursor.execute("PRAGMA journal_mode")
                journal_mode = cursor.fetchone()[0]
                self.stdout.write(f'  📝 Journal-Modus: {journal_mode}')
                
                # Synchronisation
                cursor.execute("PRAGMA synchronous")
                synchronous = cursor.fetchone()[0]
                self.stdout.write(f'  🔄 Synchronisation: {synchronous}')
            
            # Query-Zeit messen
            start_time = time.time()
            cursor.execute("SELECT COUNT(*) FROM django_migrations")
            query_time = time.time() - start_time
            
            self.stdout.write(f'  ⚡ Query-Zeit: {query_time:.4f} Sekunden')

    def log_optimization_results(self, duration):
        """Loggt die Optimierungsergebnisse"""
        logger.info(f'Database optimization completed in {duration:.2f} seconds')
        
        # Performance-Metriken in Cache speichern
        cache.set('last_db_optimization', {
            'timestamp': time.time(),
            'duration': duration,
            'success': True
        }, 86400)  # 24 Stunden
