# 📋 Verordnungs- und Terminserien-System

## 🎯 **Übersicht**

Das neue System implementiert die korrekte Geschäftslogik für Verordnungen und Terminserien:

- **Eine Verordnung = Eine Terminserie**
- **Folgeverordnungen verlängern die ursprüngliche Verordnung**
- **Termine werden entsprechend verlängert**

## 🔧 **Implementierte Features**

### **1. Folgeverordnungen-System**

#### **Neue Felder im Prescription-Model:**
- `original_prescription`: Verweis auf die ursprüngliche Verordnung
- `is_follow_up`: Boolean-Flag für Folgeverordnungen
- `follow_up_number`: Nummer der Folgeverordnung (1, 2, 3, ...)
- `status`: Neuer Status "Extended" für verlängerte Verordnungen

#### **Automatische Logik:**
```python
# Folgeverordnung erstellen
follow_up = original_prescription.create_follow_up_prescription(
    number_of_sessions=10,
    therapy_goals="Weitere Behandlung..."
)

# Alle Verordnungen einer Kette abrufen
all_prescriptions = prescription.get_all_follow_ups()

# Gesamtsitzungen über alle Verordnungen
total_sessions = prescription.get_total_sessions_across_all_prescriptions()
```

### **2. Terminserien-Validierung**

#### **Eine Verordnung pro Serie:**
- Jede Terminserie kann nur eine Verordnung haben
- Automatische Validierung beim Erstellen von Terminen
- Verhindert Inkonsistenzen in der Datenbank

#### **Validierungslogik:**
```python
# Prüft ob andere Termine in der gleichen Serie eine andere Verordnung haben
conflicting_appointments = Appointment.objects.filter(
    series_identifier=series_identifier,
    prescription__isnull=False
).exclude(prescription=prescription)

if conflicting_appointments.exists():
    raise ValidationError("Eine Terminserie kann nur eine Verordnung haben.")
```

### **3. PrescriptionSeriesService**

#### **Hauptfunktionen:**

1. **Terminserie erstellen:**
```python
series_id, appointments = PrescriptionSeriesService.create_appointment_series(
    prescription=prescription,
    start_date=start_date,
    end_date=end_date,
    practitioner=practitioner,
    frequency='weekly_2',
    duration_minutes=30
)
```

2. **Terminserie verlängern:**
```python
new_appointments = PrescriptionSeriesService.extend_appointment_series(
    prescription=prescription,
    additional_sessions=5,
    practitioner=practitioner
)
```

3. **Folgeverordnung mit Terminserie:**
```python
follow_up_prescription, series_id, appointments = PrescriptionSeriesService.create_follow_up_series(
    original_prescription=original_prescription,
    new_sessions=10,
    practitioner=practitioner
)
```

## 📊 **Geschäftslogik**

### **Verordnungs-Hierarchie:**
```
Ursprüngliche Verordnung (ID: 1)
├── Folgeverordnung 1 (ID: 2, follow_up_number: 1)
├── Folgeverordnung 2 (ID: 3, follow_up_number: 2)
└── Folgeverordnung 3 (ID: 4, follow_up_number: 3)
```

### **Terminserien-Logik:**
```
Verordnung 1 → Terminserie A (series_identifier: "series_1_123456")
Verordnung 2 → Terminserie B (series_identifier: "series_2_123457")
Verordnung 3 → Terminserie C (series_identifier: "series_3_123458")
```

### **Sitzungsverwaltung:**
- **Ursprüngliche Verordnung**: 10 Sitzungen
- **Folgeverordnung 1**: 8 Sitzungen
- **Folgeverordnung 2**: 6 Sitzungen
- **Gesamt**: 24 Sitzungen über alle Verordnungen

## 🔄 **Workflow-Beispiele**

### **Beispiel 1: Neue Verordnung mit Terminserie**
```python
# 1. Verordnung erstellen
prescription = Prescription.objects.create(
    patient=patient,
    doctor=doctor,
    treatment_1=treatment,
    number_of_sessions=10,
    therapy_frequency_type='weekly_2'
)

# 2. Terminserie erstellen
series_id, appointments = PrescriptionSeriesService.create_appointment_series(
    prescription=prescription,
    start_date=datetime.now() + timedelta(days=7),
    end_date=datetime.now() + timedelta(weeks=10),
    practitioner=practitioner,
    frequency='weekly_2'
)
```

### **Beispiel 2: Folgeverordnung erstellen**
```python
# 1. Folgeverordnung erstellen
follow_up = original_prescription.create_follow_up_prescription(
    number_of_sessions=8,
    therapy_goals="Weitere Behandlung nach positiver Entwicklung"
)

# 2. Neue Terminserie für Folgeverordnung
series_id, appointments = PrescriptionSeriesService.create_follow_up_series(
    original_prescription=original_prescription,
    new_sessions=8,
    practitioner=practitioner
)
```

### **Beispiel 3: Bestehende Serie verlängern**
```python
# Terminserie um 5 weitere Termine verlängern
new_appointments = PrescriptionSeriesService.extend_appointment_series(
    prescription=prescription,
    additional_sessions=5,
    practitioner=practitioner
)
```

## 🛡️ **Validierungen und Sicherheit**

### **Automatische Validierungen:**

1. **Verordnungs-Validierung:**
   - Mindestens eine Behandlung muss ausgewählt sein
   - Verordnung darf nicht älter als 1 Jahr sein
   - Krankenkasse muss zum Verordnungsdatum gültig gewesen sein

2. **Terminserien-Validierung:**
   - Eine Verordnung kann nur eine Terminserie haben
   - Behandlung muss in der Verordnung enthalten sein
   - Behandler- und Raumverfügbarkeit wird geprüft

3. **Folgeverordnungs-Validierung:**
   - Nur ursprüngliche Verordnungen oder letzte Folgeverordnung können verlängert werden
   - Folgeverordnungsnummer wird automatisch vergeben

### **Fehlerbehandlung:**
```python
try:
    series_id, appointments = PrescriptionSeriesService.create_appointment_series(...)
except ValidationError as e:
    # Benutzerfreundliche Fehlermeldung
    logger.error(f"Fehler beim Erstellen der Terminserie: {e}")
    return error_response(e.message)
```

## 📈 **Monitoring und Reporting**

### **Serien-Informationen abrufen:**
```python
series_info = PrescriptionSeriesService.get_series_info(series_identifier)

# Gibt zurück:
{
    'series_identifier': 'series_1_123456',
    'prescription': prescription,
    'patient': patient,
    'practitioner': practitioner,
    'total_appointments': 10,
    'completed_appointments': 7,
    'cancelled_appointments': 1,
    'remaining_appointments': 2,
    'start_date': datetime,
    'end_date': datetime,
    'progress_percentage': 70.0
}
```

### **Verordnungs-Statistiken:**
```python
# Gesamtsitzungen über alle Verordnungen
total_sessions = prescription.get_total_sessions_across_all_prescriptions()

# Abgeschlossene Sitzungen
completed_sessions = prescription.get_total_completed_sessions_across_all_prescriptions()

# Verbleibende Sitzungen
remaining_sessions = prescription.get_remaining_sessions()
```

## 🎨 **Frontend-Integration**

### **Neue API-Endpunkte:**
- `POST /api/prescriptions/{id}/create_follow_up/` - Folgeverordnung erstellen
- `POST /api/appointments/create_series/` - Terminserie erstellen
- `POST /api/appointments/extend_series/` - Serie verlängern
- `GET /api/appointments/series/{identifier}/` - Serien-Informationen

### **Frontend-Komponenten:**
- **FollowUpPrescriptionForm**: Formular für Folgeverordnungen
- **SeriesManagement**: Verwaltung von Terminserien
- **PrescriptionTimeline**: Timeline aller Verordnungen eines Patienten

## 🔮 **Zukünftige Erweiterungen**

### **Geplante Features:**
1. **Automatische Folgeverordnungen**: Basierend auf Behandlungsfortschritt
2. **Serien-Templates**: Vordefinierte Serien für häufige Behandlungen
3. **Intelligente Terminplanung**: Automatische Optimierung der Termine
4. **Serien-Analytics**: Detaillierte Auswertungen der Behandlungsverläufe

### **Performance-Optimierungen:**
1. **Batch-Erstellung**: Mehrere Termine gleichzeitig erstellen
2. **Caching**: Serien-Informationen cachen
3. **Async-Verarbeitung**: Große Serien im Hintergrund erstellen

## 📋 **Checkliste für Implementierung**

### ✅ **Backend implementiert:**
- [x] Prescription-Model erweitert
- [x] Appointment-Validierung implementiert
- [x] PrescriptionSeriesService erstellt
- [x] Migration erstellt und ausgeführt
- [x] API-Endpunkte erweitert

### 🔄 **Frontend in Arbeit:**
- [ ] Folgeverordnungs-Formular
- [ ] Serien-Verwaltung
- [ ] Timeline-Komponente
- [ ] API-Integration

### 📅 **Geplant:**
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] Dokumentation
- [ ] Benutzer-Schulung

## 🎉 **Ergebnis**

Das neue System stellt sicher, dass:

1. **Jede Verordnung nur eine Terminserie hat**
2. **Folgeverordnungen korrekt verknüpft sind**
3. **Termine automatisch verlängert werden können**
4. **Datenkonsistenz gewährleistet ist**
5. **Benutzerfreundliche Verwaltung möglich ist**

Die Implementierung folgt den medizinischen Geschäftsprozessen und ermöglicht eine effiziente Verwaltung von Verordnungen und Terminserien.
