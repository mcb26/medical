import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

function LocalHolidayDetail() {
  const [holiday, setHoliday] = useState(null);
  const [bundesland, setBundesland] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const holidayResponse = await api.get(`/local-holidays/${id}/`);
        setHoliday(holidayResponse.data);
        
        if (holidayResponse.data.bundesland) {
          const bundeslandResponse = await api.get(`/bundesland/${holidayResponse.data.bundesland}/`);
          setBundesland(bundeslandResponse.data);
        }
        
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden des Feiertags');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!holiday) return <Typography>Feiertag nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Feiertag Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Name:</strong> {holiday.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Datum:</strong> {
                format(new Date(holiday.date), 'dd. MMMM yyyy', { locale: de })
              }
            </Typography>
          </Grid>
          {bundesland && (
            <Grid item xs={12}>
              <Typography>
                <strong>Bundesland:</strong> {bundesland.name}
              </Typography>
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography>
              <strong>Beschreibung:</strong> {holiday.description || 'Keine Beschreibung verfügbar'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/local-holidays/${id}/edit`)}
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

export default LocalHolidayDetail; 