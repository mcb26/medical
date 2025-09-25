from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from core.models import Appointment, Practice
from django.db import models


class CancellationFeeService:
    """Service für die Berechnung und Verwaltung von No-Show und Absage-Gebühren"""
    
    @staticmethod
    def get_default_fee_settings():
        """Standard-Gebühren-Einstellungen"""
        return {
            'no_show_fee': 25.00,  # 25€ für No-Show
            'late_cancellation_fee': 15.00,  # 15€ für Absage < 24h
            'very_late_cancellation_fee': 25.00,  # 25€ für Absage < 2h
            'emergency_exemption': True,  # Notfälle sind befreit
            'illness_exemption': True,  # Krankheit ist befreit
            'first_time_exemption': True,  # Erste Absage ist befreit
            'exemption_notes_required': True,  # Notizen bei Befreiung erforderlich
            'auto_calculate_fees': True,  # Automatische Gebühren-Berechnung
            'send_fee_notification': True,  # Benachrichtigung bei Gebühren
        }
    
    @staticmethod
    def get_practice_fee_settings():
        """Lädt die Gebühren-Einstellungen der Praxis"""
        try:
            practice = Practice.get_instance()
            settings = practice.cancellation_fee_settings
            if not settings:
                settings = CancellationFeeService.get_default_fee_settings()
                practice.cancellation_fee_settings = settings
                practice.save()
            return settings
        except Exception:
            return CancellationFeeService.get_default_fee_settings()
    
    @staticmethod
    def calculate_cancellation_fee(appointment, cancellation_reason, cancellation_time=None):
        """
        Berechnet die Absage-Gebühr basierend auf Grund und Zeitpunkt
        
        Args:
            appointment: Appointment-Objekt
            cancellation_reason: Grund der Absage
            cancellation_time: Zeitpunkt der Absage (default: jetzt)
        
        Returns:
            Decimal: Gebühr oder 0.00 bei Befreiung
        """
        if not cancellation_time:
            cancellation_time = timezone.now()
        
        settings = CancellationFeeService.get_practice_fee_settings()
        
        # Befreiungen prüfen
        if cancellation_reason in ['emergency', 'illness']:
            if settings.get(f'{cancellation_reason}_exemption', True):
                return Decimal('0.00')
        
        # Zeitbasierte Gebühren
        time_until_appointment = appointment.appointment_date - cancellation_time
        
        if cancellation_reason == 'no_show':
            return Decimal(str(settings.get('no_show_fee', 25.00)))
        
        elif cancellation_reason == 'late_cancellation':
            if time_until_appointment < timedelta(hours=24):
                return Decimal(str(settings.get('late_cancellation_fee', 15.00)))
        
        elif cancellation_reason == 'very_late_cancellation':
            if time_until_appointment < timedelta(hours=2):
                return Decimal(str(settings.get('very_late_cancellation_fee', 25.00)))
        
        # Erste Absage befreien
        if settings.get('first_time_exemption', True):
            patient_cancellations = Appointment.objects.filter(
                patient=appointment.patient,
                cancellation_fee__gt=0
            ).count()
            if patient_cancellations == 0:
                return Decimal('0.00')
        
        return Decimal('0.00')
    
    @staticmethod
    def apply_cancellation_fee(appointment, cancellation_reason, cancellation_notes=None):
        """
        Wendet eine Absage-Gebühr auf einen Termin an
        
        Args:
            appointment: Appointment-Objekt
            cancellation_reason: Grund der Absage
            cancellation_notes: Zusätzliche Notizen
        
        Returns:
            bool: True wenn Gebühr angewendet wurde
        """
        fee = CancellationFeeService.calculate_cancellation_fee(
            appointment, 
            cancellation_reason
        )
        
        appointment.cancellation_fee = fee
        appointment.cancellation_reason = cancellation_reason
        appointment.cancellation_notes = cancellation_notes
        appointment.cancellation_fee_charged = fee > 0
        appointment.save()
        
        return fee > 0
    
    @staticmethod
    def mark_fee_as_paid(appointment):
        """Markiert eine Gebühr als bezahlt"""
        appointment.cancellation_fee_paid = True
        appointment.save()
    
    @staticmethod
    def get_patient_cancellation_history(patient):
        """Ermittelt die Absage-Historie eines Patienten"""
        return Appointment.objects.filter(
            patient=patient,
            cancellation_fee__gt=0
        ).order_by('-appointment_date')
    
    @staticmethod
    def get_total_outstanding_fees(patient=None):
        """Ermittelt ausstehende Gebühren (global oder pro Patient)"""
        query = Appointment.objects.filter(
            cancellation_fee__gt=0,
            cancellation_fee_charged=True,
            cancellation_fee_paid=False
        )
        
        if patient:
            query = query.filter(patient=patient)
        
        return query.aggregate(
            total_fees=models.Sum('cancellation_fee')
        )['total_fees'] or Decimal('0.00')
    
    @staticmethod
    def generate_fee_report(start_date=None, end_date=None):
        """Generiert einen Bericht über Absage-Gebühren"""
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now().date()
        
        appointments = Appointment.objects.filter(
            appointment_date__date__range=[start_date, end_date],
            cancellation_fee__gt=0
        )
        
        report = {
            'period': f"{start_date} bis {end_date}",
            'total_appointments': appointments.count(),
            'total_fees_charged': appointments.aggregate(
                total=models.Sum('cancellation_fee')
            )['total'] or Decimal('0.00'),
            'total_fees_paid': appointments.filter(
                cancellation_fee_paid=True
            ).aggregate(
                total=models.Sum('cancellation_fee')
            )['total'] or Decimal('0.00'),
            'total_fees_outstanding': appointments.filter(
                cancellation_fee_paid=False
            ).aggregate(
                total=models.Sum('cancellation_fee')
            )['total'] or Decimal('0.00'),
            'by_reason': {},
            'by_patient': {}
        }
        
        # Gruppierung nach Absage-Grund
        for reason in ['no_show', 'late_cancellation', 'very_late_cancellation', 'emergency', 'illness', 'other']:
            reason_appointments = appointments.filter(cancellation_reason=reason)
            report['by_reason'][reason] = {
                'count': reason_appointments.count(),
                'total_fees': reason_appointments.aggregate(
                    total=models.Sum('cancellation_fee')
                )['total'] or Decimal('0.00')
            }
        
        # Gruppierung nach Patient
        for appointment in appointments:
            patient_name = f"{appointment.patient.first_name} {appointment.patient.last_name}"
            if patient_name not in report['by_patient']:
                report['by_patient'][patient_name] = {
                    'count': 0,
                    'total_fees': Decimal('0.00')
                }
            report['by_patient'][patient_name]['count'] += 1
            report['by_patient'][patient_name]['total_fees'] += appointment.cancellation_fee
        
        return report 