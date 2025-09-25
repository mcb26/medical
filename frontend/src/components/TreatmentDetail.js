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
  Receipt as ReceiptIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
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

          {/* Selbstzahler-Informationen */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon color="primary" />
                  Selbstzahler
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Chip
                      label={treatment.is_self_pay ? 'Selbstzahler-Behandlung' : 'Keine Selbstzahler-Behandlung'}
                      color={treatment.is_self_pay ? 'warning' : 'default'}
                      sx={{ mb: 1 }}
                    />
                  </Grid>
                  {treatment.is_self_pay && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoneyIcon color="action" />
                        <Typography>
                          Preis: <strong>{treatment.self_pay_price} €</strong>
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* GKV-Abrechnung (LEGS-Code) */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon color="primary" />
                  GKV-Abrechnung (LEGS-Code)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Chip
                      label={treatment.is_gkv_billable ? 'GKV-abrechenbar' : 'Nicht GKV-abrechenbar'}
                      color={treatment.is_gkv_billable ? 'success' : 'default'}
                      icon={treatment.is_gkv_billable ? <CheckCircleIcon /> : <CancelIcon />}
                      sx={{ mb: 1 }}
                    />
                  </Grid>
                  {treatment.legs_code_display && treatment.legs_code_display !== 'Nicht definiert' && (
                    <>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CodeIcon color="action" />
                          <Typography>
                            LEGS-Code: <strong>{treatment.legs_code_display}</strong>
                          </Typography>
                        </Box>
                      </Grid>
                      {treatment.accounting_code && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            AC: {treatment.accounting_code} | TK: {treatment.tariff_indicator}
                          </Typography>
                        </Grid>
                      )}
                      {treatment.prescription_type_indicator && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Verordnungsart: {treatment.prescription_type_indicator}
                          </Typography>
                        </Grid>
                      )}
                      {treatment.is_telemedicine && (
                        <Grid item xs={12}>
                          <Chip
                            label="Telemedizinische Leistung"
                            color="info"
                            size="small"
                          />
                        </Grid>
                      )}
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
