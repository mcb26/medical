import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid, TextField, FormControlLabel, Switch } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import deLocale from 'date-fns/locale/de';
import api from '../api/axios';

function PracticeSettingsDetail() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/practice/instance/');
        setSettings(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Praxiseinstellungen');
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/practice/instance/', settings);
      setSuccess('Einstellungen erfolgreich gespeichert');
      setError('');
    } catch (error) {
      setError('Fehler beim Speichern der Einstellungen');
      setSuccess('');
    }
  };

  const handleOpeningHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day],
          [field]: value
        }
      }
    }));
  };

  const handleCalendarSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      calendar_settings: {
        ...prev.calendar_settings,
        [field]: value
      }
    }));
  };

  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date;
    } catch (error) {
      console.error('Fehler beim Parsen der Zeit:', error);
      return null;
    }
  };

  const formatTimeString = (date) => {
    if (!date) return '';
    try {
      return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Fehler beim Formatieren der Zeit:', error);
      return '';
    }
  };

  const handleTimeChange = (day, field, newValue) => {
    try {
      const timeString = newValue ? formatTimeString(newValue) : '';
      handleOpeningHoursChange(day, field, timeString);
    } catch (error) {
      console.error('Fehler bei der Zeitänderung:', error);
    }
  };

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!settings) return <Typography>Keine Einstellungen gefunden</Typography>;

  const weekdays = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag'
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Praxiseinstellungen
            </Typography>
                {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
                {success && <Typography color="success.main" sx={{ mb: 2 }}>{success}</Typography>}
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Allgemeine Informationen
                </Typography>
          </Grid>
              
          <Grid item xs={12}>
                <Typography><strong>Praxisname:</strong> {settings.name}</Typography>
          </Grid>
          <Grid item xs={12}>
                <Typography><strong>Adresse:</strong> {settings.street_address}, {settings.postal_code} {settings.city}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Telefon:</strong> {settings.phone}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>E-Mail:</strong> {settings.email}</Typography>
          </Grid>
              {settings.website && (
          <Grid item xs={12}>
            <Typography><strong>Website:</strong> {settings.website}</Typography>
          </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Öffnungszeiten
                </Typography>
              </Grid>

              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <Grid item xs={12} key={day}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={2}>
                        <Typography variant="subtitle1">
                          {weekdays[day]}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.opening_hours[day]?.open || false}
                              onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.checked)}
                            />
                          }
                          label="Geöffnet"
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TimePicker
                          label="Öffnet um"
                          value={parseTimeString(settings.opening_hours[day]?.start)}
                          onChange={(newValue) => handleTimeChange(day, 'start', newValue)}
                          disabled={!settings.opening_hours[day]?.open}
                          slotProps={{ 
                            textField: { 
                              fullWidth: true,
                              error: false
                            } 
                          }}
                          format="HH:mm"
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TimePicker
                          label="Schließt um"
                          value={parseTimeString(settings.opening_hours[day]?.end)}
                          onChange={(newValue) => handleTimeChange(day, 'end', newValue)}
                          disabled={!settings.opening_hours[day]?.open}
                          slotProps={{ 
                            textField: { 
                              fullWidth: true,
                              error: false
                            } 
                          }}
                          format="HH:mm"
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TimePicker
                          label="Pause von"
                          value={parseTimeString(settings.opening_hours[day]?.break_start)}
                          onChange={(newValue) => handleTimeChange(day, 'break_start', newValue)}
                          disabled={!settings.opening_hours[day]?.open}
                          slotProps={{ 
                            textField: { 
                              fullWidth: true,
                              error: false
                            } 
                          }}
                          format="HH:mm"
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TimePicker
                          label="Pause bis"
                          value={parseTimeString(settings.opening_hours[day]?.break_end)}
                          onChange={(newValue) => handleTimeChange(day, 'break_end', newValue)}
                          disabled={!settings.opening_hours[day]?.open}
                          slotProps={{ 
                            textField: { 
                              fullWidth: true,
                              error: false
                            } 
                          }}
                          format="HH:mm"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Kalendereinstellungen
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Standard-Terminlänge (Minuten)"
                  type="number"
                  value={settings.default_appointment_duration || 30}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      default_appointment_duration: parseInt(e.target.value)
                    }));
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.calendar_settings?.show_weekends || false}
                      onChange={(e) => handleCalendarSettingsChange('show_weekends', e.target.checked)}
                    />
                  }
                  label="Wochenenden im Kalender anzeigen"
                />
              </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                    type="submit"
                variant="contained" 
                sx={{ mr: 1 }}
              >
                    Speichern
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/dataoverview')}
              >
                Zurück
              </Button>
            </Box>
          </Grid>
          </Grid>
          </form>
      </Paper>
    </Box>
    </LocalizationProvider>
  );
}

export default PracticeSettingsDetail; 