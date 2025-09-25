import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PractitionerCalendar from './PractitionerCalendar';
import RoomsCalendar from './RoomsCalendar';
import { 
  ToggleButton, 
  ToggleButtonGroup, 
  Box, 
  Button, 
  Typography, 
  IconButton, 
  Stack, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  OutlinedInput, 
  Checkbox, 
  ListItemText, 
  ListSubheader, 
  Divider,
  useTheme,
  useMediaQuery,
  Collapse,
  Card,
  CardContent
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import deLocale from 'date-fns/locale/de';
import TodayIcon from '@mui/icons-material/Today';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TableRowsIcon from '@mui/icons-material/TableRows';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WeekendIcon from '@mui/icons-material/Weekend';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import api from '../api/axios';
import { isAuthenticated } from '../services/auth';

const allowedViews = ['resourceTimeGridDay', 'resourceTimeGridWeek', 'dayGridMonth'];
const getInitialView = () => {
    const stored = localStorage.getItem('calendar_view');
    return allowedViews.includes(stored) ? stored : 'resourceTimeGridDay';
};

function getCurrentLabel(view, date) {
    const d = new Date(date);
    if (view === 'resourceTimeGridDay') {
        return format(d, "EEEE, dd.MM.yyyy", { locale: deLocale });
    }
    if (view === 'resourceTimeGridWeek') {
        const start = startOfWeek(d, { weekStartsOn: 1 });
        const end = endOfWeek(d, { weekStartsOn: 1 });
        const weekNumber = format(d, "I", { locale: deLocale }); // ISO week
        return `Woche ${weekNumber}: ${format(start, "dd.MM.yyyy", { locale: deLocale })} – ${format(end, "dd.MM.yyyy", { locale: deLocale })}`;
    }

    if (view === 'dayGridMonth') {
        return format(d, "MMMM yyyy", { locale: deLocale });
    }
    return "";
}

const getInitialShowWeekends = () => {
    const stored = localStorage.getItem('calendar_show_weekends');
    return stored === null ? true : stored === 'true';
};

const Calendar = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [view, setView] = useState(getInitialView);
    const [currentDate, setCurrentDate] = useState(() => {
        const stored = localStorage.getItem('calendar_date');
        return stored ? new Date(stored) : new Date();
    });
    const [mode, setMode] = useState(() => localStorage.getItem('calendar_mode') || 'rooms');
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [selectedResources, setSelectedResources] = useState(() => {
        const stored = localStorage.getItem(`selected_${mode}`);
        return stored ? JSON.parse(stored) : [];
    });
    const [resources, setResources] = useState([]);
    const [practiceSettings, setPracticeSettings] = useState(null);
    const [showWeekends, setShowWeekends] = useState(getInitialShowWeekends);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Speichere Modus im localStorage wenn er sich ändert
    useEffect(() => {
        localStorage.setItem('calendar_mode', mode);
    }, [mode]);

    // Authentifizierungsprüfung
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
    }, [navigate]);

    // Lade Praxiseinstellungen beim Start
    useEffect(() => {
        const fetchPracticeSettings = async () => {
            if (!isAuthenticated()) return;
            
            try {
                const response = await api.get('/practice/get_instance/');
                setPracticeSettings(response.data);
            } catch (error) {
                console.error('Fehler beim Laden der Praxiseinstellungen:', error);
            }
        };
        fetchPracticeSettings();
    }, []);

    // Lade Ressourcen (Räume oder Behandler) beim Start und wenn sich der Modus ändert
    useEffect(() => {
        const fetchResources = async () => {
            if (!isAuthenticated()) return;
            
            try {
                const endpoint = mode === 'rooms' ? '/rooms/' : '/practitioners/';
                const response = await api.get(endpoint);
                setResources(response.data);
                
                // Lade gespeicherte Auswahl aus dem localStorage
                const stored = localStorage.getItem(`selected_${mode}`);
                if (stored) {
                    const parsedStored = JSON.parse(stored);
                    // Stelle sicher, dass nur gültige IDs ausgewählt sind
                    const validIds = response.data.map(r => r.id);
                    const filteredIds = parsedStored.filter(id => validIds.includes(id));
                    
                    // Wenn keine gültigen IDs gefunden wurden, wähle alle aus
                    if (filteredIds.length === 0) {
                        setSelectedResources(response.data.map(r => r.id));
                    } else {
                        setSelectedResources(filteredIds);
                    }
                } else {
                    // Wenn keine Auswahl gespeichert ist, wähle alle aus
                    setSelectedResources(response.data.map(r => r.id));
                }
            } catch (error) {
                console.error('Fehler beim Laden der Ressourcen:', error);
            }
        };
        fetchResources();
    }, [mode]);

    // Speichere Auswahl im localStorage wenn sie sich ändert
    useEffect(() => {
        if (selectedResources.length > 0) {
            localStorage.setItem(`selected_${mode}`, JSON.stringify(selectedResources));
        }
    }, [selectedResources, mode]);

    useEffect(() => {
        localStorage.setItem('calendar_show_weekends', showWeekends);
    }, [showWeekends]);

    const handleResourceChange = (event) => {
        const {
            target: { value },
        } = event;
        setSelectedResources(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleViewChange = (newView) => {
        if (allowedViews.includes(newView)) {
            setView(newView);
            localStorage.setItem('calendar_view', newView);
        }
    };

    const handleDateChange = (newDate) => {
        if (!(newDate instanceof Date) || isNaN(newDate)) {
            return;
        }
        setCurrentDate(newDate);
        localStorage.setItem('calendar_date', newDate.toISOString());
    };

    // Navigation
    const handleToday = () => handleDateChange(new Date());
    const handlePrev = () => {
        const d = new Date(currentDate);
        if (view === 'resourceTimeGridDay') {
            d.setDate(d.getDate() - 1);
        } else if (view === 'resourceTimeGridWeek') {
            d.setDate(d.getDate() - 7);
        } else if (view === 'dayGridMonth') {
            d.setDate(1);
            d.setMonth(d.getMonth() - 1);
        }
        handleDateChange(d);
    };
    const handleNext = () => {
        const d = new Date(currentDate);
        if (view === 'resourceTimeGridDay') {
            d.setDate(d.getDate() + 1);
        } else if (view === 'resourceTimeGridWeek') {
            d.setDate(d.getDate() + 7);
        } else if (view === 'dayGridMonth') {
            d.setDate(1);
            d.setMonth(d.getMonth() + 1);
        }
        handleDateChange(d);
    };

    const handleAddAppointment = () => {
        navigate('/appointments/new');
    };

    const handleMarkAllCompletedAsReadyToBill = async () => {
        try {
            // Hole alle Termine mit Status 'completed'
            const response = await api.get('/appointments/', {
                params: { status: 'completed' }
            });
            
            const completedAppointments = response.data;
            
            if (completedAppointments.length === 0) {
                alert('Keine abgeschlossenen Termine gefunden.');
                return;
            }
            
            // Bestätigung vom Benutzer
            const confirmed = window.confirm(
                `${completedAppointments.length} abgeschlossene Termine werden als abrechnungsbereit markiert. Fortfahren?`
            );
            
            if (!confirmed) return;
            
            // Setze alle Termine auf 'ready_to_bill'
            const updatePromises = completedAppointments.map(appointment => 
                api.patch(`/appointments/${appointment.id}/`, {
                    status: 'ready_to_bill'
                })
            );
            
            await Promise.all(updatePromises);
            
            alert(`${completedAppointments.length} Termine wurden erfolgreich als abrechnungsbereit markiert!`);
            
            // Lade die Kalender neu (durch Neuladen der Seite)
            window.location.reload();
            
        } catch (error) {
            console.error('Fehler beim Markieren der Termine:', error);
            alert('Fehler beim Markieren der Termine. Bitte versuchen Sie es erneut.');
        }
    };

    return (
        <Box sx={{ 
            p: { xs: 0.5, sm: 1 }, 
            height: '100vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Mobile Menu Toggle */}
            {isMobile && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<MenuIcon />}
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        size="small"
                    >
                        Kalender-Einstellungen
                    </Button>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {getCurrentLabel(view, currentDate)}
                    </Typography>
                </Box>
            )}

            {/* Controls Section */}
            <Collapse in={!isMobile || showMobileMenu}>
                <Card sx={{ mb: 1, p: { xs: 0.5, sm: 1 } }}>
                    <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
                        <Stack 
                            direction={isMobile ? 'column' : 'row'} 
                            spacing={isMobile ? 2 : 1} 
                            alignItems={isMobile ? 'stretch' : 'center'}
                            sx={{ flexWrap: 'wrap' }}
                        >
                            {/* Ansichtsauswahl */}
                            <ToggleButtonGroup
                                value={view}
                                exclusive
                                onChange={(e, v) => v && handleViewChange(v)}
                                size={isMobile ? 'medium' : 'small'}
                                orientation={isMobile ? 'horizontal' : 'horizontal'}
                                sx={{ 
                                    width: isMobile ? '100%' : 'auto',
                                    '& .MuiToggleButton-root': {
                                        flex: isMobile ? 1 : 'none',
                                        minWidth: isMobile ? 'auto' : '60px'
                                    }
                                }}
                            >
                                <ToggleButton value="resourceTimeGridDay">
                                    {!isSmallMobile && <TableRowsIcon sx={{ mr: 1 }} />}
                                    {isSmallMobile ? 'Tag' : 'Tag'}
                                </ToggleButton>
                                <ToggleButton value="resourceTimeGridWeek">
                                    {!isSmallMobile && <ViewWeekIcon sx={{ mr: 1 }} />}
                                    {isSmallMobile ? 'Woche' : 'Woche'}
                                </ToggleButton>
                                <ToggleButton value="dayGridMonth">
                                    {!isSmallMobile && <CalendarMonthIcon sx={{ mr: 1 }} />}
                                    {isSmallMobile ? 'Monat' : 'Monat'}
                                </ToggleButton>
                            </ToggleButtonGroup>

                            {/* Räume/Behandler Umschalter */}
                            <ToggleButtonGroup
                                value={mode}
                                exclusive
                                onChange={(e, v) => v && setMode(v)}
                                size={isMobile ? 'medium' : 'small'}
                                orientation={isMobile ? 'horizontal' : 'horizontal'}
                                sx={{ 
                                    width: isMobile ? '100%' : 'auto',
                                    '& .MuiToggleButton-root': {
                                        flex: isMobile ? 1 : 'none'
                                    }
                                }}
                            >
                                <ToggleButton value="rooms">Räume</ToggleButton>
                                <ToggleButton value="practitioners">Behandler</ToggleButton>
                            </ToggleButtonGroup>

                            {/* Ressourcen-Auswahl Dropdown */}
                            <FormControl 
                                sx={{ 
                                    minWidth: isMobile ? '100%' : 200,
                                    width: isMobile ? '100%' : 'auto'
                                }} 
                                size={isMobile ? 'medium' : 'small'}
                            >
                                <InputLabel id="resources-select-label">
                                    {mode === 'rooms' ? 'Räume' : 'Behandler'}
                                </InputLabel>
                                <Select
                                    labelId="resources-select-label"
                                    multiple
                                    value={selectedResources}
                                    onChange={handleResourceChange}
                                    input={<OutlinedInput label={mode === 'rooms' ? 'Räume' : 'Behandler'} />}
                                    renderValue={(selected) => (
                                        <Typography variant="body2">
                                            {selected.length} {mode === 'rooms' ? 'Räume' : 'Behandler'} ausgewählt
                                        </Typography>
                                    )}
                                    MenuProps={{
                                        PaperProps: {
                                            style: {
                                                maxHeight: 400,
                                                width: isMobile ? '90vw' : 250
                                            }
                                        }
                                    }}
                                >
                                    <ListSubheader>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            flexDirection: isMobile ? 'column' : 'row',
                                            gap: isMobile ? 1 : 0
                                        }}>
                                            <Typography variant="subtitle2">
                                                {selectedResources.length} ausgewählt
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedResources(resources.map(r => r.id));
                                                    }}
                                                >
                                                    Alle
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedResources([]);
                                                    }}
                                                >
                                                    Keine
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </ListSubheader>
                                    <Divider />
                                    {resources.map((resource) => (
                                        <MenuItem 
                                            key={resource.id} 
                                            value={resource.id}
                                            sx={{
                                                py: 0.5,
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <Checkbox 
                                                checked={selectedResources.includes(resource.id)}
                                                size="small"
                                            />
                                            <ListItemText 
                                                primary={mode === 'rooms' ? resource.name : `${resource.first_name} ${resource.last_name}`}
                                                primaryTypographyProps={{
                                                    variant: 'body2'
                                                }}
                                            />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Wochenend-Anzeige Umschalter */}
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5,
                                width: isMobile ? '100%' : 'auto'
                            }}>
                                <Checkbox
                                    checked={showWeekends}
                                    onChange={e => setShowWeekends(e.target.checked)}
                                    size={isMobile ? 'medium' : 'small'}
                                />
                                <WeekendIcon 
                                    sx={{ 
                                        fontSize: isMobile ? '1.2rem' : '1rem',
                                        color: showWeekends ? 'primary.main' : 'text.secondary'
                                    }} 
                                />
                            </Box>

                            {/* Action Buttons */}
                            <Stack 
                                direction={isMobile ? 'column' : 'row'} 
                                spacing={1}
                                sx={{ width: isMobile ? '100%' : 'auto' }}
                            >
                                {/* Termin anlegen Button */}
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddAppointment}
                                    size={isMobile ? 'medium' : 'small'}
                                    fullWidth={isMobile}
                                >
                                    {isSmallMobile ? 'Termin' : 'Termin anlegen'}
                                </Button>

                                {/* Alle Completed als Ready to Bill markieren */}
                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<CheckCircleIcon />}
                                    onClick={handleMarkAllCompletedAsReadyToBill}
                                    size={isMobile ? 'medium' : 'small'}
                                    fullWidth={isMobile}
                                >
                                    {isSmallMobile ? 'Abrechnungsbereit' : 'Alle abgeschlossen → Abrechnungsbereit'}
                                </Button>
                            </Stack>

                            {/* DatePicker und Navigation */}
                            <Stack 
                                direction={isMobile ? 'column' : 'row'} 
                                spacing={1}
                                alignItems={isMobile ? 'stretch' : 'center'}
                                sx={{ width: isMobile ? '100%' : 'auto' }}
                            >
                                {/* DatePicker */}
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
                                    <Box sx={{ position: 'relative' }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<CalendarMonthIcon />}
                                            onClick={() => setOpenDatePicker(true)}
                                            size={isMobile ? 'medium' : 'small'}
                                            fullWidth={isMobile}
                                        >
                                            {format(currentDate, 'dd.MM.yyyy')}
                                        </Button>
                                        <DatePicker
                                            open={openDatePicker}
                                            onClose={() => setOpenDatePicker(false)}
                                            value={currentDate}
                                            onChange={(newDate) => {
                                                handleDateChange(newDate);
                                                setOpenDatePicker(false);
                                            }}
                                            format="dd.MM.yyyy"
                                            slotProps={{
                                                textField: {
                                                    sx: { display: 'none' }
                                                },
                                                actionBar: {
                                                    actions: ['today', 'clear'],
                                                },
                                            }}
                                            views={['year', 'month', 'day']}
                                            showDaysOutsideCurrentMonth
                                            closeOnSelect
                                            maxDate={new Date('2100-12-31')}
                                            minDate={new Date('2000-01-01')}
                                        />
                                    </Box>
                                </LocalizationProvider>

                                {/* Navigation */}
                                <Stack direction="row" spacing={1} justifyContent="center">
                                    <IconButton onClick={handlePrev} size={isMobile ? 'medium' : 'small'}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                    <Button 
                                        onClick={handleToday} 
                                        variant="outlined" 
                                        startIcon={<TodayIcon />}
                                        size={isMobile ? 'medium' : 'small'}
                                    >
                                        {isSmallMobile ? 'Heute' : 'Heute'}
                                    </Button>
                                    <IconButton onClick={handleNext} size={isMobile ? 'medium' : 'small'}>
                                        <ChevronRightIcon />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            </Collapse>

            {/* Desktop Current View Label */}
            {!isMobile && (
                <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 500, mb: 1, fontSize: '0.9rem' }}>
                    {getCurrentLabel(view, currentDate)}
                </Typography>
            )}

            {/* Kalender */}
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {mode === 'rooms' ? (
                    <RoomsCalendar
                        view={view}
                        date={currentDate}
                        onViewChange={handleViewChange}
                        onDateChange={handleDateChange}
                        selectedResources={selectedResources}
                        resources={resources}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onToday={handleToday}
                        openingHours={practiceSettings?.opening_hours}
                        showWeekends={showWeekends}
                    />
                ) : (
                    <PractitionerCalendar
                        view={view}
                        date={currentDate}
                        onViewChange={handleViewChange}
                        onDateChange={handleDateChange}
                        selectedResources={selectedResources}
                        resources={resources}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onToday={handleToday}
                        openingHours={practiceSettings?.opening_hours}
                        showWeekends={showWeekends}
                    />
                )}
            </Box>
        </Box>
    );
};

export default Calendar;
