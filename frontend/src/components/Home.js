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
  LinearProgress,
  Paper
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
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay() + 1); // Montag
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6); // Sonntag
    endOfCurrentWeek.setHours(23, 59, 59, 999);

    const startOfNextWeek = new Date(endOfCurrentWeek);
    startOfNextWeek.setDate(endOfCurrentWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    // Öffnungszeiten (8:00 - 20:00 Uhr)
    const OPENING_HOURS = {
      start: 8, // 8:00 Uhr
      end: 20,  // 20:00 Uhr
      daysPerWeek: 5, // Montag bis Freitag
      hoursPerDay: 12 // 12 Stunden pro Tag
    };

    // Berechne die maximal möglichen Stunden pro Woche
    const maxHoursPerWeek = OPENING_HOURS.daysPerWeek * OPENING_HOURS.hoursPerDay;

    const roomStats = rooms.map(room => {
      // Filtere Termine für aktuelle und nächste Woche
      const currentWeekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= startOfCurrentWeek && 
               aptDate <= endOfCurrentWeek && 
               isSameRoom(apt.room, room.id);
      });

      const nextWeekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= startOfNextWeek && 
               aptDate <= endOfNextWeek && 
               isSameRoom(apt.room, room.id);
      });

      // Berechne die tatsächlichen Stunden pro Woche
      const calculateHours = (appointments) => {
        return appointments.reduce((total, apt) => {
          const duration = apt.duration_minutes || 30;
          return total + (duration / 60); // Konvertiere Minuten in Stunden
        }, 0);
      };

      const currentWeekHours = calculateHours(currentWeekAppointments);
      const nextWeekHours = calculateHours(nextWeekAppointments);

      // Berechne die Auslastung in Prozent
      const currentWeekUtilization = (currentWeekHours / maxHoursPerWeek) * 100;
      const nextWeekUtilization = (nextWeekHours / maxHoursPerWeek) * 100;

      return {
        room: room,
        currentWeek: {
          hours: currentWeekHours,
          utilization: currentWeekUtilization
        },
        nextWeek: {
          hours: nextWeekHours,
          utilization: nextWeekUtilization
        }
      };
    });

    return roomStats.sort((a, b) => b.currentWeek.utilization - a.currentWeek.utilization);
  };

  const isSameRoom = (aptRoom, roomId) => {
    if (!aptRoom) return false;
    if (typeof aptRoom === 'object') return aptRoom.id === roomId;
    return aptRoom === roomId;
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <Box sx={{ mx: 0 }}>
          {/* Header */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h4">Willkommen!</Typography>
          </Paper>

          <Grid container spacing={3}>
            {/* Heutige Termine */}
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ borderRadius: 2 }}>
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
              <Card elevation={3} sx={{ borderRadius: 2 }}>
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
              <Card elevation={3} sx={{ borderRadius: 2 }}>
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
              <Card elevation={3} sx={{ borderRadius: 2 }}>
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
              <Card elevation={3} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <RoomIcon color="primary" />
                    <Typography variant="h6" component="div">
                      Raumauslastung
                    </Typography>
                  </Box>
                  <List>
                    {getRoomUtilization().map(({ room, currentWeek, nextWeek }) => (
                      <ListItem key={room.id}>
                        <ListItemIcon>
                          <RoomIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={room.name}
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                                Diese Woche:
                                <LinearProgress 
                                  variant="determinate" 
                                  value={currentWeek.utilization} 
                                  sx={{ mt: 0.5, mb: 0.5 }}
                                />
                                {Math.round(currentWeek.utilization)}% ({Math.round(currentWeek.hours)}h)
                              </Typography>
                              <Typography variant="body2" component="div">
                                Nächste Woche:
                                <LinearProgress 
                                  variant="determinate" 
                                  value={nextWeek.utilization} 
                                  sx={{ mt: 0.5, mb: 0.5 }}
                                />
                                {Math.round(nextWeek.utilization)}% ({Math.round(nextWeek.hours)}h)
                              </Typography>
                            </Box>
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
              <Card elevation={3} sx={{ borderRadius: 2 }}>
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
              <Card elevation={3} sx={{ borderRadius: 2 }}>
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
      </Box>
    </Box>
  );
}

export default Home;
