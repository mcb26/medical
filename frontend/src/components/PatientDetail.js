import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { isAuthenticated, getUserProfile } from '../services/auth';
import { usePatientPermissions } from '../hooks/usePermissions';
import PatientInsuranceManagement from './PatientInsuranceManagement';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Avatar,
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
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  Home,
  CalendarToday,
  MedicalServices,
  LocalHospital,
  Event,
  AccessTime,
  Edit,
  ExpandLess,
  ExpandMore,
  Timeline
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
  const [currentUser, setCurrentUser] = useState(null);
  const { canEdit, canDelete } = usePatientPermissions();

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

  const handleInsuranceUpdate = () => {
    fetchData(); // Aktualisiere Patientendaten nach Versicherungsänderungen
  };

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

    // Lade aktuellen Benutzer
    const user = getUserProfile();
    setCurrentUser(user);

    if (id) {
      fetchData();
    }
  }, [id, navigate]);

  // Prüfe, ob der aktuelle Benutzer diesen Patienten bearbeiten darf
  const canEditThisPatient = () => {
    if (!currentUser || !patient) return false;
    
    // Admins können alles bearbeiten
    if (currentUser.is_admin || currentUser.is_superuser) return canEdit;
    
    // Therapeuten können nur ihre eigenen Patienten bearbeiten
    if (currentUser.is_therapist) {
      // Prüfe, ob der Patient Termine bei diesem Therapeuten hat
      const hasAppointmentsWithTherapist = appointments.some(appointment => {
        const practitionerName = appointment.practitioner_name || '';
        const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
        return practitionerName === userFullName;
      });
      return canEdit && hasAppointmentsWithTherapist;
    }
    
    return canEdit;
  };

  const canDeleteThisPatient = () => {
    if (!currentUser || !patient) return false;
    
    // Admins können alles löschen
    if (currentUser.is_admin || currentUser.is_superuser) return canDelete;
    
    // Therapeuten können Patienten nicht löschen
    if (currentUser.is_therapist) return false;
    
    return canDelete;
  };

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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : patient ? (
          <Box sx={{ mx: 0 }}>
            {/* Patient Header */}
            <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
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
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      icon={<CalendarToday />}
                      label={`Geb. ${new Date(patient.dob).toLocaleDateString('de-DE')}`}
                      variant="outlined"
                    />
                    {patient.insurances && patient.insurances.length > 0 ? (
                      patient.insurances
                        .filter(insurance => {
                          const isValid = new Date() >= new Date(insurance.valid_from) && 
                                        new Date() <= new Date(insurance.valid_to);
                          return isValid;
                        })
                        .map((insurance, index) => (
                          <Chip
                            key={insurance.id}
                            icon={<LocalHospital />}
                            label={`${insurance.insurance_provider?.name || 'Unbekannt'} (${insurance.is_private ? 'Privat' : 'GKV'})`}
                            color={insurance.is_private ? 'secondary' : 'primary'}
                            variant="outlined"
                          />
                        ))
                    ) : (
                      <Chip
                        icon={<LocalHospital />}
                        label="Keine Versicherung"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item>
                  {canEditThisPatient() && (
                    <Button
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={() => navigate(`/patients/${id}/edit`)}
                    >
                      Bearbeiten
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Berechtigungshinweis für Therapeuten */}
            {currentUser?.is_therapist && patient && (
              <Alert severity="info" sx={{ mb: 3 }}>
                {canEditThisPatient() 
                  ? "Dies ist Ihr Patient - Sie können ihn bearbeiten."
                  : "Dies ist nicht Ihr Patient - Sie können ihn nur anzeigen."
                }
              </Alert>
            )}

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Offene Termine
                    </Typography>
                    <Typography variant="h4">
                      {appointments.filter(a => a.status === 'planned').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Aktive Verordnungen
                    </Typography>
                    <Typography variant="h4">
                      {prescriptions.filter(p => p.status === 'active').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Letzter Besuch
                    </Typography>
                    <Typography variant="h4">
                      {appointments.length > 0 
                        ? new Date(appointments[0].appointment_date).toLocaleDateString('de-DE')
                        : 'Keine'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Status
                    </Typography>
                    <Typography variant="h4">
                      Aktiv
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Main Content Tabs */}
            <Paper elevation={3} sx={{ borderRadius: 2 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Übersicht" />
                <Tab label="Versicherungen" />
                <Tab label="Termine" />
                <Tab label="Verordnungen" />
                <Tab label="Dokumente" />
              </Tabs>

              {/* Tab Content */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  {/* Left Column */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ mb: 3 }}>
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

                    <Card elevation={2}>
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

                  {/* Right Column */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <Event sx={{ mr: 1 }} />
                          Nächste Termine
                        </Typography>
                        <List>
                          {appointments
                            .filter((appointment) => new Date(appointment.appointment_date) > new Date())
                            .slice(0, 3)
                            .map((appointment) => (
                            <ListItem
                              key={appointment.id}
                              component="div"
                              onClick={() => handleAppointmentClick(appointment.id)}
                              sx={{
                                cursor: 'pointer',
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

                    <Card elevation={2}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <Timeline sx={{ mr: 1 }} />
                          Aktuelle Verordnungen
                        </Typography>
                        <List>
                          {prescriptions.slice(0, 3).map((prescription) => (
                            <ListItem
                              key={prescription.id}
                              sx={{
                                mb: 1,
                                bgcolor: 'background.paper',
                                borderRadius: 1
                              }}
                            >
                              <ListItemText
                                primary={prescription.treatment_1}
                                secondary={`Verordnet am: ${new Date(prescription.created_at).toLocaleDateString('de-DE')}`}
                              />
                              <Chip
                                label={prescription.status}
                                size="small"
                                color={prescription.status === 'active' ? 'success' : 'default'}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Versicherungen Tab */}
              <TabPanel value={tabValue} index={1}>
                <PatientInsuranceManagement 
                  patientId={patient.id} 
                  onInsuranceUpdate={handleInsuranceUpdate}
                />
              </TabPanel>

              {/* Termine Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Datum</TableCell>
                        <TableCell>Behandlung</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{new Date(appointment.appointment_date).toLocaleString('de-DE')}</TableCell>
                          <TableCell>{appointment.treatment?.treatment_name}</TableCell>
                          <TableCell>{appointment.status}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleAppointmentClick(appointment.id)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </TabPanel>

              {/* Verordnungen Tab */}
              <TabPanel value={tabValue} index={3}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Behandlung</TableCell>
                        <TableCell>Verordnet am</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prescriptions.map((prescription) => (
                        <TableRow key={prescription.id}>
                          <TableCell>{prescription.treatment_1}</TableCell>
                          <TableCell>{new Date(prescription.created_at).toLocaleDateString('de-DE')}</TableCell>
                          <TableCell>{prescription.status}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handlePrescriptionClick(prescription.id)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </TabPanel>

              {/* Dokumente Tab */}
              <TabPanel value={tabValue} index={4}>
                <Alert severity="info">
                  Dokumente-Funktion wird noch implementiert.
                </Alert>
              </TabPanel>
            </Paper>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>Kein Patient gefunden</Alert>
        )}
      </Box>
    </Box>
  );
}

export default PatientDetail;
