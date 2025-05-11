import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function SurchargeDetail() {
  const [surcharge, setSurcharge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurcharge = async () => {
      try {
        const response = await api.get(`/surcharges/${id}/`);
        setSurcharge(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden des Zuschlags');
        setLoading(false);
      }
    };

    fetchSurcharge();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!surcharge) return <Typography>Zuschlag nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Zuschlag Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Name:</strong> {surcharge.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Beschreibung:</strong> {surcharge.description}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Betrag:</strong> {surcharge.amount} €
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Prozentsatz:</strong> {surcharge.percentage}%
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <strong>Status:</strong> {surcharge.is_active ? 'Aktiv' : 'Inaktiv'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/surcharges/${id}/edit`)}
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

export default SurchargeDetail; 