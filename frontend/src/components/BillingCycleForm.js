import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import axios from 'axios';

function BillingCycleForm() {
  const [formData, setFormData] = useState({
    cycle_start: '',
    cycle_end: '',
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
      await axios.post('http://localhost:8000/api/billing-cycles/', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      alert('Billing cycle created successfully!');
    } catch (error) {
      console.error('Error creating billing cycle:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: '600px', mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Create Billing Cycle
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Start Date"
          type="date"
          name="cycle_start"
          value={formData.cycle_start}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="End Date"
          type="date"
          name="cycle_end"
          value={formData.cycle_end}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
        />

        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Submit Billing Cycle
        </Button>
      </form>
    </Box>
  );
}

export default BillingCycleForm;
