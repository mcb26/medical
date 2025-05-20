import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Box, MenuItem, Checkbox, FormControlLabel, Grid, Typography } from '@mui/material';

function NewAppointment() {
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [insurances, setInsurances] = useState([]);
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, practitionersRes, roomsRes, treatmentsRes, insurancesRes] = await Promise.all([
        api.get('patients/'),
        api.get('practitioners/'),
        api.get('rooms/'),
        api.get('treatments/'),
        api.get('insurance-providers/')
      ]);

      console.log('Geladene Räume:', roomsRes.data);

      setPatients(patientsRes.data);
      setPractitioners(practitionersRes.data);
      setRooms(roomsRes.data);
      setTreatments(treatmentsRes.data);
      setInsurances(insurancesRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedData = {
        patient: parseInt(formData.patient),
        practitioner: parseInt(formData.practitioner),
        room: parseInt(formData.room),
        treatment: parseInt(formData.treatment),
        appointment_date: new Date(formData.appointment_date).toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        status: formData.status.toLowerCase()
      };

      console.log('Sende Daten:', formattedData);
      const response = await api.post('appointments/', formattedData);
      navigate('/appointments');
    } catch (error) {
      console.error('Error creating appointment:', error.response?.data || error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Neuer Termin
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Patient"
            name="patient"
            value={formData.patient}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Practitioner"
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

          <TextField
            select
            label="Treatment"
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

          <TextField
            select
            label="Insurance"
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

        <Grid item xs={12} md={6}>
          <TextField
            label="Appointment Date"
            type="datetime-local"
            name="appointment_date"
            value={formData.appointment_date}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Duration (minutes)"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputProps={{ readOnly: true }}
          />

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

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.patient_attended}
                onChange={handleCheckboxChange}
                name="patient_attended"
              />
            }
            label="Patient Attended"
            sx={{ marginY: 1 }}
          />

          <TextField
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />

          <TextField
            label="Session Number"
            type="number"
            name="session_number"
            value={formData.session_number}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="Total Sessions"
            type="number"
            name="total_sessions"
            value={formData.total_sessions}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
        </Grid>
      </Grid>

      <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
        Create Appointment
      </Button>
    </Box>
  );
}

export default NewAppointment;
