import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, Grid, Alert
} from '@mui/material';

function TreatmentNew() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    treatment_name: '',
    description: '',
    duration_minutes: 30,
    category: '',
    is_self_pay: false,
    self_pay_price: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      setError('Fehler beim Laden der Kategorien');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validierung
      if (!formData.treatment_name.trim()) {
        throw new Error('Behandlungsname ist erforderlich');
      }
      if (!formData.description.trim()) {
        throw new Error('Beschreibung ist erforderlich');
      }
      if (formData.duration_minutes <= 0) {
        throw new Error('Behandlungsdauer muss größer als 0 sein');
      }
      if (formData.is_self_pay && !formData.self_pay_price) {
        throw new Error('Für Selbstzahler-Behandlungen muss ein Preis angegeben werden');
      }

      const response = await api.post('/treatments/', formData);
      alert('Behandlung erfolgreich erstellt!');
      navigate('/treatments');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Erstellen der Behandlung';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Neue Behandlung erstellen
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Behandlungsname"
                name="treatment_name"
                value={formData.treatment_name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Kategorie"
                name="category"
                value={formData.category}
                onChange={handleChange}
                select
                fullWidth
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Behandlungsdauer (Minuten)"
                name="duration_minutes"
                type="number"
                value={formData.duration_minutes}
                onChange={handleChange}
                fullWidth
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Selbstzahler-Preis (€)"
                name="self_pay_price"
                type="number"
                value={formData.self_pay_price}
                onChange={handleChange}
                fullWidth
                disabled={!formData.is_self_pay}
                inputProps={{ 
                  min: 0, 
                  step: 0.01,
                  placeholder: formData.is_self_pay ? '0.00' : 'Nur für Selbstzahler'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Beschreibung"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="is_self_pay"
                  checked={formData.is_self_pay}
                  onChange={handleChange}
                  id="is_self_pay"
                />
                <label htmlFor="is_self_pay">
                  Selbstzahler-Behandlung (ohne Verordnung möglich)
                </label>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Erstelle...' : 'Behandlung erstellen'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/treatments')}
                >
                  Abbrechen
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

export default TreatmentNew;
