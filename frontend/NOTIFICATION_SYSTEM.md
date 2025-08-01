# Benachrichtigungssystem - MediCal Praxisverwaltung

## Übersicht

Das Benachrichtigungssystem der MediCal Praxisverwaltung erstellt automatisch Benachrichtigungen basierend auf echten Daten aus dem laufenden Betrieb. Es überwacht kontinuierlich wichtige Ereignisse und informiert Benutzer über relevante Aktivitäten.

## 🎯 **Funktionen**

### **Automatische Benachrichtigungen**

#### **1. Termine**
- **Neue Termine**: Automatische Benachrichtigung bei Erstellung eines Termins
- **Termin-Erinnerungen**: Benachrichtigungen für anstehende Termine in den nächsten 24 Stunden
- **Prioritätsstufen**: 
  - Hoch: Termine in den nächsten 2 Stunden
  - Mittel: Termine in den nächsten 6 Stunden
  - Niedrig: Termine in den nächsten 24 Stunden

#### **2. Verordnungen**
- **Neue Verordnungen**: Benachrichtigung bei Erstellung einer Verordnung
- **Dringende Verordnungen**: Spezielle Benachrichtigung für Verordnungen mit hoher Priorität
- **Automatische Erkennung**: System erkennt `is_urgent` Flag

#### **3. Patienten**
- **Neue Patienten**: Benachrichtigung bei Anlage eines neuen Patienten
- **Automatische Integration**: Wird beim Speichern in `PatientNew` ausgelöst

#### **4. Heilmittel**
- **Neue Heilmittel**: Benachrichtigung bei Erstellung eines neuen Heilmittels
- **Integration**: Automatisch in `TreatmentNew` integriert

#### **5. Abrechnungen**
- **Überfällige Abrechnungen**: Benachrichtigung für Abrechnungszyklen älter als 7 Tage
- **Automatische Überprüfung**: Alle 5 Minuten

#### **6. System-Alerts**
- **Neue Patienten ohne Termine**: Benachrichtigung für Patienten ohne Termine in den letzten 7 Tagen
- **Erweiterbar**: Weitere System-Überprüfungen können hinzugefügt werden

## 🔧 **Technische Implementierung**

### **NotificationService (`notificationService.js`)**

```javascript
// Automatische Überprüfungen alle 5 Minuten
startAutoChecks() {
  this.checkInterval = setInterval(async () => {
    await this.checkForNewNotifications();
  }, 5 * 60 * 1000);
}

// Überprüfung verschiedener Benachrichtigungstypen
async checkForNewNotifications() {
  await this.checkUpcomingAppointments();
  await this.checkUrgentPrescriptions();
  await this.checkOverdueBilling();
  await this.checkSystemAlerts();
}
```

### **API-Integration**

Das System verwendet echte API-Endpunkte:

- **Termine**: `GET /appointments/` mit Datums-Filtern
- **Verordnungen**: `GET /prescriptions/` mit Status- und Prioritäts-Filtern
- **Patienten**: `GET /patients/` mit verschiedenen Filtern
- **Abrechnungen**: `GET /billing-cycles/` mit Status-Filtern

### **Hooks für Komponenten-Integration**

```javascript
// Automatische Benachrichtigungen in Komponenten
import { usePatientNotifications } from '../hooks/useNotifications';

function PatientNew() {
  const { createNotification } = usePatientNotifications();
  
  const handleSubmit = async (e) => {
    const response = await api.post('patients/', formData);
    createNotification('patient', response.data); // Automatische Benachrichtigung
  };
}
```

## 📱 **Benutzeroberfläche**

### **NotificationBell-Komponente**
- **Badge-Anzeige**: Ungelesene Benachrichtigungen im Header
- **Dropdown-Menü**: Vollständige Benachrichtigungsliste
- **Interaktive Aktionen**: Als gelesen markieren, löschen
- **Navigation**: Klick führt zur entsprechenden Seite

### **Notifications-Seite**
- **Vollständige Verwaltung**: Alle Benachrichtigungen anzeigen
- **Filter-System**: Nach Typ und Priorität filtern
- **Tab-Navigation**: Ungelesen, Gelesen, Alle
- **Statistik-Karten**: Übersicht über Benachrichtigungen

## 🚀 **Verwendung**

### **Für Entwickler**

#### **1. Neue Benachrichtigungstypen hinzufügen**

```javascript
// In notificationService.js
export const NOTIFICATION_TYPES = {
  // ... bestehende Typen
  NEW_TYPE: 'new_type'
};

// Neue Überprüfungsmethode
async checkNewTypeNotifications() {
  const response = await api.get('/new-endpoint/');
  const data = response.data;
  
  data.forEach(item => {
    this.createNewTypeNotification(item);
  });
}

// Neue Benachrichtigungserstellung
createNewTypeNotification(data) {
  return this.addNotification({
    type: NOTIFICATION_TYPES.NEW_TYPE,
    title: 'Neue Benachrichtigung',
    message: `Beschreibung für ${data.name}`,
    priority: 'medium',
    actionUrl: `/new-type/${data.id}`
  });
}
```

#### **2. Integration in bestehende Komponenten**

```javascript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const { createNotification } = useNotifications();
  
  const handleSave = async (data) => {
    const response = await api.post('/endpoint/', data);
    createNotification('appointment', response.data);
  };
}
```

### **Für Benutzer**

#### **1. Benachrichtigungen anzeigen**
- Klicken Sie auf das Glockensymbol im Header
- Benachrichtigungen werden automatisch angezeigt

#### **2. Benachrichtigungen verwalten**
- Besuchen Sie die "Benachrichtigungen"-Seite
- Filtern Sie nach Typ und Priorität
- Markieren Sie als gelesen oder löschen Sie

#### **3. Automatische Updates**
- Das System überprüft alle 5 Minuten auf neue Benachrichtigungen
- Benachrichtigungen werden automatisch erstellt

## 📊 **Konfiguration**

### **Überprüfungsintervalle**
```javascript
// In notificationService.js
startAutoChecks() {
  this.checkInterval = setInterval(async () => {
    await this.checkForNewNotifications();
  }, 5 * 60 * 1000); // 5 Minuten
}
```

### **Prioritätsstufen**
- **Hoch**: Rote Badge, sofortige Aufmerksamkeit erforderlich
- **Mittel**: Orange Badge, normale Priorität
- **Niedrig**: Blaue Badge, niedrige Priorität

### **Persistierung**
- Benachrichtigungen werden im localStorage gespeichert
- Überleben Browser-Neustarts
- Werden beim Logout bereinigt

## 🔍 **Debugging**

### **Logs aktivieren**
```javascript
// In notificationService.js
console.log('Checking for new notifications...');
console.log('Found appointments:', appointments.length);
```

### **Manuelle Überprüfung**
```javascript
// Im Browser-Console
notificationService.checkForNewNotifications();
```

## 🛠 **Wartung**

### **Cleanup**
```javascript
// Automatisches Cleanup alter Benachrichtigungen
cleanupOldNotifications(days = 30) {
  // Löscht Benachrichtigungen älter als 30 Tage
}
```

### **Reset für Tests**
```javascript
// Demo-Daten zurücksetzen
notificationService.resetToDemo();
```

## 📈 **Erweiterungen**

### **Geplante Features**
- **E-Mail-Benachrichtigungen**: Automatische E-Mails für wichtige Ereignisse
- **Push-Benachrichtigungen**: Browser-Push-Notifications
- **Benutzer-Einstellungen**: Individuelle Benachrichtigungspräferenzen
- **Erweiterte Filter**: Mehr Filteroptionen für Benachrichtigungen

### **API-Erweiterungen**
- **WebSocket-Integration**: Echtzeit-Benachrichtigungen
- **Server-seitige Benachrichtigungen**: Automatische Erstellung auf dem Server
- **Benachrichtigungs-Historie**: Langzeit-Speicherung von Benachrichtigungen

---

**Hinweis**: Das Benachrichtigungssystem ist vollständig in die bestehende Anwendung integriert und verwendet ausschließlich echte Daten aus dem laufenden Betrieb. 