# MediCal Design System

## Übersicht

Das MediCal Design System ist ein modernes, responsives Design-System, das speziell für die Praxisverwaltung entwickelt wurde. Es bietet eine konsistente Benutzeroberfläche für Desktop- und mobile Geräte.

## 🎨 Design-Prinzipien

### 1. **Responsive Design**
- Mobile-First Ansatz
- Breakpoints: xs (0px), sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible Grid-Systeme und Layouts

### 2. **Moderne Farbpalette**
- **Primary**: Blau-Gradient (#667eea → #764ba2)
- **Secondary**: Grau-Töne für neutrale Elemente
- **Success**: Grün für positive Aktionen
- **Warning**: Orange für Warnungen
- **Error**: Rot für Fehler
- **Info**: Blau für Informationen

### 3. **Typography**
- **Font Family**: Inter (mit Fallbacks)
- **Responsive Schriftgrößen**: Automatische Anpassung für mobile Geräte
- **Hierarchie**: Klare Unterscheidung zwischen Überschriften, Body-Text und Captions

### 4. **Spacing & Layout**
- **Konsistente Abstände**: 4px Basis-System
- **Container**: Responsive Container mit max-width
- **Grid-System**: Flexibles CSS Grid für Layouts

## 🧩 Komponenten

### ModernButton
Eine moderne Button-Komponente mit verschiedenen Varianten:

```jsx
<ModernButton
  variant="contained" // contained, outlined, text, success, warning, error
  size="medium"       // small, medium, large
  loading={false}     // Loading-Zustand
  fullWidth={false}   // Volle Breite
  startIcon={<AddIcon />}
  onClick={handleClick}
>
  Button Text
</ModernButton>
```

**Features:**
- Hover-Effekte mit Transform und Shadow
- Loading-Zustand mit Spinner
- Responsive Größenanpassung
- Gradient-Hintergründe

### ModernCard
Eine flexible Card-Komponente für verschiedene Inhalte:

```jsx
<ModernCard
  variant="elevated"  // elevated, outlined, filled, interactive, success, warning, error, info
  title="Card Title"
  subtitle="Card Subtitle"
  action={<Button>Action</Button>}
  chips={[{ label: "Tag", color: "primary" }]}
  onClick={handleClick}
>
  Card Content
</ModernCard>
```

**Features:**
- Verschiedene Varianten für unterschiedliche Zwecke
- Interaktive Hover-Effekte
- Responsive Design
- Chips für Tags und Status

### CardSection & CardGrid
Layout-Komponenten für strukturierte Inhalte:

```jsx
<CardSection title="Section Title">
  <CardGrid columns={{ xs: 1, sm: 2, md: 3 }} spacing={3}>
    <ModernCard>Content 1</ModernCard>
    <ModernCard>Content 2</ModernCard>
  </CardGrid>
</CardSection>
```

## 🎯 Verwendung

### 1. **Theme Integration**
Das Design-System verwendet Material-UI mit einem benutzerdefinierten Theme:

```jsx
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* App Content */}
    </ThemeProvider>
  );
}
```

### 2. **Responsive Breakpoints**
```jsx
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
```

### 3. **CSS Variables**
Das System verwendet CSS-Variablen für konsistente Werte:

```css
:root {
  --primary-500: #3b82f6;
  --spacing-md: 1rem;
  --radius-lg: 0.75rem;
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

## 📱 Mobile Optimierungen

### 1. **Touch-Friendly Interface**
- Mindest-Touch-Targets: 44px
- Ausreichende Abstände zwischen interaktiven Elementen
- Optimierte Button-Größen für mobile Geräte

### 2. **Responsive Navigation**
- Collapsible Sidebar auf mobilen Geräten
- Touch-optimierte Menü-Items
- Swipe-Gesten für Navigation

### 3. **Optimierte Tabellen**
- Horizontales Scrollen auf kleinen Bildschirmen
- Responsive Spalten-Hiding
- Touch-optimierte Zeilen-Interaktionen

## 🎨 Farbverwendung

### Primary Colors
```css
--primary-50: #eff6ff;   /* Lightest */
--primary-500: #3b82f6;  /* Main */
--primary-900: #1e3a8a;  /* Darkest */
```

### Semantic Colors
- **Success**: Für erfolgreiche Aktionen und positive Status
- **Warning**: Für Warnungen und Aufmerksamkeit erfordernde Elemente
- **Error**: Für Fehler und kritische Meldungen
- **Info**: Für informative Nachrichten und Links

## 📐 Layout Guidelines

### 1. **Container**
- Max-Width für verschiedene Bildschirmgrößen
- Konsistente Padding-Werte
- Zentrierte Ausrichtung

### 2. **Grid System**
- CSS Grid für komplexe Layouts
- Flexbox für einfache Anordnungen
- Responsive Spalten-Anzahl

### 3. **Spacing**
- 8px Basis-System
- Responsive Abstände
- Konsistente Margins und Paddings

## 🔧 Anpassungen

### Theme Customization
```jsx
const customTheme = createTheme({
  palette: {
    primary: {
      main: '#your-color',
      // Weitere Farben...
    },
  },
  // Weitere Anpassungen...
});
```

### Component Styling
```jsx
<ModernButton
  sx={{
    backgroundColor: 'custom-color',
    borderRadius: 'custom-radius',
    // Weitere Styles...
  }}
>
  Custom Button
</ModernButton>
```

## 🚀 Best Practices

### 1. **Konsistenz**
- Verwenden Sie immer die vordefinierten Komponenten
- Halten Sie sich an die Design-Tokens
- Verwenden Sie die gleichen Abstände und Größen

### 2. **Accessibility**
- Semantische HTML-Struktur
- ARIA-Labels für interaktive Elemente
- Ausreichende Farbkontraste
- Keyboard-Navigation

### 3. **Performance**
- Lazy Loading für große Komponenten
- Optimierte Bilder und Icons
- Effiziente CSS-Selektoren

## 📚 Weitere Ressourcen

- [Material-UI Dokumentation](https://mui.com/)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Responsive Design Patterns](https://www.lukew.com/ff/entry.asp?1514)

---

**Version**: 2.0.0  
**Letzte Aktualisierung**: Dezember 2024  
**Entwickelt für**: MediCal Praxisverwaltung 