import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from core.models import Appointment, PatientInvoice, Treatment, Patient
from django.utils import timezone

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_overview(request):
    try:
        # Aktuelles Datum und Zeitraum für die Übersicht
        today = timezone.now()
        start_of_year = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        logger.debug("Berechne Gesamtumsatz...")
        # Gesamtumsatz
        total_revenue = PatientInvoice.objects.filter(
            status='paid'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        logger.debug("Berechne offene Rechnungen...")
        # Offene und bezahlte Rechnungen
        open_invoices = PatientInvoice.objects.filter(
            status='created'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        paid_invoices = PatientInvoice.objects.filter(
            status='paid'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        logger.debug("Berechne Monatsumsätze...")
        # Umsatz nach Monaten
        revenue_by_month = PatientInvoice.objects.filter(
            created_at__gte=start_of_year,
            status='paid'
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            revenue=Sum('amount')
        ).order_by('month')

        logger.debug("Berechne Versicherungsumsätze...")
        # Umsatz nach Versicherung
        revenue_by_insurance = PatientInvoice.objects.filter(
            status='paid'
        ).values(
            'patient__insurances__insurance_provider__name'
        ).annotate(
            value=Sum('amount'),
            name=F('patient__insurances__insurance_provider__name')
        ).filter(name__isnull=False)

        logger.debug("Berechne Behandlungsumsätze...")
        # Umsatz nach Behandlungsart
        revenue_by_treatment = Appointment.objects.filter(
            status='completed'
        ).values(
            'treatment__treatment_name'
        ).annotate(
            value=Count('id'),
            name=F('treatment__treatment_name')
        ).filter(name__isnull=False)  # Filtere Null-Werte

        logger.debug("Hole letzte Transaktionen...")
        # Letzte Transaktionen
        latest_transactions = PatientInvoice.objects.select_related(
            'patient'
        ).order_by('-created_at')[:10].values(
            'id',
            'created_at',
            'amount',
            'status',
            'patient__first_name',
            'patient__last_name'
        )

        # Formatierung der Transaktionen
        transactions = [{
            'id': t['id'],
            'date': t['created_at'],
            'amount': float(t['amount']),  # Konvertiere Decimal zu float
            'status': t['status'],
            'patient': f"{t['patient__first_name']} {t['patient__last_name']}",
            'description': 'Behandlungsrechnung'
        } for t in latest_transactions]

        data = {
            'totalRevenue': float(total_revenue),  # Konvertiere Decimal zu float
            'openInvoices': float(open_invoices),  # Konvertiere Decimal zu float
            'paidInvoices': float(paid_invoices),  # Konvertiere Decimal zu float
            'revenueByMonth': [
                {
                    'month': item['month'].strftime('%B %Y'),
                    'revenue': float(item['revenue'])
                } for item in revenue_by_month
            ],
            'revenueByInsurance': [
                {
                    'name': item['name'] or 'Unbekannt',
                    'value': float(item['value'])
                } for item in revenue_by_insurance
            ],
            'revenueByTreatment': [
                {
                    'name': item['name'] or 'Unbekannt',
                    'value': float(item['value'])
                } for item in revenue_by_treatment
            ],
            'latestTransactions': transactions
        }

        return Response(data)

    except Exception as e:
        logger.exception("Fehler in finance_overview:")
        return Response(
            {'error': str(e)}, 
            status=500
        ) 