import React, { useState, useEffect } from 'react';
import { Box, TextField, MenuItem, Button, Typography } from '@mui/material';
import axios from 'axios';

function CopaymentForm() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [formData, setFormData] = useState({
    prescription: '',
    co_payment: '',
  });

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/prescriptions/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/copayments/', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      alert('Co-payment created successfully!');
    } catch (error) {
      console.error('Error creating co-payment:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: '600px', mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Create Co-payment
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          select
          label="Prescription"
          name="prescription"
          value={formData.prescription}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        >
          {prescriptions.map((prescription) => (
            <MenuItem key={prescription.id} value={prescription.id}>
              {prescription.prescription_id} - Patient: {prescription.patient.first_name} {prescription.patient.last_name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Co-payment Amount"
          name="co_payment"
          value={formData.co_payment}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />

        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Submit Co-payment
        </Button>
      </form>
    </Box>
  );
}

export default CopaymentForm
