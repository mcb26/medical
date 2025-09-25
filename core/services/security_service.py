import logging
import re
import hashlib
import secrets
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import json

logger = logging.getLogger(__name__)

class SecurityService:
    """Service für Sicherheitsfunktionen und Validierung"""
    
    # Rate Limiting Konfiguration
    RATE_LIMIT_CONFIG = {
        'login_attempts': {
            'max_attempts': 5,
            'window_minutes': 15,
            'lockout_minutes': 30
        },
        'api_requests': {
            'max_requests': 100,
            'window_minutes': 1
        },
        'password_reset': {
            'max_attempts': 3,
            'window_minutes': 60
        }
    }
    
    # Sicherheits-Patterns
    SECURITY_PATTERNS = {
        'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'phone': r'^[\+]?[1-9][\d]{0,15}$',
        'insurance_number': r'^[A-Z0-9]{10,}$',
        'postal_code': r'^\d{5}$',
        'date': r'^\d{4}-\d{2}-\d{2}$',
        'time': r'^\d{2}:\d{2}$',
        'url': r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$'
    }
    
    @staticmethod
    def validate_input(data: Dict[str, Any], validation_rules: Dict[str, Dict]) -> Dict[str, List[str]]:
        """
        Validiert Eingabedaten basierend auf definierten Regeln
        
        Args:
            data: Zu validierende Daten
            validation_rules: Validierungsregeln für jedes Feld
            
        Returns:
            Dictionary mit Fehlermeldungen pro Feld
        """
        errors = {}
        
        for field, rules in validation_rules.items():
            field_value = data.get(field)
            field_errors = []
            
            # Required-Prüfung
            if rules.get('required', False) and (field_value is None or field_value == ''):
                field_errors.append(f"Das Feld '{field}' ist erforderlich.")
                continue
            
            # Typ-Prüfung
            if field_value is not None and 'type' in rules:
                expected_type = rules['type']
                if not SecurityService._check_type(field_value, expected_type):
                    field_errors.append(f"Das Feld '{field}' muss vom Typ {expected_type} sein.")
            
            # Pattern-Prüfung
            if field_value and 'pattern' in rules:
                pattern = SecurityService.SECURITY_PATTERNS.get(rules['pattern'], rules['pattern'])
                if not re.match(pattern, str(field_value)):
                    field_errors.append(f"Das Feld '{field}' hat ein ungültiges Format.")
            
            # Längen-Prüfung
            if field_value and 'min_length' in rules:
                if len(str(field_value)) < rules['min_length']:
                    field_errors.append(f"Das Feld '{field}' muss mindestens {rules['min_length']} Zeichen lang sein.")
            
            if field_value and 'max_length' in rules:
                if len(str(field_value)) > rules['max_length']:
                    field_errors.append(f"Das Feld '{field}' darf maximal {rules['max_length']} Zeichen lang sein.")
            
            # Wertebereich-Prüfung
            if field_value is not None and 'min_value' in rules:
                try:
                    if float(field_value) < rules['min_value']:
                        field_errors.append(f"Das Feld '{field}' muss mindestens {rules['min_value']} sein.")
                except (ValueError, TypeError):
                    field_errors.append(f"Das Feld '{field}' muss eine Zahl sein.")
            
            if field_value is not None and 'max_value' in rules:
                try:
                    if float(field_value) > rules['max_value']:
                        field_errors.append(f"Das Feld '{field}' darf maximal {rules['max_value']} sein.")
                except (ValueError, TypeError):
                    field_errors.append(f"Das Feld '{field}' muss eine Zahl sein.")
            
            # Custom-Validierung
            if field_value and 'custom_validator' in rules:
                try:
                    validator_result = rules['custom_validator'](field_value)
                    if not validator_result:
                        field_errors.append(f"Das Feld '{field}' ist ungültig.")
                except Exception as e:
                    field_errors.append(f"Validierungsfehler für '{field}': {str(e)}")
            
            if field_errors:
                errors[field] = field_errors
        
        return errors
    
    @staticmethod
    def _check_type(value: Any, expected_type: str) -> bool:
        """Prüft ob ein Wert dem erwarteten Typ entspricht"""
        try:
            if expected_type == 'string':
                return isinstance(value, str)
            elif expected_type == 'integer':
                return isinstance(value, int) or (isinstance(value, str) and value.isdigit())
            elif expected_type == 'float':
                return isinstance(value, (int, float)) or (isinstance(value, str) and value.replace('.', '').isdigit())
            elif expected_type == 'boolean':
                return isinstance(value, bool) or value in ['true', 'false', '1', '0']
            elif expected_type == 'date':
                from datetime import datetime
                return isinstance(value, str) and bool(datetime.strptime(value, '%Y-%m-%d'))
            elif expected_type == 'email':
                return bool(re.match(SecurityService.SECURITY_PATTERNS['email'], str(value)))
            elif expected_type == 'phone':
                return bool(re.match(SecurityService.SECURITY_PATTERNS['phone'], str(value)))
            else:
                return True
        except:
            return False
    
    @staticmethod
    def sanitize_input(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Bereinigt Eingabedaten von potenziell gefährlichen Inhalten
        
        Args:
            data: Zu bereinigende Daten
            
        Returns:
            Bereinigte Daten
        """
        sanitized = {}
        
        for key, value in data.items():
            if isinstance(value, str):
                # HTML-Tags entfernen
                sanitized_value = re.sub(r'<[^>]*>', '', value)
                # SQL-Injection-Patterns entfernen
                sanitized_value = re.sub(r'(\b(union|select|insert|update|delete|drop|create|alter)\b)', '', sanitized_value, flags=re.IGNORECASE)
                # XSS-Patterns entfernen
                sanitized_value = re.sub(r'(javascript:|vbscript:|onload=|onerror=)', '', sanitized_value, flags=re.IGNORECASE)
                sanitized[key] = sanitized_value.strip()
            elif isinstance(value, dict):
                sanitized[key] = SecurityService.sanitize_input(value)
            elif isinstance(value, list):
                sanitized[key] = [SecurityService.sanitize_input(item) if isinstance(item, dict) else item for item in value]
            else:
                sanitized[key] = value
        
        return sanitized
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validiert die Stärke eines Passworts
        
        Args:
            password: Zu validierendes Passwort
            
        Returns:
            Dictionary mit Validierungsergebnissen
        """
        result = {
            'is_valid': True,
            'score': 0,
            'errors': [],
            'warnings': []
        }
        
        # Mindestlänge
        if len(password) < 8:
            result['errors'].append("Das Passwort muss mindestens 8 Zeichen lang sein.")
            result['is_valid'] = False
        
        # Großbuchstaben
        if not re.search(r'[A-Z]', password):
            result['errors'].append("Das Passwort muss mindestens einen Großbuchstaben enthalten.")
            result['is_valid'] = False
        
        # Kleinbuchstaben
        if not re.search(r'[a-z]', password):
            result['errors'].append("Das Passwort muss mindestens einen Kleinbuchstaben enthalten.")
            result['is_valid'] = False
        
        # Zahlen
        if not re.search(r'\d', password):
            result['errors'].append("Das Passwort muss mindestens eine Zahl enthalten.")
            result['is_valid'] = False
        
        # Sonderzeichen
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            result['warnings'].append("Das Passwort sollte Sonderzeichen enthalten.")
        
        # Score berechnen
        score = 0
        if len(password) >= 8: score += 1
        if len(password) >= 12: score += 1
        if re.search(r'[A-Z]', password): score += 1
        if re.search(r'[a-z]', password): score += 1
        if re.search(r'\d', password): score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password): score += 1
        
        result['score'] = score
        
        return result
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generiert einen sicheren Token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_sensitive_data(data: str) -> str:
        """Hasht sensitive Daten"""
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def validate_file_upload(file, allowed_types: List[str], max_size_mb: int = 10) -> Dict[str, Any]:
        """
        Validiert Datei-Uploads
        
        Args:
            file: UploadedFile-Objekt
            allowed_types: Liste erlaubter MIME-Types
            max_size_mb: Maximale Dateigröße in MB
            
        Returns:
            Validierungsergebnis
        """
        result = {
            'is_valid': True,
            'errors': []
        }
        
        # Dateityp prüfen
        if file.content_type not in allowed_types:
            result['errors'].append(f"Dateityp '{file.content_type}' ist nicht erlaubt.")
            result['is_valid'] = False
        
        # Dateigröße prüfen
        max_size_bytes = max_size_mb * 1024 * 1024
        if file.size > max_size_bytes:
            result['errors'].append(f"Datei ist zu groß. Maximale Größe: {max_size_mb}MB")
            result['is_valid'] = False
        
        # Dateiname prüfen
        if not re.match(r'^[a-zA-Z0-9._-]+$', file.name):
            result['errors'].append("Dateiname enthält ungültige Zeichen.")
            result['is_valid'] = False
        
        return result

class RateLimiter:
    """Rate Limiting für API-Endpunkte"""
    
    def __init__(self):
        self.attempts = {}
    
    def check_rate_limit(self, identifier: str, limit_type: str) -> Dict[str, Any]:
        """
        Prüft Rate Limits
        
        Args:
            identifier: Eindeutiger Identifier (z.B. IP, User-ID)
            limit_type: Art des Limits (login_attempts, api_requests, etc.)
            
        Returns:
            Rate Limit Status
        """
        config = SecurityService.RATE_LIMIT_CONFIG.get(limit_type, {})
        if not config:
            return {'allowed': True, 'remaining': 999}
        
        now = timezone.now()
        key = f"{identifier}:{limit_type}"
        
        # Alte Einträge entfernen
        if key in self.attempts:
            window_start = now - timedelta(minutes=config['window_minutes'])
            self.attempts[key] = [attempt for attempt in self.attempts[key] if attempt > window_start]
        else:
            self.attempts[key] = []
        
        # Limit prüfen
        current_attempts = len(self.attempts[key])
        max_attempts = config['max_attempts']
        
        if current_attempts >= max_attempts:
            # Lockout prüfen
            if 'lockout_minutes' in config:
                oldest_attempt = min(self.attempts[key])
                lockout_until = oldest_attempt + timedelta(minutes=config['lockout_minutes'])
                
                if now < lockout_until:
                    return {
                        'allowed': False,
                        'remaining': 0,
                        'lockout_until': lockout_until,
                        'message': f"Zu viele Versuche. Bitte warten Sie {config['lockout_minutes']} Minuten."
                    }
                else:
                    # Lockout vorbei, Reset
                    self.attempts[key] = []
                    current_attempts = 0
        
        return {
            'allowed': True,
            'remaining': max_attempts - current_attempts,
            'reset_time': now + timedelta(minutes=config['window_minutes'])
        }
    
    def record_attempt(self, identifier: str, limit_type: str) -> None:
        """Zeichnet einen Versuch auf"""
        key = f"{identifier}:{limit_type}"
        if key not in self.attempts:
            self.attempts[key] = []
        
        self.attempts[key].append(timezone.now())
    
    def reset_attempts(self, identifier: str, limit_type: str) -> None:
        """Setzt Versuche zurück"""
        key = f"{identifier}:{limit_type}"
        if key in self.attempts:
            del self.attempts[key]

# Globale Rate Limiter Instanz
rate_limiter = RateLimiter()

class SecurityMiddleware:
    """Django Middleware für Sicherheitsfeatures"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Security Headers setzen
        response = self.get_response(request)
        
        # Content Security Policy
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        
        # XSS Protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Content Type Options
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Frame Options
        response['X-Frame-Options'] = 'DENY'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response

# Utility-Funktionen
def validate_patient_data(data: Dict[str, Any]) -> Dict[str, List[str]]:
    """Validiert Patientendaten"""
    rules = {
        'first_name': {
            'required': True,
            'type': 'string',
            'min_length': 2,
            'max_length': 50
        },
        'last_name': {
            'required': True,
            'type': 'string',
            'min_length': 2,
            'max_length': 50
        },
        'email': {
            'required': False,
            'type': 'email',
            'pattern': 'email'
        },
        'phone_number': {
            'required': False,
            'type': 'phone',
            'pattern': 'phone'
        },
        'date_of_birth': {
            'required': True,
            'type': 'date'
        }
    }
    
    return SecurityService.validate_input(data, rules)

def validate_appointment_data(data: Dict[str, Any]) -> Dict[str, List[str]]:
    """Validiert Termindaten"""
    rules = {
        'appointment_date': {
            'required': True,
            'type': 'string'
        },
        'duration_minutes': {
            'required': True,
            'type': 'integer',
            'min_value': 15,
            'max_value': 480
        },
        'notes': {
            'required': False,
            'type': 'string',
            'max_length': 1000
        }
    }
    
    return SecurityService.validate_input(data, rules)

def sanitize_user_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """Bereinigt Benutzereingaben"""
    return SecurityService.sanitize_input(data)
