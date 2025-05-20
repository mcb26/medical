from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging
from datetime import datetime
from django.utils.timezone import make_aware

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
    LocalHoliday,
    WorkingHour,
    Practice,
    BillingItem,
    Raetsel
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

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True}}

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

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'

class PatientInsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientInsurance
        fields = '__all__'

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
        specializations_data = validated_data.pop('specializations')
        doctor = Doctor.objects.create(**validated_data)
        doctor.specializations.set(specializations_data)
        return doctor

class PractitionerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Practitioner
        fields = ['id', 'first_name', 'last_name', 'is_active']

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
    patient_name = serializers.CharField(source='patient.__str__', read_only=True)
    treatment_name = serializers.CharField(source='treatment.treatment_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.__str__', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), required=False, allow_null=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", required=False)
    updated_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", required=False)

    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient',
            'patient_name',
            'practitioner',
            'practitioner_name',
            'treatment',
            'treatment_name',
            'prescription',
            'appointment_date',
            'duration_minutes',
            'status',
            'notes',
            'room',
            'room_name',
            'series_identifier',
            'is_recurring',
            'created_at',
            'updated_at'
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
    
    class Meta:
        model = BillingCycle
        fields = [
            'id', 'insurance_provider', 'insurance_provider_name',
            'start_date', 'end_date', 'status', 'total_amount'
        ]

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_birth_date = serializers.SerializerMethodField()
    insurance_number = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    treatment_1_name = serializers.CharField(source='treatment_1.treatment_name', read_only=True)
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
            'treatment_1_name',
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

class WorkingHourSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkingHour
        fields = '__all__'

class TreatmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Treatment
        fields = '__all__'

class SurchargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Surcharge
        fields = '__all__'

class DiagnosisGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisGroup
        fields = '__all__'

class LocalHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalHoliday
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
    patient_name = serializers.CharField(source='prescription.patient.last_name')
    treatment_name = serializers.CharField(source='treatment.treatment_name')
    appointment_date = serializers.DateTimeField(source='appointment.appointment_date')
    insurance_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    patient_copay = serializers.DecimalField(max_digits=10, decimal_places=2)

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