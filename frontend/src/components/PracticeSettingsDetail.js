import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function PracticeSettingsDetail() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/practice-settings/');
        setSettings(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Praxiseinstellungen');
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!settings) return <Typography>Keine Einstellungen gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Praxiseinstellungen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Praxisname:</strong> {settings.practice_name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Adresse:</strong> {settings.address}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Telefon:</strong> {settings.phone}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>E-Mail:</strong> {settings.email}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Website:</strong> {settings.website}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate('/practice-settings/edit')}
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

export default PracticeSettingsDetail; 