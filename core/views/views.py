from datetime import datetime, timedelta, time
from django.forms import ValidationError
from rest_framework import viewsets, status, filters, permissions, serializers
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging
import traceback
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.utils.timezone import make_aware
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils.decorators import method_decorator
from django.utils.dateparse import parse_date
from django.db import models
from core.models import (
    Prescription,
    Appointment,
    Practice,
    Practitioner,
    Room,
    WorkingHour,
    Absence,
    Waitlist,
    LocalHoliday,
    TreatmentType,
    PriceList,
    TreatmentPrice,
    UserPreference,
    AuditLog
)
from core.serializers import AppointmentSerializer, AbsenceSerializer, WaitlistSerializer, LocalHolidaySerializer, DataProtectionConsentSerializer, TreatmentTypeSerializer, PriceListSerializer, TreatmentPriceSerializer, UserPreferenceSerializer, AuditLogSerializer, UserInitialsSerializer

from core.services.billing_service import BillingService
from core.services.propose_and_create_appointments import is_practitioner_available, is_room_available, is_within_practice_hours, propose_and_create_appointments

from core.services.appointment_series import create_appointment_series, AppointmentSeriesService
from core.services.prescription_series_service import PrescriptionSeriesService
try:
    from core.services.ocr_service import OCRService
except ImportError:
    OCRService = None
from core.services.performance_service import PerformanceService, QueryOptimizer, CacheOptimizer
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import tempfile
from ..models import (
    Bundesland,
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
    Appointment,
    WorkingHour,
    Practice,
    BillingItem,
    Payment,
    DataProtectionConsent
)
from ..serializers import (
    BundeslandSerializer,
    CalendarSettingsSerializer,
    ICDCodeSerializer,
    UserSerializer,
    InsuranceProviderGroupSerializer,
    InsuranceProviderSerializer,
    PatientSerializer,
    PatientInsuranceSerializer,
    EmergencyContactSerializer,
    DoctorSerializer,
    RoomSerializer,
    PractitionerSerializer,
    SpecializationSerializer,
    PracticeSettingsSerializer,
    CategorySerializer,
    TreatmentSerializer,
    SurchargeSerializer,
    BillingCycleSerializer,
    DiagnosisGroupSerializer,
    PrescriptionSerializer,
    AppointmentSerializer,
    AppointmentSeriesSerializer,
    WorkingHourSerializer,
    PracticeSerializer,
    BillingItemSerializer,
    PaymentSerializer
)
from core.appointment_validators import (
    validate_working_hours,
    validate_conflict_for_appointment
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.views.generic import TemplateView
from django.db import connection

logger = logging.getLogger(__name__)

class BundeslandViewSet(viewsets.ModelViewSet):
    queryset = Bundesland.objects.all()
    serializer_class = BundeslandSerializer

class CalendarSettingsViewSet(viewsets.ModelViewSet):
    queryset = CalendarSettings.objects.all()
    serializer_class = CalendarSettingsSerializer

class ICDCodeViewSet(viewsets.ModelViewSet):
    queryset = ICDCode.objects.all()
    serializer_class = ICDCodeSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class InsuranceProviderGroupViewSet(viewsets.ModelViewSet):
    queryset = InsuranceProviderGroup.objects.all()
    serializer_class = InsuranceProviderGroupSerializer

class InsuranceProviderViewSet(viewsets.ModelViewSet):
    queryset = InsuranceProvider.objects.all()
    serializer_class = InsuranceProviderSerializer

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtert Patienten nach Benutzerberechtigungen mit optimierten Queries"""
        user = self.request.user
        
        # Basis-Query mit prefetch_related für optimierte Performance
        base_queryset = Patient.objects.prefetch_related(
            'insurances__insurance_provider'
        )
        
        # Wenn der Benutzer ein Admin/Superuser ist, zeige alle Patienten
        if user.is_superuser or user.is_admin:
            return base_queryset
            
        # Wenn der Benutzer ein Therapeut ist, zeige nur seine Patienten
        if user.is_therapist:
            # Finde den Practitioner, der diesem User entspricht
            practitioner = Practitioner.objects.filter(
                first_name=user.first_name,
                last_name=user.last_name
            ).first()
            if practitioner:
                # Finde alle Patienten, die Termine bei diesem Practitioner haben
                appointments = Appointment.objects.filter(practitioner=practitioner)
                patient_ids = appointments.values_list('patient_id', flat=True).distinct()
                return base_queryset.filter(id__in=patient_ids)
            else:
                return Patient.objects.none()
                
        # Für normale Benutzer (Verwaltung) zeige alle Patienten
        return base_queryset

    @action(detail=True, methods=['get'])
    def appointments(self, request, pk=None):
        """
        Liste aller Termine eines Patienten mit optimierten Queries
        """
        patient = self.get_object()
        appointments = Appointment.objects.filter(patient=patient).select_related(
            'practitioner',
            'treatment',
            'room',
            'prescription__treatment_1',
            'prescription__treatment_2',
            'prescription__treatment_3',
            'prescription__doctor',
            'prescription__diagnosis_code'
        ).prefetch_related(
            'billing_items'
        )
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='consents')
    def consents(self, request, pk=None):
        """Liste an Einwilligungen eines Patienten oder neue Einwilligung erstellen"""
        patient = self.get_object()
        if request.method == 'GET':
            consents = DataProtectionConsent.objects.filter(patient=patient).order_by('-consent_date')
            return Response(DataProtectionConsentSerializer(consents, many=True).data)
        else:
            serializer = DataProtectionConsentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(patient=patient)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class PatientInsuranceViewSet(viewsets.ModelViewSet):
    queryset = PatientInsurance.objects.all()
    serializer_class = PatientInsuranceSerializer

class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    
    def get_queryset(self):
        """Filtert inaktive Räume aus, wenn nicht explizit angefordert"""
        queryset = Room.objects.all()
        show_inactive = self.request.query_params.get('show_inactive', False)
        if not show_inactive:
            queryset = queryset.filter(is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Fehler in RoomViewSet.list: {str(e)}")
            return Response(
                {"error": "Fehler beim Laden der Räume"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PractitionerViewSet(viewsets.ModelViewSet):
    serializer_class = PractitionerSerializer

    def get_queryset(self):
        """Optional: Überschreiben für zusätzliche Filterung"""
        return Practitioner.objects.filter(is_active=True).order_by('first_name', 'last_name')
    
    @action(detail=True, methods=['get'])
    def working_hours(self, request, pk=None):
        """Hole die Arbeitszeiten für einen spezifischen Behandler"""
        try:
            practitioner = self.get_object()
            working_hours = WorkingHour.objects.filter(practitioner=practitioner)
            serializer = WorkingHourSerializer(working_hours, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Fehler beim Laden der Arbeitszeiten: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SpecializationViewSet(viewsets.ModelViewSet):
    queryset = Specialization.objects.all()
    serializer_class = SpecializationSerializer

class PracticeSettingsViewSet(viewsets.ModelViewSet):
    queryset = PracticeSettings.objects.all()
    serializer_class = PracticeSettingsSerializer

class TreatmentViewSet(viewsets.ModelViewSet):
    queryset = Treatment.objects.all()
    serializer_class = TreatmentSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        active_treatments = self.get_queryset().filter(is_self_pay=False)
        serializer = self.get_serializer(active_treatments, many=True)
        return Response(serializer.data)

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtert Termine nach Benutzerberechtigungen mit optimierten Queries"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Verwende QueryOptimizer für optimierte Queries
        queryset = QueryOptimizer.optimize_appointment_queryset(queryset)

        # Wenn der Benutzer ein Admin/Superuser ist, zeige alle Termine
        if user.is_superuser or user.is_admin:
            return queryset
            
        # Wenn der Benutzer ein Therapeut ist, zeige nur seine eigenen Termine
        if user.is_therapist:
            # Hier müssen wir den Practitioner finden, der diesem User entspricht
            # Da wir keine direkte Verknüpfung haben, suchen wir nach Namen
            practitioner = Practitioner.objects.filter(
                first_name=user.first_name,
                last_name=user.last_name
            ).first()
            if practitioner:
                return queryset.filter(practitioner=practitioner)
            
        # Für normale Benutzer (Verwaltung) zeige alle Termine
        return queryset

    def list(self, request, *args, **kwargs):
        """Erweiterte Liste mit Filterung nach series_identifier"""
        queryset = self.get_queryset()
        
        # Filter nach series_identifier
        series_identifier = request.query_params.get('series_identifier')
        if series_identifier:
            queryset = queryset.filter(series_identifier=series_identifier)
        
        # Expand Parameter verarbeiten
        expand = request.query_params.get('expand', '')
        if expand:
            expand_fields = expand.split(',')
            if 'patient' in expand_fields:
                queryset = queryset.select_related('patient')
            if 'practitioner' in expand_fields:
                queryset = queryset.select_related('practitioner')
            if 'treatment' in expand_fields:
                queryset = queryset.select_related('treatment')
            if 'room' in expand_fields:
                queryset = queryset.select_related('room')
            if 'prescription' in expand_fields:
                queryset = queryset.select_related('prescription')
        
        # Sortierung nach Datum
        queryset = queryset.order_by('appointment_date')
        
        try:
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"Error in AppointmentViewSet.list: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Fehler beim Laden der Termine: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def create_series(self, request):
        try:
            logger.info(f"Received data for create_series: {request.data}")
            
            if 'prescription_id' not in request.data or 'start_date' not in request.data:
                return Response(
                    {"error": "Verordnung und Startdatum sind erforderlich"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                prescription = Prescription.objects.get(id=request.data['prescription_id'])
            except Prescription.DoesNotExist:
                return Response(
                    {"error": "Verordnung nicht gefunden"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Validiere die Behandlungsdauer
            treatments = Treatment.objects.filter(id=prescription.treatment_1)
            if not treatments.exists():
                return Response(
                    {"error": "Keine gültige Behandlung gefunden"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            treatment = treatments[0]
            duration_minutes = treatment.duration_minutes
            if not duration_minutes:
                return Response(
                    {"error": "Keine gültige Behandlungsdauer gefunden"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # DateTime-Objekt erstellen
            date_str = request.data['start_date']
            time_str = request.data.get('appointment_time', '09:00')  # Standard: 9 Uhr
            start_datetime_str = f"{date_str}T{time_str}"
            
            try:
                appointment_datetime = make_aware(datetime.fromisoformat(start_datetime_str))
            except ValueError:
                return Response(
                    {"error": "Ungültiges Datum oder Zeitformat"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            interval_days = int(request.data.get('interval_days', 7))
            number_of_appointments = int(request.data.get('number_of_appointments', 1))
            preferred_practitioner_id = request.data.get('preferred_practitioner')
            preferred_room_id = request.data.get('preferred_room')

            appointments = []
            current_datetime = appointment_datetime

            for i in range(number_of_appointments):
                try:
                    appointment = Appointment.objects.create(
                        prescription=prescription,
                        patient=prescription.patient,
                        treatment=prescription.treatment,
                        practitioner_id=preferred_practitioner_id,
                        room_id=preferred_room_id,
                        appointment_date=current_datetime,
                        duration_minutes=duration_minutes,
                        status='Geplant',
                        is_recurring=True
                    )
                    appointments.append(appointment)
                    current_datetime += timedelta(days=interval_days)
                except Exception as e:
                    logger.error(f"Fehler beim Erstellen des Termins {i+1}: {str(e)}")
                    for app in appointments:
                        app.delete()
                    raise

            if prescription.status == 'Open':
                prescription.status = 'In_Progress'
                prescription.save()

            serializer = AppointmentSerializer(appointments, many=True)
            return Response({
                'message': f'{len(appointments)} Termine wurden erfolgreich erstellt',
                'appointments': serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Fehler in create_series: {str(e)}\n{traceback.format_exc()}")
            return Response(
                {"error": f"Fehler beim Erstellen der Terminserie: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        """Zusätzliche Validierung beim Erstellen eines Termins"""
        try:
            serializer.save()
        except Exception as e:
            logger.error(f"Fehler beim Erstellen des Termins: {str(e)}")
            raise serializers.ValidationError(str(e))

    @action(detail=False, methods=['post'], url_path='create_series')
    def create_appointment_series(self, request):
        """Erstellt eine Terminserie mit dem PrescriptionSeriesService"""
        try:
            prescription_id = request.data.get('prescription')
            start_date = datetime.fromisoformat(request.data.get('start_date').replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(request.data.get('end_date').replace('Z', '+00:00'))
            practitioner_id = request.data.get('practitioner')
            room_id = request.data.get('room')
            frequency = request.data.get('frequency', 'weekly_1')
            duration_minutes = request.data.get('duration_minutes', 30)
            notes = request.data.get('notes', '')

            prescription = Prescription.objects.get(id=prescription_id)
            practitioner = Practitioner.objects.get(id=practitioner_id)
            room = Room.objects.get(id=room_id) if room_id else None

            series_identifier, appointments = PrescriptionSeriesService.create_appointment_series(
                prescription=prescription,
                start_date=start_date,
                end_date=end_date,
                practitioner=practitioner,
                room=room,
                frequency=frequency,
                duration_minutes=duration_minutes,
                notes=notes
            )

            serializer = AppointmentSerializer(appointments, many=True)
            return Response({
                'series_identifier': series_identifier,
                'appointments': serializer.data,
                'message': f'Terminserie erfolgreich erstellt: {len(appointments)} Termine'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Fehler beim Erstellen der Terminserie: {str(e)}")
            return Response(
                {'error': f'Fehler beim Erstellen der Terminserie: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='extend_series')
    def extend_appointment_series(self, request):
        """Verlängert eine bestehende Terminserie"""
        try:
            prescription_id = request.data.get('prescription')
            additional_sessions = request.data.get('additional_sessions')
            practitioner_id = request.data.get('practitioner')
            room_id = request.data.get('room')
            frequency = request.data.get('frequency')
            duration_minutes = request.data.get('duration_minutes')
            notes = request.data.get('notes', '')

            prescription = Prescription.objects.get(id=prescription_id)
            practitioner = Practitioner.objects.get(id=practitioner_id) if practitioner_id else None
            room = Room.objects.get(id=room_id) if room_id else None

            new_appointments = PrescriptionSeriesService.extend_appointment_series(
                prescription=prescription,
                additional_sessions=additional_sessions,
                practitioner=practitioner,
                room=room,
                frequency=frequency,
                duration_minutes=duration_minutes,
                notes=notes
            )

            serializer = AppointmentSerializer(new_appointments, many=True)
            return Response({
                'appointments': serializer.data,
                'message': f'Serie erfolgreich verlängert: {len(new_appointments)} neue Termine'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Fehler beim Verlängern der Terminserie: {str(e)}")
            return Response(
                {'error': f'Fehler beim Verlängern der Terminserie: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='cancel_series/(?P<series_identifier>[^/.]+)')
    def cancel_series(self, request, series_identifier, pk=None):
        """Storniert alle zukünftigen Termine einer Serie"""
        try:
            cancelled_count = PrescriptionSeriesService.cancel_series(series_identifier)
            return Response({
                'message': f'{cancelled_count} Termine wurden storniert',
                'cancelled_count': cancelled_count
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Fehler beim Stornieren der Serie: {str(e)}")
            return Response(
                {'error': f'Fehler beim Stornieren der Serie: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='series/(?P<series_identifier>[^/.]+)')
    def get_series_info(self, request, series_identifier):
        """Gibt Informationen über eine Terminserie zurück"""
        try:
            series_info = PrescriptionSeriesService.get_series_info(series_identifier)
            return Response(series_info, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Fehler beim Laden der Serien-Informationen: {str(e)}")
            return Response(
                {'error': f'Fehler beim Laden der Serien-Informationen: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

class SurchargeViewSet(viewsets.ModelViewSet):
    queryset = Surcharge.objects.all()
    serializer_class = SurchargeSerializer

class BillingCycleViewSet(viewsets.ModelViewSet):
    queryset = BillingCycle.objects.all()
    serializer_class = BillingCycleSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request):
        """
        Erstellt mehrere Abrechnungszeiträume auf einmal.
        """
        try:
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            insurance_providers = request.data.get('insurance_providers', [])

            created_cycles = []
            for provider_id in insurance_providers:
                cycle = BillingCycle.objects.create(
                    insurance_provider_id=provider_id,
                    start_date=start_date,
                    end_date=end_date,
                    status='draft'
                )
                created_cycles.append(cycle)

            serializer = self.get_serializer(created_cycles, many=True)
            return Response(
                {'message': f'{len(created_cycles)} Abrechnungszeiträume erstellt',
                 'billing_cycles': serializer.data},
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.error(f"Fehler in bulk_create: {str(e)}")
            return Response(
                {'error': f"Fehler beim Erstellen der Abrechnungszeiträume: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='create')
    def create_cycle(self, request):
        """
        Erstellt einen neuen Abrechnungszeitraum.
        """
        insurance_provider = InsuranceProvider.objects.get(id=request.data['insurance_provider'])
        start_date = request.data['start_date']
        end_date = request.data['end_date']
        billing_cycle = BillingService.create_billing_cycle(insurance_provider, start_date, end_date)
        return Response({"id": billing_cycle.id, "total_amount": billing_cycle.total_amount})

    @action(detail=True, methods=['get'], url_path='report')
    def generate_report(self, request, pk=None):
        """
        Generiert einen Abrechnungsbericht für einen Abrechnungszeitraum.
        """
        billing_cycle = self.get_object()
        report = BillingService.generate_billing_report(billing_cycle)
        return Response(report)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Gibt alle BillingItems für einen BillingCycle zurück"""
        try:
            billing_cycle = self.get_object()
            items = BillingItem.objects.filter(
                billing_cycle=billing_cycle
            ).select_related(
                'prescription__patient',
                'appointment',
                'treatment'
            )
            serializer = BillingItemSerializer(items, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Fehler beim Abrufen der BillingItems: {str(e)}")
            return Response(
                {"error": "Fehler beim Laden der Abrechnungspositionen"}, 
                status=400
            )

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        try:
            billing_cycle = self.get_object()
            billing_items = BillingItem.objects.filter(billing_cycle=billing_cycle)

            # PDF erstellen
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            elements = []
            
            # Styles
            styles = getSampleStyleSheet()
            title_style = styles['Heading1']
            
            # Titel
            elements.append(Paragraph(f"Abrechnung - {billing_cycle.insurance_provider.name}", title_style))
            elements.append(Paragraph(
                f"Zeitraum: {billing_cycle.start_date.strftime('%d.%m.%Y')} - {billing_cycle.end_date.strftime('%d.%m.%Y')}", 
                styles['Normal']
            ))
            
            # Tabellendaten
            data = [['Datum', 'Patient', 'Behandlung', 'Betrag KK', 'Zuzahlung']]
            for item in billing_items:
                data.append([
                    item.appointment.appointment_date.strftime('%d.%m.%Y'),
                    f"{item.prescription.patient.first_name} {item.prescription.patient.last_name}",
                    item.treatment.treatment_name,
                    f"{item.insurance_amount:.2f} €",
                    f"{item.patient_copay:.2f} €"
                ])
            
            # Gesamtsumme
            data.append(['', '', 'Gesamtbetrag:', f"{billing_cycle.total_amount:.2f} €", ''])
            
            # Tabelle erstellen
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(table)
            
            # PDF generieren
            doc.build(elements)
            
            # Response vorbereiten
            buffer.seek(0)
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Abrechnung_{billing_cycle.id}.pdf"'
            
            # Status auf 'exported' setzen
            billing_cycle.status = 'exported'
            billing_cycle.save()
            
            return response

        except Exception as e:
            logger.error(f"Fehler beim PDF-Export: {str(e)}")
            return Response(
                {'error': 'Fehler beim Erstellen des PDF-Exports'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Überschreibt die Standard-Queryset mit zusätzlichen Joins und Benutzerberechtigungen
        """
        user = self.request.user
        
        # Wenn der Benutzer ein Admin/Superuser ist, zeige alle Verordnungen
        if user.is_superuser or user.is_admin:
            queryset = Prescription.objects.all()
        # Wenn der Benutzer ein Therapeut ist, zeige nur Verordnungen seiner Patienten
        elif user.is_therapist:
            # Finde den Practitioner, der diesem User entspricht
            practitioner = Practitioner.objects.filter(
                first_name=user.first_name,
                last_name=user.last_name
            ).first()
            if practitioner:
                # Finde alle Termine dieses Practitioners und deren Verordnungen
                appointments = Appointment.objects.filter(practitioner=practitioner)
                prescription_ids = appointments.values_list('prescription_id', flat=True).distinct()
                queryset = Prescription.objects.filter(id__in=prescription_ids)
            else:
                queryset = Prescription.objects.none()
        # Für normale Benutzer (Verwaltung) zeige alle Verordnungen
        else:
            queryset = Prescription.objects.all()
        
        # Verwende QueryOptimizer für optimierte Queries
        queryset = QueryOptimizer.optimize_prescription_queryset(queryset)
        
        # Optionale Filter hier...
        patient_id = self.request.query_params.get('patient_id', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in PrescriptionViewSet.list: {str(e)}")
            return Response(
                {"detail": "Ein Fehler ist aufgetreten beim Laden der Verordnungen."},
                status=500
            )

    def retrieve(self, request, *args, **kwargs):
        """Überschreibe retrieve-Methode für bessere Fehlerbehandlung"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Fehler in PrescriptionViewSet.retrieve: {str(e)}")
            return Response(
                {'error': 'Fehler beim Laden der Verordnung'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Request Data: {request.data}")
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in PrescriptionViewSet.create: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def create_follow_up(self, request, pk=None):
        """Erstellt eine Folgeverordnung"""
        try:
            prescription = self.get_object()
            
            # Prüfe ob eine Folgeverordnung erstellt werden kann
            if not prescription.can_create_follow_up():
                return Response(
                    {'error': 'Diese Verordnung kann nicht verlängert werden.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Erstelle Folgeverordnung
            follow_up_data = request.data.copy()
            follow_up_prescription = prescription.create_follow_up_prescription(**follow_up_data)
            
            serializer = self.get_serializer(follow_up_prescription)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Fehler beim Erstellen der Folgeverordnung: {str(e)}")
            return Response(
                {'error': f'Fehler beim Erstellen der Folgeverordnung: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def follow_ups(self, request, pk=None):
        """Gibt alle Folgeverordnungen zurück"""
        try:
            prescription = self.get_object()
            follow_ups = prescription.get_all_follow_ups()
            serializer = self.get_serializer(follow_ups, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Fehler beim Laden der Folgeverordnungen: {str(e)}")
            return Response(
                {'error': f'Fehler beim Laden der Folgeverordnungen: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class WorkingHourViewSet(viewsets.ModelViewSet):
    queryset = WorkingHour.objects.all()
    serializer_class = WorkingHourSerializer

class CalendarSettingsView(RetrieveUpdateAPIView):
    queryset = CalendarSettings.objects.all()
    serializer_class = CalendarSettingsSerializer

    def get_object(self):
        # Assuming there's only one settings instance
        return CalendarSettings.objects.first()

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)

class CreateAppointmentsFromPrescriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, prescription_id):
        """
        Create appointments based on the prescription.
        """
        try:
            result = propose_and_create_appointments(prescription_id)
            return Response({"success": True, "message": "Appointments created successfully!", "details": result}, status=201)
        except Exception as e:
            return Response({"success": False, "message": str(e)}, status=400)

class PatientDemographicsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        patients = Patient.objects.all()
        average_age = patients.aggregate_avg('age')  # Beispiel, abhängig von deinem Modell
        gender_ratio = {
            'male': patients.filter(gender='male').count(),
            'female': patients.filter(gender='female').count()
        }
        common_conditions = ['Diabetes', 'Arthritis']  # Beispiel
        return Response({
            'average_age': average_age,
            'gender_ratio': gender_ratio,
            'common_conditions': common_conditions
        })

class TreatmentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        success_rate = 85  # Beispiel
        common_treatments = ['Physiotherapie', 'Ergotherapie']  # Beispiel
        avg_duration = 6  # in Monaten
        return Response({
            'success_rate': success_rate,
            'common_treatments': common_treatments,
            'avg_duration': avg_duration
        })

class AppointmentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        avg_appointments = 10  # Beispiel
        no_show_rate = 5  # in Prozent
        satisfaction_rate = 90  # in Prozent
        return Response({
            'avg_appointments': avg_appointments,
            'no_show_rate': no_show_rate,
            'satisfaction_rate': satisfaction_rate
        })

@method_decorator(staff_member_required, name='dispatch')
class GenerateAppointmentsPreviewView(TemplateView):
    template_name = 'admin/prescription/preview_series.html'

    def get(self, request, prescription_id, *args, **kwargs):
        prescription = get_object_or_404(Prescription, id=prescription_id)
        
        # Lade aktive Behandler und Räume
        practitioners = Practitioner.objects.filter(is_active=True)
        rooms = Room.objects.filter(is_active=True)
        
        # Generiere Terminvorschläge
        proposed_appointments = []
        start_date = timezone.now().date()
        default_time = time(9, 44)
        
        for i in range(prescription.number_of_sessions):
            current_date = start_date + timedelta(days=i*7)
            proposed_appointments.append({
                'proposed_datetime': make_aware(datetime.combine(current_date, default_time)),
                'practitioner': None,  # Wird vom Benutzer ausgewählt
                'room': None,  # Wird vom Benutzer ausgewählt
                'is_available': True
            })
        
        context = {
            'title': 'Terminvorschläge prüfen',
            'prescription': prescription,
            'practitioners': practitioners,
            'rooms': rooms,
            'appointments': proposed_appointments,
        }
        
        return render(request, self.template_name, context)

    def post(self, request, prescription_id, *args, **kwargs):
        prescription = get_object_or_404(Prescription, id=prescription_id)
        
        # Verarbeite die ausgewählten Termine
        appointments_data = []
        for i in range(prescription.number_of_sessions):
            datetime_str = request.POST.get(f'datetime_{i}')
            practitioner_id = request.POST.get(f'practitioner_{i}')
            room_id = request.POST.get(f'room_{i}')
            
            if datetime_str and practitioner_id and room_id:
                appointments_data.append({
                    'datetime': datetime_str,
                    'practitioner_id': practitioner_id,
                    'room_id': room_id
                })
        
        # Erstelle die Termine
        try:
            service = AppointmentSeriesService()
            appointments = service.create_series(prescription_id, {
                'appointments': appointments_data
            })
            
            messages.success(request, f'{len(appointments)} Termine wurden erfolgreich erstellt.')
            return redirect('admin:core_prescription_changelist')
            
        except Exception as e:
            messages.error(request, f'Fehler beim Erstellen der Termine: {str(e)}')
            return self.get(request, prescription_id, *args, **kwargs)

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            now = timezone.now()
            month_ago = now - timedelta(days=30)
            
            # Patienten-Statistiken
            patient_stats = {
                'total': Patient.objects.count(),
                'newThisMonth': Patient.objects.filter(created_at__gte=month_ago).count(),
            }

            # Termin-Statistiken
            appointment_stats = {
                'total': Appointment.objects.count(),
                'upcoming': Appointment.objects.filter(appointment_date__gte=now).count(),
                'thisWeek': Appointment.objects.filter(
                    appointment_date__range=(now, now + timedelta(days=7))
                ).count(),
                'noShowRate': self._calculate_no_show_rate()
            }

            # Behandlungs-Statistiken
            treatment_stats = {
                'total': Treatment.objects.count(),
                'mostCommon': self._get_most_common_treatments()
            }

            # Finanz-Statistiken
            finance_stats = self._get_finance_stats()

            # Rezept-Statistiken
            prescription_stats = {
                'total': Prescription.objects.count(),
                'pending': Prescription.objects.filter(status='open').count()
            }

            # Versicherungsgruppen-Statistiken
            insurance_stats = {
                'total': InsuranceProviderGroup.objects.count(),
                'distribution': self._get_insurance_distribution()
            }

            return Response({
                'patients': patient_stats,
                'appointments': appointment_stats,
                'treatments': treatment_stats,
                'finances': finance_stats,
                'prescriptions': prescription_stats,
                'insuranceGroups': insurance_stats
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _calculate_no_show_rate(self):
        total = Appointment.objects.filter(appointment_date__lt=timezone.now()).count()
        if total == 0:
            return 0
        no_shows = Appointment.objects.filter(
            appointment_date__lt=timezone.now(),
            status='no_show'
        ).count()
        return round((no_shows / total) * 100, 2)

    def _get_most_common_treatments(self):
        treatments = Appointment.objects.values('treatment__treatment_name')\
            .annotate(count=Count('id'))\
            .order_by('-count')[:5]
        return {item['treatment__treatment_name']: item['count'] for item in treatments if item['treatment__treatment_name']}

    def _get_insurance_distribution(self):
        distribution = (
            Patient.objects.values('insurances__insurance_provider__name')
            .annotate(count=Count('id'))
            .filter(insurances__insurance_provider__name__isnull=False)
        )
        return {
            item['insurances__insurance_provider__name']: item['count'] 
            for item in distribution
        }

    def _get_finance_stats(self):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        
        # Verwende BillingItems für Finanzstatistiken
        current_month_revenue = BillingItem.objects.filter(
            created_at__gte=month_start
        ).aggregate(total=Sum('insurance_amount'))['total'] or 0
        
        last_month_revenue = BillingItem.objects.filter(
            created_at__range=(last_month_start, month_start)
        ).aggregate(total=Sum('insurance_amount'))['total'] or 0
        
        outstanding_amount = BillingItem.objects.filter(
            is_billed=False
        ).aggregate(total=Sum('insurance_amount'))['total'] or 0
        
        return {
            'currentMonth': float(current_month_revenue),
            'lastMonth': float(last_month_revenue),
            'outstanding': float(outstanding_amount)
        }

class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Gibt die Details des aktuell eingeloggten Benutzers zurück
        """
        try:
            user = request.user
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Fehler in UserDetailView.get: {str(e)}")
            return Response(
                {'error': 'Interner Serverfehler beim Abrufen der Benutzerdaten'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """
        Aktualisiert die Details des aktuell eingeloggten Benutzers
        """
        try:
            user = request.user
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Fehler in UserDetailView.put: {str(e)}")
            return Response(
                {'error': 'Interner Serverfehler beim Aktualisieren der Benutzerdaten'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class DiagnosisGroupViewSet(viewsets.ModelViewSet):
    queryset = DiagnosisGroup.objects.all()
    serializer_class = DiagnosisGroupSerializer

class LocalHolidayViewSet(viewsets.ModelViewSet):
    queryset = LocalHoliday.objects.all()
    serializer_class = LocalHolidaySerializer

class AppointmentSeriesViewSet(viewsets.ViewSet):
    def preview(self, request):
        """Erstellt eine Vorschau der möglichen Termine"""
        try:
            prescription = Prescription.objects.get(pk=request.data.get('prescription_id'))
            treatment = prescription.treatment_1
            
            if not treatment:
                raise Exception("Keine Behandlung in der Verordnung gefunden")

            start_date = parse_date(request.data.get('start_date'))
            time = request.data.get('appointment_time', '09:00')
            interval_days = int(request.data.get('interval_days', 7))
            number_of_appointments = int(request.data.get('number_of_appointments', 1))
            practitioner = Practitioner.objects.get(pk=request.data.get('practitioner_id'))
            room = Room.objects.get(pk=request.data.get('room_id')) if request.data.get('room_id') else None

            # Startzeit erstellen
            start_datetime = datetime.combine(start_date, datetime.strptime(time, '%H:%M').time())
            start_datetime = make_aware(start_datetime)
            
            proposed_appointments = []
            current_datetime = start_datetime

            # Hole alle verfügbaren Räume und Behandler für alternative Vorschläge
            available_rooms = Room.objects.filter(is_active=True)
            available_practitioners = Practitioner.objects.filter(is_active=True)

            for i in range(number_of_appointments):
                # Nächsten verfügbaren Termin finden
                next_available = self.find_next_available_slot(
                    current_datetime,
                    practitioner,
                    room,
                    treatment.duration_minutes
                )

                # Alternative Slots finden falls der Hauptslot nicht verfügbar ist
                alternative_slots = []
                if not next_available:
                    # Prüfe andere Räume und Behandler für den gleichen Tag
                    day_start = current_datetime.replace(hour=7, minute=0)
                    day_end = current_datetime.replace(hour=19, minute=0)
                    current_time = day_start

                    while current_time <= day_end:
                        for alt_room in available_rooms:
                            for alt_practitioner in available_practitioners:
                                if self.is_slot_available(
                                    current_time,
                                    alt_practitioner,
                                    alt_room,
                                    treatment.duration_minutes
                                ):
                                    alternative_slots.append({
                                        'datetime': current_time,
                                        'practitioner': alt_practitioner.id,
                                        'practitioner_name': alt_practitioner.get_full_name(),
                                        'room': alt_room.id,
                                        'room_name': alt_room.name
                                    })
                        current_time += timedelta(minutes=15)  # 15-Minuten-Intervalle

                proposed_appointments.append({
                    'proposed_datetime': next_available or current_datetime,
                    'practitioner': practitioner.id,
                    'practitioner_name': practitioner.get_full_name(),
                    'room': room.id if room else None,
                    'room_name': room.name if room else '',
                    'duration_minutes': treatment.duration_minutes,
                    'is_available': bool(next_available),
                    'conflicts': self.get_conflicts(current_datetime, practitioner, room),
                    'alternative_slots': alternative_slots[:5],  # Limitiere auf 5 Alternativen
                    'can_be_modified': True  # Erlaubt Änderungen im Frontend
                })
                current_datetime = (next_available or current_datetime) + timedelta(days=interval_days)

            return Response({
                'prescription_id': prescription.id,
                'proposed_appointments': proposed_appointments,
                'available_rooms': [{'id': r.id, 'name': r.name} for r in available_rooms],
                'available_practitioners': [{'id': p.id, 'name': p.get_full_name()} for p in available_practitioners]
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def find_next_available_slot(self, start_datetime, practitioner, room, duration_minutes):
        """Findet den nächsten verfügbaren Zeitslot"""
        practice = Practice.objects.first()
        current_datetime = start_datetime
        max_days_to_check = 30  # Maximale Anzahl der zu prüfenden Tage
        days_checked = 0
        
        while days_checked < max_days_to_check:
            # Prüfe ob der Tag grundsätzlich verfügbar ist
            day_name = current_datetime.strftime('%A').lower()
            day_settings = practice.opening_hours.get(day_name, {})
            
            if day_settings.get('open'):
                # Hole Start- und Endzeit für den Tag
                hours = day_settings.get('hours', '07:00-19:00')
                start_time, end_time = hours.split('-')
                start_time = datetime.strptime(start_time, '%H:%M').time()
                end_time = datetime.strptime(end_time, '%H:%M').time()
                
                # Setze Startzeit für den ersten Check
                if current_datetime.time() < start_time:
                    current_datetime = current_datetime.replace(
                        hour=start_time.hour,
                        minute=start_time.minute
                    )
                
                # Prüfe Zeitslots für diesen Tag
                while current_datetime.time() <= end_time:
                    # Prüfe ob der Slot verfügbar ist
                    if self.is_slot_available(
                        current_datetime,
                        practitioner,
                        room,
                        duration_minutes
                    ):
                        return current_datetime
                    
                    # Nächster 15-Minuten-Slot
                    current_datetime += timedelta(minutes=15)
                    
                    # Wenn wir über die Endzeit hinaus sind, breche die innere Schleife ab
                    if current_datetime.time() > end_time:
                        break
            
            # Nächster Tag
            current_datetime = (current_datetime + timedelta(days=1)).replace(
                hour=7,  # Setze auf Praxisöffnung zurück
                minute=0
            )
            days_checked += 1
        
        return None

    def is_slot_available(self, datetime_to_check, practitioner, room, duration_minutes):
        """Prüft ob ein Zeitslot verfügbar ist"""
        end_datetime = datetime_to_check + timedelta(minutes=duration_minutes)
        
        # Prüfe Praxisöffnungszeiten
        practice = Practice.objects.first()
        if not practice.is_open_at(datetime_to_check) or not practice.is_open_at(end_datetime):
            return False
            
        # Prüfe Raumverfügbarkeit
        if room and not room.is_home_visit:
            day_name = datetime_to_check.strftime('%A').lower()
            room_settings = room.opening_hours.get(day_name, {})
            if not room_settings.get('open'):
                return False
                
            hours = room_settings.get('hours', '')
            if not hours:
                return False
                
            room_start, room_end = hours.split('-')
            if (datetime_to_check.strftime('%H:%M') < room_start or 
                end_datetime.strftime('%H:%M') > room_end):
                return False
        
        # Prüfe Behandler-Abwesenheiten
        absences = Absence.objects.filter(
            practitioner=practitioner,
            start_date__lte=datetime_to_check.date(),
            end_date__gte=datetime_to_check.date()
        )
        for absence in absences:
            if absence.is_full_day:
                return False
            if absence.start_time and absence.end_time:
                if (datetime_to_check.time() >= absence.start_time and 
                    end_datetime.time() <= absence.end_time):
                    return False
        
        # Prüfe Terminkonflikte
        existing_appointments = Appointment.objects.filter(
            practitioner=practitioner,
            appointment_date__range=(
                datetime_to_check,
                end_datetime - timedelta(minutes=1)
            )
        )
        if existing_appointments.exists():
            return False
        
        return True

    def get_conflicts(self, datetime_to_check, practitioner, room):
        """Gibt alle Konflikte für einen Zeitslot zurück"""
        conflicts = []
        end_datetime = datetime_to_check + timedelta(minutes=30)  # Standard-Dauer
        
        # Prüfe Praxisöffnungszeiten
        practice = Practice.objects.first()
        if not practice.is_open_at(datetime_to_check):
            conflicts.append("Außerhalb der Praxisöffnungszeiten")
        
        # Prüfe Raumverfügbarkeit
        if room and not room.is_home_visit:
            day_name = datetime_to_check.strftime('%A').lower()
            room_settings = room.opening_hours.get(day_name, {})
            if not room_settings.get('open'):
                conflicts.append(f"Raum {room.name} ist an diesem Tag nicht verfügbar")
            else:
                hours = room_settings.get('hours', '')
                if hours:
                    room_start, room_end = hours.split('-')
                    if (datetime_to_check.strftime('%H:%M') < room_start or 
                        end_datetime.strftime('%H:%M') > room_end):
                        conflicts.append(f"Außerhalb der Raumöffnungszeiten ({room.name})")
        
        return conflicts

    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """Bestätigt und erstellt die vorgeschlagenen Termine"""
        try:
            prescription = Prescription.objects.get(pk=request.data.get('prescription_id'))
            appointments_data = request.data.get('appointments', [])
            
            created_appointments = []
            
            for appointment_data in appointments_data:
                if appointment_data.get('is_available'):
                    # Datetime-String in datetime-Objekt umwandeln
                    appointment_datetime = make_aware(
                        datetime.strptime(
                            appointment_data['proposed_datetime'],
                            '%Y-%m-%dT%H:%M:%SZ'
                        )
                    )
                    
                    # Behandlung aus appointment_data holen und prüfen
                    try:
                        treatment = Treatment.objects.get(id=appointment_data['treatment'])
                    except Treatment.DoesNotExist:
                        return Response({'error': 'Behandlung nicht gefunden'}, status=400)
                    
                    appointment = Appointment.objects.create(
                        prescription=prescription,
                        patient=prescription.patient,
                        treatment=treatment,
                        practitioner_id=appointment_data['practitioner'],
                        room_id=appointment_data.get('room'),
                        appointment_date=appointment_datetime,
                        duration_minutes=appointment_data['duration_minutes'],
                        status='planned',
                        is_recurring=True
                    )
                    created_appointments.append(appointment)

            if created_appointments:
                if prescription.status == 'Open':
                    prescription.status = 'In_Progress'
                    prescription.save()

            return Response({
                'message': f'{len(created_appointments)} Termine wurden erfolgreich erstellt',
                'appointments': AppointmentSerializer(created_appointments, many=True).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['GET'])
def get_holidays(request, bundesland_id=None, year=None):
    if not year:
        year = datetime.now().year

    holidays = LocalHoliday.objects.filter(date__year=year)
    if bundesland_id:
        holidays = holidays.filter(bundesland_id=bundesland_id)

    return Response([{
        'title': h.holiday_name,
        'start': h.date,
        'allDay': True,
        'display': 'background',
        'color': '#ff9999',
        'bundesland': h.bundesland.name
    } for h in holidays])

class PracticeViewSet(viewsets.ModelViewSet):
    queryset = Practice.objects.all()
    serializer_class = PracticeSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def get_instance(self, request):
        try:
            instance = Practice.get_instance()
            if not instance:
                return Response(
                    {'error': 'Keine Praxisinstanz gefunden'},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"Error in get_instance: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['put'])
    def update_instance(self, request):
        try:
            instance = Practice.get_instance()
            if not instance:
                return Response(
                    {'error': 'Keine Praxisinstanz gefunden'},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"Error in update_instance: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_appointment_series(request, prescription_id):
    try:
        prescription = get_object_or_404(Prescription, id=prescription_id)
        data = request.data

        # Hole die Behandlung, den Raum und den Behandler als Objekte
        treatment = get_object_or_404(Treatment, id=data.get('treatment_id'))
        room = get_object_or_404(Room, id=data.get('room_id'))
        practitioner = get_object_or_404(Practitioner, id=data.get('practitioner_id'))

        interval_days = int(data.get('frequency', 7))
        # Optional: Startdatum auslesen, falls du nicht prescription.prescription_date nehmen willst
        # start_date = datetime.strptime(data.get('start_date'), "%Y-%m-%d").date()

        # Erstelle die Termine mit dem Service
        appointments = propose_and_create_appointments(
            prescription=prescription,
            interval_days=interval_days,
            room=room,
            practitioner=practitioner,
            treatment=treatment
        )

        return Response({
            'message': f'{len(appointments)} Termine wurden erfolgreich erstellt',
            'appointments': [AppointmentSerializer(a).data for a in appointments]
        }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def export_billing_cycle(request, pk):
    try:
        billing_cycle = BillingCycle.objects.get(pk=pk)
        billing_items = BillingItem.objects.filter(billing_cycle=billing_cycle)

        # PDF erstellen
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        
        # Titel
        elements.append(Paragraph(f"Abrechnung - {billing_cycle.insurance_provider.name}", title_style))
        elements.append(Paragraph(f"Zeitraum: {billing_cycle.start_date.strftime('%d.%m.%Y')} - {billing_cycle.end_date.strftime('%d.%m.%Y')}", styles['Normal']))
        
        # Tabellendaten
        data = [['Datum', 'Patient', 'Behandlung', 'Betrag KK', 'Zuzahlung']]
        for item in billing_items:
            data.append([
                item.appointment.appointment_date.strftime('%d.%m.%Y'),
                item.prescription.patient.get_full_name(),
                item.treatment.treatment_name,
                f"{item.insurance_amount:.2f} €",
                f"{item.patient_copay:.2f} €"
            ])
        
        # Gesamtsumme
        data.append(['', '', 'Gesamtbetrag:', f"{billing_cycle.total_amount:.2f} €", ''])
        
        # Tabelle erstellen
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        
        # PDF generieren
        doc.build(elements)
        
        # Response vorbereiten
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Abrechnung_{billing_cycle.id}.pdf"'
        
        # Status auf 'exported' setzen
        billing_cycle.status = 'exported'
        billing_cycle.save()
        
        return response

    except BillingCycle.DoesNotExist:
        return Response({'error': 'Abrechnungszyklus nicht gefunden'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

class AbsenceViewSet(viewsets.ModelViewSet):
    queryset = Absence.objects.all()
    serializer_class = AbsenceSerializer
    filterset_fields = ['practitioner', 'start_date', 'end_date', 'is_approved']

class WaitlistViewSet(viewsets.ModelViewSet):
    queryset = Waitlist.objects.all()
    serializer_class = WaitlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtert Wartelisten-Einträge nach Benutzerberechtigungen"""
        user = self.request.user
        queryset = super().get_queryset().select_related(
            'patient', 'practitioner', 'treatment', 'prescription'
        )

        # Wenn der Benutzer ein Admin/Superuser ist, zeige alle Einträge
        if user.is_superuser or user.is_admin:
            return queryset
            
        # Wenn der Benutzer ein Therapeut ist, zeige nur seine eigenen Einträge
        if user.is_therapist:
            practitioner = Practitioner.objects.filter(
                first_name=user.first_name,
                last_name=user.last_name
            ).first()
            if practitioner:
                return queryset.filter(practitioner=practitioner)
            
        # Für normale Benutzer (Verwaltung) zeige alle Einträge
        return queryset

    def list(self, request, *args, **kwargs):
        """Erweiterte Liste mit Filterung"""
        queryset = self.get_queryset()
        
        # Filter nach Status
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter nach Priorität
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Sortierung nach Priorität und Erstellungsdatum
        queryset = queryset.order_by('-priority', 'created_at')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Payment.objects.select_related(
            'patient_invoice__patient',
            'copay_invoice__patient',
            'private_invoice__patient',
            'created_by'
        ).order_by('-payment_date', '-created_at')
        
        # Filter nach Datum
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        # Filter nach Zahlungsart
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        # Filter nach Zahlungstyp
        payment_type = self.request.query_params.get('payment_type')
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Zusammenfassung der Zahlungen"""
        queryset = self.get_queryset()
        
        # Zeitraum
        period = request.query_params.get('period', 'month')
        now = timezone.now()
        
        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        elif period == 'quarter':
            start_date = now - timedelta(days=90)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        # Filter nach Zeitraum
        period_payments = queryset.filter(payment_date__gte=start_date)
        
        # Statistiken
        total_amount = period_payments.aggregate(total=Sum('amount'))['total'] or 0
        payment_count = period_payments.count()
        
        # Nach Zahlungsart
        by_method = period_payments.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        # Nach Zahlungstyp
        by_type = period_payments.values('payment_type').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        # Tägliche Summen
        daily_totals = period_payments.values('payment_date').annotate(
            total=Sum('amount')
        ).order_by('payment_date')
        
        return Response({
            'period': period,
            'total_amount': float(total_amount),
            'payment_count': payment_count,
            'by_method': [
                {
                    'method': item['payment_method'],
                    'method_display': dict(Payment.PAYMENT_METHODS)[item['payment_method']],
                    'count': item['count'],
                    'total': float(item['total'])
                } for item in by_method
            ],
            'by_type': [
                {
                    'type': item['payment_type'],
                    'type_display': dict(Payment.PAYMENT_TYPES)[item['payment_type']],
                    'count': item['count'],
                    'total': float(item['total'])
                } for item in by_type
            ],
            'daily_totals': [
                {
                    'date': item['payment_date'].strftime('%Y-%m-%d'),
                    'total': float(item['total'])
                } for item in daily_totals
            ]
        })
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Mehrere Zahlungen auf einmal erstellen"""
        payments_data = request.data.get('payments', [])
        created_payments = []
        errors = []
        
        for i, payment_data in enumerate(payments_data):
            try:
                serializer = self.get_serializer(data=payment_data)
                serializer.is_valid(raise_exception=True)
                payment = serializer.save()
                created_payments.append(payment)
            except Exception as e:
                errors.append({
                    'index': i,
                    'data': payment_data,
                    'error': str(e)
                })
        
        return Response({
            'created_count': len(created_payments),
            'error_count': len(errors),
            'errors': errors,
            'payments': PaymentSerializer(created_payments, many=True).data
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_prescription_ocr(request):
    """
    Verarbeitet ein Rezept-Bild/PDF mit OCR und extrahiert die Daten
    """
    try:
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Keine Datei hochgeladen'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        
        # Dateityp validieren
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if uploaded_file.content_type not in allowed_types:
            return Response(
                {'error': 'Nicht unterstützter Dateityp. Erlaubt: JPG, PNG, PDF'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Dateigröße prüfen (max 10MB)
        if uploaded_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Datei zu groß. Maximale Größe: 10MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Temporäre Datei erstellen im aktuellen Verzeichnis
        import uuid
        temp_file_path = os.path.join(os.getcwd(), f"ocr_upload_{uuid.uuid4().hex}_{uploaded_file.name}")
        
        try:
            with open(temp_file_path, 'wb') as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
            
            # Berechtigungen setzen
            os.chmod(temp_file_path, 0o644)
            logger.info(f"Temporäre Datei erstellt: {temp_file_path}")
        except Exception as e:
            logger.error(f"Fehler beim Erstellen der temporären Datei: {str(e)}")
            raise
        
        try:
            # OCR verarbeiten
            ocr_service = OCRService()
            extracted_data = ocr_service.process_prescription_file(temp_file_path)
            
            # Daten validieren
            validation = ocr_service.validate_extracted_data(extracted_data)
            
            # Datei speichern
            file_path = f'prescriptions/ocr_uploads/{uploaded_file.name}'
            saved_path = default_storage.save(file_path, uploaded_file)
            
            # Antwort vorbereiten
            response_data = {
                'extracted_data': extracted_data,
                'validation': validation,
                'uploaded_file': saved_path,
                'confidence_score': extracted_data.get('confidence_score', 0.0)
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        finally:
            # Temporäre Datei löschen
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Fehler bei OCR-Verarbeitung: {str(e)}")
        return Response(
            {'error': f'Fehler bei der OCR-Verarbeitung: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_prescription_from_ocr(request):
    """
    Erstellt eine neue Verordnung aus OCR-Daten mit Patienten- und Arzt-Matching
    """
    try:
        data = request.data
        
        # OCR-Daten extrahieren
        ocr_data = data.get('ocr_data', {})
        uploaded_file = data.get('uploaded_file')
        
        # Patienten finden oder erstellen
        patient_name = ocr_data.get('patient_name', '')
        patient_birth = ocr_data.get('patient_birth', '')
        
        if patient_name:
            first_name, last_name = patient_name.split(' ', 1) if ' ' in patient_name else (patient_name, '')
            
            # Patienten suchen (exakte Übereinstimmung)
            patient = Patient.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name
            ).first()
            
            # Wenn nicht gefunden, nach ähnlichen Namen suchen
            if not patient:
                similar_patients = Patient.objects.filter(
                    Q(first_name__icontains=first_name) | Q(last_name__icontains=last_name)
                )[:5]
                
                if similar_patients.exists():
                    # Ähnliche Patienten gefunden - Vorschläge zurückgeben
                    suggestions = []
                    for p in similar_patients:
                        suggestions.append({
                            'id': p.id,
                            'name': f"{p.first_name} {p.last_name}",
                            'birth_date': p.dob.strftime('%d.%m.%Y') if p.dob else None,
                            'match_score': _calculate_name_similarity(patient_name, f"{p.first_name} {p.last_name}")
                        })
                    
                    return Response({
                        'error': 'Patient nicht gefunden',
                        'suggestions': suggestions,
                        'action': 'select_patient_or_create_new',
                        'new_patient_data': {
                            'first_name': first_name,
                            'last_name': last_name,
                            'birth_date': patient_birth
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Keine ähnlichen Patienten gefunden - neuen erstellen
                try:
                    dob = datetime.strptime(patient_birth, '%d.%m.%Y').date() if patient_birth else datetime.now().date()
                except ValueError:
                    dob = datetime.now().date()
                
                patient = Patient.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    dob=dob,
                    email='',
                    phone_number='',
                    street_address='',
                    city='',
                    postal_code='',
                    country='Deutschland'
                )
        else:
            return Response(
                {'error': 'Patientenname konnte nicht erkannt werden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Arzt finden oder erstellen
        doctor_name = ocr_data.get('doctor_name', '')
        bsnr = ocr_data.get('bsnr', '')
        lanr = ocr_data.get('lanr', '')
        
        if doctor_name:
            first_name, last_name = doctor_name.split(' ', 1) if ' ' in doctor_name else (doctor_name, '')
            
            # Arzt suchen (exakte Übereinstimmung)
            doctor = Doctor.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name
            ).first()
            
            # Wenn nicht gefunden, nach ähnlichen Namen suchen
            if not doctor:
                similar_doctors = Doctor.objects.filter(
                    Q(first_name__icontains=first_name) | Q(last_name__icontains=last_name)
                )[:5]
                
                if similar_doctors.exists():
                    # Ähnliche Ärzte gefunden - Vorschläge zurückgeben
                    suggestions = []
                    for d in similar_doctors:
                        suggestions.append({
                            'id': d.id,
                            'name': f"{d.first_name} {d.last_name}",
                            'license_number': d.license_number,
                            'match_score': _calculate_name_similarity(doctor_name, f"{d.first_name} {d.last_name}")
                        })
                    
                    return Response({
                        'error': 'Arzt nicht gefunden',
                        'suggestions': suggestions,
                        'action': 'select_doctor_or_create_new',
                        'new_doctor_data': {
                            'first_name': first_name,
                            'last_name': last_name,
                            'bsnr': bsnr,
                            'lanr': lanr
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Keine ähnlichen Ärzte gefunden - neuen erstellen
                doctor = Doctor.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    license_number=lanr or '',
                    specialization='',
                    phone_number='',
                    email='',
                    address=''
                )
        else:
            # Standard-Arzt verwenden
            doctor = Doctor.objects.first()
        
        # ICD-Code finden
        diagnosis_code = None
        if ocr_data.get('diagnosis_code'):
            diagnosis_code = ICDCode.objects.filter(
                code__icontains=ocr_data['diagnosis_code']
            ).first()
        
        # Behandlungseinheiten berechnen
        total_sessions = 0
        for i in range(1, 4):
            sessions = ocr_data.get(f'sessions_{i}', 0)
            if sessions:
                total_sessions += int(sessions)
        
        if total_sessions == 0:
            total_sessions = 1  # Standard
        
        # Verordnung erstellen
        prescription_data = {
            'patient': patient.id,
            'doctor': doctor.id if doctor else None,
            'diagnosis_code': diagnosis_code.id if diagnosis_code else None,
            'number_of_sessions': total_sessions,
            'therapy_frequency_type': _map_frequency(ocr_data.get('frequency', '')),
            'prescription_date': datetime.strptime(ocr_data.get('prescription_date', datetime.now().strftime('%d.%m.%Y')), '%d.%m.%Y').date() if ocr_data.get('prescription_date') else datetime.now().date(),
            'status': 'Open',
            'is_urgent': ocr_data.get('urgent', '').lower() == 'ja',
            'requires_home_visit': ocr_data.get('home_visit', '').lower() == 'ja',
            'therapy_report_required': ocr_data.get('report_required', '').lower() in ['ja', 'erforderlich'],
            'therapy_goals': ocr_data.get('therapy_goals', '')
        }
        
        # PDF-Dokument hinzufügen
        if uploaded_file:
            prescription_data['pdf_document'] = uploaded_file
        
        # Verordnung speichern
        serializer = PrescriptionSerializer(data=prescription_data)
        if serializer.is_valid():
            prescription = serializer.save()
            return Response(
                {
                    'message': 'Verordnung erfolgreich erstellt',
                    'prescription_id': prescription.id,
                    'extracted_data': ocr_data,
                    'patient_id': patient.id,
                    'doctor_id': doctor.id if doctor else None
                },
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(
                {'error': 'Fehler beim Erstellen der Verordnung', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"Fehler beim Erstellen der Verordnung aus OCR: {str(e)}")
        return Response(
            {'error': f'Fehler beim Erstellen der Verordnung: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def _calculate_name_similarity(name1: str, name2: str) -> float:
    """
    Berechnet die Ähnlichkeit zwischen zwei Namen
    """
    from difflib import SequenceMatcher
    return SequenceMatcher(None, name1.lower(), name2.lower()).ratio()

def _map_frequency(frequency: str) -> str:
    """
    Mappt OCR-Frequenz auf interne Frequenz-Codes
    """
    frequency = frequency.lower()
    if 'woche' in frequency:
        if '1x' in frequency:
            return 'weekly_1'
        elif '2x' in frequency:
            return 'weekly_2'
        elif '3x' in frequency:
            return 'weekly_3'
        elif '4x' in frequency:
            return 'weekly_4'
        elif '5x' in frequency:
            return 'weekly_5'
    elif 'monat' in frequency:
        if '1x' in frequency:
            return 'monthly_1'
        elif '2x' in frequency:
            return 'monthly_2'
        elif '3x' in frequency:
            return 'monthly_3'
        elif '4x' in frequency:
            return 'monthly_4'
    
    return 'weekly_1'  # Standard

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def settings_view(request):
    """
    Allgemeiner Settings-Endpunkt für alle Einstellungen
    """
    try:
        if request.method == 'GET':
            # Alle verfügbaren Settings laden
            calendar_settings = CalendarSettings.objects.first()
            practice_settings = PracticeSettings.objects.first()
            
            # Standard-Settings erstellen, falls keine vorhanden
            if not calendar_settings:
                calendar_settings = CalendarSettings.objects.create(
                    default_session_duration=30,
                    break_between_sessions=15,
                    max_appointments_per_day=20
                )
            if not practice_settings:
                practice_settings = PracticeSettings.objects.create(
                    practice_name="Meine Praxis",
                    license_number="12345",
                    street_address="Musterstraße 1",
                    city="Musterstadt",
                    postal_code="12345",
                    country="Deutschland",
                    phone_number="0123456789",
                    email="info@praxis.de",
                    opening_time="08:00:00",
                    closing_time="18:00:00",
                    days_open="Montag-Freitag"
                )
            
            # Settings zusammenfassen
            settings_data = {
                'general': {
                    'practice_name': practice_settings.practice_name if practice_settings else '',
                    'practice_address': f"{practice_settings.street_address}, {practice_settings.postal_code} {practice_settings.city}" if practice_settings else '',
                    'practice_phone': practice_settings.phone_number if practice_settings else '',
                    'practice_email': practice_settings.email if practice_settings else '',
                },
                'therapy': {
                    'default_session_duration': calendar_settings.default_session_duration if calendar_settings else 30,
                    'break_between_sessions': calendar_settings.break_between_sessions if calendar_settings else 15,
                    'max_appointments_per_day': calendar_settings.max_appointments_per_day if calendar_settings else 20,
                },
                'notifications': {
                    'email_notifications': practice_settings.email_notifications if practice_settings else True,
                    'sms_notifications': practice_settings.sms_notifications if practice_settings else False,
                    'reminder_days_before': practice_settings.reminder_days_before if practice_settings else 1,
                },
                'billing': {
                    'auto_billing': practice_settings.auto_billing if practice_settings else False,
                    'billing_cycle_days': practice_settings.billing_cycle_days if practice_settings else 30,
                    'default_payment_terms': practice_settings.default_payment_terms if practice_settings else 14,
                }
            }
            
            return Response(settings_data)
            
        elif request.method == 'PUT':
            # Settings aktualisieren
            data = request.data
            
            calendar_settings = CalendarSettings.objects.first()
            practice_settings = PracticeSettings.objects.first()
            
            # Standard-Settings erstellen, falls keine vorhanden
            if not calendar_settings:
                calendar_settings = CalendarSettings.objects.create()
            if not practice_settings:
                practice_settings = PracticeSettings.objects.create()
            
            # Calendar Settings aktualisieren
            if 'therapy' in data:
                therapy_data = data['therapy']
                if 'default_session_duration' in therapy_data:
                    calendar_settings.default_session_duration = therapy_data['default_session_duration']
                if 'break_between_sessions' in therapy_data:
                    calendar_settings.break_between_sessions = therapy_data['break_between_sessions']
                if 'max_appointments_per_day' in therapy_data:
                    calendar_settings.max_appointments_per_day = therapy_data['max_appointments_per_day']
                calendar_settings.save()
            
            # Practice Settings aktualisieren
            if 'general' in data:
                general_data = data['general']
                if 'practice_name' in general_data:
                    practice_settings.practice_name = general_data['practice_name']
                if 'practice_phone' in general_data:
                    practice_settings.phone_number = general_data['practice_phone']
                if 'practice_email' in general_data:
                    practice_settings.email = general_data['practice_email']
                # Adresse wird nicht direkt gespeichert, da sie aus mehreren Feldern besteht
                # Optionales Mapping: zusammengesetzte Adresse -> Einzelteile
                try:
                    import re
                    addr = general_data.get('practice_address')
                    if addr and isinstance(addr, str):
                        # Erwartetes Muster: "Straße Hausnr., PLZ Stadt"
                        parts = [p.strip() for p in addr.split(',')]
                        if len(parts) == 2:
                            street = parts[0]
                            m = re.match(r"^(?P<plz>\d{4,5})\s+(?P<city>.+)$", parts[1])
                            if m:
                                practice_settings.street_address = street
                                practice_settings.postal_code = m.group('plz')
                                practice_settings.city = m.group('city')
                except Exception:
                    # Silent fallback: Bei Parsing-Fehlern keine Änderung
                    pass
                # Falls Einzelteile explizit gesendet werden, haben diese Vorrang
                if 'street_address' in general_data:
                    practice_settings.street_address = general_data['street_address']
                if 'postal_code' in general_data:
                    practice_settings.postal_code = general_data['postal_code']
                if 'city' in general_data:
                    practice_settings.city = general_data['city']
            
            if 'notifications' in data:
                notification_data = data['notifications']
                if 'email_notifications' in notification_data:
                    practice_settings.email_notifications = notification_data['email_notifications']
                if 'sms_notifications' in notification_data:
                    practice_settings.sms_notifications = notification_data['sms_notifications']
                if 'reminder_days_before' in notification_data:
                    practice_settings.reminder_days_before = notification_data['reminder_days_before']
            
            if 'billing' in data:
                billing_data = data['billing']
                if 'auto_billing' in billing_data:
                    practice_settings.auto_billing = billing_data['auto_billing']
                if 'billing_cycle_days' in billing_data:
                    practice_settings.billing_cycle_days = billing_data['billing_cycle_days']
                if 'default_payment_terms' in billing_data:
                    practice_settings.default_payment_terms = billing_data['default_payment_terms']
            
            practice_settings.save()
            
            return Response({'message': 'Einstellungen erfolgreich gespeichert'})
            
    except Exception as e:
        logger.error(f"Fehler bei Settings-Operation: {str(e)}")
        return Response(
            {'error': f'Fehler bei der Settings-Operation: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ViewSets für das neue Preissystem
class TreatmentTypeViewSet(viewsets.ModelViewSet):
    queryset = TreatmentType.objects.all()
    serializer_class = TreatmentTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'type_code', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class PriceListViewSet(viewsets.ModelViewSet):
    queryset = PriceList.objects.all()
    serializer_class = PriceListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'valid_from', 'created_at']
    ordering = ['-valid_from', 'name']

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Gibt alle aktuell gültigen Preislisten zurück"""
        from django.utils import timezone
        today = timezone.now().date()
        current_lists = self.queryset.filter(
            valid_from__lte=today,
            is_active=True
        ).filter(
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=today)
        )
        serializer = self.get_serializer(current_lists, many=True)
        return Response(serializer.data)

class TreatmentPriceViewSet(viewsets.ModelViewSet):
    queryset = TreatmentPrice.objects.all()
    serializer_class = TreatmentPriceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['treatment__treatment_name', 'price_list__name', 'notes']
    ordering_fields = ['treatment__treatment_name', 'price_list__valid_from', 'created_at']
    ordering = ['treatment__treatment_name', '-price_list__valid_from']

    @action(detail=False, methods=['get'])
    def current_prices(self, request):
        """Gibt alle aktuell gültigen Preise zurück"""
        from django.utils import timezone
        today = timezone.now().date()
        current_prices = self.queryset.filter(
            price_list__valid_from__lte=today,
            is_active=True
        ).filter(
            models.Q(price_list__valid_until__isnull=True) | models.Q(price_list__valid_until__gte=today)
        )
        serializer = self.get_serializer(current_prices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_treatment(self, request):
        """Gibt Preise für eine bestimmte Behandlung zurück"""
        treatment_id = request.query_params.get('treatment_id')
        if not treatment_id:
            return Response({'error': 'treatment_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.utils import timezone
        today = timezone.now().date()
        prices = self.queryset.filter(
            treatment_id=treatment_id,
            price_list__valid_from__lte=today,
            is_active=True
        ).filter(
            models.Q(price_list__valid_until__isnull=True) | models.Q(price_list__valid_until__gte=today)
        )
        serializer = self.get_serializer(prices, many=True)
        return Response(serializer.data)

class UserPreferenceViewSet(viewsets.ModelViewSet):
    queryset = UserPreference.objects.all()
    serializer_class = UserPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Benutzer dürfen nur die eigenen Präferenzen sehen/bearbeiten
        if self.request.user.is_superuser:
            return super().get_queryset()
        return super().get_queryset().filter(user=self.request.user)

    @action(detail=False, methods=['get', 'post', 'put'], url_path='me')
    def me(self, request):
        """Eigene Präferenzen holen/setzen"""
        pref, _ = UserPreference.objects.get_or_create(user=request.user)
        if request.method in ['POST', 'PUT']:
            serializer = self.get_serializer(pref, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data)
        serializer = self.get_serializer(pref)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet für Änderungshistorie (nur lesen)"""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['model_name', 'action', 'user', 'timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        # Benutzer sehen nur relevante Logs
        if self.request.user.is_superuser:
            return super().get_queryset()
        # Filtere nach Benutzer oder allgemeine Logs
        return super().get_queryset().filter(
            Q(user=self.request.user) | Q(user__isnull=True)
        )


class UserInitialsViewSet(viewsets.ModelViewSet):
    """ViewSet für Benutzer-Kürzel-Verwaltung (nur Admin)"""
    queryset = User.objects.all()
    serializer_class = UserInitialsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        # Nur Admins können Kürzel ändern
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        # Alle Benutzer anzeigen, aber nur Admins können ändern
        return User.objects.filter(is_active=True).order_by('username')

