import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Bar' },
  { value: 'bank_transfer', label: 'Überweisung' },
  { value: 'card', label: 'Karte' },
  { value: 'direct_debit', label: 'Lastschrift' },
  { value: 'check', label: 'Scheck' },
  { value: 'other', label: 'Sonstiges' }
];

const PAYMENT_TYPES = [
  { value: 'gkv_copay', label: 'GKV-Zuzahlung' },
  { value: 'private_invoice', label: 'Private Rechnung' },
  { value: 'self_pay', label: 'Selbstzahler' },
  { value: 'insurance_claim', label: 'Krankenkassen-Anspruch' },
  { value: 'prescription_payment', label: 'Verordnungszahlung' },
  { value: 'appointment_payment', label: 'Termin-Zahlung' },
  { value: 'other', label: 'Sonstiges' }
];

function PaymentBooking() {
  const [payments, setPayments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formData, setFormData] = useState({
    payment_date: new Date(),
    amount: '',
    payment_method: 'cash',
    payment_type: 'gkv_copay',
    reference_number: '',
    transaction_id: '',
    notes: '',
    patient_invoice: null,
    copay_invoice: null,
    private_invoice: null,
    prescription: null,
    appointment: null
  });
  const [allocationData, setAllocationData] = useState({
    prescription: null,
    appointment: null,
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsResponse, prescriptionsResponse, appointmentsResponse] = await Promise.all([
        api.get('/payments/'),
        api.get('/prescriptions/'),
        api.get('/appointments/')
      ]);
      
      setPayments(paymentsResponse.data);
      setPrescriptions(prescriptionsResponse.data);
      setAppointments(appointmentsResponse.data);
      setLoading(false);
    } catch (err) {
      setError('Fehler beim Laden der Daten');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPayment) {
        await api.put(`/payments/${editingPayment.id}/`, formData);
      } else {
        await api.post('/payments/', formData);
      }
      
      setDialogOpen(false);
      setEditingPayment(null);
      resetForm();
      fetchData();
    } catch (err) {
      setError('Fehler beim Speichern der Zahlung');
    }
  };

  const handleAllocationSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (allocationData.prescription) {
        await api.post(`/payments/${selectedPayment.id}/allocate_to_prescription/`, {
          prescription: allocationData.prescription,
          amount: allocationData.amount,
          notes: allocationData.notes
        });
      } else if (allocationData.appointment) {
        await api.post(`/payments/${selectedPayment.id}/allocate_to_appointment/`, {
          appointment: allocationData.appointment,
          amount: allocationData.amount,
          notes: allocationData.notes
        });
      }
      
      setAllocationDialogOpen(false);
      setSelectedPayment(null);
      resetAllocationForm();
      fetchData();
    } catch (err) {
      setError('Fehler beim Zuordnen der Zahlung');
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      payment_date: new Date(payment.payment_date),
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_type: payment.payment_type,
      reference_number: payment.reference_number || '',
      transaction_id: payment.transaction_id || '',
      notes: payment.notes || '',
      patient_invoice: payment.patient_invoice,
      copay_invoice: payment.copay_invoice,
      private_invoice: payment.private_invoice,
      prescription: payment.prescription,
      appointment: payment.appointment
    });
    setDialogOpen(true);
  };

  const handleAllocate = (payment) => {
    setSelectedPayment(payment);
    setAllocationDialogOpen(true);
  };

  const handleDelete = async (paymentId) => {
    if (window.confirm('Zahlung wirklich löschen?')) {
      try {
        await api.delete(`/payments/${paymentId}/`);
        fetchData();
      } catch (err) {
        setError('Fehler beim Löschen der Zahlung');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      payment_date: new Date(),
      amount: '',
      payment_method: 'cash',
      payment_type: 'gkv_copay',
      reference_number: '',
      transaction_id: '',
      notes: '',
      patient_invoice: null,
      copay_invoice: null,
      private_invoice: null,
      prescription: null,
      appointment: null
    });
  };

  const resetAllocationForm = () => {
    setAllocationData({
      prescription: null,
      appointment: null,
      amount: '',
      notes: ''
    });
  };

  const openNewDialog = () => {
    setEditingPayment(null);
    resetForm();
    setDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'created': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPaymentReference = (payment) => {
    if (payment.patient_invoice) return `Rechnung ${payment.patient_invoice.invoice_number}`;
    if (payment.copay_invoice) return `Zuzahlung ${payment.copay_invoice.invoice_number}`;
    if (payment.private_invoice) return `Private ${payment.private_invoice.invoice_number}`;
    if (payment.prescription) return `Verordnung ${payment.prescription.id}`;
    if (payment.appointment) return `Termin ${payment.appointment.id}`;
    return 'Keine Zuordnung';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Einnahmen buchen
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewDialog}
          >
            Neue Zahlung
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Zahlungen Tabelle */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Zahlungseingänge
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Zuordnung</TableCell>
                  <TableCell align="right">Betrag</TableCell>
                  <TableCell align="right">Zugeordnet</TableCell>
                  <TableCell align="right">Verbleibend</TableCell>
                  <TableCell>Zahlungsart</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>{payment.patient_name}</TableCell>
                    <TableCell>{getPaymentReference(payment)}</TableCell>
                    <TableCell align="right">
                      {parseFloat(payment.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(payment.allocated_amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(payment.remaining_amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.payment_method_display} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.payment_type_display} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.is_fully_allocated ? 'Vollständig zugeordnet' : 'Teilweise zugeordnet'} 
                        color={payment.is_fully_allocated ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Bearbeiten">
                        <IconButton size="small" onClick={() => handleEdit(payment)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Zuordnen">
                        <IconButton size="small" onClick={() => handleAllocate(payment)}>
                          <AssignmentIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton size="small" onClick={() => handleDelete(payment.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Zahlung Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingPayment ? 'Zahlung bearbeiten' : 'Neue Zahlung'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Zahlungsdatum"
                    value={formData.payment_date}
                    onChange={(newValue) => setFormData({ ...formData, payment_date: newValue })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Betrag (€)"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    inputProps={{ step: "0.01", min: "0" }}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Zahlungsart</InputLabel>
                    <Select
                      value={formData.payment_method}
                      label="Zahlungsart"
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Zahlungstyp</InputLabel>
                    <Select
                      value={formData.payment_type}
                      label="Zahlungstyp"
                      onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                    >
                      {PAYMENT_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Referenznummer"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Transaktions-ID"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notizen"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingPayment ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Zuordnungs-Dialog */}
        <Dialog open={allocationDialogOpen} onClose={() => setAllocationDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Zahlung zuordnen
          </DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Zahlung: {selectedPayment.amount}€ - {selectedPayment.patient_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Verbleibender Betrag: {selectedPayment.remaining_amount}€
                </Typography>
              </Box>
            )}
            
            <Box component="form" onSubmit={handleAllocationSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Verordnung auswählen</InputLabel>
                    <Select
                      value={allocationData.prescription || ''}
                      label="Verordnung auswählen"
                      onChange={(e) => setAllocationData({ 
                        ...allocationData, 
                        prescription: e.target.value,
                        appointment: null 
                      })}
                    >
                      <MenuItem value="">
                        <em>Keine Verordnung</em>
                      </MenuItem>
                      {prescriptions.map((prescription) => (
                        <MenuItem key={prescription.id} value={prescription.id}>
                          Verordnung {prescription.id} - {prescription.patient}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Termin auswählen</InputLabel>
                    <Select
                      value={allocationData.appointment || ''}
                      label="Termin auswählen"
                      onChange={(e) => setAllocationData({ 
                        ...allocationData, 
                        appointment: e.target.value,
                        prescription: null 
                      })}
                    >
                      <MenuItem value="">
                        <em>Kein Termin</em>
                      </MenuItem>
                      {appointments.map((appointment) => (
                        <MenuItem key={appointment.id} value={appointment.id}>
                          Termin {appointment.id} - {appointment.patient} ({new Date(appointment.appointment_date).toLocaleDateString('de-DE')})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Zuzuordnender Betrag (€)"
                    type="number"
                    value={allocationData.amount}
                    onChange={(e) => setAllocationData({ ...allocationData, amount: e.target.value })}
                    inputProps={{ step: "0.01", min: "0", max: selectedPayment?.remaining_amount }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notizen zur Zuordnung"
                    multiline
                    rows={3}
                    value={allocationData.notes}
                    onChange={(e) => setAllocationData({ ...allocationData, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAllocationDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAllocationSubmit} variant="contained">
              Zuordnen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default PaymentBooking; 