from datetime import timedelta, datetime
from django.utils.timezone import make_aware
from django.core.exceptions import ValidationError
from core.models import Appointment, WorkingHour, Practice


def propose_and_create_appointments(prescription, interval_days, room, practitioner):
    """
    Vorschlag und Erstellung von Terminen für ein Rezept.
    
    :param prescription: Prescription-Objekt, das die Details enthält.
    :param interval_days: Abstand zwischen Terminen in Tagen.
    :param room: Raum-Objekt, für den der Termin geplant wird.
    :param practitioner: Behandler-Objekt, der den Termin durchführt.
    :return: Liste der angelegten Termine.
    """
    appointments = []
    start_date = prescription.prescription_date
    number_of_sessions = prescription.number_of_sessions

    for session_number in range(number_of_sessions):
        appointment_date = start_date + timedelta(days=session_number * interval_days)
        appointment_time = datetime.combine(appointment_date, datetime.min.time())
        appointment_datetime = make_aware(appointment_time)

        # Überprüfen, ob der Termin innerhalb der Öffnungszeiten liegt
        if not is_within_practice_hours(appointment_datetime):
            raise ValidationError(f"Termin am {appointment_date} liegt außerhalb der Öffnungszeiten.")

        # Prüfen, ob der Raum verfügbar ist
        if not is_room_available(room, appointment_datetime):
            raise ValidationError(f"Der Raum ist am {appointment_date} nicht verfügbar.")

        # Prüfen, ob der Behandler verfügbar ist
        if not is_practitioner_available(practitioner, appointment_datetime):
            raise ValidationError(f"Der Behandler ist am {appointment_date} nicht verfügbar.")

        # Termin erstellen
        appointment = Appointment(
            prescription=prescription,
            patient=prescription.patient,
            practitioner=practitioner,
            room=room,
            treatment=prescription.treatment_1,  # Verwende die primäre Behandlung
            appointment_date=appointment_datetime,
            duration_minutes=prescription.treatment_1.duration_minutes,
            status='planned'
        )
        appointment.save()
        appointments.append(appointment)

    return appointments

def is_within_practice_hours(appointment_datetime):
    """
    Prüft, ob der Termin innerhalb der Öffnungszeiten der Praxis liegt.
    """
    practice = Practice.get_instance()
    return practice.is_open_at(appointment_datetime)

def is_room_available(room, appointment_datetime):
    """
    Prüft, ob der Raum für den gegebenen Termin verfügbar ist.
    """
    if not room.is_available_at(appointment_datetime):
        return False

    # Prüfe auf Überschneidungen mit anderen Terminen
    end_time = appointment_datetime + timedelta(minutes=30)  # Standard-Terminlänge
    overlapping_appointments = Appointment.objects.filter(
        room=room,
        appointment_date__lt=end_time,
        appointment_date__gt=appointment_datetime - timedelta(minutes=30)
    )
    return not overlapping_appointments.exists()

def is_practitioner_available(practitioner, appointment_datetime):
    """
    Prüft, ob der Behandler für den gegebenen Termin verfügbar ist.
    """
    # Prüfe Arbeitszeiten
    weekday = appointment_datetime.strftime('%A')
    working_hours = WorkingHour.objects.filter(
        practitioner=practitioner,
        day_of_week=weekday
    )
    
    if not working_hours.exists():
        return False
        
    appointment_time = appointment_datetime.time()
    for hours in working_hours:
        if hours.start_time <= appointment_time <= hours.end_time:
            # Prüfe auf Überschneidungen mit anderen Terminen
            end_time = appointment_datetime + timedelta(minutes=30)  # Standard-Terminlänge
            overlapping_appointments = Appointment.objects.filter(
                practitioner=practitioner,
                appointment_date__lt=end_time,
                appointment_date__gt=appointment_datetime - timedelta(minutes=30)
            )
            return not overlapping_appointments.exists()
            
    return False
