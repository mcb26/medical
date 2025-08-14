import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import { Menu, MenuItem, ListItemIcon, ListItemText, Box } from '@mui/material';
import { Receipt, Edit, Delete, Visibility, Event, Block } from '@mui/icons-material';

const plugins = [
    resourceTimeGridPlugin,
    interactionPlugin,
    dayGridPlugin,
    timeGridPlugin
];

// CSS für Pausenzeiten und verbesserte Event-Darstellung
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
    
    /* Verbesserte Event-Darstellung */
    .fc-event {
        border-radius: 4px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
    }
    
    .fc-event-main-frame {
        padding: 1px 3px !important;
        min-height: 16px !important;
    }
    
    .fc-event-title-container {
        overflow: hidden !important;
    }
    
    .fc-event-title {
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
    }
    
    /* Responsive Text-Größen */
    .fc-timegrid-event {
        font-size: 0.85em !important;
    }
    
    .fc-daygrid-event {
        font-size: 0.8em !important;
    }
    
    /* Hover-Effekte */
    .fc-event:hover {
        box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important;
        transform: translateY(-1px) !important;
        transition: all 0.2s ease !important;
    }
    
    /* Kalender-Layout Optimierungen */
    .fc {
        height: calc(100vh - 200px) !important;
        min-height: 600px !important;
    }
    
    .fc-view-harness {
        height: 100% !important;
    }
    
    /* Kompaktere Header */
    .fc-col-header {
        height: 40px !important;
    }
    
    .fc-col-header-cell {
        padding: 4px 2px !important;
        font-size: 0.85em !important;
    }
    
    /* Kompaktere Zeitslots */
    .fc-timegrid-slot {
        height: 25px !important;
    }
    
    .fc-timegrid-slot-label {
        font-size: 0.7em !important;
        padding: 1px 3px !important;
    }
    
    /* Kompaktere Ressourcen-Bereiche */
    .fc-resource-timeline-divider {
        width: 1px !important;
    }
    
    .fc-resource-timeline-header {
        height: 35px !important;
    }
    
    .fc-resource-timeline-header-cell {
        padding: 3px 4px !important;
        font-size: 0.8em !important;
    }
    
    /* Kompaktere Ressourcen-Bereiche */
    .fc-resource-timeline-divider {
        width: 1px !important;
    }
    
    .fc-resource-timeline-header {
        height: 40px !important;
    }
    
    .fc-resource-timeline-header-cell {
        padding: 4px 6px !important;
        font-size: 0.85em !important;
    }
    
    /* Kompaktere Event-Darstellung */
    .fc-timegrid-event-harness {
        margin: 0.5px 0 !important;
    }
    
    .fc-daygrid-event-harness {
        margin: 0.5px 0 !important;
    }
    
    /* Kompaktere Event-Container */
    .fc-event-title-container {
        padding: 0 !important;
    }
    
    .fc-event-title {
        padding: 0 !important;
        margin: 0 !important;
    }
    
    /* AllDay-Slot kompakter */
    .fc-daygrid-day-events {
        min-height: 20px !important;
    }
    
    .fc-daygrid-event-dot {
        margin: 1px 2px !important;
    }
    
    /* Scrollbar-Optimierung */
    .fc-scroller {
        scrollbar-width: thin !important;
    }
    
    .fc-scroller::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
    }
    
    .fc-scroller::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
    }
    
    .fc-scroller::-webkit-scrollbar-thumb {
        background: #c1c1c1 !important;
        border-radius: 3px !important;
    }
    
    .fc-scroller::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8 !important;
    }
    
    /* Mobile Optimierungen */
    @media (max-width: 768px) {
        .fc {
            height: calc(100vh - 150px) !important;
            min-height: 500px !important;
        }
        
        .fc-col-header-cell {
            font-size: 0.75em !important;
            padding: 2px 1px !important;
        }
        
        .fc-timegrid-slot {
            height: 25px !important;
        }
        
        .fc-timegrid-slot-label {
            font-size: 0.7em !important;
        }
        
        .fc-event {
            font-size: 0.75em !important;
        }
    }
`;

const renderEventContent = (eventInfo) => {
    const { 
        treatment_name, 
        patient_name, 
        isBreak, 
        isAbsence, 
        absence_type, 
        notes,
        practitioner_name,
        room_name
    } = eventInfo.event.extendedProps;
    
    // Berechne Event-Höhe für adaptive Darstellung
    const eventHeight = eventInfo.el?.offsetHeight || 16;
    const isCompact = eventHeight < 30;
    const isVeryCompact = eventHeight < 20;
    
    // Bestimme den Kontext basierend auf der Ressource
    const resourceId = eventInfo.event.getResources()[0]?.id || '';
    const isPractitionerView = resourceId.startsWith('practitioner-');
    const isRoomView = resourceId.startsWith('room-');
    
    // Spezielle Darstellung für Pausenzeiten
    if (isBreak) {
        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky" style={{
                        fontSize: isVeryCompact ? '0.7em' : '0.8em',
                        lineHeight: '1.1',
                        fontWeight: 'bold',
                        color: 'white'
                    }}>
                        {isVeryCompact ? '⏸️' : '⏸️ Pause'}
                    </div>
                </div>
            </div>
        );
    }
    
    // Spezielle Darstellung für Abwesenheiten
    if (isAbsence) {
        const absenceTypeMap = {
            'vacation': 'Urlaub',
            'sick': 'Krankheit',
            'parental_leave': 'Elternzeit',
            'special_leave': 'Sonderurlaub',
            'training': 'Fortbildung',
            'other': 'Sonstiges'
        };
        
        const absenceTypeDisplay = absenceTypeMap[absence_type] || absence_type;
        
        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky" style={{ 
                        fontWeight: 'bold', 
                        color: 'white',
                        fontSize: isVeryCompact ? '0.7em' : '0.8em',
                        lineHeight: '1.1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {isVeryCompact ? absenceTypeDisplay.substring(0, 8) : absenceTypeDisplay}
                    </div>
                    {notes && !isVeryCompact && (
                        <div style={{ 
                            fontSize: '0.65em', 
                            color: 'white', 
                            opacity: 0.9,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {notes}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Normale Darstellung für Termine - adaptive Formatierung
    if (isVeryCompact) {
        // Sehr kompakte Darstellung für kleine Events
        const treatmentShort = treatment_name?.substring(0, 6) || 'Termin';
        const contextInfo = isPractitionerView && room_name ? 
            room_name.substring(0, 4) : 
            isRoomView && practitioner_name ? 
            practitioner_name.substring(0, 4) : '';
        
        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky" style={{
                        fontSize: '0.7em',
                        lineHeight: '1.1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold'
                    }}>
                        {treatmentShort}
                        {contextInfo && <span style={{ color: '#666', fontSize: '0.6em', marginLeft: '2px' }}>
                            {isPractitionerView ? '🏠' : '👤'} {contextInfo}
                        </span>}
                    </div>
                </div>
            </div>
        );
    } else if (isCompact) {
        // Kompakte Darstellung für mittlere Events
        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky" style={{
                        fontSize: '0.75em',
                        lineHeight: '1.1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold'
                    }}>
                        {treatment_name}
                    </div>
                    <div style={{ 
                        fontSize: '0.6em', 
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {patient_name && <div>{patient_name}</div>}
                        {isPractitionerView && room_name && <div style={{ color: '#666', fontStyle: 'italic' }}>🏠 {room_name}</div>}
                        {isRoomView && practitioner_name && <div style={{ color: '#666', fontStyle: 'italic' }}>👤 {practitioner_name}</div>}
                    </div>
                </div>
            </div>
        );
    } else {
        // Normale Darstellung für größere Events
        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky" style={{
                        fontSize: '0.8em',
                        lineHeight: '1.2',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold'
                    }}>
                        {treatment_name}
                    </div>
                    <div style={{ 
                        fontSize: '0.65em', 
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {patient_name && <div>{patient_name}</div>}
                        {practitioner_name && <div style={{ color: '#666', fontStyle: 'italic' }}>👤 {practitioner_name}</div>}
                        {room_name && <div style={{ color: '#666', fontStyle: 'italic' }}>🏠 {room_name}</div>}
                    </div>
                </div>
            </div>
        );
    }
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
    onEventMarkReadyToBill,
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
    const navigate = useNavigate();
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [dateSelectContextMenu, setDateSelectContextMenu] = useState(null);
    const [selectedDateData, setSelectedDateData] = useState(null);

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

    const handleEventRightClick = (info) => {
        if (info.jsEvent) {
            info.jsEvent.preventDefault();
            setSelectedEvent(info.event);
            setContextMenu({
                mouseX: info.jsEvent.clientX,
                mouseY: info.jsEvent.clientY,
            });
        }
    };

    const handleContextMenuClose = () => {
        setContextMenu(null);
        setSelectedEvent(null);
    };

    const handleDateSelectContextMenuClose = () => {
        setDateSelectContextMenu(null);
        setSelectedDateData(null);
    };

    const handleMarkReadyToBill = () => {
        if (selectedEvent && onEventMarkReadyToBill) {
            onEventMarkReadyToBill(selectedEvent);
        }
        handleContextMenuClose();
    };

    const handleEditEvent = () => {
        if (selectedEvent && onEventClick) {
            onEventClick({ event: selectedEvent });
        }
        handleContextMenuClose();
    };

    const handleDeleteEvent = () => {
        if (selectedEvent && onEventDelete) {
            onEventDelete(selectedEvent);
        }
        handleContextMenuClose();
    };

    const handleViewEvent = () => {
        if (selectedEvent && onEventDoubleClick) {
            onEventDoubleClick({ event: selectedEvent });
        }
        handleContextMenuClose();
    };

    // Handler für Datums-/Zeitauswahl (Klick auf Zeitpunkt)
    const handleDateSelect = (selectInfo) => {
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
        
        // Zeige Kontextmenü anstatt direkt zu navigieren
        setSelectedDateData(selectionData);
        if (selectInfo.jsEvent) {
            setDateSelectContextMenu({
                mouseX: selectInfo.jsEvent.clientX,
                mouseY: selectInfo.jsEvent.clientY,
            });
        }
    };

    // Handler für Termin erstellen
    const handleCreateAppointment = () => {
        if (selectedDateData && onDateSelect) {
            onDateSelect(selectedDateData);
        }
        handleDateSelectContextMenuClose();
    };

    // Handler für Abwesenheit/Blockzeit erstellen
    const handleCreateAbsence = () => {
        if (selectedDateData) {
            // Erstelle URL-Parameter für das Abwesenheits-Erstellungsformular
            const params = new URLSearchParams({
                start: selectedDateData.start.toISOString(),
                end: selectedDateData.end.toISOString(),
                practitioner: selectedDateData.resourceId,
                resourceType: 'practitioner'
            });
            
            // Navigiere zum Abwesenheits-Erstellungsformular
            navigate(`/absences/new?${params.toString()}`);
        }
        handleDateSelectContextMenuClose();
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

    // Prüfe, ob der Termin als abrechnungsbereit markiert werden kann
    const canMarkReadyToBill = (event) => {
        if (!event) return false;
        const status = event.extendedProps.status;
        return status === 'completed';
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <style>{breakEventStyles}</style>
            <Box sx={{ flex: 1, minHeight: 0 }}>
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
                eventDisplay="block"
                eventMinHeight={16}
                eventMinWidth={40}
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
                expandRows={true}
                slotDuration="00:30:00"
                allDaySlot={false}
                allDayText='Info'
                backgroundEvents={backgroundEvents}
                slotLabelInterval="00:15"
                nowIndicator={true}
                eventDidMount={(info) => {
                    // Füge Rechtsklick-Event hinzu
                    const element = info.el;
                    element.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        handleEventRightClick(info);
                    });
                }}
            />
            </Box>
            
            {/* Kontextmenü für Events */}
            <Menu
                open={contextMenu !== null}
                onClose={handleContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleViewEvent}>
                    <ListItemIcon>
                        <Visibility fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Details anzeigen</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleEditEvent}>
                    <ListItemIcon>
                        <Edit fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Bearbeiten</ListItemText>
                </MenuItem>
                {canMarkReadyToBill(selectedEvent) && (
                    <MenuItem onClick={handleMarkReadyToBill}>
                        <ListItemIcon>
                            <Receipt fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Abrechnungsbereit</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={handleDeleteEvent}>
                    <ListItemIcon>
                        <Delete fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Löschen</ListItemText>
                </MenuItem>
            </Menu>

            {/* Kontextmenü für Datums-/Zeitauswahl */}
            <Menu
                open={dateSelectContextMenu !== null}
                onClose={handleDateSelectContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    dateSelectContextMenu !== null
                        ? { top: dateSelectContextMenu.mouseY, left: dateSelectContextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleCreateAppointment}>
                    <ListItemIcon>
                        <Event fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Termin erstellen</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCreateAbsence}>
                    <ListItemIcon>
                        <Block fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Abwesenheit/Blockzeit erstellen</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default BaseCalendar; 