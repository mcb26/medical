import React, { useState, useEffect } from 'react';
import { Box, TextField, MenuItem, Button, Typography } from '@mui/material';
import api from '../api/axios';

function PaymentForm() {
  const [invoices, setInvoices] = useState([]);
  const [formData, setFormData] = useState({
    invoice: '',
    amount: '',
    payment_method: 'cash',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices/');
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
      await api.post('/payments/', formData);
      alert('Payment created successfully!');
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: '600px', mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Create Payment
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          select
          label="Invoice"
          name="invoice"
          value={formData.invoice}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        >
          {invoices.map((invoice) => (
            <MenuItem key={invoice.id} value={invoice.id}>
              Invoice #{invoice.invoice_number} - Amount: {invoice.amount}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Amount"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />

        <TextField
          select
          label="Payment Method"
          name="payment_method"
          value={formData.payment_method}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        >
          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
          <MenuItem value="credit_card">Credit Card</MenuItem>
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>

        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Submit Payment
        </Button>
      </form>
    </Box>
  );
}

export default PaymentForm;
