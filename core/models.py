from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.timezone import now, make_aware
from datetime import datetime, date, timedelta
from django.db.models import Q, Sum
from django.conf import settings
from core.appointment_validators import (
    validate_conflict_for_appointment,
    validate_appointment_conflicts,
    validate_working_hours
)
from .validators import (
    phone_regex, email_regex, postal_code_regex, insurance_number_regex,
    tax_number_regex, institution_code_regex, hex_color_regex,
    validate_future_date, validate_past_date, validate_date_range,
    validate_time_range, validate_decimal_range, validate_percentage,
    validate_duration_minutes, validate_appointment_duration,
    validate_patient_age, validate_insurance_validity,
    validate_prescription_dates, validate_billing_amount,
    validate_working_hours as validate_working_hours_custom,
    validate_room_availability, validate_practitioner_availability,
    validate_patient_insurance_overlap, validate_treatment_legs_codes,
    validate_icd_code, PhoneNumberField, EmailField, PostalCodeField,
    InsuranceNumberField, TaxNumberField, InstitutionCodeField, HexColorField
)




# Bundesland Model
class Bundesland(models.Model):
    name = models.CharField(max_length=100)
    abbreviation = models.CharField(max_length=5, unique=True)

    def __str__(self):
        return self.name

# CalendarSettings Model
class CalendarSettings(models.Model):
    display_start = models.TimeField(default="07:00:00")
    display_end = models.TimeField(default="19:00:00")
    weekends = models.BooleanField(default=True)
    default_view = models.CharField(
        max_length=20,
        choices=[
            ('dayGridMonth', 'Month View'),
            ('timeGridWeek', 'Week View'),
            ('timeGridDay', 'Day View')
        ],
        default='dayGridMonth'
    )
    
    # Therapie-Einstellungen
    default_session_duration = models.IntegerField(default=30, verbose_name="Standard Behandlungsdauer (Minuten)")
    break_between_sessions = models.IntegerField(default=15, verbose_name="Pause zwischen Terminen (Minuten)")
    max_appointments_per_day = models.IntegerField(default=20, verbose_name="Maximale Termine pro Tag")

    def __str__(self):
        return f"Calendar Settings"

    # Erzwinge Singleton-Verhalten
    def save(self, *args, **kwargs):
        if not self.pk and CalendarSettings.objects.exists():
            raise ValidationError('Es kann nur eine Kalender-Einstellung geben.')
        super().save(*args, **kwargs)

# ICDCode Model
class ICDCode(models.Model):
    code = models.CharField(max_length=10, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subcodes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "ICD-11 Code"
        verbose_name_plural = "ICD-11 Codes"
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.title}"

# Benutzerrollen
class UserRole(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Inhaber'),
        ('admin', 'Administrator'),
        ('doctor', 'Arzt'),
        ('nurse', 'Krankenschwester'),
        ('receptionist', 'Empfang'),
        ('accountant', 'Buchhalter'),
        ('assistant', 'Assistent'),
        ('intern', 'Praktikant'),
    ]
    
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict)  # Speichert Modul-Berechtigungen
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Benutzerrolle"
        verbose_name_plural = "Benutzerrollen"

    def __str__(self):
        return self.get_name_display()

# Modul-Berechtigungen
class ModulePermission(models.Model):
    PERMISSION_CHOICES = [
        ('none', 'Kein Zugriff'),
        ('read', 'Nur Lesen'),
        ('create', 'Erstellen'),
        ('update', 'Bearbeiten'),
        ('delete', 'Löschen'),
        ('full', 'Voller Zugriff'),
    ]
    
    MODULE_CHOICES = [
        ('appointments', 'Terminkalender'),
        ('patients', 'Patienten'),
        ('prescriptions', 'Verordnungen'),
        ('treatments', 'Heilmittel'),
        ('reports', 'Berichte'),
        ('finance', 'Finanzen'),
        ('billing', 'Abrechnung'),
        ('settings', 'Einstellungen'),
        ('users', 'Benutzerverwaltung'),
    ]
    
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='module_permissions', verbose_name="Benutzer")
    module = models.CharField(max_length=20, choices=MODULE_CHOICES, verbose_name="Modul")
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='none', verbose_name="Berechtigung")
    granted_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_permissions', verbose_name="Erteilt von")
    granted_at = models.DateTimeField(auto_now_add=True, verbose_name="Erteilt am")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Gültig bis")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    
    class Meta:
        verbose_name = "Modul-Berechtigung"
        verbose_name_plural = "Modul-Berechtigungen"
        unique_together = ('user', 'module')
        ordering = ['user', 'module']

    def __str__(self):
        return f"{self.user.username} - {self.get_module_display()} - {self.get_permission_display()}"
    
    def is_expired(self):
        """Prüft ob die Berechtigung abgelaufen ist"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def is_valid(self):
        """Prüft ob die Berechtigung gültig ist"""
        return self.is_active and not self.is_expired()
    
    def has_permission(self, required_permission):
        """Prüft ob der Benutzer die erforderliche Berechtigung hat"""
        if not self.is_valid():
            return False
            
        permission_hierarchy = {
            'none': 0,
            'read': 1,
            'create': 2,
            'update': 3,
            'delete': 4,
            'full': 5
        }
        
        current_level = permission_hierarchy.get(self.permission, 0)
        required_level = permission_hierarchy.get(required_permission, 0)
        
        return current_level >= required_level

# Erweitere das User-Model
class User(AbstractUser):
    # Theme-Einstellungen
    theme_mode = models.CharField(
        max_length=20,
        choices=[
            ('light', 'Hell'),
            ('dark', 'Dunkel'),
            ('auto', 'Automatisch')
        ],
        default='light',
        verbose_name="Theme-Modus"
    )
    theme_accent_color = models.CharField(
        max_length=7,  # Hex-Farbe (#RRGGBB)
        default='#3b82f6',
        verbose_name="Akzentfarbe"
    )
    theme_font_size = models.CharField(
        max_length=20,
        choices=[
            ('small', 'Klein'),
            ('medium', 'Mittel'),
            ('large', 'Groß')
        ],
        default='medium',
        verbose_name="Schriftgröße"
    )
    theme_compact_mode = models.BooleanField(
        default=False,
        verbose_name="Kompakter Modus"
    )
    
    # Neue Felder für Rollen und Berechtigungen
    role = models.ForeignKey(UserRole, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Benutzerrolle")
    custom_permissions = models.JSONField(default=dict, verbose_name="Individuelle Berechtigungen")
    is_employee = models.BooleanField(default=False, verbose_name="Mitarbeiter")
    employee_id = models.CharField(max_length=20, blank=True, verbose_name="Mitarbeiter-ID")
    department = models.CharField(max_length=100, blank=True, verbose_name="Abteilung")
    hire_date = models.DateField(null=True, blank=True, verbose_name="Einstellungsdatum")
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Vorgesetzter")
    
    # Admin-Status
    is_admin = models.BooleanField(default=False, verbose_name="Administrator", help_text="Administratoren haben automatisch alle Berechtigungen")
    
    # Therapeut-Status
    is_therapist = models.BooleanField(default=False, verbose_name="Ist Therapeut", help_text="Therapeuten sehen nur ihre eigenen Termine und Patienten")
    
    # Benutzer-Kürzel (nur Admin kann ändern)
    initials = models.CharField(max_length=10, blank=True, verbose_name="Kürzel", help_text="Kürzel für Änderungshistorie (nur Admin kann ändern)")
    
    # Modul-Zugriffe
    can_access_patients = models.BooleanField(default=True, verbose_name="Patienten-Zugriff")
    can_access_appointments = models.BooleanField(default=True, verbose_name="Termine-Zugriff")
    can_access_prescriptions = models.BooleanField(default=True, verbose_name="Verordnungen-Zugriff")
    can_access_treatments = models.BooleanField(default=True, verbose_name="Heilmittel-Zugriff")
    can_access_finance = models.BooleanField(default=False, verbose_name="Finanzen-Zugriff")
    can_access_reports = models.BooleanField(default=False, verbose_name="Berichte-Zugriff")
    can_access_settings = models.BooleanField(default=False, verbose_name="Einstellungen-Zugriff")
    can_manage_users = models.BooleanField(default=False, verbose_name="Benutzerverwaltung")
    can_manage_roles = models.BooleanField(default=False, verbose_name="Rollenverwaltung")
    
    # Audit-Felder
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Letzte Login-IP")
    login_count = models.PositiveIntegerField(default=0, verbose_name="Login-Anzahl")
    is_locked = models.BooleanField(default=False, verbose_name="Konto gesperrt")
    lock_reason = models.TextField(blank=True, verbose_name="Sperrgrund")

    class Meta:
        verbose_name = "Benutzer"
        verbose_name_plural = "Benutzer"

    def save(self, *args, **kwargs):
        """Automatisch is_admin setzen wenn is_superuser True ist"""
        if self.is_superuser:
            self.is_admin = True
        super().save(*args, **kwargs)

    def has_module_permission(self, module_name, required_permission='read'):
        """Prüft ob Benutzer die erforderliche Berechtigung für ein Modul hat"""
        # Admin-Override: Admins haben alle Rechte
        if self.is_superuser or self.is_admin:
            return True
            
        # Prüfe individuelle Modul-Berechtigungen
        try:
            module_perm = self.module_permissions.get(module=module_name, is_active=True)
            if module_perm and module_perm.is_valid():
                return module_perm.has_permission(required_permission)
        except ModulePermission.DoesNotExist:
            pass
            
        # Fallback: Prüfe alte Berechtigungsfelder
        if hasattr(self, f'can_access_{module_name}'):
            return getattr(self, f'can_access_{module_name}', False)
            
        # Fallback: Prüfe Rollen-Berechtigungen
        if self.role and self.role.permissions:
            return self.role.permissions.get(module_name, False)
            
        return False

    def get_effective_permissions(self):
        """Gibt alle effektiven Berechtigungen zurück"""
        permissions = {}
        
        # Alle verfügbaren Module
        module_choices = ModulePermission.MODULE_CHOICES
        
        for module_code, module_name in module_choices:
            # Bestimme das höchste Berechtigungslevel
            permission_level = 'none'
            if self.has_module_permission(module_code, 'full'):
                permission_level = 'full'
            elif self.has_module_permission(module_code, 'delete'):
                permission_level = 'delete'
            elif self.has_module_permission(module_code, 'update'):
                permission_level = 'update'
            elif self.has_module_permission(module_code, 'create'):
                permission_level = 'create'
            elif self.has_module_permission(module_code, 'read'):
                permission_level = 'read'
            
            permissions[module_code] = {
                'permission': permission_level,
                'name': module_name
            }
            
        return permissions
    
    def get_module_permission_level(self, module_name):
        """Gibt das Berechtigungslevel für ein Modul zurück"""
        if self.is_superuser or self.is_admin:
            return 'full'
            
        try:
            module_perm = self.module_permissions.get(module=module_name, is_active=True)
            if module_perm and module_perm.is_valid():
                return module_perm.permission
        except ModulePermission.DoesNotExist:
            pass
            
        return 'none'
    
    def grant_module_permission(self, module_name, permission_level, granted_by=None, expires_at=None):
        """Erteilt eine Modul-Berechtigung"""
        module_perm, created = ModulePermission.objects.get_or_create(
            user=self,
            module=module_name,
            defaults={
                'permission': permission_level,
                'granted_by': granted_by,
                'expires_at': expires_at,
                'is_active': True
            }
        )
        
        if not created:
            module_perm.permission = permission_level
            module_perm.granted_by = granted_by
            module_perm.expires_at = expires_at
            module_perm.is_active = True
            module_perm.save()
        
        return module_perm
    
    def revoke_module_permission(self, module_name):
        """Entzieht eine Modul-Berechtigung"""
        try:
            module_perm = self.module_permissions.get(module=module_name)
            module_perm.is_active = False
            module_perm.save()
            return True
        except ModulePermission.DoesNotExist:
            return False

# Audit-Log für Benutzeraktivitäten
class UserActivityLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Erstellt'),
        ('update', 'Aktualisiert'),
        ('delete', 'Gelöscht'),
        ('view', 'Angesehen'),
        ('export', 'Exportiert'),
        ('import', 'Importiert'),
        ('permission_change', 'Berechtigung geändert'),
        ('role_change', 'Rolle geändert'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Benutzer")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="Aktion")
    module = models.CharField(max_length=50, verbose_name="Modul")
    object_type = models.CharField(max_length=50, blank=True, verbose_name="Objekt-Typ")
    object_id = models.CharField(max_length=50, blank=True, verbose_name="Objekt-ID")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP-Adresse")
    user_agent = models.TextField(blank=True, verbose_name="User-Agent")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Zeitstempel")
    
    class Meta:
        verbose_name = "Benutzeraktivität"
        verbose_name_plural = "Benutzeraktivitäten"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp}"

# InsuranceProviderGroup Model
class InsuranceProviderGroup(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# InsuranceProvider Model
class InsuranceProvider(models.Model):
    name = models.CharField(max_length=255)
    provider_id = models.CharField(max_length=100, unique=True)
    group = models.ForeignKey(InsuranceProviderGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name='providers')
    address = models.CharField(max_length=255, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    contact_person = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Patient Model
class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    dob = models.DateField()
    gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')], default='Other')
    email = EmailField(max_length=255, verbose_name="Primäre E-Mail", help_text="Hauptkontakt-E-Mail des Patienten")
    phone_number = PhoneNumberField(max_length=20, verbose_name="Primäre Telefonnummer", help_text="Hauptkontaktnummer des Patienten")
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = PostalCodeField()
    country = models.CharField(max_length=100)
    medical_history = models.TextField(null=True, blank=True)
    allergies = models.TextField(null=True, blank=True)
    receive_notifications = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        """Gibt den vollständigen Namen des Patienten zurück"""
        return f"{self.first_name} {self.last_name}"

    @property
    def primary_contacts(self):
        """Gibt alle primären Kontakte nach Typ zurück"""
        return self.contacts.filter(is_primary=True)

    def get_contacts_by_type(self, contact_type):
        """Gibt alle Kontakte eines bestimmten Typs zurück"""
        return self.contacts.filter(contact_type=contact_type)

    def add_contact(self, **contact_data):
        """Fügt einen neuen Kontakt hinzu"""
        contact_type = contact_data.get('contact_type')
        
        # Wenn es der erste Kontakt dieses Typs ist, als primär setzen
        if not self.contacts.filter(contact_type=contact_type).exists():
            contact_data['is_primary'] = True
            
        return self.contacts.create(**contact_data)

    def get_all_phone_numbers(self):
        """Gibt alle Telefonnummern mit Typ zurück"""
        return [
            {
                'type': contact.get_contact_type_display(),
                'number': contact.phone_number,
                'is_primary': contact.is_primary
            }
            for contact in self.contacts.exclude(phone_number__isnull=True)
        ]

    def get_all_emails(self):
        """Gibt alle E-Mail-Adressen mit Typ zurück"""
        return [
            {
                'type': contact.get_contact_type_display(),
                'email': contact.email,
                'is_primary': contact.is_primary
            }
            for contact in self.contacts.exclude(email__isnull=True)
        ]

# PatientInsurance Model
class PatientInsurance(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='insurances')
    insurance_provider = models.ForeignKey(InsuranceProvider, on_delete=models.SET_NULL, null=True, blank=True)
    insurance_number = models.CharField(max_length=100, null=True, blank=True)
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)
    is_private = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=models.F('valid_from'))),
                name='valid_date_range'
            )
        ]

    def clean(self):
        # Prüfen auf zeitliche Überschneidungen mit anderen Versicherungen des Patienten
        overlapping = PatientInsurance.objects.filter(
            patient=self.patient,
            valid_from__lte=self.valid_to or date.max,  # Wenn valid_to None ist, nutze max date
        ).exclude(id=self.id)  # Ausschließen der aktuellen Instance bei Updates
        
        if self.valid_from:
            overlapping = overlapping.filter(
                (models.Q(valid_to__isnull=True) | models.Q(valid_to__gte=self.valid_from))  # In Klammern gesetzt
            )
        
        if overlapping.exists():
            raise ValidationError(
                'Es existiert bereits eine Versicherung für diesen Zeitraum.'
            )

    def __str__(self):
        return f"{self.patient} - {self.insurance_provider} ({self.valid_from} to {self.valid_to or 'ongoing'})"

    def is_valid(self, check_date=None):
        """Prüft ob die Krankenkasse zu einem bestimmten Datum gültig ist"""
        if check_date is None:
            check_date = timezone.now().date()
        
        # Prüfe Startdatum
        if self.valid_from > check_date:
            return False
        
        # Prüfe Enddatum (falls gesetzt)
        if self.valid_to and self.valid_to < check_date:
            return False
        
        return True

    @classmethod
    def get_valid_insurance(cls, patient, date):
        """Findet die gültige Versicherung für einen Patienten zu einem bestimmten Datum"""
        return cls.objects.filter(
            patient=patient,
            valid_from__lte=date,
        ).filter(
            (models.Q(valid_to__isnull=True) | models.Q(valid_to__gte=date))  # In Klammern gesetzt
        ).first()

# Emergency Contact Model
class EmergencyContact(models.Model):
    patient = models.ForeignKey(Patient, related_name='emergency_contacts', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20)
    phone_number2 = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.relationship})"

# DSGVO: Einwilligungen zur Datenverarbeitung
class DataProtectionConsent(models.Model):
    patient = models.ForeignKey('Patient', related_name='data_consents', on_delete=models.CASCADE, verbose_name="Patient")
    consent_given = models.BooleanField(default=False, verbose_name="Einwilligung erteilt")
    consent_text_version = models.CharField(max_length=50, verbose_name="Textversion")
    consent_text = models.TextField(verbose_name="Einwilligungstext")
    consent_date = models.DateTimeField(auto_now_add=True, verbose_name="Einwilligungsdatum")
    revoked = models.BooleanField(default=False, verbose_name="Widerrufen")
    revoked_at = models.DateTimeField(null=True, blank=True, verbose_name="Widerrufsdatum")
    valid_until = models.DateTimeField(null=True, blank=True, verbose_name="Gültig bis")

    class Meta:
        verbose_name = "Datenschutzeinwilligung"
        verbose_name_plural = "Datenschutzeinwilligungen"
        ordering = ['-consent_date']

    def __str__(self):
        status = "Widerrufen" if self.revoked else ("Erteilt" if self.consent_given else "Nicht erteilt")
        return f"{self.patient} – {status} (v{self.consent_text_version})"

    def is_active(self):
        if self.revoked:
            return False
        if not self.consent_given:
            return False
        if self.valid_until and timezone.now() > self.valid_until:
            return False
        return True

# Behandlungstypen für verschiedene Abrechnungsarten
class TreatmentType(models.Model):
    TREATMENT_TYPE_CHOICES = [
        ('gkv', 'GKV/LEGS'),
        ('private', 'Privatleistung'),
        ('self_pay', 'Selbstzahler'),
        ('mixed', 'Gemischt (GKV + Privat)'),
    ]
    
    name = models.CharField(max_length=50, verbose_name="Behandlungstyp")
    type_code = models.CharField(max_length=20, choices=TREATMENT_TYPE_CHOICES, verbose_name="Typ-Code")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Behandlungstyp"
        verbose_name_plural = "Behandlungstypen"
        ordering = ['name']

    def __str__(self):
        return self.name

# Preislisten für verschiedene Zeiträume
class PriceList(models.Model):
    name = models.CharField(max_length=100, verbose_name="Preislistenname")
    treatment_type = models.ForeignKey(TreatmentType, on_delete=models.CASCADE, verbose_name="Behandlungstyp")
    valid_from = models.DateField(verbose_name="Gültig ab")
    valid_until = models.DateField(null=True, blank=True, verbose_name="Gültig bis")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Preisliste"
        verbose_name_plural = "Preislisten"
        ordering = ['-valid_from', 'name']

    def __str__(self):
        return f"{self.name} ({self.valid_from} - {self.valid_until or 'unbegrenzt'})"

    def is_valid_on_date(self, date):
        """Prüft ob die Preisliste an einem bestimmten Datum gültig ist"""
        if date < self.valid_from:
            return False
        if self.valid_until and date > self.valid_until:
            return False
        return True

# Doctor Model
class Doctor(models.Model):
    practicename = models.CharField(max_length=100, null=True)
    title = models.CharField(max_length=100, null=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    specializations = models.ManyToManyField('Specialization', related_name='doctors')
    email = models.EmailField(max_length=255)
    phone_number = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name}"

# Room Model
class Room(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_home_visit = models.BooleanField(default=False)
    opening_hours = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    practice = models.ForeignKey(
        'Practice',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        default=None,
        related_name='rooms'
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Raum"
        verbose_name_plural = "Räume"
        ordering = ['name']

    def save(self, *args, **kwargs):
        # Standard-Öffnungszeiten setzen
        default_hours = {
            'monday': {'open': True, 'hours': '07:00-19:00'},
            'tuesday': {'open': True, 'hours': '07:00-19:00'},
            'wednesday': {'open': True, 'hours': '07:00-19:00'},
            'thursday': {'open': True, 'hours': '07:00-19:00'},
            'friday': {'open': True, 'hours': '07:00-19:00'},
            'saturday': {'open': False, 'hours': ''},
            'sunday': {'open': False, 'hours': ''}
        }
        
        if not self.opening_hours:
            self.opening_hours = default_hours

        if not self.is_home_visit:
            # Validierung der Raumzeiten gegen Praxisöffnungszeiten
            practice = Practice.objects.first()
            if practice:
                for day, room_settings in self.opening_hours.items():
                    if room_settings.get('open'):
                        practice_settings = practice.opening_hours.get(day, {})
                        if practice_settings.get('open'):
                            room_hours = room_settings.get('hours', '')
                            practice_hours = practice_settings.get('hours', '')
                            
                            if not room_hours or not practice_hours:
                                continue
                                
                            room_start, room_end = room_hours.split('-')
                            practice_start, practice_end = practice_hours.split('-')
                            
                            if room_start < practice_start or room_end > practice_end:
                                raise ValidationError(
                                    f"Die Raumöffnungszeiten für {day} müssen innerhalb der "
                                    f"Praxisöffnungszeiten ({practice_hours}) liegen."
                                )

        super().save(*args, **kwargs)

    def is_available_at(self, datetime_to_check):
        """Prüft ob der Raum zu einem bestimmten Zeitpunkt verfügbar ist"""
        if self.is_home_visit:
            return True
            
        day = datetime_to_check.strftime('%A').lower()
        time = datetime_to_check.strftime('%H:%M')
        
        day_settings = self.opening_hours.get(day, {'open': False, 'hours': ''})
        if not day_settings.get('open'):
            return False
            
        hours = day_settings.get('hours', '')
        if not hours:
            return False
            
        start, end = hours.split('-')
        return start <= time <= end

# Practitioner Model
class Practitioner(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, null=True, blank=True)  # Optional gemacht
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']
        verbose_name = "Behandler"
        verbose_name_plural = "Behandler"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

# Specialization Model
class Specialization(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# PracticeSettings Model
class PracticeSettings(models.Model):
    practice_name = models.CharField(max_length=255)
    practice_logo = models.ImageField(upload_to='practice_logos/', null=True, blank=True)
    license_number = models.CharField(max_length=100)
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=255)
    website = models.URLField(max_length=255, null=True, blank=True)

    # Erzwinge Singleton-Verhalten
    def save(self, *args, **kwargs):
        if not self.pk and PracticeSettings.objects.exists():
            raise ValidationError('Es kann nur eine Praxis-Einstellung geben.')
        super().save(*args, **kwargs)
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    days_open = models.CharField(max_length=100)
    
    # Benachrichtigungseinstellungen
    email_notifications = models.BooleanField(default=True, verbose_name="E-Mail-Benachrichtigungen")
    sms_notifications = models.BooleanField(default=False, verbose_name="SMS-Benachrichtigungen")
    reminder_days_before = models.IntegerField(default=1, verbose_name="Erinnerung vor Termin (Tage)")
    
    # Abrechnungseinstellungen
    auto_billing = models.BooleanField(default=False, verbose_name="Automatische Rechnungserstellung")
    billing_cycle_days = models.IntegerField(default=30, verbose_name="Abrechnungszyklus (Tage)")
    default_payment_terms = models.IntegerField(default=14, verbose_name="Standard-Zahlungsziel (Tage)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.practice_name

# Category Model
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Treatment Model (geändert von TreatmentCatalog)
class Treatment(models.Model):
    position_number = models.CharField(max_length=20, null=True, blank=True)
    treatment_name = models.CharField(max_length=100)
    description = models.TextField()
    duration_minutes = models.IntegerField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    
    # LEGS-Code Integration für GKV-Abrechnung
    legs_code = models.CharField(
        max_length=10, 
        null=True, 
        blank=True,
        verbose_name="LEGS-Code",
        help_text="Leistungserbringergruppenschlüssel (AC.TK) für GKV-Abrechnung"
    )
    accounting_code = models.CharField(
        max_length=3, 
        null=True, 
        blank=True,
        verbose_name="Abrechnungscode (AC)",
        help_text="3-stelliger Abrechnungscode für die spezifische Leistung"
    )
    tariff_indicator = models.CharField(
        max_length=2, 
        null=True, 
        blank=True,
        verbose_name="Tarifkennzeichen (TK)",
        help_text="2-stelliges Tarifkennzeichen für die Vergütungshöhe"
    )
    
    # Verordnungsartkennzeichnung
    prescription_type_indicator = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        verbose_name="Verordnungsartkennzeichnung",
        help_text="z.B. 'VKZ 10' für nachträglich abgegebene Leistungen"
    )
    
    # Telemedizin-Flag
    is_telemedicine = models.BooleanField(
        default=False,
        verbose_name="Telemedizinische Leistung",
        help_text="Gibt an, ob es sich um eine telemedizinische Leistung handelt"
    )
    
    is_self_pay = models.BooleanField(default=False, verbose_name="Selbstzahler-Behandlung")
    self_pay_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Selbstzahler-Preis",
        help_text="Preis für Selbstzahler-Behandlungen (ohne Verordnung)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Wenn es eine Selbstzahler-Behandlung ist, muss ein Preis angegeben werden
        if self.is_self_pay and not self.self_pay_price:
            raise ValidationError("Für Selbstzahler-Behandlungen muss ein Preis angegeben werden.")
        
        # Dauer muss positiv sein
        if self.duration_minutes <= 0:
            raise ValidationError("Die Behandlungsdauer muss größer als 0 sein.")
        
        # LEGS-Code Validierung
        if self.accounting_code and self.tariff_indicator:
            # Automatisch LEGS-Code generieren
            self.legs_code = f"{self.accounting_code}.{self.tariff_indicator}"
        
        # Validierung der LEGS-Code Komponenten
        if self.accounting_code and len(self.accounting_code) != 3:
            raise ValidationError("Der Abrechnungscode (AC) muss genau 3 Stellen haben.")
        
        if self.tariff_indicator and len(self.tariff_indicator) != 2:
            raise ValidationError("Das Tarifkennzeichen (TK) muss genau 2 Stellen haben.")
        
        # Validierung des vollständigen LEGS-Codes
        if self.legs_code and not self.legs_code.count('.') == 1:
            raise ValidationError("Der LEGS-Code muss im Format 'AC.TK' sein (z.B. '123.45').")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.treatment_name} ({self.duration_minutes} Min.)"

    class Meta:
        verbose_name = "Behandlung"
        verbose_name_plural = "Behandlungen"
        ordering = ['treatment_name']

    def get_price_for_insurance_group(self, insurance_group):
        """Gibt den Preis für eine bestimmte Versicherungsgruppe zurück"""
        try:
            surcharge = Surcharge.objects.get(
                treatment=self,
                insurance_provider_group=insurance_group,
                valid_from__lte=timezone.now().date(),
                valid_until__gte=timezone.now().date()
            )
            return {
                'insurance_amount': surcharge.insurance_payment,
                'patient_copay': surcharge.patient_payment
            }
        except Surcharge.DoesNotExist:
            return None

    def get_self_pay_price(self):
        """Gibt den Selbstzahler-Preis zurück"""
        if self.is_self_pay and self.self_pay_price:
            return self.self_pay_price
        return None
    
    def get_legs_code_display(self):
        """Gibt den formatierten LEGS-Code für die Anzeige zurück"""
        if self.legs_code:
            return self.legs_code
        elif self.accounting_code and self.tariff_indicator:
            return f"{self.accounting_code}.{self.tariff_indicator}"
        return "Nicht definiert"
    
    def is_gkv_billable(self):
        """Prüft ob die Behandlung für GKV-Abrechnung geeignet ist"""
        return bool(self.legs_code or (self.accounting_code and self.tariff_indicator))
    
    def get_billing_info(self):
        """Gibt alle Abrechnungsinformationen zurück"""
        return {
            'legs_code': self.get_legs_code_display(),
            'accounting_code': self.accounting_code,
            'tariff_indicator': self.tariff_indicator,
            'prescription_type': self.prescription_type_indicator,
            'is_telemedicine': self.is_telemedicine,
            'is_gkv_billable': self.is_gkv_billable(),
            'is_self_pay': self.is_self_pay,
            'self_pay_price': self.self_pay_price
        }

# Preise für Behandlungen mit zeitlicher Gültigkeit
class TreatmentPrice(models.Model):
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name='prices', verbose_name="Behandlung")
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, verbose_name="Preisliste")
    
    # GKV/LEGS Preise
    gkv_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="GKV-Preis (€)",
        help_text="Preis nach GKV-Vergütung"
    )
    copayment_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Zuzahlung (€)",
        help_text="Zuzahlungsbetrag des Patienten"
    )
    
    # Privatleistung Preise
    private_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Privatpreis (€)",
        help_text="Preis für Privatleistungen"
    )
    
    # Selbstzahler Preise
    self_pay_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Selbstzahler-Preis (€)",
        help_text="Preis für Selbstzahler"
    )
    
    # Zusätzliche Informationen
    notes = models.TextField(blank=True, verbose_name="Notizen")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Behandlungspreis"
        verbose_name_plural = "Behandlungspreise"
        ordering = ['treatment__treatment_name', '-price_list__valid_from']
        unique_together = ['treatment', 'price_list']

    def __str__(self):
        return f"{self.treatment.treatment_name} - {self.price_list.name}"

    def get_price_for_type(self, price_type):
        """Gibt den Preis für einen bestimmten Typ zurück"""
        if price_type == 'gkv':
            return self.gkv_price
        elif price_type == 'private':
            return self.private_price
        elif price_type == 'self_pay':
            return self.self_pay_price
        return None

    def is_valid_on_date(self, date):
        """Prüft ob der Preis an einem bestimmten Datum gültig ist"""
        return self.price_list.is_valid_on_date(date)

# Surcharge Model
class Surcharge(models.Model):
    treatment = models.ForeignKey('Treatment', on_delete=models.CASCADE)
    insurance_provider_group = models.ForeignKey('InsuranceProviderGroup', on_delete=models.CASCADE)
    insurance_payment = models.DecimalField(max_digits=10, decimal_places=2)
    patient_payment = models.DecimalField(max_digits=10, decimal_places=2)
    valid_from = models.DateField(default=date.today)
    valid_until = models.DateField(default=date(2099, 12, 31))
    
    class Meta:
        verbose_name = "Preiskonfiguration"
        verbose_name_plural = "Preiskonfigurationen"
        
    def __str__(self):
        return f"{self.treatment} - {self.insurance_provider_group} ({self.valid_from} bis {self.valid_until})"

# BillingCycle Model
class BillingCycle(models.Model):
    insurance_provider = models.ForeignKey(InsuranceProvider, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Entwurf'),
            ('ready', 'Bereit zum Export'),
            ('exported', 'Exportiert'),
            ('completed', 'Abgeschlossen')
        ],
        default='draft'
    )
    # Neue Felder für Gesamtbeträge
    total_insurance_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Gesamtbetrag der Krankenkasse"
    )
    total_patient_copay = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Gesamtzuzahlung der Patienten"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_amount(self):
        """Berechnet den Gesamtbetrag aller Abrechnungspositionen"""
        return self.billing_items.aggregate(
            total=models.Sum('insurance_amount')
        )['total'] or 0

    @property
    def total_copay(self):
        """Berechnet die Gesamtzuzahlung"""
        return self.billing_items.aggregate(
            total=models.Sum('patient_copay')
        )['total'] or 0

    def update_totals(self):
        """Aktualisiert die Gesamtbeträge basierend auf den BillingItems"""
        totals = self.billing_items.aggregate(
            insurance_total=models.Sum('insurance_amount'),
            copay_total=models.Sum('patient_copay')
        )
        self.total_insurance_amount = totals['insurance_total'] or 0
        self.total_patient_copay = totals['copay_total'] or 0
        self.save()

    def get_treatments_summary(self):
        """Gibt eine Zusammenfassung der Behandlungen zurück"""
        summary = {}
        for item in self.billing_items.all():
            treatment_name = item.treatment.treatment_name
            if treatment_name not in summary:
                summary[treatment_name] = {
                    'count': 0,
                    'insurance_amount': 0,
                    'copay_amount': 0
                }
            summary[treatment_name]['count'] += 1
            summary[treatment_name]['insurance_amount'] += float(item.insurance_amount)
            summary[treatment_name]['copay_amount'] += float(item.patient_copay)
        return summary

    def __str__(self):
        return f"Abrechnung {self.insurance_provider.name} ({self.start_date} - {self.end_date})"

    class Meta:
        verbose_name = "Abrechnungszyklus"
        verbose_name_plural = "Abrechnungszyklen"

# DiagnosisGroup Model
class DiagnosisGroup(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    icd_codes = models.ManyToManyField(ICDCode, related_name='diagnosis_groups')
    treatments = models.ManyToManyField(Treatment, related_name='diagnosis_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Diagnosis Group"
        verbose_name_plural = "Diagnosis Groups"

    def __str__(self):
        return self.name

# Prescription Model
class Prescription(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly_1', '1x pro Woche'),
        ('weekly_2', '2x pro Woche'),
        ('weekly_3', '3x pro Woche'),
        ('weekly_4', '4x pro Woche'),
        ('weekly_5', '5x pro Woche'),
        ('monthly_1', '1x pro Monat'),
        ('monthly_2', '2x pro Monat'),
        ('monthly_3', '3x pro Monat'),
        ('monthly_4', '4x pro Monat'),
    ]

    STATUS_CHOICES = [
        ('Open', 'Offen'),
        ('In_Progress', 'In Behandlung'),
        ('Completed', 'Abgeschlossen'),
        ('Cancelled', 'Storniert'),
        ('Extended', 'Verlängert')  # Neue Status für Folgeverordnungen
    ]

    # Grunddaten der Verordnung
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    patient_insurance = models.ForeignKey(
        'PatientInsurance', 
        on_delete=models.CASCADE,
        editable=False  # Verhindert manuelle Änderungen
    )
    doctor = models.ForeignKey('Doctor', on_delete=models.CASCADE)
    
    # Folgeverordnungen-Logik
    original_prescription = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='follow_up_prescriptions',
        verbose_name="Ursprüngliche Verordnung",
        help_text="Verweis auf die ursprüngliche Verordnung bei Folgeverordnungen"
    )
    is_follow_up = models.BooleanField(
        default=False,
        verbose_name="Folgeverordnung",
        help_text="Gibt an, ob dies eine Folgeverordnung ist"
    )
    follow_up_number = models.IntegerField(
        default=0,
        verbose_name="Folgeverordnungsnummer",
        help_text="Nummer der Folgeverordnung (1, 2, 3, ...)"
    )
    
    # ICD-10 Diagnose
    diagnosis_code = models.ForeignKey(
        'ICDCode', 
        on_delete=models.PROTECT,
        related_name='prescriptions',
        verbose_name="ICD-10 Code"
    )
    diagnosis_text = models.CharField(
        max_length=255,
        verbose_name="Diagnosetext",
        editable=False  # Verhindert manuelle Änderungen
    )
    
    # Heilmittel (bis zu 3 möglich)
    treatment_1 = models.ForeignKey(
        'Treatment',
        on_delete=models.SET_NULL,
        null=True,
        related_name='primary_prescriptions'
    )
    treatment_2 = models.ForeignKey(
        'Treatment',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='prescriptions_as_secondary',
        verbose_name="Ergänzende Behandlung 1"
    )
    treatment_3 = models.ForeignKey(
        'Treatment',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='prescriptions_as_tertiary',
        verbose_name="Ergänzende Behandlung 2"
    )
    
    number_of_sessions = models.IntegerField(default=1)
    sessions_completed = models.IntegerField(default=0)
    therapy_frequency_type = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='weekly_1')
    therapy_goals = models.TextField(null=True, blank=True)
    
    is_urgent = models.BooleanField(default=False)
    requires_home_visit = models.BooleanField(default=False)
    therapy_report_required = models.BooleanField(default=False)
    
    prescription_date = models.DateField(
        default=timezone.now,
        verbose_name="Ausstellungsdatum",
        help_text="Datum der Ausstellung durch den Arzt"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['patient_id', 'status']),
            models.Index(fields=['prescription_date']),
            models.Index(fields=['status', 'prescription_date']),
            models.Index(fields=['patient_insurance_id']),
            models.Index(fields=['original_prescription_id']),
        ]
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    pdf_document = models.FileField(upload_to='prescriptions/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Prüfe ob mindestens eine Behandlung ausgewählt ist
        if not self.treatment_1 and not self.treatment_2 and not self.treatment_3:
            raise ValidationError("Mindestens eine Behandlung muss ausgewählt werden.")
        
        # Prüfe ob die Verordnung noch gültig ist (max. 1 Jahr alt)
        if self.prescription_date:
            max_age = timezone.now().date() - timedelta(days=365)
            if self.prescription_date < max_age:
                raise ValidationError("Verordnung ist älter als 1 Jahr und nicht mehr gültig.")
        
        # Prüfe ob die Krankenkasse zum Verordnungsdatum gültig war
        if self.patient_insurance and self.prescription_date:
            if (self.prescription_date < self.patient_insurance.valid_from or 
                (self.patient_insurance.valid_to and self.prescription_date > self.patient_insurance.valid_to)):
                raise ValidationError("Die Krankenkasse war zum Verordnungsdatum nicht gültig.")
        
        # Folgeverordnungs-Logik
        if self.is_follow_up and not self.original_prescription:
            raise ValidationError("Folgeverordnungen müssen eine ursprüngliche Verordnung haben.")
        
        if self.original_prescription and not self.is_follow_up:
            self.is_follow_up = True
        
        # Folgeverordnungsnummer automatisch setzen
        if self.is_follow_up and self.original_prescription and self.follow_up_number == 0:
            max_follow_up = self.original_prescription.follow_up_prescriptions.aggregate(
                max_num=models.Max('follow_up_number')
            )['max_num'] or 0
            self.follow_up_number = max_follow_up + 1

    def get_root_prescription(self, depth=0):
        """Gibt die ursprüngliche Verordnung zurück (auch bei Folgeverordnungen)"""
        # Verhindere unendliche Rekursion
        if depth > 10:
            raise ValidationError("Maximale Rekursionstiefe für Folgeverordnungen erreicht. Möglicherweise gibt es zirkuläre Referenzen.")
        
        if self.original_prescription:
            return self.original_prescription.get_root_prescription(depth + 1)
        return self

    def get_all_follow_ups(self):
        """Gibt alle Folgeverordnungen zurück (inklusive dieser Verordnung)"""
        root = self.get_root_prescription()
        follow_ups = [root]
        follow_ups.extend(root.follow_up_prescriptions.order_by('follow_up_number'))
        return follow_ups

    def get_total_sessions_across_all_prescriptions(self):
        """Gibt die Gesamtanzahl der Sitzungen über alle Verordnungen hinweg zurück"""
        total = 0
        for prescription in self.get_all_follow_ups():
            total += prescription.number_of_sessions
        return total

    def get_total_completed_sessions_across_all_prescriptions(self):
        """Gibt die Gesamtanzahl der abgeschlossenen Sitzungen über alle Verordnungen hinweg zurück"""
        total = 0
        for prescription in self.get_all_follow_ups():
            total += prescription.sessions_completed
        return total

    def get_remaining_sessions(self):
        """Gibt die verbleibenden Sitzungen über alle Verordnungen hinweg zurück"""
        return self.get_total_sessions_across_all_prescriptions() - self.get_total_completed_sessions_across_all_prescriptions()

    def can_create_follow_up(self):
        """Prüft ob eine Folgeverordnung erstellt werden kann"""
        # Nur ursprüngliche Verordnungen oder letzte Folgeverordnung können verlängert werden
        if self.is_follow_up:
            # Prüfe ob dies die letzte Folgeverordnung ist
            root = self.get_root_prescription()
            max_follow_up = root.follow_up_prescriptions.aggregate(
                max_num=models.Max('follow_up_number')
            )['max_num'] or 0
            return self.follow_up_number == max_follow_up
        else:
            # Ursprüngliche Verordnung kann verlängert werden
            return True

    def create_follow_up_prescription(self, **kwargs):
        """Erstellt eine neue Folgeverordnung"""
        if not self.can_create_follow_up():
            raise ValidationError("Diese Verordnung kann nicht verlängert werden.")
        
        # Standardwerte für Folgeverordnung
        follow_up_data = {
            'patient': self.patient,
            'patient_insurance': self.patient_insurance,
            'doctor': self.doctor,
            'diagnosis_code': self.diagnosis_code,
            'diagnosis_text': self.diagnosis_text,
            'treatment_1': self.treatment_1,
            'treatment_2': self.treatment_2,
            'treatment_3': self.treatment_3,
            'therapy_frequency_type': self.therapy_frequency_type,
            'therapy_goals': self.therapy_goals,
            'is_urgent': self.is_urgent,
            'requires_home_visit': self.requires_home_visit,
            'therapy_report_required': self.therapy_report_required,
            'original_prescription': self.get_root_prescription(),
            'is_follow_up': True,
            'status': 'Open',
            'prescription_date': timezone.now().date(),
        }
        
        # Überschreibe mit übergebenen Werten
        follow_up_data.update(kwargs)
        
        # Folgeverordnungsnummer automatisch setzen
        root = self.get_root_prescription()
        max_follow_up = root.follow_up_prescriptions.aggregate(
            max_num=models.Max('follow_up_number')
        )['max_num'] or 0
        follow_up_data['follow_up_number'] = max_follow_up + 1
        
        return Prescription.objects.create(**follow_up_data)

    def get_all_appointments(self):
        """Gibt alle Termine über alle Verordnungen hinweg zurück"""
        appointments = []
        for prescription in self.get_all_follow_ups():
            appointments.extend(prescription.appointments.all())
        return appointments

    def get_total_amount(self):
        """Gibt den Gesamtbetrag der Verordnung zurück"""
        total = Decimal('0.00')
        for appointment in self.get_all_appointments():
            billing_amount = appointment.get_billing_amount()
            if billing_amount:
                total += billing_amount['insurance_amount'] + billing_amount['patient_copay']
        return total

    def get_paid_amount(self):
        """Gibt den bereits bezahlten Betrag zurück"""
        return self.payment_allocations.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def get_remaining_amount(self):
        """Gibt den verbleibenden Betrag zurück"""
        return self.get_total_amount() - self.get_paid_amount()

    def is_fully_paid(self):
        """Prüft ob die Verordnung vollständig bezahlt ist"""
        return self.get_remaining_amount() <= 0

    def save(self, *args, **kwargs):
        if self.diagnosis_code and not self.diagnosis_text:
            self.diagnosis_text = f"{self.diagnosis_code.code} - {self.diagnosis_code.title}"
        
        # Folgeverordnungsnummer automatisch setzen
        if self.is_follow_up and self.original_prescription and self.follow_up_number == 0:
            root = self.get_root_prescription()
            max_follow_up = root.follow_up_prescriptions.aggregate(
                max_num=models.Max('follow_up_number')
            )['max_num'] or 0
            self.follow_up_number = max_follow_up + 1
        
        super().save(*args, **kwargs)

    def __str__(self):
        if self.is_follow_up:
            return f"Folgeverordnung {self.follow_up_number} - {self.patient} ({self.prescription_date})"
        return f"Verordnung {self.id} - {self.patient} ({self.prescription_date})"

    class Meta:
        ordering = ['-created_at']

    def get_all_treatments(self):
        """Gibt alle Behandlungen der Verordnung zurück"""
        treatments = []
        if self.treatment_1:
            treatments.append(self.treatment_1)
        if self.treatment_2:
            treatments.append(self.treatment_2)
        if self.treatment_3:
            treatments.append(self.treatment_3)
        return treatments

    def get_primary_treatment_name(self):
        return self.treatment_1.treatment_name if self.treatment_1 else "Keine Behandlung"

    def get_treatment_names(self):
        """Gibt alle Behandlungsnamen als Liste zurück"""
        treatments = self.get_all_treatments()
        return [t.treatment_name for t in treatments]

    def is_valid_for_billing(self):
        """Prüft ob die Verordnung für die Abrechnung gültig ist"""
        if self.status not in ['In_Progress', 'Extended']:
            return False
        
        # Prüfe ob die Krankenkasse noch gültig ist
        if not self.patient_insurance.is_valid(timezone.now().date()):
            return False
        
        # Prüfe ob mindestens eine Behandlung vorhanden ist
        if not self.treatment_1:
            return False
        
        return True

    def can_be_billed(self):
        """Prüft ob die Verordnung abgerechnet werden kann"""
        return (self.is_valid_for_billing() and 
                not self.treatment_1.is_self_pay)

# Appointment Model
class Appointment(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Geplant'),
        ('completed', 'Abgeschlossen'),
        ('ready_to_bill', 'Abrechnungsbereit'),
        ('billed', 'Abgerechnet'),
        ('cancelled', 'Storniert'),
        ('no_show', 'Nicht erschienen')
    ]
    
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    practitioner = models.ForeignKey('Practitioner', on_delete=models.CASCADE)
    appointment_date = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned'
    )
    treatment = models.ForeignKey('Treatment', on_delete=models.CASCADE)
    prescription = models.ForeignKey(
        'Prescription', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Verordnung",
        help_text="Verordnung für diesen Termin"
    )
    patient_insurance = models.ForeignKey(
        'PatientInsurance', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Patientenversicherung",
        help_text="Versicherung des Patienten zum Zeitpunkt des Termins"
    )
    duration_minutes = models.IntegerField(
        default=30,
        validators=[validate_appointment_duration],
        verbose_name="Dauer (Minuten)"
    )
    notes = models.TextField(null=True, blank=True)
    room = models.ForeignKey('Room', on_delete=models.SET_NULL, null=True, blank=True)
    series_identifier = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Identifiziert zusammenhängende Termine"
    )
    is_recurring = models.BooleanField(
        default=False,
        help_text="Gibt an, ob dieser Termin Teil einer Serie ist"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # No-Show und Absage-Gebühren
    cancellation_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Absage-Gebühr",
        help_text="Gebühr bei kurzfristiger Absage oder No-Show"
    )
    cancellation_reason = models.CharField(
        max_length=50,
        choices=[
            ('no_show', 'Nicht erschienen'),
            ('late_cancellation', 'Kurzfristige Absage (< 24h)'),
            ('very_late_cancellation', 'Sehr kurzfristige Absage (< 2h)'),
            ('emergency', 'Notfall'),
            ('illness', 'Krankheit'),
            ('other', 'Sonstiges')
        ],
        null=True,
        blank=True,
        verbose_name="Absage-Grund"
    )
    cancellation_notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Absage-Notizen"
    )
    cancellation_fee_charged = models.BooleanField(
        default=False,
        verbose_name="Gebühr berechnet"
    )
    cancellation_fee_paid = models.BooleanField(
        default=False,
        verbose_name="Gebühr bezahlt"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['appointment_date', 'status']),
            models.Index(fields=['patient_id', 'practitioner_id']),
            models.Index(fields=['status', 'appointment_date']),
            models.Index(fields=['series_identifier']),
            models.Index(fields=['created_at']),
            models.Index(fields=['prescription_id']),
        ]
        ordering = ['appointment_date']
        verbose_name = "Termin"
        verbose_name_plural = "Termine"

    def clean(self):
        # Prüfe ob der Termin in der Zukunft liegt (außer bei abgeschlossenen Terminen)
        if self.appointment_date and self.appointment_date < timezone.now() and self.status not in ['completed', 'ready_to_bill', 'billed', 'cancelled', 'no_show']:
            raise ValidationError("Termine können nicht in der Vergangenheit liegen.")
        
        # Prüfe Termindauer
        if self.duration_minutes:
            validate_appointment_duration(self.duration_minutes)
        
        # Prüfe ob der Behandler verfügbar ist
        if self.practitioner and self.appointment_date:
            conflicts = validate_conflict_for_appointment(self)
            if conflicts:
                raise ValidationError(f"Terminkonflikt mit Behandler: {conflicts}")
            
            # Zusätzliche Verfügbarkeitsprüfung
            end_time = self.appointment_date + timedelta(minutes=self.duration_minutes)
            validate_practitioner_availability(
                self.practitioner, 
                self.appointment_date, 
                end_time, 
                self.id
            )
        
        # Prüfe ob der Raum verfügbar ist (falls angegeben)
        if self.room and self.appointment_date:
            if not self.room.is_available_at(self.appointment_date):
                raise ValidationError(f"Raum {self.room.name} ist zum gewählten Zeitpunkt nicht verfügbar.")
            
            # Zusätzliche Raumverfügbarkeitsprüfung
            end_time = self.appointment_date + timedelta(minutes=self.duration_minutes)
            validate_room_availability(
                self.room, 
                self.appointment_date, 
                end_time, 
                self.id
            )
        
        # Prüfe Terminserien-Logik: Eine Verordnung pro Serie
        if self.series_identifier and self.prescription:
            # Prüfe ob andere Termine in der gleichen Serie eine andere Verordnung haben
            conflicting_appointments = Appointment.objects.filter(
                series_identifier=self.series_identifier,
                prescription__isnull=False
            ).exclude(prescription=self.prescription)
            
            if conflicting_appointments.exists():
                raise ValidationError(
                    f"Terminserie '{self.series_identifier}' hat bereits eine andere Verordnung. "
                    "Eine Terminserie kann nur eine Verordnung haben."
                )
            
            # Prüfe ob die Verordnung zur Serie passt
            if not self.prescription.get_all_treatments().filter(id=self.treatment.id).exists():
                raise ValidationError(
                    f"Behandlung '{self.treatment.treatment_name}' ist nicht in der Verordnung enthalten."
                )

    def save(self, *args, **kwargs):
        # Automatische Status-Änderung: Termine deren Endzeit in der Vergangenheit liegt auf "completed" setzen
        if (self.appointment_date and
            self.duration_minutes and
            self.status == 'planned'):
            # Berechne die Endzeit des Termins
            from datetime import timedelta
            end_time = self.appointment_date + timedelta(minutes=self.duration_minutes)

            # Wenn die Endzeit in der Vergangenheit liegt, setze Status auf "completed"
            if end_time < timezone.now():
                self.status = 'completed'

        # Automatische Status-Änderung: Abgeschlossene Termine auf "ready_to_bill" setzen
        # (nur wenn sie eine gültige Verordnung haben und nicht bereits abgerechnet wurden)
        if (self.status == 'completed' and
            self.prescription and
            self.prescription.can_be_billed() and
            self.can_be_billed() and  # Zusätzliche Prüfung: Kann der Termin abgerechnet werden?
            self.pk and  # Nur bei bestehenden Terminen
            not self.billing_items.exists()):
            self.status = 'ready_to_bill'

        # Automatische Wartelisten-Eintragung bei Terminabsagen
        if self.pk:  # Nur bei bestehenden Terminen
            try:
                old_instance = Appointment.objects.get(pk=self.pk)
                if (old_instance.status != 'cancelled' and 
                    self.status == 'cancelled' and
                    self.prescription):  # Nur bei Terminen mit Verordnung
                    
                    # Füge zur Warteliste hinzu
                    from core.services.waitlist_service import WaitlistService
                    WaitlistService.add_to_waitlist(
                        appointment=self,
                        notes=f"Automatische Wartelisten-Eintragung bei Terminabsage"
                    )
            except Appointment.DoesNotExist:
                pass  # Neuer Termin

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Termin {self.id} - {self.patient} am {self.appointment_date.strftime('%d.%m.%Y %H:%M')}"

    def can_be_billed(self):
        """Prüft ob der Termin abgerechnet werden kann"""
        # Termin muss den Status "ready_to_bill" haben
        if self.status != 'ready_to_bill':
            return False
        
        # Termin darf noch nicht abgerechnet sein
        if self.billing_items.exists():
            return False
        
        # Wenn eine Verordnung vorhanden ist, muss sie gültig sein
        if self.prescription:
            return self.prescription.can_be_billed()
        
        # Ohne Verordnung nur als Selbstzahler möglich
        # Prüfe ob es sich um eine Selbstzahler-Behandlung handelt
        if not self.treatment.is_self_pay:
            return False
            
        # Prüfe ob eine Patientenversicherung vorhanden ist
        if self.patient_insurance and not self.patient_insurance.is_private:
            return False
            
        return True

    def get_billing_amount(self):
        """Gibt den Abrechnungsbetrag für den Termin zurück"""
        if not self.can_be_billed():
            return None
        
        appointment_date = self.appointment_date.date()
        
        # Wenn Verordnung vorhanden, verwende Surcharge (kassengruppenspezifisch) oder TreatmentPrice als Fallback
        if self.prescription and self.prescription.patient_insurance:
            # 1. Versuche Surcharge (kassengruppenspezifische Preise)
            try:
                surcharge = Surcharge.objects.get(
                    treatment=self.treatment,
                    insurance_provider_group=self.prescription.patient_insurance.insurance_provider.group,
                    valid_from__lte=appointment_date,
                    valid_until__gte=appointment_date
                )
                return {
                    'insurance_amount': surcharge.insurance_payment,
                    'patient_copay': surcharge.patient_payment
                }
            except Surcharge.DoesNotExist:
                pass
            
            # 2. Fallback: TreatmentPrice (Basispreise)
            try:
                from .models import TreatmentPrice, PriceList
                treatment_price = TreatmentPrice.objects.filter(
                    treatment=self.treatment,
                    price_list__valid_from__lte=appointment_date,
                    is_active=True
                ).filter(
                    models.Q(price_list__valid_until__isnull=True) | models.Q(price_list__valid_until__gte=appointment_date)
                ).first()
                
                if treatment_price:
                    return {
                        'insurance_amount': treatment_price.gkv_price or Decimal('0.00'),
                        'patient_copay': treatment_price.copayment_amount or Decimal('0.00')
                    }
            except Exception:
                pass
        
        # Ohne Verordnung: Selbstzahler-Preis
        # 1. Versuche TreatmentPrice
        try:
            from .models import TreatmentPrice, PriceList
            treatment_price = TreatmentPrice.objects.filter(
                treatment=self.treatment,
                price_list__valid_from__lte=appointment_date,
                is_active=True
            ).filter(
                models.Q(price_list__valid_until__isnull=True) | models.Q(price_list__valid_until__gte=appointment_date)
            ).first()
            
            if treatment_price and treatment_price.self_pay_price:
                return {
                    'insurance_amount': Decimal('0.00'),
                    'patient_copay': treatment_price.self_pay_price
                }
        except Exception:
            pass
        
        # 2. Fallback: Treatment.self_pay_price (deprecated)
        return {
            'insurance_amount': Decimal('0.00'),
            'patient_copay': self.treatment.self_pay_price if hasattr(self.treatment, 'self_pay_price') else Decimal('0.00')
        }

    def mark_as_ready_to_bill(self):
        """Markiert den Termin als abrechnungsbereit"""
        if self.status == 'completed' and self.can_be_billed():
            self.status = 'ready_to_bill'
            self.save()
            return True
        return False

    def is_self_pay(self):
        """Prüft ob es sich um eine Selbstzahler-Behandlung handelt"""
        return not self.prescription or self.treatment.is_self_pay

# WorkingHour Model
class WorkingHour(models.Model):
    practitioner = models.ForeignKey('Practitioner', on_delete=models.CASCADE, related_name='working_hours')
    day_of_week = models.CharField(
        max_length=9,
        choices=[
            ('Monday', 'Montag'),
            ('Tuesday', 'Dienstag'),
            ('Wednesday', 'Mittwoch'),
            ('Thursday', 'Donnerstag'),
            ('Friday', 'Freitag'),
            ('Saturday', 'Samstag'),
            ('Sunday', 'Sonntag'),
        ]
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    valid_from = models.DateField(default=timezone.now)
    valid_until = models.DateField(null=True, blank=True)  # None = unbefristet gültig

    class Meta:
        unique_together = ('practitioner', 'day_of_week', 'start_time', 'end_time', 'valid_from')

    def __str__(self):
        return f"{self.practitioner} - {self.day_of_week}: {self.start_time} bis {self.end_time} (ab {self.valid_from})"

# Benutzerpräferenzen (pro User, OneToOne)
class UserPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=20, default='light', verbose_name="Theme")  # light | dark | system
    language = models.CharField(max_length=10, default='de', verbose_name="Sprache")
    timezone = models.CharField(max_length=50, default='Europe/Berlin', verbose_name="Zeitzone")
    default_calendar_view = models.CharField(max_length=20, default='timeGridWeek', verbose_name="Standard Kalenderansicht")
    receive_email_notifications = models.BooleanField(default=True, verbose_name="E-Mail-Benachrichtigungen")
    receive_sms_notifications = models.BooleanField(default=False, verbose_name="SMS-Benachrichtigungen")
    default_room = models.ForeignKey('Room', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Standardraum")
    default_practitioner = models.ForeignKey('Practitioner', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Standard-Behandler")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Benutzerpräferenz"
        verbose_name_plural = "Benutzerpräferenzen"

    def __str__(self):
        return f"Präferenzen von {getattr(self.user, 'username', self.user_id)}"


class AuditLog(models.Model):
    """Änderungshistorie für alle wichtigen Modelle"""
    ACTION_CHOICES = [
        ('create', 'Erstellt'),
        ('update', 'Geändert'),
        ('delete', 'Gelöscht'),
        ('view', 'Angesehen'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    user_initials = models.CharField(max_length=10, blank=True)  # Kürzel des Benutzers
    model_name = models.CharField(max_length=100)  # Name des geänderten Models
    object_id = models.PositiveIntegerField()  # ID des geänderten Objekts
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    field_name = models.CharField(max_length=100, blank=True)  # Geändertes Feld
    old_value = models.TextField(blank=True)  # Alter Wert
    new_value = models.TextField(blank=True)  # Neuer Wert
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)  # Zusätzliche Notizen

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.get_action_display()} {self.model_name} #{self.object_id} von {self.user_initials or 'System'}"

class SingletonManager(models.Manager):
    def get_or_create(self, **kwargs):
        try:
            return self.get(), False
        except self.model.DoesNotExist:
            return super().get_or_create(**kwargs)

class Practice(models.Model):
    name = models.CharField(max_length=255, verbose_name="Praxisname")
    owner_name = models.CharField(max_length=255, blank=True, verbose_name="Inhaber")
    bundesland = models.ForeignKey(Bundesland, on_delete=models.PROTECT, verbose_name="Bundesland")
    street_address = models.CharField(max_length=255, verbose_name="Straße")
    postal_code = models.CharField(max_length=10, verbose_name="PLZ")
    city = models.CharField(max_length=100, verbose_name="Stadt")
    phone = models.CharField(max_length=20, verbose_name="Telefon")
    email = models.EmailField(verbose_name="E-Mail")
    website = models.URLField(blank=True, null=True, verbose_name="Website")
    institution_code = models.CharField(max_length=20, verbose_name="Institutionskennzeichen")
    tax_id = models.CharField(max_length=20, verbose_name="Steuernummer")
    
    # Öffnungszeiten
    opening_hours = models.JSONField(
        default=dict,
        verbose_name="Öffnungszeiten",
        help_text="Öffnungszeiten für jeden Wochentag"
    )
    
    # Bankdaten
    bank_details = models.JSONField(
        default=dict,
        verbose_name="Bankverbindung",
        help_text="Bankverbindung der Praxis"
    )
    
    # Zusätzliche Einstellungen
    default_appointment_duration = models.IntegerField(
        default=30,
        verbose_name="Standard-Terminlänge",
        help_text="Standard-Terminlänge in Minuten"
    )
    
    calendar_settings = models.JSONField(
        default=dict,
        verbose_name="Kalendereinstellungen"
    )
    
    notification_settings = models.JSONField(
        default=dict,
        verbose_name="Benachrichtigungseinstellungen"
    )
    
    invoice_settings = models.JSONField(
        default=dict,
        verbose_name="Rechnungseinstellungen"
    )
    
    # No-Show und Absage-Gebühren Einstellungen
    cancellation_fee_settings = models.JSONField(
        default=dict,
        verbose_name="Absage-Gebühren Einstellungen",
        help_text="Einstellungen für No-Show und Absage-Gebühren"
    )

    objects = SingletonManager()

    def save(self, *args, **kwargs):
        if not self.pk and Practice.objects.exists():
            raise ValidationError('Es kann nur eine Praxisinstanz geben.')
            
        # Standard-Öffnungszeiten setzen
        if not self.opening_hours:
            self.opening_hours = {
                'monday': {'open': True, 'hours': '07:00-19:00'},
                'tuesday': {'open': True, 'hours': '07:00-19:00'},
                'wednesday': {'open': True, 'hours': '07:00-19:00'},
                'thursday': {'open': True, 'hours': '07:00-19:00'},
                'friday': {'open': True, 'hours': '07:00-19:00'},
                'saturday': {'open': False, 'hours': ''},
                'sunday': {'open': False, 'hours': ''}
            }
            
        # Standard-Bankdaten setzen
        if not self.bank_details:
            self.bank_details = {
                'account_holder': self.name,
                'iban': '',
                'bic': '',
                'bank_name': ''
            }

        # Standard-Kalendereinstellungen setzen
        if not self.calendar_settings:
            self.calendar_settings = {
                'default_view': 'timeGridWeek',
                'show_weekends': False,
                'working_hours': {
                    'start': '08:00',
                    'end': '18:00'
                }
            }

        # Standard-Benachrichtigungseinstellungen setzen
        if not self.notification_settings:
            self.notification_settings = {
                'send_appointment_confirmations': True,
                'send_reminders': True,
                'reminder_time': 24
            }

        # Standard-Rechnungseinstellungen setzen
        if not self.invoice_settings:
            self.invoice_settings = {
                'invoice_prefix': 'RE-',
                'next_invoice_number': 1,
                'payment_terms': 14,
                'footer_text': ''
            }
        
        super().save(*args, **kwargs)

    def is_open_at(self, dt):
        """
        Prüft, ob die Praxis zum angegebenen Zeitpunkt geöffnet ist.
        """
        # Hole den Wochentag (monday, tuesday, etc.)
        day_name = dt.strftime('%A').lower()
        
        # Prüfe ob die Praxis an diesem Tag geöffnet ist
        day_settings = self.opening_hours.get(day_name, {})
        if not day_settings.get('open', False):
            return False
        
        # Hole die Öffnungszeiten für diesen Tag
        hours_str = day_settings.get('hours', '')
        if not hours_str:
            return False
        
        try:
            # Parse die Öffnungszeiten (Format: "08:00-18:00")
            start_str, end_str = hours_str.split('-')
            start_time = datetime.strptime(start_str.strip(), '%H:%M').time()
            end_time = datetime.strptime(end_str.strip(), '%H:%M').time()
            
            # Prüfe ob die gegebene Zeit innerhalb der Öffnungszeiten liegt
            check_time = dt.time()
            return start_time <= check_time <= end_time
            
        except (ValueError, AttributeError):
            # Bei Fehlern im Format: Standardmäßig geschlossen
            return False

    def get_display_hours(self):
        """Gibt die erweiterten Anzeigezeiten zurück (1h früher/später)"""
        display_hours = {}
        for day, settings in self.opening_hours.items():
            if settings.get('open', False):
                hours = settings.get('hours', '').split('-')
                if len(hours) == 2:
                    start_time = datetime.strptime(hours[0], '%H:%M')
                    end_time = datetime.strptime(hours[1], '%H:%M')
                    display_hours[day] = {
                        'open': True,
                        'hours': f"{(start_time - timedelta(hours=1)).strftime('%H:%M')}-{(end_time + timedelta(hours=1)).strftime('%H:%M')}"
                    }
            else:
                display_hours[day] = {'open': False, 'hours': ''}
        return display_hours

    @classmethod
    def get_instance(cls):
        """
        Holt die einzige Praxisinstanz oder erstellt eine neue mit Standardwerten,
        wenn keine existiert.
        """
        try:
            instance = cls.objects.first()
            if instance is None:
                # Hole das erste Bundesland oder erstelle ein Standard-Bundesland
                bundesland = Bundesland.objects.first()
                if bundesland is None:
                    bundesland = Bundesland.objects.create(
                        name="Bayern",
                        abbreviation="BY"
                    )

                # Erstelle eine neue Praxisinstanz mit Standardwerten
                instance = cls.objects.create(
                    name="Meine Praxis",
                    owner_name="",
                    street_address="",
                    postal_code="",
                    city="",
                    phone="",
                    email="praxis@example.com",
                    website="",
                    institution_code="",
                    tax_id="",
                    bundesland=bundesland,
                    opening_hours={
                        "monday": {"open": True, "hours": "08:00-18:00"},
                        "tuesday": {"open": True, "hours": "08:00-18:00"},
                        "wednesday": {"open": True, "hours": "08:00-18:00"},
                        "thursday": {"open": True, "hours": "08:00-18:00"},
                        "friday": {"open": True, "hours": "08:00-16:00"},
                        "saturday": {"open": False, "hours": ""},
                        "sunday": {"open": False, "hours": ""}
                    },
                    bank_details={
                        "account_holder": "",
                        "iban": "",
                        "bic": "",
                        "bank_name": ""
                    },
                    calendar_settings={
                        "default_view": "timeGridWeek",
                        "show_weekends": False,
                        "working_hours": {
                            "start": "08:00",
                            "end": "18:00"
                        }
                    },
                    notification_settings={
                        "send_appointment_confirmations": True,
                        "send_reminders": True,
                        "reminder_time": 24
                    },
                    invoice_settings={
                        "invoice_prefix": "RE-",
                        "next_invoice_number": 1,
                        "payment_terms": 14,
                        "footer_text": ""
                    }
                )
            return instance
        except Exception as e:
            raise Exception(f"Fehler beim Abrufen/Erstellen der Praxisinstanz: {str(e)}")

    class Meta:
        verbose_name = "Praxis"
        verbose_name_plural = "Praxen"

    def __str__(self):
        return self.name

class BillingItem(models.Model):
    billing_cycle = models.ForeignKey(
        'BillingCycle', 
        on_delete=models.CASCADE,
        related_name='billing_items'
    )
    prescription = models.ForeignKey(
        'Prescription',
        on_delete=models.PROTECT,  # Schützt vor versehentlichem Löschen
        related_name='billing_items',
        null=True,
        blank=True  # Erlaubt BillingItems ohne Verordnung (Selbstzahler)
    )
    appointment = models.ForeignKey(
        'Appointment',
        on_delete=models.PROTECT,
        related_name='billing_items'
    )
    treatment = models.ForeignKey(
        'Treatment',
        on_delete=models.PROTECT,
        related_name='billing_items'
    )
    insurance_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Betrag der von der Krankenkasse zu zahlen ist"
    )
    patient_copay = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Zuzahlungsbetrag des Patienten"
    )
    
    # Neue Felder für GKV-Abrechnung
    is_gkv_billing = models.BooleanField(
        default=False,
        help_text="GKV-Abrechnung: Zuzahlung wird Patient berechnet, Rest über Krankenkasse"
    )
    is_private_billing = models.BooleanField(
        default=False,
        help_text="Private Abrechnung: Gesamtbetrag wird Patient berechnet"
    )
    is_self_pay_billing = models.BooleanField(
        default=False,
        help_text="Selbstzahler: Gesamtbetrag wird Patient berechnet"
    )
    
    # GKV-spezifische Felder
    legs_code = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="LEGS-Code für GKV-Abrechnung"
    )
    prescription_type_indicator = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Verordnungsartkennzeichnung (VKZ)"
    )
    is_telemedicine = models.BooleanField(
        default=False,
        help_text="Telemedizinische Leistung"
    )
    
    # Status-Felder
    patient_invoice_created = models.BooleanField(
        default=False,
        help_text="Patientenrechnung für Zuzahlung erstellt"
    )
    insurance_claim_created = models.BooleanField(
        default=False,
        help_text="Krankenkassen-Anspruch erstellt"
    )
    
    is_billed = models.BooleanField(
        default=False,
        help_text="Wurde bereits abgerechnet"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Abrechnungsposition"
        verbose_name_plural = "Abrechnungspositionen"
        unique_together = ['appointment', 'billing_cycle']  # Verhindert Doppelabrechnung

    def clean(self):
        # Prüfe ob der Termin abgerechnet werden kann
        if self.appointment and not self.appointment.can_be_billed():
            raise ValidationError("Termin kann nicht abgerechnet werden.")
        
        # Prüfe ob bereits eine Abrechnungsposition für diesen Termin existiert
        if self.appointment and self.billing_cycle:
            existing = BillingItem.objects.filter(
                appointment=self.appointment,
                billing_cycle=self.billing_cycle
            ).exclude(id=self.id)
            if existing.exists():
                raise ValidationError("Für diesen Termin existiert bereits eine Abrechnungsposition.")
        
        # Prüfe ob die Beträge korrekt sind
        if self.insurance_amount < 0 or self.patient_copay < 0:
            raise ValidationError("Beträge dürfen nicht negativ sein.")
        
        # Prüfe ob mindestens ein Betrag größer als 0 ist
        if self.insurance_amount == 0 and self.patient_copay == 0:
            raise ValidationError("Mindestens ein Betrag muss größer als 0 sein.")
        
        # Prüfe Billing-Typ
        billing_types = [self.is_gkv_billing, self.is_private_billing, self.is_self_pay_billing]
        if sum(billing_types) != 1:
            raise ValidationError("Genau ein Billing-Typ muss ausgewählt sein.")

    def save(self, *args, **kwargs):
        skip_validation = kwargs.pop('skip_validation', False)
        
        if not skip_validation:
            self.clean()
        
        # Automatisch Beträge berechnen, falls nicht gesetzt
        if not self.insurance_amount and not self.patient_copay:
            billing_amount = self.appointment.get_billing_amount()
            if billing_amount:
                self.insurance_amount = billing_amount['insurance_amount']
                self.patient_copay = billing_amount['patient_copay']
        
        # Automatisch Billing-Typ setzen
        if not any([self.is_gkv_billing, self.is_private_billing, self.is_self_pay_billing]):
            self._set_billing_type()
        
        # Automatisch GKV-Felder setzen
        if self.is_gkv_billing and self.treatment:
            self._set_gkv_fields()
        
        super().save(*args, **kwargs)
        
        # Aktualisiere die Gesamtbeträge im BillingCycle
        if self.billing_cycle:
            self.billing_cycle.update_totals()

    def _set_billing_type(self):
        """Setzt automatisch den korrekten Billing-Typ"""
        if self.prescription and self.prescription.patient_insurance:
            if self.prescription.patient_insurance.is_private:
                self.is_private_billing = True
            else:
                self.is_gkv_billing = True
        else:
            self.is_self_pay_billing = True

    def _set_gkv_fields(self):
        """Setzt automatisch die GKV-spezifischen Felder"""
        if self.treatment:
            self.legs_code = self.treatment.legs_code
            self.prescription_type_indicator = self.treatment.prescription_type_indicator
            self.is_telemedicine = self.treatment.is_telemedicine

    def __str__(self):
        billing_type = "GKV" if self.is_gkv_billing else "Privat" if self.is_private_billing else "Selbstzahler"
        return f"Abrechnungsposition {self.id} - {self.appointment} ({billing_type}, {self.insurance_amount + self.patient_copay} €)"

    def calculate_amounts(self):
        """Berechnet die Beträge basierend auf der Surcharge oder dem Selbstzahler-Preis"""
        if self.prescription and self.prescription.patient_insurance:
            # Mit Verordnung: Verwende Surcharge
            try:
                surcharge = Surcharge.objects.get(
                    treatment=self.treatment,
                    insurance_provider_group=self.prescription.patient_insurance.insurance_provider.group,
                    valid_from__lte=self.appointment.appointment_date.date(),
                    valid_until__gte=self.appointment.appointment_date.date()
                )
                self.insurance_amount = surcharge.insurance_payment
                self.patient_copay = surcharge.patient_payment
            except Surcharge.DoesNotExist:
                raise ValidationError(f"Keine Preiskonfiguration gefunden für {self.treatment} und {self.prescription.patient_insurance.insurance_provider.group}")
        else:
            # Ohne Verordnung: Selbstzahler-Preis
            if not self.treatment.is_self_pay or not self.treatment.self_pay_price:
                raise ValidationError(f"Behandlung {self.treatment} ist nicht als Selbstzahler-Behandlung konfiguriert.")
            self.insurance_amount = Decimal('0.00')
            self.patient_copay = self.treatment.self_pay_price

    def get_total_amount(self):
        """Gibt den Gesamtbetrag zurück"""
        return self.insurance_amount + self.patient_copay

    def is_self_pay(self):
        """Prüft ob es sich um eine Selbstzahler-Behandlung handelt"""
        return not self.prescription or self.treatment.is_self_pay
    
    def get_billing_type_display(self):
        """Gibt den Billing-Typ als String zurück"""
        if self.is_gkv_billing:
            return "GKV-Abrechnung"
        elif self.is_private_billing:
            return "Private Abrechnung"
        elif self.is_self_pay_billing:
            return "Selbstzahler"
        else:
            return "Unbekannt"
    
    def get_patient_amount(self):
        """Gibt den Betrag zurück, der dem Patienten berechnet wird"""
        if self.is_gkv_billing:
            return self.patient_copay  # Nur Zuzahlung
        else:
            return self.get_total_amount()  # Gesamtbetrag
    
    def get_insurance_amount(self):
        """Gibt den Betrag zurück, der über die Krankenkasse abgerechnet wird"""
        if self.is_gkv_billing:
            return self.insurance_amount  # Krankenkassen-Betrag
        else:
            return Decimal('0.00')  # Keine Krankenkassen-Abrechnung

class PatientInvoice(models.Model):
    INVOICE_STATUS = (
        ('created', 'Erstellt'),
        ('sent', 'Gesendet'),
        ('paid', 'Bezahlt'),
        ('cancelled', 'Storniert'),
    )

    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=INVOICE_STATUS, default='created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Rechnung {self.invoice_number} - {self.patient}"

    class Meta:
        verbose_name = "Patientenrechnung"
        verbose_name_plural = "Patientenrechnungen"

# PatientContact Model (Neu)
class PatientContact(models.Model):
    CONTACT_TYPE_CHOICES = [
        ('private', 'Privat'),
        ('work', 'Arbeit'),
        ('mobile', 'Mobil'),
        ('other', 'Sonstige')
    ]

    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name="Patient"
    )
    contact_type = models.CharField(
        max_length=20,
        choices=CONTACT_TYPE_CHOICES,
        verbose_name="Kontaktart"
    )
    phone_number = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="Telefonnummer"
    )
    email = models.EmailField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="E-Mail"
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name="Primärer Kontakt"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Notizen"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Patientenkontakt"
        verbose_name_plural = "Patientenkontakte"
        ordering = ['-is_primary', 'contact_type']

    def __str__(self):
        return f"{self.get_contact_type_display()} - {self.phone_number or self.email}"

    def save(self, *args, **kwargs):
        if self.is_primary:
            PatientContact.objects.filter(
                patient=self.patient,
                contact_type=self.contact_type,
                is_primary=True
            ).exclude(id=self.id).update(is_primary=False)
        super().save(*args, **kwargs)

    def clean(self):
        if not self.phone_number and not self.email:
            raise ValidationError(
                'Mindestens eine Kontaktmöglichkeit (Telefon oder E-Mail) muss angegeben werden.'
            )

class Absence(models.Model):
    ABSENCE_TYPES = [
        ('vacation', 'Urlaub'),
        ('sick', 'Krankheit'),
        ('parental_leave', 'Elternzeit'),
        ('special_leave', 'Sonderurlaub'),
        ('training', 'Fortbildung'),
        ('other', 'Sonstiges')
    ]

    practitioner = models.ForeignKey(
        'Practitioner',
        on_delete=models.CASCADE,
        related_name='absences',
        verbose_name="Behandler"
    )
    
    absence_type = models.CharField(
        max_length=20,
        choices=ABSENCE_TYPES,
        verbose_name="Abwesenheitsgrund"
    )
    
    start_date = models.DateField(verbose_name="Startdatum")
    end_date = models.DateField(verbose_name="Enddatum")
    
    # Für stundenweise Abwesenheit
    start_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Startzeit",
        help_text="Nur bei stundenweiser Abwesenheit"
    )
    end_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Endzeit",
        help_text="Nur bei stundenweiser Abwesenheit"
    )
    
    is_full_day = models.BooleanField(
        default=True,
        verbose_name="Ganztägig"
    )
    
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Notizen"
    )
    
    approved_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_absences',
        verbose_name="Genehmigt von"
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Genehmigt am"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Abwesenheit"
        verbose_name_plural = "Abwesenheiten"
        ordering = ['-start_date', '-start_time']
        
    def __str__(self):
        if self.is_full_day:
            return f"{self.practitioner} - {self.get_absence_type_display()} ({self.start_date} bis {self.end_date})"
        return f"{self.practitioner} - {self.get_absence_type_display()} ({self.start_date} {self.start_time} bis {self.end_time})"

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Das Startdatum muss vor dem Enddatum liegen.")

        if not self.is_full_day and (not self.start_time or not self.end_time):
            raise ValidationError("Bei stundenweiser Abwesenheit müssen Start- und Endzeit angegeben werden.")

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("Die Startzeit muss vor der Endzeit liegen.")

    def save(self, *args, **kwargs):
        if self.is_full_day:
            self.start_time = None
            self.end_time = None
        super().save(*args, **kwargs)

    @property
    def is_approved(self):
        return bool(self.approved_by and self.approved_at)

    def approve(self, user):
        """Genehmigt die Abwesenheit"""
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()

    def get_affected_appointments(self):
        """Gibt alle betroffenen Termine zurück"""
        appointments = Appointment.objects.filter(
            practitioner=self.practitioner,
            appointment_date__date__gte=self.start_date,
            appointment_date__date__lte=self.end_date
        )
        
        if not self.is_full_day:
            appointments = appointments.filter(
                appointment_date__time__gte=self.start_time,
                appointment_date__time__lte=self.end_time
            )
            
        return appointments

class RecurringAbsence(models.Model):
    REPEAT_TYPES = [
        ('weekly', 'Wöchentlich'),
        ('monthly', 'Monatlich'),
        ('yearly', 'Jährlich')
    ]
    
    base_absence = models.ForeignKey(
        'Absence',
        on_delete=models.CASCADE,
        related_name='recurring_pattern'
    )
    repeat_type = models.CharField(max_length=20, choices=REPEAT_TYPES)
    repeat_until = models.DateField()

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Niedrig'),
        ('medium', 'Mittel'),
        ('high', 'Hoch')
    ]
    
    STATUS_CHOICES = [
        ('open', 'Offen'),
        ('in_progress', 'In Bearbeitung'),
        ('completed', 'Erledigt'),
        ('cancelled', 'Abgebrochen')
    ]

    title = models.CharField(
        max_length=255,
        verbose_name="Titel"
    )
    description = models.TextField(
        null=True, 
        blank=True,
        verbose_name="Beschreibung"
    )
    assigned_to = models.ForeignKey(
        'Practitioner',  # Geändert von User zu Practitioner
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        verbose_name="Zugewiesen an"
    )
    due_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Fällig am"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="Priorität"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='open',
        verbose_name="Status"
    )
    completed_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Erledigt am"
    )
    created_by = models.ForeignKey(
        'Practitioner',  # Geändert von User zu Practitioner
        on_delete=models.CASCADE,
        related_name='created_tasks',
        verbose_name="Erstellt von"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Aufgabe"
        verbose_name_plural = "Aufgaben"
        ordering = ['-priority', 'due_date', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def complete(self):
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()

    def cancel(self):
        self.status = 'cancelled'
        self.save()

class Raetsel(models.Model):
    name = models.CharField(max_length=100)
    gitterbreite = models.IntegerField()
    erstellt_am = models.DateTimeField(auto_now_add=True)
    aktiv = models.BooleanField(default=True)
    gitter = models.JSONField()

    class Meta:
        verbose_name = "Rätsel"
        verbose_name_plural = "Rätsel"
        ordering = ['-erstellt_am']

    def __str__(self):
        return f"{self.name} ({self.erstellt_am.strftime('%d.%m.%Y')})"

class Waitlist(models.Model):
    """Warteliste für Terminabsagen und automatische Neubuchung"""
    
    PRIORITY_CHOICES = [
        ('low', 'Niedrig'),
        ('medium', 'Mittel'),
        ('high', 'Hoch'),
        ('urgent', 'Dringend'),
    ]
    
    STATUS_CHOICES = [
        ('waiting', 'Wartend'),
        ('offered', 'Angeboten'),
        ('accepted', 'Angenommen'),
        ('declined', 'Abgelehnt'),
        ('expired', 'Abgelaufen'),
    ]
    
    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        related_name='waitlist_entries',
        verbose_name="Patient"
    )
    
    treatment = models.ForeignKey(
        'Treatment',
        on_delete=models.CASCADE,
        verbose_name="Behandlung"
    )
    
    practitioner = models.ForeignKey(
        'Practitioner',
        on_delete=models.CASCADE,
        verbose_name="Behandler"
    )
    
    prescription = models.ForeignKey(
        'Prescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Verordnung"
    )
    
    # Zeitraum in dem der Patient verfügbar ist
    available_from = models.DateTimeField(verbose_name="Verfügbar ab")
    available_until = models.DateTimeField(verbose_name="Verfügbar bis")
    
    # Priorität und Status
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="Priorität"
    )
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='waiting',
        verbose_name="Status"
    )
    
    # Ursprung der Wartelisten-Eintragung
    original_appointment = models.ForeignKey(
        'Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='waitlist_entries',
        verbose_name="Ursprünglicher Termin"
    )
    
    # Angebotene Termine
    offered_appointments = models.ManyToManyField(
        'Appointment',
        through='WaitlistOffer',
        related_name='waitlist_offers',
        verbose_name="Angebotene Termine"
    )
    
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Notizen"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Warteliste"
        verbose_name_plural = "Wartelisten"
        ordering = ['-priority', 'created_at']
        
    def __str__(self):
        return f"{self.patient} - {self.treatment} (Priorität: {self.get_priority_display()})"
    
    def clean(self):
        if self.available_until <= self.available_from:
            raise ValidationError("Verfügbar bis muss nach Verfügbar ab liegen.")
        
        # Prüfe auf Überschneidungen mit anderen Wartelisten-Einträgen
        overlapping = Waitlist.objects.filter(
            patient=self.patient,
            treatment=self.treatment,
            status='waiting',
            available_from__lt=self.available_until,
            available_until__gt=self.available_from
        ).exclude(id=self.id)
        
        if overlapping.exists():
            raise ValidationError("Es existiert bereits ein Wartelisten-Eintrag für diesen Zeitraum.")
    
    @property
    def is_expired(self):
        """Prüft ob der Wartelisten-Eintrag abgelaufen ist"""
        return timezone.now() > self.available_until
    
    def offer_appointment(self, appointment):
        """Bietet einen Termin an"""
        offer = WaitlistOffer.objects.create(
            waitlist=self,
            appointment=appointment,
            offered_at=timezone.now()
        )
        self.status = 'offered'
        self.save()
        return offer
    
    def accept_appointment(self, appointment):
        """Akzeptiert einen angebotenen Termin"""
        offer = self.waitlist_offers.filter(appointment=appointment).first()
        if offer:
            offer.accepted_at = timezone.now()
            offer.save()
            self.status = 'accepted'
            self.save()
            
            # Erstelle den neuen Termin
            new_appointment = Appointment.objects.create(
                patient=self.patient,
                practitioner=self.practitioner,
                treatment=self.treatment,
                prescription=self.prescription,
                appointment_date=appointment.appointment_date,
                duration_minutes=appointment.duration_minutes,
                room=appointment.room,
                notes=f"Warteliste: {self.notes}" if self.notes else "Über Warteliste gebucht"
            )
            
            return new_appointment
        return None
    
    def decline_appointment(self, appointment):
        """Lehnt einen angebotenen Termin ab"""
        offer = self.waitlist_offers.filter(appointment=appointment).first()
        if offer:
            offer.declined_at = timezone.now()
            offer.save()
            self.status = 'declined'
            self.save()
            return True
        return False


class WaitlistOffer(models.Model):
    """Angebotene Termine für Wartelisten-Einträge"""
    
    waitlist = models.ForeignKey(
        Waitlist,
        on_delete=models.CASCADE,
        related_name='waitlist_offers',
        verbose_name="Warteliste"
    )
    
    appointment = models.ForeignKey(
        'Appointment',
        on_delete=models.CASCADE,
        verbose_name="Angebotener Termin"
    )
    
    offered_at = models.DateTimeField(auto_now_add=True, verbose_name="Angeboten am")
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name="Angenommen am")
    declined_at = models.DateTimeField(null=True, blank=True, verbose_name="Abgelehnt am")
    
    class Meta:
        verbose_name = "Wartelisten-Angebot"
        verbose_name_plural = "Wartelisten-Angebote"
        unique_together = ['waitlist', 'appointment']
        
    def __str__(self):
        return f"{self.waitlist.patient} - {self.appointment.appointment_date}"
    
    @property
    def is_accepted(self):
        return bool(self.accepted_at)
    
    @property
    def is_declined(self):
        return bool(self.declined_at)
    
    @property
    def is_pending(self):
        return not (self.is_accepted or self.is_declined)

class GKVInsuranceClaim(models.Model):
    """GKV-Krankenkassen-Anspruch für strukturierte Abrechnung"""
    
    billing_cycle = models.ForeignKey(
        'BillingCycle',
        on_delete=models.CASCADE,
        related_name='gkv_claims'
    )
    insurance_provider = models.ForeignKey(
        'InsuranceProvider',
        on_delete=models.CASCADE,
        related_name='gkv_claims'
    )
    
    # Anspruchsdaten
    claim_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Eindeutige Anspruchsnummer"
    )
    claim_date = models.DateField(
        auto_now_add=True,
        help_text="Datum der Anspruchserstellung"
    )
    
    # Beträge
    total_insurance_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Gesamtbetrag der Krankenkasse"
    )
    total_patient_copay = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Gesamtzuzahlung der Patienten"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Entwurf'),
            ('ready', 'Bereit zum Export'),
            ('exported', 'Exportiert'),
            ('paid', 'Bezahlt'),
            ('rejected', 'Abgelehnt')
        ],
        default='draft'
    )
    
    # Export-Daten
    export_date = models.DateTimeField(null=True, blank=True)
    export_file = models.FileField(
        upload_to='gkv_exports/',
        null=True,
        blank=True
    )
    
    # Notizen
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "GKV-Krankenkassen-Anspruch"
        verbose_name_plural = "GKV-Krankenkassen-Ansprüche"
        ordering = ['-claim_date']

    def __str__(self):
        return f"GKV-Anspruch {self.claim_number} - {self.insurance_provider.name} ({self.total_insurance_amount}€)"

    def update_totals(self):
        """Aktualisiert die Gesamtbeträge basierend auf den BillingItems"""
        items = self.billing_items.all()
        self.total_insurance_amount = sum(item.insurance_amount for item in items)
        self.total_patient_copay = sum(item.patient_copay for item in items)
        self.save()

    @property
    def total_amount(self):
        """Gesamtbetrag des Anspruchs"""
        return self.total_insurance_amount + self.total_patient_copay

    def get_patients_summary(self):
        """Gibt eine Zusammenfassung der Patienten zurück"""
        patients = {}
        for item in self.billing_items.all():
            patient = item.appointment.patient
            if patient.id not in patients:
                patients[patient.id] = {
                    'patient': patient,
                    'items': [],
                    'total_insurance': Decimal('0.00'),
                    'total_copay': Decimal('0.00')
                }
            patients[patient.id]['items'].append(item)
            patients[patient.id]['total_insurance'] += item.insurance_amount
            patients[patient.id]['total_copay'] += item.patient_copay
        return patients

    def get_prescriptions_summary(self):
        """Gibt eine Zusammenfassung der Verordnungen zurück"""
        prescriptions = {}
        for item in self.billing_items.all():
            if item.prescription:
                prescription = item.prescription
                if prescription.id not in prescriptions:
                    prescriptions[prescription.id] = {
                        'prescription': prescription,
                        'items': [],
                        'total_insurance': Decimal('0.00'),
                        'total_copay': Decimal('0.00')
                    }
                prescriptions[prescription.id]['items'].append(item)
                prescriptions[prescription.id]['total_insurance'] += item.insurance_amount
                prescriptions[prescription.id]['total_copay'] += item.patient_copay
        return prescriptions


class PatientCopayInvoice(models.Model):
    """Patientenrechnung für GKV-Zuzahlungen"""
    
    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        related_name='copay_invoices'
    )
    gkv_claim = models.ForeignKey(
        GKVInsuranceClaim,
        on_delete=models.CASCADE,
        related_name='patient_invoices'
    )
    
    # Rechnungsdaten
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Eindeutige Rechnungsnummer"
    )
    invoice_date = models.DateField(
        auto_now_add=True,
        help_text="Rechnungsdatum"
    )
    due_date = models.DateField(
        help_text="Fälligkeitsdatum"
    )
    
    # Betrag
    total_copay = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Gesamtzuzahlungsbetrag"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('created', 'Erstellt'),
            ('sent', 'Gesendet'),
            ('paid', 'Bezahlt'),
            ('overdue', 'Überfällig'),
            ('cancelled', 'Storniert')
        ],
        default='created'
    )
    
    # Zahlungsdaten
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Bar'),
            ('bank_transfer', 'Überweisung'),
            ('card', 'Karte'),
            ('other', 'Sonstiges')
        ],
        null=True,
        blank=True
    )
    
    # PDF-Rechnung
    pdf_file = models.FileField(
        upload_to='patient_invoices/',
        null=True,
        blank=True
    )
    
    # Notizen
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Patienten-Zuzahlungsrechnung"
        verbose_name_plural = "Patienten-Zuzahlungsrechnungen"
        ordering = ['-invoice_date']

    def __str__(self):
        return f"Zuzahlungsrechnung {self.invoice_number} - {self.patient.full_name} ({self.total_copay}€)"

    def get_billing_items(self):
        """Gibt alle BillingItems für diesen Patienten zurück"""
        return self.gkv_claim.billing_items.filter(
            appointment__patient=self.patient
        )

    def get_treatments_summary(self):
        """Gibt eine Zusammenfassung der Behandlungen zurück"""
        treatments = {}
        for item in self.get_billing_items():
            treatment = item.treatment
            if treatment.id not in treatments:
                treatments[treatment.id] = {
                    'treatment': treatment,
                    'count': 0,
                    'total_copay': Decimal('0.00')
                }
            treatments[treatment.id]['count'] += 1
            treatments[treatment.id]['total_copay'] += item.patient_copay
        return treatments

    def mark_as_paid(self, payment_date=None, payment_method=None):
        """Markiert die Rechnung als bezahlt"""
        self.status = 'paid'
        self.payment_date = payment_date or date.today()
        if payment_method:
            self.payment_method = payment_method
        self.save()

    @property
    def is_overdue(self):
        """Prüft ob die Rechnung überfällig ist"""
        return self.status in ['created', 'sent'] and self.due_date < date.today()


class PrivatePatientInvoice(models.Model):
    """Vollständige Patientenrechnung für Privatversicherte"""
    
    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        related_name='private_invoices'
    )
    billing_cycle = models.ForeignKey(
        'BillingCycle',
        on_delete=models.CASCADE,
        related_name='private_invoices'
    )
    
    # Rechnungsdaten
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Eindeutige Rechnungsnummer"
    )
    invoice_date = models.DateField(
        auto_now_add=True,
        help_text="Rechnungsdatum"
    )
    due_date = models.DateField(
        help_text="Fälligkeitsdatum"
    )
    
    # Betrag
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Gesamtbetrag der Rechnung"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('created', 'Erstellt'),
            ('sent', 'Gesendet'),
            ('paid', 'Bezahlt'),
            ('overdue', 'Überfällig'),
            ('cancelled', 'Storniert')
        ],
        default='created'
    )
    
    # Zahlungsdaten
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Bar'),
            ('bank_transfer', 'Überweisung'),
            ('card', 'Karte'),
            ('other', 'Sonstiges')
        ],
        null=True,
        blank=True
    )
    
    # PDF-Rechnung
    pdf_file = models.FileField(
        upload_to='private_invoices/',
        null=True,
        blank=True
    )
    
    # Notizen
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Private Patientenrechnung"
        verbose_name_plural = "Private Patientenrechnungen"
        ordering = ['-invoice_date']

    def __str__(self):
        return f"Private Rechnung {self.invoice_number} - {self.patient.full_name} ({self.total_amount}€)"

    def get_billing_items(self):
        """Gibt alle BillingItems für diesen Patienten zurück"""
        return self.billing_cycle.billing_items.filter(
            appointment__patient=self.patient,
            is_private_billing=True
        )

    def get_treatments_summary(self):
        """Gibt eine Zusammenfassung der Behandlungen zurück"""
        treatments = {}
        for item in self.get_billing_items():
            treatment = item.treatment
            if treatment.id not in treatments:
                treatments[treatment.id] = {
                    'treatment': treatment,
                    'count': 0,
                    'total_amount': Decimal('0.00')
                }
            treatments[treatment.id]['count'] += 1
            treatments[treatment.id]['total_amount'] += item.get_total_amount()
        return treatments

    def mark_as_paid(self, payment_date=None, payment_method=None):
        """Markiert die Rechnung als bezahlt"""
        self.status = 'paid'
        self.payment_date = payment_date or date.today()
        if payment_method:
            self.payment_method = payment_method
        self.save()

    @property
    def is_overdue(self):
        """Prüft ob die Rechnung überfällig ist"""
        return self.status in ['created', 'sent'] and self.due_date < date.today()

# LocalHoliday Model
class LocalHoliday(models.Model):
    holiday_name = models.CharField(max_length=255, verbose_name="Feiertagsname")
    date = models.DateField(verbose_name="Datum")
    is_recurring = models.BooleanField(
        default=True, 
        help_text="Jährlich wiederkehrender Feiertag",
        verbose_name="Jährlich wiederkehrend"
    )
    description = models.TextField(blank=True, null=True, verbose_name="Beschreibung")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    bundesland = models.ForeignKey(
        Bundesland, 
        on_delete=models.CASCADE, 
        verbose_name="Bundesland"
    )

    class Meta:
        verbose_name = "Feiertag"
        verbose_name_plural = "Feiertage"
        ordering = ['date']
        unique_together = ('bundesland', 'date')

    def __str__(self):
        return f"{self.holiday_name} ({self.date}) - {self.bundesland.name}"

    def clean(self):
        if self.date and self.date < date.today():
            raise ValidationError("Feiertage können nicht in der Vergangenheit liegen.")

class Payment(models.Model):
    """Zahlungseingang für Rechnungen und Verordnungen"""
    
    PAYMENT_METHODS = [
        ('cash', 'Bar'),
        ('bank_transfer', 'Überweisung'),
        ('card', 'Karte'),
        ('direct_debit', 'Lastschrift'),
        ('check', 'Scheck'),
        ('other', 'Sonstiges')
    ]
    
    PAYMENT_TYPES = [
        ('gkv_copay', 'GKV-Zuzahlung'),
        ('private_invoice', 'Private Rechnung'),
        ('self_pay', 'Selbstzahler'),
        ('insurance_claim', 'Krankenkassen-Anspruch'),
        ('prescription_payment', 'Verordnungszahlung'),
        ('appointment_payment', 'Termin-Zahlung'),
        ('other', 'Sonstiges')
    ]
    
    # Rechnungsverknüpfung
    patient_invoice = models.ForeignKey(
        'PatientInvoice',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments'
    )
    copay_invoice = models.ForeignKey(
        'PatientCopayInvoice',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments'
    )
    private_invoice = models.ForeignKey(
        'PrivatePatientInvoice',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments'
    )
    
    # Verordnungs- und Terminverknüpfung
    prescription = models.ForeignKey(
        'Prescription',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        help_text="Verknüpfte Verordnung"
    )
    appointment = models.ForeignKey(
        'Appointment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        help_text="Verknüpfte Termin"
    )
    
    # Zahlungsdaten
    payment_date = models.DateField(
        help_text="Zahlungsdatum"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Zahlungsbetrag"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
        help_text="Zahlungsart"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPES,
        help_text="Zahlungstyp"
    )
    
    # Buchungsdaten
    allocated_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Zugeordneter Betrag"
    )
    remaining_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Verbleibender Betrag"
    )
    
    # Referenzdaten
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Referenznummer (z.B. Überweisungsreferenz)"
    )
    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Transaktions-ID"
    )
    
    # Status
    is_confirmed = models.BooleanField(
        default=True,
        help_text="Zahlung bestätigt"
    )
    is_fully_allocated = models.BooleanField(
        default=False,
        help_text="Zahlung vollständig zugeordnet"
    )
    
    # Notizen
    notes = models.TextField(
        blank=True,
        help_text="Zusätzliche Notizen"
    )
    
    # Metadaten
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Benutzer der die Zahlung erstellt hat"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Zahlung"
        verbose_name_plural = "Zahlungen"
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        invoice_ref = self.get_invoice_reference()
        prescription_ref = self.get_prescription_reference()
        return f"Zahlung {self.id} - {invoice_ref or prescription_ref} ({self.amount}€, {self.get_payment_method_display()})"

    def get_invoice_reference(self):
        """Gibt die Rechnungsreferenz zurück"""
        if self.patient_invoice:
            return f"Rechnung {self.patient_invoice.invoice_number}"
        elif self.copay_invoice:
            return f"Zuzahlung {self.copay_invoice.invoice_number}"
        elif self.private_invoice:
            return f"Private {self.private_invoice.invoice_number}"
        return None

    def get_prescription_reference(self):
        """Gibt die Verordnungsreferenz zurück"""
        if self.prescription:
            return f"Verordnung {self.prescription.id} - {self.prescription.patient}"
        elif self.appointment:
            return f"Termin {self.appointment.id} - {self.appointment.patient}"
        return "Keine Zuordnung"

    def get_patient(self):
        """Gibt den Patienten zurück"""
        if self.patient_invoice:
            return self.patient_invoice.patient
        elif self.copay_invoice:
            return self.copay_invoice.patient
        elif self.private_invoice:
            return self.private_invoice.patient
        elif self.prescription:
            return self.prescription.patient
        elif self.appointment:
            return self.appointment.patient
        return None

    def save(self, *args, **kwargs):
        """Speichert die Zahlung und aktualisiert die Zuordnung"""
        is_new = self.pk is None
        
        # Berechne verbleibenden Betrag
        self.remaining_amount = self.amount - self.allocated_amount
        
        # Prüfe ob vollständig zugeordnet
        self.is_fully_allocated = self.remaining_amount <= 0
        
        super().save(*args, **kwargs)
        
        # Wenn neue Zahlung, aktualisiere Rechnungsstatus
        if is_new:
            self.update_invoice_status()

    def update_invoice_status(self):
        """Aktualisiert den Status der verknüpften Rechnung"""
        if self.patient_invoice:
            self.patient_invoice.status = 'paid'
            self.patient_invoice.payment_date = self.payment_date
            self.patient_invoice.save()
        elif self.copay_invoice:
            self.copay_invoice.status = 'paid'
            self.copay_invoice.payment_date = self.payment_date
            self.copay_invoice.payment_method = self.payment_method
            self.copay_invoice.save()
        elif self.private_invoice:
            self.private_invoice.status = 'paid'
            self.private_invoice.payment_date = self.payment_date
            self.private_invoice.payment_method = self.payment_method
            self.private_invoice.save()

    def allocate_to_prescription(self, prescription, amount):
        """Ordnet einen Betrag einer Verordnung zu"""
        if amount > self.remaining_amount:
            raise ValueError("Betrag übersteigt verbleibenden Zahlungsbetrag")
        
        # Erstelle PaymentAllocation
        PaymentAllocation.objects.create(
            payment=self,
            prescription=prescription,
            amount=amount,
            allocation_date=date.today()
        )
        
        # Aktualisiere zugeordneten Betrag
        self.allocated_amount += amount
        self.save()

    def allocate_to_appointment(self, appointment, amount):
        """Ordnet einen Betrag einem Termin zu"""
        if amount > self.remaining_amount:
            raise ValueError("Betrag übersteigt verbleibenden Zahlungsbetrag")
        
        # Erstelle PaymentAllocation
        PaymentAllocation.objects.create(
            payment=self,
            appointment=appointment,
            amount=amount,
            allocation_date=date.today()
        )
        
        # Aktualisiere zugeordneten Betrag
        self.allocated_amount += amount
        self.save()

    def get_allocations(self):
        """Gibt alle Zuordnungen zurück"""
        return self.allocations.all()

    def get_prescription_balance(self, prescription):
        """Gibt den Saldo für eine Verordnung zurück"""
        total_payments = self.allocations.filter(prescription=prescription).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Berechne Gesamtbetrag der Verordnung
        prescription_total = prescription.get_total_amount()
        
        return prescription_total - total_payments

    def clean(self):
        """Validiert die Zahlung"""
        from django.core.exceptions import ValidationError
        
        # Mindestens eine Verknüpfung muss vorhanden sein
        has_invoice = any([self.patient_invoice, self.copay_invoice, self.private_invoice])
        has_prescription = bool(self.prescription or self.appointment)
        
        if not has_invoice and not has_prescription:
            raise ValidationError("Mindestens eine Rechnung oder Verordnung/Termin muss verknüpft sein.")
        
        # Nur eine Art von Verknüpfung darf vorhanden sein
        if has_invoice and has_prescription:
            raise ValidationError("Zahlung kann nicht gleichzeitig mit Rechnung und Verordnung/Termin verknüpft sein.")
        
        # Betrag muss positiv sein
        if self.amount <= 0:
            raise ValidationError("Der Zahlungsbetrag muss größer als 0 sein.")
        
        # Prüfe ob Rechnung bereits bezahlt ist
        invoice = self.get_linked_invoice()
        if invoice and invoice.status == 'paid':
            raise ValidationError("Die Rechnung ist bereits bezahlt.")

    def get_linked_invoice(self):
        """Gibt die verknüpfte Rechnung zurück"""
        return self.patient_invoice or self.copay_invoice or self.private_invoice


class PaymentAllocation(models.Model):
    """Zuordnung von Zahlungen zu Verordnungen/Terminen"""
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='allocations'
    )
    prescription = models.ForeignKey(
        'Prescription',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_allocations'
    )
    appointment = models.ForeignKey(
        'Appointment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_allocations'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Zugeordneter Betrag"
    )
    allocation_date = models.DateField(
        auto_now_add=True,
        help_text="Zuordnungsdatum"
    )
    notes = models.TextField(
        blank=True,
        help_text="Notizen zur Zuordnung"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Zahlungszuordnung"
        verbose_name_plural = "Zahlungszuordnungen"
        ordering = ['-allocation_date']

    def __str__(self):
        if self.prescription:
            return f"Zuordnung {self.id} - Verordnung {self.prescription.id} ({self.amount}€)"
        elif self.appointment:
            return f"Zuordnung {self.id} - Termin {self.appointment.id} ({self.amount}€)"
        return f"Zuordnung {self.id} ({self.amount}€)"

    def clean(self):
        """Validiert die Zuordnung"""
        from django.core.exceptions import ValidationError
        
        # Entweder Verordnung oder Termin muss verknüpft sein
        if not self.prescription and not self.appointment:
            raise ValidationError("Entweder Verordnung oder Termin muss verknüpft sein.")
        
        # Nicht beide gleichzeitig
        if self.prescription and self.appointment:
            raise ValidationError("Nur eine Verknüpfung (Verordnung oder Termin) ist erlaubt.")
        
        # Betrag muss positiv sein
        if self.amount <= 0:
            raise ValidationError("Der zugeordnete Betrag muss größer als 0 sein.")
        
        # Betrag darf nicht größer als verbleibender Zahlungsbetrag sein
        if self.amount > self.payment.remaining_amount:
            raise ValidationError("Betrag übersteigt verbleibenden Zahlungsbetrag.")