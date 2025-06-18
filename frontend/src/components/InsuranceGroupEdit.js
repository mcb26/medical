import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import api from '../api/axios';

function InsuranceGroupEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [providers, setProviders] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupResponse, providersResponse, allProvidersResponse] = await Promise.all([
        api.get(`/insurance-provider-groups/${id}/`),
        api.get(`/insurance-providers/?group=${id}`),
        api.get('/insurance-providers/')
      ]);
      
      setFormData(groupResponse.data);
      setProviders(providersResponse.data);
      
      // Filtere die verfügbaren Provider (die noch nicht in der Gruppe sind)
      const groupProviderIds = providersResponse.data.map(p => p.id);
      setAvailableProviders(
        allProvidersResponse.data.filter(p => !groupProviderIds.includes(p.id))
      );
      
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setError('Fehler beim Laden der Gruppendaten');
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.put(`/insurance-provider-groups/${id}/`, formData);
      navigate(`/insurance-groups/${id}`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren der Gruppe');
    }
  };

  const handleAddProvider = async () => {
    if (!selectedProvider) return;
    
    try {
      await api.patch(`/insurance-providers/${selectedProvider.id}/`, {
        group: parseInt(id)
      });
      setSelectedProvider(null);
      fetchData(); // Aktualisiere die Listen
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Krankenkasse:', error);
      setError('Fehler beim Hinzufügen der Krankenkasse zur Gruppe');
    }
  };

  const handleRemoveProvider = async (providerId) => {
    try {
      await api.patch(`/insurance-providers/${providerId}/`, {
        group: null
      });
      fetchData(); // Aktualisiere die Listen
    } catch (error) {
      console.error('Fehler beim Entfernen der Krankenkasse:', error);
      setError('Fehler beim Entfernen der Krankenkasse aus der Gruppe');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Krankenkassengruppe bearbeiten
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  name="description"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>
              Krankenkassen verwalten
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={9}>
                <Autocomplete
                  value={selectedProvider}
                  onChange={(event, newValue) => {
                    setSelectedProvider(newValue);
                  }}
                  options={availableProviders}
                  getOptionLabel={(option) => `${option.name} (${option.provider_id})`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Krankenkasse hinzufügen"
                      placeholder="Krankenkasse auswählen..."
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddProvider}
                  disabled={!selectedProvider}
                  startIcon={<AddIcon />}
                  sx={{ height: '56px' }}
                >
                  Hinzufügen
                </Button>
              </Grid>
            </Grid>

            <List>
              {providers.map((provider) => (
                <ListItem
                  key={provider.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <ListItemText
                    primary={provider.name}
                    secondary={provider.provider_id}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Aus Gruppe entfernen">
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveProvider(provider.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/insurance-groups/${id}`)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Speichern
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default InsuranceGroupEdit; 