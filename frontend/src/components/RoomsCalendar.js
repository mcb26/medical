import React, { useEffect, useState } from 'react';
import BaseCalendar from './BaseCalendar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const RoomsCalendar = ({ 
    view, 
    date, 
    onViewChange, 
    onDateChange, 
    selectedResources, 
    resources,
    onPrev,
    onNext,
    onToday,
    openingHours,
    showWeekends
}) => {
    const [rooms, setRooms] = useState([]);
    const [events, setEvents] = useState([]);
    const navigate = useNavigate();

    // Events neu laden
    const fetchEvents = () => {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        api.get('/appointments/', { headers }).then(res => setEvents(res.data));
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Wenn resources bereits übergeben wurden, verwende diese
        if (resources && resources.length > 0) {
            setRooms(resources.map(r => ({
                id: `room-${r.id}`,
                title: r.name,
            })));
        } else {
            // Sonst lade sie von der API
            api.get('/rooms/', { headers }).then(res => {
                setRooms(res.data.map(r => ({
                    id: `room-${r.id}`,
                    title: r.name,
                })));
            });
        }

        fetchEvents();
    }, [resources]);

    // Filtere die Räume basierend auf selectedResources
    const filteredRooms = rooms.filter(room => {
        const roomId = parseInt(room.id.split('-')[1]);
        return selectedResources.includes(roomId);
    });

    // Filtere die Events basierend auf selectedResources
    const filteredEvents = events.filter(event => {
        const roomId = event.room;
        return selectedResources.includes(roomId);
    });

    // Handler für Drag & Drop
    const handleEventDrop = async (info) => {
        const event = info.event;
        try {
            await api.patch(`/appointments/${event.id}/`, {
                appointment_date: event.start.toISOString(),
            });
            fetchEvents(); // Events nach erfolgreichem PATCH neu laden!
        } catch (error) {
            info.revert();
            alert("Fehler beim Speichern des Termins!");
        }
    };

    // Handler für Resize
    const handleEventResize = async (info) => {
        const event = info.event;
        try {
            await api.patch(`/appointments/${event.id}/`, {
                appointment_date: event.start.toISOString(),
                duration_minutes: (event.end - event.start) / 60000
            });
            fetchEvents();
        } catch (error) {
            info.revert();
            alert("Fehler beim Speichern der Änderung!");
        }
    };

    const handleEventDoubleClick = (info) => {
        navigate(`/appointments/${info.event.id}`);
    };

    const handleEventDelete = async (eventId) => {
        if (window.confirm('Diesen Termin wirklich löschen?')) {
            try {
                await api.delete(`/appointments/${eventId}/`);
                fetchEvents(); // Events neu laden
            } catch (error) {
                console.error('Fehler beim Löschen des Termins:', error);
                alert('Fehler beim Löschen des Termins');
            }
        }
    };

    const handleEventMarkReadyToBill = async (event) => {
        if (window.confirm('Termin als abrechnungsbereit markieren?')) {
            try {
                const updatedAppointment = { 
                    ...event.extendedProps, 
                    status: 'ready_to_bill' 
                };
                await api.put(`/appointments/${event.id}/`, updatedAppointment);
                fetchEvents(); // Events neu laden
                alert('Termin wurde als abrechnungsbereit markiert.');
            } catch (error) {
                console.error('Fehler beim Markieren als abrechnungsbereit:', error);
                alert('Fehler beim Markieren als abrechnungsbereit.');
            }
        }
    };

    // Handler für Datums-/Zeitauswahl
    const handleDateSelect = (selectionData) => {
        // Erstelle URL-Parameter für das Termin-Erstellungsformular
        const params = new URLSearchParams({
            start: selectionData.start.toISOString(),
            end: selectionData.end.toISOString(),
            room: selectionData.resourceId,
            resourceType: 'room'
        });
        
        // Navigiere zum Termin-Erstellungsformular mit vorausgefüllten Daten
        navigate(`/appointments/new?${params.toString()}`);
    };

    return (
        <BaseCalendar
            resources={filteredRooms}
            events={filteredEvents.map(ev => ({
                ...ev,
                id: ev.id,
                title: ev.treatment_name || "Termin",
                start: ev.appointment_date,
                end: new Date(new Date(ev.appointment_date).getTime() + (ev.duration_minutes || 30) * 60000).toISOString(),
                resourceId: `room-${ev.room}`,
                backgroundColor: ev.status === 'ready_to_bill' ? '#4caf50' : 
                                ev.status === 'completed' ? '#1976d2' : 
                                ev.status === 'cancelled' ? '#f44336' : 
                                ev.status === 'no_show' ? '#424242' : '#ff9800',
                borderColor: ev.status === 'ready_to_bill' ? '#4caf50' : 
                           ev.status === 'completed' ? '#1976d2' : 
                           ev.status === 'cancelled' ? '#f44336' : 
                           ev.status === 'no_show' ? '#424242' : '#ff9800',
                extendedProps: {
                    treatment_name: ev.treatment_name,
                    patient_name: ev.patient_name,
                    duration_minutes: ev.duration_minutes,
                    status: ev.status,
                    treatment_color: ev.treatment_color,
                    practitioner_name: ev.practitioner_name
                }
            }))}
            resourceType="rooms"
            calendarKey="rooms"
            view={view}
            date={date}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onEventDoubleClick={handleEventDoubleClick}
            onEventDelete={handleEventDelete}
            onEventMarkReadyToBill={handleEventMarkReadyToBill}
            onDateSelect={handleDateSelect}
            resourceAreaHeaderContent="Räume"
            columnHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
            onPrev={onPrev}
            onNext={onNext}
            onToday={onToday}
            openingHours={openingHours}
            weekends={showWeekends}
        />
    );
};

export default RoomsCalendar;