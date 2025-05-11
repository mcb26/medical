from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from django.db.models import Q, F, ExpressionWrapper, DurationField, DateTimeField
from django.utils.timezone import make_aware, is_naive
from datetime import timezone

def validate_holiday(appointment_date, bundesland):
    """
    Überprüft, ob ein Termin auf einen Feiertag fällt
    """
    from core.models import LocalHoliday  # Import innerhalb der Funktion
    
    # Stelle sicher, dass wir nur mit dem Datum arbeiten
    check_date = appointment_date.date()
    
    # Prüfe auf Feiertage im entsprechenden Bundesland
    holiday = LocalHoliday.objects.filter(
        bundesland=bundesland,
        date=check_date
    ).first()
    
    if holiday:
        raise ValidationError(
            f'Am {check_date} ist ein Feiertag ({holiday.holiday_name}) in {bundesland.name}. '
            'An diesem Tag können keine Termine vergeben werden.'
        )

def validate_appointment_conflicts(series):
    from core.models import Appointment
    conflicts = []
    treatment_duration = series.treatment.duration_minutes

    for i in range(series.total_sessions):
        appointment_start_time = series.start_date + timedelta(days=i * series.interval_days)

        # Prüfe, ob appointment_start_time naiv ist, und mache es dann aware
        if is_naive(appointment_start_time):
            appointment_start_time = make_aware(appointment_start_time, timezone=timezone.utc)

        appointment_end_time = appointment_start_time + timedelta(minutes=treatment_duration)

        # Überprüfe Feiertage
        if series.practitioner and series.practitioner.default_room:
            try:
                validate_holiday(
                    appointment_start_time, 
                    series.practitioner.default_room.practice.bundesland
                )
            except ValidationError as e:
                conflicts.append({
                    'session': i + 1,
                    'date': appointment_start_time,
                    'reason': str(e)
                })
                continue

        # Überprüfe, ob sich der Termin mit anderen überschneidet
        conflict_appointments = Appointment.objects.filter(
            Q(practitioner=series.practitioner) | Q(room=series.practitioner.default_room),
            # Prüfe, ob sich der Start des neuen Termins mit bestehenden Terminen überschneidet
            Q(appointment_date__lt=appointment_end_time) & 
            # Berechne die Endzeit existierender Termine dynamisch
            Q(appointment_date__gte=appointment_start_time - timedelta(minutes=F('duration_minutes')))
        )

        if conflict_appointments.exists():
            # Füge den Konflikt der Liste hinzu
            conflicts.append({
                'session': i + 1,
                'date': appointment_start_time,
                'conflicting_appointments': list(conflict_appointments),
                'reason': 'Terminüberschneidung'
            })

    if conflicts:
        # Wenn Konflikte vorhanden sind, werfe eine ValidationError mit einer Beschreibung der Konflikte
        conflict_info = '\n'.join([
            f"Session {c['session']} am {c['date']}: {c['reason']}" 
            for c in conflicts
        ])
        raise ValidationError(f"Terminkonflikte gefunden:\n{conflict_info}")

def validate_conflict_for_appointment(appointment_date, duration_minutes, practitioner, room, exclude_id=None):
    """Validates that there are no conflicting appointments."""
    from core.models import Appointment  # Import here to avoid circular import
    
    # Prüfe zuerst auf Feiertage
    if practitioner and practitioner.default_room:
        validate_holiday(appointment_date, practitioner.default_room.practice.bundesland)
    
    end_time = appointment_date + timedelta(minutes=duration_minutes)
    
    conflicting_appointments = Appointment.objects.filter(
        practitioner=practitioner,
        appointment_date__lt=end_time,
        appointment_date__gt=appointment_date - timedelta(minutes=duration_minutes)
    ).exclude(id=exclude_id)
    
    if conflicting_appointments.exists():
        raise ValidationError('Es existiert bereits ein Termin in diesem Zeitraum')

def validate_appointment_conflicts(appointment):
    """Validates appointment conflicts."""
    validate_conflict_for_appointment(
        appointment.appointment_date,
        appointment.duration_minutes,
        appointment.practitioner,
        appointment.room,
        appointment.id
    )

def validate_working_hours(practitioner, appointment_date, duration_minutes):
    """Validates that appointment is within working hours."""
    from core.models import WorkingHour  # Import here to avoid circular import
    
    day_of_week = appointment_date.strftime('%A')
    working_hours = WorkingHour.objects.filter(
        practitioner=practitioner,
        day_of_week=day_of_week
    )
    
    if not working_hours.exists():
        raise ValidationError('Für diesen Tag sind keine Arbeitszeiten definiert')
        
    appointment_time = appointment_date.time()
    end_time = (datetime.combine(datetime.min, appointment_time) + 
                timedelta(minutes=duration_minutes)).time()
    
    is_valid = False
    for wh in working_hours:
        if wh.start_time <= appointment_time and end_time <= wh.end_time:
            is_valid = True
            break
    
    if not is_valid:
        raise ValidationError('Der Termin liegt außerhalb der Arbeitszeiten')