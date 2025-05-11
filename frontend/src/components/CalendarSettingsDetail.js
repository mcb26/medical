import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function CalendarSettingsDetail() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/calendar-settings/');
        setSettings(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Kalendereinstellungen');
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!settings) return <Typography>Keine Einstellungen gefunden</Typography>;

  const weekdays = [
    'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Kalendereinstellungen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Standard-Terminlänge:</strong> {settings.default_appointment_duration} Minuten
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Minimale Terminlänge:</strong> {settings.min_appointment_duration} Minuten
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Maximale Terminlänge:</strong> {settings.max_appointment_duration} Minuten
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Zeitraster:</strong> {settings.time_slot_duration} Minuten
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Arbeitstage:</strong> {
                settings.working_days
                  .map(day => weekdays[day])
                  .join(', ')
              }
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Standard-Arbeitszeiten:</strong>
            </Typography>
            <Typography>
              Von: {settings.default_day_start_time} Uhr
            </Typography>
            <Typography>
              Bis: {settings.default_day_end_time} Uhr
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate('/calendar-settings/edit')}
                sx={{ mr: 1 }}
              >
                Bearbeiten
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
      </Paper>
    </Box>
  );
}

export default CalendarSettingsDetail; 