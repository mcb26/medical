import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';
import api from '../api/axios';

function SurchargeEdit() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    percentage: '',
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurcharge = async () => {
      try {
        const response = await api.get(`/surcharges/${id}/`);
        setFormData(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden des Zuschlags');
        setLoading(false);
      }
    };

    fetchSurcharge();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        percentage: parseFloat(formData.percentage) || 0
      };
      await api.put(`/surcharges/${id}/`, dataToSubmit);
      navigate(`/surcharges/${id}`);
    } catch (error) {
      setError('Fehler beim Aktualisieren des Zuschlags');
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value
    }));
  };

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Zuschlag bearbeiten
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Betrag (€)"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                inputProps={{ step: "0.01" }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prozentsatz (%)"
                name="percentage"
                type="number"
                value={formData.percentage}
                onChange={handleChange}
                inputProps={{ step: "0.01", min: "0", max: "100" }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleChange}
                    name="is_active"
                  />
                }
                label="Aktiv"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  sx={{ mr: 1 }}
                >
                  Speichern
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(`/surcharges/${id}`)}
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

export default SurchargeEdit; 