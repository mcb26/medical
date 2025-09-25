import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from core.services.reporting_service import ReportingService
from core.services.waitlist_service import WaitlistService

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_overview(request):
    """Finanzübersicht API"""
    try:
        period = request.GET.get('period', 'month')
        data = ReportingService.get_financial_overview(period)
        return Response(data)
    except Exception as e:
        logger.error(f"Fehler in financial_overview API: {e}")
        return Response(
            {'error': 'Fehler beim Abrufen der Finanzübersicht'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def treatment_statistics(request):
    """Behandlungsstatistiken API"""
    try:
        period = request.GET.get('period', 'month')
        data = ReportingService.get_treatment_statistics(period)
        return Response(data)
    except Exception as e:
        logger.error(f"Fehler in treatment_statistics API: {e}")
        return Response(
            {'error': 'Fehler beim Abrufen der Behandlungsstatistiken'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def operational_statistics(request):
    """Betriebliche Statistiken API"""
    try:
        data = ReportingService.get_operational_statistics()
        return Response(data)
    except Exception as e:
        logger.error(f"Fehler in operational_statistics API: {e}")
        return Response(
            {'error': 'Fehler beim Abrufen der betrieblichen Statistiken'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quality_metrics(request):
    """Qualitätsmetriken API"""
    try:
        data = ReportingService.get_quality_metrics()
        return Response(data)
    except Exception as e:
        logger.error(f"Fehler in quality_metrics API: {e}")
        return Response(
            {'error': 'Fehler beim Abrufen der Qualitätsmetriken'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def comprehensive_report(request):
    """Umfassender Bericht API"""
    try:
        data = ReportingService.get_comprehensive_report()
        return Response(data)
    except Exception as e:
        logger.error(f"Fehler in comprehensive_report API: {e}")
        return Response(
            {'error': 'Fehler beim Generieren des umfassenden Berichts'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_report_csv(request):
    """Exportiert Bericht als CSV"""
    try:
        report_type = request.GET.get('type', 'comprehensive')
        
        if report_type == 'comprehensive':
            report_data = ReportingService.get_comprehensive_report()
        elif report_type == 'financial':
            period = request.GET.get('period', 'month')
            report_data = {'financial': ReportingService.get_financial_overview(period)}
        elif report_type == 'treatment':
            period = request.GET.get('period', 'month')
            report_data = {'treatment': ReportingService.get_treatment_statistics(period)}
        elif report_type == 'quality':
            report_data = {'quality': ReportingService.get_quality_metrics()}
        else:
            return Response(
                {'error': 'Ungültiger Berichtstyp'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        csv_content, filename = ReportingService.export_report_to_csv(report_data)
        
        if csv_content:
            response = HttpResponse(csv_content, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        else:
            return Response(
                {'error': 'Fehler beim CSV-Export'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Fehler in export_report_csv API: {e}")
        return Response(
            {'error': 'Fehler beim CSV-Export'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def waitlist_statistics(request):
    """Wartelisten-Statistiken API"""
    try:
        data = WaitlistService.get_waitlist_statistics()
        return Response(data)
    except Exception as e:
        logger.error(f"Fehler in waitlist_statistics API: {e}")
        return Response(
            {'error': 'Fehler beim Abrufen der Wartelisten-Statistiken'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Dashboard-Zusammenfassung API"""
    try:
        # Schnelle Statistiken für das Dashboard
        from core.models import Appointment, Patient, Prescription, BillingItem
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        today = now.date()
        this_month = now.replace(day=1)
        
        # Heutige Termine
        today_appointments = Appointment.objects.filter(
            appointment_date__date=today
        ).count()
        
        # Termine diese Woche
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        week_appointments = Appointment.objects.filter(
            appointment_date__date__range=[week_start, week_end]
        ).count()
        
        # Neue Patienten diesen Monat
        new_patients_month = Patient.objects.filter(
            created_at__gte=this_month
        ).count()
        
        # Abrechnungsbereite Termine
        ready_to_bill = Appointment.objects.filter(
            status='ready_to_bill'
        ).count()
        
        # Dringende Verordnungen
        urgent_prescriptions = Prescription.objects.filter(
            is_urgent=True,
            status='In_Progress'
        ).count()
        
        # Wartelisten-Statistiken
        waitlist_stats = WaitlistService.get_waitlist_statistics()
        
        # Qualitätsmetriken (vereinfacht)
        quality_metrics = ReportingService.get_quality_metrics()
        
        summary = {
            'today_appointments': today_appointments,
            'week_appointments': week_appointments,
            'new_patients_month': new_patients_month,
            'ready_to_bill': ready_to_bill,
            'urgent_prescriptions': urgent_prescriptions,
            'waitlist': waitlist_stats,
            'quality_score': quality_metrics.get('overall_quality_score', 0),
            'last_updated': now
        }
        
        return Response(summary)
        
    except Exception as e:
        logger.error(f"Fehler in dashboard_summary API: {e}")
        return Response(
            {'error': 'Fehler beim Abrufen der Dashboard-Zusammenfassung'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 