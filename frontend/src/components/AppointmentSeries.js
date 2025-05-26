import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Paper
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../api/axios';
import deLocale from 'date-fns/locale/de';
import { format } from 'date-fns';

function AppointmentSeries() {
  const navigate = useNavigate();
  const location = useLocation();
  const { series_identifier } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const prescriptionId = searchParams.get('prescription');

  const [formData, setFormData] = useState({
    prescription_id: prescriptionId || '',
    start_date: '',
    interval_days: 7,
    preferred_time: '',
    preferred_practitioner: '',
    preferred_room: ''
  });
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [seriesAppointments, setSeriesAppointments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prescriptionsRes, roomsRes, practitionersRes] = await Promise.all([
          api.get('prescriptions/'),
          api.get('rooms/'),
          api.get('practitioners/')
        ]);

        setPrescriptions(prescriptionsRes.data);
        setRooms(roomsRes.data);
        setPractitioners(practitionersRes.data);
      } catch (error) {
        setError('Fehler beim Laden der Daten');
        console.error('Fehler beim Laden der Dropdown-Daten:', error);
      }
    };

    fetchData();
  }, []);

  // Serie-Termine laden, wenn series_identifier vorhanden
  useEffect(() => {
    const fetchSeriesAppointments = async () => {
      if (!series_identifier) return;
      try {
        const response = await api.get(`/appointments/?series_identifier=${series_identifier}`);
        setSeriesAppointments(response.data);
      } catch (error) {
        setError('Fehler beim Laden der Terminserie');
      }
    };
    fetchSeriesAppointments();
  }, [series_identifier]);

  // Neue Funktion zum Behandeln der Verordnungsauswahl
  const handlePrescriptionChange = (prescriptionId) => {
    const prescription = prescriptions.find(p => p.id === prescriptionId);
    setSelectedPrescription(prescription);
    setFormData({
      ...formData,
      prescription_id: prescriptionId,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Datum korrekt formatieren
      const formattedData = {
        ...formData,
        start_date: formData.start_date instanceof Date 
          ? format(formData.start_date, "yyyy-MM-dd'T'HH:mm:ss") // ISO-String mit Zeit
          : formData.start_date,
        interval_days: parseInt(formData.interval_days),
        preferred_practitioner: formData.preferred_practitioner || null,
        preferred_room: formData.preferred_room || null
      };

      console.log('Sending data:', formattedData); // Debugging

      const response = await api.post(
        `/prescriptions/${formData.prescription_id}/create-series/`,
        formattedData
      );
      
      if (response.data) {
        navigate('/appointments');
      }
    } catch (error) {
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.error || 'Fehler beim Erstellen der Terminserie');
    }
  };

  // Validierung vor dem Submit
  const isFormValid = () => {
    if (!formData.prescription_id) return false;
    if (!formData.start_date) return false;
    if (!formData.interval_days || formData.interval_days < 1) return false;
    return true;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Terminserie erstellen
        </Typography>

        {series_identifier && (
          <Box mb={3}>
            <Typography variant="h6">Termine dieser Serie</Typography>
            {seriesAppointments.length === 0 ? (
              <Typography color="text.secondary">Keine Termine gefunden.</Typography>
            ) : (
              <Grid container spacing={2}>
                {seriesAppointments.map((appt) => (
                  <Grid item xs={12} md={6} key={appt.id}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1">
                        {new Date(appt.appointment_date).toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appt.treatment_name} | {appt.practitioner_name}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => navigate(`/appointments/${appt.id}`)}
                      >
                        Zum Termin
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Verordnung</InputLabel>
                <Select
                  value={formData.prescription_id}
                  onChange={(e) => handlePrescriptionChange(e.target.value)}
                  label="Verordnung"
                >
                  {prescriptions.map((prescription) => (
                    <MenuItem key={prescription.id} value={prescription.id}>
                      {`${prescription.patient_name} - ${prescription.treatment_name} (${prescription.number_of_sessions} Einheiten)`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Anzeige der Behandlung aus der ausgewählten Verordnung */}
            {selectedPrescription && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Behandlung"
                  value={selectedPrescription.treatment_name || ''}
                  disabled
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
                <DateTimePicker
                  label="Startdatum und -uhrzeit"
                  value={formData.start_date}
                  onChange={(newValue) => setFormData({ ...formData, start_date: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Intervall (Tage)"
                value={formData.interval_days}
                onChange={(e) => setFormData({ ...formData, interval_days: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Bevorzugter Raum</InputLabel>
                <Select
                  value={formData.preferred_room || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferred_room: e.target.value
                  })}
                  label="Bevorzugter Raum"
                >
                  <MenuItem value="">Kein bestimmter Raum</MenuItem>
                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.room_name} ({room.room_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Bevorzugter Therapeut</InputLabel>
                <Select
                  value={formData.preferred_practitioner || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferred_practitioner: e.target.value
                  })}
                  label="Bevorzugter Therapeut"
                >
                  <MenuItem value="">Kein bestimmter Therapeut</MenuItem>
                  {practitioners.map((practitioner) => (
                    <MenuItem key={practitioner.id} value={practitioner.id}>
                      {`${practitioner.first_name} ${practitioner.last_name}`}
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
                disabled={!isFormValid()}
              >
                Terminserie erstellen
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
}

export default AppointmentSeries; 