import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Chip,
  LinearProgress
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
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import api from '../api/axios';
import { isAuthenticated } from '../services/auth';

function Home() {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [
          appointmentsResponse, 
          prescriptionsResponse,
          roomsResponse,
          practitionersResponse
        ] = await Promise.all([
          api.get('/appointments/'),
          api.get('/prescriptions/'),
          api.get('/rooms/'),
          api.get('/practitioners/')
        ]);
        
        setAppointments(appointmentsResponse.data);
        setPrescriptions(prescriptionsResponse.data);
        setRooms(roomsResponse.data);
        setPractitioners(practitionersResponse.data);
        calculateWeeklyStats(appointmentsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const calculateWeeklyStats = (appointments) => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    
    const weeklyAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    });

    setWeeklyStats({
      total: weeklyAppointments.length,
      completed: weeklyAppointments.filter(apt => apt.status === 'Abgeschlossen').length,
      cancelled: weeklyAppointments.filter(apt => apt.status === 'Abgesagt').length,
      planned: weeklyAppointments.filter(apt => apt.status === 'Geplant').length
    });
  };

  const getTodayAppointments = () => {
    const today = new Date();
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return (
        aptDate.getDate() === today.getDate() &&
        aptDate.getMonth() === today.getMonth() &&
        aptDate.getFullYear() === today.getFullYear()
      );
    });
  };

  const getUrgentPrescriptions = () => {
    return prescriptions.filter(p => p.is_urgent && p.status !== 'Abgeschlossen');
  };

  const getHomeVisits = () => {
    return appointments.filter(apt => 
      apt.prescription?.requires_home_visit && 
      new Date(apt.appointment_date) >= new Date()
    );
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.appointment_date) > now)
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
      .slice(0, 5);
  };

  const getRoomUtilization = () => {
    const roomStats = rooms.map(room => {
      const roomAppointments = appointments.filter(apt => apt.room?.id === room.id);
      return {
        room: room,
        utilization: (roomAppointments.length / appointments.length) * 100 || 0
      };
    });
    return roomStats.sort((a, b) => b.utilization - a.utilization);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box component="div" sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Willkommen!
      </Typography>

      <Grid container spacing={3}>
        {/* Heutige Termine */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EventIcon color="primary" />
                <Typography variant="h6">
                  Heutige Termine
                </Typography>
              </Box>
              <List>
                {getTodayAppointments().length > 0 ? (
                  getTodayAppointments().map(appointment => (
                    <ListItem 
                      key={appointment.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/appointments/${appointment.id}`)}
                    >
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={appointment.patient_name}
                        secondary={
                          <Typography variant="body2" component="span">
                            {`${appointment.treatment_name} - ${new Date(appointment.appointment_date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="Keine Termine für heute" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Dringende Verordnungen */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningIcon color="error" />
                <Typography variant="h6" component="div">
                  Dringende Verordnungen
                </Typography>
              </Box>
              <List>
                {getUrgentPrescriptions().length > 0 ? (
                  getUrgentPrescriptions().map(prescription => (
                    <ListItem 
                      key={prescription.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/prescriptions/${prescription.id}`)}
                    >
                      <ListItemIcon>
                        <AssignmentIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={prescription.patient_name}
                        secondary={
                          <Typography variant="body2" component="span">
                            {prescription.treatment_name}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="Keine dringenden Verordnungen" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Hausbesuche */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HomeIcon color="primary" />
                <Typography variant="h6" component="div">
                  Hausbesuche
                </Typography>
              </Box>
              <List>
                {getHomeVisits().map(visit => (
                  <ListItem 
                    key={visit.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/appointments/${visit.id}`)}
                  >
                    <ListItemIcon>
                      <HomeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={visit.patient_name}
                      secondary={
                        <Typography variant="body2" component="span">
                          {new Date(visit.appointment_date).toLocaleDateString('de-DE')}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Wöchentliche Statistiken */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" component="div">
                  Wöchentliche Statistiken
                </Typography>
              </Box>
              {weeklyStats && (
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" component="span">
                          Termine diese Woche: {weeklyStats.total}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <LinearProgress 
                    variant="determinate" 
                    value={(weeklyStats.completed / weeklyStats.total) * 100} 
                    sx={{ my: 1 }}
                  />
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Raumauslastung */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <RoomIcon color="primary" />
                <Typography variant="h6" component="div">
                  Raumauslastung
                </Typography>
              </Box>
              <List>
                {getRoomUtilization().map(({ room, utilization }) => (
                  <ListItem key={room.id}>
                    <ListItemIcon>
                      <RoomIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={room.name}
                      secondary={
                        <Typography variant="body2" component="span">
                          <LinearProgress 
                            variant="determinate" 
                            value={utilization} 
                            sx={{ flexGrow: 1 }}
                          />
                          {Math.round(utilization)}%
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Nächste Termine */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTimeIcon color="primary" />
                <Typography variant="h6" component="div">
                  Nächste Termine
                </Typography>
              </Box>
              <List>
                {getUpcomingAppointments().map(appointment => (
                  <ListItem 
                    key={appointment.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                  >
                    <ListItemIcon>
                      <EventIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${new Date(appointment.appointment_date).toLocaleDateString('de-DE')} - ${appointment.patient_name}`}
                      secondary={
                        <Typography variant="body2" component="span">
                          <AccessTimeIcon fontSize="small" />
                          {new Date(appointment.appointment_date).toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {appointment.room && (
                            <Chip 
                              label={appointment.room.name} 
                              size="small" 
                              icon={<RoomIcon />}
                            />
                          )}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  endIcon={<EventIcon />}
                  onClick={() => navigate('/appointments')}
                >
                  Alle Termine anzeigen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Therapeuten Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" component="div">
                  Therapeuten Status
                </Typography>
              </Box>
              <List>
                {practitioners.map(practitioner => {
                  const practitionerAppointments = appointments.filter(
                    apt => apt.practitioner?.id === practitioner.id
                  );
                  const todayAppointments = practitionerAppointments.filter(
                    apt => {
                      const aptDate = new Date(apt.appointment_date);
                      const today = new Date();
                      return (
                        aptDate.getDate() === today.getDate() &&
                        aptDate.getMonth() === today.getMonth() &&
                        aptDate.getFullYear() === today.getFullYear()
                      );
                    }
                  );

                  return (
                    <ListItem key={practitioner.id}>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${practitioner.first_name} ${practitioner.last_name}`}
                        secondary={
                          <Typography variant="body2" component="span">
                            <Chip 
                              label={`Heute: ${todayAppointments.length}`} 
                              size="small" 
                              color="primary"
                            />
                            <Chip 
                              label={`Gesamt: ${practitionerAppointments.length}`} 
                              size="small"
                            />
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Home;
