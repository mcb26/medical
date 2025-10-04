from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging
from datetime import datetime
from django.utils.timezone import make_aware
from django.db.models import Q

from .models import (
    Bundesland,
    Appointment,
    CalendarSettings,
    ICDCode,
    User,
    InsuranceProviderGroup,
    InsuranceProvider,
    Patient,
    PatientInsurance,
    EmergencyContact,
    Doctor,
    AuditLog,
    Room,
    Practitioner, 
    Specialization,
    PracticeSettings,
    Category,
    Treatment,
    Surcharge,
    BillingCycle,
    DiagnosisGroup,
    Prescription,
    WorkingHour,
    Practice,
    BillingItem,
    Raetsel,
    Absence,
    ModulePermission,
    UserRole,
    Waitlist,
    LocalHoliday,
    Payment,
    DataProtectionConsent,
    TreatmentType,
    PriceList,
    TreatmentPrice,
    UserPreference,
)

User = get_user_model()
logger = logging.getLogger(__name__)

class BundeslandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bundesland
        fields = '__all__'

class CalendarSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarSettings
        fields = '__all__'

class ICDCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ICDCode
        fields = '__all__'

class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = '__all__'

class ModulePermissionSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    permission_display = serializers.CharField(source='get_permission_display', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.get_full_name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ModulePermission
        fields = [
            'id', 'user', 'module', 'module_display', 'permission', 'permission_display',
            'granted_by', 'granted_by_name', 'granted_at', 'expires_at', 'is_active',
            'is_expired', 'is_valid'
        ]
        read_only_fields = ['id', 'granted_at']

class UserSerializer(serializers.ModelSerializer):
    # Neue Felder für Rollen und Berechtigungen
    role = UserRoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=UserRole.objects.all(),
        source='role',
        required=False,
        allow_null=True
    )
    module_permissions = ModulePermissionSerializer(many=True, read_only=True)
    effective_permissions = serializers.SerializerMethodField()
    
    # Theme-Einstellungen
    theme_mode = serializers.CharField(max_length=20, required=False)
    theme_accent_color = serializers.CharField(max_length=7, required=False)
    theme_font_size = serializers.CharField(max_length=20, required=False)
    theme_compact_mode = serializers.BooleanField(required=False)
    
    # Admin-Status
    is_admin = serializers.BooleanField(required=False)
    
    # Therapeut-Status
    is_therapist = serializers.BooleanField(required=False)
    
    # Modul-Zugriffe (Legacy)
    can_access_patients = serializers.BooleanField(required=False)
    can_access_appointments = serializers.BooleanField(required=False)
    can_access_prescriptions = serializers.BooleanField(required=False)
    can_access_treatments = serializers.BooleanField(required=False)
    can_access_finance = serializers.BooleanField(required=False)
    can_access_reports = serializers.BooleanField(required=False)
    can_access_settings = serializers.BooleanField(required=False)
    can_manage_users = serializers.BooleanField(required=False)
    can_manage_roles = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'is_active',
            'date_joined', 'last_login', 'is_staff', 'is_superuser',
            
            # Rollen und Berechtigungen
            'role', 'role_id', 'module_permissions', 'effective_permissions',
            'custom_permissions', 'is_employee', 'employee_id', 'department',
            'hire_date', 'supervisor',
            
            # Admin-Status
            'is_admin',
            
            # Therapeut-Status
            'is_therapist',
            
            # Modul-Zugriffe (Legacy)
            'can_access_patients', 'can_access_appointments', 'can_access_prescriptions',
            'can_access_treatments', 'can_access_finance', 'can_access_reports',
            'can_access_settings', 'can_manage_users', 'can_manage_roles',
            
            # Theme-Einstellungen
            'theme_mode', 'theme_accent_color', 'theme_font_size', 'theme_compact_mode',
            
            # Audit-Felder
            'last_login_ip', 'login_count', 'is_locked', 'lock_reason'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'login_count']

    def get_effective_permissions(self, obj):
        """Gibt alle effektiven Berechtigungen zurück"""
        return obj.get_effective_permissions()


class InsuranceProviderGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceProviderGroup
        fields = '__all__'

class InsuranceProviderSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = InsuranceProvider
        fields = [
            'id', 
            'name', 
            'provider_id', 
            'group',
            'group_name',
            'address', 
            'phone_number', 
            'email', 
            'contact_person',
            'created_at',
            'updated_at'
        ]

class PatientInsuranceSerializer(serializers.ModelSerializer):
    insurance_provider_name = serializers.CharField(source='insurance_provider.name', read_only=True)
    
    class Meta:
        model = PatientInsurance
        fields = [
            'id', 'patient', 'insurance_provider', 'insurance_provider_name',
            'insurance_number', 'valid_from', 'valid_to', 'is_private'
        ]

class PatientSerializer(serializers.ModelSerializer):
    insurances = PatientInsuranceSerializer(many=True, read_only=True)
    insurance_provider_name = serializers.SerializerMethodField()
    consent_active = serializers.SerializerMethodField()
    latest_consent = serializers.SerializerMethodField()
    
    def get_insurance_provider_name(self, obj):
        """Gibt den Namen der aktuellen Versicherung zurück"""
        current_insurance = obj.insurances.filter(
            valid_from__lte=timezone.now().date(),
            valid_to__gte=timezone.now().date()
        ).first()
        
        if not current_insurance:
            # Fallback: neueste gültige Versicherung
            current_insurance = obj.insurances.filter(
                valid_from__lte=timezone.now().date()
            ).order_by('-valid_from').first()
        
        if current_insurance and current_insurance.insurance_provider:
            return current_insurance.insurance_provider.name
        return None

    def get_consent_active(self, obj):
        latest = obj.data_consents.order_by('-consent_date').first()
        return latest.is_active() if latest else False

    def get_latest_consent(self, obj):
        latest = obj.data_consents.order_by('-consent_date').first()
        if not latest:
            return None
        return {
            'id': latest.id,
            'consent_given': latest.consent_given,
            'revoked': latest.revoked,
            'consent_date': latest.consent_date,
            'revoked_at': latest.revoked_at,
            'valid_until': latest.valid_until,
            'text_version': latest.consent_text_version,
        }
    
    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'dob', 'gender', 
            'email', 'phone_number', 'street_address', 'city', 'postal_code', 
            'country', 'medical_history', 'allergies', 'receive_notifications',
            'created_at', 'updated_at', 'insurances', 'insurance_provider_name',
            'consent_active', 'latest_consent'
        ]

class DataProtectionConsentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)

    class Meta:
        model = DataProtectionConsent
        fields = [
            'id', 'patient', 'patient_name', 'consent_given', 'consent_text_version',
            'consent_text', 'consent_date', 'revoked', 'revoked_at', 'valid_until'
        ]
        read_only_fields = ['id', 'consent_date']

class TreatmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentType
        fields = ['id', 'name', 'type_code', 'description', 'is_active', 'created_at', 'updated_at']

class PriceListSerializer(serializers.ModelSerializer):
    treatment_type_name = serializers.CharField(source='treatment_type.name', read_only=True)
    is_currently_valid = serializers.SerializerMethodField()

    class Meta:
        model = PriceList
        fields = [
            'id', 'name', 'treatment_type', 'treatment_type_name', 'valid_from', 
            'valid_until', 'is_active', 'description', 'is_currently_valid',
            'created_at', 'updated_at'
        ]

    def get_is_currently_valid(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        return obj.is_valid_on_date(today)

class TreatmentPriceSerializer(serializers.ModelSerializer):
    treatment_name = serializers.CharField(source='treatment.treatment_name', read_only=True)
    price_list_name = serializers.CharField(source='price_list.name', read_only=True)
    is_currently_valid = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPrice
        fields = [
            'id', 'treatment', 'treatment_name', 'price_list', 'price_list_name',
            'gkv_price', 'copayment_amount', 'private_price', 'self_pay_price',
            'notes', 'is_active', 'is_currently_valid', 'created_at', 'updated_at'
        ]

    def get_is_currently_valid(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        return obj.is_valid_on_date(today)

class UserPreferenceSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserPreference
        fields = [
            'id', 'user', 'user_username', 'theme', 'language', 'timezone',
            'default_calendar_view', 'receive_email_notifications', 'receive_sms_notifications',
            'default_room', 'default_practitioner', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = '__all__'


class UserInitialsSerializer(serializers.ModelSerializer):
    """Serializer für Benutzer-Kürzel (nur Admin kann ändern)"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'initials', 'is_active']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'is_active']


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = '__all__'

class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = '__all__'
        
class DoctorSerializer(serializers.ModelSerializer):
    specializations = SpecializationSerializer(many=True)  # Handle multiple specializations
    
    class Meta:
        model = Doctor
        fields = '__all__'

    def create(self, validated_data):
        specializations_data = validated_data.pop('specializations', [])
        doctor = Doctor.objects.create(**validated_data)
        doctor.specializations.set(specializations_data)
        return doctor

class WorkingHourSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkingHour
        fields = '__all__'

class PractitionerSerializer(serializers.ModelSerializer):
    working_hours = WorkingHourSerializer(many=True, read_only=True)
    
    class Meta:
        model = Practitioner
        fields = ['id', 'first_name', 'last_name', 'is_active', 'working_hours']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['name'] = f"{instance.first_name} {instance.last_name}"
        return representation

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'description', 'is_active', 'is_home_visit', 'opening_hours']
        read_only_fields = ['created_at', 'updated_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['name'] = str(instance.name)
        return representation

class PracticeSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeSettings
        fields = '__all__'

class TreatmentCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Treatment
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    treatment_name = serializers.CharField(source='treatment.treatment_name', read_only=True)
    practitioner_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source='room.name', read_only=True)
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), required=False, allow_null=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", required=False)
    updated_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", required=False)
    status_display = serializers.SerializerMethodField()
    
    # Verknüpfte Objekte als vollständige Objekte
    patient = serializers.SerializerMethodField()
    treatment = serializers.SerializerMethodField()
    practitioner = serializers.SerializerMethodField()
    
    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}"
        return "Unbekannt"
    
    def get_practitioner_name(self, obj):
        if obj.practitioner:
            return f"{obj.practitioner.first_name} {obj.practitioner.last_name}"
        return "Unbekannt"
    
    def get_patient(self, obj):
        if obj.patient:
            return {
                'id': obj.patient.id,
                'first_name': obj.patient.first_name,
                'last_name': obj.patient.last_name,
                'email': obj.patient.email,
                'phone_number': obj.patient.phone_number
            }
        return None
    
    def get_treatment(self, obj):
        if obj.treatment:
            return {
                'id': obj.treatment.id,
                'treatment_name': obj.treatment.treatment_name,
                'description': obj.treatment.description,
                'duration_minutes': obj.treatment.duration_minutes,
                'is_self_pay': obj.treatment.is_self_pay,
                'self_pay_price': obj.treatment.self_pay_price,
                'legs_code': obj.treatment.legs_code,
                'accounting_code': obj.treatment.accounting_code,
                'tariff_indicator': obj.treatment.tariff_indicator,
                'is_gkv_billable': obj.treatment.is_gkv_billable()
            }
        return None
    
    def get_practitioner(self, obj):
        if obj.practitioner:
            return {
                'id': obj.practitioner.id,
                'first_name': obj.practitioner.first_name,
                'last_name': obj.practitioner.last_name,
                'email': obj.practitioner.email,
                'is_active': obj.practitioner.is_active
            }
        return None
    
    def get_status_display(self, obj):
        status_map = {
            'planned': 'Geplant',
            'confirmed': 'Bestätigt',
            'completed': 'Abgeschlossen',
            'cancelled': 'Storniert',
            'ready_to_bill': 'Abrechnungsbereit',
            'billed': 'Abgerechnet'
        }
        return status_map.get(obj.status, obj.status)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'practitioner', 'practitioner_name',
            'appointment_date', 'status', 'status_display', 'treatment', 'treatment_name',
            'prescription', 'duration_minutes', 'notes', 'room', 'room_name',
            'series_identifier', 'is_recurring', 'created_at', 'updated_at'
        ]

class AppointmentSeriesSerializer(serializers.Serializer):
    prescription_id = serializers.IntegerField()
    start_date = serializers.DateTimeField()  # Einfach als DateTimeField ohne source
    interval_days = serializers.IntegerField(min_value=1)
    preferred_time = serializers.TimeField(required=False, allow_null=True)
    preferred_practitioner = serializers.IntegerField(required=False, allow_null=True)
    preferred_room = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        logger.info(f"Validating appointment series data: {data}")
        try:
            # Überprüfen Sie, ob die Verordnung existiert
            prescription = Prescription.objects.get(id=data['prescription_id'])
            
            # Überprüfen Sie den Therapeuten, falls angegeben
            if data.get('preferred_practitioner'):
                practitioner = Practitioner.objects.filter(
                    id=data['preferred_practitioner'],
                    is_active=True
                ).first()
                if not practitioner:
                    raise serializers.ValidationError({
                        'preferred_practitioner': 'Ungültiger oder inaktiver Therapeut'
                    })

            # Überprüfen Sie den Raum, falls angegeben
            if data.get('preferred_room'):
                room = Room.objects.filter(
                    id=data['preferred_room'],
                    is_active=True
                ).first()
                if not room:
                    raise serializers.ValidationError({
                        'preferred_room': 'Ungültiger oder inaktiver Raum'
                    })

            return data
            
        except Prescription.DoesNotExist:
            raise serializers.ValidationError({
                'prescription_id': 'Verordnung nicht gefunden'
            })
        except Exception as e:
            logger.exception("Fehler bei der Validierung der Terminserie")
            raise serializers.ValidationError(f"Validierungsfehler: {str(e)}")

class BillingCycleSerializer(serializers.ModelSerializer):
    insurance_provider_name = serializers.CharField(source='insurance_provider.name', read_only=True)
    total_insurance_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_patient_copay = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = BillingCycle
        fields = [
            'id', 'insurance_provider', 'insurance_provider_name',
            'start_date', 'end_date', 'status', 'total_amount',
            'total_insurance_amount', 'total_patient_copay'
        ]
        read_only_fields = ['id', 'total_amount', 'total_insurance_amount', 'total_patient_copay']

    def validate(self, data):
        """Validierung der Abrechnungszyklus-Daten"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                "Das Enddatum muss nach dem Startdatum liegen."
            )
        
        # Prüfe auf überlappende Abrechnungszyklen
        insurance_provider = data.get('insurance_provider')
        if insurance_provider and start_date and end_date:
            existing_cycles = BillingCycle.objects.filter(
                insurance_provider=insurance_provider,
                start_date__lte=end_date,
                end_date__gte=start_date
            )
            if self.instance:
                existing_cycles = existing_cycles.exclude(pk=self.instance.pk)
            
            if existing_cycles.exists():
                raise serializers.ValidationError(
                    f"Es existiert bereits ein Abrechnungszyklus für {insurance_provider.name} "
                    f"im Zeitraum {start_date} bis {end_date}."
                )
        
        return data

class PrescriptionSerializer(serializers.ModelSerializer):
    treatment_1 = serializers.PrimaryKeyRelatedField(queryset=Treatment.objects.all())
    treatment_name = serializers.CharField(source='treatment_1.treatment_name', read_only=True)
    treatment = serializers.PrimaryKeyRelatedField(source='treatment_1', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_birth_date = serializers.SerializerMethodField()
    insurance_number = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    treatment_2_name = serializers.CharField(source='treatment_2.treatment_name', read_only=True, allow_null=True)
    treatment_3_name = serializers.CharField(source='treatment_3.treatment_name', read_only=True, allow_null=True)
    all_treatment_names = serializers.SerializerMethodField()
    insurance_provider_name = serializers.SerializerMethodField()
    diagnosis_code_display = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_birth_date',
            'insurance_number',
            'doctor',
            'doctor_name',
            'treatment_1',
            'treatment_name',
            'treatment',
            'treatment_2',
            'treatment_2_name',
            'treatment_3',
            'treatment_3_name',
            'all_treatment_names',
            'diagnosis_code',
            'diagnosis_code_display',
            'patient_insurance',
            'insurance_provider_name',
            'status',
            'therapy_frequency_type',
            'created_at',
            'updated_at',
            'number_of_sessions',
            'sessions_completed',
            'therapy_goals',
            'is_urgent',
            'requires_home_visit',
            'therapy_report_required',
            'prescription_date'
        ]

    def validate_treatment_1(self, value):
        if not value:
            raise serializers.ValidationError("Eine Behandlung muss ausgewählt werden")
        return value

    def validate(self, data):
        if not data.get('treatment_1'):
            raise serializers.ValidationError({
                'treatment_1': 'Eine Behandlung muss ausgewählt werden'
            })
        return data

    def get_patient_name(self, obj):
        try:
            if obj.patient:
                return f"{obj.patient.first_name} {obj.patient.last_name}"
            return ""
        except Exception as e:
            print(f"Error in get_patient_name: {str(e)}")
            return ""

    def get_patient_birth_date(self, obj):
        try:
            if obj.patient and obj.patient.dob:
                return obj.patient.dob.strftime('%d.%m.%Y')
            return ""
        except Exception as e:
            print(f"Error in get_patient_birth_date: {str(e)}")
            return ""

    def get_insurance_number(self, obj):
        try:
            if obj.patient_insurance:
                return obj.patient_insurance.insurance_number
            # Alternativ: Hole die aktuelle gültige Versicherung
            current_insurance = PatientInsurance.get_valid_insurance(
                patient=obj.patient,
                date=obj.prescription_date or timezone.now().date()
            )
            return current_insurance.insurance_number if current_insurance else "-"
        except Exception as e:
            print(f"Error in get_insurance_number: {str(e)}")
            return "-"

    def get_doctor_name(self, obj):
        try:
            if obj.doctor:
                return f"{obj.doctor.first_name} {obj.doctor.last_name}"
            return ""
        except Exception as e:
            print(f"Error in get_doctor_name: {str(e)}")
            return ""

    def get_all_treatment_names(self, obj):
        """Gibt alle Behandlungsnamen als komma-separierte Liste zurück"""
        return ', '.join(filter(None, obj.get_treatment_names()))

    def get_insurance_provider_name(self, obj):
        try:
            if obj.patient_insurance and obj.patient_insurance.insurance_provider:
                return obj.patient_insurance.insurance_provider.name
            return ""
        except Exception as e:
            print(f"Error in get_insurance_provider_name: {str(e)}")
            return ""

    def get_diagnosis_code_display(self, obj):
        try:
            if obj.diagnosis_code:
                return f"{obj.diagnosis_code.code} - {obj.diagnosis_code.title}"
            return ""
        except Exception as e:
            print(f"Error in get_diagnosis_code_display: {str(e)}")
            return ""

class TreatmentSerializer(serializers.ModelSerializer):
    legs_code_display = serializers.CharField(source='get_legs_code_display', read_only=True)
    is_gkv_billable = serializers.BooleanField(read_only=True)
    billing_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Treatment
        fields = [
            'id', 'treatment_name', 'description', 'duration_minutes', 'category',
            'position_number', 'is_self_pay', 'self_pay_price',
            # LEGS-Code Felder
            'legs_code', 'accounting_code', 'tariff_indicator', 'legs_code_display',
            'prescription_type_indicator', 'is_telemedicine', 'is_gkv_billable',
            'billing_info',
            'created_at', 'updated_at'
        ]
    
    def get_billing_info(self, obj):
        return obj.get_billing_info()

class SurchargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Surcharge
        fields = '__all__'

class DiagnosisGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisGroup
        fields = '__all__'

class PracticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Practice
        fields = [
            'id',
            'name',
            'owner_name',
            'street_address',
            'postal_code',
            'city',
            'phone',
            'email',
            'website',
            'institution_code',
            'tax_id',
            'bundesland',
            'opening_hours',
            'bank_details',
            'calendar_settings',
            'notification_settings',
            'invoice_settings'
        ]
        read_only_fields = ['id']

    def validate_opening_hours(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Öffnungszeiten müssen ein JSON-Objekt sein")
        return value

    def validate_bank_details(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Bankdaten müssen ein JSON-Objekt sein")
        return value

    def validate_calendar_settings(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Kalendereinstellungen müssen ein JSON-Objekt sein")
        return value

    def validate_notification_settings(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Benachrichtigungseinstellungen müssen ein JSON-Objekt sein")
        return value

    def validate_invoice_settings(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Rechnungseinstellungen müssen ein JSON-Objekt sein")
        return value

class BillingItemSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    treatment_name = serializers.CharField(source='treatment.treatment_name')
    appointment_date = serializers.DateTimeField(source='appointment.appointment_date')
    insurance_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    patient_copay = serializers.DecimalField(max_digits=10, decimal_places=2)

    def get_patient_name(self, obj):
        if obj.prescription and obj.prescription.patient:
            return f"{obj.prescription.patient.first_name} {obj.prescription.patient.last_name}"
        elif obj.appointment and obj.appointment.patient:
            return f"{obj.appointment.patient.first_name} {obj.appointment.patient.last_name}"
        return "Unbekannt"

    class Meta:
        model = BillingItem
        fields = [
            'id',
            'patient_name',
            'treatment_name',
            'appointment_date',
            'insurance_amount',
            'patient_copay'
        ]

class RaetselSerializer(serializers.ModelSerializer):
    class Meta:
        model = Raetsel
        fields = ['id', 'name', 'gitterbreite', 'erstellt_am', 'aktiv', 'gitter']
        read_only_fields = ['id', 'erstellt_am']

class AbsenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Absence
        fields = '__all__'

class LocalHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalHoliday
        fields = '__all__'

class WaitlistSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    treatment_name = serializers.CharField(source='treatment.treatment_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.get_full_name', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Waitlist
        fields = [
            'id', 'patient', 'patient_name', 'treatment', 'treatment_name',
            'practitioner', 'practitioner_name', 'prescription', 'available_from',
            'available_until', 'priority', 'priority_display', 'status', 'status_display',
            'original_appointment', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validierung der Wartelisten-Daten"""
        available_from = data.get('available_from')
        available_until = data.get('available_until')
        
        if available_from and available_until and available_from >= available_until:
            raise serializers.ValidationError(
                "Verfügbar bis muss nach Verfügbar ab liegen."
            )
        
        return data

class PaymentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    invoice_reference = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_date', 'amount', 'payment_method', 'payment_method_display',
            'payment_type', 'payment_type_display', 'reference_number', 'transaction_id',
            'is_confirmed', 'notes', 'patient_name', 'invoice_reference',
            'patient_invoice', 'copay_invoice', 'private_invoice',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_patient_name(self, obj):
        patient = obj.get_patient()
        return str(patient) if patient else None
    
    def get_invoice_reference(self, obj):
        return obj.get_invoice_reference()
    
    def create(self, validated_data):
        # Setze den aktuellen Benutzer als created_by
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

