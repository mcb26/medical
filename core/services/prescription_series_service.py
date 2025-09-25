import logging
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from core.models import Prescription, Appointment, Patient, Practitioner, Treatment, Room

logger = logging.getLogger(__name__)

class PrescriptionSeriesService:
    """Service für die Verwaltung von Verordnungen und Terminserien"""
    
    @staticmethod
    def create_appointment_series(
        prescription: Prescription,
        start_date: datetime,
        end_date: datetime,
        practitioner: Practitioner,
        room: Optional[Room] = None,
        frequency: str = 'weekly_1',
        duration_minutes: int = 30,
        notes: str = '',
        **kwargs
    ) -> Tuple[str, List[Appointment]]:
        """
        Erstellt eine Terminserie für eine Verordnung
        
        Args:
            prescription: Die Verordnung für die Serie
            start_date: Startdatum der Serie
            end_date: Enddatum der Serie
            practitioner: Behandler
            room: Raum (optional)
            frequency: Häufigkeit (weekly_1, weekly_2, etc.)
            duration_minutes: Dauer pro Termin
            notes: Notizen für die Termine
            **kwargs: Zusätzliche Parameter
            
        Returns:
            Tuple aus (series_identifier, list_of_appointments)
        """
        
        # Validierung
        if not prescription:
            raise ValidationError("Verordnung ist erforderlich.")
        
        if start_date >= end_date:
            raise ValidationError("Startdatum muss vor dem Enddatum liegen.")
        
        if start_date < timezone.now():
            raise ValidationError("Startdatum darf nicht in der Vergangenheit liegen.")
        
        # Prüfe ob die Verordnung bereits eine Terminserie hat
        existing_series = Appointment.objects.filter(
            prescription=prescription,
            series_identifier__isnull=False
        ).values_list('series_identifier', flat=True).distinct()
        
        if existing_series.exists():
            raise ValidationError(
                f"Verordnung {prescription.id} hat bereits eine Terminserie: {existing_series.first()}"
            )
        
        # Generiere eindeutigen Series-Identifier
        series_identifier = f"series_{prescription.id}_{int(timezone.now().timestamp())}"
        
        # Berechne Termine basierend auf Häufigkeit
        appointment_dates = PrescriptionSeriesService._calculate_appointment_dates(
            start_date, end_date, frequency
        )
        
        appointments = []
        
        with transaction.atomic():
            for i, appointment_date in enumerate(appointment_dates):
                # Prüfe ob der Behandler verfügbar ist
                if not PrescriptionSeriesService._is_practitioner_available(
                    practitioner, appointment_date, duration_minutes
                ):
                    logger.warning(
                        f"Behandler {practitioner} ist am {appointment_date} nicht verfügbar. "
                        f"Termin wird übersprungen."
                    )
                    continue
                
                # Prüfe ob der Raum verfügbar ist (falls angegeben)
                if room and not PrescriptionSeriesService._is_room_available(
                    room, appointment_date, duration_minutes
                ):
                    logger.warning(
                        f"Raum {room.name} ist am {appointment_date} nicht verfügbar. "
                        f"Termin wird ohne Raum erstellt."
                    )
                    room = None
                
                # Erstelle Termin
                appointment = Appointment.objects.create(
                    patient=prescription.patient,
                    practitioner=practitioner,
                    appointment_date=appointment_date,
                    treatment=prescription.treatment_1,  # Verwende primäre Behandlung
                    prescription=prescription,
                    patient_insurance=prescription.patient_insurance,
                    duration_minutes=duration_minutes,
                    notes=notes,
                    room=room,
                    series_identifier=series_identifier,
                    is_recurring=True,
                    **kwargs
                )
                
                appointments.append(appointment)
                logger.info(f"Termin {appointment.id} für Serie {series_identifier} erstellt.")
            
            # Aktualisiere Verordnungsstatus
            if appointments:
                prescription.status = 'In_Progress'
                prescription.save()
                logger.info(f"Verordnung {prescription.id} auf 'In_Progress' gesetzt.")
        
        return series_identifier, appointments
    
    @staticmethod
    def extend_appointment_series(
        prescription: Prescription,
        additional_sessions: int,
        practitioner: Optional[Practitioner] = None,
        room: Optional[Room] = None,
        frequency: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        notes: str = '',
        **kwargs
    ) -> List[Appointment]:
        """
        Verlängert eine bestehende Terminserie
        
        Args:
            prescription: Die Verordnung
            additional_sessions: Anzahl zusätzlicher Sitzungen
            practitioner: Behandler (optional, verwendet bestehenden falls nicht angegeben)
            room: Raum (optional)
            frequency: Häufigkeit (optional, verwendet bestehende falls nicht angegeben)
            duration_minutes: Dauer (optional, verwendet bestehende falls nicht angegeben)
            notes: Notizen
            **kwargs: Zusätzliche Parameter
            
        Returns:
            Liste der neuen Termine
        """
        
        # Finde bestehende Serie
        existing_appointments = Appointment.objects.filter(
            prescription=prescription,
            series_identifier__isnull=False
        ).order_by('appointment_date')
        
        if not existing_appointments.exists():
            raise ValidationError(f"Keine bestehende Terminserie für Verordnung {prescription.id} gefunden.")
        
        # Verwende Parameter von bestehenden Terminen falls nicht angegeben
        last_appointment = existing_appointments.last()
        practitioner = practitioner or last_appointment.practitioner
        frequency = frequency or prescription.therapy_frequency_type
        duration_minutes = duration_minutes or last_appointment.duration_minutes
        
        # Berechne Startdatum für neue Termine
        start_date = last_appointment.appointment_date + timedelta(days=1)
        
        # Berechne Enddatum basierend auf zusätzlichen Sitzungen
        end_date = PrescriptionSeriesService._calculate_end_date_for_sessions(
            start_date, additional_sessions, frequency
        )
        
        # Erstelle neue Termine
        new_appointment_dates = PrescriptionSeriesService._calculate_appointment_dates(
            start_date, end_date, frequency
        )
        
        # Begrenze auf gewünschte Anzahl
        new_appointment_dates = new_appointment_dates[:additional_sessions]
        
        new_appointments = []
        series_identifier = last_appointment.series_identifier
        
        with transaction.atomic():
            for appointment_date in new_appointment_dates:
                # Prüfe Verfügbarkeit
                if not PrescriptionSeriesService._is_practitioner_available(
                    practitioner, appointment_date, duration_minutes
                ):
                    logger.warning(
                        f"Behandler {practitioner} ist am {appointment_date} nicht verfügbar. "
                        f"Termin wird übersprungen."
                    )
                    continue
                
                if room and not PrescriptionSeriesService._is_room_available(
                    room, appointment_date, duration_minutes
                ):
                    logger.warning(
                        f"Raum {room.name} ist am {appointment_date} nicht verfügbar. "
                        f"Termin wird ohne Raum erstellt."
                    )
                    room = None
                
                # Erstelle Termin
                appointment = Appointment.objects.create(
                    patient=prescription.patient,
                    practitioner=practitioner,
                    appointment_date=appointment_date,
                    treatment=prescription.treatment_1,
                    prescription=prescription,
                    patient_insurance=prescription.patient_insurance,
                    duration_minutes=duration_minutes,
                    notes=notes,
                    room=room,
                    series_identifier=series_identifier,
                    is_recurring=True,
                    **kwargs
                )
                
                new_appointments.append(appointment)
                logger.info(f"Erweiterter Termin {appointment.id} für Serie {series_identifier} erstellt.")
        
        return new_appointments
    
    @staticmethod
    def create_follow_up_series(
        original_prescription: Prescription,
        new_sessions: int,
        practitioner: Optional[Practitioner] = None,
        room: Optional[Room] = None,
        frequency: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        notes: str = '',
        **kwargs
    ) -> Tuple[Prescription, str, List[Appointment]]:
        """
        Erstellt eine Folgeverordnung mit neuer Terminserie
        
        Args:
            original_prescription: Ursprüngliche Verordnung
            new_sessions: Anzahl neuer Sitzungen
            practitioner: Behandler (optional)
            room: Raum (optional)
            frequency: Häufigkeit (optional)
            duration_minutes: Dauer (optional)
            notes: Notizen
            **kwargs: Zusätzliche Parameter
            
        Returns:
            Tuple aus (neue_verordnung, series_identifier, list_of_appointments)
        """
        
        if not original_prescription.can_create_follow_up():
            raise ValidationError("Diese Verordnung kann nicht verlängert werden.")
        
        # Erstelle Folgeverordnung
        follow_up_prescription = original_prescription.create_follow_up_prescription(
            number_of_sessions=new_sessions,
            **kwargs
        )
        
        # Verwende Parameter von ursprünglicher Verordnung falls nicht angegeben
        practitioner = practitioner or Appointment.objects.filter(
            prescription=original_prescription
        ).first().practitioner if Appointment.objects.filter(prescription=original_prescription).exists() else None
        
        if not practitioner:
            raise ValidationError("Behandler ist erforderlich für neue Terminserie.")
        
        frequency = frequency or follow_up_prescription.therapy_frequency_type
        duration_minutes = duration_minutes or 30
        
        # Berechne Startdatum (nächster Tag nach letztem Termin)
        last_appointment = Appointment.objects.filter(
            prescription__in=original_prescription.get_all_follow_ups()
        ).order_by('appointment_date').last()
        
        start_date = (last_appointment.appointment_date + timedelta(days=1)) if last_appointment else timezone.now()
        
        # Berechne Enddatum
        end_date = PrescriptionSeriesService._calculate_end_date_for_sessions(
            start_date, new_sessions, frequency
        )
        
        # Erstelle neue Terminserie
        series_identifier, appointments = PrescriptionSeriesService.create_appointment_series(
            prescription=follow_up_prescription,
            start_date=start_date,
            end_date=end_date,
            practitioner=practitioner,
            room=room,
            frequency=frequency,
            duration_minutes=duration_minutes,
            notes=notes
        )
        
        return follow_up_prescription, series_identifier, appointments
    
    @staticmethod
    def _calculate_appointment_dates(start_date: datetime, end_date: datetime, frequency: str) -> List[datetime]:
        """Berechnet Termindaten basierend auf Häufigkeit"""
        dates = []
        current_date = start_date
        
        # Wochentag des Startdatums
        start_weekday = start_date.weekday()
        
        while current_date <= end_date:
            if frequency.startswith('weekly_'):
                # Wöchentliche Termine
                interval = int(frequency.split('_')[1])
                if current_date.weekday() == start_weekday:
                    dates.append(current_date)
                    current_date += timedelta(weeks=interval)
                else:
                    current_date += timedelta(days=1)
            
            elif frequency.startswith('monthly_'):
                # Monatliche Termine
                interval = int(frequency.split('_')[1])
                if current_date.day == start_date.day:
                    dates.append(current_date)
                    # Nächster Monat
                    if current_date.month == 12:
                        current_date = current_date.replace(year=current_date.year + 1, month=1)
                    else:
                        current_date = current_date.replace(month=current_date.month + 1)
                else:
                    current_date += timedelta(days=1)
            
            else:
                # Fallback: täglich
                dates.append(current_date)
                current_date += timedelta(days=1)
        
        return dates
    
    @staticmethod
    def _calculate_end_date_for_sessions(start_date: datetime, sessions: int, frequency: str) -> datetime:
        """Berechnet Enddatum basierend auf Anzahl Sitzungen und Häufigkeit"""
        if frequency.startswith('weekly_'):
            interval = int(frequency.split('_')[1])
            weeks_needed = (sessions - 1) * interval
            return start_date + timedelta(weeks=weeks_needed)
        
        elif frequency.startswith('monthly_'):
            interval = int(frequency.split('_')[1])
            months_needed = (sessions - 1) * interval
            # Vereinfachte Berechnung
            return start_date + timedelta(days=months_needed * 30)
        
        else:
            # Fallback: täglich
            return start_date + timedelta(days=sessions - 1)
    
    @staticmethod
    def _is_practitioner_available(practitioner: Practitioner, date: datetime, duration: int) -> bool:
        """Prüft ob ein Behandler verfügbar ist"""
        # Vereinfachte Prüfung - hier könnte komplexere Logik implementiert werden
        conflicting_appointments = Appointment.objects.filter(
            practitioner=practitioner,
            appointment_date__lt=date + timedelta(minutes=duration),
            appointment_date__gt=date - timedelta(minutes=duration)
        )
        return not conflicting_appointments.exists()
    
    @staticmethod
    def _is_room_available(room: Room, date: datetime, duration: int) -> bool:
        """Prüft ob ein Raum verfügbar ist"""
        if not room.is_active:
            return False
        
        # Vereinfachte Prüfung
        conflicting_appointments = Appointment.objects.filter(
            room=room,
            appointment_date__lt=date + timedelta(minutes=duration),
            appointment_date__gt=date - timedelta(minutes=duration)
        )
        return not conflicting_appointments.exists()
    
    @staticmethod
    def get_series_info(series_identifier: str) -> Dict:
        """Gibt Informationen über eine Terminserie zurück"""
        appointments = Appointment.objects.filter(
            series_identifier=series_identifier
        ).order_by('appointment_date')
        
        if not appointments.exists():
            return {}
        
        prescription = appointments.first().prescription
        total_appointments = appointments.count()
        completed_appointments = appointments.filter(status='completed').count()
        cancelled_appointments = appointments.filter(status='cancelled').count()
        
        return {
            'series_identifier': series_identifier,
            'prescription': prescription,
            'patient': prescription.patient if prescription else None,
            'practitioner': appointments.first().practitioner,
            'total_appointments': total_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments,
            'remaining_appointments': total_appointments - completed_appointments - cancelled_appointments,
            'start_date': appointments.first().appointment_date,
            'end_date': appointments.last().appointment_date,
            'progress_percentage': (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
        }
    
    @staticmethod
    def cancel_series(series_identifier: str, reason: str = 'cancelled') -> int:
        """Storniert alle zukünftigen Termine einer Serie"""
        future_appointments = Appointment.objects.filter(
            series_identifier=series_identifier,
            appointment_date__gt=timezone.now(),
            status='planned'
        )
        
        cancelled_count = 0
        for appointment in future_appointments:
            appointment.status = 'cancelled'
            appointment.notes = f"Serie storniert: {reason}"
            appointment.save()
            cancelled_count += 1
        
        logger.info(f"Serie {series_identifier}: {cancelled_count} Termine storniert.")
        return cancelled_count
