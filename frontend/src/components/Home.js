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
  useMediaQuery,
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
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as NotificationsIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  LocalHospital as HospitalIcon,
  Euro as EuroIcon,
  Assessment as AssessmentIcon,
  CheckCircle,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import api from '../api/axios';
import { isAuthenticated, getUserProfile } from '../services/auth';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
        
        setAppointments(appointmentsResponse.data);
        setPrescriptions(prescriptionsResponse.data);
        setPatients(patientsResponse.data);
        setBillingCycles(billingCyclesResponse.data);
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
    if (!currentUser?.is_therapist) {
      return {
        appointments,
        prescriptions,
        patients,
        billingCycles
      };
    }

    // Therapeuten sehen nur ihre eigenen Daten
    const therapistName = `${currentUser.first_name} ${currentUser.last_name}`;
    
    return {
      appointments: appointments.filter(apt => 
        apt.practitioner_name === therapistName
      ),
      prescriptions: prescriptions.filter(pres => 
        pres.patient_name && appointments.some(apt => 
          apt.practitioner_name === therapistName && 
          apt.patient_name === pres.patient_name
        )
      ),
      patients: patients.filter(patient => 
        appointments.some(apt => 
          apt.practitioner_name === therapistName && 
          apt.patient_name === `${patient.first_name} ${patient.last_name}`
        )
      ),
      billingCycles: billingCycles // Therapeuten sehen alle Abrechnungszyklen
    };
  };

  const getTodayAppointments = () => {
    const today = new Date().toDateString();
    return getFilteredData().appointments.filter(apt => 
      new Date(apt.appointment_date).toDateString() === today
    );
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return getFilteredData().appointments.filter(apt => 
      new Date(apt.appointment_date) > now
    ).slice(0, 5);
  };

  const getUrgentPrescriptions = () => {
    return getFilteredData().prescriptions.filter(pres => 
      pres.is_urgent || pres.status === 'Open'
    );
  };

  const getReadyToBillAppointments = () => {
    return getFilteredData().appointments.filter(apt => 
      apt.status === 'ready_to_bill'
    );
  };

  const getActiveBillingCycles = () => {
    return billingCycles.filter(cycle => 
      cycle.status === 'draft' || cycle.status === 'ready'
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
                {getTodayAppointments().length}
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
                {filteredData.patients.length}
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
                          label={appointment.status} 
                          size="small" 
                          color={appointment.status === 'confirmed' ? 'success' : 'default'}
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
                          primary={`${prescription.patient_name} - ${prescription.treatment_name}`}
                          secondary={`Verordnung vom ${new Date(prescription.prescription_date).toLocaleDateString('de-DE')}`}
                        />
                        <Chip 
                          label={prescription.status} 
                          size="small" 
                          color={prescription.is_urgent ? 'error' : 'warning'}
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
                  <ListItem button onClick={() => navigate('/appointments/new')}>
                    <ListItemIcon>
                      <EventIcon />
                    </ListItemIcon>
                    <ListItemText primary="Neuen Termin erstellen" />
                  </ListItem>
                  <ListItem button onClick={() => navigate('/patients/new')}>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="Neuen Patienten anlegen" />
                  </ListItem>
                  <ListItem button onClick={() => navigate('/prescriptions/new')}>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText primary="Neue Verordnung erstellen" />
                  </ListItem>
                  <ListItem button onClick={() => navigate('/billing')}>
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
                            label={cycle.status} 
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
