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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_date
from datetime import datetime
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal

from core.models import (
    PatientInvoice, Patient, BillingItem, PatientCopayInvoice, 
    PrivatePatientInvoice, GKVInsuranceClaim, Payment, Appointment
)
from core.services.invoice_generator import InvoiceGenerator
from core.services.copay_invoice_service import CopayInvoiceService
from core.forms import PatientInvoiceForm  # Müssen wir noch erstellen
from core.services.bulk_billing_service import BulkBillingService

def parse_german_date(date_string):
    """Parst deutsche Datumsformate (DD.MM.YYYY)"""
    if not date_string:
        return None
    
    try:
        # Versuche zuerst das deutsche Format DD.MM.YYYY
        if '.' in date_string:
            return datetime.strptime(date_string, '%d.%m.%Y').date()
        # Fallback auf das Standard-Format YYYY-MM-DD
        else:
            return parse_date(date_string)
    except (ValueError, TypeError):
        return None

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_overview(request):
    """Übersicht aller Rechnungen (Krankenkassen und Patienten)"""
    try:
        # Filter-Parameter
        invoice_type = request.GET.get('type', 'all')  # all, gkv, patient, private
        status_filter = request.GET.get('status', 'all')  # all, created, sent, paid, overdue
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        # Datum-Parsing
        if start_date:
            start_date = parse_german_date(start_date)
        if end_date:
            end_date = parse_german_date(end_date)
        
        # Basis-Query für GKV-Ansprüche
        gkv_claims = GKVInsuranceClaim.objects.select_related(
            'insurance_provider', 'billing_cycle'
        ).prefetch_related('billing_items__appointment__patient')
        
        # Basis-Query für Patienten-Zuzahlungsrechnungen
        copay_invoices = PatientCopayInvoice.objects.select_related(
            'patient', 'gkv_claim__insurance_provider'
        )
        
        # Basis-Query für private Patientenrechnungen
        private_invoices = PrivatePatientInvoice.objects.select_related(
            'patient', 'billing_cycle'
        )
        
        # Filter anwenden
        if start_date:
            gkv_claims = gkv_claims.filter(created_at__date__gte=start_date)
            copay_invoices = copay_invoices.filter(invoice_date__gte=start_date)
            private_invoices = private_invoices.filter(invoice_date__gte=start_date)
        
        if end_date:
            gkv_claims = gkv_claims.filter(created_at__date__lte=end_date)
            copay_invoices = copay_invoices.filter(invoice_date__lte=end_date)
            private_invoices = private_invoices.filter(invoice_date__lte=end_date)
        
        if status_filter != 'all':
            if status_filter == 'overdue':
                copay_invoices = copay_invoices.filter(
                    Q(status__in=['created', 'sent']) & Q(due_date__lt=date.today())
                )
                private_invoices = private_invoices.filter(
                    Q(status__in=['created', 'sent']) & Q(due_date__lt=date.today())
                )
            else:
                copay_invoices = copay_invoices.filter(status=status_filter)
                private_invoices = private_invoices.filter(status=status_filter)
        
        # Daten zusammenstellen
        invoices_data = []
        
        # GKV-Ansprüche
        if invoice_type in ['all', 'gkv']:
            for claim in gkv_claims:
                total_amount = claim.billing_items.aggregate(
                    total=Sum('insurance_amount')
                )['total'] or 0
                
                invoices_data.append({
                    'id': f"gkv_{claim.id}",
                    'type': 'gkv_claim',
                    'invoice_number': f"GKV-{claim.id}",
                    'patient_name': claim.billing_items.first().appointment.patient.full_name if claim.billing_items.exists() else 'N/A',
                    'insurance_provider': claim.insurance_provider.name,
                    'invoice_date': claim.created_at.date(),
                    'due_date': None,
                    'amount': float(total_amount),
                    'status': 'submitted',  # GKV-Ansprüche sind immer eingereicht
                    'is_overdue': False,
                    'payment_date': None,
                    'payment_method': None,
                    'notes': f"GKV-Anspruch für {claim.billing_items.count()} Behandlungen"
                })
        
        # Patienten-Zuzahlungsrechnungen
        if invoice_type in ['all', 'patient']:
            for invoice in copay_invoices:
                invoices_data.append({
                    'id': f"copay_{invoice.id}",
                    'type': 'copay_invoice',
                    'invoice_number': invoice.invoice_number,
                    'patient_name': invoice.patient.full_name,
                    'insurance_provider': invoice.gkv_claim.insurance_provider.name,
                    'invoice_date': invoice.invoice_date,
                    'due_date': invoice.due_date,
                    'amount': float(invoice.total_copay),
                    'status': invoice.status,
                    'is_overdue': invoice.is_overdue,
                    'payment_date': invoice.payment_date,
                    'payment_method': invoice.payment_method,
                    'notes': 'GKV-Zuzahlung'
                })
        
        # Private Patientenrechnungen
        if invoice_type in ['all', 'private']:
            for invoice in private_invoices:
                invoices_data.append({
                    'id': f"private_{invoice.id}",
                    'type': 'private_invoice',
                    'invoice_number': invoice.invoice_number,
                    'patient_name': invoice.patient.full_name,
                    'insurance_provider': 'Private Versicherung',
                    'invoice_date': invoice.invoice_date,
                    'due_date': invoice.due_date,
                    'amount': float(invoice.total_amount),
                    'status': invoice.status,
                    'is_overdue': invoice.is_overdue,
                    'payment_date': invoice.payment_date,
                    'payment_method': invoice.payment_method,
                    'notes': 'Private Rechnung'
                })
        
        # Sortierung nach Datum (neueste zuerst)
        invoices_data.sort(key=lambda x: x['invoice_date'], reverse=True)
        
        # Statistiken
        total_amount = sum(inv['amount'] for inv in invoices_data)
        paid_amount = sum(inv['amount'] for inv in invoices_data if inv['status'] == 'paid')
        overdue_amount = sum(inv['amount'] for inv in invoices_data if inv['is_overdue'])
        
        stats = {
            'total_invoices': len(invoices_data),
            'total_amount': total_amount,
            'paid_amount': paid_amount,
            'overdue_amount': overdue_amount,
            'paid_percentage': (paid_amount / total_amount * 100) if total_amount > 0 else 0
        }
        
        return Response({
            'invoices': invoices_data,
            'stats': stats
        })
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Abrufen der Rechnungsübersicht: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_invoice_as_paid_api(request):
    """Markiert eine Rechnung als bezahlt"""
    try:
        invoice_id = request.data.get('invoice_id')
        payment_date = request.data.get('payment_date')
        payment_method = request.data.get('payment_method', 'bank_transfer')
        
        if not invoice_id:
            return Response(
                {'error': 'Rechnungs-ID ist erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse payment_date
        if payment_date:
            payment_date = parse_german_date(payment_date)
        else:
            payment_date = date.today()
        
        # Rechnungstyp und ID extrahieren
        if invoice_id.startswith('gkv_'):
            # GKV-Anspruch - kann nicht als bezahlt markiert werden
            return Response(
                {'error': 'GKV-Ansprüche können nicht als bezahlt markiert werden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        elif invoice_id.startswith('copay_'):
            # Patienten-Zuzahlungsrechnung
            invoice = get_object_or_404(PatientCopayInvoice, id=invoice_id.split('_')[1])
            invoice.mark_as_paid(payment_date, payment_method)
            
            # Zahlung erstellen
            Payment.objects.create(
                copay_invoice=invoice,
                payment_date=payment_date,
                amount=invoice.total_copay,
                payment_method=payment_method,
                payment_type='gkv_copay',
                created_by=request.user
            )
            
        elif invoice_id.startswith('private_'):
            # Private Patientenrechnung
            invoice = get_object_or_404(PrivatePatientInvoice, id=invoice_id.split('_')[1])
            invoice.mark_as_paid(payment_date, payment_method)
            
            # Zahlung erstellen
            Payment.objects.create(
                private_invoice=invoice,
                payment_date=payment_date,
                amount=invoice.total_amount,
                payment_method=payment_method,
                payment_type='private_invoice',
                created_by=request.user
            )
        
        else:
            return Response(
                {'error': 'Ungültige Rechnungs-ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'status': 'success', 'message': 'Rechnung als bezahlt markiert'})
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Markieren der Rechnung: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_detail(request, invoice_id):
    """Detailansicht einer Rechnung"""
    try:
        # Rechnungstyp und ID extrahieren
        if invoice_id.startswith('gkv_'):
            claim_id = invoice_id.split('_')[1]
            claim = get_object_or_404(GKVInsuranceClaim, id=claim_id)
            
            billing_items = claim.billing_items.select_related(
                'appointment__patient', 'treatment'
            )
            
            return Response({
                'type': 'gkv_claim',
                'id': claim.id,
                'insurance_provider': claim.insurance_provider.name,
                'created_at': claim.created_at,
                'billing_items': [{
                    'patient': item.appointment.patient.full_name,
                    'treatment': item.treatment.treatment_name,
                    'date': item.appointment.appointment_date,
                    'insurance_amount': float(item.insurance_amount),
                    'patient_copay': float(item.patient_copay)
                } for item in billing_items],
                'total_insurance_amount': float(billing_items.aggregate(Sum('insurance_amount'))['insurance_amount__sum'] or 0),
                'total_patient_copay': float(billing_items.aggregate(Sum('patient_copay'))['patient_copay__sum'] or 0)
            })
            
        elif invoice_id.startswith('copay_'):
            invoice_id_num = invoice_id.split('_')[1]
            invoice = get_object_or_404(PatientCopayInvoice, id=invoice_id_num)
            
            billing_items = invoice.get_billing_items().select_related(
                'appointment__patient', 'treatment'
            )
            
            return Response({
                'type': 'copay_invoice',
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'patient': invoice.patient.full_name,
                'insurance_provider': invoice.gkv_claim.insurance_provider.name,
                'invoice_date': invoice.invoice_date,
                'due_date': invoice.due_date,
                'total_copay': float(invoice.total_copay),
                'status': invoice.status,
                'payment_date': invoice.payment_date,
                'payment_method': invoice.payment_method,
                'billing_items': [{
                    'patient': item.appointment.patient.full_name,
                    'treatment': item.treatment.treatment_name,
                    'date': item.appointment.appointment_date,
                    'patient_copay': float(item.patient_copay)
                } for item in billing_items]
            })
            
        elif invoice_id.startswith('private_'):
            invoice_id_num = invoice_id.split('_')[1]
            invoice = get_object_or_404(PrivatePatientInvoice, id=invoice_id_num)
            
            billing_items = invoice.get_billing_items().select_related(
                'appointment__patient', 'treatment'
            )
            
            return Response({
                'type': 'private_invoice',
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'patient': invoice.patient.full_name,
                'invoice_date': invoice.invoice_date,
                'due_date': invoice.due_date,
                'total_amount': float(invoice.total_amount),
                'status': invoice.status,
                'payment_date': invoice.payment_date,
                'payment_method': invoice.payment_method,
                'billing_items': [{
                    'patient': item.appointment.patient.full_name,
                    'treatment': item.treatment.treatment_name,
                    'date': item.appointment.appointment_date,
                    'total_amount': float(item.get_total_amount())
                } for item in billing_items]
            })
        
        else:
            return Response(
                {'error': 'Ungültige Rechnungs-ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Abrufen der Rechnungsdetails: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_copay_appointments(request):
    """Holt Termine mit ausstehenden Zuzahlungen"""
    try:
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        patient_id = request.GET.get('patient_id')
        
        # Datum-Parsing
        if start_date:
            start_date = parse_german_date(start_date)
        if end_date:
            end_date = parse_german_date(end_date)
        
        # Patient-ID-Parsing
        if patient_id:
            try:
                patient_id = int(patient_id)
            except ValueError:
                return Response(
                    {'error': 'Ungültige Patient-ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Hole ausstehende Termine
        appointments = CopayInvoiceService.get_pending_copay_appointments(
            start_date=start_date,
            end_date=end_date,
            patient_id=patient_id
        )
        
        # Daten für Response vorbereiten
        appointments_data = []
        total_copay = Decimal('0.00')
        
        for appointment in appointments:
            billing_amount = appointment.get_billing_amount()
            if billing_amount and billing_amount['patient_copay'] > 0:
                appointments_data.append({
                    'id': appointment.id,
                    'patient_name': appointment.prescription.patient.full_name,
                    'patient_id': appointment.prescription.patient.id,
                    'treatment_name': appointment.treatment.treatment_name,
                    'appointment_date': appointment.appointment_date.date(),
                    'copay_amount': float(billing_amount['patient_copay']),
                    'insurance_amount': float(billing_amount['insurance_amount']),
                    'insurance_provider': appointment.prescription.patient_insurance.insurance_provider.name
                })
                total_copay += billing_amount['patient_copay']
        
        return Response({
            'appointments': appointments_data,
            'total_appointments': len(appointments_data),
            'total_copay': float(total_copay)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Abrufen der ausstehenden Zuzahlungen: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_copay_invoices(request):
    """Erstellt Zuzahlungsrechnungen für ausstehende Termine"""
    try:
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        patient_id = request.data.get('patient_id')
        due_date_days = request.data.get('due_date_days', 30)
        
        # Datum-Parsing
        if start_date:
            start_date = parse_german_date(start_date)
        if end_date:
            end_date = parse_german_date(end_date)
        
        # Patient-ID-Parsing
        if patient_id:
            try:
                patient_id = int(patient_id)
            except ValueError:
                return Response(
                    {'error': 'Ungültige Patient-ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Hole ausstehende Termine
        appointments = CopayInvoiceService.get_pending_copay_appointments(
            start_date=start_date,
            end_date=end_date,
            patient_id=patient_id
        )
        
        if not appointments:
            return Response({
                'message': 'Keine ausstehenden Zuzahlungen gefunden.',
                'total_invoices_created': 0,
                'total_amount': 0.0,
                'patients_processed': 0,
                'invoices': []
            })
        
        # Erstelle Rechnungen
        results = CopayInvoiceService.create_copay_invoices_from_appointments(
            appointments,
            due_date_days
        )
        
        return Response({
            'message': f'{results["total_invoices_created"]} Zuzahlungsrechnungen erstellt',
            'total_invoices_created': results['total_invoices_created'],
            'total_amount': float(results['total_amount']),
            'patients_processed': results['patients_processed'],
            'invoices': results['invoices'],
            'errors': results['errors']
        })
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Erstellen der Zuzahlungsrechnungen: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_private_invoice_for_appointment(request):
    """Erstellt eine private Rechnung für einen spezifischen Termin (Selbstzahler)"""
    try:
        appointment_id = request.data.get('appointment_id')
        due_date_days = request.data.get('due_date_days', 30)
        
        if not appointment_id:
            return Response(
                {'error': 'appointment_id ist erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Hole den Termin
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {'error': f'Termin mit ID {appointment_id} nicht gefunden'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prüfe ob der Termin abgeschlossen ist
        if appointment.status != 'completed':
            return Response(
                {'error': 'Nur abgeschlossene Termine können abgerechnet werden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prüfe ob es eine Selbstzahler-Behandlung ist
        if not appointment.treatment.is_self_pay:
            return Response(
                {'error': 'Nur Selbstzahler-Behandlungen können als private Rechnung erstellt werden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Erstelle private Rechnung
        from datetime import date, timedelta
        import uuid
        
        invoice_number = f"P-{appointment.patient.id}-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        due_date = date.today() + timedelta(days=due_date_days)
        
        private_invoice = PrivatePatientInvoice.objects.create(
            patient=appointment.prescription.patient if appointment.prescription else appointment.patient,
            invoice_number=invoice_number,
            due_date=due_date,
            total_amount=appointment.treatment.self_pay_price,
            status='created',
            notes=f'Private Rechnung für {appointment.treatment.treatment_name}'
        )
        
        return Response({
            'success': True,
            'message': 'Private Rechnung erfolgreich erstellt',
            'invoice_number': invoice_number,
            'total_amount': float(private_invoice.total_amount),
            'due_date': private_invoice.due_date.isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Erstellen der privaten Rechnung: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_copay_invoice_for_appointment(request):
    """Erstellt eine Zuzahlungsrechnung für einen spezifischen Termin"""
    try:
        appointment_id = request.data.get('appointment_id')
        due_date_days = request.data.get('due_date_days', 30)
        
        if not appointment_id:
            return Response(
                {'error': 'appointment_id ist erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Hole den Termin
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {'error': f'Termin mit ID {appointment_id} nicht gefunden'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prüfe ob der Termin abgeschlossen ist
        if appointment.status != 'completed':
            return Response(
                {'error': 'Nur abgeschlossene Termine können abgerechnet werden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Erstelle Rechnung für diesen Termin
        results = CopayInvoiceService.create_copay_invoices_from_appointments(
            [appointment],
            due_date_days
        )
        
        return Response({
            'message': f'{results["total_invoices_created"]} Zuzahlungsrechnung(en) erstellt',
            'total_invoices_created': results['total_invoices_created'],
            'total_amount': float(results['total_amount']),
            'patients_processed': results['patients_processed'],
            'invoices': results['invoices'],
            'errors': results['errors']
        })
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Erstellen der Zuzahlungsrechnung: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_copay_invoices_from_billing_items(request):
    """Erstellt Zuzahlungsrechnungen aus BillingItems"""
    try:
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        patient_id = request.data.get('patient_id')
        due_date_days = request.data.get('due_date_days', 30)
        
        # Datum-Parsing
        if start_date:
            start_date = parse_german_date(start_date)
        if end_date:
            end_date = parse_german_date(end_date)
        
        # Patient-ID-Parsing
        if patient_id:
            try:
                patient_id = int(patient_id)
            except ValueError:
                return Response(
                    {'error': 'Ungültige Patient-ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Hole ausstehende BillingItems
        billing_items = CopayInvoiceService.get_pending_copay_billing_items(
            start_date=start_date,
            end_date=end_date,
            patient_id=patient_id
        )
        
        if not billing_items:
            return Response({
                'message': 'Keine ausstehenden Zuzahlungen in BillingItems gefunden.',
                'total_invoices_created': 0,
                'total_amount': 0.0,
                'patients_processed': 0,
                'invoices': []
            })
        
        # Erstelle Rechnungen
        results = CopayInvoiceService.create_copay_invoices_from_billing_items(
            billing_items,
            due_date_days
        )
        
        return Response({
            'message': f'{results["total_invoices_created"]} Zuzahlungsrechnungen erstellt',
            'total_invoices_created': results['total_invoices_created'],
            'total_amount': float(results['total_amount']),
            'patients_processed': results['patients_processed'],
            'invoices': results['invoices'],
            'errors': results['errors']
        })
        
    except Exception as e:
        return Response(
            {'error': f'Fehler beim Erstellen der Zuzahlungsrechnungen: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class BulkBillingView(APIView):
    def post(self, request):
        """Erstellt Abrechnungszyklen für alle Krankenkassen im Zeitraum"""
        try:
            start_date = parse_german_date(request.data.get('start_date'))
            end_date = parse_german_date(request.data.get('end_date'))
            
            if not all([start_date, end_date]):
                return Response(
                    {'error': 'Bitte gültiges Start- und Enddatum angeben'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if start_date >= end_date:
                return Response(
                    {'error': 'Das Enddatum muss nach dem Startdatum liegen'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            results = BulkBillingService.create_bulk_billing_cycles(
                start_date=start_date,
                end_date=end_date
            )
            
            # Zähle die Ergebnisse
            success_count = sum(1 for r in results if r.get('status') == 'success')
            skipped_count = sum(1 for r in results if r.get('status') == 'skipped')
            error_count = sum(1 for r in results if r.get('status') == 'error')
            
            # Erstelle die Antwort-Struktur
            response_data = {
                'message': f'{success_count} Abrechnungszeiträume erstellt',
                'billing_cycles': [r for r in results if r.get('status') == 'success'],
                'summary': {
                    'success': success_count,
                    'skipped': skipped_count,
                    'error': error_count,
                    'total': len(results)
                },
                'details': results
            }
            
            return Response(response_data)
            
        except Exception as e:
            import traceback
            print(f"Fehler bei der Massenabrechnung: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Fehler bei der Massenabrechnung: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        """Gibt eine Vorschau der zu erwartenden Abrechnungen"""
        try:
            start_date = parse_german_date(request.GET.get('start_date'))
            end_date = parse_german_date(request.GET.get('end_date'))
            
            if not all([start_date, end_date]):
                return Response(
                    {'error': 'Bitte gültiges Start- und Enddatum angeben'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if start_date >= end_date:
                return Response(
                    {'error': 'Das Enddatum muss nach dem Startdatum liegen'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            preview = BulkBillingService.get_preview(
                start_date=start_date,
                end_date=end_date
            )
            
            return Response(preview)
            
        except Exception as e:
            return Response(
                {'error': f'Fehler bei der Vorschau-Erstellung: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 