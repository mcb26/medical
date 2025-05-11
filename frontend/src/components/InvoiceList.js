import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/invoices/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: '600px', mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Rechnungen
      </Typography>
      {invoices.map((invoice) => (
        <Box key={invoice.id} sx={{ mb: 2 }}>
          <Typography variant="h6">
            Rechnung {invoice.invoice_number}
          </Typography>
          <Typography>
            Betrag: {invoice.amount} - Bezahlt: {invoice.is_fully_paid ? 'Ja' : 'Nein'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default InvoiceList;
