import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Alert,
  IconButton
} from '@mui/material';
import { format, addDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import api from '../api/axios';

function AppointmentSeriesPreview({ prescription, onConfirm, onCancel }) {
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [frequency, setFrequency] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState([]);
  const [previewAppointments, setPreviewAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [practitionersRes, roomsRes] = await Promise.all([
          api.get('/practitioners/'),
          api.get('/rooms/')
        ]);
        setPractitioners(practitionersRes.data);
        setRooms(roomsRes.data);
      } catch (error) {
        setError('Fehler beim Laden der Daten');
      }
    };
    fetchData();
  }, []);

  const generatePreview = () => {
    if (!selectedPractitioner || !selectedRoom || !startDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    try {
      const appointments = [];
      const startDateTime = parseISO(`${startDate}T${startTime}`);
      const intervalDays = frequency === 'weekly' ? 7 : 1;
      const days = frequency === 'weekly' ? selectedDays : [0, 1, 2, 3, 4]; // Bei täglich alle Werktage

      // Stelle sicher, dass die Behandlung vorhanden ist
      if (!prescription.treatment_1) {
        setError('Keine Behandlung in der Verordnung gefunden');
        return;
      }

      for (let i = 0; i < prescription.number_of_sessions; i++) {
        const appointmentDate = addDays(startDateTime, i * intervalDays);
        const appointment = {
          appointment_date: appointmentDate.toISOString(),
          practitioner: parseInt(selectedPractitioner),
          room: parseInt(selectedRoom),
          duration_minutes: prescription.treatment_1?.duration_minutes || 30,
          treatment: parseInt(prescription.treatment_1),
          prescription: parseInt(prescription.id)
        };
        appointments.push(appointment);
      }

      console.log('Generierte Termine:', appointments);
      setPreviewAppointments(appointments);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Generieren der Vorschau:', error);
      setError('Fehler beim Generieren der Vorschau');
    }
  };

  const handleConfirm = async () => {
    if (!previewAppointments.length) {
        setError('Bitte generieren Sie zuerst eine Vorschau der Termine');
        return;
    }

    // Validiere die Termine
    const invalidAppointments = previewAppointments.filter(
        app => !app.practitioner || !app.room || !app.appointment_date
    );
    if (invalidAppointments.length > 0) {
        setError('Bitte füllen Sie alle erforderlichen Felder aus');
        return;
    }

    try {
        console.log('Prescription Data:', prescription);
        console.log('Treatment 1:', prescription.treatment_1);
        console.log('Treatment 1 Name:', prescription.treatment_1_name);

        // Formatiere die Termine für die API
        const formattedAppointments = previewAppointments.map(app => {
            const date = new Date(app.appointment_date);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            
            return {
                patient: prescription.patient,
                practitioner: parseInt(app.practitioner),
                room: parseInt(app.room),
                appointment_date: `${yyyy}-${mm}-${dd} ${hh}:${min}:00`,
                duration_minutes: app.duration_minutes || 30,
                status: 'planned',
                prescription: parseInt(prescription.id),
                treatment: parseInt(prescription.treatment_1)
            };
        });

        console.log('Sende Termine:', formattedAppointments);

        const requestData = { 
            appointments: formattedAppointments,
            series_identifier: `series_${Date.now()}`,
            prescription: parseInt(prescription.id),
            start_date: startDate,
            time: startTime,
            frequency: frequency === 'weekly' ? 7 : 1,
            practitioner_id: parseInt(selectedPractitioner),
            room_id: parseInt(selectedRoom),
            days: frequency === 'weekly' ? selectedDays : [0, 1, 2, 3, 4]
        };

        console.log('Request Data:', requestData);

        const response = await api.post(
            `/prescriptions/${prescription.id}/create-series/`,
            requestData
        );

        if (response.status === 201) {
            setSuccess('Termine wurden erfolgreich erstellt');
            onConfirm(response.data.appointments);
        }
    } catch (error) {
        console.error('Fehler beim Erstellen der Termine:', error);
        if (error.response?.data) {
            console.error('Fehlerdetails:', error.response.data);
            console.error('Request Data:', error.config?.data);
            setError(
                typeof error.response.data === 'string' 
                    ? error.response.data 
                    : error.response.data.error || 'Fehler beim Erstellen der Termine'
            );
        } else {
            setError('Fehler beim Erstellen der Termine');
        }
    }
  };

  const handleDeleteAppointment = (index) => {
    setPreviewAppointments(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditAppointment = (index, field, value) => {
    setPreviewAppointments(prev => prev.map((appointment, i) => {
      if (i === index) {
        return { ...appointment, [field]: value };
      }
      return appointment;
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Terminserie erstellen
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Behandler</InputLabel>
            <Select
              value={selectedPractitioner}
              onChange={(e) => setSelectedPractitioner(e.target.value)}
            >
              {practitioners.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Raum</InputLabel>
            <Select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Startdatum"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="time"
            label="Uhrzeit"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Frequenz</InputLabel>
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <MenuItem value="daily">Täglich</MenuItem>
              <MenuItem value="weekly">Wöchentlich</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {frequency === 'weekly' && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Wochentage</InputLabel>
              <Select
                multiple
                value={selectedDays}
                onChange={(e) => setSelectedDays(e.target.value)}
              >
                <MenuItem value={0}>Montag</MenuItem>
                <MenuItem value={1}>Dienstag</MenuItem>
                <MenuItem value={2}>Mittwoch</MenuItem>
                <MenuItem value={3}>Donnerstag</MenuItem>
                <MenuItem value={4}>Freitag</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      <Button
        variant="contained"
        onClick={generatePreview}
        sx={{ mb: 3 }}
      >
        Vorschau generieren
      </Button>

      {previewAppointments.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Uhrzeit</TableCell>
                  <TableCell>Behandler</TableCell>
                  <TableCell>Raum</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewAppointments.map((appointment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        type="date"
                        value={format(new Date(appointment.appointment_date), 'yyyy-MM-dd')}
                        onChange={(e) => handleEditAppointment(index, 'appointment_date', 
                          new Date(`${e.target.value}T${format(new Date(appointment.appointment_date), 'HH:mm')}`).toISOString()
                        )}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="time"
                        value={format(new Date(appointment.appointment_date), 'HH:mm')}
                        onChange={(e) => handleEditAppointment(index, 'appointment_date',
                          new Date(`${format(new Date(appointment.appointment_date), 'yyyy-MM-dd')}T${e.target.value}`).toISOString()
                        )}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <Select
                          value={appointment.practitioner}
                          onChange={(e) => handleEditAppointment(index, 'practitioner', e.target.value)}
                        >
                          {practitioners.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <Select
                          value={appointment.room}
                          onChange={(e) => handleEditAppointment(index, 'room', e.target.value)}
                        >
                          {rooms.map((r) => (
                            <MenuItem key={r.id} value={r.id}>
                              {r.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteAppointment(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button variant="contained" onClick={handleConfirm}>
              Termine erstellen
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default AppointmentSeriesPreview; 