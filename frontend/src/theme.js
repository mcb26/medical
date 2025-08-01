import { createTheme } from '@mui/material/styles';
import themeService from './services/themeService';

// Dynamisches Theme basierend auf ThemeService
const createDynamicTheme = () => {
  const settings = themeService.getCurrentSettings();
  const effectiveMode = themeService.getEffectiveThemeMode();
  const accentColor = settings.theme_accent_color;
  const fontSize = settings.theme_font_size;
  const isCompact = settings.theme_compact_mode;

  // Schriftgrößen basierend auf Einstellung
  const fontSizes = {
    small: {
      h1: '2rem',
      h2: '1.75rem',
      h3: '1.5rem',
      h4: '1.25rem',
      h5: '1.125rem',
      h6: '1rem',
      body1: '0.875rem',
      body2: '0.75rem',
    },
    medium: {
      h1: '2.5rem',
      h2: '2rem',
      h3: '1.75rem',
      h4: '1.5rem',
      h5: '1.25rem',
      h6: '1.125rem',
      body1: '1rem',
      body2: '0.875rem',
    },
    large: {
      h1: '3rem',
      h2: '2.5rem',
      h3: '2rem',
      h4: '1.75rem',
      h5: '1.5rem',
      h6: '1.25rem',
      body1: '1.125rem',
      body2: '1rem',
    }
  };

  const currentFontSizes = fontSizes[fontSize];

  // Farben basierend auf Theme-Modus
  const lightColors = {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: accentColor,
      600: themeService.adjustColor(accentColor, -20),
      700: themeService.adjustColor(accentColor, -40),
      800: themeService.adjustColor(accentColor, -60),
      900: themeService.adjustColor(accentColor, -80),
      main: accentColor,
      light: themeService.adjustColor(accentColor, 20),
      dark: themeService.adjustColor(accentColor, -20),
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
    divider: '#e5e7eb',
  };

  const darkColors = {
    primary: {
      50: '#1e3a8a',
      100: '#1e40af',
      200: '#1d4ed8',
      300: '#2563eb',
      400: '#3b82f6',
      500: accentColor,
      600: themeService.adjustColor(accentColor, 20),
      700: themeService.adjustColor(accentColor, 40),
      800: themeService.adjustColor(accentColor, 60),
      900: themeService.adjustColor(accentColor, 80),
      main: accentColor,
      light: themeService.adjustColor(accentColor, 20),
      dark: themeService.adjustColor(accentColor, -20),
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#a78bfa',
      light: '#c4b5fd',
      dark: '#7c3aed',
    },
    background: {
      default: '#111827',
      paper: '#1f2937',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      disabled: '#6b7280',
    },
    divider: '#374151',
  };

  const colors = effectiveMode === 'dark' ? darkColors : lightColors;

  // Spacing basierend auf kompaktem Modus
  const spacing = isCompact ? 4 : 8;

  return createTheme({
    palette: {
      mode: effectiveMode,
      ...colors,
      background: {
        default: effectiveMode === 'dark' ? '#111827' : '#f9fafb',
        paper: effectiveMode === 'dark' ? '#1f2937' : '#ffffff',
      },
      text: {
        primary: effectiveMode === 'dark' ? '#f9fafb' : '#111827',
        secondary: effectiveMode === 'dark' ? '#d1d5db' : '#6b7280',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      h1: {
        fontSize: currentFontSizes.h1,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.025em',
        '@media (max-width:768px)': {
          fontSize: isCompact ? '1.5rem' : '1.875rem',
        },
      },
      h2: {
        fontSize: currentFontSizes.h2,
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: '-0.025em',
        '@media (max-width:768px)': {
          fontSize: isCompact ? '1.25rem' : '1.5rem',
        },
      },
      h3: {
        fontSize: currentFontSizes.h3,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.025em',
        '@media (max-width:768px)': {
          fontSize: isCompact ? '1.125rem' : '1.25rem',
        },
      },
      h4: {
        fontSize: currentFontSizes.h4,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.025em',
        '@media (max-width:768px)': {
          fontSize: isCompact ? '1rem' : '1.125rem',
        },
      },
      h5: {
        fontSize: currentFontSizes.h5,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.025em',
      },
      h6: {
        fontSize: currentFontSizes.h6,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.025em',
      },
      body1: {
        fontSize: currentFontSizes.body1,
        lineHeight: 1.5,
        letterSpacing: '0.025em',
      },
      body2: {
        fontSize: currentFontSizes.body2,
        lineHeight: 1.5,
        letterSpacing: '0.025em',
      },
      button: {
        fontSize: currentFontSizes.body2,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '0.025em',
        textTransform: 'none',
      },
      caption: {
        fontSize: isCompact ? '0.625rem' : '0.75rem',
        lineHeight: 1.25,
        letterSpacing: '0.025em',
      },
      overline: {
        fontSize: isCompact ? '0.625rem' : '0.75rem',
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
    },
    spacing: spacing,
    shape: {
      borderRadius: isCompact ? 6 : 8,
    },
    shadows: [
      'none',
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      ...Array(19).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 6 : 8,
            textTransform: 'none',
            fontWeight: 600,
            padding: isCompact ? '6px 12px' : '8px 16px',
            minHeight: isCompact ? 32 : 40,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
          },
          contained: {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            background: `linear-gradient(135deg, ${accentColor} 0%, ${themeService.adjustColor(accentColor, -20)} 100%)`,
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              background: `linear-gradient(135deg, ${themeService.adjustColor(accentColor, 10)} 0%, ${themeService.adjustColor(accentColor, -10)} 100%)`,
            },
          },
          outlined: {
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          },
          sizeSmall: {
            padding: isCompact ? '4px 8px' : '6px 12px',
            minHeight: isCompact ? 28 : 32,
            fontSize: currentFontSizes.body2,
          },
          sizeLarge: {
            padding: isCompact ? '10px 20px' : '12px 24px',
            minHeight: isCompact ? 40 : 48,
            fontSize: currentFontSizes.body1,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 8 : 12,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
            transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
            '&:hover': {
              boxShadow: '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 8 : 12,
          },
          elevation1: {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          },
          elevation2: {
            boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
          },
          elevation3: {
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: isCompact ? 6 : 8,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: accentColor,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: accentColor,
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            borderRight: 'none',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            borderRadius: isCompact ? 8 : 12,
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e5e7eb',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: colors.background.default,
              borderBottom: '2px solid #e5e7eb',
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: colors.background.default === '#f9fafb' ? '#f1f5f9' : '#374151',
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 12 : 16,
            fontWeight: 500,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 6 : 8,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 6 : 8,
            margin: isCompact ? '1px 4px' : '2px 8px',
            '&:hover': {
              backgroundColor: colors.background.default === '#f9fafb' ? '#f1f5f9' : '#374151',
            },
            '&.Mui-selected': {
              backgroundColor: colors.primary[100],
              '&:hover': {
                backgroundColor: colors.primary[200],
              },
            },
          },
        },
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
      },
    },
  });
};

// Theme-Listener für dynamische Updates
themeService.addListener(() => {
  // Force re-render der App
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themeChanged'));
  }
});

// Funktion zum Erstellen des aktuellen Themes
const getCurrentTheme = () => createDynamicTheme();

export default getCurrentTheme; 