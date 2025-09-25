import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  useTheme,
  Container,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Event as EventIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Euro as EuroIcon,
  CheckCircle,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import api from '../api/axios';
import { isAuthenticated, getUserProfile } from '../services/auth';

// Hilfsfunktion für deutsche Status-Übersetzungen
const getGermanStatus = (status) => {
  const statusMap = {
    'planned': 'Geplant',
    'confirmed': 'Bestätigt',
    'completed': 'Abgeschlossen',
    'cancelled': 'Storniert',
    'ready_to_bill': 'Abrechnungsbereit',
    'billed': 'Abgerechnet',
    'draft': 'Entwurf',
    'ready': 'Bereit',
    'sent': 'Versendet',
    'paid': 'Bezahlt',
    'open': 'Offen',
    'closed': 'Geschlossen',
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    'no_show': 'Nicht erschienen',
    'Open': 'Offen',  // Fallback für Großschreibung
    'Closed': 'Geschlossen'  // Fallback für Großschreibung
  };
  return statusMap[status] || status;
};

// Hilfsfunktion für Status-Farben (wie im Kalender)
const getStatusColor = (status) => {
  const colorMap = {
    'ready_to_bill': '#4caf50', // Grün
    'completed': '#1976d2',      // Blau
    'cancelled': '#f44336',      // Rot
    'no_show': '#424242',        // Dunkelgrau
    'planned': '#ff9800',        // Orange
    'confirmed': '#ff9800',      // Orange (wie planned)
    'open': '#ff9800',           // Orange für offene Verordnungen
    'closed': '#424242'          // Dunkelgrau für geschlossene Verordnungen
  };
  return colorMap[status] || '#ff9800'; // Standard: Orange
};

// Hilfsfunktion für deutsche Abrechnungsstatus-Übersetzungen
const getGermanBillingStatus = (status) => {
  const statusMap = {
    'draft': 'Entwurf',
    'ready': 'Bereit',
    'sent': 'Versendet',
    'paid': 'Bezahlt'
  };
  return statusMap[status] || status;
};

function Home() {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [billingCycles, setBillingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Lade zuerst den aktuellen Benutzer
        const user = getUserProfile();
        setCurrentUser(user);
        
        // Lade Daten basierend auf Benutzerrolle
        const promises = [
          api.get('/appointments/'),
          api.get('/prescriptions/'),
          api.get('/patients/'),
          api.get('/billing-cycles/')
        ];
        
        const [
          appointmentsResponse, 
          prescriptionsResponse,
          patientsResponse,
          billingCyclesResponse
        ] = await Promise.all(promises);
        
        // Stelle sicher, dass wir Arrays erhalten
        setAppointments(Array.isArray(appointmentsResponse.data) ? appointmentsResponse.data : []);
        setPrescriptions(Array.isArray(prescriptionsResponse.data) ? prescriptionsResponse.data : []);
        setPatients(Array.isArray(patientsResponse.data) ? patientsResponse.data : []);
        setBillingCycles(Array.isArray(billingCyclesResponse.data) ? billingCyclesResponse.data : []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Filtere Daten für Therapeuten
  const getFilteredData = () => {
    // Stelle sicher, dass alle Daten Arrays sind
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];
    const safePatients = Array.isArray(patients) ? patients : [];
    const safeBillingCycles = Array.isArray(billingCycles) ? billingCycles : [];

    if (!currentUser?.is_therapist) {
      return {
        appointments: safeAppointments,
        prescriptions: safePrescriptions,
        patients: safePatients,
        billingCycles: safeBillingCycles
      };
    }

    // Therapeuten sehen nur ihre eigenen Daten
    const therapistName = `${currentUser.first_name} ${currentUser.last_name}`;
    
    return {
      appointments: safeAppointments.filter(apt => 
        apt && apt.practitioner_name === therapistName
      ),
      prescriptions: safePrescriptions.filter(pres => 
        pres && pres.patient_name && safeAppointments.some(apt => 
          apt && apt.practitioner_name === therapistName && 
          apt.patient_name === pres.patient_name
        )
      ),
      patients: safePatients.filter(patient => 
        patient && safeAppointments.some(apt => 
          apt && apt.practitioner_name === therapistName && 
          apt.patient_name === `${patient.first_name} ${patient.last_name}`
        )
      ),
      billingCycles: safeBillingCycles // Therapeuten sehen alle Abrechnungszyklen
    };
  };

  const getTodayAppointments = () => {
    const today = new Date().toDateString();
    // Stelle sicher, dass nur echte Termine (Appointments) angezeigt werden, keine Abwesenheiten
    return getFilteredData().appointments.filter(apt => 
      apt && 
      apt.appointment_date && 
      new Date(apt.appointment_date).toDateString() === today &&
      // Zusätzliche Sicherheit: Prüfe, dass es ein echter Termin ist (hat patient, treatment, etc.)
      apt.patient_name && 
      apt.treatment_name &&
      apt.practitioner_name
    );
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    // Stelle sicher, dass nur echte Termine (Appointments) angezeigt werden, keine Abwesenheiten
    return getFilteredData().appointments.filter(apt => 
      apt && 
      apt.appointment_date && 
      new Date(apt.appointment_date) > now &&
      // Zusätzliche Sicherheit: Prüfe, dass es ein echter Termin ist (hat patient, treatment, etc.)
      apt.patient_name && 
      apt.treatment_name &&
      apt.practitioner_name
    ).slice(0, 5);
  };

  const getUrgentPrescriptions = () => {
    return getFilteredData().prescriptions.filter(pres => 
      pres && (pres.is_urgent || pres.status === 'Open')
    );
  };

  const getReadyToBillAppointments = () => {
    // Stelle sicher, dass nur echte Termine (Appointments) angezeigt werden, keine Abwesenheiten
    return getFilteredData().appointments.filter(apt => 
      apt && 
      apt.status === 'ready_to_bill' &&
      // Zusätzliche Sicherheit: Prüfe, dass es ein echter Termin ist (hat patient, treatment, etc.)
      apt.patient_name && 
      apt.treatment_name &&
      apt.practitioner_name
    );
  };

  const getActiveBillingCycles = () => {
    const safeBillingCycles = Array.isArray(billingCycles) ? billingCycles : [];
    return safeBillingCycles.filter(cycle => 
      cycle && (cycle.status === 'draft' || cycle.status === 'ready')
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const filteredData = getFilteredData();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      py: { xs: 2, sm: 3 }
    }}>
      <Container maxWidth="xl">
        {/* Welcome Header */}
        <Card sx={{ 
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          py: 4
        }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            Willkommen{currentUser ? `, ${currentUser.first_name} ${currentUser.last_name}` : ''}!
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
            {currentUser?.is_therapist 
              ? 'Ihr persönlicher Therapeuten-Dashboard' 
              : 'Ihre Praxisverwaltung auf einen Blick'
            }
          </Typography>
          {currentUser?.is_therapist && (
            <Typography variant="body1" sx={{ opacity: 0.8, mt: 1 }}>
              Hier sehen Sie nur Ihre eigenen Termine und Patienten
            </Typography>
          )}
        </Card>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/appointments')}>
              <EventIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {Array.isArray(getTodayAppointments()) ? getTodayAppointments().length : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.is_therapist ? 'Ihre heutigen Termine' : 'Heutige Termine'}
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/patients')}>
              <PeopleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {Array.isArray(filteredData.patients) ? filteredData.patients.length : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.is_therapist ? 'Ihre Patienten' : 'Aktive Patienten'}
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/prescriptions')}>
              <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {getUrgentPrescriptions().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.is_therapist ? 'Ihre dringenden Verordnungen' : 'Dringende Verordnungen'}
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/billing')}>
              <ReceiptIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {getReadyToBillAppointments().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.is_therapist ? 'Ihre abrechnungsbereiten Termine' : 'Abrechnungsbereite Termine'}
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} lg={8}>
            {/* Upcoming Appointments */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon sx={{ mr: 1 }} />
                  {currentUser?.is_therapist ? 'Ihre nächsten Termine' : 'Nächste Termine'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {getUpcomingAppointments().length > 0 ? (
                  <List>
                    {getUpcomingAppointments().map((appointment) => (
                      <ListItem key={appointment.id} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <EventIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${appointment.patient_name} - ${appointment.treatment_name}`}
                          secondary={`${new Date(appointment.appointment_date).toLocaleDateString('de-DE')} um ${new Date(appointment.appointment_date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
                        />
                        <Chip 
                          label={getGermanStatus(appointment.status)} 
                          size="small" 
                          sx={{
                            backgroundColor: getStatusColor(appointment.status),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Keine anstehenden Termine
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Urgent Prescriptions */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <WarningIcon sx={{ mr: 1 }} />
                  {currentUser?.is_therapist ? 'Ihre dringenden Verordnungen' : 'Dringende Verordnungen'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {getUrgentPrescriptions().length > 0 ? (
                  <List>
                    {getUrgentPrescriptions().slice(0, 5).map((prescription) => (
                      <ListItem key={prescription.id} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <AssignmentIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${prescription.patient_name} - ${prescription.treatment_name || 'Keine Behandlung'}`}
                          secondary={`Verordnung vom ${new Date(prescription.prescription_date).toLocaleDateString('de-DE')}`}
                        />
                        <Chip 
                          label={getGermanStatus(prescription.status)} 
                          size="small" 
                          sx={{
                            backgroundColor: prescription.is_urgent ? '#f44336' : getStatusColor(prescription.status),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Keine dringenden Verordnungen
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} lg={4}>
            {/* Quick Actions */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <BusinessIcon sx={{ mr: 1 }} />
                  Schnellzugriff
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  <ListItem component="button" onClick={() => navigate('/appointments/new')}>
                    <ListItemIcon>
                      <EventIcon />
                    </ListItemIcon>
                    <ListItemText primary="Neuen Termin erstellen" />
                  </ListItem>
                  <ListItem component="button" onClick={() => navigate('/patients/new')}>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="Neuen Patienten anlegen" />
                  </ListItem>
                  <ListItem component="button" onClick={() => navigate('/prescriptions/new')}>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText primary="Neue Verordnung erstellen" />
                  </ListItem>
                  <ListItem component="button" onClick={() => navigate('/billing')}>
                    <ListItemIcon>
                      <ReceiptIcon />
                    </ListItemIcon>
                    <ListItemText primary="Abrechnung verwalten" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Billing Overview */}
            {!currentUser?.is_therapist && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <EuroIcon sx={{ mr: 1 }} />
                    Abrechnungsübersicht
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {getActiveBillingCycles().length > 0 ? (
                    <List>
                      {getActiveBillingCycles().slice(0, 3).map((cycle) => (
                        <ListItem key={cycle.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={cycle.insurance_provider_name}
                            secondary={`${new Date(cycle.start_date).toLocaleDateString('de-DE')} - ${new Date(cycle.end_date).toLocaleDateString('de-DE')}`}
                          />
                          <Chip 
                            label={getGermanBillingStatus(cycle.status)} 
                            size="small" 
                            color={cycle.status === 'ready' ? 'success' : 'default'}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine aktiven Abrechnungszyklen
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* System Status */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1 }} />
                  System Status
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Datenbank-Verbindung
                  </Typography>
                  <LinearProgress variant="determinate" value={100} color="success" />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    API-Verfügbarkeit
                  </Typography>
                  <LinearProgress variant="determinate" value={100} color="success" />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Benutzer-Session
                  </Typography>
                  <LinearProgress variant="determinate" value={100} color="success" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Home;
