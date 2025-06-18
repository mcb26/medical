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
  MenuItem
} from '@mui/material';
import api from '../api/axios';

function InsuranceProviderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    provider_id: '',
    group: '',
    address: '',
    phone_number: '',
    email: '',
    contact_person: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [providerResponse, groupsResponse] = await Promise.all([
        api.get(`/insurance-providers/${id}/`),
        api.get('/insurance-provider-groups/')
      ]);
      setFormData(providerResponse.data);
      setGroups(groupsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setError('Fehler beim Laden der Krankenkasse');
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
      await api.put(`/insurance-providers/${id}/`, formData);
      navigate('/insurance-providers');
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren der Krankenkasse');
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
          <Typography variant="h5" gutterBottom>
            Krankenkasse bearbeiten
          </Typography>

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

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Krankenkassen-ID"
                  name="provider_id"
                  value={formData.provider_id}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Gruppe"
                  name="group"
                  value={formData.group || ''}
                  onChange={handleChange}
                >
                  <MenuItem value="">Keine Gruppe</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adresse"
                  name="address"
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="E-Mail"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ansprechpartner"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/insurance-providers')}
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
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default InsuranceProviderEdit; 