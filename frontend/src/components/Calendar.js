import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PractitionerCalendar from './PractitionerCalendar';
import RoomsCalendar from './RoomsCalendar';
import { ToggleButton, ToggleButtonGroup, Box, Button, Typography, IconButton, Stack, Select, MenuItem, FormControl, InputLabel, OutlinedInput, Checkbox, ListItemText, ListSubheader, Divider } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import deLocale from 'date-fns/locale/de';
import TodayIcon from '@mui/icons-material/Today';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TableRowsIcon from '@mui/icons-material/TableRows';
import AddIcon from '@mui/icons-material/Add';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import api from '../api/axios';

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

const Calendar = () => {
    const navigate = useNavigate();
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

    // Speichere Modus im localStorage wenn er sich ändert
    useEffect(() => {
        localStorage.setItem('calendar_mode', mode);
    }, [mode]);

    // Lade Ressourcen (Räume oder Behandler) beim Start und wenn sich der Modus ändert
    useEffect(() => {
        const fetchResources = async () => {
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

    return (
        <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
                {/* Ansichtsauswahl */}
                <ToggleButtonGroup
                    value={view}
                    exclusive
                    onChange={(e, v) => v && handleViewChange(v)}
                    size="small"
                >
                    <ToggleButton value="resourceTimeGridDay"><TableRowsIcon /> Tag</ToggleButton>
                    <ToggleButton value="resourceTimeGridWeek"><ViewWeekIcon /> Woche</ToggleButton>
                    <ToggleButton value="dayGridMonth"><CalendarMonthIcon /> Monat</ToggleButton>
                </ToggleButtonGroup>

                {/* Räume/Behandler Umschalter */}
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(e, v) => v && setMode(v)}
                    size="small"
                >
                    <ToggleButton value="rooms">Räume</ToggleButton>
                    <ToggleButton value="practitioners">Behandler</ToggleButton>
                </ToggleButtonGroup>

                {/* Ressourcen-Auswahl Dropdown */}
                <FormControl sx={{ minWidth: 200 }} size="small">
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
                                    width: 250
                                }
                            }
                        }}
                    >
                        <ListSubheader>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2">
                                    {selectedResources.length} ausgewählt
                                </Typography>
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

                {/* Termin anlegen Button */}
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddAppointment}
                    size="small"
                >
                    Termin anlegen
                </Button>

                {/* DatePicker */}
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
                    <Box sx={{ position: 'relative' }}>
                        <IconButton size="small" onClick={() => setOpenDatePicker(true)}>
                            <CalendarMonthIcon />
                        </IconButton>
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
                <IconButton onClick={handlePrev}><ChevronLeftIcon /></IconButton>
                <Button onClick={handleToday} variant="outlined" startIcon={<TodayIcon />}>Heute</Button>
                <IconButton onClick={handleNext}><ChevronRightIcon /></IconButton>

                {/* Aktuelle Ansichtsanzeige */}
                <Typography variant="subtitle1" sx={{ ml: 2, fontWeight: 500 }}>
                    {getCurrentLabel(view, currentDate)}
                </Typography>
            </Stack>

            {/* Kalender */}
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
                />
            )}
        </Box>
    );
};

export default Calendar;
