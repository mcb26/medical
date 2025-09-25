import re
from datetime import date, datetime
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.db import models
from decimal import Decimal

# Telefonnummer-Validator
phone_regex = RegexValidator(
    regex=r'^(\+49|0)[0-9\s\-\(\)]{6,20}$',
    message='Telefonnummer muss ein gültiges deutsches Format haben (z.B. +49 123 456789 oder 0123 456789)'
)

# E-Mail-Validator (erweitert)
email_regex = RegexValidator(
    regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    message='E-Mail-Adresse muss ein gültiges Format haben'
)

# PLZ-Validator
postal_code_regex = RegexValidator(
    regex=r'^[0-9]{5}$',
    message='PLZ muss genau 5 Ziffern haben'
)

# Versicherungsnummer-Validator
insurance_number_regex = RegexValidator(
    regex=r'^[A-Z0-9]{10,12}$',
    message='Versicherungsnummer muss 10-12 alphanumerische Zeichen haben'
)

# Steuernummer-Validator
tax_number_regex = RegexValidator(
    regex=r'^[0-9]{10,11}$',
    message='Steuernummer muss 10-11 Ziffern haben'
)

# Institutionskennzeichen-Validator
institution_code_regex = RegexValidator(
    regex=r'^[0-9]{9}$',
    message='Institutionskennzeichen muss genau 9 Ziffern haben'
)

# Hex-Farben-Validator
hex_color_regex = RegexValidator(
    regex=r'^#[0-9A-Fa-f]{6}$',
    message='Hex-Farbe muss im Format #RRGGBB sein'
)

def validate_future_date(value):
    """Validiert, dass ein Datum in der Zukunft liegt"""
    if value and value <= timezone.now().date():
        raise ValidationError('Datum muss in der Zukunft liegen.')

def validate_past_date(value):
    """Validiert, dass ein Datum in der Vergangenheit liegt"""
    if value and value >= timezone.now().date():
        raise ValidationError('Datum muss in der Vergangenheit liegen.')

def validate_date_range(start_date, end_date):
    """Validiert, dass ein Datumsbereich gültig ist"""
    if start_date and end_date and start_date >= end_date:
        raise ValidationError('Enddatum muss nach dem Startdatum liegen.')

def validate_time_range(start_time, end_time):
    """Validiert, dass ein Zeitbereich gültig ist"""
    if start_time and end_time and start_time >= end_time:
        raise ValidationError('Endzeit muss nach der Startzeit liegen.')

def validate_decimal_range(value, min_value=Decimal('0.00'), max_value=Decimal('999999.99')):
    """Validiert einen Dezimalwert innerhalb eines Bereichs"""
    if value < min_value or value > max_value:
        raise ValidationError(f'Wert muss zwischen {min_value} und {max_value} liegen.')

def validate_percentage(value):
    """Validiert einen Prozentwert (0-100)"""
    if value < 0 or value > 100:
        raise ValidationError('Prozentwert muss zwischen 0 und 100 liegen.')

def validate_duration_minutes(value):
    """Validiert eine Dauer in Minuten"""
    if value < 5 or value > 480:  # 5 Minuten bis 8 Stunden
        raise ValidationError('Dauer muss zwischen 5 und 480 Minuten liegen.')

def validate_appointment_duration(value):
    """Validiert die Dauer eines Termins"""
    if value < 15 or value > 240:  # 15 Minuten bis 4 Stunden
        raise ValidationError('Termindauer muss zwischen 15 und 240 Minuten liegen.')

def validate_patient_age(birth_date):
    """Validiert das Alter eines Patienten"""
    if birth_date:
        age = (timezone.now().date() - birth_date).days // 365
        if age < 0 or age > 120:
            raise ValidationError('Alter muss zwischen 0 und 120 Jahren liegen.')

def validate_insurance_validity(valid_from, valid_to=None):
    """Validiert die Gültigkeit einer Versicherung"""
    if valid_from and valid_from > timezone.now().date():
        raise ValidationError('Versicherungsbeginn kann nicht in der Zukunft liegen.')
    
    if valid_to and valid_to < valid_from:
        raise ValidationError('Versicherungsende muss nach dem Beginn liegen.')

def validate_prescription_dates(prescription_date, valid_from, valid_until):
    """Validiert die Daten einer Verordnung"""
    if prescription_date and prescription_date > timezone.now().date():
        raise ValidationError('Ausstellungsdatum kann nicht in der Zukunft liegen.')
    
    if valid_from and valid_from < prescription_date:
        raise ValidationError('Gültigkeitsbeginn kann nicht vor dem Ausstellungsdatum liegen.')
    
    if valid_until and valid_until < valid_from:
        raise ValidationError('Gültigkeitsende muss nach dem Beginn liegen.')

def validate_billing_amount(amount):
    """Validiert einen Abrechnungsbetrag"""
    if amount < Decimal('0.00') or amount > Decimal('99999.99'):
        raise ValidationError('Abrechnungsbetrag muss zwischen 0,00 und 99.999,99 € liegen.')

def validate_working_hours(start_time, end_time, day_of_week):
    """Validiert Arbeitszeiten"""
    if start_time and end_time:
        if start_time >= end_time:
            raise ValidationError('Arbeitsende muss nach Arbeitsbeginn liegen.')
        
        # Prüfe auf Überschneidungen mit anderen Arbeitszeiten
        from core.models import WorkingHour
        overlapping = WorkingHour.objects.filter(
            day_of_week=day_of_week,
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        
        if overlapping.exists():
            raise ValidationError('Arbeitszeiten überschneiden sich mit bestehenden Zeiten.')

def validate_room_availability(room, start_time, end_time, appointment_id=None):
    """Validiert die Verfügbarkeit eines Raums"""
    from core.models import Appointment
    
    conflicting_appointments = Appointment.objects.filter(
        room=room,
        appointment_date__lt=end_time,
        appointment_date__gte=start_time
    )
    
    if appointment_id:
        conflicting_appointments = conflicting_appointments.exclude(id=appointment_id)
    
    if conflicting_appointments.exists():
        raise ValidationError('Raum ist zu diesem Zeitpunkt bereits belegt.')

def validate_practitioner_availability(practitioner, start_time, end_time, appointment_id=None):
    """Validiert die Verfügbarkeit eines Behandlers"""
    from core.models import Appointment
    
    conflicting_appointments = Appointment.objects.filter(
        practitioner=practitioner,
        appointment_date__lt=end_time,
        appointment_date__gte=start_time
    )
    
    if appointment_id:
        conflicting_appointments = conflicting_appointments.exclude(id=appointment_id)
    
    if conflicting_appointments.exists():
        raise ValidationError('Behandler ist zu diesem Zeitpunkt bereits belegt.')

def validate_patient_insurance_overlap(patient, valid_from, valid_to, insurance_id=None):
    """Validiert Überschneidungen von Patientenversicherungen"""
    from core.models import PatientInsurance
    
    overlapping = PatientInsurance.objects.filter(
        patient=patient,
        valid_from__lt=valid_to or date.max,
        valid_to__gt=valid_from
    )
    
    if insurance_id:
        overlapping = overlapping.exclude(id=insurance_id)
    
    if overlapping.exists():
        raise ValidationError('Es existiert bereits eine Versicherung für diesen Zeitraum.')

def validate_treatment_legs_codes(treatment):
    """Validiert LE-GO-Codes für Behandlungen"""
    if treatment.legs_codes:
        # Prüfe Format der LE-GO-Codes
        for code in treatment.legs_codes:
            if not re.match(r'^[0-9]{1,2}\.[0-9]{1,2}$', code):
                raise ValidationError(f'Ungültiger LE-GO-Code: {code}. Format muss XX.XX sein.')

def validate_icd_code(icd_code):
    """Validiert ICD-Codes"""
    if icd_code:
        # Prüfe Format der ICD-Codes
        if not re.match(r'^[A-Z][0-9]{2}\.[0-9X]$', icd_code):
            raise ValidationError(f'Ungültiger ICD-Code: {icd_code}. Format muss X00.0 sein.')

def validate_user_permissions(user, required_permissions):
    """Validiert Benutzerberechtigungen"""
    if not user.is_authenticated:
        raise ValidationError('Benutzer muss angemeldet sein.')
    
    for permission in required_permissions:
        if not user.has_perm(permission):
            raise ValidationError(f'Benutzer hat nicht die erforderliche Berechtigung: {permission}')

def validate_data_integrity():
    """Validiert die Datenintegrität des gesamten Systems"""
    from core.models import Appointment, Prescription, PatientInsurance, BillingItem
    
    errors = []
    
    # Prüfe Termine ohne gültige Verordnung
    appointments_without_prescription = Appointment.objects.filter(
        prescription__isnull=True,
        treatment__is_self_pay=False
    )
    if appointments_without_prescription.exists():
        errors.append(f'{appointments_without_prescription.count()} Termine ohne gültige Verordnung gefunden.')
    
    # Prüfe abgelaufene Versicherungen
    expired_insurances = PatientInsurance.objects.filter(
        valid_to__lt=timezone.now().date(),
        valid_to__isnull=False
    )
    if expired_insurances.exists():
        errors.append(f'{expired_insurances.count()} abgelaufene Versicherungen gefunden.')
    
    # Prüfe doppelte Abrechnungen
    duplicate_billing = BillingItem.objects.values('appointment').annotate(
        count=models.Count('id')
    ).filter(count__gt=1)
    if duplicate_billing.exists():
        errors.append(f'{duplicate_billing.count()} doppelte Abrechnungen gefunden.')
    
    if errors:
        raise ValidationError('Datenintegritätsfehler: ' + '; '.join(errors))

# Custom Field Validators
class PhoneNumberField(models.CharField):
    """Custom Feld für Telefonnummern mit Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [phone_regex] + kwargs.get('validators', [])
        super().__init__(*args, **kwargs)

class EmailField(models.EmailField):
    """Custom Feld für E-Mail-Adressen mit erweiterter Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [email_regex] + kwargs.get('validators', [])
        super().__init__(*args, **kwargs)

class PostalCodeField(models.CharField):
    """Custom Feld für PLZ mit Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [postal_code_regex] + kwargs.get('validators', [])
        kwargs['max_length'] = 5
        super().__init__(*args, **kwargs)

class InsuranceNumberField(models.CharField):
    """Custom Feld für Versicherungsnummern mit Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [insurance_number_regex] + kwargs.get('validators', [])
        super().__init__(*args, **kwargs)

class TaxNumberField(models.CharField):
    """Custom Feld für Steuernummern mit Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [tax_number_regex] + kwargs.get('validators', [])
        super().__init__(*args, **kwargs)

class InstitutionCodeField(models.CharField):
    """Custom Feld für Institutionskennzeichen mit Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [institution_code_regex] + kwargs.get('validators', [])
        kwargs['max_length'] = 9
        super().__init__(*args, **kwargs)

class HexColorField(models.CharField):
    """Custom Feld für Hex-Farben mit Validierung"""
    def __init__(self, *args, **kwargs):
        kwargs['validators'] = [hex_color_regex] + kwargs.get('validators', [])
        kwargs['max_length'] = 7
        super().__init__(*args, **kwargs)
