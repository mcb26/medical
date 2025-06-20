from django.contrib import admin
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.dateparse import parse_date, parse_datetime
from .models import (
    User,
    Patient,
    Doctor,
    Treatment,
    Prescription,
    Appointment,
    Room,
    Practitioner,
    InsuranceProvider,
    InsuranceProviderGroup,
    Category,
    Specialization,
    ICDCode,
    DiagnosisGroup,
    BillingCycle,
    Surcharge,
    PatientInsurance,
    EmergencyContact,
    PracticeSettings,
    CalendarSettings,
    Bundesland,
    WorkingHour,
    Practice,
    Absence
)
from .services.appointment_series import AppointmentSeriesService
from .services.bulk_billing_service import BulkBillingService
from django.contrib import messages
from django.utils.safestring import mark_safe
from .views.views import AppointmentSeriesViewSet
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status
from .serializers import AppointmentSerializer

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['patient', 'practitioner', 'appointment_date', 'status']
    list_filter = ['status', 'practitioner']
    search_fields = ['patient__first_name', 'patient__last_name']
    date_hierarchy = 'appointment_date'

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['patient', 'id', 'created_at', 'get_series_button']
    actions = ['create_appointment_series']
    
    def get_series_button(self, obj):
        return format_html(
            '<a class="button" href="{}">Terminserie erstellen</a>',
            reverse('admin:prescription-create-series', args=[obj.pk])
        )
    get_series_button.short_description = "Aktionen"
    get_series_button.allow_tags = True

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:prescription_id>/create_series/',
                self.admin_site.admin_view(self.create_series_view),
                name='prescription-create-series',
            ),
            path(
                '<int:prescription_id>/preview_series/',
                self.admin_site.admin_view(self.preview_series_view),
                name='prescription-preview-series',
            ),
            path(
                '<int:prescription_id>/confirm_series/',
                self.admin_site.admin_view(self.confirm_series_view),
                name='prescription-confirm-series',
            ),
        ]
        return custom_urls + urls

    def create_series_view(self, request, prescription_id):
        """Zeigt das initiale Formular zur Terminserienerstellung"""
        prescription = self.get_object(request, prescription_id)
        
        practitioners = Practitioner.objects.filter(is_active=True).order_by('last_name')
        rooms = Room.objects.filter(is_active=True).order_by('name')
        
        context = {
            **self.admin_site.each_context(request),
            'title': 'Terminserie erstellen',
            'prescription': prescription,
            'practitioners': practitioners,
            'rooms': rooms,
            'opts': self.model._meta,
        }
        
        return TemplateResponse(
            request,
            'admin/prescription/create_series.html',
            context,
        )

    def preview_series_view(self, request, prescription_id):
        """Zeigt eine Vorschau der möglichen Termine"""
        if request.method != 'POST':
            return HttpResponseRedirect(f"../create_series/")
            
        try:
            # Daten aus dem Formular holen
            data = {
                'prescription_id': prescription_id,
                'start_date': request.POST.get('start_date'),
                'appointment_time': request.POST.get('time'),
                'interval_days': int(request.POST.get('interval_days', 7)),
                'number_of_appointments': int(request.POST.get('number_of_appointments', 1)),
                'practitioner_id': request.POST.get('practitioner'),
                'room_id': request.POST.get('room')
            }
            
            # AppointmentSeriesViewSet für Vorschau nutzen
            viewset = AppointmentSeriesViewSet()
            response = viewset.preview(type('Request', (), {'data': data}))
            
            if response.status_code != 200:
                raise Exception(response.data.get('error', 'Unbekannter Fehler'))
                
            proposed_appointments = response.data['proposed_appointments']
            
            context = {
                **self.admin_site.each_context(request),
                'title': 'Terminvorschläge prüfen',
                'prescription_id': prescription_id,
                'appointments': proposed_appointments,
                'form_data': data,
                'opts': self.model._meta,
            }
            
            return TemplateResponse(
                request,
                'admin/prescription/preview_series.html',
                context,
            )
            
        except Exception as e:
            self.message_user(request, f"Fehler: {str(e)}", level=messages.ERROR)
            return HttpResponseRedirect("../create_series/")

    def confirm_series_view(self, request, prescription_id):
        """Bestätigt und erstellt die ausgewählten Termine"""
        if request.method != 'POST':
            return HttpResponseRedirect(f"../create_series/")
            
        try:
            # Daten aus dem Formular holen
            appointments_data = []
            for key in request.POST:
                if key.startswith('appointment_'):
                    index = key.split('_')[1]
                    appointments_data.append({
                        'proposed_datetime': request.POST.get(f'appointment_{index}_datetime'),
                        'practitioner': request.POST.get(f'appointment_{index}_practitioner'),
                        'room': request.POST.get(f'appointment_{index}_room'),
                        'is_available': True  # Wenn es im Formular ist, soll es erstellt werden
                    })

            # AppointmentSeriesViewSet für Erstellung nutzen
            viewset = AppointmentSeriesViewSet()
            response = viewset.confirm(type('Request', (), {'data': {
                'prescription_id': prescription_id,
                'appointments': appointments_data
            }}))
            
            if response.status_code == 201:
                self.message_user(
                    request,
                    f"{len(appointments_data)} Termine wurden erfolgreich erstellt",
                    messages.SUCCESS
                )
                return HttpResponseRedirect("../../")
            else:
                raise Exception(response.data.get('error', 'Unbekannter Fehler'))

        except Exception as e:
            self.message_user(request, f"Fehler: {str(e)}", level=messages.ERROR)
            return HttpResponseRedirect("../create_series/")

@admin.register(BillingCycle)
class BillingCycleAdmin(admin.ModelAdmin):
    list_display = [
        'insurance_provider', 
        'start_date', 
        'end_date', 
        'status', 
        'get_total_amount',
        'get_items_count'
    ]
    list_filter = ['status', 'insurance_provider']
    search_fields = ['insurance_provider__name']
    date_hierarchy = 'start_date'
    
    def get_total_amount(self, obj):
        return f"{obj.total_amount:.2f} € (+ {obj.total_copay:.2f} € Zuzahlung)"
    get_total_amount.short_description = 'Gesamtbetrag'

    def get_items_count(self, obj):
        return obj.billing_items.count()
    get_items_count.short_description = 'Anzahl Positionen'

    def get_items_details(self, obj):
        summary = obj.get_treatments_summary()
        details = [
            f"<strong>Gesamtübersicht:</strong><br>"
            f"Anzahl Positionen: {obj.billing_items.count()}<br>"
            f"Gesamtbetrag KK: {obj.total_amount:.2f} €<br>"
            f"Gesamtbetrag Zuzahlung: {obj.total_copay:.2f} €<br><br>"
            f"<strong>Behandlungsübersicht:</strong><br>"
        ]
        
        for treatment, data in summary.items():
            details.append(
                f"<strong>{treatment}</strong><br>"
                f"Anzahl: {data['count']}<br>"
                f"KK-Betrag: {data['insurance_amount']:.2f} €<br>"
                f"Zuzahlung: {data['copay_amount']:.2f} €<br>"
                f"<hr>"
            )
            
        details.append("<strong>Einzelpositionen:</strong><br>")
        
        for item in obj.billing_items.all():
            details.append(
                f"Patient: {item.prescription.patient}<br>"
                f"Behandlung: {item.treatment.treatment_name}<br>"
                f"Datum: {item.appointment.appointment_date.strftime('%d.%m.%Y')}<br>"
                f"KK-Betrag: {item.insurance_amount} €<br>"
                f"Zuzahlung: {item.patient_copay} €<br>"
                f"<hr>"
            )
        
        return mark_safe("".join(details))
    get_items_details.short_description = 'Abrechnungsdetails'

    readonly_fields = ['get_items_details', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basisdaten', {
            'fields': ('insurance_provider', 'start_date', 'end_date', 'status')
        }),
        ('Abrechnungsdetails', {
            'fields': ('get_items_details',)
        }),
        ('Zeitstempel', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    change_list_template = 'admin/billing_cycle/change_list.html'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'bulk-billing/',
                self.admin_site.admin_view(self.bulk_billing_view),
                name='bulk-billing'
            ),
        ]
        return custom_urls + urls
    
    def bulk_billing_view(self, request):
        if request.method == 'POST':
            try:
                start_date = request.POST.get('start_date')
                end_date = request.POST.get('end_date')
                
                results = BulkBillingService.create_bulk_billing_cycles(
                    start_date=parse_date(start_date),
                    end_date=parse_date(end_date)
                )
                
                # Erfolgsmeldung erstellen
                success_count = sum(1 for r in results if r['status'] == 'success')
                self.message_user(
                    request,
                    f"{success_count} Abrechnungszyklen erfolgreich erstellt",
                    messages.SUCCESS
                )
                
                # Fehler anzeigen
                errors = [r for r in results if r['status'] == 'error']
                for error in errors:
                    self.message_user(
                        request,
                        f"Fehler bei {error['insurance_provider']}: {error['message']}",
                        messages.ERROR
                    )
                
                return HttpResponseRedirect("../")
                
            except Exception as e:
                self.message_user(request, f"Fehler: {str(e)}", messages.ERROR)
                return HttpResponseRedirect("../")
        
        context = {
            **self.admin_site.each_context(request),
            'title': 'Massenabrechnungen erstellen',
            'opts': self.model._meta,
        }
        
        return TemplateResponse(
            request,
            'admin/billing_cycle/bulk_billing.html',
            context,
        )

@admin.register(Surcharge)
class SurchargeAdmin(admin.ModelAdmin):
    list_display = [
        'treatment',
        'insurance_provider_group',
        'insurance_payment',
        'patient_payment',
        'valid_from',
        'valid_until'
    ]
    list_filter = [
        'insurance_provider_group',
        'treatment__category',
        'valid_from',
        'valid_until'
    ]
    search_fields = [
        'treatment__treatment_name',
        'insurance_provider_group__name'
    ]
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['insurance_payment'].help_text = "Betrag, den die Krankenkasse zahlt"
        form.base_fields['patient_payment'].help_text = "Zuzahlungsbetrag des Patienten"
        form.base_fields['valid_from'].help_text = "Gültig ab diesem Datum"
        form.base_fields['valid_until'].help_text = "Gültig bis zu diesem Datum (leer = unbegrenzt gültig)"
        return form

@admin.register(InsuranceProviderGroup)
class InsuranceProviderGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']

@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ['treatment_name', 'category', 'duration_minutes', 'is_self_pay']
    list_filter = ['category', 'is_self_pay']
    search_fields = ['treatment_name']

@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display = [
        'practitioner',
        'absence_type',
        'start_date',
        'end_date',
        'is_full_day',
        'get_time_range',
        'is_approved'
    ]
    
    list_filter = [
        'absence_type',
        'is_full_day',
        'start_date',
        'practitioner',
        'approved_by'
    ]
    
    search_fields = [
        'practitioner__first_name',
        'practitioner__last_name',
        'notes'
    ]
    
    readonly_fields = ['approved_by', 'approved_at']
    
    fieldsets = (
        ('Grunddaten', {
            'fields': (
                'practitioner',
                'absence_type',
                'start_date',
                'end_date',
                'is_full_day',
            )
        }),
        ('Uhrzeiten', {
            'fields': (
                'start_time',
                'end_time',
            ),
            'classes': ('collapse',),
            'description': 'Nur relevant bei stundenweiser Abwesenheit'
        }),
        ('Zusatzinformationen', {
            'fields': (
                'notes',
            )
        }),
        ('Genehmigung', {
            'fields': (
                'approved_by',
                'approved_at',
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_time_range(self, obj):
        if obj.is_full_day:
            return "Ganztägig"
        return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"
    get_time_range.short_description = "Zeitraum"

    def save_model(self, request, obj, form, change):
        if not change:  # Wenn es ein neuer Eintrag ist
            obj.approved_by = request.user
            obj.approved_at = timezone.now()
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['start_date'].help_text = "Erster Tag der Abwesenheit"
        form.base_fields['end_date'].help_text = "Letzter Tag der Abwesenheit"
        form.base_fields['is_full_day'].help_text = "Ganztägige oder stundenweise Abwesenheit"
        form.base_fields['notes'].help_text = "Optionale Notizen zur Abwesenheit"
        return form

    class Media:
        js = ('admin/js/absence_form.js',)  # Für dynamische Formularanpassungen

# Basis Admin-Registrierungen
admin.site.register(User)
admin.site.register(Patient)
admin.site.register(Doctor)
admin.site.register(Room)
admin.site.register(Practitioner)
admin.site.register(InsuranceProvider)
admin.site.register(Category)
admin.site.register(Specialization)
admin.site.register(ICDCode)
admin.site.register(DiagnosisGroup)
admin.site.register(PatientInsurance)
admin.site.register(EmergencyContact)
admin.site.register(PracticeSettings)
admin.site.register(CalendarSettings)
admin.site.register(Bundesland)
admin.site.register(WorkingHour)
admin.site.register(Practice)
