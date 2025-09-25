from decimal import Decimal
from datetime import datetime, date
from django.db import transaction
from core.models import Appointment, BillingItem, Treatment, Patient, PatientInsurance
from core.services.billing_service import BillingService


class GKVExportService:
    """
    Service für die Export-Funktionalität gemäß GKV-Anforderungen
    """
    
    def __init__(self):
        self.billing_service = BillingService()
    
    def generate_gkv_export_data(self, billing_cycle=None, start_date=None, end_date=None):
        """
        Generiert Export-Daten für GKV-Abrechnung
        """
        if billing_cycle:
            appointments = self._get_appointments_for_billing_cycle(billing_cycle)
        else:
            appointments = self._get_appointments_for_date_range(start_date, end_date)
        
        export_data = []
        
        for appointment in appointments:
            if not self._is_gkv_eligible(appointment):
                continue
                
            export_item = self._create_gkv_export_item(appointment)
            if export_item:
                export_data.append(export_item)
        
        return export_data
    
    def _get_appointments_for_billing_cycle(self, billing_cycle):
        """Holt Termine für einen Abrechnungszyklus"""
        return Appointment.objects.filter(
            billing_cycle=billing_cycle,
            status='completed'
        ).select_related('patient', 'treatment', 'practitioner', 'room')
    
    def _get_appointments_for_date_range(self, start_date, end_date):
        """Holt Termine für einen Datumsbereich"""
        return Appointment.objects.filter(
            appointment_date__gte=start_date,
            appointment_date__lte=end_date,
            status='completed'
        ).select_related('patient', 'treatment', 'practitioner', 'room')
    
    def _is_gkv_eligible(self, appointment):
        """Prüft ob ein Termin für GKV-Abrechnung geeignet ist"""
        if not appointment.treatment or appointment.treatment.is_self_pay:
            return False
        
        if not appointment.patient_insurance:
            return False
        
        if appointment.patient_insurance.is_private:
            return False
        
        # Prüfe ob LEGS-Code vorhanden
        if not appointment.treatment.legs_code:
            return False
        
        return True
    
    def _create_gkv_export_item(self, appointment):
        """Erstellt einen GKV-Export-Eintrag"""
        treatment = appointment.treatment
        patient = appointment.patient
        patient_insurance = appointment.patient_insurance
        
        # Hole BillingItems für diesen Termin
        billing_items = BillingItem.objects.filter(appointment=appointment)
        
        # Berechne Gesamtbetrag
        total_amount = sum(item.get_total_amount() for item in billing_items)
        
        # Berechne Zuzahlung
        copayment_amount = sum(
            item.patient_copay for item in billing_items
        )
        
        # Netto-Betrag (ohne Zuzahlung)
        net_amount = total_amount - copayment_amount
        
        export_item = {
            'appointment_id': appointment.id,
            'patient_id': patient.id,
            'patient_name': patient.full_name,
            'patient_insurance_number': patient_insurance.insurance_number,
            'insurance_provider': patient_insurance.insurance_provider.name,
            'treatment_name': treatment.treatment_name,
            'legs_code': treatment.legs_code,
            'accounting_code': treatment.accounting_code,
            'tariff_indicator': treatment.tariff_indicator,
            'prescription_type_indicator': treatment.prescription_type_indicator,
            'is_telemedicine': treatment.is_telemedicine,
            'appointment_date': appointment.appointment_date,
            'duration_minutes': appointment.duration_minutes,
            'practitioner_name': appointment.practitioner.get_full_name() if appointment.practitioner else '',
            'room_name': appointment.room.name if appointment.room else '',
            'total_amount': total_amount,
            'net_amount': net_amount,
            'copayment_amount': copayment_amount,
            'prescription_id': appointment.prescription.id if appointment.prescription else None,
                    'session_number': getattr(appointment, 'session_number', 1),
        'total_sessions': getattr(appointment, 'total_sessions', 1),
            'series_identifier': appointment.series_identifier,
        }
        
        return export_item
    
    def export_to_csv(self, export_data, filename=None):
        """Exportiert GKV-Daten als CSV"""
        import csv
        from io import StringIO
        
        if not filename:
            filename = f"gkv_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        output = StringIO()
        writer = csv.writer(output, delimiter=';')
        
        # Header
        header = [
            'Termin-ID', 'Patient-ID', 'Patient-Name', 'Versicherungsnummer',
            'Krankenkasse', 'Behandlung', 'LEGS-Code', 'Abrechnungscode',
            'Tarifkennzeichen', 'VKZ', 'Telemedizin', 'Termindatum',
            'Dauer (Min)', 'Behandler', 'Raum', 'Gesamtbetrag',
            'Netto-Betrag', 'Zuzahlung', 'Verordnung-ID', 'Sitzungsnummer',
            'Gesamtsitzungen', 'Serien-ID'
        ]
        writer.writerow(header)
        
        # Daten
        for item in export_data:
            row = [
                item['appointment_id'],
                item['patient_id'],
                item['patient_name'],
                item['patient_insurance_number'],
                item['insurance_provider'],
                item['treatment_name'],
                item['legs_code'],
                item['accounting_code'],
                item['tariff_indicator'],
                item['prescription_type_indicator'],
                'Ja' if item['is_telemedicine'] else 'Nein',
                item['appointment_date'].strftime('%d.%m.%Y'),
                item['duration_minutes'],
                item['practitioner_name'],
                item['room_name'],
                f"{item['total_amount']:.2f}",
                f"{item['net_amount']:.2f}",
                f"{item['copayment_amount']:.2f}",
                item['prescription_id'] or '',
                item['session_number'] or '',
                item['total_sessions'] or '',
                item['series_identifier'] or ''
            ]
            writer.writerow(row)
        
        return output.getvalue(), filename
    
    def export_to_xml(self, export_data, filename=None):
        """Exportiert GKV-Daten als XML (für elektronische Abrechnung)"""
        if not filename:
            filename = f"gkv_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml"
        
        xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_content += '<gkv_export>\n'
        xml_content += f'  <export_date>{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</export_date>\n'
        xml_content += f'  <total_appointments>{len(export_data)}</total_appointments>\n'
        xml_content += '  <appointments>\n'
        
        for item in export_data:
            xml_content += '    <appointment>\n'
            xml_content += f'      <id>{item["appointment_id"]}</id>\n'
            xml_content += f'      <patient_name>{item["patient_name"]}</patient_name>\n'
            xml_content += f'      <insurance_number>{item["patient_insurance_number"]}</insurance_number>\n'
            xml_content += f'      <treatment_name>{item["treatment_name"]}</treatment_name>\n'
            xml_content += f'      <legs_code>{item["legs_code"]}</legs_code>\n'
            xml_content += f'      <appointment_date>{item["appointment_date"].strftime("%Y-%m-%d")}</appointment_date>\n'
            xml_content += f'      <net_amount>{item["net_amount"]:.2f}</net_amount>\n'
            xml_content += f'      <copayment_amount>{item["copayment_amount"]:.2f}</copayment_amount>\n'
            xml_content += '    </appointment>\n'
        
        xml_content += '  </appointments>\n'
        xml_content += '</gkv_export>'
        
        return xml_content, filename
    
    def validate_gkv_compliance(self, export_data):
        """Validiert GKV-Compliance der Export-Daten"""
        errors = []
        warnings = []
        
        for item in export_data:
            # Prüfe LEGS-Code
            if not item['legs_code']:
                errors.append(f"Termin {item['appointment_id']}: Kein LEGS-Code")
            
            # Prüfe Versicherungsnummer
            if not item['patient_insurance_number']:
                errors.append(f"Termin {item['appointment_id']}: Keine Versicherungsnummer")
            
            # Prüfe Telemedizin-Flag
            if item['is_telemedicine'] and not item['prescription_type_indicator'].startswith('VKZ 20'):
                warnings.append(f"Termin {item['appointment_id']}: Telemedizin aber VKZ nicht korrekt")
            
            # Prüfe Beträge
            if item['net_amount'] <= 0:
                errors.append(f"Termin {item['appointment_id']}: Ungültiger Netto-Betrag")
            
            # Prüfe Zuzahlung
            if item['copayment_amount'] > 5.00:
                warnings.append(f"Termin {item['appointment_id']}: Zuzahlung über 5€")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'total_items': len(export_data)
        } 