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
  const [previewAppointments, setPreviewAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Behandlungsauswahl
  const [selectedTreatment, setSelectedTreatment] = useState('');
  const [treatmentOptions, setTreatmentOptions] = useState([]);
  const [treatment, setTreatment] = useState(null);

  // Lade Behandler und Räume
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

  // Lade Behandlungsoptionen aus der Verordnung
  useEffect(() => {
    const options = [];
    if (prescription.treatment_1) options.push(prescription.treatment_1);
    if (prescription.treatment_2) options.push(prescription.treatment_2);
    if (prescription.treatment_3) options.push(prescription.treatment_3);
    setTreatmentOptions(options);
    if (options.length > 0) setSelectedTreatment(options[0]);
  }, [prescription]);

  // Lade Details zur gewählten Behandlung
  useEffect(() => {
    const fetchTreatment = async () => {
      if (selectedTreatment) {
        try {
          const res = await api.get(`/treatments/${selectedTreatment}/`);
          setTreatment(res.data);
        } catch (err) {
          setError('Fehler beim Laden der Behandlungsdetails');
        }
      } else {
        setTreatment(null);
      }
    };
    fetchTreatment();
  }, [selectedTreatment]);

  const generatePreview = () => {
    if (!selectedPractitioner || !selectedRoom || !startDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    if (!selectedTreatment || !treatment) {
      setError('Bitte wählen Sie eine Behandlung aus');
      return;
    }
    if (!prescription.number_of_sessions || prescription.number_of_sessions < 1) {
      setError('Die Anzahl der Sitzungen muss mindestens 1 betragen');
      return;
    }
    const durationMinutes = treatment.duration_minutes || 30;
    if (!durationMinutes || durationMinutes < 1) {
      setError('Die Behandlungsdauer ist nicht gültig');
      return;
    }

    const appointments = [];
    const startDateTime = parseISO(`${startDate}T${startTime}`);
    const intervalDays = frequency === 'weekly' ? 7 : 1;

    for (let i = 0; i < prescription.number_of_sessions; i++) {
      const appointmentDate = addDays(startDateTime, i * intervalDays);
      appointments.push({
        appointment_date: appointmentDate.toISOString(),
        practitioner: parseInt(selectedPractitioner),
        room: parseInt(selectedRoom),
        duration_minutes: durationMinutes,
        treatment: treatment.id,
        prescription: parseInt(prescription.id),
        patient: parseInt(prescription.patient)
      });
    }
    setPreviewAppointments(appointments);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!selectedTreatment || !treatment) {
      setError('Bitte wählen Sie eine Behandlung aus');
      return;
    }
    if (!selectedPractitioner || !selectedRoom || !startDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    if (!prescription.number_of_sessions || prescription.number_of_sessions < 1) {
      setError('Die Anzahl der Sitzungen muss mindestens 1 betragen');
      return;
    }

    const requestData = {
      prescription: parseInt(prescription.id),
      start_date: startDate, // Format: YYYY-MM-DD
      frequency: frequency === 'weekly' ? 7 : 1,
      practitioner_id: parseInt(selectedPractitioner),
      room_id: parseInt(selectedRoom),
      treatment_id: treatment.id,
      number_of_sessions: prescription.number_of_sessions
    };

    try {
      const response = await api.post(
        `/prescriptions/${prescription.id}/create-series/`,
        requestData
      );
      if (response.status === 201) {
        setSuccess('Termine wurden erfolgreich erstellt');
        onConfirm(response.data.appointments);
      }
    } catch (error) {
      setError(JSON.stringify(error.response?.data));
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

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Behandlung</InputLabel>
            <Select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
            >
              {treatmentOptions.map((id) => (
                <MenuItem key={id} value={id}>
                  {/* Behandlungstitel dynamisch laden */}
                  {id && (
                    <TreatmentName treatmentId={id} />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
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

// Hilfskomponente für Behandlungstitel
function TreatmentName({ treatmentId }) {
  const [name, setName] = useState('');
  useEffect(() => {
    let mounted = true;
    api.get(`/treatments/${treatmentId}/`).then(res => {
      if (mounted) setName(res.data.treatment_name);
    });
    return () => { mounted = false; };
  }, [treatmentId]);
  return name || treatmentId;
}

export default AppointmentSeriesPreview; 