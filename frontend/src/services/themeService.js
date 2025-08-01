import api from '../api/axios';

// Theme-Modi
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// Akzentfarben
export const ACCENT_COLORS = {
  BLUE: '#3b82f6',
  GREEN: '#10b981',
  PURPLE: '#8b5cf6',
  RED: '#ef4444',
  ORANGE: '#f97316',
  TEAL: '#14b8a6',
  PINK: '#ec4899',
  INDIGO: '#6366f1'
};

// Schriftgrößen
export const FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};

// Standard-Theme-Einstellungen
const DEFAULT_THEME_SETTINGS = {
  theme_mode: THEME_MODES.LIGHT,
  theme_accent_color: ACCENT_COLORS.BLUE,
  theme_font_size: FONT_SIZES.MEDIUM,
  theme_compact_mode: false
};

class ThemeService {
  constructor() {
    this.currentSettings = { ...DEFAULT_THEME_SETTINGS };
    this.listeners = [];
    this.isInitialized = false;
  }

  // Event Listener System
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentSettings));
  }

  // Initialisierung
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Lade gespeicherte Einstellungen aus localStorage
      this.loadFromStorage();
      
      // Lade Benutzer-Einstellungen vom Server
      await this.loadUserSettings();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing theme service:', error);
      // Verwende Standard-Einstellungen
      this.currentSettings = { ...DEFAULT_THEME_SETTINGS };
    }
  }

  // Benutzer-Einstellungen vom Server laden
  async loadUserSettings() {
    try {
      // Nur laden wenn User eingeloggt ist
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping user theme settings load');
        return;
      }
      
      const response = await api.get('/users/me/');
      const userData = response.data;
      
      if (userData) {
        this.currentSettings = {
          theme_mode: userData.theme_mode || DEFAULT_THEME_SETTINGS.theme_mode,
          theme_accent_color: userData.theme_accent_color || DEFAULT_THEME_SETTINGS.theme_accent_color,
          theme_font_size: userData.theme_font_size || DEFAULT_THEME_SETTINGS.theme_font_size,
          theme_compact_mode: userData.theme_compact_mode || DEFAULT_THEME_SETTINGS.theme_compact_mode
        };
        
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading user theme settings:', error);
    }
  }

  // Theme-Einstellungen speichern
  async saveSettings(settings) {
    try {
      const response = await api.patch('/users/update_theme/', settings);
      
      if (response.data) {
        this.currentSettings = { ...this.currentSettings, ...settings };
        this.saveToStorage();
        this.applyTheme(); // Theme sofort anwenden
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving theme settings:', error);
      // Auch bei Fehler das Theme lokal anwenden
      this.currentSettings = { ...this.currentSettings, ...settings };
      this.saveToStorage();
      this.applyTheme();
      this.notifyListeners();
      return false;
    }
  }

  // Theme-Modus ändern
  async setThemeMode(mode) {
    if (!Object.values(THEME_MODES).includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return false;
    }
    
    return await this.saveSettings({ theme_mode: mode });
  }

  // Akzentfarbe ändern
  async setAccentColor(color) {
    if (!Object.values(ACCENT_COLORS).includes(color)) {
      console.error('Invalid accent color:', color);
      return false;
    }
    
    return await this.saveSettings({ theme_accent_color: color });
  }

  // Schriftgröße ändern
  async setFontSize(size) {
    if (!Object.values(FONT_SIZES).includes(size)) {
      console.error('Invalid font size:', size);
      return false;
    }
    
    return await this.saveSettings({ theme_font_size: size });
  }

  // Kompakten Modus umschalten
  async toggleCompactMode() {
    const newCompactMode = !this.currentSettings.theme_compact_mode;
    return await this.saveSettings({ theme_compact_mode: newCompactMode });
  }

  // Aktuelle Einstellungen abrufen
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  // Aktueller Theme-Modus
  getCurrentThemeMode() {
    return this.currentSettings.theme_mode;
  }

  // Aktuelle Akzentfarbe
  getCurrentAccentColor() {
    return this.currentSettings.theme_accent_color;
  }

  // Aktuelle Schriftgröße
  getCurrentFontSize() {
    return this.currentSettings.theme_font_size;
  }

  // Ist kompakter Modus aktiv?
  isCompactMode() {
    return this.currentSettings.theme_compact_mode;
  }

  // System-Theme erkennen (für auto-Modus)
  getSystemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    }
    return THEME_MODES.LIGHT;
  }

  // Effektiven Theme-Modus berechnen
  getEffectiveThemeMode() {
    if (this.currentSettings.theme_mode === THEME_MODES.AUTO) {
      return this.getSystemTheme();
    }
    return this.currentSettings.theme_mode;
  }

  // CSS-Variablen für das aktuelle Theme generieren
  generateCSSVariables() {
    const effectiveMode = this.getEffectiveThemeMode();
    const accentColor = this.currentSettings.theme_accent_color;
    const fontSize = this.currentSettings.theme_font_size;
    const isCompact = this.currentSettings.theme_compact_mode;

    // Basis-Farben für Light/Dark Mode
    const lightColors = {
      '--primary-50': '#eff6ff',
      '--primary-100': '#dbeafe',
      '--primary-200': '#bfdbfe',
      '--primary-300': '#93c5fd',
      '--primary-400': '#60a5fa',
      '--primary-500': accentColor,
      '--primary-600': this.adjustColor(accentColor, -20),
      '--primary-700': this.adjustColor(accentColor, -40),
      '--primary-800': this.adjustColor(accentColor, -60),
      '--primary-900': this.adjustColor(accentColor, -80),
      
      '--background-default': '#f9fafb',
      '--background-paper': '#ffffff',
      '--text-primary': '#111827',
      '--text-secondary': '#6b7280',
      '--text-disabled': '#9ca3af',
      '--divider': '#e5e7eb',
      
      '--gray-50': '#f9fafb',
      '--gray-100': '#f3f4f6',
      '--gray-200': '#e5e7eb',
      '--gray-300': '#d1d5db',
      '--gray-400': '#9ca3af',
      '--gray-500': '#6b7280',
      '--gray-600': '#4b5563',
      '--gray-700': '#374151',
      '--gray-800': '#1f2937',
      '--gray-900': '#111827',
    };

    const darkColors = {
      '--primary-50': '#1e3a8a',
      '--primary-100': '#1e40af',
      '--primary-200': '#1d4ed8',
      '--primary-300': '#2563eb',
      '--primary-400': '#3b82f6',
      '--primary-500': accentColor,
      '--primary-600': this.adjustColor(accentColor, 20),
      '--primary-700': this.adjustColor(accentColor, 40),
      '--primary-800': this.adjustColor(accentColor, 60),
      '--primary-900': this.adjustColor(accentColor, 80),
      
      '--background-default': '#111827',
      '--background-paper': '#1f2937',
      '--text-primary': '#f9fafb',
      '--text-secondary': '#d1d5db',
      '--text-disabled': '#6b7280',
      '--divider': '#374151',
      
      '--gray-50': '#111827',
      '--gray-100': '#1f2937',
      '--gray-200': '#374151',
      '--gray-300': '#4b5563',
      '--gray-400': '#6b7280',
      '--gray-500': '#9ca3af',
      '--gray-600': '#d1d5db',
      '--gray-700': '#e5e7eb',
      '--gray-800': '#f3f4f6',
      '--gray-900': '#f9fafb',
    };

    const colors = effectiveMode === THEME_MODES.DARK ? darkColors : lightColors;

    // Schriftgrößen
    const fontSizes = {
      small: {
        '--text-xs': '0.625rem',
        '--text-sm': '0.75rem',
        '--text-base': '0.875rem',
        '--text-lg': '1rem',
        '--text-xl': '1.125rem',
        '--text-2xl': '1.25rem',
        '--text-3xl': '1.5rem',
        '--text-4xl': '1.875rem',
        '--text-5xl': '2.25rem',
      },
      medium: {
        '--text-xs': '0.75rem',
        '--text-sm': '0.875rem',
        '--text-base': '1rem',
        '--text-lg': '1.125rem',
        '--text-xl': '1.25rem',
        '--text-2xl': '1.5rem',
        '--text-3xl': '1.875rem',
        '--text-4xl': '2.25rem',
        '--text-5xl': '3rem',
      },
      large: {
        '--text-xs': '0.875rem',
        '--text-sm': '1rem',
        '--text-base': '1.125rem',
        '--text-lg': '1.25rem',
        '--text-xl': '1.5rem',
        '--text-2xl': '1.75rem',
        '--text-3xl': '2.25rem',
        '--text-4xl': '2.75rem',
        '--text-5xl': '3.5rem',
      }
    };

    // Spacing für kompakten Modus
    const spacing = isCompact ? {
      '--spacing-xs': '0.125rem',
      '--spacing-sm': '0.25rem',
      '--spacing-md': '0.5rem',
      '--spacing-lg': '1rem',
      '--spacing-xl': '1.5rem',
      '--spacing-2xl': '2rem',
      '--spacing-3xl': '3rem',
    } : {
      '--spacing-xs': '0.25rem',
      '--spacing-sm': '0.5rem',
      '--spacing-md': '1rem',
      '--spacing-lg': '1.5rem',
      '--spacing-xl': '2rem',
      '--spacing-2xl': '3rem',
      '--spacing-3xl': '4rem',
    };

    return {
      ...colors,
      ...fontSizes[fontSize],
      ...spacing,
      '--theme-mode': effectiveMode,
      '--accent-color': accentColor,
      '--font-size': fontSize,
      '--compact-mode': isCompact ? 'true' : 'false',
    };
  }

  // Farbe anpassen (heller/dunkler machen)
  adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  // CSS-Variablen auf das DOM anwenden
  applyTheme() {
    const cssVariables = this.generateCSSVariables();
    const root = document.documentElement;
    
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // data-theme Attribut für CSS-Selektoren setzen
    root.setAttribute('data-theme', this.getEffectiveThemeMode());

    // Body-Klasse für Theme-Modus
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${this.getEffectiveThemeMode()}`);
    
    // Body-Klasse für kompakten Modus
    if (this.currentSettings.theme_compact_mode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  }

  // Storage-Funktionen
  saveToStorage() {
    try {
      localStorage.setItem('themeSettings', JSON.stringify(this.currentSettings));
    } catch (error) {
      console.error('Error saving theme settings to storage:', error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('themeSettings');
      if (stored) {
        this.currentSettings = { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading theme settings from storage:', error);
    }
  }

  // System-Theme-Änderungen überwachen
  watchSystemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentSettings.theme_mode === THEME_MODES.AUTO) {
          this.applyTheme();
          this.notifyListeners();
        }
      });
    }
  }

  // Cleanup
  cleanup() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

// Singleton-Instanz
const themeService = new ThemeService();

// Automatische Initialisierung beim Import
if (typeof window !== 'undefined') {
  themeService.initialize().then(() => {
    themeService.applyTheme();
    themeService.watchSystemTheme();
  });
}

export default themeService; 