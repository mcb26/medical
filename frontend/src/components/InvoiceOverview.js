import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { format } from 'date-fns';
import api from '../api/axios';

const InvoiceOverview = () => {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter-States
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    startDate: null,
    endDate: null
  });
  
  // Dialog-States
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_date: new Date(),
    payment_method: 'bank_transfer'
  });

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.startDate) params.append('start_date', format(filters.startDate, 'dd.MM.yyyy'));
      if (filters.endDate) params.append('end_date', format(filters.endDate, 'dd.MM.yyyy'));
      
      const response = await api.get(`/invoices/overview/?${params}`);
      setInvoices(response.data.invoices);
      setStats(response.data.stats);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error);
      setError('Fehler beim Laden der Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentBooking = async () => {
    try {
      await api.post('/invoices/mark-paid/', {
        invoice_id: selectedInvoice.id,
        payment_date: format(paymentData.payment_date, 'dd.MM.yyyy'),
        payment_method: paymentData.payment_method
      });
      
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices(); // Aktualisiere die Liste
      
    } catch (error) {
      console.error('Fehler beim Buchung der Zahlung:', error);
      setError('Fehler beim Buchung der Zahlung');
    }
  };

  const openDetailDialog = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/detail/`);
      setSelectedInvoice(response.data);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungsdetails:', error);
      setError('Fehler beim Laden der Rechnungsdetails');
    }
  };

  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const getStatusColor = (status, isOverdue) => {
    if (isOverdue) return 'error';
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'warning';
      case 'created': return 'info';
      case 'submitted': return 'primary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Bezahlt';
      case 'sent': return 'Gesendet';
      case 'created': return 'Erstellt';
      case 'submitted': return 'Eingereicht';
      case 'overdue': return 'Überfällig';
      default: return status;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'gkv_claim': return 'GKV-Anspruch';
      case 'copay_invoice': return 'GKV-Zuzahlung';
      case 'private_invoice': return 'Private Rechnung';
      default: return type;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return 'Bar';
      case 'bank_transfer': return 'Überweisung';
      case 'card': return 'Karte';
      case 'direct_debit': return 'Lastschrift';
      case 'check': return 'Scheck';
      case 'other': return 'Sonstiges';
      default: return method;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Lade Rechnungen...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Rechnungsübersicht</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchInvoices}
            variant="outlined"
          >
            Aktualisieren
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistiken */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Gesamt Rechnungen
                </Typography>
                <Typography variant="h4">
                  {stats.total_invoices || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Gesamtbetrag
                </Typography>
                <Typography variant="h4">
                  {(stats.total_amount || 0).toFixed(2)} €
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Bezahlt
                </Typography>
                <Typography variant="h4" color="success.main">
                  {(stats.paid_amount || 0).toFixed(2)} €
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.paid_percentage?.toFixed(1) || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Überfällig
                </Typography>
                <Typography variant="h4" color="error.main">
                  {(stats.overdue_amount || 0).toFixed(2)} €
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <FilterIcon />
            <Typography variant="h6">Filter</Typography>
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Typ</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                label="Typ"
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="gkv">GKV-Ansprüche</MenuItem>
                <MenuItem value="patient">GKV-Zuzahlungen</MenuItem>
                <MenuItem value="private">Private Rechnungen</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="created">Erstellt</MenuItem>
                <MenuItem value="sent">Gesendet</MenuItem>
                <MenuItem value="paid">Bezahlt</MenuItem>
                <MenuItem value="overdue">Überfällig</MenuItem>
              </Select>
            </FormControl>

            <DatePicker
              label="Von Datum"
              value={filters.startDate}
              onChange={(date) => setFilters({ ...filters, startDate: date })}
              renderInput={(params) => <TextField {...params} />}
            />

            <DatePicker
              label="Bis Datum"
              value={filters.endDate}
              onChange={(date) => setFilters({ ...filters, endDate: date })}
              renderInput={(params) => <TextField {...params} />}
            />
          </Box>
        </Paper>

        {/* Rechnungstabelle */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rechnungsnummer</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Krankenkasse</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell>Fällig bis</TableCell>
                <TableCell>Betrag</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Zahlung</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.invoice_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getTypeLabel(invoice.type)} 
                      size="small"
                      color={invoice.type === 'gkv_claim' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>{invoice.patient_name}</TableCell>
                  <TableCell>{invoice.insurance_provider}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell>
                    {invoice.due_date ? format(new Date(invoice.due_date), 'dd.MM.yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.amount.toFixed(2)} €
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(invoice.status)}
                      color={getStatusColor(invoice.status, invoice.is_overdue)}
                      size="small"
                      icon={invoice.is_overdue ? <WarningIcon /> : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    {invoice.payment_date ? (
                      <Box>
                        <Typography variant="body2">
                          {format(new Date(invoice.payment_date), 'dd.MM.yyyy')}
                        </Typography>
                        {invoice.payment_method && (
                          <Typography variant="caption" color="textSecondary">
                            {getPaymentMethodLabel(invoice.payment_method)}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Details anzeigen">
                        <IconButton
                          size="small"
                          onClick={() => openDetailDialog(invoice)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {invoice.type !== 'gkv_claim' && invoice.status !== 'paid' && (
                        <Tooltip title="Als bezahlt markieren">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openPaymentDialog(invoice)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Detail-Dialog */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Rechnungsdetails - {selectedInvoice?.invoice_number || selectedInvoice?.id}
          </DialogTitle>
          <DialogContent>
            {selectedInvoice && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Typ
                    </Typography>
                    <Typography variant="body1">
                      {getTypeLabel(selectedInvoice.type)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      {getStatusLabel(selectedInvoice.status)}
                    </Typography>
                  </Grid>
                  {selectedInvoice.patient && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Patient
                      </Typography>
                      <Typography variant="body1">
                        {selectedInvoice.patient}
                      </Typography>
                    </Grid>
                  )}
                  {selectedInvoice.insurance_provider && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Krankenkasse
                      </Typography>
                      <Typography variant="body1">
                        {selectedInvoice.insurance_provider}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Behandlungen
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Patient</TableCell>
                        <TableCell>Behandlung</TableCell>
                        <TableCell>Datum</TableCell>
                        <TableCell>Betrag</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.billing_items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.patient}</TableCell>
                          <TableCell>{item.treatment}</TableCell>
                          <TableCell>
                            {format(new Date(item.date), 'dd.MM.yyyy')}
                          </TableCell>
                          <TableCell>
                            {item.insurance_amount ? (
                              <>
                                {item.insurance_amount.toFixed(2)} € (KK)
                                {item.patient_copay > 0 && (
                                  <br />
                                )}
                                {item.patient_copay > 0 && (
                                  <span style={{ color: 'gray' }}>
                                    + {item.patient_copay.toFixed(2)} € (Patient)
                                  </span>
                                )}
                              </>
                            ) : (
                              `${item.total_amount?.toFixed(2) || item.patient_copay?.toFixed(2) || 0} €`
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>
              Schließen
            </Button>
          </DialogActions>
        </Dialog>

        {/* Zahlungs-Dialog */}
        <Dialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Zahlung buchen - {selectedInvoice?.invoice_number}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Rechnung: {selectedInvoice?.invoice_number}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Betrag: {selectedInvoice?.amount?.toFixed(2)} €
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <DatePicker
                  label="Zahlungsdatum"
                  value={paymentData.payment_date}
                  onChange={(date) => setPaymentData({ ...paymentData, payment_date: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Zahlungsart</InputLabel>
                  <Select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    label="Zahlungsart"
                  >
                    <MenuItem value="cash">Bar</MenuItem>
                    <MenuItem value="bank_transfer">Überweisung</MenuItem>
                    <MenuItem value="card">Karte</MenuItem>
                    <MenuItem value="direct_debit">Lastschrift</MenuItem>
                    <MenuItem value="check">Scheck</MenuItem>
                    <MenuItem value="other">Sonstiges</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handlePaymentBooking}
              variant="contained"
              color="success"
            >
              Zahlung buchen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default InvoiceOverview;
