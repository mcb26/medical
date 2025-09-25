// Einheitliche deutsche Labels für das gesamte System
export const UNIFIED_LABELS = {
  // Allgemeine Aktionen
  actions: {
    new: 'Neu',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    refresh: 'Aktualisieren',
    export: 'Export',
    print: 'Drucken',
    view: 'Anzeigen',
    details: 'Details',
    back: 'Zurück',
    next: 'Weiter',
    submit: 'Absenden',
    reset: 'Zurücksetzen',
    search: 'Suchen',
    filter: 'Filter',
    sort: 'Sortieren',
    select: 'Auswählen',
    deselect: 'Abwählen',
    selectAll: 'Alle auswählen',
    deselectAll: 'Alle abwählen',
  },

  // Status-Labels
  status: {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    draft: 'Entwurf',
    ready: 'Bereit',
    completed: 'Abgeschlossen',
    pending: 'Ausstehend',
    cancelled: 'Storniert',
    confirmed: 'Bestätigt',
    exported: 'Exportiert',
    sent: 'Gesendet',
    paid: 'Bezahlt',
    unpaid: 'Unbezahlt',
    open: 'Offen',
    closed: 'Geschlossen',
    covered: 'Versichert',
    private: 'Privat',
    public: 'Öffentlich',
  },

  // DataGrid Labels
  dataGrid: {
    toolbarDensity: 'Zeilenhöhe',
    toolbarDensityLabel: 'Zeilenhöhe',
    toolbarDensityCompact: 'Kompakt',
    toolbarDensityStandard: 'Standard',
    toolbarDensityComfortable: 'Komfortabel',
    toolbarColumns: 'Spalten',
    toolbarColumnsLabel: 'Spalten auswählen',
    toolbarFilters: 'Filter',
    toolbarFiltersLabel: 'Filter anzeigen',
    toolbarFiltersTooltipHide: 'Filter ausblenden',
    toolbarFiltersTooltipShow: 'Filter anzeigen',
    toolbarQuickFilterPlaceholder: 'Suchen...',
    toolbarExport: 'Export',
    toolbarExportLabel: 'Export',
    toolbarExportCSV: 'Als CSV exportieren',
    toolbarExportPrint: 'Drucken',
    footerTotalRows: 'Gesamt:',
    footerTotalVisibleRows: (visibleCount, totalCount) =>
      `${visibleCount.toLocaleString()} von ${totalCount.toLocaleString()}`,
    noRowsLabel: 'Keine Daten verfügbar',
    noResultsOverlayLabel: 'Keine Ergebnisse gefunden',
    errorOverlayDefaultLabel: 'Ein Fehler ist aufgetreten',
    loadingOverlayLabel: 'Lädt...',
  },

  // Spalten-Header
  columns: {
    id: 'ID',
    name: 'Name',
    title: 'Titel',
    description: 'Beschreibung',
    status: 'Status',
    date: 'Datum',
    time: 'Zeit',
    duration: 'Dauer',
    price: 'Preis',
    amount: 'Betrag',
    category: 'Kategorie',
    type: 'Typ',
    actions: 'Aktionen',
    created: 'Erstellt',
    updated: 'Aktualisiert',
    email: 'E-Mail',
    phone: 'Telefon',
    address: 'Adresse',
    insurance: 'Versicherung',
    patient: 'Patient',
    treatment: 'Behandlung',
    practitioner: 'Behandler',
    room: 'Raum',
    appointment: 'Termin',
    prescription: 'Rezept',
    billing: 'Abrechnung',
  },

  // Fehlermeldungen
  errors: {
    loading: 'Fehler beim Laden der Daten',
    saving: 'Fehler beim Speichern',
    deleting: 'Fehler beim Löschen',
    network: 'Netzwerkfehler',
    unauthorized: 'Nicht autorisiert',
    forbidden: 'Zugriff verweigert',
    notFound: 'Nicht gefunden',
    serverError: 'Serverfehler',
    validation: 'Validierungsfehler',
    unknown: 'Unbekannter Fehler',
  },

  // Erfolgsmeldungen
  success: {
    saved: 'Erfolgreich gespeichert',
    deleted: 'Erfolgreich gelöscht',
    created: 'Erfolgreich erstellt',
    updated: 'Erfolgreich aktualisiert',
    exported: 'Erfolgreich exportiert',
    imported: 'Erfolgreich importiert',
  },

  // Bestätigungsdialoge
  confirm: {
    delete: 'Möchten Sie diesen Eintrag wirklich löschen?',
    deleteMultiple: 'Möchten Sie die ausgewählten Einträge wirklich löschen?',
    unsavedChanges: 'Sie haben ungespeicherte Änderungen. Möchten Sie fortfahren?',
    reset: 'Möchten Sie alle Änderungen verwerfen?',
  },

  // Platzhalter
  placeholders: {
    search: 'Suchen...',
    select: 'Auswählen...',
    enter: 'Eingeben...',
    loading: 'Lädt...',
    noData: 'Keine Daten verfügbar',
    noResults: 'Keine Ergebnisse gefunden',
  },

  // Zeit-Formate
  timeFormats: {
    date: 'dd.MM.yyyy',
    time: 'HH:mm',
    datetime: 'dd.MM.yyyy HH:mm',
    month: 'MMMM yyyy',
    year: 'yyyy',
  },

  // Währungen
  currency: {
    symbol: '€',
    format: (amount) => `${amount?.toFixed(2)} €`,
  },

  // Einheiten
  units: {
    minutes: 'Min.',
    hours: 'Std.',
    days: 'Tage',
    weeks: 'Wochen',
    months: 'Monate',
    years: 'Jahre',
  },
};

// Hilfsfunktionen für Labels
export const getLabel = (key, defaultValue = '') => {
  const keys = key.split('.');
  let value = UNIFIED_LABELS;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }
  
  return value;
};

export const formatCurrency = (amount) => {
  return UNIFIED_LABELS.currency.format(amount);
};

export const formatDate = (date, format = 'date') => {
  if (!date) return '-';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(format === 'datetime' && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  });
};

export default UNIFIED_LABELS;
