import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Event,
  LocalHospital,
  PriorityHigh,
  Schedule,
  CheckCircle,
  Cancel,
  Warning
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/axios';
import { STATUS_LABELS, BUTTON_LABELS, MESSAGES } from '../constants/germanLabels';

function WaitlistManagement() {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    patient: '',
    treatment: '',
    practitioner: '',
    available_from: '',
    available_until: '',
    priority: 'medium',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [waitlistRes, patientsRes, practitionersRes, treatmentsRes] = await Promise.all([
        api.get('/waitlist/'),
        api.get('/patients/'),
        api.get('/practitioners/'),
        api.get('/treatments/')
      ]);

      setWaitlistEntries(waitlistRes.data);
      setPatients(patientsRes.data);
      setPractitioners(practitionersRes.data);
      setTreatments(treatmentsRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Warteliste:', error);
      setError('Fehler beim Laden der Warteliste');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEntry) {
        await api.put(`/waitlist/${editingEntry.id}/`, formData);
      } else {
        await api.post('/waitlist/', formData);
      }
      setDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError('Fehler beim Speichern des Wartelisten-Eintrags');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Wartelisten-Eintrag wirklich löschen?')) {
      try {
        await api.delete(`/waitlist/${id}/`);
        fetchData();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        setError('Fehler beim Löschen des Eintrags');
      }
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      patient: entry.patient,
      treatment: entry.treatment,
      practitioner: entry.practitioner,
      available_from: entry.available_from?.split('T')[0] || '',
      available_until: entry.available_until?.split('T')[0] || '',
      priority: entry.priority,
      notes: entry.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      patient: '',
      treatment: '',
      practitioner: '',
      available_from: '',
      available_until: '',
      priority: 'medium',
      notes: ''
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      medium: 'primary',
      high: 'warning',
      urgent: 'error'
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      waiting: 'default',
      offered: 'primary',
      accepted: 'success',
      declined: 'error',
      expired: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      waiting: 'Wartend',
      offered: 'Angeboten',
      accepted: 'Angenommen',
      declined: 'Abgelehnt',
      expired: 'Abgelaufen'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      urgent: 'Dringend'
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Absagen-Management</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingEntry(null);
              resetForm();
              setDialogOpen(true);
            }}
          >
            Patient auf Warteliste
          </Button>
        </Box>
      </Paper>

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
              <Typography variant="h6" color="primary">
                <Schedule sx={{ mr: 1 }} />
                Wartend
              </Typography>
              <Typography variant="h4">
                {waitlistEntries.filter(e => e.status === 'waiting').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                <PriorityHigh sx={{ mr: 1 }} />
                Dringend
              </Typography>
              <Typography variant="h4">
                {waitlistEntries.filter(e => e.priority === 'urgent').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                <CheckCircle sx={{ mr: 1 }} />
                Angeboten
              </Typography>
              <Typography variant="h4">
                {waitlistEntries.filter(e => e.status === 'offered').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                <Warning sx={{ mr: 1 }} />
                Abgelaufen
              </Typography>
              <Typography variant="h4">
                {waitlistEntries.filter(e => e.status === 'expired').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Wartelisten-Tabelle */}
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Behandlung</TableCell>
                <TableCell>Behandler</TableCell>
                <TableCell>Verfügbar von</TableCell>
                <TableCell>Verfügbar bis</TableCell>
                <TableCell>Priorität</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notizen</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {waitlistEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Person sx={{ mr: 1 }} />
                      {entry.patient_name || 'Unbekannt'}
                    </Box>
                  </TableCell>
                  <TableCell>{entry.treatment_name || 'Unbekannt'}</TableCell>
                  <TableCell>{entry.practitioner_name || 'Unbekannt'}</TableCell>
                  <TableCell>
                    {entry.available_from ? 
                      format(new Date(entry.available_from), 'dd.MM.yyyy', { locale: de }) : 
                      '-'
                    }
                  </TableCell>
                  <TableCell>
                    {entry.available_until ? 
                      format(new Date(entry.available_until), 'dd.MM.yyyy', { locale: de }) : 
                      '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getPriorityLabel(entry.priority)}
                      color={getPriorityColor(entry.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(entry.status)}
                      color={getStatusColor(entry.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {entry.notes ? (
                      <Tooltip title={entry.notes}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {entry.notes}
                        </Typography>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(entry)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(entry.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog für Bearbeitung/Erstellung */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEntry ? 'Wartelisten-Eintrag bearbeiten' : 'Patient auf Warteliste setzen'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Patient"
                  name="patient"
                  value={formData.patient}
                  onChange={(e) => setFormData({...formData, patient: e.target.value})}
                  required
                >
                  {patients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Behandlung"
                  name="treatment"
                  value={formData.treatment}
                  onChange={(e) => setFormData({...formData, treatment: e.target.value})}
                  required
                >
                  {treatments.map((treatment) => (
                    <MenuItem key={treatment.id} value={treatment.id}>
                      {treatment.treatment_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Behandler"
                  name="practitioner"
                  value={formData.practitioner}
                  onChange={(e) => setFormData({...formData, practitioner: e.target.value})}
                  required
                >
                  {practitioners.map((practitioner) => (
                    <MenuItem key={practitioner.id} value={practitioner.id}>
                      {practitioner.first_name} {practitioner.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Priorität"
                  name="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  required
                >
                  <MenuItem value="low">Niedrig</MenuItem>
                  <MenuItem value="medium">Mittel</MenuItem>
                  <MenuItem value="high">Hoch</MenuItem>
                  <MenuItem value="urgent">Dringend</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Verfügbar von"
                  name="available_from"
                  type="date"
                  value={formData.available_from}
                  onChange={(e) => setFormData({...formData, available_from: e.target.value})}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Verfügbar bis"
                  name="available_until"
                  type="date"
                  value={formData.available_until}
                  onChange={(e) => setFormData({...formData, available_until: e.target.value})}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notizen"
                  name="notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEntry ? 'Aktualisieren' : 'Auf Warteliste setzen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WaitlistManagement; 