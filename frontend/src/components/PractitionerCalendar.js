import React, { useEffect, useState, useCallback } from 'react';
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
    const fetchPractitioners = async () => {
        try {
            const response = await api.get('/practitioners/');
            const practitionersWithHours = response.data.map(practitioner => ({
                ...practitioner,
                working_hours: []
            }));
            setPractitioners(practitionersWithHours);
        } catch (error) {
            console.error('Fehler beim Laden der Behandler:', error);
        }
    };

    const updateWorkingHours = useCallback(async () => {
        if (!practitioners || practitioners.length === 0) {
            return;
        }
        
        try {
            const promises = practitioners.map(async (practitioner) => {
                if (!practitioner || !practitioner.id) {
                    console.warn('Practitioner ohne ID gefunden:', practitioner);
                    return practitioner;
                }
                
                try {
                    const response = await api.get(`/practitioners/${practitioner.id}/working_hours/`);
                    return {
                        ...practitioner,
                        working_hours: response.data
                    };
                } catch (error) {
                    console.error(`Fehler beim Laden der Arbeitszeiten für Practitioner ${practitioner.id}:`, error);
                    return {
                        ...practitioner,
                        working_hours: []
                    };
                }
            });

            const updatedPractitioners = await Promise.all(promises);
            setPractitioners(updatedPractitioners);
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Arbeitszeiten:', error);
        }
    }, [practitioners]);

    // Manuelle Aktualisierung der Arbeitszeiten
    const refreshWorkingHours = useCallback(() => {
        fetchPractitioners();
    }, []);

    // Globale Funktion für manuelle Aktualisierung (über Browser-Konsole aufrufbar)
    useEffect(() => {
        window.refreshCalendarWorkingHours = refreshWorkingHours;
        return () => {
            delete window.refreshCalendarWorkingHours;
        };
    }, [refreshWorkingHours]);

    useEffect(() => {
        fetchPractitioners();
    }, []);

    useEffect(() => {
        if (practitioners.length > 0) {
            updateWorkingHours();
        }
    }, [practitioners.length, updateWorkingHours]); // updateWorkingHours zu Dependencies hinzugefügt

    useEffect(() => {
        fetchEvents();
    }, [resources]);

    useEffect(() => {
        // Lade Abwesenheiten für die Kalenderansicht (aber nicht für die Abrechnung)
        api.get('/absences/', {
            params: {
                is_approved: true,
                start_date: date,
                end_date: date
            }
        }).then(res => setAbsences(res.data));
    }, [date]);

    // Filtere die Behandler basierend auf selectedResources und formatiere sie für den Kalender
    const filteredPractitioners = practitioners.filter(practitioner => {
        // practitioner.id ist bereits eine Zahl, kein String
        return selectedResources.includes(practitioner.id);
    }).map(practitioner => ({
        id: `practitioner-${practitioner.id}`,
        title: `${practitioner.first_name} ${practitioner.last_name}`,
        practitioner: practitioner
    }));

    // Filtere die Events basierend auf selectedResources
    const filteredEvents = events.filter(event => {
        const practitionerId = event.practitioner;
        return selectedResources.includes(practitionerId);
    });

    // Handler für Drag & Drop
    const handleEventDrop = async (info) => {
        const event = info.event;
        
        // Prüfe ob es eine Abwesenheit ist
        if (event.extendedProps?.isAbsence) {
            // Abwesenheiten können nicht per Drag & Drop verschoben werden
            info.revert();
            alert("Abwesenheiten können nicht per Drag & Drop verschoben werden. Bitte bearbeiten Sie die Abwesenheit direkt.");
            return;
        }
        
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
        
        // Prüfe ob es eine Abwesenheit ist
        if (event.extendedProps?.isAbsence) {
            // Abwesenheiten können nicht per Resize geändert werden
            info.revert();
            alert("Abwesenheiten können nicht per Drag & Drop geändert werden. Bitte bearbeiten Sie die Abwesenheit direkt.");
            return;
        }
        
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
        // Prüfe ob es eine Abwesenheit ist
        if (info.event.extendedProps?.isAbsence) {
            // Öffne Abwesenheits-Bearbeitung
            const absenceData = info.event.extendedProps.absenceData;
            navigate(`/absences/${absenceData.id}/edit`);
        } else {
            // Normale Termin-Navigation
            navigate(`/appointments/${info.event.id}`);
        }
    };

    // Handler für Klick auf Event (einfacher Klick)
    const handleEventClick = (info) => {
        // Prüfe ob es eine Abwesenheit ist
        if (info.event.extendedProps?.isAbsence) {
            // Öffne Abwesenheits-Bearbeitung
            const absenceData = info.event.extendedProps.absenceData;
            navigate(`/absences/${absenceData.id}/edit`);
        }
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

    // Berechne die Arbeitszeiten der Behandler als backgroundEvents
    const getBackgroundEvents = () => {
        // Deaktiviere graue Hintergründe - alle Zeiten sollen weiß sein
        return [];
    };

    // Abwesenheiten als Events für die Kalenderansicht (aber nicht für die Abrechnung)
    const getAbsenceEvents = () => {
        return absences.map(abs => {
            let start = abs.start_date;
            let end = abs.end_date;
            if (abs.is_full_day) {
                // Enddatum exklusiv, also +1 Tag
                const endDate = new Date(abs.end_date);
                endDate.setDate(endDate.getDate() + 1);
                end = endDate.toISOString().slice(0, 10);
                return {
                    id: `absence-${abs.id}`,
                    start: `${start}T00:00:00`,
                    end: `${end}T00:00:00`,
                    display: 'block', // Normales Event, nicht Hintergrund
                    backgroundColor: '#888',
                    borderColor: '#666',
                    resourceId: `practitioner-${abs.practitioner}`,
                    title: 'Abwesenheit', // Einfacher Titel, Details werden im Event angezeigt
                    editable: false, // Abwesenheiten sind nicht dragbar
                    durationEditable: false, // Abwesenheiten können nicht resized werden
                    extendedProps: {
                        isAbsence: true,
                        absenceData: abs,
                        absence_type: abs.absence_type,
                        notes: abs.notes,
                        is_full_day: abs.is_full_day
                    }
                };
            } else {
                return {
                    id: `absence-${abs.id}`,
                    start: `${start}T${abs.start_time}`,
                    end: `${end}T${abs.end_time}`,
                    display: 'block', // Normales Event, nicht Hintergrund
                    backgroundColor: '#888',
                    borderColor: '#666',
                    resourceId: `practitioner-${abs.practitioner}`,
                    title: 'Abwesenheit', // Einfacher Titel, Details werden im Event angezeigt
                    editable: false, // Abwesenheiten sind nicht dragbar
                    durationEditable: false, // Abwesenheiten können nicht resized werden
                    extendedProps: {
                        isAbsence: true,
                        absenceData: abs,
                        absence_type: abs.absence_type,
                        notes: abs.notes,
                        is_full_day: abs.is_full_day
                    }
                };
            }
        });
    };

    // Handler für Datums-/Zeitauswahl
    const handleDateSelect = (selectionData) => {
        // Erstelle URL-Parameter für das Termin-Erstellungsformular
        const params = new URLSearchParams({
            start: selectionData.start.toISOString(),
            end: selectionData.end.toISOString(),
            practitioner: selectionData.resourceId,
            resourceType: 'practitioner'
        });
        
        // Navigiere zum Termin-Erstellungsformular mit vorausgefüllten Daten
        navigate(`/appointments/new?${params.toString()}`);
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
                backgroundColor: ev.status === 'ready_to_bill' ? '#4caf50' : 
                                ev.status === 'completed' ? '#1976d2' : 
                                ev.status === 'cancelled' ? '#f44336' : 
                                ev.status === 'no_show' ? '#d32f2f' : '#ff9800',
                borderColor: ev.status === 'ready_to_bill' ? '#4caf50' : 
                           ev.status === 'completed' ? '#1976d2' : 
                           ev.status === 'cancelled' ? '#f44336' : 
                           ev.status === 'no_show' ? '#d32f2f' : '#ff9800',
                    extendedProps: {
                id: ev.id, // Appointment-ID für Status-Änderungen
                treatment_name: ev.treatment_name,
                patient_name: ev.patient_name,
                duration_minutes: ev.duration_minutes,
                status: ev.status,
                treatment_color: ev.treatment_category?.color || '#1976d2',
                room_name: ev.room_name
                    }
                })),
                ...getBackgroundEvents(),
                ...getAbsenceEvents()
            ]}
            resourceType="practitioners"
            calendarKey="practitioners"
            view={view}
            date={date}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onEventClick={handleEventClick}
            onEventDoubleClick={handleEventDoubleClick}
            onEventDelete={handleEventDelete}
            onEventMarkReadyToBill={handleEventMarkReadyToBill}
            onDateSelect={handleDateSelect}
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