import api from '../api/axios';

// Benachrichtigungstypen
export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  PRESCRIPTION: 'prescription',
  PATIENT: 'patient',
  FINANCE: 'finance',
  SYSTEM: 'system',
  URGENT: 'urgent',
  TREATMENT: 'treatment',
  BILLING: 'billing'
};

// Benachrichtigungsstatus
export const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived'
};

// Fallback-Benachrichtigungen (leer)
const fallbackNotifications = [];

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.unreadCount = 0;
    this.isInitialized = false;
    this.checkInterval = null;
  }

  // Event Listener System
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications, this.unreadCount));
  }

  // Initialisierung mit echten Daten
  async initialize() {
    if (this.isInitialized) {
      console.log('NotificationService bereits initialisiert, überspringe...');
      return;
    }
    
    console.log('Initialisiere NotificationService...');
    
    try {
      // Lade gespeicherte Benachrichtigungen
      this.loadFromStorage();
      
      // Starte automatische Überprüfungen
      this.startAutoChecks();
      
      // Erstelle initiale Benachrichtigungen basierend auf echten Daten
      await this.createInitialNotifications();
      
      this.isInitialized = true;
      console.log('NotificationService erfolgreich initialisiert');
    } catch (error) {
      console.error('Error initializing notification service:', error);
      // Fallback zu leeren Daten
      this.notifications = [...fallbackNotifications];
      this.unreadCount = this.getUnreadCount();
      this.notifyListeners();
      this.isInitialized = true;
    }
  }

  // Automatische Überprüfungen starten
  startAutoChecks() {
    // Überprüfe alle 10 Minuten auf neue Benachrichtigungen (reduziert von 5 Minuten)
    this.checkInterval = setInterval(async () => {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Kein Token vorhanden, stoppe automatische Überprüfungen');
        this.stopAutoChecks();
        return;
      }
      
      await this.checkForNewNotifications();
    }, 10 * 60 * 1000);
  }

  // Stoppe automatische Überprüfungen
  stopAutoChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Überprüfe auf neue Benachrichtigungen
  async checkForNewNotifications() {
    try {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Kein Token vorhanden, überspringe Benachrichtigungsprüfung');
        return;
      }

      await this.checkUpcomingAppointments();
      await this.checkUrgentPrescriptions();
      await this.checkOverdueBilling();
      await this.checkSystemAlerts();
    } catch (error) {
      console.error('Error checking for new notifications:', error);
    }
  }

  // Erstelle initiale Benachrichtigungen basierend auf echten Daten
  async createInitialNotifications() {
    try {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Kein Token vorhanden, überspringe initiale Benachrichtigungen');
        return;
      }

      await this.checkUpcomingAppointments();
      await this.checkUrgentPrescriptions();
      await this.checkOverdueBilling();
      await this.checkSystemAlerts();
    } catch (error) {
      console.error('Error creating initial notifications:', error);
    }
  }

  // Überprüfe anstehende Termine
  async checkUpcomingAppointments() {
    try {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const response = await api.get('/appointments/', {
        params: {
          date_from: today.toISOString().split('T')[0],
          date_to: tomorrow.toISOString().split('T')[0]
        }
      });

      const appointments = response.data;
      
      appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        const timeUntilAppointment = appointmentDate - today;
        const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);
        
        // Benachrichtigung für Termine in den nächsten 24 Stunden
        if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 0) {
          // Prüfe ob bereits eine Benachrichtigung für diesen Termin existiert
          const existingNotification = this.notifications.find(n => 
            n.type === NOTIFICATION_TYPES.APPOINTMENT && 
            n.actionUrl === `/appointments/${appointment.id}` &&
            n.title === 'Termin-Erinnerung'
          );
          
          if (!existingNotification) {
            this.createAppointmentReminder(appointment);
          }
        }
      });
    } catch (error) {
      console.error('Error checking upcoming appointments:', error);
    }
  }

  // Überprüfe dringende Verordnungen
  async checkUrgentPrescriptions() {
    try {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await api.get('/prescriptions/', {
        params: {
          status: 'active',
          is_urgent: true
        }
      });

      const urgentPrescriptions = response.data;
      
      urgentPrescriptions.forEach(prescription => {
        // Prüfe ob bereits eine Benachrichtigung existiert
        const existingNotification = this.notifications.find(n => 
          n.type === NOTIFICATION_TYPES.PRESCRIPTION && 
          n.actionUrl === `/prescriptions/${prescription.id}`
        );
        
        if (!existingNotification) {
          this.createPrescriptionNotification(prescription);
        }
      });
    } catch (error) {
      console.error('Error checking urgent prescriptions:', error);
    }
  }

  // Überprüfe überfällige Abrechnungen
  async checkOverdueBilling() {
    try {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await api.get('/billing-cycles/', {
        params: {
          status: 'pending'
        }
      });

      const pendingBillingCycles = response.data;
      
      pendingBillingCycles.forEach(billingCycle => {
        const createdDate = new Date(billingCycle.created_at);
        const daysSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
        
        // Benachrichtigung für Abrechnungen älter als 7 Tage
        if (daysSinceCreation > 7) {
          // Prüfe ob bereits eine Benachrichtigung für diese Abrechnung existiert
          const existingNotification = this.notifications.find(n => 
            n.type === NOTIFICATION_TYPES.BILLING && 
            n.actionUrl === `/billing-cycles/${billingCycle.id}`
          );
          
          if (!existingNotification) {
            this.createBillingNotification(billingCycle);
          }
        }
      });
    } catch (error) {
      console.error('Error checking overdue billing:', error);
    }
  }

  // Überprüfe System-Alerts
  async checkSystemAlerts() {
    try {
      // Prüfe zuerst, ob der Benutzer eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // Hier könnten System-spezifische Überprüfungen hinzugefügt werden
      // z.B. Speicherplatz, Backup-Status, etc.
      
      // Beispiel: Überprüfe auf neue Patienten ohne Termine
      const response = await api.get('/patients/', {
        params: {
          has_appointments: false,
          created_at__gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      const newPatientsWithoutAppointments = response.data;
      
      if (newPatientsWithoutAppointments.length > 0) {
        // Prüfe ob bereits eine Benachrichtigung für neue Patienten ohne Termine existiert
        const existingNotification = this.notifications.find(n => 
          n.type === NOTIFICATION_TYPES.SYSTEM && 
          n.title === 'Neue Patienten ohne Termine'
        );
        
        if (!existingNotification) {
          this.createSystemNotification(
            'Neue Patienten ohne Termine',
            `${newPatientsWithoutAppointments.length} neue Patienten haben noch keine Termine.`,
            'medium'
          );
        }
      }
    } catch (error) {
      console.error('Error checking system alerts:', error);
    }
  }

  // Benachrichtigungen abrufen
  getNotifications(status = null) {
    if (status) {
      return this.notifications.filter(notification => notification.status === status);
    }
    return this.notifications;
  }

  // Ungelesene Benachrichtigungen abrufen
  getUnreadNotifications() {
    return this.notifications.filter(notification => notification.status === NOTIFICATION_STATUS.UNREAD);
  }

  // Anzahl ungelesener Benachrichtigungen
  getUnreadCount() {
    return this.getUnreadNotifications().length;
  }

  // Benachrichtigung als gelesen markieren
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.status === NOTIFICATION_STATUS.UNREAD) {
      notification.status = NOTIFICATION_STATUS.READ;
      this.unreadCount = this.getUnreadCount();
      this.notifyListeners();
      this.saveToStorage();
    }
  }

  // Alle Benachrichtigungen als gelesen markieren
  markAllAsRead() {
    this.notifications.forEach(notification => {
      if (notification.status === NOTIFICATION_STATUS.UNREAD) {
        notification.status = NOTIFICATION_STATUS.READ;
      }
    });
    this.unreadCount = this.getUnreadCount();
    this.notifyListeners();
    this.saveToStorage();
  }

  // Benachrichtigung löschen
  deleteNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.unreadCount = this.getUnreadCount();
    this.notifyListeners();
    this.saveToStorage();
  }

  // Neue Benachrichtigung hinzufügen
  addNotification(notification) {
    // Prüfe auf Duplikate basierend auf Typ, Titel und ActionUrl
    const isDuplicate = this.notifications.some(existing => 
      existing.type === notification.type &&
      existing.title === notification.title &&
      existing.actionUrl === notification.actionUrl &&
      existing.status === NOTIFICATION_STATUS.UNREAD
    );
    
    if (isDuplicate) {
      console.log('Benachrichtigung bereits vorhanden, überspringe:', notification.title);
      return null;
    }
    
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: NOTIFICATION_STATUS.UNREAD,
      ...notification
    };
    
    this.notifications.unshift(newNotification);
    this.unreadCount = this.getUnreadCount();
    this.notifyListeners();
    this.saveToStorage();
    
    return newNotification;
  }

  // Benachrichtigung erstellen (Helper-Methoden mit echten Daten)
  createAppointmentNotification(appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    const patientName = appointment.patient?.first_name && appointment.patient?.last_name 
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Unbekannter Patient';
    
    return this.addNotification({
      type: NOTIFICATION_TYPES.APPOINTMENT,
      title: 'Neuer Termin',
      message: `Termin für ${patientName} um ${appointmentDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`,
      priority: 'medium',
      actionUrl: `/appointments/${appointment.id}`
    });
  }

  createAppointmentReminder(appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    const patientName = appointment.patient?.first_name && appointment.patient?.last_name 
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Unbekannter Patient';
    
    const timeUntilAppointment = appointmentDate - new Date();
    const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);
    
    let priority = 'medium';
    if (hoursUntilAppointment <= 2) priority = 'high';
    else if (hoursUntilAppointment <= 6) priority = 'medium';
    else priority = 'low';
    
    return this.addNotification({
      type: NOTIFICATION_TYPES.APPOINTMENT,
      title: 'Termin-Erinnerung',
      message: `Termin für ${patientName} in ${Math.round(hoursUntilAppointment)} Stunden`,
      priority,
      actionUrl: `/appointments/${appointment.id}`
    });
  }

  createPrescriptionNotification(prescription) {
    const patientName = prescription.patient?.first_name && prescription.patient?.last_name 
      ? `${prescription.patient.first_name} ${prescription.patient.last_name}`
      : 'Unbekannter Patient';
    
    const priority = prescription.is_urgent ? 'high' : 'medium';
    const title = prescription.is_urgent ? 'Dringende Verordnung' : 'Neue Verordnung';
    const message = prescription.is_urgent 
      ? `Verordnung für ${patientName} benötigt sofortige Aufmerksamkeit`
      : `Verordnung für ${patientName} wurde erstellt`;
    
    return this.addNotification({
      type: NOTIFICATION_TYPES.PRESCRIPTION,
      title,
      message,
      priority,
      actionUrl: `/prescriptions/${prescription.id}`
    });
  }

  createPatientNotification(patient) {
    const patientName = patient.first_name && patient.last_name 
      ? `${patient.first_name} ${patient.last_name}`
      : 'Unbekannter Patient';
    
    return this.addNotification({
      type: NOTIFICATION_TYPES.PATIENT,
      title: 'Neuer Patient',
      message: `Patient ${patientName} wurde erfolgreich angelegt`,
      priority: 'medium',
      actionUrl: `/patients/${patient.id}`
    });
  }

  createTreatmentNotification(treatment) {
    const patientName = treatment.patient?.first_name && treatment.patient?.last_name 
      ? `${treatment.patient.first_name} ${treatment.patient.last_name}`
      : 'Unbekannter Patient';
    
    return this.addNotification({
      type: NOTIFICATION_TYPES.TREATMENT,
      title: 'Neues Heilmittel',
      message: `Heilmittel für ${patientName} wurde erstellt`,
      priority: 'medium',
      actionUrl: `/treatments/${treatment.id}`
    });
  }

  createBillingNotification(billingCycle) {
    const createdDate = new Date(billingCycle.created_at);
    const daysSinceCreation = Math.round((new Date() - createdDate) / (1000 * 60 * 60 * 24));
    
    return this.addNotification({
      type: NOTIFICATION_TYPES.BILLING,
      title: 'Abrechnung überfällig',
      message: `Abrechnungszyklus vom ${createdDate.toLocaleDateString('de-DE')} ist seit ${daysSinceCreation} Tagen überfällig`,
      priority: 'high',
      actionUrl: `/billing-cycles/${billingCycle.id}`
    });
  }

  createFinanceNotification(message, priority = 'low') {
    return this.addNotification({
      type: NOTIFICATION_TYPES.FINANCE,
      title: 'Finanz-Update',
      message,
      priority,
      actionUrl: '/finance'
    });
  }

  createSystemNotification(title, message, priority = 'low') {
    return this.addNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title,
      message,
      priority,
      actionUrl: '/settings'
    });
  }

  // Storage-Funktionen
  saveToStorage() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.unreadCount = this.getUnreadCount();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  // Benachrichtigungen zurücksetzen
  resetNotifications() {
    this.notifications = [...fallbackNotifications];
    this.unreadCount = this.getUnreadCount();
    this.notifyListeners();
    this.saveToStorage();
  }

  // Benachrichtigungen löschen (älter als X Tage)
  cleanupOldNotifications(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    this.notifications = this.notifications.filter(notification => {
      const notificationDate = new Date(notification.timestamp);
      return notificationDate > cutoffDate || notification.status === NOTIFICATION_STATUS.UNREAD;
    });
    
    this.unreadCount = this.getUnreadCount();
    this.notifyListeners();
    this.saveToStorage();
  }

  // Cleanup beim Logout
  cleanup() {
    this.stopAutoChecks();
    this.isInitialized = false;
  }
}

// Singleton-Instanz
const notificationService = new NotificationService();

// Automatische Initialisierung beim Import - nur einmal
// Wird jetzt manuell nach dem Login aufgerufen

export default notificationService; 