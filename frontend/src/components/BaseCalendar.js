import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';

const plugins = [
    resourceTimeGridPlugin,
    interactionPlugin,
    dayGridPlugin,
    timeGridPlugin
];

const renderEventContent = (eventInfo) => {
    const { treatment_name, patient_name, duration_minutes } = eventInfo.event.extendedProps;
    return (
        <div className="fc-event-main-frame">
            <div className="fc-event-title-container">
                <div className="fc-event-title fc-sticky">
                    {treatment_name}
                </div>
                <div style={{ fontSize: '0.85em', color: '#333' }}>
                    {patient_name && <div> {patient_name}</div>}
                </div>
            </div>
        </div>
    );
};

const BaseCalendar = ({
    events,
    resources,
    onEventClick,
    onEventDoubleClick,
    onEventDelete,
    onDateSelect,
    onEventDrop,
    onEventResize,
    initialView = 'resourceTimeGridDay',
    view,
    date,
    resourceAreaHeaderContent = 'Ressourcen',
    backgroundEvents,
    onPrev,
    onNext,
    onToday
}) => {
    const calendarRef = useRef(null);

    useEffect(() => {
        if (calendarRef.current && view) {
            setTimeout(() => {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.changeView(view);
            }, 0);
        }
    }, [view]);

    useEffect(() => {
        if (calendarRef.current && date) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.gotoDate(date);
        }
    }, [date]);

    const handleEventClick = (info) => {
        if (info.jsEvent.detail === 2) {
            onEventDoubleClick?.(info);
        } else {
            onEventClick?.(info);
        }
    };

    return (
        <FullCalendar
            ref={calendarRef}
            plugins={plugins}
            initialView={view || initialView}
            initialDate={date}
            headerToolbar={false}
            locale={deLocale}
            schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            events={events}
            resources={resources}
            eventClick={handleEventClick}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
            select={onDateSelect}
            eventContent={renderEventContent}
            resourceAreaHeaderContent={resourceAreaHeaderContent}
            dayHeaderFormat={{
                weekday: 'short',
                day: view === 'dayGridMonth' ? undefined : 'numeric',
                month: view === 'dayGridMonth' ? undefined : 'numeric',
             //   year: view === 'dayGridMonth' ? undefined : 'numeric'
            }}
            slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }}
            eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }}
            firstDay={1}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            slotMinHeight="10px"
            slotMaxheight="10px"
            expandRows={true}
            slotDuration="00:30:00"
            allDaySlot={false}
            backgroundEvents={backgroundEvents}
            slotLabelInterval="00:30"
            prev={onPrev}
            next={onNext}
            today={onToday}
        />
    );
};

export default BaseCalendar; 