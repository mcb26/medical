import React, { useEffect, useState } from 'react';
import BaseCalendar from './BaseCalendar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const PractitionerCalendar = ({ 
    view, 
    date, 
    onViewChange, 
    onDateChange, 
    selectedResources, 
    resources,
    onPrev,
    onNext,
    onToday 
}) => {
    const [practitioners, setPractitioners] = useState([]);
    const [events, setEvents] = useState([]);
    const [absences, setAbsences] = useState([]);
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

    useEffect(() => {
        // Passe die Filter ggf. an!
        api.get('/absences/', {
            params: {
                // practitioner: <ID(s)>, // optional, falls du nur bestimmte laden willst
                is_approved: true,
                start_date: date, // Zeitraum, den du im Kalender siehst
                end_date: date
            }
        }).then(res => setAbsences(res.data));
    }, [date]);

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

    const handleEventDelete = async (eventId) => {
        try {
            await api.delete(`/appointments/${eventId}/`);
            fetchEvents();
        } catch (error) {
            alert("Fehler beim Löschen des Termins!");
        }
    };

    // Berechne die Arbeitszeiten der Behandler als backgroundEvents
    const getBackgroundEvents = () => {
        const events = [];
        const currentDate = date ? new Date(date) : new Date();
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }); // z.B. 'Monday'

        filteredPractitioners.forEach(practitioner => {
            // Annahme: practitioner.working_hours ist ein Array mit Objekten { day_of_week, start_time, end_time, valid_from, valid_until }
            const wh = practitioner.working_hours?.find(
                wh =>
                    wh.day_of_week === dayOfWeek &&
                    new Date(wh.valid_from) <= currentDate &&
                    (!wh.valid_until || new Date(wh.valid_until) >= currentDate)
            );

            const startOfDay = new Date(currentDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(currentDate);
            endOfDay.setHours(23, 59, 59, 999);

            if (wh) {
                // Arbeitszeit vorhanden: davor und danach grau
                const [startHour, startMinute] = wh.start_time.split(':').map(Number);
                const [endHour, endMinute] = wh.end_time.split(':').map(Number);

                const workStart = new Date(currentDate);
                workStart.setHours(startHour, startMinute, 0, 0);
                const workEnd = new Date(currentDate);
                workEnd.setHours(endHour, endMinute, 0, 0);

                // Vor Arbeitszeit
                if (workStart > startOfDay) {
                    events.push({
                        start: startOfDay.toISOString(),
                        end: workStart.toISOString(),
                        display: 'background',
                        resourceId: practitioner.id,
                        color: 'gray'
                    });
                }
                // Nach Arbeitszeit
                if (workEnd < endOfDay) {
                    events.push({
                        start: workEnd.toISOString(),
                        end: endOfDay.toISOString(),
                        display: 'background',
                        resourceId: practitioner.id,
                        color: 'gray'
                    });
                }
            } else {
                // Keine Arbeitszeit: ganzer Tag grau
                events.push({
                    start: startOfDay.toISOString(),
                    end: endOfDay.toISOString(),
                    display: 'background',
                    resourceId: practitioner.id,
                    color: 'gray'
                });
            }
        });

        return events;
    };

    // Beispiel: Annahme, du hast ein Array absences mit den Abwesenheiten
    const getAbsenceBackgroundEvents = () => {
        return absences.map(abs => {
            let start = abs.start_date;
            let end = abs.end_date;
            if (abs.is_full_day) {
                // Enddatum exklusiv, also +1 Tag
                const endDate = new Date(abs.end_date);
                endDate.setDate(endDate.getDate() + 1);
                end = endDate.toISOString().slice(0, 10);
                return {
                    start: `${start}T00:00:00`,
                    end: `${end}T00:00:00`,
                    display: 'background',
                    color: '#888',
                    resourceId: `practitioner-${abs.practitioner}`,
                    title: abs.absence_type
                };
            } else {
                return {
                    start: `${start}T${abs.start_time}`,
                    end: `${end}T${abs.end_time}`,
                    display: 'background',
                    color: '#888',
                    resourceId: `practitioner-${abs.practitioner}`,
                    title: abs.absence_type
                };
            }
        });
    };

    return (
        <BaseCalendar
            resources={filteredPractitioners}
            events={[
                ...filteredEvents.map(ev => ({
                ...ev,
                id: ev.id,
                title: ev.treatment_name || "Termin",
                start: ev.appointment_date,
                end: new Date(new Date(ev.appointment_date).getTime() + (ev.duration_minutes || 30) * 60000).toISOString(),
                resourceId: `practitioner-${ev.practitioner}`,
                    extendedProps: {
                treatment_name: ev.treatment_name,
                patient_name: ev.patient_name,
                duration_minutes: ev.duration_minutes,
                treatment_color: ev.treatment_category?.color || '#1976d2'
                    }
                })),
                ...getBackgroundEvents(),
                ...getAbsenceBackgroundEvents()
            ]}
            resourceType="practitioners"
            calendarKey="practitioners"
            view={view}
            date={date}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onEventDoubleClick={handleEventDoubleClick}
            onEventDelete={handleEventDelete}
            resourceAreaHeaderContent="Behandler"
            dayHeaderFormat="dddd, dd.MM.yyyy"
            onPrev={onPrev}
            onNext={onNext}
            onToday={onToday}
        />
    );
};

export default PractitionerCalendar;