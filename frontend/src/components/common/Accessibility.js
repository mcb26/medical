import React from 'react';
import {
  Box,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon
} from '@mui/icons-material';

// Skip Link für Keyboard Navigation
export const SkipLink = ({ targetId, children = "Zum Hauptinhalt springen" }) => {
  const theme = useTheme();

  return (
    <Button
      component="a"
      href={`#${targetId}`}
      sx={{
        position: 'absolute',
        top: -40,
        left: 6,
        zIndex: theme.zIndex.tooltip + 1,
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:focus': {
          top: 6,
        },
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        }
      }}
    >
      {children}
    </Button>
  );
};

// Keyboard Navigation Helper
export const useKeyboardNavigation = () => {
  const handleKeyDown = (event, actions) => {
    const { key, ctrlKey } = event;
    
    // Standard Navigation
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      actions.onEnter?.();
    }
    
    if (key === 'Escape') {
      event.preventDefault();
      actions.onEscape?.();
    }
    
    if (key === 'Tab') {
      actions.onTab?.(event);
    }
    
    // Arrow Navigation
    if (key === 'ArrowUp') {
      event.preventDefault();
      actions.onArrowUp?.();
    }
    
    if (key === 'ArrowDown') {
      event.preventDefault();
      actions.onArrowDown?.();
    }
    
    if (key === 'ArrowLeft') {
      event.preventDefault();
      actions.onArrowLeft?.();
    }
    
    if (key === 'ArrowRight') {
      event.preventDefault();
      actions.onArrowRight?.();
    }
    
    // Keyboard Shortcuts
    if (ctrlKey && key === 's') {
      event.preventDefault();
      actions.onSave?.();
    }
    
    if (ctrlKey && key === 'n') {
      event.preventDefault();
      actions.onNew?.();
    }
    
    if (ctrlKey && key === 'f') {
      event.preventDefault();
      actions.onSearch?.();
    }
  };

  return { handleKeyDown };
};

// Accessible Button mit Keyboard Support
export const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled = false,
  tooltip,
  ariaLabel,
  ...props 
}) => {
  const theme = useTheme();

  const button = (
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
      sx={{
        ...props.sx,
        '&:focus': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        }
      }}
    >
      {children}
    </Button>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {button}
    </Tooltip>
  ) : button;
};

// Accessible Icon Button
export const AccessibleIconButton = ({ 
  icon: Icon, 
  onClick, 
  tooltip, 
  ariaLabel,
  disabled = false,
  ...props 
}) => {
  const theme = useTheme();

  const iconButton = (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
      sx={{
        ...props.sx,
        '&:focus': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        }
      }}
    >
      <Icon />
    </IconButton>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {iconButton}
    </Tooltip>
  ) : iconButton;
};

// Screen Reader Only Text
export const ScreenReaderOnly = ({ children }) => (
  <Box
    component="span"
    sx={{
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    }}
  >
    {children}
  </Box>
);

// Live Region für dynamische Updates
export const LiveRegion = ({ 
  children, 
  role = "status", 
  ariaLive = "polite" 
}) => (
  <Box
    component="div"
    role={role}
    aria-live={ariaLive}
    aria-atomic="true"
    sx={{
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    }}
  >
    {children}
  </Box>
);

// Accessibility Info Panel
export const AccessibilityInfo = ({ isOpen, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: theme.zIndex.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          p: 3,
          maxWidth: isMobile ? '100%' : 600,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: theme.shadows[8]
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          <AccessibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Barrierefreiheit & Tastatur-Navigation
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          Diese Anwendung unterstützt vollständige Tastatur-Navigation und ist für Screen Reader optimiert.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Tastatur-Navigation:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li><strong>Tab:</strong> Zwischen Elementen navigieren</li>
            <li><strong>Enter/Leertaste:</strong> Elemente aktivieren</li>
            <li><strong>Pfeiltasten:</strong> In Listen und Menüs navigieren</li>
            <li><strong>Escape:</strong> Dialoge schließen</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Tastenkombinationen:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li><strong>Strg + S:</strong> Speichern</li>
            <li><strong>Strg + N:</strong> Neuer Eintrag</li>
            <li><strong>Strg + F:</strong> Suche</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Screen Reader Support:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Semantische HTML-Struktur</li>
            <li>ARIA-Labels für alle interaktiven Elemente</li>
            <li>Live-Regionen für dynamische Updates</li>
            <li>Skip-Links für schnelle Navigation</li>
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={onClose}
          fullWidth={isMobile}
        >
          Verstanden
        </Button>
      </Box>
    </Box>
  );
};

const AccessibilityComponents = {
  SkipLink,
  useKeyboardNavigation,
  AccessibleButton,
  AccessibleIconButton,
  ScreenReaderOnly,
  LiveRegion,
  AccessibilityInfo
};

export default AccessibilityComponents; 