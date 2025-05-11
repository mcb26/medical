import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../api/axios';

function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const defaultSettings = {
    general: {
      companyName: '',
      address: '',
      phone: '',
      email: '',
      logo: '',
      defaultLanguage: 'de',
      timeZone: 'Europe/Berlin'
    },
    therapy: {
      maxSessionsPerDay: 8,
      defaultSessionDuration: 45,
      allowOverlappingSessions: false,
      requireTherapyReport: false
    },
    notifications: {
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      reminderTimeBeforeSession: 24,
      sendConfirmationEmails: true
    },
    billing: {
      currency: 'EUR',
      taxRate: 19,
      invoicePrefix: 'INV-',
      paymentTerms: 30,
      enableAutomaticInvoicing: true
    }
  };
  
  const [settings, setSettings] = useState(defaultSettings);

  // Neuer State für Dialog
  const [resetDialog, setResetDialog] = useState(false);
  const [helpDialog, setHelpDialog] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/');
      console.log('API Response:', response.data);

      const mergedSettings = {
        general: { ...defaultSettings.general, ...response.data?.general },
        therapy: { ...defaultSettings.therapy, ...response.data?.therapy },
        notifications: { ...defaultSettings.notifications, ...response.data?.notifications },
        billing: { ...defaultSettings.billing, ...response.data?.billing }
      };

      setSettings(mergedSettings);
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      setError('Die Einstellungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Funktion zum Zurücksetzen auf Standardwerte
  const handleReset = () => {
    setSettings(defaultSettings);
    setResetDialog(false);
    setSuccess('Einstellungen wurden auf Standardwerte zurückgesetzt');
    setUnsavedChanges(true);
  };

  // Erweiterte handleChange Funktion
  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setUnsavedChanges(true);
  };

  // Warnung vor dem Verlassen bei ungespeicherten Änderungen
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  // Erweiterter handleSave
  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put('/settings/', settings);
      setSuccess('Einstellungen wurden erfolgreich gespeichert');
      setUnsavedChanges(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setError(`Fehler beim Speichern: ${error.response?.data?.message || 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Einstellungen</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Hilfe zu den Einstellungen">
            <IconButton onClick={() => setHelpDialog(true)}>
              <HelpIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Auf Standardwerte zurücksetzen">
            <IconButton onClick={() => setResetDialog(true)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {unsavedChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Es gibt ungespeicherte Änderungen
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Allgemein" />
          <Tab label="Therapie" />
          <Tab label="Benachrichtigungen" />
          <Tab label="Abrechnung" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Praxisname"
                  value={settings.general.companyName}
                  onChange={(e) => handleChange('general', 'companyName', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Adresse"
                  multiline
                  rows={3}
                  value={settings.general.address}
                  onChange={(e) => handleChange('general', 'address', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Telefon"
                  value={settings.general.phone}
                  onChange={(e) => handleChange('general', 'phone', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="E-Mail"
                  value={settings.general.email}
                  onChange={(e) => handleChange('general', 'email', e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maximale Behandlungen pro Tag"
                  value={settings.therapy.maxSessionsPerDay}
                  onChange={(e) => handleChange('therapy', 'maxSessionsPerDay', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Standard Behandlungsdauer (Minuten)"
                  value={settings.therapy.defaultSessionDuration}
                  onChange={(e) => handleChange('therapy', 'defaultSessionDuration', e.target.value)}
                  margin="normal"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.therapy.requireTherapyReport}
                      onChange={(e) => handleChange('therapy', 'requireTherapyReport', e.target.checked)}
                    />
                  }
                  label="Therapiebericht standardmäßig erforderlich"
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.enableEmailNotifications}
                      onChange={(e) => handleChange('notifications', 'enableEmailNotifications', e.target.checked)}
                    />
                  }
                  label="E-Mail-Benachrichtigungen aktivieren"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.enableSMSNotifications}
                      onChange={(e) => handleChange('notifications', 'enableSMSNotifications', e.target.checked)}
                    />
                  }
                  label="SMS-Benachrichtigungen aktivieren"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Erinnerung vor Termin (Stunden)"
                  value={settings.notifications.reminderTimeBeforeSession}
                  onChange={(e) => handleChange('notifications', 'reminderTimeBeforeSession', e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Währung"
                  value={settings.billing.currency}
                  onChange={(e) => handleChange('billing', 'currency', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Mehrwertsteuersatz (%)"
                  value={settings.billing.taxRate}
                  onChange={(e) => handleChange('billing', 'taxRate', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Rechnungspräfix"
                  value={settings.billing.invoicePrefix}
                  onChange={(e) => handleChange('billing', 'invoicePrefix', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Zahlungsziel (Tage)"
                  value={settings.billing.paymentTerms}
                  onChange={(e) => handleChange('billing', 'paymentTerms', e.target.value)}
                  margin="normal"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.billing.enableAutomaticInvoicing}
                      onChange={(e) => handleChange('billing', 'enableAutomaticInvoicing', e.target.checked)}
                    />
                  }
                  label="Automatische Rechnungserstellung aktivieren"
                />
              </Grid>
            </Grid>
          )}
        </Box>

        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading || !unsavedChanges}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {loading ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => fetchSettings()}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            Neu laden
          </Button>
        </Box>
      </Paper>

      {/* Reset Dialog */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Einstellungen zurücksetzen?
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen? 
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Abbrechen</Button>
          <Button onClick={handleReset} color="warning" variant="contained">
            Zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpDialog} onClose={() => setHelpDialog(false)} maxWidth="md">
        <DialogTitle>Hilfe zu den Einstellungen</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Allgemeine Einstellungen</Typography>
          <Typography paragraph>
            Hier können Sie grundlegende Informationen Ihrer Praxis festlegen...
          </Typography>
          
          <Typography variant="h6" gutterBottom>Therapie-Einstellungen</Typography>
          <Typography paragraph>
            Diese Einstellungen beeinflussen die Behandlungsplanung...
          </Typography>
          
          {/* Weitere Hilfetexte... */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Settings;
