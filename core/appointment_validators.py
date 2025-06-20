from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from django.db.models import Q, F, ExpressionWrapper, DurationField, DateTimeField
from django.utils.timezone import make_aware, is_naive
from datetime import timezone

def validate_holiday(appointment_date, bundesland):
    """
    Überprüft, ob ein Termin auf einen Feiertag fällt
    """
    # TODO: Implementiere Feiertagsprüfung wenn LocalHoliday Model verfügbar ist
    # from core.models import LocalHoliday
    
    # check_date = appointment_date.date()
    
    # holiday = LocalHoliday.objects.filter(
    #     bundesland=bundesland,
    #     date=check_date
    # ).first()
    
    # if holiday:
    #     raise ValidationError(
    #         f'Am {check_date} ist ein Feiertag ({holiday.holiday_name}) in {bundesland.name}. '
    #         'An diesem Tag können keine Termine vergeben werden.'
    #     )
    
    # Vorübergehend: Keine Feiertagsprüfung
    pass

def validate_appointment_conflicts(series):
    """Validates conflicts for a series of appointments."""
    from core.models import Appointment, Practice
    conflicts = []
    treatment_duration = series.treatment.duration_minutes

    for i in range(series.total_sessions):
        appointment_start_time = series.start_date + timedelta(days=i * series.interval_days)

        # Prüfe, ob appointment_start_time naiv ist, und mache es dann aware
        if is_naive(appointment_start_time):
            appointment_start_time = make_aware(appointment_start_time, timezone=timezone.utc)

        appointment_end_time = appointment_start_time + timedelta(minutes=treatment_duration)

        # Überprüfe Feiertage
        practice = Practice.objects.first()
        if practice:
            try:
                validate_holiday(
                    appointment_start_time, 
                    practice.bundesland
                )
            except ValidationError as e:
                conflicts.append({
                    'session': i + 1,
                    'date': appointment_start_time,
                    'reason': str(e)
                })
                continue

        # Überprüfe Behandler-Konflikte
        practitioner_conflicts = Appointment.objects.filter(
            practitioner=series.practitioner,
            appointment_date__lt=appointment_end_time,
            appointment_date__gt=appointment_start_time - timedelta(minutes=treatment_duration)
        )

        if practitioner_conflicts.exists():
            conflicts.append({
                'session': i + 1,
                'date': appointment_start_time,
                'conflicting_appointments': list(practitioner_conflicts),
                'reason': 'Der Behandler hat bereits einen Termin in diesem Zeitraum'
            })
            continue

        # Überprüfe Raum-Konflikte
        room_conflicts = Appointment.objects.filter(
            room=series.room,
            appointment_date__lt=appointment_end_time,
            appointment_date__gt=appointment_start_time - timedelta(minutes=treatment_duration)
        )

        if room_conflicts.exists():
            conflicts.append({
                'session': i + 1,
                'date': appointment_start_time,
                'conflicting_appointments': list(room_conflicts),
                'reason': 'Der Raum ist in diesem Zeitraum bereits belegt'
            })

    if conflicts:
        conflict_info = '\n'.join([
            f"Session {c['session']} am {c['date']}: {c['reason']}" 
            for c in conflicts
        ])
        raise ValidationError(f"Terminkonflikte gefunden:\n{conflict_info}")

def validate_conflict_for_appointment(appointment_date, duration_minutes, practitioner, room, exclude_id=None):
    """Validates that there are no conflicting appointments."""
    from core.models import Appointment, Practice
    practice = Practice.objects.first()
    
    # Prüfe auf Feiertage
    validate_holiday(appointment_date, practice.bundesland)
    
    end_time = appointment_date + timedelta(minutes=duration_minutes)
    
    # Prüfe auf Überschneidungen für den Behandler
    practitioner_conflicts = Appointment.objects.filter(
        practitioner=practitioner,
        appointment_date__lt=end_time,
        appointment_date__gt=appointment_date - timedelta(minutes=duration_minutes)
    ).exclude(id=exclude_id)
    
    # Prüfe auf Überschneidungen für den Raum
    room_conflicts = Appointment.objects.filter(
        room=room,
        appointment_date__lt=end_time,
        appointment_date__gt=appointment_date - timedelta(minutes=duration_minutes)
    ).exclude(id=exclude_id)
    
    if practitioner_conflicts.exists():
        raise ValidationError('Der Behandler hat bereits einen Termin in diesem Zeitraum')
    
    if room_conflicts.exists():
        raise ValidationError('Der Raum ist in diesem Zeitraum bereits belegt')

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
    from core.models import WorkingHour
    
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