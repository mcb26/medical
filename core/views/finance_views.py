import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Avg, Q
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay, TruncYear
from datetime import datetime, timedelta
from core.models import Appointment, PatientInvoice, Treatment, Patient, BillingItem, BillingCycle
from django.utils import timezone
import calendar

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_overview(request):
    try:
        # Zeitraum aus Query-Parameter
        period = request.GET.get('period', 'month')
        year = int(request.GET.get('year', timezone.now().year))
        month = int(request.GET.get('month', timezone.now().month))
        
        # Aktuelles Datum und Zeitraum für die Übersicht
        today = timezone.now()
        
        # Zeitraum basierend auf ausgewähltem Jahr/Monat
        if period == 'month':
            start_date = timezone.make_aware(datetime(year, month, 1))
            end_date = timezone.make_aware(datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59))
        elif period == 'quarter':
            quarter_start_month = ((month - 1) // 3) * 3 + 1
            start_date = timezone.make_aware(datetime(year, quarter_start_month, 1))
            end_date = timezone.make_aware(datetime(year, quarter_start_month + 2, calendar.monthrange(year, quarter_start_month + 2)[1], 23, 59, 59))
        elif period == 'year':
            start_date = timezone.make_aware(datetime(year, 1, 1))
            end_date = timezone.make_aware(datetime(year, 12, 31, 23, 59, 59))
        else:
            # Fallback auf aktuellen Monat
            start_date = today - timedelta(days=30)
            end_date = today
        
        logger.debug(f"Berechne Finanzdaten für Zeitraum: {period} ({start_date} - {end_date})")
        
        # Gesamtumsatz (alle bezahlten Rechnungen im Zeitraum)
        total_revenue = PatientInvoice.objects.filter(
            status='paid',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Offene Rechnungen
        open_invoices = PatientInvoice.objects.filter(
            status='created',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Bezahlte Rechnungen
        paid_invoices = PatientInvoice.objects.filter(
            status='paid',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # GKV-Umsatz (aus BillingItems)
        gkv_revenue = BillingItem.objects.filter(
            is_gkv_billing=True,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('insurance_amount')
        )['total'] or 0

        # Private Patienten Umsatz
        private_revenue = BillingItem.objects.filter(
            is_private_billing=True,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('insurance_amount')
        )['total'] or 0

        # Zuzahlungen
        copay_revenue = BillingItem.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('patient_copay')
        )['total'] or 0

        # Ausstehende Beträge
        outstanding_amount = PatientInvoice.objects.filter(
            status__in=['created', 'sent'],
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Durchschnittliche Rechnung
        average_invoice_amount = PatientInvoice.objects.filter(
            status='paid',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            avg=Avg('amount')
        )['avg'] or 0

        logger.debug("Berechne Monatsumsätze...")
        # Umsatz nach Monaten (für den ausgewählten Zeitraum)
        if period == 'year':
            revenue_by_month = PatientInvoice.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date,
                status='paid'
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                revenue=Sum('amount'),
                open_invoices=Sum('amount', filter=Q(status='created'))
            ).order_by('month')
        else:
            # Für Monat/Quartal: Tagesweise Aufschlüsselung
            revenue_by_month = PatientInvoice.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date,
                status='paid'
            ).annotate(
                day=TruncDay('created_at')
            ).values('day').annotate(
                revenue=Sum('amount'),
                open_invoices=Sum('amount', filter=Q(status='created'))
            ).order_by('day')

        logger.debug("Berechne Versicherungsumsätze...")
        # Umsatz nach Versicherungen - vereinfacht
        try:
            revenue_by_insurance = BillingItem.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).values(
                'appointment__patient__patientinsurance__insurance_provider__name'
            ).annotate(
                value=Sum('insurance_amount')
            ).filter(
                appointment__patient__patientinsurance__insurance_provider__name__isnull=False
            ).order_by('-value')[:10]
        except Exception as e:
            logger.warning(f"Fehler bei Versicherungsumsätzen: {e}")
            revenue_by_insurance = []

        logger.debug("Berechne Behandlungsumsätze...")
        # Umsatz nach Behandlungen - vereinfacht
        try:
            revenue_by_treatment = BillingItem.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).values(
                'appointment__treatment__treatment_name'
            ).annotate(
                value=Sum('insurance_amount')
            ).filter(
                appointment__treatment__treatment_name__isnull=False
            ).order_by('-value')[:10]
        except Exception as e:
            logger.warning(f"Fehler bei Behandlungsumsätzen: {e}")
            revenue_by_treatment = []

        # Letzte Transaktionen - vereinfacht
        try:
            latest_transactions = BillingItem.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).select_related(
                'appointment__patient',
                'appointment__treatment'
            ).order_by('-created_at')[:15]
        except Exception as e:
            logger.warning(f"Fehler bei letzten Transaktionen: {e}")
            latest_transactions = []

        # Formatierung der Transaktionen
        formatted_transactions = []
        for transaction in latest_transactions:
            try:
                patient_name = "Unbekannt"
                treatment_name = "Unbekannt"
                
                if hasattr(transaction, 'appointment') and transaction.appointment:
                    if hasattr(transaction.appointment, 'patient') and transaction.appointment.patient:
                        patient_name = f"{transaction.appointment.patient.first_name} {transaction.appointment.patient.last_name}"
                    if hasattr(transaction.appointment, 'treatment') and transaction.appointment.treatment:
                        treatment_name = transaction.appointment.treatment.treatment_name
                
                formatted_transactions.append({
                    'id': transaction.id,
                    'created_at': transaction.created_at,
                    'patient_name': patient_name,
                    'treatment_name': treatment_name,
                    'insurance_amount': transaction.insurance_amount or 0,
                    'patient_copay': transaction.patient_copay or 0,
                    'is_gkv_billing': transaction.is_gkv_billing,
                    'is_private_billing': transaction.is_private_billing,
                    'status': 'completed'  # BillingItems sind immer abgeschlossen
                })
            except Exception as e:
                logger.warning(f"Fehler bei Transaktionsformatierung: {e}")
                continue

        # Monatsvergleich für Trends
        monthly_comparison = []
        if period == 'month':
            # Vergleich mit Vormonat
            prev_month_start = timezone.make_aware(datetime(year, month - 1 if month > 1 else 12, 1))
            prev_month_end = timezone.make_aware(datetime(year, month - 1 if month > 1 else 12, calendar.monthrange(year, month - 1 if month > 1 else 12)[1], 23, 59, 59))
            
            prev_month_revenue = PatientInvoice.objects.filter(
                status='paid',
                created_at__gte=prev_month_start,
                created_at__lte=prev_month_end
            ).aggregate(
                total=Sum('amount')
            )['total'] or 0
            
            monthly_comparison = [
                {
                    'period': f"{calendar.month_name[month - 1 if month > 1 else 12]} {year if month > 1 else year - 1}",
                    'revenue': prev_month_revenue
                },
                {
                    'period': f"{calendar.month_name[month]} {year}",
                    'revenue': total_revenue
                }
            ]

        return Response({
            'totalRevenue': float(total_revenue),
            'openInvoices': float(open_invoices),
            'paidInvoices': float(paid_invoices),
            'gkvRevenue': float(gkv_revenue),
            'privateRevenue': float(private_revenue),
            'copayRevenue': float(copay_revenue),
            'outstandingAmount': float(outstanding_amount),
            'averageInvoiceAmount': float(average_invoice_amount),
            'revenueByMonth': list(revenue_by_month) if revenue_by_month else [],
            'revenueByInsurance': list(revenue_by_insurance) if revenue_by_insurance else [],
            'revenueByTreatment': list(revenue_by_treatment) if revenue_by_treatment else [],
            'latestTransactions': formatted_transactions,
            'monthlyComparison': monthly_comparison,
            'period': period,
            'startDate': start_date,
            'endDate': end_date
        })

    except Exception as e:
        logger.error(f"Fehler in finance_overview: {str(e)}")
        return Response({'error': 'Fehler beim Laden der Finanzdaten'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_historical(request):
    """Historische Finanzdaten für Vergleich und Trends"""
    try:
        # Letzte 5 Jahre
        current_year = timezone.now().year
        years = range(current_year - 4, current_year + 1)
        
        yearly_comparison = []
        monthly_trends = []
        
        for year in years:
            # Jahresumsatz
            year_start = timezone.make_aware(datetime(year, 1, 1))
            year_end = timezone.make_aware(datetime(year, 12, 31, 23, 59, 59))
            
            year_revenue = PatientInvoice.objects.filter(
                status='paid',
                created_at__gte=year_start,
                created_at__lte=year_end
            ).aggregate(
                total=Sum('amount')
            )['total'] or 0
            
            yearly_comparison.append({
                'year': year,
                'totalRevenue': year_revenue,
                'averageRevenue': year_revenue / 12  # Durchschnitt pro Monat
            })
            
            # Monatliche Aufschlüsselung für Trends
            for month in range(1, 13):
                month_start = timezone.make_aware(datetime(year, month, 1))
                month_end = timezone.make_aware(datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59))
                
                month_data = PatientInvoice.objects.filter(
                    status='paid',
                    created_at__gte=month_start,
                    created_at__lte=month_end
                ).aggregate(
                    revenue=Sum('amount')
                )
                
                monthly_trends.append({
                    'year': year,
                    'month': month,
                    'monthName': calendar.month_name[month],
                    'revenue': month_data['revenue'] or 0,
                    'gkvRevenue': 0,  # Wird später aus BillingItems berechnet
                    'privateRevenue': 0  # Wird später aus BillingItems berechnet
                })
        
        # Top-Performance-Monate
        top_months = sorted(monthly_trends, key=lambda x: x['revenue'], reverse=True)[:12]
        
        # Wachstumstrends
        growth_trends = []
        for i in range(1, len(yearly_comparison)):
            prev_year = yearly_comparison[i-1]
            curr_year = yearly_comparison[i]
            growth_percentage = ((curr_year['totalRevenue'] - prev_year['totalRevenue']) / prev_year['totalRevenue'] * 100) if prev_year['totalRevenue'] > 0 else 0
            
            growth_trends.append({
                'year': curr_year['year'],
                'growth': growth_percentage,
                'revenue': curr_year['totalRevenue']
            })
        
        return Response({
            'yearlyComparison': yearly_comparison,
            'monthlyTrends': monthly_trends,
            'topMonths': top_months,
            'growthTrends': growth_trends,
            'summary': {
                'totalYears': len(years),
                'averageYearlyRevenue': sum(y['totalRevenue'] for y in yearly_comparison) / len(yearly_comparison),
                'bestYear': max(yearly_comparison, key=lambda x: x['totalRevenue']),
                'bestMonth': max(monthly_trends, key=lambda x: x['revenue'])
            }
        })
        
    except Exception as e:
        logger.error(f"Fehler in finance_historical: {str(e)}")
        return Response({'error': 'Fehler beim Laden der historischen Daten'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_comparison(request):
    """Vergleichsdaten für zwei Zeiträume"""
    try:
        # Parameter für Vergleich
        period = request.GET.get('period', 'month')
        year1 = int(request.GET.get('year1', timezone.now().year))
        month1 = int(request.GET.get('month1', timezone.now().month))
        year2 = int(request.GET.get('year2', year1 - 1))
        month2 = int(request.GET.get('month2', month1))
        
        # Zeiträume definieren
        if period == 'month':
            start1 = timezone.make_aware(datetime(year1, month1, 1))
            end1 = timezone.make_aware(datetime(year1, month1, calendar.monthrange(year1, month1)[1], 23, 59, 59))
            start2 = timezone.make_aware(datetime(year2, month2, 1))
            end2 = timezone.make_aware(datetime(year2, month2, calendar.monthrange(year2, month2)[1], 23, 59, 59))
        else:  # year
            start1 = timezone.make_aware(datetime(year1, 1, 1))
            end1 = timezone.make_aware(datetime(year1, 12, 31, 23, 59, 59))
            start2 = timezone.make_aware(datetime(year2, 1, 1))
            end2 = timezone.make_aware(datetime(year2, 12, 31, 23, 59, 59))
        
        # Daten für beide Zeiträume laden
        def get_period_data(start, end):
            return {
                'totalRevenue': PatientInvoice.objects.filter(
                    status='paid',
                    created_at__gte=start,
                    created_at__lte=end
                ).aggregate(total=Sum('amount'))['total'] or 0,
                'gkvRevenue': BillingItem.objects.filter(
                    is_gkv_billing=True,
                    created_at__gte=start,
                    created_at__lte=end
                ).aggregate(total=Sum('insurance_amount'))['total'] or 0,
                'privateRevenue': BillingItem.objects.filter(
                    is_private_billing=True,
                    created_at__gte=start,
                    created_at__lte=end
                ).aggregate(total=Sum('insurance_amount'))['total'] or 0,
                'copayRevenue': BillingItem.objects.filter(
                    created_at__gte=start,
                    created_at__lte=end
                ).aggregate(total=Sum('patient_copay'))['total'] or 0,
                'invoiceCount': PatientInvoice.objects.filter(
                    created_at__gte=start,
                    created_at__lte=end
                ).count(),
                'averageInvoice': PatientInvoice.objects.filter(
                    status='paid',
                    created_at__gte=start,
                    created_at__lte=end
                ).aggregate(avg=Avg('amount'))['avg'] or 0
            }
        
        period1_data = get_period_data(start1, end1)
        period2_data = get_period_data(start2, end2)
        
        # Vergleichsberechnungen
        comparison = {}
        for key in period1_data.keys():
            if period1_data[key] > 0 and period2_data[key] > 0:
                change_percentage = ((period1_data[key] - period2_data[key]) / period2_data[key]) * 100
                comparison[key] = {
                    'period1': period1_data[key],
                    'period2': period2_data[key],
                    'change': change_percentage,
                    'trend': 'up' if change_percentage > 0 else 'down' if change_percentage < 0 else 'stable'
                }
            else:
                comparison[key] = {
                    'period1': period1_data[key],
                    'period2': period2_data[key],
                    'change': 0,
                    'trend': 'stable'
                }
        
        return Response({
            'period1': {
                'label': f"{calendar.month_name[month1] if period == 'month' else 'Jahr'} {year1}",
                'data': period1_data
            },
            'period2': {
                'label': f"{calendar.month_name[month2] if period == 'month' else 'Jahr'} {year2}",
                'data': period2_data
            },
            'comparison': comparison
        })
        
    except Exception as e:
        logger.error(f"Fehler in finance_comparison: {str(e)}")
        return Response({'error': 'Fehler beim Laden der Vergleichsdaten'}, status=500) 