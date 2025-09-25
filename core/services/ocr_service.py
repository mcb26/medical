import pytesseract
import cv2
import numpy as np
from PIL import Image
import re
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import io
import fitz  # PyMuPDF für PDF-Verarbeitung

logger = logging.getLogger(__name__)

class OCRService:
    """
    OCR-Service für die automatische Erkennung von Rezeptdaten
    """
    
    def __init__(self):
        # Tesseract-Konfiguration für deutsche Sprache mit mehreren PSM-Modi
        self.configs = [
            '--oem 3 --psm 6 -l deu',  # Einheitlicher Textblock
            '--oem 3 --psm 3 -l deu',  # Automatische Seitensegmentierung
            '--oem 1 --psm 6 -l deu',  # Legacy Engine
            '--oem 1 --psm 3 -l deu',  # Legacy mit Auto-Segmentierung
        ]
        self.config = self.configs[0]  # Standard-Konfiguration
        
        # Regex-Patterns für Muster 13 Heilmittelverordnung
        self.patterns = {
            # 1. Versichertenangaben
            'patient_name': r'(?:Name|Vorname|Versicherter|Patient):\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)',
            'patient_birth': r'(?:geb\.|geboren|Geburtsdatum|Birth):\s*(\d{1,2}\.\d{1,2}\.\d{4})',
            'insurance_number': r'(?:Versicherten-Nr\.|Vers\.-Nr\.|Versicherungsnummer|Vers\.?Nr\.?):\s*([A-Z0-9]+)',
            'cost_bearer': r'(?:Kostenträger|Krankenkasse|Kasse):\s*([A-ZÄÖÜa-zäöüß\s]+)',
            
            # 2. Arztangaben
            'doctor_name': r'(?:Arzt|Dr\.|Verordnender|Ausstellender):\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)',
            'bsnr': r'(?:BSNR|Betriebsstättennummer|Betriebsstätte):\s*([0-9]+)',
            'lanr': r'(?:LANR|Arztnummer|Arzt-Nr\.?):\s*([0-9]+)',
            
            # 3. Ausstellungsdatum
            'prescription_date': r'(?:Ausstellungsdatum|Datum|Verordnungsdatum):\s*(\d{1,2}\.\d{1,2}\.\d{4})',
            
            # 4. Zuzahlung
            'copayment': r'(?:Zuzahlung|ZZ):\s*(pflichtig|frei|befreit)',
            
            # 5. Heilmittelbereich
            'therapy_type': r'(?:Heilmittelbereich|Fachbereich):\s*(Physiotherapie|Ergotherapie|Logopädie|Podologie|Stimmtherapie)',
            
            # 6. Diagnose
            'diagnosis_code': r'(?:ICD-10|ICD|Diagnose):\s*([A-Z]\d{2}\.?\d*)',
            'diagnosis_text': r'(?:Diagnose|Klartext):\s*([A-ZÄÖÜa-zäöüß\s,\.]+)',
            
            # 7. Diagnosegruppe
            'diagnosis_group': r'(?:Diagnosegruppe|DG):\s*([A-Z]{2,3})',
            
            # 8. Leitsymptomatik
            'leading_symptom': r'(?:Leitsymptomatik|LS):\s*([a-c]|[A-ZÄÖÜa-zäöüß\s]+)',
            
            # 9. Heilmittel
            'treatment_1': r'(?:Heilmittel 1|1\. Heilmittel):\s*([A-ZÄÖÜa-zäöüß\s]+)',
            'treatment_2': r'(?:Heilmittel 2|2\. Heilmittel):\s*([A-ZÄÖÜa-zäöüß\s]+)',
            'treatment_3': r'(?:Heilmittel 3|3\. Heilmittel):\s*([A-ZÄÖÜa-zäöüß\s]+)',
            'blank_prescription': r'(?:BLANKOVERORDNUNG)',
            
            # 10. Behandlungseinheiten
            'sessions_1': r'(?:Einheiten 1|1\. Einheiten):\s*(\d+)',
            'sessions_2': r'(?:Einheiten 2|2\. Einheiten):\s*(\d+)',
            'sessions_3': r'(?:Einheiten 3|3\. Einheiten):\s*(\d+)',
            
            # 11. Ergänzendes Heilmittel
            'supplementary_treatment': r'(?:Ergänzendes Heilmittel|Zusatzheilmittel):\s*([A-ZÄÖÜa-zäöüß\s]+)',
            
            # 12. Therapiefrequenz
            'frequency': r'(?:Therapiefrequenz|Frequenz):\s*(\d+x\s+(?:pro\s+)?(?:Woche|Monat|Tag))',
            
            # 13. Therapiebericht
            'report_required': r'(?:Therapiebericht|Bericht):\s*(ja|nein|erforderlich)',
            
            # 14. Hausbesuch
            'home_visit': r'(?:Hausbesuch):\s*(ja|nein)',
            
            # 15. Dringlicher Behandlungsbedarf
            'urgent': r'(?:Dringlich|Dringender Behandlungsbedarf|14 Tage):\s*(ja|nein)',
            
            # 16. Therapieziele
            'therapy_goals': r'(?:Therapieziele|Ziele):\s*([A-ZÄÖÜa-zäöüß\s,\.]+)',
            
            # 18. IK des Leistungserbringers
            'provider_ik': r'(?:IK|Leistungserbringer):\s*([0-9]+)',
            
            # 19. Datum der Leistungsabgabe
            'service_date': r'(?:Leistungsdatum|Datum Leistung):\s*(\d{1,2}\.\d{1,2}\.\d{4})',
            
            # 20. Maßnahmen
            'measures': r'(?:Maßnahmen|Behandlung):\s*([A-ZÄÖÜa-zäöüß\s,\.]+)',
            
            # 21. Leistungserbringer
            'therapist': r'(?:Therapeut|Behandler):\s*([A-ZÄÖÜa-zäöüß\s]+)',
            
            # 24. Behandlungsabbruch
            'treatment_stop': r'(?:Behandlungsabbruch|Abbruch):\s*(\d{1,2}\.\d{1,2}\.\d{4})',
            
            # 25. Abweichungen
            'deviations': r'(?:Abweichung|Änderung):\s*([A-ZÄÖÜa-zäöüß\s,\.]+)',
        }
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extrahiert Text aus einem Bild
        """
        try:
            # Bild laden und vorverarbeiten
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Konnte Bild nicht laden: {image_path}")
            
            # Graustufen konvertieren
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Rauschen reduzieren
            denoised = cv2.medianBlur(gray, 3)
            
            # Kontrast verbessern
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Zusätzliche Vorverarbeitung für bessere OCR
            # Schwellenwert anwenden
            _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphologische Operationen für Rauschen entfernen
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # Skalierung für bessere OCR
            height, width = cleaned.shape
            if width < 1000:  # Wenn Bild zu klein ist
                scale_factor = 2.0
                cleaned = cv2.resize(cleaned, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
            
            # OCR durchführen mit mehreren Konfigurationen und Bildvarianten
            text = ""
            image_variants = [enhanced, cleaned, thresh]
            
            for variant_idx, img_variant in enumerate(image_variants):
                if text.strip():  # Wenn bereits Text gefunden wurde
                    break
                    
                for i, config in enumerate(self.configs):
                    try:
                        logger.debug(f"Versuche OCR mit Bildvariante {variant_idx+1}, Konfiguration {i+1}: {config}")
                        text = pytesseract.image_to_string(img_variant, config=config)
                        if text.strip():  # Wenn Text gefunden wurde
                            logger.debug(f"OCR erfolgreich mit Bildvariante {variant_idx+1}, Konfiguration {i+1}")
                            break
                    except Exception as ocr_error:
                        logger.debug(f"OCR Bildvariante {variant_idx+1}, Konfiguration {i+1} fehlgeschlagen: {str(ocr_error)}")
                        continue
            
            # Fallback: Einfachste Konfiguration
            if not text.strip():
                try:
                    logger.info("Versuche Fallback-OCR...")
                    text = pytesseract.image_to_string(enhanced, config='--oem 1 --psm 6 -l deu')
                except Exception as fallback_error:
                    logger.error(f"Fallback-OCR fehlgeschlagen: {str(fallback_error)}")
                    text = ""
            
            return text
        except Exception as e:
            logger.error(f"Fehler bei OCR-Text-Extraktion: {str(e)}")
            raise
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extrahiert Text aus einer PDF
        """
        try:
            doc = fitz.open(pdf_path)
            text = ""
            
            for page in doc:
                text += page.get_text()
            
            doc.close()
            return text
        except Exception as e:
            logger.error(f"Fehler bei PDF-Text-Extraktion: {str(e)}")
            raise
    
    def parse_prescription_data(self, text: str) -> Dict[str, Any]:
        """
        Parst extrahierten Text und erkennt Rezeptdaten
        """
        extracted_data = {}
        
        # Text normalisieren
        text = text.replace('\n', ' ').replace('\r', ' ')
        text = re.sub(r'\s+', ' ', text)
        
        # Debug: Rohtext loggen (nur bei niedriger Konfidenz)
        if len(text) < 50:  # Wenn wenig Text erkannt wurde
            logger.info(f"OCR Rohtext (erste 200 Zeichen): {text[:200]}")
        
        # Alle Patterns durchgehen
        for field, pattern in self.patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted_data[field] = match.group(1).strip()
                logger.debug(f"Erkannt {field}: {extracted_data[field]}")
            else:
                extracted_data[field] = None
        
        # Zusätzliche intelligente Erkennung
        extracted_data.update(self._extract_additional_data(text))
        
        # Fallback: Einfache Suche nach Schlüsselwörtern
        if not extracted_data.get('patient_name'):
            # Suche nach Namen nach "Name:" oder "Patient:"
            name_patterns = [
                r'(?:name|patient|versicherter)[:\s]+([a-zA-ZäöüßÄÖÜ\s]+)',
                r'([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)',  # Zwei Großbuchstaben-Wörter
            ]
            for pattern in name_patterns:
                name_match = re.search(pattern, text, re.IGNORECASE)
                if name_match:
                    extracted_data['patient_name'] = name_match.group(1).strip()
                    logger.info(f"Fallback erkannt patient_name: {extracted_data['patient_name']}")
                    break
        
        if not extracted_data.get('doctor_name'):
            # Suche nach Arzt nach "Arzt:" oder "Dr."
            doctor_patterns = [
                r'(?:arzt|dr\.?|verordnender)[:\s]+([a-zA-ZäöüßÄÖÜ\s]+)',
                r'(?:dr\.?)\s*([a-zA-ZäöüßÄÖÜ\s]+)',  # Dr. Name
            ]
            for pattern in doctor_patterns:
                doctor_match = re.search(pattern, text, re.IGNORECASE)
                if doctor_match:
                    extracted_data['doctor_name'] = doctor_match.group(1).strip()
                    logger.info(f"Fallback erkannt doctor_name: {extracted_data['doctor_name']}")
                    break
        
        if not extracted_data.get('prescription_date'):
            # Suche nach Datum
            date_patterns = [
                r'(\d{1,2}\.\d{1,2}\.\d{4})',  # DD.MM.YYYY
                r'(\d{1,2}/\d{1,2}/\d{4})',    # DD/MM/YYYY
            ]
            for pattern in date_patterns:
                date_match = re.search(pattern, text)
                if date_match:
                    extracted_data['prescription_date'] = date_match.group(1)
                    logger.info(f"Fallback erkannt prescription_date: {extracted_data['prescription_date']}")
                    break
        
        return extracted_data
    
    def _extract_additional_data(self, text: str) -> Dict[str, Any]:
        """
        Zusätzliche intelligente Datenextraktion
        """
        additional_data = {}
        
        # Patientennamen (verschiedene Formate)
        name_patterns = [
            r'([A-ZÄÖÜ][a-zäöüß]+)\s+([A-ZÄÖÜ][a-zäöüß]+)',
            r'Patient:\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)',
            r'Name:\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text)
            if match and 'patient_name' not in additional_data:
                additional_data['patient_name'] = match.group(1) if len(match.groups()) == 1 else f"{match.group(1)} {match.group(2)}"
                break
        
        # Geburtsdatum
        date_patterns = [
            r'(\d{1,2}\.\d{1,2}\.\d{4})',
            r'Geb\.\s*(\d{1,2}\.\d{1,2}\.\d{4})',
            r'Geboren\s*(\d{1,2}\.\d{1,2}\.\d{4})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match and 'patient_birth' not in additional_data:
                additional_data['patient_birth'] = match.group(1)
                break
        
        # ICD-Code
        icd_patterns = [
            r'([A-Z]\d{2}\.?\d*)',
            r'ICD[:\s]*([A-Z]\d{2}\.?\d*)',
            r'Diagnose[:\s]*([A-Z]\d{2}\.?\d*)'
        ]
        
        for pattern in icd_patterns:
            match = re.search(pattern, text)
            if match and 'diagnosis_code' not in additional_data:
                additional_data['diagnosis_code'] = match.group(1)
                break
        
        # Anzahl Sitzungen
        sessions_patterns = [
            r'(\d+)\s*(?:Sitzungen|Behandlungen)',
            r'Anzahl[:\s]*(\d+)',
            r'(\d+)\s*(?:x|mal)'
        ]
        
        for pattern in sessions_patterns:
            match = re.search(pattern, text)
            if match and 'sessions' not in additional_data:
                additional_data['sessions'] = int(match.group(1))
                break
        
        return additional_data
    
    def process_prescription_file(self, file_path: str) -> Dict[str, Any]:
        """
        Hauptfunktion: Verarbeitet eine Rezeptdatei und extrahiert alle relevanten Daten
        """
        try:
            # Dateityp erkennen
            if file_path.lower().endswith('.pdf'):
                text = self.extract_text_from_pdf(file_path)
            else:
                text = self.extract_text_from_image(file_path)
            
            # Daten parsen
            extracted_data = self.parse_prescription_data(text)
            
            # Konfidenz-Score berechnen
            confidence_score = self._calculate_confidence(extracted_data)
            extracted_data['confidence_score'] = confidence_score
            
            # Rohtext für manuelle Überprüfung
            extracted_data['raw_text'] = text[:500] + "..." if len(text) > 500 else text
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Fehler bei Rezeptverarbeitung: {str(e)}")
            
            # Fallback: Einfache Text-Extraktion ohne OCR
            try:
                logger.info("Versuche Fallback-Text-Extraktion...")
                if file_path.lower().endswith('.pdf'):
                    text = self.extract_text_from_pdf(file_path)
                else:
                    # Einfache Bildverarbeitung ohne OCR
                    image = cv2.imread(file_path)
                    if image is not None:
                        # Konvertiere zu Graustufen und extrahiere Text
                        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                        text = pytesseract.image_to_string(gray, config='--oem 1 --psm 6')
                    else:
                        text = ""
                
                # Minimale Datenextraktion
                extracted_data = {
                    'raw_text': text[:500] + "..." if len(text) > 500 else text,
                    'confidence_score': 0.1,
                    'error_message': f"OCR fehlgeschlagen: {str(e)}"
                }
                
                return extracted_data
                
            except Exception as fallback_error:
                logger.error(f"Fallback-Text-Extraktion fehlgeschlagen: {str(fallback_error)}")
                # Letzter Fallback: Leere Daten
                return {
                    'raw_text': "OCR konnte nicht ausgeführt werden",
                    'confidence_score': 0.0,
                    'error_message': f"OCR und Fallback fehlgeschlagen: {str(e)}"
                }
    
    def _calculate_confidence(self, data: Dict[str, Any]) -> float:
        """
        Berechnet einen Konfidenz-Score für die extrahierten Daten
        """
        required_fields = ['patient_name', 'diagnosis_code', 'sessions']
        optional_fields = ['patient_birth', 'insurance_number', 'doctor_name', 'treatment']
        
        score = 0.0
        max_score = len(required_fields) + len(optional_fields)
        
        # Pflichtfelder (höhere Gewichtung)
        for field in required_fields:
            if field in data and data[field]:
                score += 2.0
        
        # Optionale Felder
        for field in optional_fields:
            if field in data and data[field]:
                score += 1.0
        
        return min(score / max_score, 1.0)
    
    def validate_extracted_data(self, data: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Validiert die extrahierten Daten gemäß Muster 13 Anforderungen
        """
        errors = []
        warnings = []
        
        # 1. Versichertenangaben (Pflicht)
        if not data.get('patient_name'):
            errors.append("Patientenname konnte nicht erkannt werden (Feld 1)")
        
        if not data.get('patient_birth'):
            errors.append("Geburtsdatum konnte nicht erkannt werden (Feld 5)")
        
        if not data.get('insurance_number'):
            warnings.append("Versicherungsnummer konnte nicht erkannt werden")
        
        # 2. Arztangaben (Pflicht)
        if not data.get('doctor_name'):
            errors.append("Arztname konnte nicht erkannt werden")
        
        if not data.get('bsnr'):
            warnings.append("BSNR (Betriebsstättennummer) konnte nicht erkannt werden")
        
        if not data.get('lanr'):
            warnings.append("LANR (Arztnummer) konnte nicht erkannt werden")
        
        # 3. Ausstellungsdatum (Pflicht - Rezept ungültig ohne)
        if not data.get('prescription_date'):
            errors.append("Ausstellungsdatum konnte nicht erkannt werden - Rezept ist ohne Datum ungültig")
        
        # 4. Zuzahlung
        if not data.get('copayment'):
            warnings.append("Zuzahlungsstatus konnte nicht erkannt werden")
        
        # 5. Heilmittelbereich (nur ein Fachbereich erlaubt)
        therapy_types = []
        for key in ['therapy_type', 'treatment_1', 'treatment_2', 'treatment_3']:
            if data.get(key):
                therapy_types.append(data[key])
        
        if len(set(therapy_types)) > 1:
            warnings.append("Mehrere Heilmittelbereiche erkannt - nur ein Fachbereich pro Verordnung erlaubt")
        
        # 6. Diagnose (mindestens eine erforderlich)
        if not data.get('diagnosis_code') and not data.get('diagnosis_text'):
            errors.append("Behandlungsrelevante Diagnose konnte nicht erkannt werden (Feld 6)")
        
        # 7. Diagnosegruppe (Pflicht)
        if not data.get('diagnosis_group'):
            errors.append("Diagnosegruppe konnte nicht erkannt werden (Feld 7)")
        
        # 8. Leitsymptomatik (Pflicht)
        if not data.get('leading_symptom'):
            errors.append("Leitsymptomatik konnte nicht erkannt werden (Feld 8)")
        
        # 9. Heilmittel (mindestens eines erforderlich)
        treatments = []
        for i in range(1, 4):
            if data.get(f'treatment_{i}'):
                treatments.append(data[f'treatment_{i}'])
        
        if not treatments and not data.get('blank_prescription'):
            errors.append("Mindestens ein Heilmittel muss verordnet werden (Feld 9)")
        
        # 10. Behandlungseinheiten (Pflicht)
        sessions_found = False
        for i in range(1, 4):
            if data.get(f'sessions_{i}'):
                sessions_found = True
                break
        
        if not sessions_found and not data.get('blank_prescription'):
            errors.append("Anzahl der Behandlungseinheiten konnte nicht erkannt werden (Feld 10)")
        
        # 11. Ergänzendes Heilmittel (Prüfung)
        if data.get('supplementary_treatment'):
            total_sessions = 0
            for i in range(1, 4):
                total_sessions += int(data.get(f'sessions_{i}', 0))
            
            if total_sessions == 0:
                warnings.append("Ergänzendes Heilmittel erkannt, aber keine Behandlungseinheiten gefunden")
        
        # 12. Therapiefrequenz
        if not data.get('frequency'):
            warnings.append("Therapiefrequenz konnte nicht erkannt werden")
        
        # 14. Hausbesuch
        if not data.get('home_visit'):
            warnings.append("Hausbesuch-Status konnte nicht erkannt werden")
        
        # 15. Dringlicher Behandlungsbedarf
        if data.get('urgent') == 'ja':
            warnings.append("Dringlicher Behandlungsbedarf erkannt - Behandlung muss innerhalb 14 Tagen beginnen")
        
        # Format-Validierungen
        icd_code = data.get('diagnosis_code')
        if icd_code and not re.match(r'^[A-Z]\d{2}\.?\d*$', icd_code):
            warnings.append(f"ICD-Code Format könnte inkorrekt sein: {icd_code}")
        
        diagnosis_group = data.get('diagnosis_group')
        if diagnosis_group and not re.match(r'^[A-Z]{2,3}$', diagnosis_group):
            warnings.append(f"Diagnosegruppe Format könnte inkorrekt sein: {diagnosis_group}")
        
        # Datum-Validierung
        for date_field in ['prescription_date', 'patient_birth', 'service_date']:
            date_value = data.get(date_field)
            if date_value:
                try:
                    datetime.strptime(date_value, '%d.%m.%Y')
                except ValueError:
                    warnings.append(f"Datum Format könnte inkorrekt sein: {date_value}")
        
        return {
            'errors': errors,
            'warnings': warnings
        }
