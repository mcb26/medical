import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TextField, Button, Box, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function BillingCycleNew() {
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [formData, setFormData] = useState({
    insurance_provider: '',
    start_date: '',
    end_date: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchInsuranceProviders();
  }, []);

  const fetchInsuranceProviders = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await axios.get('http://localhost:8000/api/insurance-providers/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInsuranceProviders(response.data);
    } catch (error) {
      console.error('Error fetching insurance providers:', error.response?.data || error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      await axios.post('http://localhost:8000/api/billing-cycles/create/', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/billing-cycles');
    } catch (error) {
      console.error('Error creating billing cycle:', error.response?.data || error.message);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} p={3}>
      <Typography variant="h4" gutterBottom>
        Neue Abrechnung erstellen
      </Typography>
      <TextField
        select
        label="Krankenkasse"
        name="insurance_provider"
        value={formData.insurance_provider}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      >
        {insuranceProviders.map((provider) => (
          <MenuItem key={provider.id} value={provider.id}>
            {provider.name}
          </MenuItem>
        ))}
      </TextField>
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
      <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
        Abrechnung erstellen
      </Button>
    </Box>
  );
}

export default BillingCycleNew;
