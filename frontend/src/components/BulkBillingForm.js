import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function BulkBillingForm() {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/billing-cycles/bulk/', formData);
      setSuccess('Massenabrechnung erfolgreich gestartet!');
      setTimeout(() => {
        navigate('/billing-cycles');
      }, 2000);
    } catch (error) {
      setError(
        error.response?.data?.error || 
        'Fehler beim Starten der Massenabrechnung'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Massenabrechnung erstellen
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Startdatum"
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            label="Enddatum"
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            sx={{ mb: 3 }}
            InputLabelProps={{ shrink: true }}
            required
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Massenabrechnung starten'
              )}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/billing-cycles')}
              disabled={loading}
            >
              Abbrechen
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default BulkBillingForm; 