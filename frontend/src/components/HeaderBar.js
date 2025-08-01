import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Box,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
  Avatar
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle as AccountIcon, 
  Settings as SettingsIcon, 
  ArrowBack as ArrowBackIcon, 
  ArrowForward as ArrowForwardIcon, 
  Add as AddIcon, 
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  LightMode as LightModeIcon, 
  DarkMode as DarkModeIcon, 
  SettingsBrightness as AutoModeIcon,
  WbSunny as SunIcon,
  NightsStay as MoonIcon,
  BrightnessAuto as AutoIcon,
  Keyboard as KeyboardIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { getUserInitials, getUserFullName } from '../services/auth';
import UserAvatar from './common/UserAvatar';
import NotificationBell from './common/NotificationBell';
import themeService, { THEME_MODES } from '../services/themeService';
import { KeyboardShortcutsDialog, useKeyboardShortcuts } from './common/KeyboardShortcuts';

function HeaderBar({ toggleDrawer, title, showAddIcon }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [userInitials, setUserInitials] = useState('U');
  const [userFullName, setUserFullName] = useState('Unbekannter Benutzer');
  const [themeMode, setThemeMode] = useState(themeService.getCurrentThemeMode());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Benutzerinformationen und Theme beim Mounten laden
  useEffect(() => {
    const loadUserInfo = () => {
      const initials = getUserInitials();
      const fullName = getUserFullName();
      setUserInitials(initials);
      setUserFullName(fullName);
    };

    const loadThemeInfo = () => {
      setThemeMode(themeService.getCurrentThemeMode());
    };

    loadUserInfo();
    loadThemeInfo();
    
    // Event Listener für Storage-Änderungen (falls sich Benutzerdaten ändern)
    const handleStorageChange = (e) => {
      if (e.key === 'userProfile') {
        loadUserInfo();
      }
      if (e.key === 'themeSettings') {
        loadThemeInfo();
      }
    };

    // Theme-Listener
    const unsubscribeTheme = themeService.addListener(() => {
      loadThemeInfo();
    });

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeTheme();
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleThemeToggle = async () => {
    const currentMode = themeService.getCurrentThemeMode();
    let newMode;
    
    if (currentMode === THEME_MODES.LIGHT) {
      newMode = THEME_MODES.DARK;
    } else if (currentMode === THEME_MODES.DARK) {
      newMode = THEME_MODES.AUTO;
    } else {
      newMode = THEME_MODES.LIGHT;
    }
    
    await themeService.setThemeMode(newMode);
  };

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    'F1': () => setShortcutsOpen(true),
    'Ctrl+H': () => navigate('/'),
    'Ctrl+R': () => window.location.reload(),
    'Escape': () => setShortcutsOpen(false),
  });

  const getThemeIcon = () => {
    const currentMode = themeService.getCurrentThemeMode();
    const effectiveMode = themeService.getEffectiveThemeMode();
    
    // Für Auto-Modus zeigen wir das aktuelle effektive Theme an
    if (currentMode === THEME_MODES.AUTO) {
      switch (effectiveMode) {
        case THEME_MODES.DARK:
          return <MoonIcon />;
        case THEME_MODES.LIGHT:
          return <SunIcon />;
        default:
          return <AutoIcon />;
      }
    }
    
    // Für explizite Modi zeigen wir das gewählte Theme
    switch (currentMode) {
      case THEME_MODES.DARK:
        return <DarkModeIcon />;
      case THEME_MODES.LIGHT:
        return <LightModeIcon />;
      default:
        return <AutoIcon />;
    }
  };

  const getThemeTooltip = () => {
    const currentMode = themeService.getCurrentThemeMode();
    const effectiveMode = themeService.getEffectiveThemeMode();
    
    switch (currentMode) {
      case THEME_MODES.DARK:
        return 'Zu hellem Theme wechseln';
      case THEME_MODES.LIGHT:
        return 'Zu automatischem Theme wechseln (folgt System-Einstellung)';
      case THEME_MODES.AUTO:
        const timeInfo = effectiveMode === THEME_MODES.DARK ? ' (Nacht-Modus aktiv)' : ' (Tag-Modus aktiv)';
        return `Automatisches Theme aktiv${timeInfo} - Zu dunklem Theme wechseln`;
      default:
        return 'Theme wechseln';
    }
  };

  const getAddIconPath = () => {
    if (title === "Patienten") return "/patients/new";
    if (title === "Verordnungen") return "/prescriptions/new";
    if (title === "Heilmittel") return "/treatments/new";
    if (title === "Kalender" || title === "Termin-Details" || title === "Termin-Liste") return "/appointments/new";
    if (title === "Verordnung-Details") return "/prescriptions/new";
    if (title === "Patient-Details") return "/patients/new";
    if (title === "Heilmittel-Details") return "/treatments/new";
    if (title === "Raum-Details") return "/rooms/new";
    if (title === "Behandler-Details") return "/practitioners/new";
    return "/";
  };

  return (
    <>
      <AppBar 
        position="fixed"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
      <Toolbar sx={{ 
        minHeight: { xs: 56, sm: 64 },
        px: { xs: 1, sm: 2 },
        gap: 1
      }}>
        {/* Menu Button */}
        <Tooltip title="Menü öffnen">
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="menu" 
            onClick={toggleDrawer}
            sx={{ 
              mr: { xs: 1, sm: 2 },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }} 
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Zurück">
            <IconButton 
              color="inherit" 
              aria-label="back" 
              onClick={() => navigate(-1)}
              sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Vorwärts">
            <IconButton 
              color="inherit" 
              aria-label="forward" 
              onClick={() => navigate(+1)}
              sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ArrowForwardIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Refresh Button */}
        <Tooltip title="Aktualisieren">
          <IconButton
            color="inherit"
            onClick={handleRefresh}
            sx={{ 
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        {/* Title - Responsive */}
        <Typography 
          variant={isMobile ? "h6" : "h5"}
          component="h1"
          sx={{ 
            flexGrow: 1,
            textAlign: { xs: 'center', sm: 'left' },
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            ml: { xs: 0, sm: 2 }
          }}
        >
          {title}
        </Typography>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Add Icon - conditionally rendered */}
          {showAddIcon && (
            <Tooltip title="Neu hinzufügen">
              <IconButton
                color="inherit"
                onClick={() => navigate(getAddIconPath())}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Keyboard Shortcuts */}
          <Tooltip title="Keyboard Shortcuts (F1)">
            <IconButton
              color="inherit"
              onClick={() => setShortcutsOpen(true)}
              sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <KeyboardIcon />
            </IconButton>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={getThemeTooltip()}>
            <IconButton
              color="inherit"
              onClick={handleThemeToggle}
              sx={{ 
                position: 'relative',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                // Spezielle Styling für Auto-Modus
                ...(themeService.getCurrentThemeMode() === THEME_MODES.AUTO && {
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: themeService.getEffectiveThemeMode() === THEME_MODES.DARK ? '#fbbf24' : '#3b82f6',
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  }
                })
              }}
            >
              {getThemeIcon()}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <Tooltip title={`${userFullName} - Benutzer-Menü`}>
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <UserAvatar 
                size="small"
                variant="header"
                showTooltip={false}
              />
            </IconButton>
          </Tooltip>
        </Box>

        {/* User Menu Dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
            }
          }}
        >
          <MenuItem 
            onClick={() => { navigate('/profile'); handleMenuClose(); }}
            sx={{ 
              py: 1.5,
              '&:hover': {
                backgroundColor: theme.palette.primary[50],
              }
            }}
          >
            <AccountIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            Profil
          </MenuItem>
          <MenuItem 
            onClick={() => { navigate('/settings'); handleMenuClose(); }}
            sx={{ 
              py: 1.5,
              '&:hover': {
                backgroundColor: theme.palette.primary[50],
              }
            }}
          >
            <SettingsIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            Einstellungen
          </MenuItem>
          <MenuItem 
            onClick={() => { navigate('/theme-settings'); handleMenuClose(); }}
            sx={{ 
              py: 1.5,
              '&:hover': {
                backgroundColor: theme.palette.primary[50],
              }
            }}
          >
            <AutoModeIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            Theme-Einstellungen
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>

    {/* Keyboard Shortcuts Dialog */}
    <KeyboardShortcutsDialog 
      open={shortcutsOpen} 
      onClose={() => setShortcutsOpen(false)} 
    />
  </>
  );
}

export default HeaderBar;
