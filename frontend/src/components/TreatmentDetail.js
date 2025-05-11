import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Grid,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import {
  Timer as TimerIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Home as HomeIcon,
  Edit as EditIcon
} from '@mui/icons-material';

function TreatmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [treatment, setTreatment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/treatments/${id}/`);
        setTreatment(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!treatment) {
    return <Alert severity="info">Behandlung nicht gefunden</Alert>;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">
            {treatment.treatment_name}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Grunddaten */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Grunddaten
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CategoryIcon color="action" />
                    <Typography>
                      Kategorie: <strong>{treatment.category?.name || 'Keine Kategorie'}</strong>
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimerIcon color="action" />
                    <Typography>
                      Dauer: <strong>{treatment.duration_minutes} Minuten</strong>
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography>
                      Preis: <strong>{treatment.price} €</strong>
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Chip
                    label={treatment.insurance_coverage ? 'Kassenleistung' : 'Keine Kassenleistung'}
                    color={treatment.insurance_coverage ? 'success' : 'default'}
                    sx={{ mb: 1 }}
                  />
                </Grid>
                {treatment.description && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <DescriptionIcon color="action" sx={{ mt: 0.5 }} />
                      <Typography>{treatment.description}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Aktionsbuttons */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/treatments')}
            startIcon={<HomeIcon />}
          >
            Zurück
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/treatments/${id}/edit`)}
            startIcon={<EditIcon />}
          >
            Bearbeiten
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default TreatmentDetail;
