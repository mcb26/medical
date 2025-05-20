import React, { useRef, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';
import { addHours } from 'date-fns';
import api from '../api/axios';

const allowedViews = ['resourceTimeGridDay', 'resourceTimeGridWeek', 'dayGridMonth'];

function addHoursToTimeString(time, hours) {
    let [h, m] = time.split(':').map(Number);
    let newH = h + hours;
    if (newH < 0) newH = 0;
    if (newH > 23) newH = 23;
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

const BaseCalendar = ({
    resources,
    events,
    resourceType, // "rooms" oder "practitioners"
    view,
    date,
    onViewChange,
    onDateChange,
    onEventDrop,
    onEventResize,
    calendarKey,
    start = "07:00",
    end = "19:00",
    extraStart = 0,
    extraEnd = 0,
    maxHeight = 200,
    onEventDoubleClick,
    ...props
}) => {
    const calendarRef = useRef();

    // Ansicht und Datum synchronisieren, wenn Props sich ändern
    useEffect(() => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            if (api && api.view && api.view.type !== view && allowedViews.includes(view)) {
                api.changeView(view);
            }
            if (api && date && api.getDate().toISOString().slice(0, 10) !== date) {
                api.gotoDate(date);
            }
        }
    }, [view, date]);

    // calendarKey NICHT an FullCalendar weitergeben!
    const { calendarKey: _omit, ...restProps } = props;

    // Arbeitszeiten berechnen
    const slotMinTime = addHoursToTimeString(start, -extraStart);
    const slotMaxTime = addHoursToTimeString(end, extraEnd);

    const numHours =
        parseInt(slotMaxTime.split(':')[0]) - parseInt(slotMinTime.split(':')[0]);
    const rowHeight = 60; // px pro Stunde
    const calendarHeight = numHours * rowHeight;

    // Double-Click-Logik
    const lastClickRef = useRef({ id: null, time: 0 });

    const handleEventClick = (info) => {
        const now = Date.now();
        if (
            lastClickRef.current.id === info.event.id &&
            now - lastClickRef.current.time < 400 // 400ms als Double-Click-Intervall
        ) {
            if (onEventDoubleClick) onEventDoubleClick(info);
        }
        lastClickRef.current = { id: info.event.id, time: now };
    };

    return (
        <Box>
            <FullCalendar
                ref={calendarRef}
                plugins={[resourceTimeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView={view}
                initialDate={date}
                schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                locale={deLocale}
                resources={resources}
                events={events}
                eventClick={handleEventClick}
                eventDrop={props.onEventDrop}
                eventResize={props.onEventResize}
                editable={true}
                resourceAreaHeaderContent={resourceType === 'rooms' ? "Räume" : "Behandler"}
                headerToolbar={false}
                slotMinTime={slotMinTime}
                slotMaxTime={slotMaxTime}
                height={calendarHeight}
                {...restProps}
                datesSet={(arg) => {
                    // Ansicht und Datum an Parent melden
                    if (onViewChange && arg.view.type !== view) onViewChange(arg.view.type);
                    if (onDateChange && arg.startStr !== date) onDateChange(arg.startStr);
                }}
            />
        </Box>
    );
};

BaseCalendar.defaultProps = {
    onViewChange: () => {},
    onDateChange: () => {},
    start: "07:00",
    end: "19:00",
    extraStart: 0,
    extraEnd: 0,
    maxHeight: 700,
};

export default BaseCalendar; 