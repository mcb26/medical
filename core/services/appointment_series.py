from datetime import datetime, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from core.models import Prescription, Appointment, Practice, Practitioner, Room
from typing import List, Dict
from django.utils import timezone
import uuid


def create_appointment_series(prescription, start_date, interval_days, total_sessions):
    """
    Erstellt eine Serie von Terminen basierend auf einer Verordnung.
    """
    series_id = f"series_{prescription.id}_{start_date.strftime('%Y%m%d')}"
    appointments = []
    for i in range(total_sessions):
        appointment_date = start_date + timedelta(days=i * interval_days)
        appointments.append(Appointment(
            patient=prescription.patient,
            practitioner=None,  # Optional: Praktiker nachträglich zuweisen
            treatment=prescription.treatment_type,
            prescription=prescription,
            appointment_date=appointment_date,
            duration_minutes=prescription.treatment_type.duration_minutes,
            status='planned',
            series_identifier=series_id,
            is_recurring=True
        ))
    Appointment.objects.bulk_create(appointments)
    return series_id


class AppointmentSeriesService:
    @staticmethod
    def create_series(prescription_id, config):
        prescription = Prescription.objects.select_related(
            'patient',
            'patient_insurance',
            'doctor',
            'diagnosis_code',
            'treatment_1',
            'treatment_2',
            'treatment_3'
        ).get(id=prescription_id)

        start_date = datetime.strptime(config['start_date'], '%Y-%m-%d').date()
        time = datetime.strptime(config['time'], '%H:%M').time()
        frequency = int(config['frequency'])
        practitioner = Practitioner.objects.get(id=config['practitioner_id'])
        room = Room.objects.get(id=config['room_id'])
        
        # Generiere eine eindeutige Series ID
        series_identifier = f"SER-{uuid.uuid4().hex[:8]}"
        
        # Wenn spezifische Tage ausgewählt wurden
        selected_days = [int(day) for day in config.get('days', [])]
        
        appointments = []
        current_date = start_date
        remaining_sessions = prescription.number_of_sessions - prescription.sessions_completed
        
        while remaining_sessions > 0:
            # Wenn Wochentage ausgewählt wurden, prüfe ob der aktuelle Tag erlaubt ist
            if selected_days and current_date.weekday() not in selected_days:
                current_date += timedelta(days=1)
                continue
                
            appointment_datetime = datetime.combine(current_date, time)
            
            appointment = Appointment.objects.create(
                patient=prescription.patient,
                practitioner=practitioner,
                room=room,
                appointment_date=appointment_datetime,
                duration_minutes=30,
                status='planned',
                prescription=prescription,
                treatment=prescription.treatment_1,
                series_identifier=series_identifier
            )
            
            appointments.append(appointment)
            remaining_sessions -= 1
            current_date += timedelta(days=frequency)
            
        # Aktualisiere die Verordnung
        prescription.status = 'In_Progress'
        prescription.save()
            
        return appointments

    @staticmethod
    def _generate_dates(prescription: Prescription, config: Dict) -> List[datetime]:
        """Generiert die Termine basierend auf der Konfiguration"""
        start_date = datetime.strptime(config['start_date'], "%Y-%m-%d")
        time = datetime.strptime(config['time'], "%H:%M").time()
        dates = []
        
        # Praxisdaten für Öffnungszeiten
        practice = Practice.objects.first()
        
        if config['frequency'] == 'weekly':
            weeks_needed = -(-prescription.remaining_sessions // len(config['days']))  # Aufrunden
            for week in range(weeks_needed):
                for day in config['days']:
                    current_date = start_date + timedelta(days=(week * 7 + day))
                    if len(dates) < prescription.remaining_sessions:
                        dates.append(datetime.combine(current_date, time))
        
        elif config['frequency'] == 'daily':
            for i in range(prescription.remaining_sessions):
                current_date = start_date + timedelta(days=i)
                dates.append(datetime.combine(current_date, time))
                
        return dates

    @staticmethod
    def _validate_availability(dates: List[datetime], config: Dict) -> bool:
        """Prüft die Verfügbarkeit für alle generierten Termine"""
        for date in dates:
            # 1. Prüfe Praxisöffnungszeiten
            if not AppointmentSeriesService._is_practice_open(date):
                raise ValidationError(f"Praxis ist am {date.strftime('%d.%m.%Y')} geschlossen")

            # 2. Prüfe Raumverfügbarkeit
            if not AppointmentSeriesService._is_room_available(date, config['room_id']):
                raise ValidationError(f"Raum ist am {date.strftime('%d.%m.%Y')} nicht verfügbar")

            # 3. Prüfe Behandlerverfügbarkeit
            if config.get('practitioner_id') and not AppointmentSeriesService._is_practitioner_available(
                date, config['practitioner_id']
            ):
                raise ValidationError(f"Behandler ist am {date.strftime('%d.%m.%Y')} nicht verfügbar")

        return True

    @staticmethod
    def _is_practice_open(date: datetime) -> bool:
        """Prüft ob die Praxis zum gewünschten Zeitpunkt geöffnet ist"""
        practice = Practice.objects.first()
        
        # Hier können Sie Ihre eigene Logik implementieren
        # Beispiel: Prüfen Sie die WorkingHour-Einträge
        weekday = date.weekday()  # 0 = Montag, 6 = Sonntag
        time = date.time()
        
        working_hours = practice.workinghour_set.filter(day=weekday).first()
        if not working_hours:
            return False
            
        return (working_hours.start_time <= time <= working_hours.end_time)

    @staticmethod
    def _is_room_available(date: datetime, room_id: int) -> bool:
        """Prüft ob der Raum zum gewünschten Zeitpunkt verfügbar ist"""
        existing_appointments = Appointment.objects.filter(
            room_id=room_id,
            appointment_date__date=date.date(),
            status__in=['scheduled', 'confirmed']
        )
        return not existing_appointments.exists()

    @staticmethod
    def _is_practitioner_available(date: datetime, practitioner_id: int) -> bool:
        """Prüft ob der Behandler zum gewünschten Zeitpunkt verfügbar ist"""
        existing_appointments = Appointment.objects.filter(
            practitioner_id=practitioner_id,
            appointment_date__date=date.date(),
            status__in=['scheduled', 'confirmed']
        )
        return not existing_appointments.exists()

    def generate_appointment_proposals(self, prescription, start_date):
        proposals = []
        # ... Ihre bestehende Logik ...
        
        for proposal in proposals:
            proposal['practitioner'] = {
                'id': proposal['practitioner'].id,
                'name': str(proposal['practitioner'])
            }
            proposal['room'] = {
                'id': proposal['room'].id,
                'name': str(proposal['room'])
            }
        
        return proposals
