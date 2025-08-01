from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.timezone import now, make_aware
from datetime import datetime, date, timedelta
from django.db.models import Q
from core.appointment_validators import (
    validate_conflict_for_appointment,
    validate_appointment_conflicts,
    validate_working_hours
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

    def __str__(self):
        return f"Calendar Settings"

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
    email = models.EmailField(max_length=255, verbose_name="Primäre E-Mail", help_text="Hauptkontakt-E-Mail des Patienten")
    phone_number = models.CharField(max_length=20, verbose_name="Primäre Telefonnummer", help_text="Hauptkontaktnummer des Patienten")
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    medical_history = models.TextField(null=True, blank=True)
    allergies = models.TextField(null=True, blank=True)
    receive_notifications = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
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
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    days_open = models.CharField(max_length=100)
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
        ('Cancelled', 'Storniert')
    ]

    # Grunddaten der Verordnung
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    patient_insurance = models.ForeignKey(
        'PatientInsurance', 
        on_delete=models.CASCADE,
        editable=False  # Verhindert manuelle Änderungen
    )
    doctor = models.ForeignKey('Doctor', on_delete=models.CASCADE)
    
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
                raise ValidationError("Verordnung wurde zu einem Zeitpunkt erstellt, als die Krankenkasse nicht gültig war.")

    def save(self, *args, **kwargs):
        if self.diagnosis_code and not self.diagnosis_text:
            self.diagnosis_text = f"{self.diagnosis_code.code} - {self.diagnosis_code.title}"
        super().save(*args, **kwargs)

    def __str__(self):
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
        if self.status != 'In_Progress':
            return False
        
        # Prüfe ob die Krankenkasse noch gültig ist
        if not self.patient_insurance.is_valid_at_date(timezone.now().date()):
            return False
        
        # Prüfe ob mindestens eine Behandlung vorhanden ist
        if not self.treatment_1:
            return False
        
        return True

    def can_be_billed(self):
        """Prüft ob die Verordnung abgerechnet werden kann"""
        return (self.is_valid_for_billing() and 
                not self.patient_insurance.is_private and 
                not self.treatment_1.is_self_pay)

# Appointment Model
class Appointment(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Geplant'),
        ('confirmed', 'Bestätigt'),
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
    prescription = models.ForeignKey('Prescription', on_delete=models.SET_NULL, null=True, blank=True)
    duration_minutes = models.IntegerField(default=30)
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

    def clean(self):
        # Prüfe ob der Termin in der Zukunft liegt (außer bei abgeschlossenen Terminen)
        if self.appointment_date and self.appointment_date < timezone.now() and self.status not in ['completed', 'ready_to_bill', 'billed', 'cancelled', 'no_show']:
            raise ValidationError("Termine können nicht in der Vergangenheit liegen.")
        
        # Prüfe ob der Behandler verfügbar ist
        if self.practitioner and self.appointment_date:
            conflicts = validate_conflict_for_appointment(self)
            if conflicts:
                raise ValidationError(f"Terminkonflikt mit Behandler: {conflicts}")
        
        # Prüfe ob der Raum verfügbar ist (falls angegeben)
        if self.room and self.appointment_date:
            if not self.room.is_available_at(self.appointment_date):
                raise ValidationError(f"Raum {self.room.name} ist zum gewählten Zeitpunkt nicht verfügbar.")

    def save(self, *args, **kwargs):
        # Automatische Status-Änderung: Termine in der Vergangenheit auf "completed" setzen
        if (self.appointment_date and 
            self.appointment_date < timezone.now() and 
            self.status in ['planned', 'confirmed']):
            self.status = 'completed'
        
        # Automatische Status-Änderung: Abgeschlossene Termine auf "ready_to_bill" setzen
        # (nur wenn sie eine gültige Verordnung haben und nicht bereits abgerechnet wurden)
        if (self.status == 'completed' and 
            self.prescription and 
            self.prescription.can_be_billed() and
            not self.billing_items.exists()):
            self.status = 'ready_to_bill'
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Termin {self.id} - {self.patient} am {self.appointment_date.strftime('%d.%m.%Y %H:%M')}"

    class Meta:
        ordering = ['appointment_date']
        verbose_name = "Termin"
        verbose_name_plural = "Termine"

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
        return self.treatment.is_self_pay

    def get_billing_amount(self):
        """Gibt den Abrechnungsbetrag für den Termin zurück"""
        if not self.can_be_billed():
            return None
        
        # Wenn Verordnung vorhanden, verwende Surcharge
        if self.prescription and self.prescription.patient_insurance:
            try:
                surcharge = Surcharge.objects.get(
                    treatment=self.treatment,
                    insurance_provider_group=self.prescription.patient_insurance.insurance_provider.group,
                    valid_from__lte=self.appointment_date.date(),
                    valid_until__gte=self.appointment_date.date()
                )
                return {
                    'insurance_amount': surcharge.insurance_payment,
                    'patient_copay': surcharge.patient_payment
                }
            except Surcharge.DoesNotExist:
                return None
        
        # Ohne Verordnung: Selbstzahler-Preis
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

    def save(self, *args, **kwargs):
        self.clean()
        
        # Automatisch Beträge berechnen, falls nicht gesetzt
        if not self.insurance_amount and not self.patient_copay:
            billing_amount = self.appointment.get_billing_amount()
            if billing_amount:
                self.insurance_amount = billing_amount['insurance_amount']
                self.patient_copay = billing_amount['patient_copay']
        
        super().save(*args, **kwargs)
        
        # Aktualisiere die Gesamtbeträge im BillingCycle
        self.billing_cycle.update_totals()

    def __str__(self):
        return f"Abrechnungsposition {self.id} - {self.appointment} ({self.insurance_amount + self.patient_copay} €)"

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
        if self.end_date < self.start_date:
            raise ValidationError("Enddatum kann nicht vor dem Startdatum liegen.")
            
        if not self.is_full_day:
            if not self.start_time or not self.end_time:
                raise ValidationError("Bei stundenweiser Abwesenheit müssen Start- und Endzeit angegeben werden.")
            if self.start_time >= self.end_time:
                raise ValidationError("Endzeit muss nach der Startzeit liegen.")
        
        # Prüfen auf Überschneidungen
        overlapping = Absence.objects.filter(
            practitioner=self.practitioner,
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        ).exclude(id=self.id)
        
        if not self.is_full_day:
            overlapping = overlapping.filter(
                models.Q(is_full_day=True) |
                models.Q(
                    start_time__lt=self.end_time,
                    end_time__gt=self.start_time
                )
            )
        
        if overlapping.exists():
            raise ValidationError("Es existiert bereits eine Abwesenheit in diesem Zeitraum.")

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