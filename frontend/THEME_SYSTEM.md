# Theme-System - MediCal Praxisverwaltung

## Übersicht

Das Theme-System der MediCal Praxisverwaltung ermöglicht es jedem Benutzer, das Aussehen der Anwendung individuell anzupassen. Es unterstützt Dark Mode, Light Mode, automatische Theme-Erkennung und weitere Anpassungsoptionen.

## 🎨 **Funktionen**

### **Theme-Modi**

#### **1. Light Mode (Hell)**
- **Klassisches helles Design** für optimale Lesbarkeit bei Tageslicht
- **Weiße Hintergründe** mit dunklen Texten
- **Sanfte Schatten** und subtile Farbübergänge
- **Ideal für** Büroumgebungen mit guter Beleuchtung

#### **2. Dark Mode (Dunkel)**
- **Schonendes dunkles Design** für die Augen bei wenig Licht
- **Dunkle Hintergründe** mit hellen Texten
- **Reduzierte Augenbelastung** bei längerer Nutzung
- **Ideal für** Abendstunden oder schlecht beleuchtete Räume

#### **3. Auto Mode (Automatisch)**
- **Automatische Anpassung** an Systemeinstellungen
- **Erkennt System-Theme** (Windows, macOS, Linux)
- **Dynamisches Umschalten** bei System-Änderungen
- **Ideal für** Benutzer, die ihr System-Theme ändern

### **Anpassungsoptionen**

#### **1. Akzentfarben**
- **8 vordefinierte Farben**: Blau, Grün, Lila, Rot, Orange, Türkis, Pink, Indigo
- **Dynamische Farbpalette**: Automatische Anpassung aller UI-Elemente
- **Konsistente Farbgebung**: Einheitliches Design in der gesamten Anwendung

#### **2. Schriftgrößen**
- **Klein**: Kompakt und platzsparend (0.875rem Basis)
- **Mittel**: Standard für optimale Lesbarkeit (1rem Basis)
- **Groß**: Erhöhte Lesbarkeit für bessere Zugänglichkeit (1.125rem Basis)

#### **3. Kompakter Modus**
- **Reduzierte Abstände**: Kleinere Paddings und Margins
- **Kompaktere Buttons**: Reduzierte Button-Höhen
- **Platzsparende Darstellung**: Mehr Inhalt auf dem Bildschirm

## 🔧 **Technische Implementierung**

### **ThemeService (`themeService.js`)**

```javascript
// Dynamische Theme-Erstellung
const createDynamicTheme = () => {
  const settings = themeService.getCurrentSettings();
  const effectiveMode = themeService.getEffectiveThemeMode();
  const accentColor = settings.theme_accent_color;
  const fontSize = settings.theme_font_size;
  const isCompact = settings.theme_compact_mode;
  
  // Theme basierend auf Einstellungen erstellen
  return createTheme({
    palette: {
      mode: effectiveMode,
      primary: { main: accentColor, ... },
    },
    typography: { ... },
    spacing: isCompact ? 4 : 8,
    // ...
  });
};
```

### **API-Integration**

Das System speichert Benutzereinstellungen in der Datenbank:

```javascript
// Benutzer-Einstellungen speichern
async saveSettings(settings) {
  const response = await api.patch('/users/me/', settings);
  this.currentSettings = { ...this.currentSettings, ...settings };
  this.saveToStorage();
  this.notifyListeners();
}
```

### **Dynamische Updates**

```javascript
// Theme-Listener für Echtzeit-Updates
themeService.addListener(() => {
  theme = createDynamicTheme();
  window.dispatchEvent(new CustomEvent('themeChanged'));
});
```

## 📱 **Benutzeroberfläche**

### **Header-Integration**

#### **Theme-Toggle-Button**
- **Schneller Wechsel**: Direkter Toggle zwischen Light/Dark/Auto
- **Visuelles Feedback**: Icon ändert sich je nach aktuellem Theme
- **Tooltip-Information**: Zeigt nächsten Theme-Modus an

#### **Theme-Einstellungen-Menü**
- **Vollständige Kontrolle**: Alle Theme-Optionen verfügbar
- **Vorschau**: Live-Vorschau der Änderungen
- **Persistierung**: Automatisches Speichern der Einstellungen

### **ThemeSettings-Seite**

#### **Theme-Modus-Auswahl**
- **Visuelle Karten**: Große, klickbare Karten für jeden Modus
- **Beschreibungen**: Detaillierte Erklärungen der Modi
- **Aktive Anzeige**: Hervorhebung des aktuellen Modus

#### **Akzentfarben-Auswahl**
- **Farbkreise**: Klickbare Farbauswahl
- **Live-Vorschau**: Sofortige Anwendung der Farben
- **Hover-Effekte**: Interaktive Farbauswahl

#### **Schriftgrößen-Einstellung**
- **Radio-Buttons**: Einfache Auswahl der Größe
- **Beispieltexte**: Live-Demonstration der Schriftgrößen
- **Zugänglichkeit**: Berücksichtigung von Barrierefreiheit

#### **Layout-Optionen**
- **Kompakter Modus**: Toggle für kompakte Darstellung
- **Spacing-Anpassung**: Automatische Anpassung aller Abstände
- **Responsive Design**: Optimierung für verschiedene Bildschirmgrößen

## 🚀 **Verwendung**

### **Für Benutzer**

#### **1. Schneller Theme-Wechsel**
- Klicken Sie auf das Theme-Icon im Header
- Wechselt automatisch zwischen Light → Dark → Auto → Light

#### **2. Detaillierte Einstellungen**
- Gehen Sie zu "Theme-Einstellungen" im Benutzer-Menü
- Passen Sie alle Optionen nach Ihren Wünschen an
- Änderungen werden automatisch gespeichert

#### **3. System-Integration**
- Wählen Sie "Automatisch" für System-Theme-Integration
- Ändern Sie Ihr System-Theme, um das automatische Umschalten zu testen

### **Für Entwickler**

#### **1. Theme-Service verwenden**

```javascript
import themeService, { THEME_MODES, ACCENT_COLORS } from '../services/themeService';

// Theme-Modus ändern
await themeService.setThemeMode(THEME_MODES.DARK);

// Akzentfarbe ändern
await themeService.setAccentColor(ACCENT_COLORS.GREEN);

// Schriftgröße ändern
await themeService.setFontSize('large');

// Kompakten Modus umschalten
await themeService.toggleCompactMode();
```

#### **2. Theme-Listener hinzufügen**

```javascript
import themeService from '../services/themeService';

function MyComponent() {
  const [settings, setSettings] = useState(themeService.getCurrentSettings());
  
  useEffect(() => {
    const unsubscribe = themeService.addListener((newSettings) => {
      setSettings(newSettings);
    });
    
    return unsubscribe;
  }, []);
}
```

#### **3. CSS-Variablen verwenden**

```css
.my-component {
  background-color: var(--background-paper);
  color: var(--text-primary);
  border: 1px solid var(--divider);
}
```

## 📊 **Konfiguration**

### **Theme-Modi**
```javascript
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};
```

### **Akzentfarben**
```javascript
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
```

### **Schriftgrößen**
```javascript
export const FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};
```

## 🔍 **Debugging**

### **Theme-Status prüfen**
```javascript
// Aktuelle Einstellungen abrufen
const settings = themeService.getCurrentSettings();
console.log('Current theme settings:', settings);

// Effektiven Theme-Modus prüfen
const effectiveMode = themeService.getEffectiveThemeMode();
console.log('Effective theme mode:', effectiveMode);
```

### **Manuelle Theme-Änderung**
```javascript
// Theme manuell ändern
await themeService.setThemeMode('dark');
await themeService.setAccentColor('#ef4444');
```

## 🛠 **Wartung**

### **Neue Akzentfarben hinzufügen**
```javascript
// In themeService.js
export const ACCENT_COLORS = {
  // ... bestehende Farben
  NEW_COLOR: '#your-hex-color'
};
```

### **Neue Schriftgrößen hinzufügen**
```javascript
// In themeService.js
export const FONT_SIZES = {
  // ... bestehende Größen
  EXTRA_LARGE: 'extra-large'
};

// In createDynamicTheme()
const fontSizes = {
  // ... bestehende Größen
  extra_large: {
    h1: '3.5rem',
    // ... weitere Größen
  }
};
```

## 📈 **Erweiterungen**

### **Geplante Features**
- **Benutzerdefinierte Farben**: Hex-Farben-Eingabe für individuelle Akzentfarben
- **Theme-Vorlagen**: Vordefinierte Theme-Kombinationen
- **Animationen**: Smooth Transitions zwischen Themes
- **Export/Import**: Theme-Einstellungen teilen und sichern

### **API-Erweiterungen**
- **Theme-Historie**: Speicherung von Theme-Änderungen
- **Team-Themes**: Einheitliche Themes für Teams
- **Branding-Integration**: Firmen-spezifische Themes
- **A/B-Testing**: Theme-Performance-Tracking

## 🎯 **Best Practices**

### **Für Benutzer**
- **Automatisches Theme**: Verwenden Sie "Auto" für beste System-Integration
- **Akzentfarben**: Wählen Sie Farben, die zu Ihrer Arbeitsumgebung passen
- **Schriftgrößen**: Passen Sie die Größe an Ihre Sehstärke an
- **Kompakter Modus**: Aktivieren Sie für mehr Inhalt auf dem Bildschirm

### **Für Entwickler**
- **CSS-Variablen**: Verwenden Sie immer CSS-Variablen statt hartcodierter Farben
- **Theme-Listener**: Hören Sie auf Theme-Änderungen für reaktive Komponenten
- **Fallback-Werte**: Stellen Sie Fallback-Werte für alle Theme-Eigenschaften bereit
- **Performance**: Vermeiden Sie teure Berechnungen bei Theme-Änderungen

---

**Hinweis**: Das Theme-System ist vollständig in die bestehende Anwendung integriert und speichert alle Einstellungen individuell für jeden Benutzer in der Datenbank. 