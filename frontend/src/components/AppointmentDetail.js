import React, { useState, useEffect } from 'react'; 
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Box, Typography, Paper, TextField, Button, MenuItem } from '@mui/material';
import AppointmentSeriesForm from './AppointmentSeriesForm';

function AppointmentDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [treatments, setTreatments] = useState([]);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (location.pathname === '/appointments/create_series') {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`appointments/${id}`);
        setAppointment(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden des Termins:', error);
        setError('Fehler beim Laden des Termins');
        setLoading(false);
      }
    };

    fetchAppointment();
    fetchDropdownData();
  }, [id, location]);

  const fetchDropdownData = async () => {
    try {
      const [patientsRes, practitionersRes, roomsRes, treatmentsRes] = await Promise.all([
        api.get('patients/'),
        api.get('practitioners/'),
        api.get('rooms/'),
        api.get('treatments/')
      ]);
      setPatients(patientsRes.data);
      setPractitioners(practitionersRes.data);
      setRooms(roomsRes.data);
      setTreatments(treatmentsRes.data);
    } catch (error) {
      setError('Error fetching dropdown data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAppointment((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await api.put(`appointments/${id}/`, appointment, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Appointment updated successfully.');
    } catch (error) {
      console.error('Error updating appointment:', error.response?.data || error.message);
      alert('Failed to update appointment.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        const token = localStorage.getItem('accessToken');
        await api.delete(`appointments/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert('Appointment deleted successfully.');
        navigate('/calendar'); // Redirect to the calendar
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete appointment.');
      }
    }
  };

  if (location.pathname === '/appointments/create_series') {
    return <AppointmentSeriesForm />;
  }

  if (error) {
    return <Typography variant="h6">{error}</Typography>;
  }

  if (loading) {
    return <Typography variant="h6">Loading appointment details...</Typography>;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Appointment Details
      </Typography>
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <TextField
          select
          label="Patient"
          name="patient"
          value={appointment.patient || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
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
          value={appointment.practitioner || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          {practitioners.map((practitioner) => (
            <MenuItem key={practitioner.id} value={practitioner.id}>
              {practitioner.first_name} {practitioner.last_name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Room"
          name="room"
          value={appointment.room || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          {rooms.map((room) => (
            <MenuItem key={room.id} value={room.id}>
              {room.room_name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Treatment"
          name="treatment"
          value={appointment.treatment || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          {treatments.map((treatment) => (
            <MenuItem key={treatment.id} value={treatment.id}>
              {treatment.treatment_name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Date & Time"
          type="datetime-local"
          name="appointment_date"
          value={appointment.appointment_date || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Duration (minutes)"
          name="duration_minutes"
          value={appointment.duration_minutes || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Status"
          name="status"
          value={appointment.status || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Notes"
          name="notes"
          value={appointment.notes || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          multiline
          rows={4}
        />
      </Paper>

      <Box display="flex" justifyContent="space-between" mt={2}>
        <Button variant="contained" color="primary" onClick={handleUpdate}>
          Update Appointment
        </Button>
        <Button variant="contained" color="secondary" onClick={handleDelete}>
          Delete Appointment
        </Button>
      </Box>
    </Box>
  );
}

export default AppointmentDetail;
