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
    const [practitionersWithHours, setPractitionersWithHours] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('timeGridWeek');
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

    const updateWorkingHours = async () => {
        try {
            const promises = practitioners.map(async (practitioner) => {
                try {
                    const response = await api.get(`/practitioners/${practitioner.id}/working-hours/`);
                    return {
                        ...practitioner,
                        working_hours: response.data
                    };
                } catch (error) {
                    console.error(`Fehler beim Laden der Arbeitszeiten für ${practitioner.title}:`, error);
                    return practitioner;
                }
            });

            const updatedPractitioners = await Promise.all(promises);
            setPractitioners(updatedPractitioners);
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Arbeitszeiten:', error);
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
    }, []);

    useEffect(() => {
        if (practitioners.length > 0) {
            updateWorkingHours();
        }
    }, [practitioners.length]);

    useEffect(() => {
        if (currentDate && currentView) {
            updateWorkingHours();
        }
    }, [currentDate, currentView]);

    useEffect(() => {
        const filteredPractitioners = practitioners.filter(practitioner => {
            // practitioner.id ist bereits eine Zahl, kein String
            return selectedResources.includes(practitioner.id);
        });
        
        if (filteredPractitioners.length !== practitioners.length) {
            updateWorkingHours();
        }
    }, [practitioners.length, selectedResources]);

    useEffect(() => {
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
                                ev.status === 'completed' ? '#2196f3' : 
                                ev.status === 'cancelled' ? '#f44336' : '#1976d2',
                borderColor: ev.status === 'ready_to_bill' ? '#4caf50' : 
                           ev.status === 'completed' ? '#2196f3' : 
                           ev.status === 'cancelled' ? '#f44336' : '#1976d2',
                    extendedProps: {
                treatment_name: ev.treatment_name,
                patient_name: ev.patient_name,
                duration_minutes: ev.duration_minutes,
                status: ev.status,
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