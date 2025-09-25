import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
from core.models import (
    Appointment, Patient, Prescription, Treatment, BillingCycle, 
    BillingItem, Practitioner, Room, Waitlist, UserActivityLog
)

logger = logging.getLogger(__name__)

class ReportingService:
    """Service für umfassende Berichterstattung und Analytics"""
    
    @staticmethod
    def get_financial_overview(period='month'):
        """Finanzübersicht für verschiedene Zeiträume"""
        try:
            now = timezone.now()
            
            if period == 'week':
                start_date = now - timedelta(days=7)
                group_by = TruncWeek
            elif period == 'month':
                start_date = now - timedelta(days=30)
                group_by = TruncMonth
            elif period == 'quarter':
                start_date = now - timedelta(days=90)
                group_by = TruncMonth
            elif period == 'year':
                start_date = now - timedelta(days=365)
                group_by = TruncMonth
            else:
                start_date = now - timedelta(days=30)
                group_by = TruncMonth
            
            # Abrechnungsstatistiken
            billing_stats = BillingItem.objects.filter(
                created_at__gte=start_date
            ).aggregate(
                total_insurance_amount=Sum('insurance_amount'),
                total_patient_copay=Sum('patient_copay'),
                total_items=Count('id'),
                avg_insurance_amount=Avg('insurance_amount'),
                avg_patient_copay=Avg('patient_copay')
            )
            
            # Termin-basierte Einnahmen (Selbstzahler)
            appointment_revenue = Appointment.objects.filter(
                appointment_date__gte=start_date,
                treatment__is_self_pay=True,
                status='completed'
            ).aggregate(
                total_revenue=Sum('treatment__self_pay_price'),
                total_appointments=Count('id')
            )
            
            # Monatliche Entwicklung
            monthly_trend = BillingItem.objects.filter(
                created_at__gte=start_date
            ).annotate(
                month=group_by('created_at')
            ).values('month').annotate(
                insurance_amount=Sum('insurance_amount'),
                patient_copay=Sum('patient_copay'),
                total_items=Count('id')
            ).order_by('month')
            
            return {
                'period': period,
                'start_date': start_date,
                'end_date': now,
                'billing_stats': billing_stats,
                'appointment_revenue': appointment_revenue,
                'monthly_trend': list(monthly_trend),
                'total_revenue': (
                    (billing_stats['total_insurance_amount'] or 0) +
                    (billing_stats['total_patient_copay'] or 0) +
                    (appointment_revenue['total_revenue'] or 0)
                )
            }
            
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Finanzübersicht: {e}")
            return {}
    
    @staticmethod
    def get_treatment_statistics(period='month'):
        """Behandlungsstatistiken und Erfolgsquoten"""
        try:
            now = timezone.now()
            start_date = now - timedelta(days=30 if period == 'month' else 90)
            
            # Behandlungsstatistiken
            treatment_stats = Appointment.objects.filter(
                appointment_date__gte=start_date
            ).values('treatment__treatment_name').annotate(
                total_appointments=Count('id'),
                completed_appointments=Count('id', filter=Q(status='completed')),
                cancelled_appointments=Count('id', filter=Q(status='cancelled')),
                no_show_appointments=Count('id', filter=Q(status='no_show')),
                avg_duration=Avg('duration_minutes')
            ).order_by('-total_appointments')
            
            # Erfolgsquoten berechnen
            for stat in treatment_stats:
                total = stat['total_appointments']
                completed = stat['completed_appointments']
                stat['success_rate'] = round((completed / total * 100), 2) if total > 0 else 0
                stat['cancellation_rate'] = round((stat['cancelled_appointments'] / total * 100), 2) if total > 0 else 0
                stat['no_show_rate'] = round((stat['no_show_appointments'] / total * 100), 2) if total > 0 else 0
            
            # Behandler-Performance
            practitioner_stats = Appointment.objects.filter(
                appointment_date__gte=start_date
            ).values('practitioner__first_name', 'practitioner__last_name').annotate(
                total_appointments=Count('id'),
                completed_appointments=Count('id', filter=Q(status='completed')),
                avg_duration=Avg('duration_minutes')
            ).order_by('-total_appointments')
            
            # Erfolgsquoten für Behandler
            for stat in practitioner_stats:
                total = stat['total_appointments']
                completed = stat['completed_appointments']
                stat['success_rate'] = round((completed / total * 100), 2) if total > 0 else 0
                stat['practitioner_name'] = f"{stat['practitioner__first_name']} {stat['practitioner__last_name']}"
            
            return {
                'period': period,
                'treatment_stats': list(treatment_stats),
                'practitioner_stats': list(practitioner_stats),
                'total_appointments': sum(stat['total_appointments'] for stat in treatment_stats),
                'overall_success_rate': round(
                    sum(stat['completed_appointments'] for stat in treatment_stats) / 
                    sum(stat['total_appointments'] for stat in treatment_stats) * 100, 2
                ) if treatment_stats else 0
            }
            
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Behandlungsstatistiken: {e}")
            return {}
    
    @staticmethod
    def get_operational_statistics():
        """Betriebliche Statistiken und Auslastung"""
        try:
            now = timezone.now()
            start_date = now - timedelta(days=30)
            
            # Raumauslastung
            room_utilization = Appointment.objects.filter(
                appointment_date__gte=start_date,
                room__isnull=False
            ).values('room__name').annotate(
                total_appointments=Count('id'),
                total_hours=Sum('duration_minutes') / 60.0,
                avg_duration=Avg('duration_minutes')
            ).order_by('-total_hours')
            
            # Behandlerauslastung
            practitioner_utilization = Appointment.objects.filter(
                appointment_date__gte=start_date
            ).values('practitioner__first_name', 'practitioner__last_name').annotate(
                total_appointments=Count('id'),
                total_hours=Sum('duration_minutes') / 60.0,
                avg_duration=Avg('duration_minutes')
            ).order_by('-total_hours')
            
            # Wartelisten-Statistiken
            waitlist_stats = WaitlistService.get_waitlist_statistics()
            
            # Patientenstatistiken
            patient_stats = {
                'total_patients': Patient.objects.count(),
                'new_patients_this_month': Patient.objects.filter(
                    created_at__gte=start_date
                ).count(),
                'active_patients': Patient.objects.filter(
                    appointments__appointment_date__gte=start_date
                ).distinct().count(),
                'patients_with_prescriptions': Patient.objects.filter(
                    prescriptions__status='In_Progress'
                ).distinct().count()
            }
            
            # Verordnungsstatistiken
            prescription_stats = {
                'total_prescriptions': Prescription.objects.count(),
                'active_prescriptions': Prescription.objects.filter(status='In_Progress').count(),
                'urgent_prescriptions': Prescription.objects.filter(is_urgent=True).count(),
                'expiring_soon': Prescription.objects.filter(
                    prescription_date__lte=now.date() - timedelta(days=335),
                    status='In_Progress'
                ).count()
            }
            
            return {
                'room_utilization': list(room_utilization),
                'practitioner_utilization': list(practitioner_utilization),
                'waitlist_stats': waitlist_stats,
                'patient_stats': patient_stats,
                'prescription_stats': prescription_stats,
                'period': '30_days'
            }
            
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der betrieblichen Statistiken: {e}")
            return {}
    
    @staticmethod
    def get_quality_metrics():
        """Qualitätsmetriken und KPIs"""
        try:
            now = timezone.now()
            start_date = now - timedelta(days=30)
            
            # Terminqualität
            appointment_quality = Appointment.objects.filter(
                appointment_date__gte=start_date
            ).aggregate(
                total_appointments=Count('id'),
                completed_appointments=Count('id', filter=Q(status='completed')),
                cancelled_appointments=Count('id', filter=Q(status='cancelled')),
                no_show_appointments=Count('id', filter=Q(status='no_show')),
                avg_duration=Avg('duration_minutes')
            )
            
            # Qualitätsmetriken berechnen
            total = appointment_quality['total_appointments']
            completed = appointment_quality['completed_appointments']
            cancelled = appointment_quality['cancelled_appointments']
            no_show = appointment_quality['no_show_appointments']
            
            quality_metrics = {
                'completion_rate': round((completed / total * 100), 2) if total > 0 else 0,
                'cancellation_rate': round((cancelled / total * 100), 2) if total > 0 else 0,
                'no_show_rate': round((no_show / total * 100), 2) if total > 0 else 0,
                'avg_appointment_duration': round(appointment_quality['avg_duration'], 1) if appointment_quality['avg_duration'] else 0,
                'total_appointments': total
            }
            
            # Verordnungsqualität
            prescription_quality = Prescription.objects.filter(
                created_at__gte=start_date
            ).aggregate(
                total_prescriptions=Count('id'),
                active_prescriptions=Count('id', filter=Q(status='In_Progress')),
                completed_prescriptions=Count('id', filter=Q(status='Completed')),
                urgent_prescriptions=Count('id', filter=Q(is_urgent=True))
            )
            
            # Wartelisten-Qualität
            waitlist_quality = Waitlist.objects.filter(
                created_at__gte=start_date
            ).aggregate(
                total_entries=Count('id'),
                accepted_offers=Count('id', filter=Q(status='accepted')),
                declined_offers=Count('id', filter=Q(status='declined')),
                expired_entries=Count('id', filter=Q(status='expired'))
            )
            
            return {
                'appointment_quality': quality_metrics,
                'prescription_quality': prescription_quality,
                'waitlist_quality': waitlist_quality,
                'overall_quality_score': round(
                    (quality_metrics['completion_rate'] * 0.6) +
                    (prescription_quality['active_prescriptions'] / prescription_quality['total_prescriptions'] * 100 * 0.3) +
                    (waitlist_quality['accepted_offers'] / waitlist_quality['total_entries'] * 100 * 0.1), 2
                ) if (prescription_quality['total_prescriptions'] > 0 and waitlist_quality['total_entries'] > 0) else 0
            }
            
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Qualitätsmetriken: {e}")
            return {}
    
    @staticmethod
    def get_comprehensive_report():
        """Umfassender Bericht mit allen Statistiken"""
        try:
            return {
                'financial': ReportingService.get_financial_overview('month'),
                'treatment': ReportingService.get_treatment_statistics('month'),
                'operational': ReportingService.get_operational_statistics(),
                'quality': ReportingService.get_quality_metrics(),
                'generated_at': timezone.now(),
                'period': 'month'
            }
            
        except Exception as e:
            logger.error(f"Fehler beim Generieren des umfassenden Berichts: {e}")
            return {}
    
    @staticmethod
    def export_report_to_csv(report_data, filename=None):
        """Exportiert Berichtsdaten als CSV"""
        try:
            import csv
            from io import StringIO
            
            if not filename:
                filename = f"report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            output = StringIO()
            writer = csv.writer(output)
            
            # Schreibe Header
            writer.writerow(['Berichtstyp', 'Metrik', 'Wert', 'Einheit'])
            
            # Finanzdaten
            if 'financial' in report_data:
                financial = report_data['financial']
                writer.writerow(['Finanzen', 'Gesamtumsatz', financial.get('total_revenue', 0), 'EUR'])
                writer.writerow(['Finanzen', 'KK-Beträge', financial.get('billing_stats', {}).get('total_insurance_amount', 0), 'EUR'])
                writer.writerow(['Finanzen', 'Zuzahlungen', financial.get('billing_stats', {}).get('total_patient_copay', 0), 'EUR'])
            
            # Behandlungsdaten
            if 'treatment' in report_data:
                treatment = report_data['treatment']
                writer.writerow(['Behandlungen', 'Gesamttermine', treatment.get('total_appointments', 0), 'Anzahl'])
                writer.writerow(['Behandlungen', 'Erfolgsquote', treatment.get('overall_success_rate', 0), '%'])
            
            # Qualitätsdaten
            if 'quality' in report_data:
                quality = report_data['quality']
                appointment_quality = quality.get('appointment_quality', {})
                writer.writerow(['Qualität', 'Abschlussrate', appointment_quality.get('completion_rate', 0), '%'])
                writer.writerow(['Qualität', 'No-Show Rate', appointment_quality.get('no_show_rate', 0), '%'])
                writer.writerow(['Qualität', 'Gesamtqualitätsscore', quality.get('overall_quality_score', 0), 'Punkte'])
            
            return output.getvalue(), filename
            
        except Exception as e:
            logger.error(f"Fehler beim CSV-Export: {e}")
            return None, None 