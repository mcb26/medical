import React, { useState, useEffect, useCallback } from 'react';
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
  Grid,
  TextField,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { format } from 'date-fns';
import api from '../api/axios';

const CopayInvoiceManager = () => {
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filter-States
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    patientId: ''
  });
  
  // Dialog-States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createData, setCreateData] = useState({
    startDate: null,
    endDate: null,
    patientId: '',
    dueDateDays: 30
  });
  
  // Statistiken
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalCopay: 0
  });

  const fetchPendingAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('start_date', format(filters.startDate, 'dd.MM.yyyy'));
      if (filters.endDate) params.append('end_date', format(filters.endDate, 'dd.MM.yyyy'));
      if (filters.patientId) params.append('patient_id', filters.patientId);
      
      const response = await api.get(`/copay-invoices/pending/?${params}`);
      setPendingAppointments(response.data.appointments);
      setStats({
        totalAppointments: response.data.total_appointments,
        totalCopay: response.data.total_copay
      });
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der ausstehenden Zuzahlungen:', error);
      setError('Fehler beim Laden der ausstehenden Zuzahlungen');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPendingAppointments();
  }, [fetchPendingAppointments]);

  const handleCreateInvoices = async () => {
    try {
      setLoading(true);
      const requestData = {
        start_date: createData.startDate ? format(createData.startDate, 'dd.MM.yyyy') : null,
        end_date: createData.endDate ? format(createData.endDate, 'dd.MM.yyyy') : null,
        patient_id: createData.patientId || null,
        due_date_days: createData.dueDateDays
      };
      
      const response = await api.post('/copay-invoices/create/', requestData);
      
      setSuccess(response.data.message);
      setCreateDialogOpen(false);
      fetchPendingAppointments(); // Aktualisiere die Liste
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Zuzahlungsrechnungen:', error);
      setError('Fehler beim Erstellen der Zuzahlungsrechnungen');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromBillingItems = async () => {
    try {
      setLoading(true);
      const requestData = {
        start_date: createData.startDate ? format(createData.startDate, 'dd.MM.yyyy') : null,
        end_date: createData.endDate ? format(createData.endDate, 'dd.MM.yyyy') : null,
        patient_id: createData.patientId || null,
        due_date_days: createData.dueDateDays
      };
      
      const response = await api.post('/copay-invoices/create-from-billing-items/', requestData);
      
      setSuccess(response.data.message);
      setCreateDialogOpen(false);
      fetchPendingAppointments(); // Aktualisiere die Liste
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Zuzahlungsrechnungen:', error);
      setError('Fehler beim Erstellen der Zuzahlungsrechnungen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Lade ausstehende Zuzahlungen...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Zuzahlungsrechnungen</Typography>
          <Box display="flex" gap={2}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchPendingAppointments}
              variant="outlined"
            >
              Aktualisieren
            </Button>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              variant="contained"
              color="primary"
            >
              Rechnungen erstellen
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Statistiken */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Ausstehende Termine
                </Typography>
                <Typography variant="h4">
                  {stats.totalAppointments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Gesamtzuzahlung
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {stats.totalCopay.toFixed(2)} €
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Von Datum"
                value={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Bis Datum"
                value={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Patient-ID (optional)"
                value={filters.patientId}
                onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
                placeholder="z.B. 123"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Tabelle der ausstehenden Termine */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Behandlung</TableCell>
                <TableCell>Termindatum</TableCell>
                <TableCell>Krankenkasse</TableCell>
                <TableCell>Zuzahlung</TableCell>
                <TableCell>KK-Betrag</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {appointment.patient_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {appointment.patient_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{appointment.treatment_name}</TableCell>
                  <TableCell>
                    {format(new Date(appointment.appointment_date), 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell>{appointment.insurance_provider}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${appointment.copay_amount.toFixed(2)} €`}
                      color="warning"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {appointment.insurance_amount.toFixed(2)} €
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {pendingAppointments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              Keine ausstehenden Zuzahlungen gefunden
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Alle Termine wurden bereits abgerechnet oder haben keine Zuzahlungen.
            </Typography>
          </Box>
        )}

        {/* Dialog für Rechnungserstellung */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Zuzahlungsrechnungen erstellen
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Von Datum (optional)"
                  value={createData.startDate}
                  onChange={(date) => setCreateData({ ...createData, startDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Bis Datum (optional)"
                  value={createData.endDate}
                  onChange={(date) => setCreateData({ ...createData, endDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Patient-ID (optional)"
                  value={createData.patientId}
                  onChange={(e) => setCreateData({ ...createData, patientId: e.target.value })}
                  placeholder="z.B. 123"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fälligkeit in Tagen"
                  type="number"
                  value={createData.dueDateDays}
                  onChange={(e) => setCreateData({ ...createData, dueDateDays: parseInt(e.target.value) || 30 })}
                  inputProps={{ min: 1, max: 365 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Hinweis:</strong> Es werden Rechnungen für alle ausstehenden Zuzahlungen im angegebenen Zeitraum erstellt.
                    {stats.totalAppointments > 0 && (
                      <><br />Aktuell: {stats.totalAppointments} Termine mit {stats.totalCopay.toFixed(2)}€ Zuzahlung</>
                    )}
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateFromBillingItems}
              variant="contained"
              color="secondary"
              disabled={loading}
            >
              Aus BillingItems erstellen
            </Button>
            <Button
              onClick={handleCreateInvoices}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              Rechnungen erstellen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default CopayInvoiceManager;
