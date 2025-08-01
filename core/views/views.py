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
    Absence
)
from core.serializers import AppointmentSerializer, AbsenceSerializer

from core.services.billing_service import BillingService
from core.services.propose_and_create_appointments import is_practitioner_available, is_room_available, is_within_practice_hours, propose_and_create_appointments

from core.services.appointment_series import create_appointment_series, AppointmentSeriesService
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
    BillingItem
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
    BillingItemSerializer
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
        """Filtert Patienten nach Benutzerberechtigungen"""
        user = self.request.user
        
        # Wenn der Benutzer ein Admin/Superuser ist, zeige alle Patienten
        if user.is_superuser or user.is_admin:
            return Patient.objects.all()
            
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
                return Patient.objects.filter(id__in=patient_ids)
            else:
                return Patient.objects.none()
                
        # Für normale Benutzer (Verwaltung) zeige alle Patienten
        return Patient.objects.all()

    @action(detail=True, methods=['get'])
    def appointments(self, request, pk=None):
        """
        Liste aller Termine eines Patienten
        """
        patient = self.get_object()
        appointments = Appointment.objects.filter(patient=patient)
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

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
        """Filtert Termine nach Benutzerberechtigungen"""
        user = self.request.user
        queryset = super().get_queryset()

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
        
        # Zusätzliche Joins für Performance
        queryset = queryset.select_related(
            'patient',
            'doctor',
            'treatment_1',
            'treatment_2',
            'treatment_3',
            'patient_insurance',
            'patient_insurance__insurance_provider',
            'diagnosis_code'
        )
        
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
                'active': Patient.objects.filter(is_active=True).count(),
                'newThisMonth': Patient.objects.filter(created_at__gte=month_ago).count(),
            }

            # Termin-Statistiken
            appointment_stats = {
                'total': Appointment.objects.count(),
                'upcoming': Appointment.objects.filter(start_time__gte=now).count(),
                'thisWeek': Appointment.objects.filter(
                    start_time__range=(now, now + timedelta(days=7))
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
        total = Appointment.objects.filter(start_time__lt=timezone.now()).count()
        if total == 0:
            return 0
        no_shows = Appointment.objects.filter(
            start_time__lt=timezone.now(),
            status='no_show'
        ).count()
        return round((no_shows / total) * 100, 2)

    def _get_most_common_treatments(self):
        return dict(
            Appointment.objects.values('treatment__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

    def _get_insurance_distribution(self):
        distribution = (
            Patient.objects.values('insurance_provider__name')
            .annotate(count=Count('id'))
            .values('insurance_provider__name', 'count')
        )
        return {
            item['insurance_provider__name']: item['count'] 
            for item in distribution
        }

    def _get_finance_stats(self):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        
        return {
            'currentMonth': Appointment.objects.filter(
                start_time__gte=month_start
            ).aggregate(total=Sum('treatment__price'))['total'] or 0,
            'lastMonth': Appointment.objects.filter(
                start_time__range=(last_month_start, month_start)
            ).aggregate(total=Sum('treatment__price'))['total'] or 0,
            'outstanding': Appointment.objects.filter(
                payment_status='pending'
            ).aggregate(total=Sum('treatment__price'))['total'] or 0
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

