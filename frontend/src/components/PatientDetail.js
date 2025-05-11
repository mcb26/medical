import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { isAuthenticated } from '../services/auth';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  Home,
  CalendarToday,
  MedicalServices,
  LocalHospital,
  Assignment,
  Warning,
  Event,
  AccessTime,
  Edit,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

// TabPanel Komponente
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insuranceGroups, setInsuranceGroups] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  // State für expandierte/kollabierte Karten
  const [expanded, setExpanded] = useState({
    personal: true,
    contact: true,
    medical: true,
    emergency: true,
    administrative: true,
    appointments: true,
    treatments: true,
    prescriptions: true
  });

  const fetchData = async () => {
    try {
      console.log('Starte Datenabruf für Patient ID:', id);
      setLoading(true);
      setError(null);

      const [patientResponse, insuranceGroupsResponse, appointmentsResponse, prescriptionsResponse] = await Promise.all([
        api.get(`/patients/${id}/`),
        api.get('/insurance-provider-groups/'),
        api.get(`/patients/${id}/appointments/`),
        api.get(`/prescriptions/?patient=${id}`)
      ]);

      console.log('Rohe Termindaten:', appointmentsResponse.data);
      console.log('Rohe Verordnungsdaten:', prescriptionsResponse.data);
      
      setPatient(patientResponse.data);
      setInsuranceGroups(insuranceGroupsResponse.data);
      setAppointments(appointmentsResponse.data);
      setPrescriptions(prescriptionsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      setError("Fehler beim Laden der Daten");
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (id) {
      fetchData();
    }
  }, [id, navigate]);

  // Toggle-Funktion für Expand/Collapse
  const handleExpandClick = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Komponente für den Kartentitel mit Toggle-Button
  const SectionHeader = ({ title, section, icon }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      mb: expanded[section] ? 2 : 0,
      cursor: 'pointer'
    }}
    onClick={() => handleExpandClick(section)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      <IconButton size="small">
        {expanded[section] ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handler für Termin-Klick
  const handleAppointmentClick = (appointmentId) => {
    navigate(`/appointments/${appointmentId}`);
  };

  // Handler für Verordnungs-Klick
  const handlePrescriptionClick = (prescriptionId) => {
    navigate(`/prescriptions/${prescriptionId}`);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!patient) return <Alert severity="info">Kein Patient gefunden</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : patient ? (
        <>
          {/* Header-Bereich */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem'
                  }}
                >
                  {`${patient.first_name?.[0]}${patient.last_name?.[0]}`}
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography variant="h4" gutterBottom>
                  {`${patient.first_name} ${patient.last_name}`}
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip
                    icon={<CalendarToday />}
                    label={`Geb. ${new Date(patient.dob).toLocaleDateString('de-DE')}`}
                    variant="outlined"
                  />
                  <Chip
                    icon={<LocalHospital />}
                    label={patient.insurance_provider || 'Keine Versicherung'}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => navigate(`/patients/${id}/edit`)}
                >
                  Bearbeiten
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Tabs-Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Übersicht" />
              <Tab label="Termine" />
              <Tab label="Verordnungen" />
              <Tab label="Dokumente" />
            </Tabs>
          </Box>

          {/* Übersicht Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Kontaktinformationen */}
              <Grid item xs={12} md={6}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <Person sx={{ mr: 1 }} />
                      Kontaktinformationen
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Phone />
                        </ListItemIcon>
                        <ListItemText
                          primary="Telefon"
                          secondary={patient.phone_number}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Email />
                        </ListItemIcon>
                        <ListItemText
                          primary="E-Mail"
                          secondary={patient.email}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Home />
                        </ListItemIcon>
                        <ListItemText
                          primary="Adresse"
                          secondary={`${patient.street_address}, ${patient.postal_code} ${patient.city}`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Medizinische Informationen */}
              <Grid item xs={12} md={6}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <MedicalServices sx={{ mr: 1 }} />
                      Medizinische Informationen
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Allergien
                      </Typography>
                      <Typography paragraph>
                        {patient.allergies || 'Keine bekannt'}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">
                        Medizinische Vorgeschichte
                      </Typography>
                      <Typography>
                        {patient.medical_history || 'Keine Einträge'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Aktuelle Termine */}
              <Grid item xs={12}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <Event sx={{ mr: 1 }} />
                      Aktuelle Termine
                    </Typography>
                    <List>
                      {appointments.slice(0, 3).map((appointment) => (
                        <ListItem
                          key={appointment.id}
                          sx={{
                            borderLeft: 6,
                            borderColor: 
                              appointment.status === 'confirmed' ? 'success.main' :
                              appointment.status === 'planned' ? 'info.main' : 'grey.300',
                            mb: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1
                          }}
                        >
                          <ListItemIcon>
                            <AccessTime />
                          </ListItemIcon>
                          <ListItemText
                            primary={new Date(appointment.appointment_date).toLocaleString('de-DE')}
                            secondary={appointment.treatment?.treatment_name}
                          />
                          <Chip
                            label={appointment.status}
                            size="small"
                            color={
                              appointment.status === 'confirmed' ? 'success' :
                              appointment.status === 'planned' ? 'primary' : 'default'
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Termine Tab */}
          <TabPanel value={tabValue} index={1}>
            <Card elevation={3}>
              <CardContent>
                <List>
                  {appointments.map((appointment) => (
                    <ListItem
                      key={appointment.id}
                      sx={{
                        borderLeft: 6,
                        borderColor: 
                          appointment.status === 'confirmed' ? 'success.main' :
                          appointment.status === 'planned' ? 'info.main' : 'grey.300',
                        mb: 2,
                        bgcolor: 'background.paper',
                        borderRadius: 1
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {new Date(appointment.appointment_date).toLocaleString('de-DE')}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Behandlung: {appointment.treatment?.treatment_name}
                            </Typography>
                            {appointment.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Notizen: {appointment.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Chip
                        label={appointment.status}
                        size="small"
                        color={
                          appointment.status === 'confirmed' ? 'success' :
                          appointment.status === 'planned' ? 'primary' : 'default'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Verordnungen Tab */}
          <TabPanel value={tabValue} index={2}>
            <Card elevation={3}>
              <CardContent>
                <List>
                  {prescriptions.map((prescription) => (
                    <ListItem
                      key={prescription.id}
                      sx={{
                        mb: 2,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        boxShadow: 1
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {prescription.treatment_1}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Verordnet am: {new Date(prescription.created_at).toLocaleDateString('de-DE')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Status: {prescription.status}
                            </Typography>
                            {prescription.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Notizen: {prescription.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </TabPanel>
        </>
      ) : (
        <Alert severity="info">Kein Patient gefunden</Alert>
      )}
    </Container>
  );
}

export default PatientDetail;
