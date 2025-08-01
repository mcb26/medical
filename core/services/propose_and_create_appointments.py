from datetime import datetime, date, timedelta, time
from django.core.exceptions import ValidationError
from django.utils.timezone import make_aware
from core.models import Appointment, Practice, WorkingHour, Absence

def propose_and_create_appointments(prescription, interval_days, room, practitioner, treatment, start_date=None, number_of_sessions=None, start_time=None):
    """
    Erstellt eine Serie von Terminen basierend auf einer Verordnung.
    
    :param prescription: Verordnung-Objekt, auf der die Termine basieren.
    :param interval_days: Anzahl der Tage zwischen den Terminen.
    :param room: Raum-Objekt, in dem die Termine stattfinden.
    :param practitioner: Behandler-Objekt, der die Termine durchführt.
    :param treatment: Behandlung-Objekt, die durchgeführt wird.
    :param start_date: Startdatum der Termine.
    :param number_of_sessions: Anzahl der zu erstellenden Termine.
    :param start_time: Startzeit der Termine.
    :return: Liste der angelegten Termine.
    """
    # Validierung der Eingabeparameter
    if not prescription:
        raise ValidationError("Es muss ein gültiges Rezept angegeben werden.")
    if not prescription.patient:
        raise ValidationError("Das Rezept muss einem Patienten zugeordnet sein.")
    if not prescription.patient_insurance:
        raise ValidationError("Das Rezept muss einer Krankenkasse zugeordnet sein.")

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
        if not is_room_available(room, appointment_datetime, treatment.duration_minutes):
            raise ValidationError(f"Der Raum ist am {appointment_date} nicht verfügbar.")

        # Prüfen, ob der Behandler verfügbar ist
        if not is_practitioner_available(practitioner, appointment_datetime, treatment.duration_minutes):
            raise ValidationError(f"Der Behandler ist am {appointment_date} nicht verfügbar.")

        # Termin erstellen mit allen notwendigen Verknüpfungen
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
        
        try:
            appointment.full_clean()  # Validiere das Appointment-Objekt
            appointment.save()
            appointments.append(appointment)
        except ValidationError as e:
            raise ValidationError(f"Fehler beim Erstellen des Termins: {str(e)}")

    return appointments

def is_within_practice_hours(appointment_datetime):
    """
    Prüft, ob der Termin innerhalb der Öffnungszeiten der Praxis liegt.
    """
    practice = Practice.get_instance()
    return practice.is_open_at(appointment_datetime)

def is_room_available(room, appointment_datetime, duration_minutes):
    """
    Prüft, ob der Raum zum angegebenen Zeitpunkt verfügbar ist.
    """
    if not room:
        return True  # Kein Raum zugewiesen = verfügbar
    
    # Prüfe ob der Raum aktiv ist
    if not room.is_active:
        return False
    
    # Prüfe ob der Raum zu diesem Zeitpunkt geöffnet ist
    if not room.is_available_at(appointment_datetime):
        return False
    
    # Prüfe auf Terminkonflikte im Raum
    end_datetime = appointment_datetime + timedelta(minutes=duration_minutes)
    
    conflicting_appointments = Appointment.objects.filter(
        room=room,
        appointment_date__lt=end_datetime,
        appointment_date__gte=appointment_datetime,
        status__in=['planned', 'confirmed']
    ).exclude(status='cancelled')
    
    return not conflicting_appointments.exists()

def is_practitioner_available(practitioner, appointment_datetime, duration_minutes):
    """
    Prüft, ob der Behandler zum angegebenen Zeitpunkt verfügbar ist.
    """
    if not practitioner:
        return False
    
    # Prüfe ob der Behandler aktiv ist
    if not practitioner.is_active:
        return False
    
    # Prüfe Arbeitszeiten
    day_of_week = appointment_datetime.strftime('%A').lower()
    working_hours = WorkingHour.objects.filter(
        practitioner=practitioner,
        day_of_week__iexact=day_of_week,
        valid_from__lte=appointment_datetime.date(),
        valid_until__isnull=True
    ).first()
    
    if not working_hours:
        return False
    
    appointment_time = appointment_datetime.time()
    end_time = (datetime.combine(date.today(), appointment_time) + 
                timedelta(minutes=duration_minutes)).time()
    
    if appointment_time < working_hours.start_time or end_time > working_hours.end_time:
        return False
    
    # Prüfe auf Abwesenheiten
    absences = Absence.objects.filter(
        practitioner=practitioner,
        start_date__lte=appointment_datetime.date(),
        end_date__gte=appointment_datetime.date()
    )
    
    for absence in absences:
        if absence.is_full_day:
            return False
        elif (absence.start_time and absence.end_time and
              appointment_time >= absence.start_time and 
              end_time <= absence.end_time):
            return False
    
    # Prüfe auf Terminkonflikte
    end_datetime = appointment_datetime + timedelta(minutes=duration_minutes)
    
    conflicting_appointments = Appointment.objects.filter(
        practitioner=practitioner,
        appointment_date__lt=end_datetime,
        appointment_date__gte=appointment_datetime,
        status__in=['planned', 'confirmed']
    ).exclude(status='cancelled')
    
    return not conflicting_appointments.exists()
