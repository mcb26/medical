import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Keyboard as KeyboardIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Home as HomeIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

// Keyboard Shortcut Komponente
const ShortcutItem = ({ shortcut, description, icon: Icon }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {Icon && <Icon color="action" />}
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {shortcut.split('+').map((key, index) => (
          <Chip
            key={index}
            label={key.trim()}
            size="small"
            variant="filled"
            sx={{
              backgroundColor: theme.palette.grey[200],
              color: theme.palette.text.primary,
              fontWeight: 600,
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// Hauptkomponente
export const KeyboardShortcutsDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const shortcuts = [
    // Navigation
    { shortcut: 'Ctrl + H', description: 'Zur Startseite', icon: HomeIcon, category: 'Navigation' },
    { shortcut: 'Ctrl + ,', description: 'Einstellungen öffnen', icon: SettingsIcon, category: 'Navigation' },
    { shortcut: 'Alt + ←', description: 'Zurück', icon: NavigateBeforeIcon, category: 'Navigation' },
    { shortcut: 'Alt + →', description: 'Vorwärts', icon: NavigateNextIcon, category: 'Navigation' },
    
    // Aktionen
    { shortcut: 'Ctrl + N', description: 'Neuen Eintrag erstellen', icon: AddIcon, category: 'Aktionen' },
    { shortcut: 'Ctrl + S', description: 'Speichern', icon: SaveIcon, category: 'Aktionen' },
    { shortcut: 'Ctrl + E', description: 'Bearbeiten', icon: EditIcon, category: 'Aktionen' },
    { shortcut: 'Delete', description: 'Löschen', icon: DeleteIcon, category: 'Aktionen' },
    
    // Suche & Filter
    { shortcut: 'Ctrl + F', description: 'Suchen', icon: SearchIcon, category: 'Suche' },
    { shortcut: 'Ctrl + R', description: 'Aktualisieren', icon: RefreshIcon, category: 'Suche' },
    
    // Allgemein
    { shortcut: 'F1', description: 'Hilfe öffnen', icon: KeyboardIcon, category: 'Allgemein' },
    { shortcut: 'Esc', description: 'Dialog schließen', icon: CloseIcon, category: 'Allgemein' },
  ];

  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon color="primary" />
          <Typography variant="h6">Keyboard Shortcuts</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Verwenden Sie diese Tastenkombinationen für eine schnellere Bedienung der Anwendung.
        </Typography>
        
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={12} md={6} key={category}>
              <Typography variant="h6" sx={{ mb: 2, color: theme.palette.primary.main }}>
                {category}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {shortcuts
                  .filter(shortcut => shortcut.category === category)
                  .map((shortcut, index) => (
                    <ShortcutItem 
                      key={index} 
                      shortcut={shortcut.shortcut}
                      description={shortcut.description}
                      icon={shortcut.icon}
                    />
                  ))}
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} variant="contained">
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Hook für Keyboard Shortcuts
export const useKeyboardShortcuts = (shortcuts = {}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey;
      const alt = event.altKey;
      const shift = event.shiftKey;
      
      // Kombination erstellen
      const combination = [];
      if (ctrl) combination.push('Ctrl');
      if (alt) combination.push('Alt');
      if (shift) combination.push('Shift');
      if (key !== 'control' && key !== 'alt' && key !== 'shift') {
        combination.push(key.toUpperCase());
      }
      
      const shortcutKey = combination.join('+');
      
      // Shortcut ausführen
      if (shortcuts[shortcutKey]) {
        event.preventDefault();
        shortcuts[shortcutKey](event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Shortcut Button für Header
export const ShortcutsButton = ({ onClick }) => {
  return (
    <Tooltip title="Keyboard Shortcuts (F1)">
      <IconButton
        onClick={onClick}
        sx={{
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <KeyboardIcon />
      </IconButton>
    </Tooltip>
  );
};

export default KeyboardShortcutsDialog; 