import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { getUserProfile } from '../services/auth';
import { useAppointmentPermissions } from '../hooks/usePermissions';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, 
  Chip, Divider, IconButton, Alert, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { 
  Person, Event, AccessTime, LocalHospital, Room, 
  Edit, Delete, ArrowBack, CalendarToday, Group,
  Description
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function AppointmentSeriesDetail() {
  const { seriesIdentifier: rawSeriesIdentifier } = useParams();
  const seriesIdentifier = rawSeriesIdentifier ? decodeURIComponent(rawSeriesIdentifier) : null;
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { canEdit, canDelete } = useAppointmentPermissions();

  useEffect(() => {
    const user = getUserProfile();
    setCurrentUser(user);
    
    if (!seriesIdentifier) {
      setError('Keine Serien-ID angegeben');
      setLoading(false);
      return;
    }
    
    const fetchSeriesAppointments = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Lade Termine für Serie:', seriesIdentifier);
        const response = await api.get(`/appointments/?series_identifier=${encodeURIComponent(seriesIdentifier)}&expand=patient,practitioner,treatment,room`);
        console.log('Erhaltene Termine:', response.data);
        if (response.data.length === 0) {
          setError(`Keine Termine für die Serie "${seriesIdentifier}" gefunden.`);
        } else {
          setAppointments(response.data);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Terminserie:', error);
        setError('Fehler beim Laden der Terminserie');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSeriesAppointments();
  }, [seriesIdentifier]);

  const getStatusLabel = (status) => {
    const statusLabels = {
      'planned': 'Geplant',
      'confirmed': 'Bestätigt',
      'completed': 'Abgeschlossen',
      'cancelled': 'Storniert',
      'no_show': 'Nicht erschienen',
      'ready_to_bill': 'Abrechnungsbereit'
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'planned': 'info',
      'confirmed': 'success',
      'completed': 'primary',
      'cancelled': 'error',
      'no_show': 'warning',
      'ready_to_bill': 'secondary'
    };
    return statusColors[status] || 'default';
  };

  const formatDateTime = (dt) => {
    return format(new Date(dt), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  const getPatientName = (appointment) => {
    if (appointment.patient) {
      return `${appointment.patient.first_name} ${appointment.patient.last_name}`;
    }
    return 'Unbekannt';
  };

  const getPractitionerName = (appointment) => {
    if (appointment.practitioner) {
      return `${appointment.practitioner.first_name} ${appointment.practitioner.last_name}`;
    }
    return 'Unbekannt';
  };

  const getRoomName = (appointment) => {
    return appointment.room?.name || '-';
  };

  const getTreatmentName = (appointment) => {
    return appointment.treatment?.treatment_name || 'Unbekannt';
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm('Diesen Termin wirklich löschen?')) {
      try {
        await api.delete(`/appointments/${appointmentId}/`);
        setAppointments(appointments.filter(apt => apt.id !== appointmentId));
        alert('Termin erfolgreich gelöscht.');
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Fehler beim Löschen des Termins.');
      }
    }
  };

  const canEditThisAppointment = (appointment) => {
    if (!currentUser || !canEdit) return false;
    
    // Admins können alles bearbeiten
    if (currentUser.is_admin || currentUser.is_superuser) return true;
    
    // Therapeuten können nur ihre eigenen Termine bearbeiten
    if (currentUser.is_therapist) {
      const practitionerName = getPractitionerName(appointment);
      const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
      return practitionerName === userFullName;
    }
    
    return canEdit;
  };

  const canDeleteThisAppointment = (appointment) => {
    if (!currentUser || !canDelete) return false;
    
    // Admins können alles löschen
    if (currentUser.is_admin || currentUser.is_superuser) return true;
    
    // Therapeuten können nur ihre eigenen Termine löschen
    if (currentUser.is_therapist) {
      const practitionerName = getPractitionerName(appointment);
      const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
      return practitionerName === userFullName;
    }
    
    return canDelete;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Lade Terminserie...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '50vh', p: 3 }}>
        <Typography color="error" variant="h6" gutterBottom>{error}</Typography>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/appointments')}
          startIcon={<ArrowBack />}
        >
          Zurück zur Terminliste
        </Button>
      </Box>
    );
  }
  
  if (!appointments.length) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '50vh', p: 3 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Keine Termine in der Serie "{seriesIdentifier}" gefunden
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Möglicherweise wurde die Serie gelöscht oder die Termine gehören zu einer anderen Serie.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/appointments')}
            startIcon={<ArrowBack />}
          >
            Zurück zur Terminliste
          </Button>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
          >
            Seite neu laden
          </Button>
        </Box>
      </Box>
    );
  }

  const firstAppointment = appointments[0];
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <Box sx={{ mx: 0 }}>
          {/* Header */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/appointments')} sx={{ mr: 1 }}>
                  <ArrowBack />
                </IconButton>
                <Typography variant="h4">Terminserie</Typography>
                <Chip 
                  icon={<Group />} 
                  label={`${totalAppointments} Termine`} 
                  color="primary" 
                  variant="outlined"
                />
                <Chip 
                  label={`Serie: ${seriesIdentifier}`} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {firstAppointment.prescription && (
                  <Button
                    variant="outlined"
                    component={Link}
                    to={`/prescriptions/${firstAppointment.prescription}`}
                    startIcon={<Description />}
                  >
                    Zur Verordnung
                  </Button>
                )}
                <Button
                  variant="contained"
                  component={Link}
                  to={`/appointments/${firstAppointment.id}`}
                >
                  Ersten Termin anzeigen
                </Button>
              </Box>
            </Box>
            
            {/* Serien-Übersicht */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      <Person sx={{ mr: 1 }} />
                      Patient
                    </Typography>
                    <Typography variant="body1">
                      {getPatientName(firstAppointment)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      <LocalHospital sx={{ mr: 1 }} />
                      Behandler
                    </Typography>
                    <Typography variant="body1">
                      {getPractitionerName(firstAppointment)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      <Event sx={{ mr: 1 }} />
                      Behandlung
                    </Typography>
                    <Typography variant="body1">
                      {getTreatmentName(firstAppointment)}
                    </Typography>
                    {firstAppointment.prescription && (
                      <Button
                        size="small"
                        component={Link}
                        to={`/prescriptions/${firstAppointment.prescription}`}
                        startIcon={<Description />}
                        sx={{ mt: 1 }}
                      >
                        Verordnung anzeigen
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      <CalendarToday sx={{ mr: 1 }} />
                      Status
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      <Chip 
                        label={`${completedAppointments} abgeschlossen`} 
                        color="success" 
                        size="small"
                      />
                      <Chip 
                        label={`${cancelledAppointments} storniert`} 
                        color="error" 
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* Termine-Tabelle */}
          <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h5">Termine der Serie</Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Datum & Uhrzeit</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Raum</TableCell>
                    <TableCell>Dauer</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1">
                            {formatDateTime(appointment.appointment_date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appointment.duration_minutes} Min.
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(appointment.status)} 
                          color={getStatusColor(appointment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{getRoomName(appointment)}</TableCell>
                      <TableCell>{appointment.duration_minutes} Min.</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            component={Link}
                            to={`/appointments/${appointment.id}`}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          {canDeleteThisAppointment(appointment) && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default AppointmentSeriesDetail; 