import React, { useState } from 'react';
import PractitionerCalendar from './PractitionerCalendar';
import RoomsCalendar from './RoomsCalendar';
import { ToggleButton, ToggleButtonGroup, Box, Button, Typography, IconButton, Stack } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import deLocale from 'date-fns/locale/de';
import TodayIcon from '@mui/icons-material/Today';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const allowedViews = ['resourceTimeGridDay', 'resourceTimeGridWeek', 'dayGridMonth'];
const getInitialView = () => {
    const stored = localStorage.getItem('calendar_view');
    return allowedViews.includes(stored) ? stored : 'resourceTimeGridWeek';
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
    const [view, setView] = useState(getInitialView);
    const [currentDate, setCurrentDate] = useState(() => localStorage.getItem('calendar_date') || new Date().toISOString().slice(0, 10));
    const [mode, setMode] = useState('rooms');

    const handleViewChange = (newView) => {
        if (allowedViews.includes(newView)) {
            setView(newView);
            localStorage.setItem('calendar_view', newView);
        }
    };
    const handleDateChange = (newDate) => {
        const iso = newDate instanceof Date ? newDate.toISOString().slice(0, 10) : newDate;
        setCurrentDate(iso);
        localStorage.setItem('calendar_date', iso);
    };

    // Navigation
    const handleToday = () => handleDateChange(new Date());
    const handlePrev = () => {
        const d = new Date(currentDate);
        if (view === 'resourceTimeGridDay') d.setDate(d.getDate() - 1);
        else if (view === 'resourceTimeGridWeek') d.setDate(d.getDate() - 7);
        else if (view === 'dayGridMonth') d.setMonth(d.getMonth() - 1);
        handleDateChange(d);
    };
    const handleNext = () => {
        const d = new Date(currentDate);
        if (view === 'resourceTimeGridDay') d.setDate(d.getDate() + 1);
        else if (view === 'resourceTimeGridWeek') d.setDate(d.getDate() + 7);
        else if (view === 'dayGridMonth') d.setMonth(d.getMonth() + 1);
        handleDateChange(d);
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

                {/* DatePicker */}
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
                    <DatePicker
                        label="Datum wählen"
                        value={currentDate}
                        onChange={handleDateChange}
                        format="dd.MM.yyyy"
                        slotProps={{
                            textField: { size: 'small', sx: { minWidth: 80 } }
                        }}
                    />
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
                />
            ) : (
                <PractitionerCalendar
                    view={view}
                    date={currentDate}
                    onViewChange={handleViewChange}
                    onDateChange={handleDateChange}
                />
            )}
        </Box>
    );
};

export default Calendar;
