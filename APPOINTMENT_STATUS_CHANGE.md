# Termin-Status-Änderung in MediCal

## Übersicht

Die neue Status-Änderungsfunktion ermöglicht es Benutzern, den Status von Terminen einfach und intuitiv zu ändern. Die Funktion ist sowohl im Kalender als auch in den Termin-Details verfügbar.

## Verfügbare Status

### **Geplant (planned)**
- **Beschreibung**: Termin ist geplant und wartet auf Durchführung
- **Farbe**: Blau (primary)
- **Icon**: Schedule
- **Mögliche Übergänge**: Abgeschlossen, Storniert, Nicht erschienen

### **Abgeschlossen (completed)**
- **Beschreibung**: Termin wurde erfolgreich durchgeführt
- **Farbe**: Grün (success)
- **Icon**: CheckCircle
- **Mögliche Übergänge**: Abrechnungsbereit, Storniert

### **Abrechnungsbereit (ready_to_bill)**
- **Beschreibung**: Termin kann abgerechnet werden
- **Farbe**: Cyan (info)
- **Icon**: Receipt
- **Mögliche Übergänge**: Abgerechnet, Abgeschlossen

### **Abgerechnet (billed)**
- **Beschreibung**: Termin wurde bereits abgerechnet
- **Farbe**: Lila (secondary)
- **Icon**: Receipt
- **Mögliche Übergänge**: Abrechnungsbereit (Rückgängig machen)

### **Storniert (cancelled)**
- **Beschreibung**: Termin wurde storniert
- **Farbe**: Rot (error)
- **Icon**: Cancel
- **Mögliche Übergänge**: Geplant (Reaktivierung)

### **Nicht erschienen (no_show)**
- **Beschreibung**: Patient ist nicht zum Termin erschienen
- **Farbe**: Orange (warning)
- **Icon**: PersonOff
- **Mögliche Übergänge**: Geplant, Storniert

## Verwendung

### **Im Kalender**
1. **Rechtsklick** auf einen Termin im Kalender
2. Wählen Sie **"Status ändern"** aus dem Kontextmenü
3. Wählen Sie den gewünschten neuen Status aus
4. Der Status wird automatisch aktualisiert

### **In den Termin-Details**
1. Öffnen Sie die **Termin-Details** (Doppelklick auf Termin)
2. Klicken Sie auf den **"Status ändern"** Button neben dem aktuellen Status
3. Wählen Sie den gewünschten neuen Status aus
4. Der Status wird automatisch aktualisiert

## Status-Übergänge

### **Intelligente Übergänge**
Das System zeigt nur logisch sinnvolle Status-Übergänge an:

```
Geplant → Abgeschlossen/Storniert/Nicht erschienen
Abgeschlossen → Abrechnungsbereit/Storniert
Abrechnungsbereit → Abgerechnet/Abgeschlossen
Abgerechnet → Abrechnungsbereit (Rückgängig)
Storniert → Geplant (Reaktivierung)
Nicht erschienen → Geplant/Storniert
```

### **Automatische Validierung**
- Nur gültige Status-Übergänge werden angezeigt
- Unmögliche Übergänge sind deaktiviert
- Klare Beschreibungen für jeden Status

## Technische Implementierung

### **Frontend-Komponenten**
- **AppointmentStatusChange.js**: Hauptkomponente für Status-Änderungen
- **Dialog-Variante**: Für Termin-Details
- **Menu-Variante**: Für Kalender-Kontextmenü

### **Backend-Integration**
- **PATCH /api/appointments/{id}/**: Status-Update API
- **Automatische Validierung**: Status-Übergänge werden serverseitig validiert
- **Echtzeit-Updates**: Änderungen werden sofort im UI reflektiert

### **Berechtigungen**
- **Admins**: Können alle Termine bearbeiten
- **Therapeuten**: Können nur ihre eigenen Termine bearbeiten
- **Verwaltung**: Kann alle Termine bearbeiten

## Benutzerfreundlichkeit

### **Visuelle Hinweise**
- **Farbkodierte Status**: Jeder Status hat eine eindeutige Farbe
- **Icons**: Intuitive Icons für jeden Status
- **Beschreibungen**: Klare Beschreibungen der Status-Bedeutung

### **Feedback**
- **Lade-Indikatoren**: Zeigen an, wenn eine Änderung verarbeitet wird
- **Erfolgs-Meldungen**: Bestätigen erfolgreiche Status-Änderungen
- **Fehler-Meldungen**: Zeigen Probleme bei der Änderung an

### **Automatisches Schließen**
- Dialog schließt sich automatisch nach erfolgreicher Änderung
- Kurze Verzögerung für bessere Benutzererfahrung

## Workflow-Integration

### **Abrechnungs-Workflow**
1. **Geplant** → **Abgeschlossen** (nach Termin)
2. **Abgeschlossen** → **Abrechnungsbereit** (für Abrechnung vorbereitet)
3. **Abrechnungsbereit** → **Abgerechnet** (nach Abrechnung)

### **Stornierungs-Workflow**
1. **Geplant** → **Storniert** (bei Absage)
2. **Storniert** → **Geplant** (bei Reaktivierung)

### **No-Show-Workflow**
1. **Geplant** → **Nicht erschienen** (wenn Patient nicht kommt)
2. **Nicht erschienen** → **Geplant** (bei Neubuchung)

## Vorteile

### **Benutzerfreundlichkeit**
- **Einfache Bedienung**: Nur ein Klick für Status-Änderung
- **Intuitive Navigation**: Klare Menüstruktur
- **Sofortiges Feedback**: Änderungen werden sofort sichtbar

### **Effizienz**
- **Schnelle Änderungen**: Keine komplexen Formulare nötig
- **Weniger Klicks**: Direkte Status-Änderung ohne Umwege
- **Automatische Updates**: UI aktualisiert sich automatisch

### **Sicherheit**
- **Validierung**: Nur gültige Status-Übergänge möglich
- **Berechtigungen**: Rollenbasierte Zugriffskontrolle
- **Audit-Trail**: Alle Änderungen werden protokolliert

## Zukünftige Erweiterungen

### **Geplante Features**
- **Bulk-Status-Änderung**: Mehrere Termine gleichzeitig ändern
- **Status-Historie**: Verlauf aller Status-Änderungen anzeigen
- **Automatische Workflows**: Status-Änderungen basierend auf Regeln
- **Benachrichtigungen**: Automatische Benachrichtigungen bei Status-Änderungen

### **Integration**
- **Kalender-Synchronisation**: Status-Änderungen in externen Kalendern
- **Reporting**: Status-basierte Berichte und Statistiken
- **API-Erweiterungen**: Erweiterte API für Status-Management
