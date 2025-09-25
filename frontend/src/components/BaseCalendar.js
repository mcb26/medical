import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import { Menu, MenuItem, ListItemIcon, ListItemText, Box, Divider, Typography, Popover, Button } from '@mui/material';
import { 
    Receipt, 
    Edit, 
    Delete, 
    Visibility, 
    Event, 
    Block,
    CheckCircle,
    Schedule,
    Cancel,
    PersonOff,
    Add as AddIcon
} from '@mui/icons-material';
import AppointmentStatusChange from './AppointmentStatusChange';
import api from '../api/axios';

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
    const [statusChangeOpen, setStatusChangeOpen] = useState(false);

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

    // Debug useEffect für State-Änderungen
    useEffect(() => {
        console.log('contextMenu changed to:', contextMenu);
    }, [contextMenu]);

    useEffect(() => {
        console.log('selectedEvent changed to:', selectedEvent);
    }, [selectedEvent]);

    const handleEventClick = (info) => {
        console.log('handleEventClick called:', info);
        if (info.jsEvent) {
            info.jsEvent.preventDefault();
            console.log('Setting context menu at:', info.jsEvent.clientX, info.jsEvent.clientY);
            console.log('Selected event:', info.event);
            console.log('Event extendedProps:', info.event.extendedProps);
            
            const newContextMenu = {
                mouseX: info.jsEvent.clientX,
                mouseY: info.jsEvent.clientY,
            };
            
            console.log('About to set contextMenu to:', newContextMenu);
            console.log('About to set selectedEvent to:', info.event);
            
            setSelectedEvent(info.event);
            setContextMenu(newContextMenu);
            
            console.log('State setters called');
        }
    };

    const handleContextMenuClose = () => {
        setContextMenu(null);
        setSelectedEvent(null);
    };

    const handleStatusChange = (updatedAppointment) => {
        // Aktualisiere das Event in der Liste
        if (selectedEvent && updatedAppointment) {
            // Trigger ein Re-render des Kalenders
            if (calendarRef.current) {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.refetchEvents();
            }
        }
        setStatusChangeOpen(false);
        handleContextMenuClose();
    };

    // Hilfsfunktion für Status-Farben
    const getStatusColor = (status) => {
        switch (status) {
            case 'ready_to_bill': return '#4caf50';
            case 'completed': return '#1976d2';
            case 'cancelled': return '#f44336';
            case 'no_show': return '#d32f2f';
            case 'billed': return '#9c27b0';
            default: return '#ff9800';
        }
    };

    const handleDateSelectContextMenuClose = () => {
        setDateSelectContextMenu(null);
        setSelectedDateData(null);
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

    // Handler für Rechnungserstellung
    const handleCreateInvoice = async () => {
        if (!selectedEvent) {
            console.error('selectedEvent ist null');
            return;
        }

        const appointmentId = selectedEvent.extendedProps?.id || selectedEvent.id;
        
        if (!appointmentId) {
            console.error('Keine Appointment-ID gefunden:', selectedEvent);
            return;
        }

        try {
            // Erstelle Zuzahlungsrechnung für diesen Termin
            const response = await api.post('/copay-invoices/create-for-appointment/', {
                appointment_id: appointmentId,
                due_date_days: 30
            });

            if (response.data.total_invoices_created > 0) {
                alert(`Rechnung erfolgreich erstellt! ${response.data.total_invoices_created} Rechnung(en) erstellt.`);
            } else {
                alert('Keine Rechnung erstellt. Möglicherweise gibt es keine ausstehenden Zuzahlungen für diesen Termin.');
            }

            handleContextMenuClose();
        } catch (error) {
            console.error('Fehler beim Erstellen der Rechnung:', error);
            alert('Fehler beim Erstellen der Rechnung: ' + (error.response?.data?.error || error.message));
        }
    };

    // Handler für direkte Status-Änderung
    const handleDirectStatusChange = async (newStatus) => {
        if (!selectedEvent) {
            console.error('selectedEvent ist null');
            return;
        }

        console.log('handleDirectStatusChange called with:', newStatus);
        console.log('selectedEvent:', selectedEvent);
        console.log('selectedEvent.extendedProps:', selectedEvent.extendedProps);
        console.log('selectedEvent.id:', selectedEvent.id);
        console.log('selectedEvent.extendedProps.id:', selectedEvent.extendedProps?.id);

        // Versuche verschiedene Wege, die ID zu finden
        const appointmentId = selectedEvent.extendedProps?.id || selectedEvent.id || selectedEvent.extendedProps?.appointment_id || selectedEvent.extendedProps?.appointment_id;
        
        if (!appointmentId) {
            console.error('Keine Appointment-ID gefunden:', selectedEvent);
            return;
        }

        console.log('Using appointment ID:', appointmentId);

        try {
            await api.patch(`/appointments/${appointmentId}/`, {
                status: newStatus
            });

            // Aktualisiere das Event visuell
            if (calendarRef.current) {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.refetchEvents();
            }

            handleContextMenuClose();
        } catch (error) {
            console.error('Fehler beim Ändern des Status:', error);
            // Hier könnte man eine Toast-Nachricht anzeigen
        }
    };

    // Status-Definitionen für das Kontext-Menü
    const getStatusOptions = (currentStatus) => {
        const statusTransitions = {
            planned: ['completed', 'cancelled', 'no_show'],
            completed: ['ready_to_bill', 'cancelled'],
            ready_to_bill: ['billed', 'completed'],
            billed: ['ready_to_bill'],
            cancelled: ['planned'],
            no_show: ['planned', 'cancelled']
        };

        const statusIcons = {
            planned: Schedule,
            completed: CheckCircle,
            ready_to_bill: Receipt,
            billed: Receipt,
            cancelled: Cancel,
            no_show: PersonOff
        };

        const statusLabels = {
            planned: 'Geplant',
            completed: 'Abgeschlossen',
            ready_to_bill: 'Abrechnungsbereit',
            billed: 'Abgerechnet',
            cancelled: 'Storniert',
            no_show: 'Nicht erschienen'
        };

        const availableTransitions = statusTransitions[currentStatus] || [];
        
        return availableTransitions.map(status => ({
            status,
            icon: statusIcons[status],
            label: statusLabels[status]
        }));
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
                eventClick={null}
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
                    // Füge Linksklick-Event hinzu (für Touchscreen-Kompatibilität)
                    const element = info.el;
                    
                    // Entferne alte Event-Listener falls vorhanden
                    element.removeEventListener('click', element._clickHandler);
                    
                    // Erstelle neuen Event-Handler
                    element._clickHandler = (e) => {
                        console.log('Event clicked:', e.detail, info.event.title);
                        
                        // Einzelklick für Kontext-Menü
                        if (e.detail === 1) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Direkt State setzen ohne handleEventClick
                            console.log('Setting state directly...');
                            setSelectedEvent(info.event);
                            setContextMenu({
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                            });
                            console.log('State set directly');
                        }
                        // Doppelklick für Details
                        if (e.detail === 2) {
                            e.preventDefault();
                            e.stopPropagation();
                            onEventDoubleClick?.(info);
                        }
                    };
                    
                    element.addEventListener('click', element._clickHandler);
                }}
            />
            </Box>
            
            {/* Kontextmenü für Events */}
            <Popover
                open={contextMenu !== null}
                onClose={handleContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
                style={{ zIndex: 9999 }}
            >
                <Box sx={{ p: 1, minWidth: 200 }}>
                    <Button
                        fullWidth
                        startIcon={<Visibility />}
                        onClick={handleViewEvent}
                        sx={{ justifyContent: 'flex-start', mb: 1 }}
                    >
                        Details anzeigen
                    </Button>
                    
                    <Button
                        fullWidth
                        startIcon={<Edit />}
                        onClick={handleEditEvent}
                        sx={{ justifyContent: 'flex-start', mb: 1 }}
                    >
                        Bearbeiten
                    </Button>
                    
                    <Button
                        fullWidth
                        startIcon={<Receipt />}
                        onClick={handleCreateInvoice}
                        sx={{ justifyContent: 'flex-start', mb: 1 }}
                        color="primary"
                    >
                        Rechnung erstellen
                    </Button>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5, display: 'block' }}>
                        Status ändern (aktuell: {selectedEvent?.extendedProps?.status || 'Geplant'})
                    </Typography>
                    
                    {getStatusOptions(selectedEvent?.extendedProps?.status || 'planned').map((option) => {
                        const IconComponent = option.icon;
                        return (
                            <Button
                                key={option.status}
                                fullWidth
                                startIcon={<IconComponent />}
                                onClick={() => handleDirectStatusChange(option.status)}
                                sx={{ justifyContent: 'flex-start', mb: 0.5 }}
                            >
                                {option.label}
                            </Button>
                        );
                    })}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Button
                        fullWidth
                        startIcon={<Delete />}
                        onClick={handleDeleteEvent}
                        sx={{ justifyContent: 'flex-start' }}
                        color="error"
                    >
                        Löschen
                    </Button>
                </Box>
            </Popover>

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
            
            {/* Status Change Dialog */}
            <AppointmentStatusChange
                appointment={selectedEvent?.extendedProps}
                open={statusChangeOpen}
                onClose={() => setStatusChangeOpen(false)}
                onStatusChange={handleStatusChange}
                variant="dialog"
            />
        </Box>
    );
};

export default BaseCalendar; 