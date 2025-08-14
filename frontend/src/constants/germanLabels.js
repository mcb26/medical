// Zentrale deutsche Lokalisierung für die gesamte Anwendung

export const STATUS_LABELS = {
  // Termin-Status
  'planned': 'Geplant',
  'confirmed': 'Bestätigt', 
  'completed': 'Abgeschlossen',
  'cancelled': 'Storniert',
  'no_show': 'Nicht erschienen',
  'ready_to_bill': 'Abrechnungsbereit',
  'billed': 'Abgerechnet',
  
  // Verordnungs-Status
  'open': 'Offen',
  'closed': 'Geschlossen',
  'expired': 'Abgelaufen',
  
  // Abrechnungs-Status
  'draft': 'Entwurf',
  'ready': 'Bereit zum Export',
  'exported': 'Exportiert',
  'completed': 'Abgeschlossen'
};

export const BUTTON_LABELS = {
  'save': 'Speichern',
  'cancel': 'Abbrechen',
  'edit': 'Bearbeiten',
  'delete': 'Löschen',
  'create': 'Erstellen',
  'update': 'Aktualisieren',
  'back': 'Zurück',
  'next': 'Weiter',
  'previous': 'Zurück',
  'submit': 'Absenden',
  'reset': 'Zurücksetzen',
  'search': 'Suchen',
  'filter': 'Filtern',
  'export': 'Exportieren',
  'import': 'Importieren',
  'download': 'Herunterladen',
  'upload': 'Hochladen',
  'print': 'Drucken',
  'close': 'Schließen',
  'open': 'Öffnen',
  'add': 'Hinzufügen',
  'remove': 'Entfernen',
  'select': 'Auswählen',
  'clear': 'Löschen',
  'refresh': 'Aktualisieren',
  'loading': 'Lädt...',
  'error': 'Fehler',
  'success': 'Erfolgreich',
  'warning': 'Warnung',
  'info': 'Information'
};

export const FORM_LABELS = {
  // Allgemeine Felder
  'name': 'Name',
  'first_name': 'Vorname',
  'last_name': 'Nachname',
  'email': 'E-Mail',
  'phone': 'Telefon',
  'address': 'Adresse',
  'street': 'Straße',
  'city': 'Stadt',
  'postal_code': 'PLZ',
  'country': 'Land',
  'date': 'Datum',
  'time': 'Zeit',
  'duration': 'Dauer',
  'notes': 'Notizen',
  'description': 'Beschreibung',
  'status': 'Status',
  'type': 'Typ',
  'category': 'Kategorie',
  
  // Patienten-spezifisch
  'patient': 'Patient',
  'patient_name': 'Patientenname',
  'birth_date': 'Geburtsdatum',
  'medical_history': 'Anamnese',
  'allergies': 'Allergien',
  'emergency_contact': 'Notfallkontakt',
  
  // Verordnungen
  'prescription': 'Verordnung',
  'prescription_date': 'Verordnungsdatum',
  'doctor': 'Arzt',
  'treatment': 'Behandlung',
  'diagnosis': 'Diagnose',
  'sessions': 'Sitzungen',
  'frequency': 'Häufigkeit',
  'goals': 'Ziele',
  
  // Termine
  'appointment': 'Termin',
  'appointment_date': 'Termindatum',
  'practitioner': 'Behandler',
  'room': 'Raum',
  'session_number': 'Sitzungsnummer',
  'total_sessions': 'Gesamtsitzungen',
  
  // Abrechnung
  'billing': 'Abrechnung',
  'insurance': 'Krankenkasse',
  'amount': 'Betrag',
  'copay': 'Zuzahlung',
  'cycle': 'Zyklus',
  'period': 'Zeitraum'
};

export const MESSAGES = {
  // Erfolgsmeldungen
  'save_success': 'Erfolgreich gespeichert',
  'delete_success': 'Erfolgreich gelöscht',
  'create_success': 'Erfolgreich erstellt',
  'update_success': 'Erfolgreich aktualisiert',
  
  // Fehlermeldungen
  'save_error': 'Fehler beim Speichern',
  'delete_error': 'Fehler beim Löschen',
  'create_error': 'Fehler beim Erstellen',
  'update_error': 'Fehler beim Aktualisieren',
  'load_error': 'Fehler beim Laden der Daten',
  'network_error': 'Netzwerkfehler',
  'validation_error': 'Validierungsfehler',
  
  // Bestätigungen
  'delete_confirm': 'Wirklich löschen?',
  'cancel_confirm': 'Änderungen verwerfen?',
  'logout_confirm': 'Wirklich abmelden?',
  
  // Warnungen
  'unsaved_changes': 'Ungespeicherte Änderungen',
  'session_expired': 'Sitzung abgelaufen',
  'permission_denied': 'Zugriff verweigert'
};

export const PAGE_TITLES = {
  'home': 'Startseite',
  'patients': 'Patienten',
  'appointments': 'Termine',
  'prescriptions': 'Verordnungen',
  'treatments': 'Behandlungen',
  'billing': 'Abrechnung',
  'reports': 'Berichte',
  'settings': 'Einstellungen',
  'profile': 'Profil',
  'admin': 'Administration',
  'calendar': 'Kalender',
  'finance': 'Finanzen',
  'insurance': 'Krankenkassen',
  'practitioners': 'Behandler',
  'rooms': 'Räume',
  'notifications': 'Benachrichtigungen'
};

export const VALIDATION_MESSAGES = {
  'required': 'Dieses Feld ist erforderlich',
  'email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
  'phone': 'Bitte geben Sie eine gültige Telefonnummer ein',
  'date': 'Bitte geben Sie ein gültiges Datum ein',
  'time': 'Bitte geben Sie eine gültige Zeit ein',
  'number': 'Bitte geben Sie eine gültige Zahl ein',
  'min_length': 'Mindestlänge nicht erreicht',
  'max_length': 'Maximallänge überschritten',
  'invalid_format': 'Ungültiges Format',
  'future_date': 'Datum muss in der Zukunft liegen',
  'past_date': 'Datum muss in der Vergangenheit liegen'
};

export const FREQUENCY_OPTIONS = [
  { value: 'weekly_1', label: '1x pro Woche' },
  { value: 'weekly_2', label: '2x pro Woche' },
  { value: 'weekly_3', label: '3x pro Woche' },
  { value: 'weekly_4', label: '4x pro Woche' },
  { value: 'weekly_5', label: '5x pro Woche' },
  { value: 'monthly_1', label: '1x pro Monat' },
  { value: 'monthly_2', label: '2x pro Monat' },
  { value: 'monthly_3', label: '3x pro Monat' },
  { value: 'monthly_4', label: '4x pro Monat' }
];

export const TREATMENT_TYPES = [
  { value: 'Physiotherapie', label: 'Physiotherapie' },
  { value: 'Ergotherapie', label: 'Ergotherapie' },
  { value: 'Logopädie', label: 'Logopädie' },
  { value: 'Massage', label: 'Massage' },
  { value: 'Manuelle Therapie', label: 'Manuelle Therapie' },
  { value: 'Sporttherapie', label: 'Sporttherapie' }
];

export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'urgent', label: 'Dringend' }
];

export const MODULE_NAMES = {
  'patients': 'Patienten',
  'appointments': 'Termine',
  'prescriptions': 'Verordnungen',
  'treatments': 'Behandlungen',
  'finance': 'Finanzen',
  'billing': 'Abrechnung',
  'reports': 'Berichte',
  'settings': 'Einstellungen',
  'users': 'Benutzer',
  'admin': 'Administration'
};

export const PERMISSION_NAMES = {
  'read': 'Lesen',
  'create': 'Erstellen',
  'update': 'Bearbeiten',
  'delete': 'Löschen',
  'export': 'Exportieren',
  'import': 'Importieren',
  'approve': 'Genehmigen',
  'reject': 'Ablehnen'
}; 