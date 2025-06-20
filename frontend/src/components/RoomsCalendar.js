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
    openingHours
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
                extendedProps: {
                    treatment_name: ev.treatment_name,
                    patient_name: ev.patient_name,
                    duration_minutes: ev.duration_minutes,
                    treatment_color: ev.treatment_color
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
            resourceAreaHeaderContent="Räume"
            columnHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
            onPrev={onPrev}
            onNext={onNext}
            onToday={onToday}
            openingHours={openingHours}
        />
    );
};

export default RoomsCalendar;