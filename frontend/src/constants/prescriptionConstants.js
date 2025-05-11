export const FREQUENCY_CHOICES = [
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

export const getFrequencyLabel = (frequencyType) => {
  const frequency = FREQUENCY_CHOICES.find(f => f.value === frequencyType);
  return frequency ? frequency.label : frequencyType;
};

// Weitere prescription-bezogene Konstanten können hier hinzugefügt werden
export const STATUS_CONFIG = {
  'Open': { color: 'primary', label: 'Offen' },
  'In_Progress': { color: 'warning', label: 'In Behandlung' },
  'Completed': { color: 'success', label: 'Abgeschlossen' },
  'Cancelled': { color: 'error', label: 'Storniert' }
};

export const TREATMENT_TYPES = [
  { value: 'Physiotherapie', label: 'Physiotherapie' },
  { value: 'Podologische Therapie', label: 'Podologische Therapie' },
  { value: 'Stimm-, Sprech-, Sprach- und Schlucktherapie', label: 'Stimm-, Sprech-, Sprach- und Schlucktherapie' },
  { value: 'Ergotherapie', label: 'Ergotherapie' },
  { value: 'Ernährungstherapie', label: 'Ernährungstherapie' }
]; 