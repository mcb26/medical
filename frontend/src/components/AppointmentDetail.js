import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, Grid, Card, CardContent, Chip, Divider, IconButton
} from '@mui/material';
import { Person, Event, AccessTime, LocalHospital, Room, Edit, Delete, Save, Cancel } from '@mui/icons-material';
import AppointmentSeriesForm from './AppointmentSeriesForm';

function AppointmentDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState({});

  useEffect(() => {
    const fetchAppointment = async () => {
      if (location.pathname === '/appointments/create_series') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/appointments/${id}/`);
        setAppointment(response.data);
        setFormState(response.data);
      } catch (error) {
        console.error('Fehler beim Laden des Termins:', error);
        if (error.response?.status === 404) {
          setError('Termin nicht gefunden.');
        } else {
          setError('Fehler beim Laden des Termins');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
    fetchDropdownData();
  }, [id, location]);

  const fetchDropdownData = async () => {
    try {
      const [patientsRes, practitionersRes, roomsRes, treatmentsRes] = await Promise.all([
        api.get('patients/'),
        api.get('practitioners/'),
        api.get('rooms/'),
        api.get('treatments/')
      ]);
      setPatients(patientsRes.data);
      setPractitioners(practitionersRes.data);
      setRooms(roomsRes.data);
      setTreatments(treatmentsRes.data);
    } catch (error) {
      setError('Error fetching dropdown data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await api.put(`appointments/${id}/`, formState, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Termin erfolgreich aktualisiert.');
      setEditMode(false);
      setAppointment(formState);
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error.response?.data || error.message);
      alert('Aktualisierung fehlgeschlagen.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Diesen Termin wirklich löschen?')) {
      try {
        const token = localStorage.getItem('accessToken');
        await api.delete(`appointments/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert('Termin gelöscht.');
        navigate('/calendar');
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Löschen fehlgeschlagen.');
      }
    }
  };

  if (location.pathname === '/appointments/create_series') {
    return <AppointmentSeriesForm />;
  }
  if (error) {
    return <Typography variant="h6">{error}</Typography>;
  }
  if (loading || !appointment) {
    return <Typography variant="h6">Lade Termindetails...</Typography>;
  }

  // Hilfsfunktionen für Anzeige
  const getPatientName = () => {
    if (appointment.patient_name) return appointment.patient_name;
    const p = patients.find((x) => x.id === appointment.patient);
    return p ? `${p.first_name} ${p.last_name}` : '';
  };
  const getPractitionerName = () => {
    if (appointment.practitioner_name) return appointment.practitioner_name;
    const pr = practitioners.find((x) => x.id === appointment.practitioner);
    return pr ? `${pr.first_name} ${pr.last_name}` : '';
  };
  const getRoomName = () => {
    if (appointment.room_name) return appointment.room_name;
    const r = rooms.find((x) => x.id === appointment.room);
    return r ? r.name : '';
  };
  const getTreatmentName = () => {
    if (appointment.treatment_name) return appointment.treatment_name;
    const t = treatments.find((x) => x.id === appointment.treatment);
    return t ? t.treatment_name : '';
  };
  const formatDateTime = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <Box sx={{ mx: 0 }}>
          {/* Header */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4">Termin-Details</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {appointment.series_identifier && (
                  <Button
                    variant="outlined"
                    color="primary"
                    component={Link}
                    to={`/appointments/series/${appointment.series_identifier}`}
                  >
                    Zur Terminserie
                  </Button>
                )}
                {!editMode ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={() => setEditMode(true)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={handleDelete}
                    >
                      Löschen
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Save />}
                      onClick={handleUpdate}
                    >
                      Speichern
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={() => setEditMode(false)}
                    >
                      Abbrechen
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Content */}
          <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              {!editMode ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary"><Person sx={{ mr: 1 }} fontSize="small"/>Patient</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{getPatientName()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary"><LocalHospital sx={{ mr: 1 }} fontSize="small"/>Behandler</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{getPractitionerName()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary"><Room sx={{ mr: 1 }} fontSize="small"/>Raum</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{getRoomName() || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary"><Event sx={{ mr: 1 }} fontSize="small"/>Behandlung</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{getTreatmentName()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary"><AccessTime sx={{ mr: 1 }} fontSize="small"/>Datum & Uhrzeit</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{formatDateTime(appointment.appointment_date)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Dauer</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{appointment.duration_minutes} Minuten</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip label={appointment.status} color={appointment.status === 'planned' ? 'info' : appointment.status === 'confirmed' ? 'success' : 'default'} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Notizen</Typography>
                    <Typography variant="body1">{appointment.notes || '–'}</Typography>
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Patient"
                      name="patient"
                      value={formState.patient || ''}
                      onChange={handleChange}
                      fullWidth
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
                      label="Behandler"
                      name="practitioner"
                      value={formState.practitioner || ''}
                      onChange={handleChange}
                      fullWidth
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
                      label="Raum"
                      name="room"
                      value={formState.room || ''}
                      onChange={handleChange}
                      fullWidth
                    >
                      {rooms.map((room) => (
                        <MenuItem key={room.id} value={room.id}>
                          {room.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Behandlung"
                      name="treatment"
                      value={formState.treatment || ''}
                      onChange={handleChange}
                      fullWidth
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
                      label="Datum & Uhrzeit"
                      type="datetime-local"
                      name="appointment_date"
                      value={formState.appointment_date ? formState.appointment_date.slice(0, 16) : ''}
                      onChange={handleChange}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Dauer (Minuten)"
                      name="duration_minutes"
                      value={formState.duration_minutes || ''}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Status"
                      name="status"
                      value={formState.status || ''}
                      onChange={handleChange}
                      fullWidth
                    >
                      <MenuItem value="planned">Geplant</MenuItem>
                      <MenuItem value="confirmed">Bestätigt</MenuItem>
                      <MenuItem value="completed">Abgeschlossen</MenuItem>
                      <MenuItem value="ready_to_bill">Abrechnungsbereit</MenuItem>
                      <MenuItem value="billed">Abgerechnet</MenuItem>
                      <MenuItem value="cancelled">Storniert</MenuItem>
                      <MenuItem value="no_show">Nicht erschienen</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Notizen"
                      name="notes"
                      value={formState.notes || ''}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                    />
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default AppointmentDetail;
