# OCR-System für Rezeptverarbeitung

## Übersicht

Das OCR-System ermöglicht die automatische Erkennung und Extraktion von Rezeptdaten aus Bildern und PDFs. Es wurde speziell für deutsche Heilmittelverordnungen entwickelt.

## Funktionen

### ✅ **Unterstützte Dateiformate:**
- **Bilder**: JPG, PNG, JPEG
- **PDFs**: Alle PDF-Formate
- **Kamera**: Direkte Aufnahme über Webcam/Mobilgerät

### ✅ **Erkannte Datenfelder (Muster 13 konform):**
- **Versichertenangaben** (Name, Geburtsdatum, Versicherungsnummer, Kostenträger)
- **Arztangaben** (Name, BSNR, LANR)
- **Ausstellungsdatum** (Pflicht - Rezept ungültig ohne)
- **Zuzahlung** (pflichtig/frei/befreit)
- **Heilmittelbereich** (nur ein Fachbereich pro Verordnung)
- **Diagnose** (ICD-10 Code + Klartext, mindestens eine erforderlich)
- **Diagnosegruppe** (z.B. WS, EX - Pflicht)
- **Leitsymptomatik** (a, b, c oder Klartext - Pflicht)
- **Heilmittel** (bis zu 3 vorrangige + 1 ergänzendes)
- **Behandlungseinheiten** (Höchstverordnungsmenge)
- **Therapiefrequenz** (z.B. "2x pro Woche")
- **Therapiebericht** (optional)
- **Hausbesuch** (ja/nein)
- **Dringlicher Behandlungsbedarf** (14 Tage Frist)
- **Therapieziele** (optional)
- **Leistungserbringer-Daten** (IK, Datum, Maßnahmen, Therapeut)

### ✅ **Intelligente Features:**
- **Muster 13 Validierung**: Vollständige Prüfung gemäß Heilmittelrichtlinie
- **Konfidenz-Score**: Bewertung der Erkennungsqualität
- **Validierung**: Automatische Prüfung der extrahierten Daten
- **Manuelle Bearbeitung**: Nachträgliche Korrektur der erkannten Daten
- **Patienten-Matching**: Automatische Zuordnung zu bestehenden Patienten
- **Arzt-Matching**: Automatische Zuordnung zu bestehenden Ärzten
- **Ähnlichkeits-Suche**: Intelligente Vorschläge bei Namensabweichungen
- **Neue Personen anlegen**: Direkte Erstellung von Patienten und Ärzten
- **Automatische Verordnungserstellung**: Direkte Erstellung aus OCR-Daten

## Technische Implementierung

### Backend (Django)

#### **OCR-Service** (`core/services/ocr_service.py`)
```python
class OCRService:
    # Tesseract-Konfiguration für deutsche Sprache
    config = '--oem 3 --psm 6 -l deu'
    
    # Regex-Patterns für deutsche Rezepte
    patterns = {
        'patient_name': r'(?:Name|Patient):\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)',
        'diagnosis_code': r'(?:ICD|Diagnose):\s*([A-Z]\d{2}\.?\d*)',
        # ... weitere Patterns
    }
```

#### **API-Endpunkte**
- `POST /api/prescriptions/ocr/process/` - OCR-Verarbeitung
- `POST /api/prescriptions/ocr/create/` - Verordnungserstellung

#### **Bildvorverarbeitung**
- Graustufen-Konvertierung
- Rauschen-Reduktion
- Kontrast-Verbesserung (CLAHE)
- Automatische Bildoptimierung

### Frontend (React)

#### **PrescriptionOCR-Komponente**
- Drag & Drop Upload
- Kamera-Integration
- Live-Vorschau
- Bearbeitungs-Dialog
- Validierungs-Anzeige

#### **Integration in PrescriptionList**
- "OCR hinzufügen" Button
- Modal-Dialog für OCR-Verarbeitung
- Automatische Listen-Aktualisierung

## Verwendung

### 1. **Rezept hochladen**
```
Verordnungen → "OCR hinzufügen" → Datei auswählen oder Kamera
```

### 2. **OCR verarbeiten**
```
"OCR verarbeiten" → Automatische Datenextraktion
```

### 3. **Daten überprüfen**
```
- Konfidenz-Score anzeigen
- Validierungsfehler prüfen
- Daten bei Bedarf bearbeiten
```

### 4. **Verordnung erstellen**
```
"Verordnung erstellen" → Automatische Speicherung
```

## Konfiguration

### **Tesseract-Installation**
```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-deu

# Python-Pakete
pip install pytesseract pillow opencv-python-headless PyMuPDF
```

### **Umgebungsvariablen**
```bash
# Optional: Tesseract-Pfad setzen
export TESSDATA_PREFIX=/usr/share/tessdata/
```

## Qualitätssicherung

### **Muster 13 Validierung**
- **Pflichtfelder**: Patientenname, Geburtsdatum, Arztname, Ausstellungsdatum, Diagnose, Diagnosegruppe, Leitsymptomatik, Heilmittel, Behandlungseinheiten
- **Format-Prüfung**: ICD-Code, Diagnosegruppe, Datum, BSNR/LANR
- **Geschäftsregeln**: Nur ein Heilmittelbereich, Höchstverordnungsmenge, 14-Tage-Frist bei dringlichem Bedarf
- **Warnungen**: Optionale Felder fehlen, Format-Abweichungen

### **Konfidenz-Scores**
- **Hoch (≥80%)**: Zuverlässige Erkennung
- **Mittel (60-79%)**: Überprüfung empfohlen
- **Niedrig (<60%)**: Manuelle Korrektur erforderlich

### **Fallback-Mechanismen**
- **Patienten-Matching**: Exakte Suche → Ähnlichkeitssuche → Neuer Patient
- **Arzt-Matching**: Exakte Suche → Ähnlichkeitssuche → Neuer Arzt
- **ICD-Code-Suche**: Teilstring-Matching für Diagnosecodes
- **Standard-Werte**: Automatische Belegung fehlender Daten
- **Format-Korrektur**: Automatische Datum- und Code-Formatierung

## Erweiterte Features

### **Batch-Verarbeitung**
- Mehrere Rezepte gleichzeitig
- Bulk-Upload-Funktionalität

### **Template-Erkennung**
- Verschiedene Rezeptformate
- Automatische Format-Erkennung

### **Machine Learning**
- Verbesserte Erkennung durch Training
- Anpassung an spezifische Formulare

## Troubleshooting

### **Häufige Probleme**

#### **Tesseract nicht gefunden**
```bash
# Pfad prüfen
which tesseract

# Installation überprüfen
tesseract --version
```

#### **Schlechte Erkennung**
- Bildqualität verbessern
- Kontrast erhöhen
- Auflösung prüfen (min. 300 DPI)

#### **Deutsche Umlaute**
- Tesseract-DE-Paket installiert
- UTF-8 Encoding sicherstellen

### **Debug-Modus**
```python
# OCR-Service mit Debug-Logging
import logging
logging.getLogger('core.services.ocr_service').setLevel(logging.DEBUG)
```

## Performance

### **Verarbeitungszeiten**
- **Bilder**: ~2-5 Sekunden
- **PDFs**: ~3-8 Sekunden
- **Batch**: Linear skalierend

### **Optimierungen**
- Bildvorverarbeitung
- Caching von OCR-Ergebnissen
- Asynchrone Verarbeitung

## Sicherheit

### **Datei-Validierung**
- MIME-Type-Prüfung
- Größenbeschränkung (10MB)
- Schadcode-Scanning

### **Datenintegrität**
- Validierung vor Speicherung
- Backup der Original-Dateien
- Audit-Trail für Änderungen

## Zukunft

### **Geplante Erweiterungen**
- **KI-basierte Erkennung**: Bessere Genauigkeit
- **Mobile App**: Native OCR-Funktionalität
- **Cloud-OCR**: Externe Verarbeitung
- **Automatische Abrechnung**: Direkte GKV-Übertragung

### **Integration**
- **GKV-Schnittstelle**: Automatische Übermittlung
- **Arzt-Portal**: Direkte Verordnungserstellung
- **Patienten-Portal**: Digitale Rezeptübertragung
