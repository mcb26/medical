import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Divider,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as AutoModeIcon,
  FormatSize as FontSizeIcon,
  Compress as CompactIcon,
  Palette as PaletteIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import themeService, { THEME_MODES, ACCENT_COLORS, FONT_SIZES } from '../services/themeService';
import ModernButton from './common/ModernButton';
import ModernCard, { CardSection } from './common/ModernCard';

const ThemeSettings = () => {
  const [settings, setSettings] = useState(themeService.getCurrentSettings());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const unsubscribe = themeService.addListener((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleThemeModeChange = async (mode) => {
    const success = await themeService.setThemeMode(mode);
    if (success) {
      showSnackbar('Theme-Modus erfolgreich geändert');
    } else {
      showSnackbar('Fehler beim Ändern des Theme-Modus', 'error');
    }
  };

  const handleAccentColorChange = async (color) => {
    const success = await themeService.setAccentColor(color);
    if (success) {
      showSnackbar('Akzentfarbe erfolgreich geändert');
    } else {
      showSnackbar('Fehler beim Ändern der Akzentfarbe', 'error');
    }
  };

  const handleFontSizeChange = async (size) => {
    const success = await themeService.setFontSize(size);
    if (success) {
      showSnackbar('Schriftgröße erfolgreich geändert');
    } else {
      showSnackbar('Fehler beim Ändern der Schriftgröße', 'error');
    }
  };

  const handleCompactModeToggle = async () => {
    const success = await themeService.toggleCompactMode();
    if (success) {
      showSnackbar(settings.theme_compact_mode ? 'Kompakter Modus deaktiviert' : 'Kompakter Modus aktiviert');
    } else {
      showSnackbar('Fehler beim Umschalten des kompakten Modus', 'error');
    }
  };

  const ColorSwatch = ({ color, selected, onClick }) => (
    <Tooltip title={color}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: color,
          border: selected ? '3px solid' : '2px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: theme.shadows[4],
          },
        }}
        onClick={onClick}
      >
        {selected && <CheckIcon sx={{ color: 'white', fontSize: 20 }} />}
      </Box>
    </Tooltip>
  );

  const ThemeModeCard = ({ mode, icon: Icon, title, description, selected }) => (
    <ModernCard
      variant={selected ? 'elevated' : 'outlined'}
      sx={{
        cursor: 'pointer',
        border: selected ? `2px solid ${theme.palette.primary.main}` : undefined,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
      onClick={() => handleThemeModeChange(mode)}
    >
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Icon 
          sx={{ 
            fontSize: 48, 
            color: selected ? 'primary.main' : 'text.secondary',
            mb: 2 
          }} 
        />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </CardContent>
    </ModernCard>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      py: { xs: 2, sm: 3 }
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Theme-Einstellungen
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
            Passen Sie das Aussehen der Anwendung an Ihre Vorlieben an
          </Typography>
        </Box>

        {/* Theme-Modus */}
        <CardSection title="Theme-Modus" sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            Wählen Sie zwischen hellem, dunklem oder automatischem Theme-Modus
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <ThemeModeCard
                mode={THEME_MODES.LIGHT}
                icon={LightModeIcon}
                title="Hell"
                description="Klassisches helles Design für optimale Lesbarkeit bei Tageslicht"
                selected={settings.theme_mode === THEME_MODES.LIGHT}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <ThemeModeCard
                mode={THEME_MODES.DARK}
                icon={DarkModeIcon}
                title="Dunkel"
                description="Schonendes dunkles Design für die Augen bei wenig Licht"
                selected={settings.theme_mode === THEME_MODES.DARK}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <ThemeModeCard
                mode={THEME_MODES.AUTO}
                icon={AutoModeIcon}
                title="Automatisch"
                description="Passt sich automatisch an Ihre Systemeinstellungen an"
                selected={settings.theme_mode === THEME_MODES.AUTO}
              />
            </Grid>
          </Grid>
        </CardSection>

        {/* Akzentfarbe */}
        <CardSection title="Akzentfarbe" sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            Wählen Sie Ihre bevorzugte Akzentfarbe für Buttons und Hervorhebungen
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(ACCENT_COLORS).map(([name, color]) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={settings.theme_accent_color === color}
                onClick={() => handleAccentColorChange(color)}
              />
            ))}
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Aktuelle Akzentfarbe: {settings.theme_accent_color}
            </Typography>
          </Box>
        </CardSection>

        {/* Schriftgröße */}
        <CardSection title="Schriftgröße" sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            Passen Sie die Schriftgröße an Ihre Bedürfnisse an
          </Typography>
          
          <FormControl component="fieldset">
            <RadioGroup
              value={settings.theme_font_size}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              sx={{ gap: 2 }}
            >
              <FormControlLabel
                value={FONT_SIZES.SMALL}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontSizeIcon />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                      Klein - Kompakt und platzsparend
                    </Typography>
                  </Box>
                }
              />
              
              <FormControlLabel
                value={FONT_SIZES.MEDIUM}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontSizeIcon />
                    <Typography sx={{ fontSize: '1rem' }}>
                      Mittel - Standard für optimale Lesbarkeit
                    </Typography>
                  </Box>
                }
              />
              
              <FormControlLabel
                value={FONT_SIZES.LARGE}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontSizeIcon />
                    <Typography sx={{ fontSize: '1.125rem' }}>
                      Groß - Erhöhte Lesbarkeit für bessere Zugänglichkeit
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardSection>

        {/* Kompakter Modus */}
        <CardSection title="Layout" sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            Passen Sie das Layout der Anwendung an
          </Typography>
          
          <ModernCard variant="outlined">
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.theme_compact_mode}
                    onChange={handleCompactModeToggle}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompactIcon />
                    <Typography>
                      Kompakter Modus
                    </Typography>
                  </Box>
                }
              />
              
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 1, ml: 4 }}>
                Reduziert Abstände und Schriftgrößen für eine kompaktere Darstellung
              </Typography>
            </CardContent>
          </ModernCard>
        </CardSection>

        {/* Vorschau */}
        <CardSection title="Vorschau" sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            So sieht Ihre Anwendung mit den aktuellen Einstellungen aus
          </Typography>
          
          <ModernCard variant="elevated">
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <ModernButton variant="contained">
                  Primärer Button
                </ModernButton>
                <ModernButton variant="outlined">
                  Sekundärer Button
                </ModernButton>
                <ModernButton variant="text">
                  Text Button
                </ModernButton>
              </Box>
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                Beispiel-Überschrift
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                Dies ist ein Beispieltext, der zeigt, wie Ihre gewählte Schriftgröße und 
                Farben in der Anwendung aussehen werden.
              </Typography>
              
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Sekundärer Text mit reduzierter Opazität für bessere Hierarchie.
              </Typography>
            </CardContent>
          </ModernCard>
        </CardSection>

        {/* Info */}
        <CardSection title="Informationen">
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Automatisches Theme:</strong> Bei Auswahl von "Automatisch" passt sich 
              die Anwendung an Ihre Systemeinstellungen an. Ändern Sie Ihr System-Theme, 
              um das automatische Umschalten zu testen.
            </Typography>
          </Alert>
          
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Persistierung:</strong> Ihre Theme-Einstellungen werden automatisch 
              gespeichert und sind auf allen Geräten verfügbar, auf denen Sie sich anmelden.
            </Typography>
          </Alert>
        </CardSection>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ThemeSettings; 