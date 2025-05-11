import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Grid,
  Paper
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import deLocale from 'date-fns/locale/de';
import api from '../api/axios';

function AppointmentSeriesForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    start_date: new Date(),
    interval_days: 7,
    number_of_appointments: 1,
    preferred_practitioner: '',
    preferred_room: '',
    prescription_id: ''
  });
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [practitionersRes, roomsRes, prescriptionsRes] = await Promise.all([
          api.get('practitioners/'),
          api.get('rooms/'),
          api.get('prescriptions/')
        ]);
        setPractitioners(practitionersRes.data);
        setRooms(roomsRes.data);
        setPrescriptions(prescriptionsRes.data);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError('Fehler beim Laden der Daten');
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.start_date) {
      setError('Bitte wählen Sie ein Startdatum');
      return;
    }

    try {
      const submitData = {
        prescription_id: formData.prescription_id,
        start_date: formData.start_date instanceof Date 
          ? formData.start_date.toISOString().split('T')[0] // Nur YYYY-MM-DD
          : formData.start_date,
        interval_days: parseInt(formData.interval_days),
        number_of_appointments: parseInt(formData.number_of_appointments),
        preferred_practitioner: formData.preferred_practitioner || null,
        preferred_room: formData.preferred_room || null
      };

      const response = await api.post(
        `/prescriptions/${submitData.prescription_id}/create-series/`, 
        submitData
      );
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen:', error.response?.data || error);
      setError(error.response?.data?.detail || 'Fehler beim Erstellen der Termine');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Terminserie erstellen
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Verordnung</InputLabel>
              <Select
                value={formData.prescription_id}
                onChange={(e) => setFormData({ ...formData, prescription_id: e.target.value })}
                label="Verordnung"
              >
                {prescriptions.map((prescription) => (
                  <MenuItem key={prescription.id} value={prescription.id}>
                    {prescription.diagnosis_code 
                      ? `${prescription.diagnosis_code.code} - ${prescription.diagnosis_code.title}`
                      : `Verordnung #${prescription.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={deLocale}>
              <DateTimePicker
                label="Startdatum und Uhrzeit"
                value={formData.start_date}
                onChange={(newValue) => setFormData({ ...formData, start_date: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Anzahl Termine"
              value={formData.number_of_appointments}
              onChange={(e) => setFormData({ ...formData, number_of_appointments: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Tage zwischen Terminen"
              value={formData.interval_days}
              onChange={(e) => setFormData({ ...formData, interval_days: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Therapeut</InputLabel>
              <Select
                value={formData.preferred_practitioner}
                onChange={(e) => setFormData({ ...formData, preferred_practitioner: e.target.value })}
                label="Therapeut"
              >
                <MenuItem value="">Keine Präferenz</MenuItem>
                {practitioners.map((practitioner) => (
                  <MenuItem key={practitioner.id} value={practitioner.id}>
                    {practitioner.first_name} {practitioner.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Raum</InputLabel>
              <Select
                value={formData.preferred_room}
                onChange={(e) => setFormData({ ...formData, preferred_room: e.target.value })}
                label="Raum"
              >
                <MenuItem value="">Keine Präferenz</MenuItem>
                {rooms.map((room) => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!formData.start_date || !formData.prescription_id}
            >
              Termine erstellen
            </Button>
          </Grid>
        </Grid>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </form>
    </Paper>
  );
}

export default AppointmentSeriesForm; 