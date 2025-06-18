from datetime import timedelta, datetime, time
from django.utils.timezone import make_aware
from django.core.exceptions import ValidationError
from core.models import Appointment, WorkingHour, Practice
import json


def propose_and_create_appointments(prescription, interval_days, room, practitioner, treatment, start_date=None, number_of_sessions=None, start_time=None):
    """
    Vorschlag und Erstellung von Terminen für ein Rezept.
    
    :param prescription: Prescription-Objekt, das die Details enthält.
    :param interval_days: Abstand zwischen Terminen in Tagen.
    :param room: Raum-Objekt, für den der Termin geplant wird.
    :param practitioner: Behandler-Objekt, der den Termin durchführt.
    :param treatment: Behandlung-Objekt, die durchgeführt wird.
    :param start_date: Startdatum der Termine.
    :param number_of_sessions: Anzahl der zu erstellenden Termine.
    :param start_time: Startzeit der Termine.
    :return: Liste der angelegten Termine.
    """
    appointments = []
    if start_date is None:
        start_date = prescription.prescription_date
    if number_of_sessions is None:
        number_of_sessions = prescription.number_of_sessions

    for session_number in range(number_of_sessions):
        appointment_date = start_date + timedelta(days=session_number * interval_days)
        if start_time is not None:
            # start_time als datetime.time-Objekt
            if isinstance(start_time, str):
                hour, minute = map(int, start_time.split(":"))
                start_time_obj = time(hour, minute)
            else:
                start_time_obj = start_time
        else:
            start_time_obj = datetime.min.time()
        appointment_time = datetime.combine(appointment_date, start_time_obj)
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
            treatment=treatment,
            appointment_date=appointment_datetime,
            duration_minutes=treatment.duration_minutes,
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
    print(f"[DEBUG] Prüfung Öffnungszeiten für: {appointment_datetime}")
    return practice.is_open_at(appointment_datetime)

def is_room_available(room, appointment_datetime):
    print("[DEBUG] is_room_available wurde aufgerufen und gibt True zurück!")
    return True

def is_practitioner_available(practitioner, appointment_datetime):
    print("[DEBUG] is_practitioner_available wurde aufgerufen und gibt True zurück!")
    return True

def is_open_at(self, dt):
    print("[DEBUG] is_open_at wurde aufgerufen und gibt True zurück!")
    return True
