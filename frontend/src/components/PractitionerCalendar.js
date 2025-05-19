import React, { useEffect, useState } from 'react';
import BaseCalendar from './BaseCalendar';
import api from '../api/axios';

const PractitionerCalendar = ({ view, date, onViewChange, onDateChange }) => {
    const [practitioners, setPractitioners] = useState([]);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        api.get('/practitioners/').then(res => {
            setPractitioners(res.data.map(p => ({
                id: `practitioner-${p.id}`,
                title: `${p.first_name} ${p.last_name}`,
            })));
        });
        api.get('/appointments/').then(res => setEvents(res.data));
    }, []);

    return (
        <BaseCalendar
            resources={practitioners}
            events={events.map(ev => ({
                ...ev,
                resourceId: `practitioner-${ev.practitioner}`
            }))}
            resourceType="practitioners"
            calendarKey="practitioners"
            view={view}
            date={date}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
        />
    );
};

export default PractitionerCalendar; 