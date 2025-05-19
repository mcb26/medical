import React, { useEffect, useState } from 'react';
import BaseCalendar from './BaseCalendar';
import api from '../api/axios';

const RoomsCalendar = ({ view, date, onViewChange, onDateChange }) => {
    const [rooms, setRooms] = useState([]);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        api.get('/rooms/').then(res => {
            setRooms(res.data.map(r => ({
                id: `room-${r.id}`,
                title: r.name,
            })));
        });
        api.get('/appointments/').then(res => setEvents(res.data));
    }, []);

    return (
        <BaseCalendar
            resources={rooms}
            events={events.map(ev => ({
                ...ev,
                resourceId: `room-${ev.room}`
            }))}
            resourceType="rooms"
            calendarKey="rooms"
            view={view}
            date={date}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
        />
    );
};

export default RoomsCalendar; 