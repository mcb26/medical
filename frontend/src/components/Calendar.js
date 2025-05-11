import React, { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Chip,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    IconButton,
    Tooltip as MUITooltip,
    Alert,
    Switch,
    FormControlLabel,
    InputAdornment
} from '@mui/material';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TableViewIcon from '@mui/icons-material/TableView';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Print as PrintIcon,
    Today as TodayIcon,
    NavigateBefore as NavigateBeforeIcon,
    NavigateNext as NavigateNextIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { createRoot } from 'react-dom/client';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PersonIcon from '@mui/icons-material/Person';

const statusColors = {
    planned: '#4CAF50',     // Grün
    confirmed: '#2196F3',   // Blau
    completed: '#9E9E9E',   // Grau
    cancelled: '#F44336',   // Rot
    noshow: '#FF9800'       // Orange
};

// Styling für den Kalender
const calendarStyles = {
    calendar: {
        '& .fc': {
            fontFamily: 'inherit',
            '--fc-border-color': 'rgba(0,0,0,0.12)',
            '--fc-button-text-color': '#1976d2',
            '--fc-button-bg-color': 'transparent',
            '--fc-button-border-color': '#1976d2',
            '--fc-button-hover-bg-color': 'rgba(25, 118, 210, 0.04)',
            '--fc-button-active-bg-color': '#1976d2',
            '--fc-button-active-border-color': '#1976d2',
            '--fc-event-bg-color': '#1976d2',
            '--fc-event-border-color': '#1976d2',
            '--fc-today-bg-color': 'rgba(25, 118, 210, 0.04)',
        },
        '& .fc-toolbar-title': {
            fontSize: '1.25rem',
            fontWeight: 500,
        },
        '& .fc-button': {
            textTransform: 'capitalize',
            borderRadius: '8px',
            padding: '8px 16px',
        },
        '& .fc-event': {
            borderRadius: '4px',
            padding: '2px',
            margin: '1px 0',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: 'none',
            minHeight: '40px',
            '&:hover': {
                transform: 'scale(1.01)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            },
        },
        '& .fc-timegrid-slot': {
            height: '48px !important',
        },
        '& .fc-timegrid-slot-label': {
            fontSize: '0.875rem',
        },
        '& .fc-toolbar': {
            padding: '16px',
            borderBottom: '1px solid rgba(0,0,0,0.12)',
        },
        '& .fc-resource-timeline-divider': {
            backgroundColor: 'rgba(0,0,0,0.12)',
        },
        '& .fc-resource-timeline-header-cell': {
            padding: '8px',
        },
        '& .fc-timeline-slot': {
            height: '48px !important',
        },
        '& .fc-timeline-slot-label': {
            fontSize: '0.875rem',
        },
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 2,
        borderBottom: '1px solid rgba(0,0,0,0.12)',
    },
    controls: {
        display: 'flex',
        gap: 2,
        alignItems: 'center',
    },
    statsCard: {
        p: 2,
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    statChip: {
        borderRadius: '16px',
        fontWeight: 500,
    },
};

// Verbesserte Komponente für die Statistik
const StatsOverview = ({ stats }) => (
    <Paper sx={calendarStyles.statsCard}>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                    Tagesübersicht
                </Typography>
            </Grid>
            {Object.entries(stats).map(([key, value]) => (
                <Grid item xs={6} sm={4} md={2} key={key}>
                    <Chip
                        label={`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`}
                        sx={calendarStyles.statChip}
                        color={
                            key === 'total' ? 'default' :
                            key === 'planned' ? 'primary' :
                            key === 'confirmed' ? 'secondary' :
                            key === 'completed' ? 'success' :
                            key === 'cancelled' ? 'error' :
                            'warning'
                        }
                    />
                </Grid>
            ))}
        </Grid>
    </Paper>
);

// Verbesserte Event-Rendering-Funktion
const CustomEventContent = ({ event }) => (
    <Box sx={{
        p: 0.5,
        height: '100%',
        width: '100%',
        borderRadius: '4px',
        backgroundColor: event.backgroundColor || '#1976d2',
        color: '#fff',
        fontSize: '0.875rem',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
            filter: 'brightness(1.1)',
        }
    }}>
        <Typography 
            variant="subtitle2" 
            sx={{ 
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                mb: 0.5
            }}
        >
            {event.title}
        </Typography>
        <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontSize: '0.75rem',
            opacity: 0.9
        }}>
            {event.extendedProps?.practitioner && (
                <Typography 
                    variant="caption" 
                    sx={{ 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {event.extendedProps.practitioner}
                </Typography>
            )}
            <Typography variant="caption">
                {new Date(event.start).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </Typography>
        </Box>
    </Box>
);

// Fügen Sie diese Komponente für die Raumauswahl hinzu
const RoomSelector = ({ rooms, selectedRooms, onRoomToggle }) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    <Typography variant="subtitle1" gutterBottom>
      Räume anzeigen/ausblenden
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {rooms.map((room) => (
        <Chip
          key={room.id}
          label={room.name}
          onClick={() => onRoomToggle(room.id.toString())}
          color={selectedRooms.includes(room.id.toString()) ? "primary" : "default"}
          variant={selectedRooms.includes(room.id.toString()) ? "filled" : "outlined"}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: (theme) => 
                selectedRooms.includes(room.id.toString()) 
                  ? theme.palette.primary.dark 
                  : theme.palette.action.hover
            }
          }}
        />
      ))}
    </Box>
  </Paper>
);

const Calendar = () => {
    const calendarRef = React.useRef(null);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [openEventDialog, setOpenEventDialog] = useState(false);
    const [openNewAppointmentDialog, setOpenNewAppointmentDialog] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        patient: '',
        treatment: '',
        practitioner: '',
        room: '',
        start_time: '',
        end_time: '',
        notes: ''
    });
    const [patients, setPatients] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [practitioners, setPractitioners] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [resources, setResources] = useState([]);
    const [viewMode, setViewMode] = useState('resourceTimeGrid');
    const navigate = useNavigate();
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertSeverity, setAlertSeverity] = useState('success');
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [practice, setPractice] = useState(null);
    const selectedBundesland = useSelector(state => state.practice.bundesland);
    const [showWeekends, setShowWeekends] = useState(true);
    const [filterPractitioner, setFilterPractitioner] = useState('all');
    const [filterRoom, setFilterRoom] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        planned: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noshow: 0
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
    const [selectedReminderTime, setSelectedReminderTime] = useState(30); // Minuten
    const [loading, setLoading] = useState(true);
    const [resourceType, setResourceType] = useState('rooms'); // 'rooms' oder 'practitioners'

    useEffect(() => {
        fetchPractice();
        fetchData();
        fetchHolidays();
    }, []);

    useEffect(() => {
        if (rooms.length > 0 && selectedRooms.length === 0) {
            setSelectedRooms(rooms.map(room => room.id.toString()));
        }
    }, [rooms]);

    useEffect(() => {
        const newStats = events.reduce((acc, event) => {
            acc.total++;
            acc[event.extendedProps.status]++;
            return acc;
        }, { total: 0, planned: 0, confirmed: 0, completed: 0, cancelled: 0, noshow: 0 });
        setStats(newStats);
    }, [events]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 't':
                        e.preventDefault();
                        setOpenNewAppointmentDialog(true);
                        break;
                    case 'f':
                        e.preventDefault();
                        // Fokus auf Suchfeld setzen
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        calendarRef.current.getApi().prev();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        calendarRef.current.getApi().next();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const fetchPractice = async () => {
        try {
            const response = await api.get('/practice/');
            // Da es nur eine Praxis geben darf, nehmen wir das erste Element
            const practiceData = response.data[0];
            setPractice(practiceData);
        } catch (error) {
            console.error('Fehler beim Laden der Praxisdaten:', error);
            setAlertMessage('Fehler beim Laden der Praxisdaten');
            setAlertSeverity('error');
        }
    };

    const fetchData = async () => {
        try {
            const [
                patientsResponse,
                treatmentsResponse,
                practitionersResponse,
                roomsResponse
            ] = await Promise.all([
                api.get('patients/'),
                api.get('treatments/'),
                api.get('practitioners/'),
                api.get('rooms/')
            ]);

            const data = {
                patients: patientsResponse.data,
                treatments: treatmentsResponse.data,
                practitioners: practitionersResponse.data,
                rooms: roomsResponse.data
            };

            console.log('Geladene Daten:', data);

            // Ressourcen für den Kalender vorbereiten
            const practitionerResources = data.practitioners.map(p => ({
                id: `practitioner-${p.id}`,
                title: `${p.first_name} ${p.last_name}`,
                type: 'practitioner'
            }));

            const roomResources = data.rooms.map(r => ({
                id: `room-${r.id}`,
                title: r.name,
                type: 'room'
            }));

            setResources([...practitionerResources, ...roomResources]);
            setLoading(false);
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            setLoading(false);
        }
    };

    const fetchHolidays = async () => {
        try {
            const response = await api.get('local-holidays/');
            const holidayEvents = response.data.map(holiday => ({
                title: holiday.holiday_name,
                start: holiday.date,
                allDay: true,
                display: 'background',
                color: '#ff9999'
            }));
            setHolidays(holidayEvents);
        } catch (error) {
            console.error('Fehler beim Laden der Feiertage:', error);
        }
    };

    const getStatusColor = (status) => {
        return statusColors[status] || '#757575';
    };

    const handleEventClick = (clickInfo) => {
        setSelectedEvent(clickInfo.event);
        setOpenEventDialog(true);
    };

    const handleEventDrop = async (dropInfo) => {
        try {
            const event = dropInfo.event;
            
            // Prüfen ob der Termin noch im Status "planned" ist
            if (event.extendedProps.status !== 'planned') {
                dropInfo.revert();
                setAlertMessage('Nur geplante Termine können verschoben werden');
                setAlertSeverity('warning');
                return;
            }

            // Raum-ID aus den Ressourcen oder extendedProps holen
            const resourceId = dropInfo.newResource ? 
                dropInfo.newResource.id : 
                event.extendedProps.room;

            await api.put(`/appointments/${event.id}/`, {
                appointment_date: event.start,
                room: resourceId,
                status: 'planned',
                patient: event.extendedProps.patientId,
                treatment: event.extendedProps.treatmentId,
                practitioner: event.extendedProps.practitionerId,
                notes: event.extendedProps.notes
            });

            setAlertMessage('Termin erfolgreich verschoben');
            setAlertSeverity('success');
            fetchData();
        } catch (error) {
            console.error('Fehler beim Verschieben des Termins:', error);
            dropInfo.revert();
            setAlertMessage('Fehler beim Verschieben des Termins');
            setAlertSeverity('error');
        }
    };

    const handleEventResize = async (resizeInfo) => {
        try {
            const event = resizeInfo.event;
            
            // Prüfen ob der Termin noch im Status "planned" ist
            if (event.extendedProps.status !== 'planned') {
                resizeInfo.revert();
                setAlertMessage('Nur geplante Termine können angepasst werden');
                setAlertSeverity('warning');
                return;
            }

            const resourceId = event.getResources()[0]?.id || event.extendedProps.room;

            await api.put(`/appointments/${event.id}/`, {
                appointment_date: event.start,
                duration_minutes: Math.round((event.end - event.start) / (1000 * 60)),
                room: resourceId,
                status: 'planned',
                patient: event.extendedProps.patientId,
                treatment: event.extendedProps.treatmentId,
                practitioner: event.extendedProps.practitionerId,
                notes: event.extendedProps.notes
            });

            setAlertMessage('Termin erfolgreich angepasst');
            setAlertSeverity('success');
            fetchData();
        } catch (error) {
            console.error('Fehler beim Anpassen des Termins:', error);
            resizeInfo.revert();
            setAlertMessage('Fehler beim Anpassen des Termins');
            setAlertSeverity('error');
        }
    };

    const handleCloseDialog = () => {
        setOpenEventDialog(false);
        setSelectedEvent(null);
    };

    const handleDateSelect = (selectInfo) => {
        const viewType = selectInfo.view.type;
        
        if (viewType === 'dayGridMonth') {
            const calendarApi = selectInfo.view.calendar;
            calendarApi.changeView('resourceTimeGridDay', selectInfo.start);
            return;
        }

        const startTime = selectInfo.start;
        const endTime = selectInfo.end;
        
        // Setze Standardraum falls keiner ausgewählt
        let selectedRoom = selectInfo.resource ? selectInfo.resource.id : rooms[0]?.id?.toString();
        
        setNewAppointment(prev => ({
            ...prev,
            start_time: startTime,
            end_time: endTime,
            room: selectedRoom
        }));
        setOpenNewAppointmentDialog(true);
        
        // Selection aufheben
        selectInfo.view.calendar.unselect();
    };

    const handleNewAppointmentChange = (e) => {
        const { name, value } = e.target;
        setNewAppointment(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateAppointment = async () => {
        try {
            await api.post('/appointments/', newAppointment);
            await fetchData();
            setOpenNewAppointmentDialog(false);
            setNewAppointment({
                patient: '',
                treatment: '',
                practitioner: '',
                room: '',
                start_time: '',
                end_time: '',
                notes: ''
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des Termins:', error);
        }
    };

    const handleCreateSeries = () => {
        navigate('/appointments/series/new');
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleViewChange = (event, newView) => {
        if (newView !== null) {
            setViewMode(newView);
            if (newView !== 'table' && calendarRef.current) {
                setTimeout(() => {
                    const calendarApi = calendarRef.current?.getApi();
                    if (calendarApi) {
                        calendarApi.changeView(newView);
                    }
                }, 0);
            }
        }
    };

    const handlePrevClick = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.prev();
        }
    };

    const handleNextClick = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.next();
        }
    };

    const handleTodayClick = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.today();
        }
    };

    const handleCopyAppointment = () => {
        if (selectedEvent) {
            setNewAppointment({
                patient: selectedEvent.extendedProps.patientId,
                treatment: selectedEvent.extendedProps.treatmentId,
                practitioner: selectedEvent.extendedProps.practitionerId,
                room: selectedEvent.extendedProps.roomId,
                start_time: selectedEvent.start,
                end_time: selectedEvent.end,
                notes: selectedEvent.extendedProps.notes || ''
            });
            handleCloseDialog();
            setOpenNewAppointmentDialog(true);
        }
    };

    const handleDeleteAppointment = async () => {
        if (selectedEvent) {
            try {
                await api.delete(`/appointments/${selectedEvent.id}/`);
                setAlertMessage('Termin erfolgreich gelöscht');
                setAlertSeverity('success');
                handleCloseDialog();
                fetchData();
            } catch (error) {
                setAlertMessage('Fehler beim Löschen des Termins');
                setAlertSeverity('error');
            }
        }
    };

    const handleEditAppointment = async () => {
        try {
            await api.put(`/appointments/${selectedEvent.id}/`, {
                patient: newAppointment.patient,
                treatment: newAppointment.treatment,
                practitioner: newAppointment.practitioner,
                room: newAppointment.room,
                start_time: newAppointment.start_time,
                end_time: newAppointment.end_time,
                notes: newAppointment.notes
            });
            setAlertMessage('Termin erfolgreich aktualisiert');
            setAlertSeverity('success');
            handleCloseDialog();
            fetchData();
        } catch (error) {
            setAlertMessage('Fehler beim Aktualisieren des Termins');
            setAlertSeverity('error');
        }
    };

    const handleRoomToggle = (roomId) => {
        setSelectedRooms(prev => {
            if (prev.includes(roomId)) {
                // Wenn mindestens ein Raum übrig bleibt, erlaube das Ausblenden
                if (prev.length > 1) {
                    return prev.filter(id => id !== roomId);
                }
                return prev;
            }
            return [...prev, roomId];
        });
    };

    const handleResetRooms = () => {
        setSelectedRooms(rooms.map(room => room.id.toString()));
    };

    const filteredResources = resources.filter(resource => 
        selectedRooms.includes(resource.id)
    );

    const handleResourceLabelMount = (info) => {
        const resource = info.resource;
        const room = rooms.find(r => r.id.toString() === resource.id);
        
        if (room) {
            info.el.innerHTML = `
                <div style="padding: 2px;">
                    <div style="font-weight: bold;">${room.name}</div>
                    ${room.description ? `<div style="font-size: 0.8em;">${room.description}</div>` : ''}
                </div>
            `;
        }
    };

    const renderResourceLabel = (info) => {
        return {
            html: `<div class="fc-resource-label">${info.resource.title}</div>`
        };
    };

    const TableView = ({ rooms }) => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Datum</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Behandlung</TableCell>
                        <TableCell>Behandler</TableCell>
                        <TableCell>Raum</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {events.map((event) => (
                        <TableRow 
                            key={event.id}
                            onClick={() => handleEventClick({ event })}
                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
                        >
                            <TableCell>{formatDate(event.start)}</TableCell>
                            <TableCell>{event.extendedProps.patient}</TableCell>
                            <TableCell>{event.extendedProps.treatment}</TableCell>
                            <TableCell>{event.extendedProps.practitioner}</TableCell>
                            <TableCell>{event.extendedProps.room}</TableCell>
                            <TableCell>{event.extendedProps.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderEventContent = (eventInfo) => {
        if (eventInfo.event.display === 'background') {
            return (
                <div className="holiday-event">
                    <i>{eventInfo.event.title}</i>
                </div>
            );
        }
        return null;
    };

    const handleWeekendToggle = (event) => {
        setShowWeekends(event.target.checked);
    };

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch = searchQuery === '' || 
                event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.extendedProps.patient.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPractitioner = filterPractitioner === 'all' || 
                event.extendedProps.practitionerId === filterPractitioner;
            const matchesRoom = filterRoom === 'all' || 
                event.resourceId === filterRoom;
            return matchesSearch && matchesPractitioner && matchesRoom;
        });
    }, [events, searchQuery, filterPractitioner, filterRoom]);

    const eventDidMount = (info) => {
        if (info.event.extendedProps.status !== 'planned') {
            info.el.style.cursor = 'not-allowed';
            info.el.classList.add('fc-event-draggable-disabled');
        }

        // Event-Inhalt formatieren
        const eventContent = document.createElement('div');
        eventContent.innerHTML = `
            <div class="fc-event-main-frame">
                <div class="fc-event-title-container">
                    <div class="fc-event-title fc-sticky">
                        ${info.event.title}
                    </div>
                    <div style="font-size: 0.85em;">
                        ${info.event.extendedProps.practitioner || ''}
                    </div>
                </div>
            </div>
        `;

        // Tooltip Container erstellen
        const tooltipContainer = document.createElement('div');
        tooltipContainer.style.height = '100%';
        tooltipContainer.style.width = '100%';

        const root = createRoot(tooltipContainer);
        root.render(
            <MUITooltip
                title={
                    <div style={{ padding: '8px' }}>
                        <Typography variant="body2" component="div">
                            <strong>Patient:</strong> {info.event.title}<br />
                            <strong>Behandlung:</strong> {info.event.extendedProps.treatment}<br />
                            <strong>Behandler:</strong> {info.event.extendedProps.practitioner}<br />
                            <strong>Status:</strong> {info.event.extendedProps.status}<br />
                            <strong>Raum:</strong> {info.event.extendedProps.room}<br />
                            <strong>Zeit:</strong> {
                                new Date(info.event.start).toLocaleTimeString('de-DE', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            } - {
                                new Date(info.event.end).toLocaleTimeString('de-DE', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            }
                        </Typography>
                    </div>
                }
                arrow
                placement="top"
                enterDelay={200}
                leaveDelay={0}
            >
                <div style={{ height: '100%', width: '100%' }}>
                    {eventContent.outerHTML}
                </div>
            </MUITooltip>
        );

        // Alten Inhalt löschen und neuen hinzufügen
        info.el.innerHTML = '';
        info.el.appendChild(tooltipContainer);
    };

    const eventContent = (arg) => {
        return {
            html: `
                <div class="fc-event-main-frame">
                    <div class="fc-event-title-container">
                        <div class="fc-event-title fc-sticky">
                            ${arg.event.title}
                        </div>
                        <div style="font-size: 0.85em;">
                            ${arg.event.extendedProps.practitioner || ''}
                        </div>
                    </div>
                </div>
            `
        };
    };

    const renderViewButtons = () => (
        <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewChange}
            size="small"
        >
            <MUITooltip title="Monatsansicht">
                <ToggleButton value="dayGridMonth">
                    <CalendarMonthIcon />
                </ToggleButton>
            </MUITooltip>
            <MUITooltip title="Wochenansicht">
                <ToggleButton value="resourceTimeGridWeek">
                    <ViewWeekIcon />
                </ToggleButton>
            </MUITooltip>
            <MUITooltip title="Tagesansicht">
                <ToggleButton value="resourceTimeGridDay">
                    <TableViewIcon />
                </ToggleButton>
            </MUITooltip>
        </ToggleButtonGroup>
    );

    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', gap: 1 }}>
            <MUITooltip title="Termin bearbeiten">
                <IconButton onClick={() => setIsEditMode(true)}>
                    <EditIcon />
                </IconButton>
            </MUITooltip>
            <MUITooltip title="Termin kopieren">
                <IconButton onClick={handleCopyAppointment}>
                    <CopyIcon />
                </IconButton>
            </MUITooltip>
            <MUITooltip title="Termin drucken">
                <IconButton onClick={() => window.print()}>
                    <PrintIcon />
                </IconButton>
            </MUITooltip>
            <MUITooltip title="Termin löschen">
                <IconButton onClick={handleDeleteAppointment} color="error">
                    <DeleteIcon />
                </IconButton>
            </MUITooltip>
        </Box>
    );

    // Neue Funktion für die Terminsuche
    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    // Neue Funktion für den Export
    const handleExport = async (format) => {
        try {
            const response = await api.get(`/appointments/export/${format}/`);
            const blob = new Blob([response.data], { type: 'text/calendar' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `termine.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            setAlertMessage('Fehler beim Exportieren der Termine');
            setAlertSeverity('error');
        }
    };

    // Neue Funktion für Erinnerungen
    const handleSetReminder = async () => {
        try {
            await api.post('/appointments/reminders/', {
                appointment_id: selectedEvent.id,
                reminder_time: selectedReminderTime
            });
            setAlertMessage('Erinnerung erfolgreich gesetzt');
            setAlertSeverity('success');
            setReminderDialogOpen(false);
        } catch (error) {
            setAlertMessage('Fehler beim Setzen der Erinnerung');
            setAlertSeverity('error');
        }
    };

    // Aktualisierte Funktion zur Vorbereitung der Ressourcen
    const getActiveResources = () => {
        if (resourceType === 'rooms') {
            return rooms.map(room => ({
                id: `room-${room.id}`,
                title: room.name,
                type: 'room'
            }));
        } else {
            return practitioners.map(practitioner => ({
                id: `practitioner-${practitioner.id}`,
                title: `${practitioner.first_name} ${practitioner.last_name}`,
                type: 'practitioner'
            }));
        }
    };

    // Aktualisierte Funktion für die Event-Zuordnung
    const getResourceId = (event) => {
        if (resourceType === 'rooms') {
            return `room-${typeof event.room === 'object' ? event.room?.id : event.room}`;
        } else {
            return `practitioner-${typeof event.practitioner === 'object' ? event.practitioner?.id : event.practitioner}`;
        }
    };

    // Fügen Sie diese Komponente zum Header-Bereich hinzu
    const ResourceTypeToggle = () => (
        <ToggleButtonGroup
            value={resourceType}
            exclusive
            onChange={(e, newValue) => {
                if (newValue !== null) {
                    setResourceType(newValue);
                }
            }}
            size="small"
        >
            <ToggleButton value="rooms">
                <MUITooltip title="Nach Räumen anzeigen">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MeetingRoomIcon />
                        <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Räume
                        </Typography>
                    </Box>
                </MUITooltip>
            </ToggleButton>
            <ToggleButton value="practitioners">
                <MUITooltip title="Nach Behandlern anzeigen">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon />
                        <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Behandler
                        </Typography>
                    </Box>
                </MUITooltip>
            </ToggleButton>
        </ToggleButtonGroup>
    );

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3 }}>
            {/* Alert-Komponente */}
            {alertMessage && (
                <Alert 
                    severity={alertSeverity}
                    sx={{ mb: 2 }}
                    onClose={() => setAlertMessage(null)}
                    variant="filled"
                >
                    {alertMessage}
                </Alert>
            )}

            {/* Header mit Controls */}
            <Paper sx={calendarStyles.header}>
                <Box sx={calendarStyles.controls}>
                    {renderViewButtons()}
                    <Box sx={{ mx: 2 }}>
                        <IconButton onClick={handlePrevClick}>
                            <NavigateBeforeIcon />
                        </IconButton>
                        <IconButton onClick={handleTodayClick}>
                            <TodayIcon />
                        </IconButton>
                        <IconButton onClick={handleNextClick}>
                            <NavigateNextIcon />
                        </IconButton>
                    </Box>
                    {viewMode === 'resourceTimeGridDay' && <ResourceTypeToggle />}
                </Box>
                <Box sx={calendarStyles.controls}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showWeekends}
                                onChange={handleWeekendToggle}
                                color="primary"
                            />
                        }
                        label="Wochenenden anzeigen"
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenNewAppointmentDialog(true)}
                    >
                        Neuer Termin
                    </Button>
                </Box>
            </Paper>

            {/* Raumauswahl */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <RoomSelector
                    rooms={rooms}
                    selectedRooms={selectedRooms}
                    onRoomToggle={handleRoomToggle}
                />
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handleResetRooms}
                    sx={{ height: 'fit-content' }}
                >
                    Alle Räume anzeigen
                </Button>
            </Box>

            {/* Statistik-Übersicht */}
            <StatsOverview stats={stats} />

            {/* Suchfeld hinzufügen */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Termine suchen..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* Hauptkalender */}
            <Paper sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[resourceTimeGridPlugin, resourceTimelinePlugin, dayGridPlugin, interactionPlugin]}
                    initialView="resourceTimeGridDay"
                    schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                    locale={deLocale}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'timeGridDay,timeGridWeek,dayGridMonth'
                    }}
                    slotDuration="01:00:00"
                    slotMinTime="06:00:00"
                    slotMaxTime="20:00:00"
                    height="100%"
                    expandRows={true}
                    slotEventOverlap={false}
                    allDaySlot={false}
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={showWeekends}
                    resources={getActiveResources()}
                    datesSet={fetchData}
                    views={{
                        timeGridDay: {
                            type: 'resourceTimeGrid',
                            duration: { days: 1 },
                            buttonText: 'Tag',
                            resources: resources
                        },
                        timeGridWeek: {
                            type: 'timeGrid',
                            duration: { weeks: 1 },
                            buttonText: 'Woche'
                        },
                        dayGridMonth: {
                            type: 'dayGrid',
                            duration: { months: 1 },
                            buttonText: 'Monat'
                        }
                    }}
                    eventClick={handleEventClick}
                    eventDrop={(info) => {
                        if (info.view.type === 'timeGridDay') {
                            handleEventDrop(info);
                        }
                    }}
                    eventResize={(info) => {
                        if (info.view.type === 'timeGridDay') {
                            handleEventResize(info);
                        }
                    }}
                    select={(selectInfo) => {
                        if (selectInfo.view.type === 'dayGridMonth') {
                            const calendarApi = selectInfo.view.calendar;
                            calendarApi.changeView('timeGridDay', selectInfo.start);
                        } else {
                            handleDateSelect(selectInfo);
                        }
                    }}
                    eventDidMount={eventDidMount}
                    eventContent={(arg) => <CustomEventContent event={arg.event} />}
                    eventMinHeight={40}
                    slotMinHeight={40}
                    selectConstraint={{
                        startTime: '06:00:00',
                        endTime: '20:00:00'
                    }}
                    selectOverlap={false}
                    nowIndicator={true}
                    resourceAreaHeaderContent={resourceType === 'rooms' ? "Räume" : "Behandler"}
                    resourceAreaWidth={200}
                    resourceLabelContent={(arg) => ({
                        html: `<div class="fc-resource-label">
                            <div class="resource-title">${arg.resource.title}</div>
                            ${arg.resource.extendedProps?.description || ''}
                        </div>`
                    })}
                    events={
                        events
                            .filter(event =>
                                resourceType === 'rooms'
                                    ? event.room
                                    : event.practitioner
                            )
                            .map(event => ({
                                ...event,
                                resourceId:
                                    resourceType === 'rooms'
                                        ? `room-${typeof event.room === 'object' ? event.room?.id : event.room}`
                                        : `practitioner-${typeof event.practitioner === 'object' ? event.practitioner?.id : event.practitioner}`
                            }))
                    }
                    sx={calendarStyles.calendar}
                />
            </Paper>

            <SpeedDial
                ariaLabel="Termin-Aktionen"
                sx={{ position: 'absolute', bottom: 16, right: 16 }}
                icon={<SpeedDialIcon />}
            >
                <SpeedDialAction
                    icon={<AddIcon />}
                    tooltipTitle="Einzeltermin"
                    onClick={() => setOpenNewAppointmentDialog(true)}
                />
                <SpeedDialAction
                    icon={<AddIcon />}
                    tooltipTitle="Terminserie"
                    onClick={handleCreateSeries}
                />
            </SpeedDial>

            <Dialog 
                open={openEventDialog} 
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Termin Details
                    {renderActionButtons()}
                </DialogTitle>
                <DialogContent>
                    {selectedEvent && !isEditMode && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                {selectedEvent.title}
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Chip 
                                    label={selectedEvent.extendedProps.status}
                                    sx={{ 
                                        backgroundColor: getStatusColor(selectedEvent.extendedProps.status),
                                        color: 'white'
                                    }}
                                />
                            </Box>
                            <Typography><strong>Patient:</strong> {selectedEvent.extendedProps.patient}</Typography>
                            <Typography><strong>Behandlung:</strong> {selectedEvent.extendedProps.treatment}</Typography>
                            <Typography><strong>Behandler:</strong> {selectedEvent.extendedProps.practitioner}</Typography>
                            <Typography><strong>Raum:</strong> {selectedEvent.extendedProps.room}</Typography>
                            <Typography><strong>Beginn:</strong> {new Date(selectedEvent.start).toLocaleString()}</Typography>
                            <Typography><strong>Ende:</strong> {new Date(selectedEvent.end).toLocaleString()}</Typography>
                        </Box>
                    )}
                    {selectedEvent && isEditMode && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Patient</InputLabel>
                                    <Select
                                        name="patient"
                                        value={newAppointment.patient}
                                        onChange={handleNewAppointmentChange}
                                        label="Patient"
                                    >
                                        {patients && patients.length > 0 ? (
                                            patients.map(patient => (
                                                <MenuItem key={patient.id} value={patient.id}>
                                                    {`${patient.first_name} ${patient.last_name}`}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem disabled>Keine Patienten verfügbar</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Behandlung</InputLabel>
                                    <Select
                                        name="treatment"
                                        value={newAppointment.treatment}
                                        onChange={handleNewAppointmentChange}
                                        label="Behandlung"
                                    >
                                        {treatments && treatments.length > 0 ? (
                                            treatments.map(treatment => (
                                                <MenuItem key={treatment.id} value={treatment.id}>
                                                    {treatment.name}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem disabled>Keine Behandlungen verfügbar</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Behandler</InputLabel>
                                    <Select
                                        name="practitioner"
                                        value={newAppointment.practitioner}
                                        onChange={handleNewAppointmentChange}
                                        label="Behandler"
                                    >
                                        {practitioners && practitioners.length > 0 ? (
                                            practitioners.map(practitioner => (
                                                <MenuItem key={practitioner.id} value={practitioner.id}>
                                                    {`${practitioner.first_name} ${practitioner.last_name}`}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem disabled>Keine Behandler verfügbar</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default Calendar;