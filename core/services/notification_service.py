import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from core.models import Appointment, Prescription, Patient, User, UserActivityLog

logger = logging.getLogger(__name__)

class NotificationService:
    """Service für automatische Benachrichtigungen und Erinnerungen"""
    
    @staticmethod
    def send_appointment_reminders():
        """Sendet automatische Termin-Erinnerungen"""
        try:
            # Termine in den nächsten 24 Stunden
            tomorrow = timezone.now() + timedelta(days=1)
            upcoming_appointments = Appointment.objects.filter(
                appointment_date__gte=timezone.now(),
                appointment_date__lte=tomorrow,
                status='planned'
            ).select_related('patient', 'practitioner', 'treatment')
            
            for appointment in upcoming_appointments:
                NotificationService._send_appointment_reminder(appointment)
                
            logger.info(f"Termin-Erinnerungen gesendet: {upcoming_appointments.count()}")
            
        except Exception as e:
            logger.error(f"Fehler beim Senden von Termin-Erinnerungen: {e}")
    
    @staticmethod
    def _send_appointment_reminder(appointment):
        """Sendet eine einzelne Termin-Erinnerung"""
        try:
            # Prüfe ob Patient Benachrichtigungen erhalten möchte
            if not appointment.patient.receive_notifications:
                return
                
            # Berechne Zeit bis zum Termin
            time_until = appointment.appointment_date - timezone.now()
            hours_until = time_until.total_seconds() / 3600
            
            # Bestimme Priorität basierend auf Zeit
            if hours_until <= 2:
                priority = "HOCH"
                subject = f"⚠️ Dringende Termin-Erinnerung: {appointment.treatment.treatment_name}"
            elif hours_until <= 6:
                priority = "MITTEL"
                subject = f"📅 Termin-Erinnerung: {appointment.treatment.treatment_name}"
            else:
                priority = "NIEDRIG"
                subject = f"📋 Termin-Erinnerung: {appointment.treatment.treatment_name}"
            
            # E-Mail-Inhalt
            message = f"""
Hallo {appointment.patient.first_name} {appointment.patient.last_name},

dies ist eine Erinnerung für Ihren Termin:

📅 Datum: {appointment.appointment_date.strftime('%d.%m.%Y')}
🕐 Uhrzeit: {appointment.appointment_date.strftime('%H:%M')}
👨‍⚕️ Behandler: {appointment.practitioner.get_full_name()}
🏥 Behandlung: {appointment.treatment.treatment_name}
⏱️ Dauer: {appointment.duration_minutes} Minuten

Bitte erscheinen Sie pünktlich zu Ihrem Termin.

Bei Fragen kontaktieren Sie uns gerne.

Mit freundlichen Grüßen
Ihr Praxisteam
            """
            
            # Sende E-Mail (falls konfiguriert)
            if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[appointment.patient.email],
                    fail_silently=True
                )
            
            # Logge die Benachrichtigung
            UserActivityLog.objects.create(
                user=appointment.practitioner,
                action='notification_sent',
                module='appointments',
                object_type='Appointment',
                object_id=str(appointment.id),
                description=f"Termin-Erinnerung gesendet (Priorität: {priority})"
            )
            
        except Exception as e:
            logger.error(f"Fehler beim Senden der Termin-Erinnerung für Termin {appointment.id}: {e}")
    
    @staticmethod
    def check_prescription_expiry():
        """Prüft ablaufende Verordnungen und sendet Benachrichtigungen"""
        try:
            # Verordnungen die in den nächsten 30 Tagen ablaufen
            thirty_days_from_now = timezone.now().date() + timedelta(days=30)
            expiring_prescriptions = Prescription.objects.filter(
                prescription_date__lte=thirty_days_from_now - timedelta(days=335),  # 1 Jahr - 30 Tage
                status='In_Progress'
            ).select_related('patient', 'doctor')
            
            for prescription in expiring_prescriptions:
                NotificationService._send_prescription_expiry_notification(prescription)
                
            logger.info(f"Verordnungsablauf-Benachrichtigungen gesendet: {expiring_prescriptions.count()}")
            
        except Exception as e:
            logger.error(f"Fehler beim Prüfen ablaufender Verordnungen: {e}")
    
    @staticmethod
    def _send_prescription_expiry_notification(prescription):
        """Sendet Benachrichtigung für ablaufende Verordnung"""
        try:
            # Berechne verbleibende Tage
            expiry_date = prescription.prescription_date + timedelta(days=365)
            days_remaining = (expiry_date - timezone.now().date()).days
            
            subject = f"⚠️ Verordnung läuft ab: {prescription.get_primary_treatment_name()}"
            
            message = f"""
Hallo {prescription.patient.first_name} {prescription.patient.last_name},

Ihre Verordnung für {prescription.get_primary_treatment_name()} läuft in {days_remaining} Tagen ab.

📋 Verordnungsdetails:
- Behandlungen: {', '.join(prescription.get_treatment_names())}
- Ausstellungsdatum: {prescription.prescription_date.strftime('%d.%m.%Y')}
- Ablaufdatum: {expiry_date.strftime('%d.%m.%Y')}
- Verbleibende Tage: {days_remaining}

Bitte kontaktieren Sie Ihren Arzt für eine Verlängerung der Verordnung.

Mit freundlichen Grüßen
Ihr Praxisteam
            """
            
            # Sende E-Mail
            if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[prescription.patient.email],
                    fail_silently=True
                )
            
            # Logge die Benachrichtigung
            UserActivityLog.objects.create(
                user=prescription.doctor,
                action='notification_sent',
                module='prescriptions',
                object_type='Prescription',
                object_id=str(prescription.id),
                description=f"Verordnungsablauf-Benachrichtigung gesendet ({days_remaining} Tage verbleibend)"
            )
            
        except Exception as e:
            logger.error(f"Fehler beim Senden der Verordnungsablauf-Benachrichtigung für Verordnung {prescription.id}: {e}")
    
    @staticmethod
    def check_no_show_followup():
        """Prüft No-Shows und sendet Nachverfolgungs-Benachrichtigungen"""
        try:
            # Termine die als "no_show" markiert sind und noch nicht nachverfolgt wurden
            no_show_appointments = Appointment.objects.filter(
                status='no_show',
                appointment_date__gte=timezone.now() - timedelta(days=7)  # Letzte 7 Tage
            ).select_related('patient', 'practitioner')
            
            for appointment in no_show_appointments:
                NotificationService._send_no_show_followup(appointment)
                
            logger.info(f"No-Show Nachverfolgungen gesendet: {no_show_appointments.count()}")
            
        except Exception as e:
            logger.error(f"Fehler beim Prüfen von No-Shows: {e}")
    
    @staticmethod
    def _send_no_show_followup(appointment):
        """Sendet Nachverfolgung für No-Show"""
        try:
            subject = f"❓ Rückfrage zu Ihrem verpassten Termin"
            
            message = f"""
Hallo {appointment.patient.first_name} {appointment.patient.last_name},

wir haben Sie zu Ihrem Termin am {appointment.appointment_date.strftime('%d.%m.%Y um %H:%M')} nicht gesehen.

📋 Termindetails:
- Behandlung: {appointment.treatment.treatment_name}
- Behandler: {appointment.practitioner.get_full_name()}

Falls Sie den Termin verpasst haben, kontaktieren Sie uns bitte um einen neuen Termin zu vereinbaren.

Falls es einen technischen Fehler gab, entschuldigen wir uns und bitten um Rückmeldung.

Mit freundlichen Grüßen
Ihr Praxisteam
            """
            
            # Sende E-Mail
            if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[appointment.patient.email],
                    fail_silently=True
                )
            
            # Logge die Nachverfolgung
            UserActivityLog.objects.create(
                user=appointment.practitioner,
                action='notification_sent',
                module='appointments',
                object_type='Appointment',
                object_id=str(appointment.id),
                description="No-Show Nachverfolgung gesendet"
            )
            
        except Exception as e:
            logger.error(f"Fehler beim Senden der No-Show Nachverfolgung für Termin {appointment.id}: {e}")
    
    @staticmethod
    def run_all_notifications():
        """Führt alle automatischen Benachrichtigungen aus"""
        logger.info("Starte automatische Benachrichtigungen...")
        
        NotificationService.send_appointment_reminders()
        NotificationService.check_prescription_expiry()
        NotificationService.check_no_show_followup()
        
        logger.info("Automatische Benachrichtigungen abgeschlossen") 