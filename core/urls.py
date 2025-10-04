from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views.views import (
    PatientViewSet, PractitionerViewSet, RoomViewSet, TreatmentViewSet,
    PrescriptionViewSet, AppointmentViewSet, InsuranceProviderViewSet,
    InsuranceProviderGroupViewSet, CategoryViewSet, ICDCodeViewSet,
    DoctorViewSet, BundeslandViewSet, BillingCycleViewSet,
    SurchargeViewSet, AbsenceViewSet, WorkingHourViewSet, PracticeViewSet,
    DashboardStatsView, UserDetailView, GenerateAppointmentsPreviewView,
    WaitlistViewSet, EmergencyContactViewSet, SpecializationViewSet, DiagnosisGroupViewSet, LocalHolidayViewSet, PaymentViewSet,
    CalendarSettingsViewSet, PracticeSettingsViewSet, PatientInsuranceViewSet,
    TreatmentTypeViewSet, PriceListViewSet, TreatmentPriceViewSet, UserPreferenceViewSet,
    AuditLogViewSet, UserInitialsViewSet
)
from core.views.user_views import UserViewSet, UserRoleViewSet
from core.views.billing_views import (
    BulkBillingView, invoice_overview, mark_invoice_as_paid_api, invoice_detail,
    pending_copay_appointments, create_copay_invoices, create_copay_invoices_from_billing_items,
    create_copay_invoice_for_appointment, create_private_invoice_for_appointment
)
from core.views.finance_views import finance_overview, finance_historical, finance_comparison
from core.views.views import process_prescription_ocr, create_prescription_from_ocr, settings_view

router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'patient-insurances', PatientInsuranceViewSet)
router.register(r'practitioners', PractitionerViewSet, basename='practitioner')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'treatments', TreatmentViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'insurance-providers', InsuranceProviderViewSet)
router.register(r'insurance-provider-groups', InsuranceProviderGroupViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'icd-codes', ICDCodeViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'bundeslaender', BundeslandViewSet, basename='bundesland')
router.register(r'users', UserViewSet)
router.register(r'user-roles', UserRoleViewSet)
router.register(r'billing-cycles', BillingCycleViewSet)
router.register(r'surcharges', SurchargeViewSet)
router.register(r'absences', AbsenceViewSet, basename='absence')
router.register(r'working-hours', WorkingHourViewSet)
router.register(r'practice', PracticeViewSet)
router.register(r'waitlist', WaitlistViewSet)
router.register(r'emergency-contacts', EmergencyContactViewSet)
router.register(r'specializations', SpecializationViewSet)
router.register(r'diagnosis-groups', DiagnosisGroupViewSet)
router.register(r'local-holidays', LocalHolidayViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'calendar-settings', CalendarSettingsViewSet)
router.register(r'practice-settings', PracticeSettingsViewSet)
router.register(r'user-preferences', UserPreferenceViewSet, basename='user-preferences')
router.register(r'treatment-types', TreatmentTypeViewSet)
router.register(r'price-lists', PriceListViewSet)
router.register(r'treatment-prices', TreatmentPriceViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'user-initials', UserInitialsViewSet, basename='user-initials')

urlpatterns = [
    path('', include(router.urls)),
    
    # Billing endpoints
    path('billing-cycles/bulk/', BulkBillingView.as_view(), name='bulk-billing'),
    path('invoices/overview/', invoice_overview, name='invoice-overview'),
    path('invoices/mark-paid/', mark_invoice_as_paid_api, name='mark-invoice-paid'),
    path('invoices/<str:invoice_id>/detail/', invoice_detail, name='invoice-detail'),
    path('copay-invoices/pending/', pending_copay_appointments, name='pending-copay-appointments'),
    path('copay-invoices/create/', create_copay_invoices, name='create-copay-invoices'),
    path('copay-invoices/create-from-billing-items/', create_copay_invoices_from_billing_items, name='create-copay-invoices-from-billing-items'),
    path('copay-invoices/create-for-appointment/', create_copay_invoice_for_appointment, name='create-copay-invoice-for-appointment'),
    path('invoices/create-private-invoice/', create_private_invoice_for_appointment, name='create-private-invoice-for-appointment'),
    
    # Dashboard stats
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('stats/', DashboardStatsView.as_view(), name='stats'),
    
    # User management
    path('users/<int:pk>/detail/', UserDetailView.as_view(), name='user-detail'),
    
    # Appointment series endpoints
    path('appointments/generate-series/<int:prescription_id>/', GenerateAppointmentsPreviewView.as_view(), name='generate-appointments-preview'),
    
    # Finance endpoints
    path('finance/overview/', finance_overview, name='finance-overview'),
    path('finance/historical/', finance_historical, name='finance-historical'),
    path('finance/comparison/', finance_comparison, name='finance-comparison'),
    
    # OCR endpoints
    path('prescriptions/ocr/process/', process_prescription_ocr, name='process-prescription-ocr'),
    path('prescriptions/ocr/create/', create_prescription_from_ocr, name='create-prescription-from-ocr'),
    
    # Settings endpoints
    path('settings/', settings_view, name='settings'),
]
