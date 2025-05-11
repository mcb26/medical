import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

function TreatmentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    treatment_name: '',
    duration_minutes: '',
    price: '',
    description: '',
    category: '',
    is_active: true
  });

  useEffect(() => {
    fetchTreatment();
  }, [id]);

  const fetchTreatment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/treatments/${id}/`);
      setFormData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Behandlung:', error);
      setError('Fehler beim Laden der Behandlungsdetails');
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

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
      await api.put(`/treatments/${id}/`, formData);
      navigate(`/treatments/${id}`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Behandlung:', error);
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren der Behandlung');
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        {/* Header */}
        <Typography variant="h6" sx={{ color: '#1976d2', mb: 2 }}>
          Behandlung bearbeiten
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Grunddaten
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        label="Behandlungsname"
                        name="treatment_name"
                        value={formData.treatment_name}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Dauer (Minuten)"
                        name="duration_minutes"
                        type="number"
                        value={formData.duration_minutes}
                        onChange={handleChange}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Preis (€)"
                        name="price"
                        type="number"
                        value={formData.price}
                        onChange={handleChange}
                        inputProps={{ min: 0, step: "0.01" }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Details
                  </Typography>
                  <Grid container spacing={2}>
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
                    <Grid item xs={12}>
                      <TextField
                        select
                        fullWidth
                        label="Kategorie"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                      >
                        <MenuItem value="">Keine Kategorie</MenuItem>
                        <MenuItem value="1">Physiotherapie</MenuItem>
                        <MenuItem value="2">Massage</MenuItem>
                        <MenuItem value="3">Manuelle Therapie</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Aktionsbuttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/treatments/${id}`)}
                    startIcon={<CancelIcon />}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                  >
                    Speichern
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default TreatmentEdit;
