# Benachrichtigungstypen in MediCal

## Übersicht aller verfügbaren Benachrichtigungstypen

### 1. **APPOINTMENT** - Termine
- **Beschreibung**: Benachrichtigungen zu Terminen und Termin-Erinnerungen
- **Trigger**: 
  - Neue Termine werden erstellt
  - Termine in den nächsten 24 Stunden
  - Termin-Änderungen oder -Stornierungen
- **Priorität**: 
  - Hoch: Termine in den nächsten 2 Stunden
  - Mittel: Termine in den nächsten 6 Stunden
  - Niedrig: Termine in den nächsten 24 Stunden
- **Beispiel**: "Termin für Max Mustermann in 2 Stunden"

### 2. **PRESCRIPTION** - Verordnungen
- **Beschreibung**: Benachrichtigungen zu Heilmittelverordnungen
- **Trigger**:
  - Neue Verordnungen werden erstellt
  - Dringende Verordnungen (is_urgent = true)
  - Verordnungen mit ablaufendem Gültigkeitszeitraum
- **Priorität**:
  - Hoch: Dringende Verordnungen
  - Mittel: Normale Verordnungen
- **Beispiel**: "Dringende Verordnung für Anna Schmidt benötigt sofortige Aufmerksamkeit"

### 3. **PATIENT** - Patienten
- **Beschreibung**: Benachrichtigungen zu Patienten-Events
- **Trigger**:
  - Neue Patienten werden angelegt
  - Patienten-Informationen werden aktualisiert
  - Patienten ohne Termine (nach 7 Tagen)
- **Priorität**: Mittel
- **Beispiel**: "Patient Max Mustermann wurde erfolgreich angelegt"

### 4. **FINANCE** - Finanzen
- **Beschreibung**: Benachrichtigungen zu finanziellen Ereignissen
- **Trigger**:
  - Neue Rechnungen werden erstellt
  - Zahlungen werden erhalten
  - Finanzberichte werden generiert
- **Priorität**: Niedrig bis Mittel
- **Beispiel**: "Finanz-Update: Neue Rechnung für Patient XYZ erstellt"

### 5. **SYSTEM** - System
- **Beschreibung**: System-spezifische Benachrichtigungen
- **Trigger**:
  - Neue Patienten ohne Termine
  - System-Wartungen
  - Backup-Status
  - Speicherplatz-Warnungen
- **Priorität**: Niedrig
- **Beispiel**: "5 neue Patienten haben noch keine Termine"

### 6. **URGENT** - Dringend
- **Beschreibung**: Dringende Benachrichtigungen
- **Trigger**:
  - Kritische System-Fehler
  - Dringende medizinische Ereignisse
  - Sicherheitswarnungen
- **Priorität**: Hoch
- **Beispiel**: "Kritischer System-Fehler: Backup fehlgeschlagen"

### 7. **TREATMENT** - Heilmittel
- **Beschreibung**: Benachrichtigungen zu Heilmittel-Behandlungen
- **Trigger**:
  - Neue Heilmittel werden erstellt
  - Behandlungen werden abgeschlossen
  - Heilmittel-Änderungen
- **Priorität**: Mittel
- **Beispiel**: "Heilmittel für Max Mustermann wurde erstellt"

### 8. **BILLING** - Abrechnung
- **Beschreibung**: Benachrichtigungen zu Abrechnungsprozessen
- **Trigger**:
  - Überfällige Abrechnungszyklen (älter als 7 Tage)
  - Neue Abrechnungszyklen werden erstellt
  - Abrechnungsfehler
- **Priorität**: Hoch (bei überfälligen Abrechnungen)
- **Beispiel**: "Abrechnungszyklus vom 15.08.2025 ist seit 8 Tagen überfällig"

## Prioritätsstufen

### **Hoch (High)**
- Dringende medizinische Ereignisse
- System-kritische Fehler
- Überfällige Abrechnungen
- Termine in den nächsten 2 Stunden
- Dringende Verordnungen

### **Mittel (Medium)**
- Normale Termine und Verordnungen
- Neue Patienten und Heilmittel
- Finanzielle Updates
- System-Warnungen

### **Niedrig (Low)**
- Informative System-Nachrichten
- Regelmäßige Updates
- Nicht-kritische Finanzberichte

## Automatische Überprüfungen

Das System führt automatische Überprüfungen alle 10 Minuten durch:

1. **Termine**: Prüft auf anstehende Termine in den nächsten 24 Stunden
2. **Verordnungen**: Prüft auf dringende Verordnungen
3. **Abrechnungen**: Prüft auf überfällige Abrechnungszyklen
4. **System**: Prüft auf System-Alerts und neue Patienten ohne Termine

## Benachrichtigungsstatus

- **UNREAD**: Ungelesen (neue Benachrichtigungen)
- **READ**: Gelesen
- **ARCHIVED**: Archiviert (ältere Benachrichtigungen)

## Speicherung

- Benachrichtigungen werden im localStorage gespeichert
- Automatische Bereinigung nach 30 Tagen (außer ungelesene)
- Duplikat-Erkennung verhindert mehrfache Benachrichtigungen
