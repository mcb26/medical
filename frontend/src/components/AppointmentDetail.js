import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axios';
import { getUserProfile } from '../services/auth';
import { useAppointmentPermissions } from '../hooks/usePermissions';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, Grid, Chip, Alert, Stack, Card, CardContent, CardHeader
} from '@mui/material';
import { 
  Person, Event, AccessTime, LocalHospital, Room, Edit, Delete, Save, Cancel, Receipt, 
  Group, Code, CheckCircle, Cancel as CancelIcon, LocalHospital as InsuranceIcon,
  Assignment, Link as LinkIcon, OpenInNew
} from '@mui/icons-material';
import AppointmentStatusChange from './AppointmentStatusChange';


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
  const [currentUser, setCurrentUser] = useState(null);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const { canEdit, canDelete } = useAppointmentPermissions();

  useEffect(() => {
    // Lade aktuellen Benutzer
    const user = getUserProfile();
    setCurrentUser(user);
    
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

  const handleStatusChange = (updatedAppointment) => {
    setAppointment(updatedAppointment);
    setFormState(updatedAppointment);
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
        alert('Termin erfolgreich gelöscht.');
        navigate('/appointments');
      } catch (error) {
        console.error('Fehler beim Löschen:', error.response?.data || error.message);
        alert('Löschung fehlgeschlagen.');
      }
    }
  };

  const handleMarkReadyToBill = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await api.put(`appointments/${id}/`, { status: 'ready_to_bill' }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Termin als abrechnungsbereit markiert.');
      setAppointment({ ...appointment, status: 'ready_to_bill' });
    } catch (error) {
      console.error('Fehler beim Markieren:', error.response?.data || error.message);
      alert('Markierung fehlgeschlagen.');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const billingInfo = getTreatmentBillingInfo();
      
      if (!billingInfo || !billingInfo.isBillable) {
        alert('Diese Behandlung kann nicht abgerechnet werden.');
        return;
      }
      
      if (billingInfo.billingType === 'self_pay') {
        // Für Selbstzahler-Behandlungen: Erstelle private Rechnung
        const response = await api.post('/invoices/create-private-invoice/', {
          appointment_id: id,
          due_date_days: 30
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.data.success) {
          alert(`Private Rechnung erfolgreich erstellt! Rechnungsnummer: ${response.data.invoice_number}`);
        } else {
          alert('Fehler beim Erstellen der privaten Rechnung.');
        }
      } else {
        // Für GKV-Behandlungen: Erstelle Zuzahlungsrechnung
        const response = await api.post('/copay-invoices/create-for-appointment/', {
          appointment_id: id,
          due_date_days: 30
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.total_invoices_created > 0) {
          alert(`Zuzahlungsrechnung erfolgreich erstellt! ${response.data.total_invoices_created} Rechnung(en) erstellt.`);
        } else {
          alert('Keine Zuzahlungsrechnung erstellt. Möglicherweise gibt es keine ausstehenden Zuzahlungen für diesen Termin.');
        }
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error.response?.data || error.message);
      alert('Fehler beim Erstellen der Rechnung: ' + (error.response?.data?.error || error.message));
    }
  };

  const getPatientName = () => {
    if (!appointment || !appointment.patient) return 'Unbekannt';
    const patient = patients.find(p => p.id === appointment.patient);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unbekannt';
  };

  const getPractitionerName = () => {
    if (!appointment || !appointment.practitioner) return 'Unbekannt';
    const practitioner = practitioners.find(p => p.id === appointment.practitioner);
    return practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : 'Unbekannt';
  };

  const getRoomName = () => {
    if (!appointment || !appointment.room) return null;
    const room = rooms.find(r => r.id === appointment.room);
    return room ? room.name : null;
  };

  const getTreatmentName = () => {
    if (!appointment || !appointment.treatment) return 'Keine Behandlung';
    const treatment = treatments.find(t => t.id === appointment.treatment);
    return treatment ? treatment.treatment_name : 'Unbekannte Behandlung';
  };

  const getTreatmentBillingInfo = () => {
    const treatment = treatments.find(t => t.id === appointment.treatment);
    if (!treatment) return null;
    
    // Prüfe zuerst auf Selbstzahler-Behandlung
    if (treatment.is_self_pay) {
      return {
        type: 'Selbstzahler',
        price: treatment.self_pay_price ? `${treatment.self_pay_price} €` : 'N/A',
        isBillable: true,
        billingType: 'self_pay'
      };
    }
    
    // Prüfe auf GKV-abrechenbare Behandlung
    if (treatment.is_gkv_billable || treatment.legs_code || (treatment.accounting_code && treatment.tariff_indicator)) {
      return {
        type: 'GKV',
        legs_code: treatment.legs_code_display || (treatment.accounting_code && treatment.tariff_indicator ? `${treatment.accounting_code}.${treatment.tariff_indicator}` : 'Nicht definiert'),
        prescription_type: treatment.prescription_type_indicator,
        telemedicine: treatment.is_telemedicine,
        isBillable: true,
        billingType: 'gkv'
      };
    }
    
    // Fallback: Nicht abrechenbar
    return {
      type: 'Nicht abrechenbar',
      isBillable: false,
      billingType: 'not_billable'
    };
  };

  const getPatientInsuranceInfo = () => {
    if (!appointment || !appointment.patient) return null;
    
    const patient = patients.find(p => p.id === appointment.patient);
    if (!patient || !patient.insurances || patient.insurances.length === 0) {
      return { type: 'Keine Versicherung', provider: null };
    }
    
    // Finde die gültige Versicherung zum Terminzeitpunkt
    const appointmentDate = new Date(appointment.appointment_date);
    const validInsurance = patient.insurances.find(insurance => {
      const validFrom = insurance.valid_from ? new Date(insurance.valid_from) : new Date('1900-01-01');
      const validTo = insurance.valid_to ? new Date(insurance.valid_to) : new Date('2100-12-31');
      return appointmentDate >= validFrom && appointmentDate <= validTo;
    });
    
    if (!validInsurance) {
      return { type: 'Keine gültige Versicherung', provider: null };
    }
    
    return {
      type: validInsurance.is_private ? 'Privat' : 'Gesetzlich',
      provider: validInsurance.insurance_provider_name || 'Unbekannt',
      insuranceNumber: validInsurance.insurance_number,
      isPrivate: validInsurance.is_private
    };
  };

  const handleNavigateToPrescription = () => {
    if (appointment.prescription) {
      navigate(`/prescriptions/${appointment.prescription}`);
    }
  };

  const handleNavigateToSeries = () => {
    if (appointment.series_identifier) {
      navigate(`/appointments?series=${appointment.series_identifier}`);
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEditThisAppointment = () => {
    if (!currentUser || !appointment) return false;
    
    // Admins können alle Termine bearbeiten
    if (currentUser.is_admin) return canEdit;
    
    // Therapeuten können nur ihre eigenen Termine bearbeiten
    if (currentUser.is_therapist) {
      const practitionerName = getPractitionerName();
      const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
      return canEdit && practitionerName === userFullName;
    }
    
    return canEdit;
  };

  const canDeleteThisAppointment = () => {
    if (!currentUser || !appointment) return false;
    
    // Admins können alle Termine löschen
    if (currentUser.is_admin) return canDelete;
    
    // Therapeuten können nur ihre eigenen Termine löschen
    if (currentUser.is_therapist) {
      const practitionerName = getPractitionerName();
      const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
      return canDelete && practitionerName === userFullName;
    }
    
    return canDelete;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'planned': 'Geplant',
      'confirmed': 'Bestätigt',
      'completed': 'Abgeschlossen',
      'ready_to_bill': 'Abrechnungsbereit',
      'billed': 'Abgerechnet',
      'cancelled': 'Storniert',
      'no_show': 'Nicht erschienen'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'planned': 'default',
      'confirmed': 'primary',
      'completed': 'success',
      'ready_to_bill': 'warning',
      'billed': 'success',
      'cancelled': 'error',
      'no_show': 'error'
    };
    return colorMap[status] || 'default';
  };

  const canMarkReadyToBill = () => {
    if (!currentUser || !appointment) return false;
    
    // Nur abgeschlossene Termine können als abrechnungsbereit markiert werden
    if (appointment.status !== 'completed') return false;
    
    // Admins können alle Termine markieren
    if (currentUser.is_admin) return true;
    
    // Therapeuten können nur ihre eigenen Termine markieren
    if (currentUser.is_therapist) {
      const practitionerName = getPractitionerName();
      const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
      return practitionerName === userFullName;
    }
    
    return false;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Lade Termin...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!appointment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Termin nicht gefunden</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <Box sx={{ mx: 0 }}>
          {/* Header */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4">Termin-Details</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {appointment?.series_identifier && (
                  <Button
                    variant="outlined"
                    color="primary"
                    component={Link}
                    to={`/appointments/series/${encodeURIComponent(appointment.series_identifier)}`}
                    startIcon={<Group />}
                  >
                    Zur Terminserie ({appointment.series_identifier})
                  </Button>
                )}
                {!editMode ? (
                  <>
                    {canEditThisAppointment() && (
                      <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => setEditMode(true)}
                      >
                        Bearbeiten
                      </Button>
                    )}
                    {canMarkReadyToBill() && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Receipt />}
                        onClick={handleMarkReadyToBill}
                      >
                        Abrechnungsbereit
                      </Button>
                    )}
                    {appointment?.status === 'completed' && (() => {
                      const billingInfo = getTreatmentBillingInfo();
                      if (!billingInfo || !billingInfo.isBillable) return null;
                      
                      const buttonText = billingInfo.billingType === 'self_pay' ? 'Private Rechnung erstellen' : 'Zuzahlungsrechnung erstellen';
                      
                      return (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Receipt />}
                          onClick={handleCreateInvoice}
                        >
                          {buttonText}
                        </Button>
                      );
                    })()}
                    {canDeleteThisAppointment() && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleDelete}
                      >
                        Löschen
                      </Button>
                    )}
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
            
            {/* Berechtigungshinweis für Therapeuten */}
            {currentUser?.is_therapist && appointment && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {getPractitionerName() === `${currentUser.first_name} ${currentUser.last_name}` 
                  ? "Dies ist Ihr Termin - Sie können ihn bearbeiten."
                  : "Dies ist nicht Ihr Termin - Sie können ihn nur anzeigen."
                }
              </Alert>
            )}
          </Paper>

          {/* Content */}
          {!editMode ? (
            <Stack spacing={3}>
              {/* Patient & Practitioner Info */}
              <Card elevation={2}>
                <CardHeader 
                  title="Patient & Behandler" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        <Person sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                        Patient
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>{getPatientName()}</Typography>
                      {(() => {
                        const insuranceInfo = getPatientInsuranceInfo();
                        if (!insuranceInfo) return null;
                        return (
                          <Box sx={{ mt: 1 }}>
                            <Chip 
                              label={insuranceInfo.type}
                              color={insuranceInfo.type === 'Gesetzlich' ? 'primary' : insuranceInfo.type === 'Privat' ? 'secondary' : 'default'}
                              size="small"
                              variant="outlined"
                              icon={<InsuranceIcon />}
                              sx={{ mr: 1 }}
                            />
                            {insuranceInfo.provider && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {insuranceInfo.provider}
                                {insuranceInfo.insuranceNumber && ` (${insuranceInfo.insuranceNumber})`}
                              </Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        <LocalHospital sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                        Behandler
                      </Typography>
                      <Typography variant="body1">{getPractitionerName()}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Treatment & Billing Info */}
              <Card elevation={2}>
                <CardHeader 
                  title="Behandlung & Abrechnung" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        <Event sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                        Behandlung
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{getTreatmentName()}</Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        <Room sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                        Raum
                      </Typography>
                      <Typography variant="body1">{getRoomName() || '–'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        <AccessTime sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                        Termin
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{formatDateTime(appointment.appointment_date)}</Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Dauer
                      </Typography>
                      <Typography variant="body1">{appointment.duration_minutes} Minuten</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Abrechnungsinformationen
                      </Typography>
                      {(() => {
                        const billingInfo = getTreatmentBillingInfo();
                        if (!billingInfo) return <Typography variant="body2" color="text.secondary">Keine Abrechnungsinformationen verfügbar</Typography>;
                        
                        return (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={billingInfo.type}
                              color={billingInfo.type === 'GKV' ? 'primary' : billingInfo.type === 'Selbstzahler' ? 'secondary' : 'default'}
                              icon={billingInfo.type === 'GKV' ? <CheckCircle /> : billingInfo.type === 'Selbstzahler' ? <Code /> : <CancelIcon />}
                              size="small"
                            />
                            {billingInfo.type === 'GKV' && billingInfo.legs_code && (
                              <Chip 
                                label={`LEGS: ${billingInfo.legs_code}`}
                                variant="outlined"
                                size="small"
                                icon={<Code />}
                              />
                            )}
                            {billingInfo.type === 'GKV' && billingInfo.prescription_type && (
                              <Chip 
                                label={`VKZ: ${billingInfo.prescription_type}`}
                                variant="outlined"
                                size="small"
                              />
                            )}
                            {billingInfo.type === 'Selbstzahler' && billingInfo.price && (
                              <Chip 
                                label={`Preis: ${billingInfo.price}`}
                                variant="outlined"
                                size="small"
                              />
                            )}
                            {billingInfo.type === 'GKV' && billingInfo.telemedicine && (
                              <Chip 
                                label="Telemedizin"
                                color="info"
                                size="small"
                              />
                            )}
                          </Box>
                        );
                      })()}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Related Information */}
              <Card elevation={2}>
                <CardHeader 
                  title="Zugehörige Informationen" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Status
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Chip 
                          label={getStatusLabel(appointment.status)} 
                          color={getStatusColor(appointment.status)} 
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => setStatusChangeOpen(true)}
                        >
                          Status ändern
                        </Button>
                      </Box>
                      
                      {appointment.prescription && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                            Verordnung
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<OpenInNew />}
                            onClick={handleNavigateToPrescription}
                            sx={{ mt: 1 }}
                          >
                            Zur Verordnung
                          </Button>
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {appointment.series_identifier && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small"/>
                            Terminserie
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<OpenInNew />}
                            onClick={handleNavigateToSeries}
                            sx={{ mt: 1 }}
                          >
                            Zur Serie
                          </Button>
                        </Box>
                      )}
                    </Grid>
                    {appointment.notes && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Notizen
                        </Typography>
                        <Typography variant="body1">{appointment.notes}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          ) : (
            <Stack spacing={3}>
              {/* Patient & Practitioner Edit */}
              <Card elevation={2}>
                <CardHeader 
                  title="Patient & Behandler bearbeiten" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        label="Patient"
                        name="patient"
                        value={formState.patient || ''}
                        onChange={handleChange}
                        fullWidth
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
                        label="Behandler"
                        name="practitioner"
                        value={formState.practitioner || ''}
                        onChange={handleChange}
                        fullWidth
                        required
                      >
                        {practitioners.map((practitioner) => (
                          <MenuItem key={practitioner.id} value={practitioner.id}>
                            {practitioner.first_name} {practitioner.last_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Treatment & Timing Edit */}
              <Card elevation={2}>
                <CardHeader 
                  title="Behandlung & Termin bearbeiten" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        label="Behandlung"
                        name="treatment"
                        value={formState.treatment || ''}
                        onChange={handleChange}
                        fullWidth
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
                        label="Datum & Uhrzeit"
                        type="datetime-local"
                        name="appointment_date"
                        value={formState.appointment_date ? formState.appointment_date.slice(0, 16) : ''}
                        onChange={handleChange}
                        fullWidth
                        required
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
                        type="number"
                        inputProps={{ min: 15, max: 480 }}
                        helperText="15-480 Minuten"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Status & Notes Edit */}
              <Card elevation={2}>
                <CardHeader 
                  title="Status & Notizen bearbeiten" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        label="Status"
                        name="status"
                        value={formState.status || ''}
                        onChange={handleChange}
                        fullWidth
                        required
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
                        rows={4}
                        placeholder="Zusätzliche Informationen zum Termin..."
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          )}
        </Box>
      </Box>
      
      {/* Status Change Dialog */}
      <AppointmentStatusChange
        appointment={appointment}
        open={statusChangeOpen}
        onClose={() => setStatusChangeOpen(false)}
        onStatusChange={handleStatusChange}
        variant="dialog"
      />
    </Box>
  );
}

export default AppointmentDetail;
