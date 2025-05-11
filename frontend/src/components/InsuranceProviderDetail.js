import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import api from '../api/axios';

function InsuranceProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProvider();
  }, [id]);

  const fetchProvider = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/insurance-providers/${id}/`);
      setProvider(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Krankenkasse:', error);
      setError('Fehler beim Laden der Krankenkassendetails');
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Krankenkasse löschen möchten?')) {
      try {
        await api.delete(`/insurance-providers/${id}/`);
        navigate('/insurance-providers');
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        setError('Fehler beim Löschen der Krankenkasse');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {provider.name}
              </Typography>
              <Chip
                icon={<BadgeIcon />}
                label={`ID: ${provider.provider_id}`}
                variant="outlined"
                sx={{ mr: 1 }}
              />
              {provider.group && (
                <Chip
                  icon={<BusinessIcon />}
                  label={provider.group.name}
                  variant="outlined"
                  color="primary"
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/insurance-providers/${id}/edit`)}
              >
                Bearbeiten
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
              >
                Löschen
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3}>
            {provider.address && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <LocationIcon color="action" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Adresse
                    </Typography>
                    <Typography>
                      {provider.address}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {provider.contact_person && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="action" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Ansprechpartner
                    </Typography>
                    <Typography>
                      {provider.contact_person}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {provider.phone_number && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon color="action" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Telefon
                    </Typography>
                    <Typography>
                      {provider.phone_number}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {provider.email && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon color="action" />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      E-Mail
                    </Typography>
                    <Typography>
                      {provider.email}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/insurance-providers')}
            >
              Zurück zur Übersicht
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default InsuranceProviderDetail;
