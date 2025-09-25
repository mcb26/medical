import logging
import traceback
from typing import Dict, Any, Optional
from django.http import HttpRequest
from django.conf import settings
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class ErrorService:
    """Service für strukturiertes Error Handling und Logging"""
    
    ERROR_LEVELS = {
        'critical': logging.CRITICAL,
        'error': logging.ERROR,
        'warning': logging.WARNING,
        'info': logging.INFO,
        'debug': logging.DEBUG
    }
    
    @staticmethod
    def log_error(
        error: Exception,
        context: Dict[str, Any] = None,
        level: str = 'error',
        request: Optional[HttpRequest] = None,
        user_id: Optional[int] = None
    ) -> str:
        """
        Loggt einen Fehler mit strukturiertem Kontext
        
        Args:
            error: Die Exception die aufgetreten ist
            context: Zusätzlicher Kontext (z.B. API-Endpunkt, Parameter)
            level: Log-Level ('critical', 'error', 'warning', 'info', 'debug')
            request: Django Request-Objekt für zusätzliche Informationen
            user_id: ID des betroffenen Benutzers
            
        Returns:
            Error-ID für Referenzierung
        """
        error_id = f"ERR_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(error)) % 10000}"
        
        # Basis-Error-Informationen
        error_data = {
            'error_id': error_id,
            'timestamp': datetime.now().isoformat(),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'traceback': traceback.format_exc(),
            'level': level
        }
        
        # Request-Informationen hinzufügen
        if request:
            error_data.update({
                'request_method': request.method,
                'request_path': request.path,
                'request_user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'request_ip': ErrorService._get_client_ip(request),
                'request_params': dict(request.GET.items()),
                'request_body': ErrorService._get_request_body(request)
            })
        
        # Benutzer-Informationen
        if user_id:
            error_data['user_id'] = user_id
        
        # Zusätzlicher Kontext
        if context:
            error_data['context'] = context
        
        # Logging basierend auf Level
        log_level = ErrorService.ERROR_LEVELS.get(level, logging.ERROR)
        
        # Strukturiertes Logging
        logger.log(
            log_level,
            f"Error {error_id}: {error_data['error_type']}: {error_data['error_message']}",
            extra={
                'error_data': error_data,
                'error_id': error_id
            }
        )
        
        # Zusätzliches Logging für kritische Fehler
        if level == 'critical':
            ErrorService._log_critical_error(error_data)
        
        return error_id
    
    @staticmethod
    def _get_client_ip(request: HttpRequest) -> str:
        """Ermittelt die Client-IP-Adresse"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def _get_request_body(request: HttpRequest) -> Dict:
        """Extrahiert Request-Body Informationen"""
        try:
            if request.content_type == 'application/json':
                return json.loads(request.body.decode('utf-8'))
            elif request.content_type == 'application/x-www-form-urlencoded':
                return dict(request.POST.items())
            else:
                return {'content_type': request.content_type}
        except Exception:
            return {'error': 'Could not parse request body'}
    
    @staticmethod
    def _log_critical_error(error_data: Dict) -> None:
        """Zusätzliches Logging für kritische Fehler"""
        # Hier könnte man kritische Fehler an externe Services senden
        # z.B. Sentry, Email, Slack, etc.
        
        critical_logger = logging.getLogger('critical_errors')
        critical_logger.critical(
            f"CRITICAL ERROR: {error_data['error_id']}",
            extra={'error_data': error_data}
        )
    
    @staticmethod
    def format_error_response(
        error: Exception,
        error_id: str,
        include_traceback: bool = False
    ) -> Dict[str, Any]:
        """
        Formatiert eine benutzerfreundliche Fehlerantwort
        
        Args:
            error: Die Exception
            error_id: Die Error-ID für Referenzierung
            include_traceback: Ob Traceback inkludiert werden soll
            
        Returns:
            Formatierte Fehlerantwort
        """
        response = {
            'error': True,
            'error_id': error_id,
            'message': str(error),
            'type': type(error).__name__,
            'timestamp': datetime.now().isoformat()
        }
        
        if include_traceback and settings.DEBUG:
            response['traceback'] = traceback.format_exc()
        
        return response
    
    @staticmethod
    def handle_api_error(
        error: Exception,
        request: HttpRequest = None,
        context: Dict = None
    ) -> Dict[str, Any]:
        """
        Behandelt API-Fehler und gibt formatierte Antwort zurück
        
        Args:
            error: Die Exception
            request: Django Request-Objekt
            context: Zusätzlicher Kontext
            
        Returns:
            Formatierte API-Fehlerantwort
        """
        # Error loggen
        error_id = ErrorService.log_error(
            error=error,
            context=context,
            request=request,
            user_id=getattr(request.user, 'id', None) if request else None
        )
        
        # Benutzerfreundliche Nachricht basierend auf Fehlertyp
        user_message = ErrorService._get_user_friendly_message(error)
        
        return {
            'error': True,
            'error_id': error_id,
            'message': user_message,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _get_user_friendly_message(error: Exception) -> str:
        """Generiert benutzerfreundliche Fehlermeldungen"""
        error_type = type(error).__name__
        
        # Spezifische Fehlermeldungen für häufige Fehler
        if 'DoesNotExist' in error_type:
            return "Die angeforderte Ressource wurde nicht gefunden."
        elif 'ValidationError' in error_type:
            return "Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben."
        elif 'PermissionDenied' in error_type:
            return "Sie haben keine Berechtigung für diese Aktion."
        elif 'ConnectionError' in error_type:
            return "Verbindungsfehler. Bitte versuchen Sie es später erneut."
        elif 'TimeoutError' in error_type:
            return "Zeitüberschreitung. Bitte versuchen Sie es erneut."
        else:
            return "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."

class ErrorMiddleware:
    """Django Middleware für globales Error Handling"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            # Error loggen
            error_id = ErrorService.log_error(
                error=e,
                request=request,
                context={'middleware': 'ErrorMiddleware'},
                level='error'
            )
            
            # In Produktion: Generische Fehlerseite
            if not settings.DEBUG:
                from django.http import HttpResponse
                return HttpResponse(
                    f"Ein Fehler ist aufgetreten. Error-ID: {error_id}",
                    status=500
                )
            
            # In Development: Exception weiterwerfen
            raise

class PerformanceMonitor:
    """Überwacht Performance und loggt langsame Anfragen"""
    
    SLOW_REQUEST_THRESHOLD = 1.0  # Sekunden
    
    @staticmethod
    def log_slow_request(request: HttpRequest, duration: float) -> None:
        """Loggt langsame Anfragen"""
        if duration > PerformanceMonitor.SLOW_REQUEST_THRESHOLD:
            logger.warning(
                f"Slow request detected: {request.method} {request.path} "
                f"took {duration:.2f}s",
                extra={
                    'request_method': request.method,
                    'request_path': request.path,
                    'duration': duration,
                    'user_id': getattr(request.user, 'id', None),
                    'ip': ErrorService._get_client_ip(request)
                }
            )
    
    @staticmethod
    def log_database_query_count(request: HttpRequest, query_count: int) -> None:
        """Loggt hohe Datenbankabfragen"""
        if query_count > 50:  # Schwellenwert für zu viele Queries
            logger.warning(
                f"High query count detected: {request.method} {request.path} "
                f"executed {query_count} queries",
                extra={
                    'request_method': request.method,
                    'request_path': request.path,
                    'query_count': query_count,
                    'user_id': getattr(request.user, 'id', None)
                }
            )

# Globale Error-Handler für unerwartete Exceptions
def handle_unexpected_error(error: Exception, context: str = "unknown") -> str:
    """Behandelt unerwartete Fehler"""
    return ErrorService.log_error(
        error=error,
        context={'source': context},
        level='critical'
    )

# Utility-Funktionen für häufige Anwendungsfälle
def log_api_error(error: Exception, endpoint: str, params: Dict = None) -> str:
    """Loggt API-Fehler"""
    context = {
        'endpoint': endpoint,
        'params': params or {}
    }
    return ErrorService.log_error(error, context, level='error')

def log_database_error(error: Exception, operation: str, model: str = None) -> str:
    """Loggt Datenbankfehler"""
    context = {
        'operation': operation,
        'model': model
    }
    return ErrorService.log_error(error, context, level='error')

def log_permission_error(error: Exception, user_id: int, action: str) -> str:
    """Loggt Berechtigungsfehler"""
    context = {
        'action': action,
        'user_id': user_id
    }
    return ErrorService.log_error(error, context, level='warning')
