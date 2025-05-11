from datetime import date
from django.views.generic import ListView, DetailView, CreateView
from django.views.generic.edit import FormView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse_lazy
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date

from core.models import PatientInvoice, Patient, BillingItem
from core.services.invoice_generator import InvoiceGenerator
from core.forms import PatientInvoiceForm  # Müssen wir noch erstellen
from core.services.bulk_billing_service import BulkBillingService

class PatientInvoiceListView(LoginRequiredMixin, ListView):
    model = PatientInvoice
    template_name = 'billing/invoice_list.html'
    context_object_name = 'invoices'
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filteroptionen
        status = self.request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by('-invoice_date')

class PatientInvoiceDetailView(LoginRequiredMixin, DetailView):
    model = PatientInvoice
    template_name = 'billing/invoice_detail.html'
    context_object_name = 'invoice'

class CreatePatientInvoiceView(LoginRequiredMixin, FormView):
    template_name = 'billing/create_invoice.html'
    form_class = PatientInvoiceForm
    success_url = reverse_lazy('invoice-list')

    def form_valid(self, form):
        patient = form.cleaned_data['patient']
        start_date = form.cleaned_data['start_date']
        end_date = form.cleaned_data['end_date']

        # Hole unbezahlte Behandlungen für den Zeitraum
        billing_items = InvoiceGenerator.get_patient_items_for_period(
            patient=patient,
            start_date=start_date,
            end_date=end_date,
            only_unbilled=True
        )

        if not billing_items:
            form.add_error(None, "Keine abrechenbaren Behandlungen im gewählten Zeitraum gefunden.")
            return self.form_invalid(form)

        # Erstelle Rechnung
        invoice = InvoiceGenerator.create_patient_invoice(
            patient=patient,
            billing_items=billing_items
        )

        return super().form_valid(form)

def download_invoice_pdf(request, pk):
    invoice = get_object_or_404(PatientInvoice, pk=pk)
    
    # Generiere PDF
    pdf_content = InvoiceGenerator.generate_patient_invoice(
        patient=invoice.patient,
        billing_items=invoice.billing_items.all(),
        invoice_number=invoice.invoice_number
    )
    
    # Erstelle Response
    response = HttpResponse(pdf_content, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Rechnung_{invoice.invoice_number}.pdf"'
    
    return response

def mark_invoice_as_paid(request, pk):
    if request.method != 'POST':
        return JsonResponse({'error': 'Nur POST-Anfragen erlaubt'}, status=405)
    
    invoice = get_object_or_404(PatientInvoice, pk=pk)
    payment_date = request.POST.get('payment_date', date.today())
    
    invoice.status = 'paid'
    invoice.payment_date = payment_date
    invoice.save()
    
    return JsonResponse({'status': 'success'})

class BulkBillingView(APIView):
    def post(self, request):
        """Erstellt Abrechnungszyklen für alle Krankenkassen im Zeitraum"""
        start_date = parse_date(request.data.get('start_date'))
        end_date = parse_date(request.data.get('end_date'))
        
        if not all([start_date, end_date]):
            return Response(
                {'error': 'Bitte gültiges Start- und Enddatum angeben'},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = BulkBillingService.create_bulk_billing_cycles(
            start_date=start_date,
            end_date=end_date
        )
        
        return Response(results)

    def get(self, request):
        """Gibt eine Vorschau der zu erwartenden Abrechnungen"""
        start_date = parse_date(request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('end_date'))
        
        if not all([start_date, end_date]):
            return Response(
                {'error': 'Bitte gültiges Start- und Enddatum angeben'},
                status=status.HTTP_400_BAD_REQUEST
            )

        preview = BulkBillingService.get_preview(
            start_date=start_date,
            end_date=end_date
        )
        
        return Response(preview) 