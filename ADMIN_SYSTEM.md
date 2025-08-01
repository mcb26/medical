# 👑 Admin-System - Dokumentation

## 📋 Übersicht

Das **Admin-System** erweitert das Berechtigungssystem um **Administrator-Funktionen** mit vollständigen CRUD-Rechten und einer **Admin-only Komponente** für die globale Benutzerverwaltung.

## 🎯 Kernfunktionen

### **Admin-Override**
- **`is_admin` Boolean-Feld** im User-Model
- **Automatische Vollberechtigung** für alle Module
- **Übergeht alle anderen Berechtigungen**
- **Nur Superuser können Admin-Rechte vergeben**

### **Admin-Panel Komponente**
- **Nur für Admins sichtbar**
- **Globale Benutzerverwaltung**
- **Bulk-Operationen**
- **System-Statistiken**
- **Berechtigungsverwaltung**

## 🏗️ Technische Implementierung

### **Backend-Erweiterungen**

#### **User-Model erweitert**
```python
class User(AbstractUser):
    # Admin-Status
    is_admin = models.BooleanField(
        default=False, 
        verbose_name="Administrator",
        help_text="Administratoren haben automatisch alle Berechtigungen"
    )
    
    def has_module_permission(self, module_name, required_permission='read'):
        # Admin-Override: Admins haben alle Rechte
        if self.is_superuser or self.is_admin:
            return True
        # ... restliche Logik
```

#### **Admin-spezifische API-Endpunkte**
```python
@action(detail=False, methods=['get'])
def admin_overview(self, request):
    """Admin-Übersicht über alle Benutzer und Berechtigungen"""
    if not request.user.is_admin and not request.user.is_superuser:
        return Response({'error': 'Admin-Berechtigung erforderlich'}, status=403)
    
    # Statistiken sammeln
    stats = {
        'total_users': users.count(),
        'active_users': users.filter(is_active=True).count(),
        'admin_users': users.filter(is_admin=True).count(),
        # ...
    }
    return Response({'stats': stats, 'module_stats': module_stats})

@action(detail=False, methods=['post'])
def bulk_admin_operations(self, request):
    """Bulk-Operationen für Admins"""
    operation = request.data.get('operation')
    user_ids = request.data.get('user_ids', [])
    
    if operation == 'toggle_admin':
        # Admin-Status umschalten
    elif operation == 'update_permissions':
        # Berechtigungen massenhaft aktualisieren
    # ...
```

### **Frontend-Implementierung**

#### **Admin-Panel Komponente**
```javascript
function AdminPanel() {
  const { user: currentUser, hasPermission } = usePermissions();
  
  // Prüfe Admin-Berechtigung
  if (!currentUser?.is_admin && !hasPermission('users', 'full')) {
    return <AccessDenied />;
  }
  
  return (
    <Box>
      <Tabs>
        <Tab label="Benutzerverwaltung" />
        <Tab label="Bulk-Bearbeitung" />
        <Tab label="Statistiken" />
        <Tab label="System-Status" />
      </Tabs>
      
      {/* Admin-Funktionen */}
    </Box>
  );
}
```

#### **Admin-spezifische Hook**
```javascript
export const useAdminPermissions = () => {
  const { user, hasPermission } = usePermissions();
  
  return {
    isAdmin: user?.is_admin || user?.is_superuser,
    isSuperUser: user?.is_superuser,
    canAccessAdminPanel: user?.is_admin || user?.is_superuser || hasPermission('users', 'full'),
    canManageAllUsers: user?.is_admin || user?.is_superuser,
    canViewSystemStatus: user?.is_admin || user?.is_superuser,
    canPerformBulkOperations: user?.is_admin || user?.is_superuser,
    canGrantAdminRights: user?.is_superuser, // Nur Superuser können Admin-Rechte vergeben
  };
};
```

## 🔧 Admin-Funktionen

### **1. Benutzerverwaltung**
- **Alle Benutzer anzeigen** mit Rollen und Berechtigungen
- **Admin-Status umschalten** (⭐/⭐-Border Icon)
- **Benutzer aktivieren/deaktivieren** (👁️/👁️-Off Icon)
- **Berechtigungen bearbeiten** (🔒 Icon)
- **Benutzer bearbeiten** (✏️ Icon)

### **2. Bulk-Bearbeitung**
- **Mehrere Benutzer auswählen** (Checkbox)
- **Massenhaft Berechtigungen ändern**
- **Admin-Status für mehrere Benutzer**
- **Rollen zuweisen**
- **Status ändern**

### **3. Statistiken**
- **Benutzer-Statistiken**: Gesamt, Aktiv, Admins, Rollen
- **Berechtigungs-Statistiken**: Pro Modul, Zugriffsquoten
- **Visualisierung** mit Icons und Prozentangaben

### **4. System-Status**
- **Datenbank-Status**: Benutzer, Berechtigungen, Logs
- **Cache-Status**: Verfügbarkeit und Gesundheit
- **Berechtigungssystem**: Version, Module, Level
- **Aktive/abgelaufene Berechtigungen**

## 🔒 Sicherheitsaspekte

### **Admin-Override-Hierarchie**
```javascript
// Reihenfolge der Berechtigungsprüfung:
1. is_superuser (Django Superuser)
2. is_admin (Custom Admin-Flag)
3. ModulePermission (Granulare Berechtigungen)
4. Legacy can_access_* Felder
5. Role-based Permissions
```

### **Admin-Rechte vergeben**
- **Nur Superuser** können `is_admin = True` setzen
- **Admins können andere Admins nicht erstellen**
- **Audit-Logging** für alle Admin-Aktionen
- **IP-Adressen und User-Agent** werden protokolliert

### **Bulk-Operationen Sicherheit**
- **Admin-Berechtigung erforderlich** für alle Bulk-Operationen
- **Validierung** der Benutzer-IDs
- **Transaktionale Ausführung** für Konsistenz
- **Fehlerbehandlung** mit Rollback

## 🎨 Benutzeroberfläche

### **Admin-Panel Features**
- **Responsive Design** für Desktop und Mobile
- **Speed Dial** für schnelle Aktionen
- **Filter und Suche** für Benutzer
- **Sortierung** nach verschiedenen Kriterien
- **Bulk-Auswahl** mit Checkboxen
- **Tooltips** für alle Aktionen

### **Visuelle Indikatoren**
- **⭐ Goldener Stern** für Admins
- **🔒 Icons** für verschiedene Berechtigungslevel
- **Farbkodierte Chips** für Status
- **Progress-Bars** für Statistiken
- **Alert-Boxen** für wichtige Informationen

### **Navigation**
- **Admin-Panel** nur für Admins sichtbar
- **Breadcrumbs** für Navigation
- **Tabs** für verschiedene Bereiche
- **Speed Dial** für schnelle Aktionen

## 📊 Verwendungsszenarien

### **Szenario 1: Praxisinhaber (Superuser)**
```json
{
  "is_superuser": true,
  "is_admin": true,
  "can_grant_admin_rights": true,
  "can_access_all_modules": true
}
```

### **Szenario 2: IT-Administrator**
```json
{
  "is_superuser": false,
  "is_admin": true,
  "can_grant_admin_rights": false,
  "can_access_all_modules": true
}
```

### **Szenario 3: Abteilungsleiter**
```json
{
  "is_superuser": false,
  "is_admin": false,
  "users_permission": "full",
  "can_manage_team": true
}
```

## 🔧 API-Endpunkte

### **Admin-spezifische Endpunkte**
- `GET /users/admin_overview/` - Admin-Übersicht
- `POST /users/bulk_admin_operations/` - Bulk-Operationen
- `GET /users/system_status/` - System-Status

### **Beispiel-Requests**

#### Admin-Übersicht abrufen
```bash
GET /api/users/admin_overview/
Authorization: Bearer <admin_token>
```

#### Bulk-Admin-Operation
```json
POST /api/users/bulk_admin_operations/
{
  "operation": "toggle_admin",
  "user_ids": [1, 2, 3, 4, 5]
}
```

#### Berechtigungen massenhaft aktualisieren
```json
POST /api/users/bulk_admin_operations/
{
  "operation": "update_permissions",
  "user_ids": [1, 2, 3],
  "data": {
    "permissions": {
      "patients": {"permission": "full"},
      "appointments": {"permission": "read"},
      "finance": {"permission": "none"}
    }
  }
}
```

## 🚀 Migration und Setup

### **Erste Admin-Erstellung**
```python
# Django Management Command
python manage.py createsuperuser

# Oder über Django Shell
from core.models import User
admin_user = User.objects.create_user(
    username='admin',
    email='admin@praxis.de',
    password='secure_password',
    is_admin=True,
    is_superuser=True
)
```

### **Admin-Rechte vergeben**
```python
# Nur Superuser können Admin-Rechte vergeben
from core.models import User

# Superuser finden
superuser = User.objects.filter(is_superuser=True).first()

# Admin-Rechte vergeben
user = User.objects.get(username='new_admin')
user.is_admin = True
user.save()
```

### **Admin-Panel aktivieren**
```javascript
// In App.js oder Router
import AdminPanel from './components/AdminPanel';
import { useAdminPermissions } from './hooks/usePermissions';

function App() {
  const { canAccessAdminPanel } = useAdminPermissions();
  
  return (
    <Router>
      <Routes>
        {/* Normale Routen */}
        {canAccessAdminPanel && (
          <Route path="/admin-panel" element={<AdminPanel />} />
        )}
      </Routes>
    </Router>
  );
}
```

## 📈 Monitoring und Analytics

### **Admin-Aktivitäten**
- **Admin-Logins** werden protokolliert
- **Bulk-Operationen** werden geloggt
- **Berechtigungsänderungen** werden verfolgt
- **System-Zugriffe** werden dokumentiert

### **Admin-Statistiken**
- **Anzahl aktiver Admins**
- **Admin-Aktivitäten pro Tag/Woche/Monat**
- **Bulk-Operationen Statistiken**
- **Berechtigungsänderungen Übersicht**

## 🔮 Zukünftige Erweiterungen

### **Geplante Features**
- **Admin-Dashboard** mit Echtzeit-Statistiken
- **Admin-Berechtigungsprofile** (verschiedene Admin-Level)
- **Geografische Admin-Beschränkungen**
- **Admin-Aktivitäts-Benachrichtigungen**
- **Admin-Performance-Monitoring**

### **Integration**
- **LDAP/Active Directory** Admin-Synchronisation
- **SSO** für Admin-Zugriff
- **API-Tokens** für Admin-Operationen
- **Webhook-Benachrichtigungen** bei Admin-Aktionen

---

## 📞 Support

Bei Fragen oder Problemen mit dem Admin-System:

1. **Dokumentation**: Siehe diese Datei
2. **Admin-Interface**: `/admin/core/user/`
3. **Admin-Panel**: `/admin-panel` (nur für Admins)
4. **API-Dokumentation**: `/api/docs/`
5. **Logs**: `django.log` für Admin-Aktivitäten

**Wichtig**: Das Admin-System ist sicherheitskritisch. Admin-Rechte sollten nur an vertrauenswürdige Personen vergeben werden. 