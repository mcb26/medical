import logging
from django.core.cache import cache
from django.conf import settings
from typing import Any, Optional, List, Dict
import hashlib
import json
from django.db import models

logger = logging.getLogger(__name__)

class CacheService:
    """Service für optimiertes Caching von Datenbankabfragen und API-Responses"""
    
    DEFAULT_TIMEOUT = 300  # 5 Minuten
    LONG_TIMEOUT = 1800    # 30 Minuten
    SHORT_TIMEOUT = 60     # 1 Minute
    
    @staticmethod
    def generate_cache_key(prefix: str, *args, **kwargs) -> str:
        """Generiert einen eindeutigen Cache-Key basierend auf Prefix und Parametern"""
        key_parts = [prefix]
        
        # Args hinzufügen
        for arg in args:
            key_parts.append(str(arg))
        
        # Kwargs hinzufügen (sortiert für Konsistenz)
        for key, value in sorted(kwargs.items()):
            key_parts.append(f"{key}:{value}")
        
        # Hash generieren für kürzere Keys
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @staticmethod
    def get_or_set(key: str, callback, timeout: int = None, **kwargs) -> Any:
        """Holt Daten aus Cache oder führt Callback aus und cached das Ergebnis"""
        if timeout is None:
            timeout = CacheService.DEFAULT_TIMEOUT
            
        # Versuche aus Cache zu holen
        cached_data = cache.get(key)
        if cached_data is not None:
            logger.debug(f"Cache hit für Key: {key}")
            return cached_data
        
        # Cache miss - führe Callback aus
        logger.debug(f"Cache miss für Key: {key}")
        try:
            data = callback(**kwargs)
            cache.set(key, data, timeout)
            return data
        except Exception as e:
            logger.error(f"Fehler beim Ausführen des Callbacks für Cache Key {key}: {str(e)}")
            raise
    
    @staticmethod
    def invalidate_pattern(pattern: str) -> int:
        """Invalidiert alle Cache-Einträge die einem Pattern entsprechen"""
        if not hasattr(cache, '_cache'):
            logger.warning("Cache-Backend unterstützt keine Pattern-Invalidierung")
            return 0
        
        invalidated_count = 0
        for key in list(cache._cache.keys()):
            if pattern in key:
                cache.delete(key)
                invalidated_count += 1
        
        logger.info(f"{invalidated_count} Cache-Einträge mit Pattern '{pattern}' invalidiert")
        return invalidated_count
    
    @staticmethod
    def invalidate_model_cache(model_name: str, instance_id: Optional[int] = None) -> int:
        """Invalidiert Cache-Einträge für ein spezifisches Model"""
        pattern = f"model:{model_name}"
        if instance_id:
            pattern += f":{instance_id}"
        
        return CacheService.invalidate_pattern(pattern)
    
    @staticmethod
    def get_user_cache_key(user_id: int, prefix: str) -> str:
        """Generiert einen Cache-Key für benutzerspezifische Daten"""
        return CacheService.generate_cache_key(f"user:{user_id}:{prefix}")
    
    @staticmethod
    def cache_user_data(user_id: int, prefix: str, data: Any, timeout: int = None) -> None:
        """Cached benutzerspezifische Daten"""
        key = CacheService.get_user_cache_key(user_id, prefix)
        cache.set(key, data, timeout or CacheService.DEFAULT_TIMEOUT)
    
    @staticmethod
    def get_user_data(user_id: int, prefix: str) -> Any:
        """Holt benutzerspezifische Daten aus dem Cache"""
        key = CacheService.get_user_cache_key(user_id, prefix)
        return cache.get(key)

# Spezialisierte Cache-Methoden für häufige Anwendungsfälle
class ModelCacheService:
    """Spezialisierter Cache-Service für Model-Daten"""
    
    @staticmethod
    def get_patient_list(user_id: int, filters: Dict = None) -> List[Dict]:
        """Cached Patientenliste mit Filtern"""
        cache_key = CacheService.generate_cache_key(
            "patient_list", 
            user_id=user_id, 
            filters=json.dumps(filters, sort_keys=True) if filters else "none"
        )
        
        def fetch_patients():
            from core.models import Patient
            from core.serializers import PatientSerializer
            
            queryset = Patient.objects.select_related(
                'patient_insurance__insurance_provider'
            ).prefetch_related(
                'appointments__practitioner',
                'appointments__treatment',
                'prescriptions__treatment_1'
            )
            
            # Filter anwenden
            if filters:
                if filters.get('search'):
                    queryset = queryset.filter(
                        models.Q(first_name__icontains=filters['search']) |
                        models.Q(last_name__icontains=filters['search'])
                    )
                if filters.get('has_appointments') is not None:
                    if filters['has_appointments']:
                        queryset = queryset.filter(appointments__isnull=False)
                    else:
                        queryset = queryset.filter(appointments__isnull=True)
            
            serializer = PatientSerializer(queryset, many=True)
            return serializer.data
        
        return CacheService.get_or_set(cache_key, fetch_patients, timeout=CacheService.SHORT_TIMEOUT)
    
    @staticmethod
    def get_appointment_list(user_id: int, filters: Dict = None) -> List[Dict]:
        """Cached Terminliste mit Filtern"""
        cache_key = CacheService.generate_cache_key(
            "appointment_list", 
            user_id=user_id, 
            filters=json.dumps(filters, sort_keys=True) if filters else "none"
        )
        
        def fetch_appointments():
            from core.models import Appointment
            from core.serializers import AppointmentSerializer
            
            queryset = Appointment.objects.select_related(
                'patient',
                'practitioner', 
                'treatment', 
                'room', 
                'prescription__treatment_1',
                'patient_insurance__insurance_provider'
            ).prefetch_related(
                'billing_items'
            )
            
            # Filter anwenden
            if filters:
                if filters.get('date_from'):
                    queryset = queryset.filter(appointment_date__gte=filters['date_from'])
                if filters.get('date_to'):
                    queryset = queryset.filter(appointment_date__lte=filters['date_to'])
                if filters.get('status'):
                    queryset = queryset.filter(status=filters['status'])
            
            serializer = AppointmentSerializer(queryset, many=True)
            return serializer.data
        
        return CacheService.get_or_set(cache_key, fetch_appointments, timeout=CacheService.SHORT_TIMEOUT)
    
    @staticmethod
    def invalidate_patient_cache(patient_id: int = None) -> None:
        """Invalidiert Patienten-bezogene Cache-Einträge"""
        if patient_id:
            CacheService.invalidate_pattern(f"patient:{patient_id}")
        CacheService.invalidate_pattern("patient_list")
    
    @staticmethod
    def invalidate_appointment_cache(appointment_id: int = None) -> None:
        """Invalidiert Termin-bezogene Cache-Einträge"""
        if appointment_id:
            CacheService.invalidate_pattern(f"appointment:{appointment_id}")
        CacheService.invalidate_pattern("appointment_list")

# Performance-Monitoring
class CachePerformanceMonitor:
    """Überwacht Cache-Performance und generiert Statistiken"""
    
    def __init__(self):
        self.hit_count = 0
        self.miss_count = 0
        self.total_requests = 0
    
    def record_hit(self):
        """Zeichnet einen Cache-Hit auf"""
        self.hit_count += 1
        self.total_requests += 1
    
    def record_miss(self):
        """Zeichnet einen Cache-Miss auf"""
        self.miss_count += 1
        self.total_requests += 1
    
    def get_hit_rate(self) -> float:
        """Berechnet die Cache-Hit-Rate"""
        if self.total_requests == 0:
            return 0.0
        return (self.hit_count / self.total_requests) * 100
    
    def get_stats(self) -> Dict:
        """Gibt Cache-Statistiken zurück"""
        return {
            'total_requests': self.total_requests,
            'hits': self.hit_count,
            'misses': self.miss_count,
            'hit_rate': self.get_hit_rate(),
            'cache_size': len(cache._cache) if hasattr(cache, '_cache') else 'unknown'
        }
    
    def reset_stats(self):
        """Setzt Statistiken zurück"""
        self.hit_count = 0
        self.miss_count = 0
        self.total_requests = 0

# Globale Instanz für Performance-Monitoring
cache_monitor = CachePerformanceMonitor()
