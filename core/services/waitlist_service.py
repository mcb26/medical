import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from core.models import Waitlist, Appointment, UserActivityLog
from core.services.notification_service import NotificationService
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

class WaitlistService:
    """Service für Wartelisten-Management und automatische Terminvergabe"""
    
    @staticmethod
    def add_to_waitlist(appointment, available_from=None, available_until=None, priority='medium', notes=None):
        """Fügt einen Patienten zur Warteliste hinzu (bei Terminabsage)"""
        try:
            # Standard-Zeitraum: nächste 30 Tage
            if not available_from:
                available_from = timezone.now()
            if not available_until:
                available_until = available_from + timedelta(days=30)
            
            # Bestimme Priorität basierend auf Behandlung und Verordnung
            if appointment.prescription and appointment.prescription.is_urgent:
                priority = 'urgent'
            elif appointment.treatment.is_self_pay:
                priority = 'high'
            
            waitlist_entry = Waitlist.objects.create(
                patient=appointment.patient,
                treatment=appointment.treatment,
                practitioner=appointment.practitioner,
                prescription=appointment.prescription,
                available_from=available_from,
                available_until=available_until,
                priority=priority,
                original_appointment=appointment,
                notes=notes or f"Terminabsage: {appointment.appointment_date.strftime('%d.%m.%Y %H:%M')}"
            )
            
            # Logge die Wartelisten-Eintragung
            UserActivityLog.objects.create(
                user=appointment.practitioner,
                action='create',
                module='waitlist',
                object_type='Waitlist',
                object_id=str(waitlist_entry.id),
                description=f"Patient zur Warteliste hinzugefügt (Priorität: {priority})"
            )
            
            logger.info(f"Patient {appointment.patient} zur Warteliste hinzugefügt")
            return waitlist_entry
            
        except Exception as e:
            logger.error(f"Fehler beim Hinzufügen zur Warteliste: {e}")
            raise
    
    @staticmethod
    def find_matching_appointments(waitlist_entry):
        """Findet passende freie Termine für einen Wartelisten-Eintrag"""
        try:
            # Suche nach freien Terminen im verfügbaren Zeitraum
            matching_appointments = Appointment.objects.filter(
                status='cancelled',  # Stornierte Termine
                practitioner=waitlist_entry.practitioner,
                treatment=waitlist_entry.treatment,
                appointment_date__gte=waitlist_entry.available_from,
                appointment_date__lte=waitlist_entry.available_until,
                duration_minutes=waitlist_entry.original_appointment.duration_minutes if waitlist_entry.original_appointment else 30
            ).order_by('appointment_date')
            
            return matching_appointments
            
        except Exception as e:
            logger.error(f"Fehler beim Suchen passender Termine: {e}")
            return []
    
    @staticmethod
    def offer_appointments_to_waitlist():
        """Bietet freie Termine Wartelisten-Patienten an"""
        try:
            # Hole alle wartenden Einträge, sortiert nach Priorität
            waiting_entries = Waitlist.objects.filter(
                status='waiting',
                available_until__gt=timezone.now()
            ).order_by('-priority', 'created_at')
            
            offered_count = 0
            
            for entry in waiting_entries:
                # Finde passende Termine
                matching_appointments = WaitlistService.find_matching_appointments(entry)
                
                for appointment in matching_appointments:
                    # Prüfe ob der Termin noch verfügbar ist
                    if not WaitlistService._is_appointment_available(appointment):
                        continue
                    
                    # Biete den Termin an
                    offer = entry.offer_appointment(appointment)
                    
                    # Sende Benachrichtigung an den Patienten
                    WaitlistService._send_appointment_offer_notification(entry, appointment)
                    
                    offered_count += 1
                    logger.info(f"Termin {appointment.id} an {entry.patient} angeboten")
                    break  # Nur einen Termin pro Wartelisten-Eintrag anbieten
            
            logger.info(f"Termine an Warteliste angeboten: {offered_count}")
            return offered_count
            
        except Exception as e:
            logger.error(f"Fehler beim Anbieten von Terminen: {e}")
            return 0
    
    @staticmethod
    def _is_appointment_available(appointment):
        """Prüft ob ein Termin noch verfügbar ist"""
        # Prüfe ob bereits ein Wartelisten-Angebot für diesen Termin existiert
        existing_offers = appointment.waitlist_offers.filter(
            Q(accepted_at__isnull=True) & Q(declined_at__isnull=True)
        )
        
        return not existing_offers.exists()
    
    @staticmethod
    def _send_appointment_offer_notification(waitlist_entry, appointment):
        """Sendet Benachrichtigung über angebotenen Termin"""
        try:
            subject = f"🎯 Neuer Termin verfügbar: {appointment.treatment.treatment_name}"
            
            message = f"""
Hallo {waitlist_entry.patient.first_name} {waitlist_entry.patient.last_name},

ein neuer Termin ist für Sie verfügbar:

📅 Datum: {appointment.appointment_date.strftime('%d.%m.%Y')}
🕐 Uhrzeit: {appointment.appointment_date.strftime('%H:%M')}
👨‍⚕️ Behandler: {appointment.practitioner.get_full_name()}
🏥 Behandlung: {appointment.treatment.treatment_name}
⏱️ Dauer: {appointment.duration_minutes} Minuten

Bitte bestätigen Sie diesen Termin innerhalb der nächsten 24 Stunden.

Mit freundlichen Grüßen
Ihr Praxisteam
            """
            
            # Sende E-Mail (falls konfiguriert)
            if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[waitlist_entry.patient.email],
                    fail_silently=True
                )
            
            # Logge die Benachrichtigung
            UserActivityLog.objects.create(
                user=appointment.practitioner,
                action='notification_sent',
                module='waitlist',
                object_type='Waitlist',
                object_id=str(waitlist_entry.id),
                description=f"Termin-Angebot gesendet für {appointment.appointment_date}"
            )
            
        except Exception as e:
            logger.error(f"Fehler beim Senden der Termin-Angebot-Benachrichtigung: {e}")
    
    @staticmethod
    def cleanup_expired_entries():
        """Bereinigt abgelaufene Wartelisten-Einträge"""
        try:
            expired_entries = Waitlist.objects.filter(
                available_until__lt=timezone.now(),
                status='waiting'
            )
            
            count = expired_entries.count()
            
            for entry in expired_entries:
                entry.status = 'expired'
                entry.save()
                
                # Logge die Bereinigung
                UserActivityLog.objects.create(
                    user=entry.practitioner,
                    action='update',
                    module='waitlist',
                    object_type='Waitlist',
                    object_id=str(entry.id),
                    description="Wartelisten-Eintrag abgelaufen"
                )
            
            logger.info(f"Abgelaufene Wartelisten-Einträge bereinigt: {count}")
            return count
            
        except Exception as e:
            logger.error(f"Fehler beim Bereinigen abgelaufener Einträge: {e}")
            return 0
    
    @staticmethod
    def get_waitlist_statistics():
        """Gibt Statistiken über die Warteliste zurück"""
        try:
            total_waiting = Waitlist.objects.filter(status='waiting').count()
            urgent_waiting = Waitlist.objects.filter(status='waiting', priority='urgent').count()
            expired_entries = Waitlist.objects.filter(status='expired').count()
            
            # Durchschnittliche Wartezeit
            from django.db.models import Avg
            from django.db.models.functions import ExtractDay
            
            avg_wait_time = Waitlist.objects.filter(
                status__in=['accepted', 'declined']
            ).annotate(
                wait_days=ExtractDay('updated_at' - 'created_at')
            ).aggregate(
                avg_wait=Avg('wait_days')
            )['avg_wait']
            
            return {
                'total_waiting': total_waiting,
                'urgent_waiting': urgent_waiting,
                'expired_entries': expired_entries,
                'avg_wait_time_days': int(avg_wait_time) if avg_wait_time else 0
            }
            
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Wartelisten-Statistiken: {e}")
            return {
                'total_waiting': 0,
                'urgent_waiting': 0,
                'expired_entries': 0,
                'avg_wait_time_days': 0
            }
    
    @staticmethod
    def run_waitlist_maintenance():
        """Führt alle Wartelisten-Wartungsaufgaben aus"""
        logger.info("Starte Wartelisten-Wartung...")
        
        # Bereinige abgelaufene Einträge
        WaitlistService.cleanup_expired_entries()
        
        # Biete Termine an
        offered_count = WaitlistService.offer_appointments_to_waitlist()
        
        logger.info(f"Wartelisten-Wartung abgeschlossen. {offered_count} Termine angeboten.")
        return offered_count 