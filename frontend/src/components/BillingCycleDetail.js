import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

function BillingCycleDetail() {
  const [billingCycle, setBillingCycle] = useState(null);
  const [billingItems, setBillingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBillingCycle();
  }, [id]);

  const fetchBillingCycle = async () => {
    try {
      console.log('Fetching billing cycle:', id);
      const cycleResponse = await api.get(`/billing-cycles/${id}/`);
      console.log('Cycle data:', cycleResponse.data);
      setBillingCycle(cycleResponse.data);
      
      // Hole die Abrechnungspositionen
      const itemsResponse = await api.get(`/billing-cycles/${id}/items/`);
      console.log('Items data:', itemsResponse.data);
      setBillingItems(itemsResponse.data);
      
      setLoading(false);
    } catch (error) {
      console.error('Error details:', error.response || error);
      setError(`Fehler beim Laden der Abrechnungsdaten: ${error.message}`);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/billing-cycles/${id}/export/`, {
        responseType: 'blob'  // Wichtig für PDF-Download
      });
      
      // PDF-Download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Abrechnung_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Optional: Status aktualisieren
      fetchBillingCycle();
    } catch (error) {
      console.error('Fehler beim Export:', error);
      setError('Fehler beim Exportieren der Abrechnung');
    }
  };

  const formatCurrency = (value) => {
    // Konvertiert String zu Nummer und formatiert auf 2 Dezimalstellen
    const number = parseFloat(value);
    return isNaN(number) ? '0.00' : number.toFixed(2);
  };

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!billingCycle) return <Typography>Abrechnungszyklus nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4">Abrechnungszyklus Details</Typography>
              <Box>
                <Button 
                  variant="contained" 
                  onClick={handleExport}
                  sx={{ mr: 1 }}
                >
                  Exportieren
                </Button>
                <Button 
                  variant="outlined"
                  onClick={() => navigate('/billing-cycles')}
                >
                  Zurück
                </Button>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography>
              <strong>Krankenkasse:</strong> {billingCycle.insurance_provider_name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography>
              <strong>Zeitraum:</strong> {
                format(new Date(billingCycle.start_date), 'dd.MM.yyyy', { locale: de })
              } - {
                format(new Date(billingCycle.end_date), 'dd.MM.yyyy', { locale: de })
              }
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography>
              <strong>Gesamtbetrag:</strong> {billingCycle.total_amount?.toFixed(2)} €
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" sx={{ mb: 2 }}>Abrechnungspositionen</Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Datum</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Behandlung</TableCell>
              <TableCell>Betrag KK</TableCell>
              <TableCell>Zuzahlung</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billingItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {format(new Date(item.appointment_date), 'dd.MM.yyyy', { locale: de })}
                </TableCell>
                <TableCell>{item.patient_name}</TableCell>
                <TableCell>{item.treatment_name}</TableCell>
                <TableCell>{formatCurrency(item.insurance_amount)} €</TableCell>
                <TableCell>{formatCurrency(item.patient_copay)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default BillingCycleDetail; 