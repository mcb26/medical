import { useEffect } from 'react';
import notificationService, { NOTIFICATION_TYPES } from '../services/notificationService';

// Hook für automatische Benachrichtigungen bei neuen Terminen
export const useAppointmentNotifications = (appointments, isNew = false) => {
  useEffect(() => {
    if (isNew && appointments && appointments.length > 0) {
      // Erstelle Benachrichtigung für den neuesten Termin
      const latestAppointment = appointments[0];
      notificationService.createAppointmentNotification(latestAppointment);
    }
  }, [appointments, isNew]);

  const createNotification = (appointment) => {
    notificationService.createAppointmentNotification(appointment);
  };

  return { createNotification };
};

// Hook für automatische Benachrichtigungen bei neuen Verordnungen
export const usePrescriptionNotifications = (prescriptions, isNew = false) => {
  useEffect(() => {
    if (isNew && prescriptions && prescriptions.length > 0) {
      // Erstelle Benachrichtigung für die neueste Verordnung
      const latestPrescription = prescriptions[0];
      notificationService.createPrescriptionNotification(latestPrescription);
    }
  }, [prescriptions, isNew]);

  const createNotification = (prescription) => {
    notificationService.createPrescriptionNotification(prescription);
  };

  return { createNotification };
};

// Hook für automatische Benachrichtigungen bei neuen Patienten
export const usePatientNotifications = (patients, isNew = false) => {
  useEffect(() => {
    if (isNew && patients && patients.length > 0) {
      // Erstelle Benachrichtigung für den neuesten Patienten
      const latestPatient = patients[0];
      notificationService.createPatientNotification(latestPatient);
    }
  }, [patients, isNew]);

  const createNotification = (patient) => {
    notificationService.createPatientNotification(patient);
  };

  return { createNotification };
};

// Hook für automatische Benachrichtigungen bei neuen Heilmitteln
export const useTreatmentNotifications = (treatments, isNew = false) => {
  useEffect(() => {
    if (isNew && treatments && treatments.length > 0) {
      // Erstelle Benachrichtigung für das neueste Heilmittel
      const latestTreatment = treatments[0];
      notificationService.createTreatmentNotification(latestTreatment);
    }
  }, [treatments, isNew]);

  const createNotification = (treatment) => {
    notificationService.createTreatmentNotification(treatment);
  };

  return { createNotification };
};

// Hook für automatische Benachrichtigungen bei neuen Abrechnungen
export const useBillingNotifications = (billingCycles, isNew = false) => {
  useEffect(() => {
    if (isNew && billingCycles && billingCycles.length > 0) {
      // Erstelle Benachrichtigung für den neuesten Abrechnungszyklus
      const latestBillingCycle = billingCycles[0];
      notificationService.createBillingNotification(latestBillingCycle);
    }
  }, [billingCycles, isNew]);

  const createNotification = (billingCycle) => {
    notificationService.createBillingNotification(billingCycle);
  };

  return { createNotification };
};

// Hook für System-Benachrichtigungen
export const useSystemNotifications = () => {
  const createSystemNotification = (title, message, priority = 'low') => {
    notificationService.createSystemNotification(title, message, priority);
  };

  return { createSystemNotification };
};

// Hook für Finanz-Benachrichtigungen
export const useFinanceNotifications = () => {
  const createFinanceNotification = (message, priority = 'low') => {
    notificationService.createFinanceNotification(message, priority);
  };

  return { createFinanceNotification };
};

// Allgemeiner Hook für Benachrichtigungen
export const useNotifications = () => {
  const createNotification = (type, data) => {
    switch (type) {
      case NOTIFICATION_TYPES.APPOINTMENT:
        notificationService.createAppointmentNotification(data);
        break;
      case NOTIFICATION_TYPES.PRESCRIPTION:
        notificationService.createPrescriptionNotification(data);
        break;
      case NOTIFICATION_TYPES.PATIENT:
        notificationService.createPatientNotification(data);
        break;
      case NOTIFICATION_TYPES.TREATMENT:
        notificationService.createTreatmentNotification(data);
        break;
      case NOTIFICATION_TYPES.BILLING:
        notificationService.createBillingNotification(data);
        break;
      case NOTIFICATION_TYPES.FINANCE:
        notificationService.createFinanceNotification(data.message, data.priority);
        break;
      case NOTIFICATION_TYPES.SYSTEM:
        notificationService.createSystemNotification(data.title, data.message, data.priority);
        break;
      default:
        console.warn('Unknown notification type:', type);
    }
  };

  return { createNotification };
}; 