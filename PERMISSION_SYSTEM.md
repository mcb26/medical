# 🔐 Berechtigungssystem - Dokumentation

## 📋 Übersicht

Das neue Berechtigungssystem ermöglicht eine **granulare Kontrolle** über Benutzerzugriffe auf verschiedene Module der Praxisverwaltung. Jeder Benutzer kann individuell Berechtigungen für jedes Modul erhalten.

## 🎯 Kernfunktionen

### **CRUD-Berechtigungen pro Modul**
- **None** (Kein Zugriff) - Benutzer kann das Modul nicht sehen
- **Read** (Nur Lesen) - Benutzer kann Daten anzeigen
- **Create** (Erstellen) - Benutzer kann neue Einträge erstellen
- **Update** (Bearbeiten) - Benutzer kann bestehende Einträge bearbeiten
- **Delete** (Löschen) - Benutzer kann Einträge löschen
- **Full** (Voller Zugriff) - Benutzer hat alle Berechtigungen

### **Verfügbare Module**
1. **Terminkalender** (`appointments`) - Terminverwaltung
2. **Patienten** (`patients`) - Patientenverwaltung
3. **Verordnungen** (`prescriptions`) - Verordnungsverwaltung
4. **Heilmittel** (`treatments`) - Heilmittelverwaltung
5. **Berichte** (`reports`) - Berichte und Analysen
6. **Finanzen** (`finance`) - Finanzverwaltung
7. **Abrechnung** (`billing`) - Abrechnungsverwaltung
8. **Einstellungen** (`settings`) - Systemeinstellungen
9. **Benutzerverwaltung** (`users`) - Benutzer und Berechtigungen

## 🏗️ Technische Implementierung

### **Backend-Modelle**

#### `UserRole` (Benutzerrollen)
```python
class UserRole(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Inhaber'),
        ('admin', 'Administrator'),
        ('doctor', 'Arzt'),
        ('nurse', 'Krankenschwester'),
        ('receptionist', 'Empfang'),
        ('accountant', 'Buchhalter'),
        ('assistant', 'Assistent'),
        ('intern', 'Praktikant'),
    ]
    
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
```

#### `ModulePermission` (Modul-Berechtigungen)
```python
class ModulePermission(models.Model):
    PERMISSION_CHOICES = [
        ('none', 'Kein Zugriff'),
        ('read', 'Nur Lesen'),
        ('create', 'Erstellen'),
        ('update', 'Bearbeiten'),
        ('delete', 'Löschen'),
        ('full', 'Voller Zugriff'),
    ]
    
    MODULE_CHOICES = [
        ('appointments', 'Terminkalender'),
        ('patients', 'Patienten'),
        ('prescriptions', 'Verordnungen'),
        ('treatments', 'Heilmittel'),
        ('reports', 'Berichte'),
        ('finance', 'Finanzen'),
        ('billing', 'Abrechnung'),
        ('settings', 'Einstellungen'),
        ('users', 'Benutzerverwaltung'),
    ]
    
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    module = models.CharField(max_length=20, choices=MODULE_CHOICES)
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES)
    granted_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
```

#### `UserActivityLog` (Audit-Log)
```python
class UserActivityLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Erstellt'),
        ('update', 'Aktualisiert'),
        ('delete', 'Gelöscht'),
        ('view', 'Angesehen'),
        ('export', 'Exportiert'),
        ('import', 'Importiert'),
        ('permission_change', 'Berechtigung geändert'),
        ('role_change', 'Rolle geändert'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=50)
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
```

### **Frontend-Implementierung**

#### `usePermissions` Hook
```javascript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  // Prüfe Berechtigung
  const canEditPatients = hasPermission('patients', 'update');
  const patientPermissionLevel = getPermissionLevel('patients');
  
  return (
    <div>
      {canEditPatients && <EditButton />}
    </div>
  );
}
```

#### `PermissionGuard` Komponente
```javascript
import { PermissionGuard } from '../hooks/usePermissions';

function PatientList() {
  return (
    <PermissionGuard module="patients" permission="read">
      <PatientTable />
    </PermissionGuard>
  );
}
```

#### Spezielle Hooks pro Modul
```javascript
import { usePatientPermissions, useAppointmentPermissions } from '../hooks/usePermissions';

function PatientComponent() {
  const { canView, canCreate, canEdit, canDelete } = usePatientPermissions();
  
  return (
    <div>
      {canView && <PatientList />}
      {canCreate && <AddPatientButton />}
      {canEdit && <EditButtons />}
      {canDelete && <DeleteButtons />}
    </div>
  );
}
```

## 🔧 API-Endpunkte

### **Benutzer-Berechtigungen**
- `GET /users/{id}/permissions/` - Alle Berechtigungen eines Benutzers
- `POST /users/{id}/grant_permission/` - Einzelne Berechtigung erteilen
- `POST /users/{id}/revoke_permission/` - Berechtigung entziehen
- `POST /users/{id}/bulk_update_permissions/` - Mehrere Berechtigungen aktualisieren

### **Beispiel-Requests**

#### Berechtigung erteilen
```json
POST /users/1/grant_permission/
{
  "module": "patients",
  "permission": "update",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

#### Mehrere Berechtigungen aktualisieren
```json
POST /users/1/bulk_update_permissions/
{
  "permissions": {
    "patients": {
      "permission": "full"
    },
    "appointments": {
      "permission": "read"
    },
    "finance": {
      "permission": "none"
    }
  }
}
```

## 🎨 Benutzeroberfläche

### **Benutzerverwaltung**
- **Benutzer-Tab**: Liste aller Benutzer mit Rollen und Berechtigungen
- **Rollen-Tab**: Übersicht über verfügbare Rollen
- **Berechtigungen-Tab**: Dokumentation der Berechtigungslevel

### **Berechtigungs-Dialog**
- Visuelle Auswahl der Berechtigungslevel pro Modul
- Farbkodierte Icons für verschiedene Berechtigungen
- Bulk-Update-Funktionalität

### **Navigation**
- Dynamische Menüpunkte basierend auf Berechtigungen
- Versteckte Menüpunkte für nicht zugängliche Module
- Breadcrumb-Navigation

## 🔒 Sicherheitsaspekte

### **Berechtigungshierarchie**
```javascript
const permissionHierarchy = {
  'none': 0,
  'read': 1,
  'create': 2,
  'update': 3,
  'delete': 4,
  'full': 5
};
```

### **Audit-Logging**
- Alle Benutzeraktivitäten werden protokolliert
- IP-Adressen und User-Agent werden gespeichert
- Zeitstempel für alle Aktionen

### **Ablaufende Berechtigungen**
- Temporäre Berechtigungen mit Ablaufdatum
- Automatische Deaktivierung abgelaufener Berechtigungen
- Benachrichtigungen vor Ablauf

## 📊 Verwendungsszenarien

### **Szenario 1: Empfangsmitarbeiter**
```json
{
  "appointments": "full",
  "patients": "read",
  "prescriptions": "read",
  "treatments": "none",
  "reports": "none",
  "finance": "none",
  "billing": "none",
  "settings": "none",
  "users": "none"
}
```

### **Szenario 2: Buchhalter**
```json
{
  "appointments": "read",
  "patients": "read",
  "prescriptions": "read",
  "treatments": "read",
  "reports": "read",
  "finance": "full",
  "billing": "full",
  "settings": "none",
  "users": "none"
}
```

### **Szenario 3: Arzt**
```json
{
  "appointments": "full",
  "patients": "full",
  "prescriptions": "full",
  "treatments": "read",
  "reports": "read",
  "finance": "none",
  "billing": "none",
  "settings": "none",
  "users": "none"
}
```

### **Szenario 4: Administrator**
```json
{
  "appointments": "full",
  "patients": "full",
  "prescriptions": "full",
  "treatments": "full",
  "reports": "full",
  "finance": "full",
  "billing": "full",
  "settings": "full",
  "users": "full"
}
```

## 🚀 Migration von altem System

### **Automatische Migration**
- Bestehende `can_access_*` Felder werden als Fallback verwendet
- Neue `ModulePermission` Einträge werden automatisch erstellt
- Rollen-basierte Berechtigungen werden beibehalten

### **Migration-Script**
```python
def migrate_permissions():
    for user in User.objects.all():
        # Patienten
        if user.can_access_patients:
            user.grant_module_permission('patients', 'full')
        
        # Termine
        if user.can_access_appointments:
            user.grant_module_permission('appointments', 'full')
        
        # Finanzen
        if user.can_access_finance:
            user.grant_module_permission('finance', 'read')
        
        # Weitere Module...
```

## 🔧 Konfiguration

### **Standard-Rollen**
```python
DEFAULT_ROLES = {
    'owner': {
        'description': 'Praxisinhaber mit vollen Rechten',
        'permissions': {
            'appointments': 'full',
            'patients': 'full',
            'prescriptions': 'full',
            'treatments': 'full',
            'reports': 'full',
            'finance': 'full',
            'billing': 'full',
            'settings': 'full',
            'users': 'full'
        }
    },
    'receptionist': {
        'description': 'Empfangsmitarbeiter',
        'permissions': {
            'appointments': 'full',
            'patients': 'read',
            'prescriptions': 'read',
            'treatments': 'none',
            'reports': 'none',
            'finance': 'none',
            'billing': 'none',
            'settings': 'none',
            'users': 'none'
        }
    }
}
```

## 📈 Monitoring und Analytics

### **Berechtigungs-Statistiken**
- Anzahl aktiver Berechtigungen pro Modul
- Häufigste Berechtigungslevel
- Abgelaufene Berechtigungen
- Benutzer ohne Berechtigungen

### **Audit-Reports**
- Benutzeraktivitäten pro Zeitraum
- Häufigste Aktionen
- Zugriffe auf sensible Module
- Fehlgeschlagene Zugriffe

## 🔮 Zukünftige Erweiterungen

### **Geplante Features**
- **Gruppen-Berechtigungen**: Berechtigungen für Benutzergruppen
- **Zeitbasierte Berechtigungen**: Automatische Aktivierung/Deaktivierung
- **Geografische Beschränkungen**: Zugriff nur von bestimmten IP-Bereichen
- **Zwei-Faktor-Authentifizierung**: Für sensible Module
- **Berechtigungs-Templates**: Vordefinierte Berechtigungssets

### **Integration**
- **LDAP/Active Directory**: Integration mit Unternehmens-Verzeichnis
- **SSO**: Single Sign-On Integration
- **API-Tokens**: Für externe Systeme
- **Webhook-Benachrichtigungen**: Bei Berechtigungsänderungen

---

## 📞 Support

Bei Fragen oder Problemen mit dem Berechtigungssystem:

1. **Dokumentation**: Siehe diese Datei
2. **Admin-Interface**: `/admin/core/modulepermission/`
3. **API-Dokumentation**: `/api/docs/`
4. **Logs**: `django.log` für Backend-Fehler

**Wichtig**: Das Berechtigungssystem ist sicherheitskritisch. Änderungen sollten nur von autorisierten Administratoren vorgenommen werden. 