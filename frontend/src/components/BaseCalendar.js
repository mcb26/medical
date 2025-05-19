import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';

const allowedViews = ['resourceTimeGridDay', 'resourceTimeGridWeek', 'dayGridMonth'];

const BaseCalendar = ({
    resources,
    events,
    resourceType, // "rooms" oder "practitioners"
    view,
    date,
    onViewChange,
    onDateChange,
    calendarKey,
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
                eventClick={props.onEventClick}
                eventDrop={props.onEventDrop}
                eventResize={props.onEventResize}
                resourceAreaHeaderContent={resourceType === 'rooms' ? "Räume" : "Behandler"}
                headerToolbar={false}
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
};

export default BaseCalendar; 