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
    onToday,
    openingHours,
    showWeekends
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

    // Arbeitszeiten neu laden
    const fetchPractitioners = () => {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Wenn resources bereits übergeben wurden, verwende diese
        if (resources && resources.length > 0) {
            const practitionersWithHours = resources.map(p => ({
                id: `practitioner-${p.id}`,
                title: `${p.first_name} ${p.last_name}`,
                working_hours: p.working_hours || []
            }));
            console.log('Practitioners mit Arbeitszeiten (von resources):', practitionersWithHours);
            setPractitioners(practitionersWithHours);
        } else {
            // Sonst lade sie von der API
            api.get('/practitioners/', { headers }).then(res => {
                const practitionersWithHours = res.data.map(p => ({
                    id: `practitioner-${p.id}`,
                    title: `${p.first_name} ${p.last_name}`,
                    working_hours: p.working_hours || []
                }));
                console.log('Practitioners mit Arbeitszeiten (von API):', practitionersWithHours);
                setPractitioners(practitionersWithHours);
            });
        }
    };

    // Manuelle Aktualisierung der Arbeitszeiten
    const refreshWorkingHours = () => {
        console.log('Aktualisiere Arbeitszeiten...');
        fetchPractitioners();
    };

    // Globale Funktion für manuelle Aktualisierung (über Browser-Konsole aufrufbar)
    useEffect(() => {
        window.refreshCalendarWorkingHours = refreshWorkingHours;
        return () => {
            delete window.refreshCalendarWorkingHours;
        };
    }, []);

    useEffect(() => {
        fetchPractitioners();
        fetchEvents();
    }, [resources]);

    // Lade Arbeitszeiten alle 10 Sekunden neu, um Änderungen zu erfassen
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Automatische Aktualisierung der Arbeitszeiten...');
            fetchPractitioners();
        }, 10000); // 10 Sekunden

        return () => clearInterval(interval);
    }, []);

    // Aktualisiere auch bei Datum- oder View-Änderungen
    useEffect(() => {
        console.log('Aktualisiere Arbeitszeiten wegen Datum/View-Änderung...');
        fetchPractitioners();
    }, [date, view]);

    // Aktualisiere auch bei Änderungen der ausgewählten Ressourcen
    useEffect(() => {
        console.log('Aktualisiere Arbeitszeiten wegen Ressourcen-Änderung...');
        fetchPractitioners();
    }, [selectedResources]);

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
        
        console.log('getBackgroundEvents aufgerufen mit filteredPractitioners:', filteredPractitioners);
        
        // Bestimme den sichtbaren Bereich basierend auf der aktuellen Ansicht
        let startDate, endDate;
        const currentDate = date ? new Date(date) : new Date();
        
        if (view === 'timeGridWeek' || view === 'resourceTimeGridWeek') {
            // Woche: Montag bis Sonntag
            const dayOfWeek = currentDate.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sonntag = 0, Montag = 1
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - daysToMonday);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // +6 Tage = Sonntag
            endDate.setHours(23, 59, 59, 999);
        } else if (view === 'timeGridDay' || view === 'resourceTimeGridDay') {
            // Tag: nur der aktuelle Tag
            startDate = new Date(currentDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(currentDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Standard: eine Woche
            const dayOfWeek = currentDate.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - daysToMonday);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        }

        // Iteriere durch alle Tage im sichtbaren Bereich
        const currentDay = new Date(startDate);
        while (currentDay <= endDate) {
            // Wochentag im exakt gleichen Format wie im Backend
            const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(currentDay);
            const dayOfWeekLower = dayOfWeek.toLowerCase(); // für openingHours

            filteredPractitioners.forEach(practitioner => {
                console.log(`Prüfe Arbeitszeiten für ${practitioner.title} am ${dayOfWeek}:`, practitioner.working_hours);
                
                // Annahme: practitioner.working_hours ist ein Array mit Objekten { day_of_week, start_time, end_time, valid_from, valid_until }
                const wh = practitioner.working_hours?.find(
                    wh => {
                        // Konvertiere das valid_from Datum in ein Date-Objekt
                        const validFrom = new Date(wh.valid_from);
                        validFrom.setHours(0, 0, 0, 0);

                        // Konvertiere das valid_until Datum in ein Date-Objekt, falls vorhanden
                        let validUntil = null;
                        if (wh.valid_until) {
                            validUntil = new Date(wh.valid_until);
                            validUntil.setHours(23, 59, 59, 999);
                        }

                        // Exakter Vergleich der Wochentage (Backend verwendet 'Monday', 'Tuesday', etc.)
                        const dayMatches = wh.day_of_week === dayOfWeek;

                        // Prüfe, ob das Datum im gültigen Bereich liegt
                        const isAfterValidFrom = validFrom <= currentDay;
                        const isBeforeValidUntil = !validUntil || currentDay <= validUntil;

                        console.log(`Prüfe Arbeitszeit für ${dayOfWeek}:`, {
                            dayMatches,
                            isAfterValidFrom,
                            isBeforeValidUntil,
                            validFrom: validFrom.toISOString(),
                            validUntil: validUntil?.toISOString(),
                            currentDay: currentDay.toISOString(),
                            wh_day: wh.day_of_week,
                            current_day: dayOfWeek
                        });

                        return dayMatches && isAfterValidFrom && isBeforeValidUntil;
                    }
                );

                console.log(`Gefundene Arbeitszeit für ${practitioner.title} am ${dayOfWeek}:`, wh);

                const startOfDay = new Date(currentDay);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(currentDay);
                endOfDay.setHours(23, 59, 59, 999);

                // Hole die Praxisöffnungszeiten für diesen Tag
                const practiceDaySettings = openingHours?.[dayOfWeekLower];
                const isPracticeOpen = practiceDaySettings?.open;
                let practiceStart = startOfDay;
                let practiceEnd = endOfDay;

                if (isPracticeOpen && practiceDaySettings?.start && practiceDaySettings?.end) {
                    const [startHour, startMinute] = practiceDaySettings.start.split(':').map(Number);
                    const [endHour, endMinute] = practiceDaySettings.end.split(':').map(Number);
                    
                    practiceStart = new Date(currentDay);
                    practiceStart.setHours(startHour, startMinute, 0, 0);
                    practiceEnd = new Date(currentDay);
                    practiceEnd.setHours(endHour, endMinute, 0, 0);
                }

                if (wh) {
                    // Arbeitszeit vorhanden: davor und danach entsprechend einfärben
                    const [startHour, startMinute] = wh.start_time.split(':').map(Number);
                    const [endHour, endMinute] = wh.end_time.split(':').map(Number);

                    const workStart = new Date(currentDay);
                    workStart.setHours(startHour, startMinute, 0, 0);
                    const workEnd = new Date(currentDay);
                    workEnd.setHours(endHour, endMinute, 0, 0);

                    // Vor Arbeitszeit
                    if (workStart > startOfDay) {
                        const eventStart = startOfDay;
                        const eventEnd = workStart;
                        
                        // Wenn Praxis geöffnet ist, aber Practitioner nicht arbeitet
                        if (isPracticeOpen && practiceStart < workStart) {
                            // Praxis ist geöffnet, Practitioner arbeitet nicht
                            if (practiceStart < workStart) {
                                events.push({
                                    start: practiceStart.toISOString(),
                                    end: workStart.toISOString(),
                                    display: 'background',
                                    resourceId: practitioner.id,
                                    color: '#666666', // Dunkelgrau für "Praxis offen, aber keine Arbeitszeit"
                                    title: 'Praxis geöffnet - keine Arbeitszeit'
                                });
                            }
                            
                            // Vor Praxisöffnung (falls vorhanden)
                            if (practiceStart > startOfDay) {
                                events.push({
                                    start: startOfDay.toISOString(),
                                    end: practiceStart.toISOString(),
                                    display: 'background',
                                    resourceId: practitioner.id,
                                    color: 'gray'
                                });
                            }
                        } else {
                            // Praxis geschlossen oder keine Öffnungszeiten
                            events.push({
                                start: eventStart.toISOString(),
                                end: eventEnd.toISOString(),
                                display: 'background',
                                resourceId: practitioner.id,
                                color: 'gray'
                            });
                        }
                    }
                    
                    // Nach Arbeitszeit
                    if (workEnd < endOfDay) {
                        const eventStart = workEnd;
                        const eventEnd = endOfDay;
                        
                        // Wenn Praxis geöffnet ist, aber Practitioner nicht arbeitet
                        if (isPracticeOpen && practiceEnd > workEnd) {
                            // Nach Arbeitszeit, aber Praxis noch geöffnet
                            if (workEnd < practiceEnd) {
                                events.push({
                                    start: workEnd.toISOString(),
                                    end: practiceEnd.toISOString(),
                                    display: 'background',
                                    resourceId: practitioner.id,
                                    color: '#666666', // Dunkelgrau für "Praxis offen, aber keine Arbeitszeit"
                                    title: 'Praxis geöffnet - keine Arbeitszeit'
                                });
                            }
                            
                            // Nach Praxis-Schluss
                            if (practiceEnd < endOfDay) {
                                events.push({
                                    start: practiceEnd.toISOString(),
                                    end: endOfDay.toISOString(),
                                    display: 'background',
                                    resourceId: practitioner.id,
                                    color: 'gray'
                                });
                            }
                        } else {
                            // Praxis geschlossen oder keine Öffnungszeiten
                            events.push({
                                start: eventStart.toISOString(),
                                end: eventEnd.toISOString(),
                                display: 'background',
                                resourceId: practitioner.id,
                                color: 'gray'
                            });
                        }
                    }
                } else {
                    // Keine Arbeitszeit: ganzer Tag entsprechend einfärben
                    if (isPracticeOpen) {
                        // Praxis ist geöffnet, aber Practitioner arbeitet nicht
                        events.push({
                            start: practiceStart.toISOString(),
                            end: practiceEnd.toISOString(),
                            display: 'background',
                            resourceId: practitioner.id,
                            color: '#666666', // Dunkelgrau für "Praxis offen, aber keine Arbeitszeit"
                            title: 'Praxis geöffnet - keine Arbeitszeit'
                        });
                        
                        // Vor und nach Praxisöffnung
                        if (practiceStart > startOfDay) {
                            events.push({
                                start: startOfDay.toISOString(),
                                end: practiceStart.toISOString(),
                                display: 'background',
                                resourceId: practitioner.id,
                                color: 'gray'
                            });
                        }
                        
                        if (practiceEnd < endOfDay) {
                            events.push({
                                start: practiceEnd.toISOString(),
                                end: endOfDay.toISOString(),
                                display: 'background',
                                resourceId: practitioner.id,
                                color: 'gray'
                            });
                        }
                    } else {
                        // Praxis geschlossen: ganzer Tag grau
                        events.push({
                            start: startOfDay.toISOString(),
                            end: endOfDay.toISOString(),
                            display: 'background',
                            resourceId: practitioner.id,
                            color: 'gray'
                        });
                    }
                }
            });
            
            // Nächster Tag
            currentDay.setDate(currentDay.getDate() + 1);
        }

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
            columnHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
            onPrev={onPrev}
            onNext={onNext}
            onToday={onToday}
            openingHours={openingHours}
            weekends={showWeekends}
        />
    );
};

export default PractitionerCalendar;