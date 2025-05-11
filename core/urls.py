from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Korrigierter Import-Pfad für die Views
from .views.views import (
    UserViewSet, InsuranceProviderGroupViewSet, InsuranceProviderViewSet,
    PatientViewSet, PatientInsuranceViewSet, EmergencyContactViewSet, DoctorViewSet,
    PractitionerViewSet, SpecializationViewSet, RoomViewSet, PracticeSettingsViewSet,
    TreatmentViewSet, CategoryViewSet, AppointmentViewSet, BillingCycleViewSet,
    PrescriptionViewSet, ICDCodeViewSet, CalendarSettingsView, UserProfileView,
    CreateAppointmentsFromPrescriptionView, PatientDemographicsView, TreatmentStatsView,
    AppointmentStatsView, GenerateAppointmentsPreviewView, DashboardStatsView,
    UserDetailView, PracticeViewSet, BundeslandViewSet, WorkingHourViewSet,
    export_billing_cycle,
    create_appointment_series,
    DiagnosisGroupViewSet, SurchargeViewSet, LocalHolidayViewSet
)
from .views.billing_views import (
    PatientInvoiceListView,
    PatientInvoiceDetailView,
    CreatePatientInvoiceView,
    download_invoice_pdf,
    mark_invoice_as_paid,
    BulkBillingView
)

app_name = 'core'

# Define the router
router = DefaultRouter()
# Basis-Routen
router.register(r'users', UserViewSet)
router.register(r'insurance-provider-groups', InsuranceProviderGroupViewSet)
router.register(r'insurance-providers', InsuranceProviderViewSet)
router.register(r'patients', PatientViewSet)
router.register(r'patient-insurances', PatientInsuranceViewSet)
router.register(r'emergency-contacts', EmergencyContactViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'icdcodes', ICDCodeViewSet)
router.register(r'practitioners', PractitionerViewSet, basename='practitioner')
router.register(r'specializations', SpecializationViewSet)
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'practice-settings', PracticeSettingsViewSet)
router.register(r'treatments', TreatmentViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'billing-cycles', BillingCycleViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'practice', PracticeViewSet, basename='practice')
router.register(r'bundeslaender', BundeslandViewSet, basename='bundesland')
router.register(r'working-hours', WorkingHourViewSet)

urlpatterns = [
    # Spezifische Routen zuerst
    path('practice/instance/', PracticeViewSet.as_view({
        'get': 'get_instance',
        'put': 'update_instance'
    }), name='practice-instance'),
    
    # JWT authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Spezielle Endpunkte
    path('settings/', CalendarSettingsView.as_view(), name='calendar-settings'),
    path('users/me/', UserViewSet.as_view({'get': 'me'}), name='user-me'),
    path('prescriptions/<int:prescription_id>/create-appointments/', 
         CreateAppointmentsFromPrescriptionView.as_view(), 
         name='create-appointments'),
    path('patients/demographics/', PatientDemographicsView.as_view(), name='patient-demographics'),
    path('treatments/stats/', TreatmentStatsView.as_view(), name='treatment-stats'),
    path('appointments/stats/', AppointmentStatsView.as_view(), name='appointment-stats'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('prescriptions/<int:prescription_id>/create-series/', 
         create_appointment_series, 
         name='create-appointment-series'),
    
    # Rechnungsverwaltung
    path(
        'invoices/',
        PatientInvoiceListView.as_view(),
        name='invoice-list'
    ),
    path(
        'invoices/create/',
        CreatePatientInvoiceView.as_view(),
        name='create-invoice'
    ),
    path(
        'invoices/<int:pk>/',
        PatientInvoiceDetailView.as_view(),
        name='invoice-detail'
    ),
    path(
        'invoices/<int:pk>/pdf/',
        download_invoice_pdf,
        name='download-invoice-pdf'
    ),
    path(
        'invoices/<int:pk>/mark-paid/',
        mark_invoice_as_paid,
        name='mark-invoice-paid'
    ),
    
    # Weitere spezifische Routen
    path('bundeslaender/', BundeslandViewSet.as_view({'get': 'list'}), name='bundesland-list'),
    path('diagnosis-groups/', DiagnosisGroupViewSet.as_view({'get': 'list'})),
    path('surcharges/', SurchargeViewSet.as_view({'get': 'list'})),
    path('local-holidays/', LocalHolidayViewSet.as_view({'get': 'list'}), name='local-holidays-list'),
    path('local-holidays/<int:bundesland_id>/', LocalHolidayViewSet.as_view({'get': 'list'}), name='local-holidays-by-bundesland'),
    path('billing-cycles/<int:pk>/items/', 
         BillingCycleViewSet.as_view({'get': 'items'}), 
         name='billing-cycle-items'),
    path('billing-cycles/<int:pk>/export/', export_billing_cycle, name='export-billing-cycle'),
    path(
        'admin/core/prescription/<int:prescription_id>/preview_series/',
        GenerateAppointmentsPreviewView.as_view(),
        name='preview_appointment_series'
    ),
    
    # Router URLs zuletzt
    path('', include(router.urls)),
]
