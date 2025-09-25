import logging
import time
from functools import wraps
from django.core.cache import cache
from django.db import connection
from django.conf import settings
from typing import Dict, Any, Optional, Callable
import psutil
import os

logger = logging.getLogger(__name__)

class PerformanceService:
    """Service für umfassende Performance-Optimierungen und Monitoring"""
    
    @staticmethod
    def monitor_performance(func: Callable) -> Callable:
        """Decorator für Performance-Monitoring von Funktionen"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            start_queries = len(connection.queries)
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                end_time = time.time()
                end_queries = len(connection.queries)
                
                duration = end_time - start_time
                query_count = end_queries - start_queries
                
                # Log Performance-Metriken
                if duration > 1.0:  # Langsame Funktionen
                    logger.warning(
                        f"Slow function detected: {func.__name__} took {duration:.2f}s "
                        f"and executed {query_count} queries"
                    )
                
                # Cache Performance-Metriken
                cache_key = f"perf:{func.__name__}"
                cached_metrics = cache.get(cache_key, {
                    'call_count': 0,
                    'total_duration': 0,
                    'total_queries': 0,
                    'avg_duration': 0,
                    'avg_queries': 0
                })
                
                cached_metrics['call_count'] += 1
                cached_metrics['total_duration'] += duration
                cached_metrics['total_queries'] += query_count
                cached_metrics['avg_duration'] = cached_metrics['total_duration'] / cached_metrics['call_count']
                cached_metrics['avg_queries'] = cached_metrics['total_queries'] / cached_metrics['call_count']
                
                cache.set(cache_key, cached_metrics, 3600)  # 1 Stunde
        
        return wrapper
    
    @staticmethod
    def get_system_metrics() -> Dict[str, Any]:
        """Gibt aktuelle System-Metriken zurück"""
        try:
            process = psutil.Process(os.getpid())
            
            return {
                'cpu_percent': process.cpu_percent(),
                'memory_percent': process.memory_percent(),
                'memory_info': {
                    'rss': process.memory_info().rss,
                    'vms': process.memory_info().vms
                },
                'num_threads': process.num_threads(),
                'num_fds': process.num_fds() if hasattr(process, 'num_fds') else None,
                'create_time': process.create_time(),
                'status': process.status()
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    @staticmethod
    def get_database_metrics() -> Dict[str, Any]:
        """Gibt Datenbank-Performance-Metriken zurück"""
        try:
            with connection.cursor() as cursor:
                # Query-Zeit messen
                start_time = time.time()
                cursor.execute("SELECT COUNT(*) FROM django_migrations")
                query_time = time.time() - start_time
                
                # Aktuelle Verbindungen
                cursor.execute("PRAGMA database_list")
                databases = cursor.fetchall()
                
                return {
                    'query_time': query_time,
                    'databases': len(databases),
                    'connection_queries': len(connection.queries),
                    'connection_time': sum(
                        float(q.get('time', 0)) for q in connection.queries
                    )
                }
        except Exception as e:
            logger.error(f"Error getting database metrics: {e}")
            return {}
    
    @staticmethod
    def get_cache_metrics() -> Dict[str, Any]:
        """Gibt Cache-Performance-Metriken zurück"""
        try:
            # Cache-Test
            test_key = 'perf_test_key'
            cache.set(test_key, 'test_value', 60)
            cache_hit = cache.get(test_key) is not None
            cache.delete(test_key)
            
            return {
                'cache_working': cache_hit,
                'cache_backend': settings.CACHES['default']['BACKEND'],
                'cache_timeout': settings.CACHES['default'].get('TIMEOUT', 300)
            }
        except Exception as e:
            logger.error(f"Error getting cache metrics: {e}")
            return {}
    
    @staticmethod
    def optimize_queryset(queryset, select_related=None, prefetch_related=None):
        """Optimiert einen QuerySet mit Joins und Prefetch"""
        if select_related:
            queryset = queryset.select_related(*select_related)
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        return queryset
    
    @staticmethod
    def batch_process(queryset, batch_size=1000, processor_func=None):
        """Verarbeitet große QuerySets in Batches"""
        total_count = queryset.count()
        processed_count = 0
        
        for offset in range(0, total_count, batch_size):
            batch = queryset[offset:offset + batch_size]
            
            if processor_func:
                processor_func(batch)
            
            processed_count += len(batch)
            logger.info(f"Processed {processed_count}/{total_count} records")
        
        return processed_count
    
    @staticmethod
    def clear_performance_cache():
        """Löscht alle Performance-Cache-Einträge"""
        try:
            # Finde alle Performance-Cache-Keys
            if hasattr(cache, '_cache'):
                # LocMemCache Backend
                keys_to_delete = [
                    key for key in cache._cache.keys() 
                    if key.startswith('perf:')
                ]
                for key in keys_to_delete:
                    cache.delete(key)
                logger.info(f"Cleared {len(keys_to_delete)} performance cache entries")
            else:
                # Redis oder andere Backends - Pattern-basierte Invalidierung
                # Für Redis können wir leider nicht alle Keys auflisten
                # Stattdessen löschen wir bekannte Performance-Keys
                known_perf_keys = [
                    'perf:system_metrics',
                    'perf:database_metrics',
                    'perf:cache_metrics'
                ]
                for key in known_perf_keys:
                    cache.delete(key)
                logger.info("Cleared known performance cache entries")
        except Exception as e:
            logger.error(f"Error clearing performance cache: {e}")
    
    @staticmethod
    def get_performance_summary() -> Dict[str, Any]:
        """Gibt eine Zusammenfassung aller Performance-Metriken zurück"""
        return {
            'system': PerformanceService.get_system_metrics(),
            'database': PerformanceService.get_database_metrics(),
            'cache': PerformanceService.get_cache_metrics(),
            'timestamp': time.time()
        }

class QueryOptimizer:
    """Optimiert Datenbankabfragen"""
    
    @staticmethod
    def optimize_appointment_queryset(queryset):
        """Optimiert Appointment-QuerySets"""
        return queryset.select_related(
            'patient',
            'practitioner',
            'treatment',
            'room',
            'prescription__treatment_1',
            'prescription__patient_insurance__insurance_provider'
        ).prefetch_related(
            'billing_items'
        )
    
    @staticmethod
    def optimize_patient_queryset(queryset):
        """Optimiert Patient-QuerySets"""
        return queryset.select_related(
            'patient_insurance__insurance_provider'
        ).prefetch_related(
            'appointments__practitioner',
            'appointments__treatment',
            'prescriptions__treatment_1'
        )
    
    @staticmethod
    def optimize_prescription_queryset(queryset):
        """Optimiert Prescription-QuerySets"""
        return queryset.select_related(
            'patient',
            'doctor',
            'treatment_1',
            'treatment_2',
            'treatment_3',
            'patient_insurance__insurance_provider',
            'diagnosis_code',
            'original_prescription'
        ).prefetch_related(
            'follow_up_prescriptions'
        )

class CacheOptimizer:
    """Optimiert Cache-Strategien"""
    
    @staticmethod
    def get_cached_or_fetch(key: str, fetch_func: Callable, timeout: int = 300):
        """Holt Daten aus Cache oder führt Fetch-Funktion aus"""
        cached_data = cache.get(key)
        if cached_data is not None:
            return cached_data
        
        data = fetch_func()
        cache.set(key, data, timeout)
        return data
    
    @staticmethod
    def invalidate_pattern(pattern: str):
        """Invalidiert Cache-Einträge basierend auf Pattern"""
        try:
            if hasattr(cache, '_cache'):
                keys_to_delete = [
                    key for key in cache._cache.keys() 
                    if pattern in key
                ]
                for key in keys_to_delete:
                    cache.delete(key)
                return len(keys_to_delete)
        except Exception as e:
            logger.error(f"Error invalidating cache pattern {pattern}: {e}")
            return 0

# Globale Performance-Monitoring-Instanz
performance_monitor = PerformanceService()
