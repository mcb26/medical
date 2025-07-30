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

// CSS für Pausenzeiten
const breakEventStyles = `
    .break-event {
        background-color: #ff9800 !important;
        border-color: #f57c00 !important;
        color: white !important;
        font-weight: bold !important;
        opacity: 0.8 !important;
    }
    
    .break-event:hover {
        opacity: 1 !important;
        background-color: #f57c00 !important;
    }
    
    .break-event .fc-event-title {
        color: white !important;
        font-weight: bold !important;
    }
`;

const renderEventContent = (eventInfo) => {
    const { treatment_name, patient_name, duration_minutes, isBreak } = eventInfo.event.extendedProps;
    
    // Spezielle Darstellung für Pausenzeiten
    if (isBreak) {
        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky">
                        ⏸️ Pause
                    </div>
                </div>
            </div>
        );
    }
    
    // Normale Darstellung für Termine
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

// Hilfsfunktion um die Öffnungszeiten für einen bestimmten Tag zu ermitteln
const getWorkingHoursForDay = (openingHours, date) => {
    if (!openingHours) return { start: '08:00:00', end: '20:00:00' };
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    const daySettings = openingHours[dayOfWeek];
    
    if (!daySettings || !daySettings.open) {
        return { start: '08:00:00', end: '20:00:00' };
    }
    
    // Stelle sicher, dass die Zeiten im korrekten Format sind (HH:MM:SS)
    let start = daySettings.start || '08:00';
    let end = daySettings.end || '20:00';
    
    // Füge Sekunden hinzu, falls nicht vorhanden
    if (start.split(':').length === 2) {
        start = `${start}:00`;
    }
    if (end.split(':').length === 2) {
        end = `${end}:00`;
}

    return { start, end };
};

// Hilfsfunktion um Pausenzeiten als Hintergrund-Events zu generieren
const generateBreakEvents = (openingHours, date, resources) => {
    if (!openingHours || !resources) return [];
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    const daySettings = openingHours[dayOfWeek];
    
    if (!daySettings || !daySettings.open || !daySettings.break_start || !daySettings.break_end) {
        return [];
    }
    
    const breakEvents = [];
    const currentDate = new Date(date);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    
    // Parse Pausenzeiten
    const [breakStartHour, breakStartMinute] = daySettings.break_start.split(':').map(Number);
    const [breakEndHour, breakEndMinute] = daySettings.break_end.split(':').map(Number);
    
    const breakStart = new Date(year, month, day, breakStartHour, breakStartMinute, 0);
    const breakEnd = new Date(year, month, day, breakEndHour, breakEndMinute, 0);
    
    // Erstelle Pausen-Events für alle Ressourcen
    resources.forEach(resource => {
        breakEvents.push({
            start: breakStart.toISOString(),
            end: breakEnd.toISOString(),
            display: 'background',
            resourceId: resource.id,
            color: '#ff9800', // Orange für Pausen
            title: 'Pause',
            extendedProps: {
                isBreak: true,
                breakType: 'practice'
            },
            // Spezielles Styling für Pausenzeiten
            classNames: ['break-event'],
            backgroundColor: '#ff9800',
            borderColor: '#f57c00',
            textColor: '#fff'
        });
    });
    
    return breakEvents;
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
    onToday,
    openingHours = null,
    dayHeaderFormat,
    columnHeaderFormat,
    slotMinTime = '08:00:00',
    slotMaxTime = '20:00:00',
    weekends = true, // Default to true for now, will be overridden by prop
    resourceType = 'practitioners' // Neu: um zu unterscheiden ob Räume oder Behandler
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

    // Handler für Datums-/Zeitauswahl (Doppelklick auf Zeitpunkt)
    const handleDateSelect = (selectInfo) => {
        if (onDateSelect) {
            // Extrahiere die ausgewählte Ressource
            const selectedResource = selectInfo.resource;
            const startDate = selectInfo.start;
            const endDate = selectInfo.end;
            
            // Erstelle ein Objekt mit den ausgewählten Daten
            const selectionData = {
                start: startDate,
                end: endDate,
                resource: selectedResource,
                resourceType: resourceType,
                // Extrahiere die Ressourcen-ID (entferne Präfix wie "practitioner-" oder "room-")
                resourceId: selectedResource ? selectedResource.id.replace(/^(practitioner-|room-)/, '') : null,
                resourceTitle: selectedResource ? selectedResource.title : null
            };
            
            onDateSelect(selectionData);
        }
    };

    // Bestimme die Öffnungszeiten für den aktuellen Tag
    const currentDate = date || new Date();
    const workingHours = getWorkingHoursForDay(openingHours, currentDate);
    
    // Verwende die Öffnungszeiten oder die übergebenen Props
    const finalSlotMinTime = openingHours ? workingHours.start : slotMinTime;
    const finalSlotMaxTime = openingHours ? workingHours.end : slotMaxTime;

    // Generiere Pausenzeiten-Events
    const breakEvents = generateBreakEvents(openingHours, currentDate, resources);
    
    // Kombiniere alle Events (normale Events + Hintergrund-Events + Pausenzeiten)
    const allEvents = [
        ...(events || []),
        ...(backgroundEvents || []),
        ...breakEvents
    ];

    return (
        <>
            <style>{breakEventStyles}</style>
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
                weekends={weekends !== undefined ? weekends : true}
                events={allEvents}
                resources={resources}
                eventClick={handleEventClick}
                eventDrop={onEventDrop}
                eventResize={onEventResize}
                select={handleDateSelect}
                eventContent={renderEventContent}
                resourceAreaHeaderContent={resourceAreaHeaderContent}
                dayHeaderFormat={dayHeaderFormat !== undefined ? dayHeaderFormat : {
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
                slotMinTime={finalSlotMinTime}
                slotMaxTime={finalSlotMaxTime}
                slotMinHeight="10px"
                slotMaxheight="10px"
                expandRows={true}
                slotDuration="00:15:00"
                allDaySlot={true}
                allDayText='Info'
                backgroundEvents={backgroundEvents}
                slotLabelInterval="00:15"
            />
        </>
    );
};

export default BaseCalendar; 