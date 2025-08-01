import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import api from '../api/axios';

function BillingCycleForm() {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/billing-cycles/', formData);
      alert('Abrechnungszyklus erfolgreich erstellt!');
    } catch (error) {
      console.error('Error creating billing cycle:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: '600px', mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Abrechnungszyklus erstellen
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Startdatum"
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Enddatum"
          type="date"
          name="end_date"
          value={formData.end_date}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
        />

        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Abrechnungszyklus erstellen
        </Button>
      </form>
    </Box>
  );
}

export default BillingCycleForm;
