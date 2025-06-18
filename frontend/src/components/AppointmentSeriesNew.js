import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  TextField, Button, Box, MenuItem, Checkbox, FormControlLabel, Grid, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Alert
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function AppointmentSeriesNew({ prescriptionId }) {
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [prescription, setPrescription] = useState(null);
  const [formData, setFormData] = useState({
    patient: '',
    practitioner: '',
    room: '',
    treatment: '',
    insurance: '',
    appointment_date: '',
    duration_minutes: '',
    status: 'planned',
    patient_attended: true,
    notes: '',
    session_number: 1,
    total_sessions: 1,
  });
  const [roundStartTime, setRoundStartTime] = useState(true);
  const [numberOfAppointments, setNumberOfAppointments] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [intervalDays, setIntervalDays] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    // Lade alle Stammdaten und Prescription parallel
    const fetchAll = async () => {
      try {
        const [
          patientsRes,
          practitionersRes,
          roomsRes,
          treatmentsRes,
          insurancesRes,
          prescriptionRes
        ] = await Promise.all([
          api.get('patients/'),
          api.get('practitioners/'),
          api.get('rooms/'),
          api.get('treatments/'),
          api.get('insurance-providers/'),
          prescriptionId ? api.get(`/prescriptions/${prescriptionId}/`) : Promise.resolve({ data: null })
        ]);
        setPatients(patientsRes.data);
        setPractitioners(practitionersRes.data);
        setRooms(roomsRes.data);
        setTreatments(treatmentsRes.data);
        setInsurances(insurancesRes.data);

        if (prescriptionRes.data) {
          setPrescription(prescriptionRes.data);
        }
      } catch (error) {
        setError('Fehler beim Laden der Daten');
      }
    };

    fetchAll();
  }, [prescriptionId]);

  useEffect(() => {
    // Prescription und Patienten müssen geladen sein!
    if (
      prescription &&
      patients.length > 0 &&
      treatments.length > 0 &&
      insurances.length > 0
    ) {
      setFormData(prev => ({
        ...prev,
        patient: prescription.patient?.toString() || '',
        treatment: prescription.treatment_1?.toString() || '',
        insurance: prescription.patient_insurance?.toString() || '',
        duration_minutes: prescription.treatment_1?.duration_minutes?.toString() || '',
        notes: prescription.therapy_goals || '',
      }));
      if (prescription.number_of_sessions) {
        setNumberOfAppointments(prescription.number_of_sessions);
      }
    }
  }, [prescription, patients, treatments, insurances]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'treatment') {
      const selectedTreatment = treatments.find((treatment) => treatment.id === parseInt(value));
      if (selectedTreatment) {
        setFormData((prev) => ({ ...prev, duration_minutes: selectedTreatment.duration_minutes || '' }));
      }
    }
  };

  const handleCheckboxChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  const handleGenerateAppointments = () => {
    if (!formData.patient || !formData.practitioner || !formData.room || !formData.treatment || !formData.appointment_date || !formData.duration_minutes) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    const baseDate = new Date(formData.appointment_date);
    const appts = [];
    for (let i = 0; i < numberOfAppointments; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i * intervalDays);
      let appointmentDate = new Date(date);
      if (roundStartTime) {
        let minutes = appointmentDate.getMinutes();
        let roundedMinutes = minutes < 30 ? 0 : 30;
        appointmentDate.setMinutes(roundedMinutes, 0, 0);
      }
      appts.push({
        ...formData,
        appointment_date: appointmentDate.toISOString(),
        session_number: i + 1,
        total_sessions: numberOfAppointments,
        prescription: prescriptionId || formData.prescription || '',
      });
    }
    setAppointments(appts);
    setError(null);
  };

  const handleEditAppointment = (index, field, value) => {
    setAppointments(prev => prev.map((appt, i) => i === index ? { ...appt, [field]: value } : appt));
  };

  const handleDeleteAppointment = (index) => {
    setAppointments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateAll = async () => {
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht autorisiert. Bitte melden Sie sich erneut an.');
        navigate('/login');
        return;
      }

      for (const appt of appointments) {
        const formattedData = {
          patient: parseInt(appt.patient),
          practitioner: parseInt(appt.practitioner),
          room: parseInt(appt.room),
          treatment: parseInt(appt.treatment),
          appointment_date: appt.appointment_date,
          duration_minutes: parseInt(appt.duration_minutes),
          status: appt.status.toLowerCase(),
          notes: appt.notes,
          prescription: appt.prescription ? parseInt(appt.prescription) : undefined,
          session_number: appt.session_number,
          total_sessions: appt.total_sessions,
        };
        await api.post('appointments/', formattedData);
      }
      setSuccess('Alle Termine wurden erfolgreich erstellt.');
      setAppointments([]);
      setTimeout(() => navigate('/appointments'), 1500);
    } catch (error) {
      setError('Fehler beim Erstellen der Termine: ' + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
    }
  };

  console.log("formData.patient", formData.patient, typeof formData.patient);
  console.log("patients", patients.map(p => [p.id, typeof p.id]));

  return (
    <Box sx={{ mt: 3, maxWidth: '900px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Terminserie erstellen
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Patient"
            name="patient"
            value={formData.patient}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={patients.length === 0}
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id.toString()}>
                {patient.first_name} {patient.last_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Therapeut"
            name="practitioner"
            value={formData.practitioner}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            {practitioners.map((practitioner) => (
              <MenuItem key={practitioner.id} value={practitioner.id}>
                {practitioner.first_name} {practitioner.last_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Raum"
            name="room"
            value={formData.room}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            {rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <MenuItem key={room.id} value={room.id}>
                  {room.name || room.room_name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>Keine Räume verfügbar</MenuItem>
            )}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Behandlung"
            name="treatment"
            value={formData.treatment}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            {treatments.map((treatment) => (
              <MenuItem key={treatment.id} value={treatment.id}>
                {treatment.treatment_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Datum und Uhrzeit"
            type="datetime-local"
            name="appointment_date"
            value={formData.appointment_date}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Dauer"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            <MenuItem value="planned">Geplant</MenuItem>
            <MenuItem value="completed">Abgeschlossen</MenuItem>
            <MenuItem value="cancelled">Storniert</MenuItem>
            <MenuItem value="billed">Abgerechnet</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Versicherung"
            name="insurance"
            value={formData.insurance}
            onChange={handleChange}
            fullWidth
            margin="normal"
          >
            {insurances.map((insurance) => (
              <MenuItem key={insurance.id} value={insurance.id}>
                {insurance.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.patient_attended}
                onChange={handleCheckboxChange}
                name="patient_attended"
              />
            }
            label="Patient erschienen"
            sx={{ marginY: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={roundStartTime}
                onChange={e => setRoundStartTime(e.target.checked)}
                name="roundStartTime"
              />
            }
            label="Startzeit runden"
            sx={{ marginY: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Bemerkung"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Anzahl der Termine"
            type="number"
            value={numberOfAppointments}
            onChange={e => setNumberOfAppointments(Number(e.target.value))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Abstand in Tagen"
            type="number"
            value={intervalDays}
            onChange={e => setIntervalDays(Number(e.target.value))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1 }}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateAppointments}
        >
          Vorschau generieren
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => navigate('/appointments')}
        >
          Abbrechen
        </Button>
      </Box>
      {appointments.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Vorschau der Termine
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum & Uhrzeit</TableCell>
                  <TableCell>Behandler</TableCell>
                  <TableCell>Raum</TableCell>
                  <TableCell>Behandlung</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Bemerkung</TableCell>
                  <TableCell>Nr.</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.map((appt, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        type="datetime-local"
                        value={appt.appointment_date.slice(0, 16)}
                        onChange={e => handleEditAppointment(idx, 'appointment_date', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.practitioner}
                        onChange={e => handleEditAppointment(idx, 'practitioner', e.target.value)}
                        fullWidth
                      >
                        {practitioners.map((practitioner) => (
                          <MenuItem key={practitioner.id} value={practitioner.id}>
                            {practitioner.first_name} {practitioner.last_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.room}
                        onChange={e => handleEditAppointment(idx, 'room', e.target.value)}
                        fullWidth
                      >
                        {rooms.map((room) => (
                          <MenuItem key={room.id} value={room.id}>
                            {room.name || room.room_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.treatment}
                        onChange={e => handleEditAppointment(idx, 'treatment', e.target.value)}
                        fullWidth
                      >
                        {treatments.map((treatment) => (
                          <MenuItem key={treatment.id} value={treatment.id}>
                            {treatment.treatment_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.status}
                        onChange={e => handleEditAppointment(idx, 'status', e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="planned">Geplant</MenuItem>
                        <MenuItem value="completed">Abgeschlossen</MenuItem>
                        <MenuItem value="cancelled">Storniert</MenuItem>
                        <MenuItem value="billed">Abgerechnet</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={appt.notes || ''}
                        onChange={e => handleEditAppointment(idx, 'notes', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      {appt.session_number} / {appt.total_sessions}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteAppointment(idx)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={handleCreateAll}>
              Alle Termine erstellen
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default AppointmentSeriesNew; 