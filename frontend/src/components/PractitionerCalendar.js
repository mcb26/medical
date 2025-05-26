import React, { useEffect, useState } from 'react';
import BaseCalendar from './BaseCalendar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const PractitionerCalendar = ({ view, date, onViewChange, onDateChange, selectedResources, resources }) => {
    const [practitioners, setPractitioners] = useState([]);
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
            setPractitioners(resources.map(p => ({
                id: `practitioner-${p.id}`,
                title: `${p.first_name} ${p.last_name}`,
            })));
        } else {
            // Sonst lade sie von der API
            api.get('/practitioners/', { headers }).then(res => {
                setPractitioners(res.data.map(p => ({
                    id: `practitioner-${p.id}`,
                    title: `${p.first_name} ${p.last_name}`,
                })));
            });
        }

        fetchEvents();
    }, [resources]);

    // Filtere die Behandler basierend auf selectedResources
    const filteredPractitioners = practitioners.filter(practitioner => {
        const practitionerId = parseInt(practitioner.id.split('-')[1]);
        return selectedResources.includes(practitionerId);
    });

    // Filtere die Events basierend auf selectedResources
    const filteredEvents = events.filter(event => {
        const practitionerId = event.practitioner;
        return selectedResources.includes(practitionerId);
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

    // Handler für Doppelklick auf Termin
    const handleEventDoubleClick = (info) => {
        navigate(`/appointments/${info.event.id}`);
    };

    return (
        <BaseCalendar
            resources={filteredPractitioners}
            events={filteredEvents.map(ev => ({
                ...ev,
                id: ev.id,
                title: ev.treatment_name || "Termin",
                start: ev.appointment_date,
                end: new Date(new Date(ev.appointment_date).getTime() + (ev.duration_minutes || 30) * 60000).toISOString(),
                resourceId: `practitioner-${ev.practitioner}`
            }))}
            view={view}
            date={date}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
        />
    );
};

export default PractitionerCalendar;