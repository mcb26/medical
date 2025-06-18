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
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Timer as TimerIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  LocalHospital as InsuranceIcon,
  Receipt as ReceiptIcon
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
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            {treatment.treatment_name}
          </Typography>
          <Box>
            <Button
              variant="outlined"
              onClick={() => navigate('/treatments')}
              startIcon={<HomeIcon />}
              sx={{ mr: 1 }}
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
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Hauptinhalt */}
        <Grid container spacing={3}>
          {/* Grunddaten */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon color="primary" />
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
              </CardContent>
            </Card>
          </Grid>

          {/* Versicherungsinformationen */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InsuranceIcon color="primary" />
                  Versicherungsinformationen
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Chip
                      label={treatment.insurance_coverage ? 'Kassenleistung' : 'Keine Kassenleistung'}
                      color={treatment.insurance_coverage ? 'success' : 'default'}
                      sx={{ mb: 1 }}
                    />
                  </Grid>
                  {treatment.insurance_coverage && (
                    <>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ReceiptIcon color="action" />
                          <Typography>
                            GOÄ-Nummer: <strong>{treatment.goae_number || 'Nicht angegeben'}</strong>
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MoneyIcon color="action" />
                          <Typography>
                            Kassensatz: <strong>{treatment.insurance_rate || 'Nicht angegeben'}</strong>
                          </Typography>
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Beschreibung */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="primary" />
                  Beschreibung
                </Typography>
                {treatment.description ? (
                  <Typography>{treatment.description}</Typography>
                ) : (
                  <Typography color="text.secondary">Keine Beschreibung vorhanden</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default TreatmentDetail;
