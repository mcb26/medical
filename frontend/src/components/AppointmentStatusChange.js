import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  Schedule as PlannedIcon,
  Receipt as ReadyToBillIcon,
  Cancel as CancelledIcon,
  PersonOff as NoShowIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import api from '../api/axios';

// Status-Definitionen
const APPOINTMENT_STATUSES = {
  planned: {
    label: 'Geplant',
    color: 'primary',
    icon: PlannedIcon,
    description: 'Termin ist geplant und wartet auf Durchführung'
  },
  completed: {
    label: 'Abgeschlossen',
    color: 'success',
    icon: CompletedIcon,
    description: 'Termin wurde erfolgreich durchgeführt'
  },
  ready_to_bill: {
    label: 'Abrechnungsbereit',
    color: 'info',
    icon: ReadyToBillIcon,
    description: 'Termin kann abgerechnet werden'
  },
  billed: {
    label: 'Abgerechnet',
    color: 'secondary',
    icon: ReadyToBillIcon,
    description: 'Termin wurde bereits abgerechnet'
  },
  cancelled: {
    label: 'Storniert',
    color: 'error',
    icon: CancelledIcon,
    description: 'Termin wurde storniert'
  },
  no_show: {
    label: 'Nicht erschienen',
    color: 'warning',
    icon: NoShowIcon,
    description: 'Patient ist nicht zum Termin erschienen'
  }
};

// Status-Übergänge (welche Status sind von welchem aus erreichbar)
const STATUS_TRANSITIONS = {
  planned: ['completed', 'cancelled', 'no_show'],
  completed: ['ready_to_bill', 'cancelled'],
  ready_to_bill: ['billed', 'completed'],
  billed: ['ready_to_bill'], // Rückgängig machen möglich
  cancelled: ['planned'], // Reaktivierung möglich
  no_show: ['planned', 'cancelled'] // Reaktivierung oder Stornierung
};

const AppointmentStatusChange = ({ 
  appointment, 
  open, 
  onClose, 
  onStatusChange,
  variant = 'dialog', // 'dialog' oder 'menu'
  anchorEl = null,
  onMenuClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const currentStatus = appointment?.status || 'planned';
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  const currentStatusInfo = APPOINTMENT_STATUSES[currentStatus];

  const handleStatusChange = async (newStatus) => {
    if (!appointment) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.patch(`/appointments/${appointment.id}/`, {
        status: newStatus
      });

      setSuccess(true);
      
      // Callback für Parent-Komponente
      if (onStatusChange) {
        onStatusChange(response.data);
      }

      // Automatisch schließen nach kurzer Verzögerung
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      setError(error.response?.data?.message || 'Fehler beim Ändern des Status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const IconComponent = APPOINTMENT_STATUSES[status]?.icon || EditIcon;
    return <IconComponent fontSize="small" />;
  };

  // Dialog-Variante
  if (variant === 'dialog') {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6">Termin-Status ändern</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            {/* Aktueller Status */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Aktueller Status:
              </Typography>
              <Chip
                icon={getStatusIcon(currentStatus)}
                label={currentStatusInfo?.label}
                color={currentStatusInfo?.color}
                variant="filled"
                size="medium"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {currentStatusInfo?.description}
              </Typography>
            </Box>

            {/* Verfügbare Status-Änderungen */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status ändern zu:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {availableTransitions.map((status) => {
                  const statusInfo = APPOINTMENT_STATUSES[status];
                  return (
                    <Chip
                      key={status}
                      icon={getStatusIcon(status)}
                      label={statusInfo?.label}
                      color={statusInfo?.color}
                      variant="outlined"
                      onClick={() => handleStatusChange(status)}
                      disabled={loading}
                      sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    />
                  );
                })}
              </Stack>
              {availableTransitions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Keine Status-Änderungen verfügbar
                </Typography>
              )}
            </Box>

            {/* Fehler/Success Messages */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success">
                Status erfolgreich geändert!
              </Alert>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Menu-Variante (für Kalender-Events)
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem disabled>
        <ListItemIcon>
          {getStatusIcon(currentStatus)}
        </ListItemIcon>
        <ListItemText 
          primary={`Aktuell: ${currentStatusInfo?.label}`}
          secondary={currentStatusInfo?.description}
        />
      </MenuItem>
      
      {availableTransitions.length > 0 && (
        <MenuItem disabled>
          <ListItemText 
            primary="Status ändern zu:"
            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
          />
        </MenuItem>
      )}
      
      {availableTransitions.map((status) => {
        const statusInfo = APPOINTMENT_STATUSES[status];
        return (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={loading}
          >
            <ListItemIcon>
              {getStatusIcon(status)}
            </ListItemIcon>
            <ListItemText 
              primary={statusInfo?.label}
              secondary={statusInfo?.description}
            />
          </MenuItem>
        );
      })}
      
      {availableTransitions.length === 0 && (
        <MenuItem disabled>
          <ListItemText 
            primary="Keine Status-Änderungen verfügbar"
            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
          />
        </MenuItem>
      )}
    </Menu>
  );
};

export default AppointmentStatusChange;
