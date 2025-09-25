import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import api from '../api/axios';

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

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
