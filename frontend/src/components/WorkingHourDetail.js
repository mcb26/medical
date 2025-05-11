import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

function WorkingHourDetail() {
  const [workingHour, setWorkingHour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkingHour = async () => {
      try {
        const response = await api.get(`/working-hours/${id}/`);
        setWorkingHour(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Arbeitszeit');
        setLoading(false);
      }
    };

    fetchWorkingHour();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!workingHour) return <Typography>Arbeitszeit nicht gefunden</Typography>;

  const weekdays = [
    'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Arbeitszeit Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Wochentag:</strong> {weekdays[workingHour.day_of_week]}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Startzeit:</strong> {workingHour.start_time} Uhr
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Endzeit:</strong> {workingHour.end_time} Uhr
            </Typography>
          </Grid>
          {workingHour.break_start_time && workingHour.break_end_time && (
            <>
              <Grid item xs={12}>
                <Typography>
                  <strong>Pausenzeit:</strong> {workingHour.break_start_time} - {workingHour.break_end_time} Uhr
                </Typography>
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <Typography>
              <strong>Gültig von:</strong> {
                format(new Date(workingHour.valid_from), 'dd.MM.yyyy', { locale: de })
              }
            </Typography>
          </Grid>
          {workingHour.valid_until && (
            <Grid item xs={12}>
              <Typography>
                <strong>Gültig bis:</strong> {
                  format(new Date(workingHour.valid_until), 'dd.MM.yyyy', { locale: de })
                }
              </Typography>
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography>
              <strong>Status:</strong> {workingHour.is_active ? 'Aktiv' : 'Inaktiv'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/working-hours/${id}/edit`)}
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

export default WorkingHourDetail; 