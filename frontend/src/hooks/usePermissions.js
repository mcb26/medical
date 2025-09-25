import { useState, useEffect, useContext, createContext } from 'react';
import api from '../api/axios';

// Berechtigungskontext
const PermissionContext = createContext();

// Berechtigungs-Provider
export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Lade Benutzerberechtigungen
  const loadPermissions = async (force = false) => {
    try {
      // Prüfe ob ein Token vorhanden ist
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping permissions load');
        setPermissions({});
        setUser(null);
        setLoading(false);
        return;
      }

      // Prüfe ob ein Update nötig ist (alle 5 Minuten oder bei force)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!force && lastUpdate && (now - lastUpdate) < fiveMinutes) {
        console.log('Permissions recently updated, skipping refresh');
        return;
      }

      setLoading(true);
      
      const response = await api.get('/users/me/');
      const userData = response.data;
      setUser(userData);
      setPermissions(userData.effective_permissions || {});
      setLastUpdate(now);
      
      console.log('Permissions updated:', userData.effective_permissions);
    } catch (error) {
      console.error('Fehler beim Laden der Berechtigungen:', error);
      setPermissions({});
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Prüfe Berechtigung für ein Modul
  const hasPermission = (module, requiredPermission = 'read') => {
    // Admin-Override: Admins haben alle Rechte
    if (user?.is_admin || user?.is_superuser) {
      return true;
    }
    
    if (!permissions || !permissions[module]) {
      return false;
    }

    const modulePerms = permissions[module];
    
    // Hierarchie der Berechtigungen
    const permissionHierarchy = {
      'none': 0,
      'read': 1,
      'create': 2,
      'update': 3,
      'delete': 4,
      'full': 5
    };

    const currentLevel = permissionHierarchy[modulePerms.permission] || 0;
    const requiredLevel = permissionHierarchy[requiredPermission] || 0;

    return currentLevel >= requiredLevel;
  };

  // Prüfe mehrere Berechtigungen
  const hasAnyPermission = (permissions) => {
    return permissions.some(([module, permission]) => hasPermission(module, permission));
  };

  // Prüfe alle Berechtigungen
  const hasAllPermissions = (permissions) => {
    return permissions.every(([module, permission]) => hasPermission(module, permission));
  };

  // Hole Berechtigungslevel für ein Modul
  const getPermissionLevel = (module) => {
    // Admin-Override: Admins haben alle Rechte
    if (user?.is_admin || user?.is_superuser) {
      return 'full';
    }
    
    if (!permissions || !permissions[module]) {
      return 'none';
    }
    return permissions[module].permission || 'none';
  };

  // Hole alle verfügbaren Module
  const getAvailableModules = () => {
    return Object.keys(permissions).filter(module => 
      hasPermission(module, 'read')
    );
  };

  // Hole alle Module mit vollen Berechtigungen
  const getFullAccessModules = () => {
    return Object.keys(permissions).filter(module => 
      hasPermission(module, 'full')
    );
  };

  // Event-Handler für Storage-Änderungen
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        // Token geändert - Berechtigungen neu laden
        loadPermissions(true);
      } else if (e.key === 'userProfile') {
        // Benutzerprofil geändert - Berechtigungen neu laden
        loadPermissions(true);
      }
    };

    // Event-Listener für Storage-Änderungen
    window.addEventListener('storage', handleStorageChange);
    
    // Event-Listener für Custom Events
    const handlePermissionUpdate = () => {
      loadPermissions(true);
    };
    
    window.addEventListener('permissions-updated', handlePermissionUpdate);
    
    // Event-Listener für Focus (wenn Tab wieder aktiv wird)
    const handleFocus = () => {
      // Prüfe ob Berechtigungen aktualisiert werden müssen
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (!lastUpdate || (now - lastUpdate) > tenMinutes) {
        loadPermissions();
      }
    };
    
    window.addEventListener('focus', handleFocus);

    // Initial laden
    loadPermissions();

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('permissions-updated', handlePermissionUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Regelmäßige Updates (alle 10 Minuten)
  useEffect(() => {
    const interval = setInterval(() => {
      loadPermissions();
    }, 10 * 60 * 1000); // 10 Minuten

    return () => clearInterval(interval);
  }, []);

  const value = {
    permissions,
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionLevel,
    getAvailableModules,
    getFullAccessModules,
    reloadPermissions: () => loadPermissions(true)
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

// Hook für Berechtigungen
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Spezielle Hooks für bestimmte Module
export const usePatientPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('patients', 'read'),
    canCreate: hasPermission('patients', 'create'),
    canEdit: hasPermission('patients', 'update'),
    canDelete: hasPermission('patients', 'delete'),
    canFullAccess: hasPermission('patients', 'full'),
    permissionLevel: getPermissionLevel('patients')
  };
};

export const useAppointmentPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('appointments', 'read'),
    canCreate: hasPermission('appointments', 'create'),
    canEdit: hasPermission('appointments', 'update'),
    canDelete: hasPermission('appointments', 'delete'),
    canFullAccess: hasPermission('appointments', 'full'),
    permissionLevel: getPermissionLevel('appointments')
  };
};

export const usePrescriptionPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('prescriptions', 'read'),
    canCreate: hasPermission('prescriptions', 'create'),
    canEdit: hasPermission('prescriptions', 'update'),
    canDelete: hasPermission('prescriptions', 'delete'),
    canFullAccess: hasPermission('prescriptions', 'full'),
    permissionLevel: getPermissionLevel('prescriptions')
  };
};

export const useTreatmentPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('treatments', 'read'),
    canCreate: hasPermission('treatments', 'create'),
    canEdit: hasPermission('treatments', 'update'),
    canDelete: hasPermission('treatments', 'delete'),
    canFullAccess: hasPermission('treatments', 'full'),
    permissionLevel: getPermissionLevel('treatments')
  };
};

export const useFinancePermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('finance', 'read'),
    canCreate: hasPermission('finance', 'create'),
    canEdit: hasPermission('finance', 'update'),
    canDelete: hasPermission('finance', 'delete'),
    canFullAccess: hasPermission('finance', 'full'),
    permissionLevel: getPermissionLevel('finance')
  };
};

export const useBillingPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('billing', 'read'),
    canCreate: hasPermission('billing', 'create'),
    canEdit: hasPermission('billing', 'update'),
    canDelete: hasPermission('billing', 'delete'),
    canFullAccess: hasPermission('billing', 'full'),
    permissionLevel: getPermissionLevel('billing')
  };
};

export const useReportPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('reports', 'read'),
    canCreate: hasPermission('reports', 'create'),
    canEdit: hasPermission('reports', 'update'),
    canDelete: hasPermission('reports', 'delete'),
    canFullAccess: hasPermission('reports', 'full'),
    permissionLevel: getPermissionLevel('reports')
  };
};

export const useSettingsPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('settings', 'read'),
    canCreate: hasPermission('settings', 'create'),
    canEdit: hasPermission('settings', 'update'),
    canDelete: hasPermission('settings', 'delete'),
    canFullAccess: hasPermission('settings', 'full'),
    permissionLevel: getPermissionLevel('settings')
  };
};

export const useUserManagementPermissions = () => {
  const { hasPermission, getPermissionLevel } = usePermissions();
  
  return {
    canView: hasPermission('users', 'read'),
    canCreate: hasPermission('users', 'create'),
    canEdit: hasPermission('users', 'update'),
    canDelete: hasPermission('users', 'delete'),
    canFullAccess: hasPermission('users', 'full'),
    permissionLevel: getPermissionLevel('users')
  };
};

// Admin-spezifische Hook
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

// Komponente für bedingte Rendering basierend auf Berechtigungen
export const PermissionGuard = ({ 
  module, 
  permission = 'read', 
  children, 
  fallback = null,
  showError = false 
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return null; // Oder Loading-Spinner
  }

  if (!hasPermission(module, permission)) {
    if (showError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#666',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <h3>Zugriff verweigert</h3>
          <p>Sie haben keine Berechtigung für diesen Bereich.</p>
        </div>
      );
    }
    return fallback;
  }

  return children;
};

// Hook für die Navigation basierend auf Berechtigungen
export const useNavigationPermissions = () => {
  const { permissions, hasPermission } = usePermissions();

  const getAvailableMenuItems = () => {
    const menuItems = [];

    // Dashboard ist immer verfügbar
    menuItems.push({
      text: 'Dashboard',
      path: '/',
      icon: 'Home',
      description: 'Übersicht'
    });

    // Termine
    if (hasPermission('appointments', 'read')) {
      menuItems.push({
        text: 'Termine',
        path: '/appointments',
        icon: 'Event',
        description: 'Terminverwaltung'
      });
    }

    // Kalender
    if (hasPermission('appointments', 'read')) {
      menuItems.push({
        text: 'Kalender',
        path: '/calendar',
        icon: 'CalendarToday',
        description: 'Kalenderansicht'
      });
    }

    // Patienten
    if (hasPermission('patients', 'read')) {
      menuItems.push({
        text: 'Patienten',
        path: '/patients',
        icon: 'People',
        description: 'Patientenverwaltung'
      });
    }

    // Verordnungen
    if (hasPermission('prescriptions', 'read')) {
      menuItems.push({
        text: 'Verordnungen',
        path: '/prescriptions',
        icon: 'Assignment',
        description: 'Verordnungsverwaltung'
      });
    }

    // Heilmittel
    if (hasPermission('treatments', 'read')) {
      menuItems.push({
        text: 'Heilmittel',
        path: '/treatments',
        icon: 'Spa',
        description: 'Heilmittelverwaltung'
      });
    }

    // Berichte
    if (hasPermission('reports', 'read')) {
      menuItems.push({
        text: 'Berichte',
        path: '/reports',
        icon: 'Assessment',
        description: 'Berichte und Analysen'
      });
    }

    // Finanzen
    if (hasPermission('finance', 'read')) {
      menuItems.push({
        text: 'Finanzen',
        path: '/finance',
        icon: 'Euro',
        description: 'Finanzverwaltung'
      });
    }

    // Abrechnung
    if (hasPermission('billing', 'read')) {
      menuItems.push({
        text: 'Abrechnung',
        path: '/billing',
        icon: 'Receipt',
        description: 'Abrechnungsverwaltung'
      });
    }

    // Einstellungen
    if (hasPermission('settings', 'read')) {
      menuItems.push({
        text: 'Einstellungen',
        path: '/settings',
        icon: 'Settings',
        description: 'Systemeinstellungen'
      });
    }

    // Benutzerverwaltung
    if (hasPermission('users', 'read')) {
      menuItems.push({
        text: 'Benutzerverwaltung',
        path: '/user-management',
        icon: 'AdminPanelSettings',
        description: 'Benutzer und Berechtigungen'
      });
    }

    return menuItems;
  };

  return {
    availableMenuItems: getAvailableMenuItems(),
    hasAnyModuleAccess: Object.keys(permissions).some(module => 
      hasPermission(module, 'read')
    )
  };
}; 