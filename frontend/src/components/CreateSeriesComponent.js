import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Alert
} from '@mui/material';
import api from '../api/axios';

function CreateSeriesComponent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prescriptionId = searchParams.get('prescription');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [formData, setFormData] = useState({
    prescription_id: prescriptionId,
    start_date: '',
    start_time: '',
    practitioner: '',
    room: '',
    duration_minutes: 30,
    number_of_appointments: 1,
    days_between_sessions: 7
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prescriptionRes, practitionersRes, roomsRes] = await Promise.all([
          prescriptionId ? api.get(`/prescriptions/${prescriptionId}/`) : null,
          api.get('/practitioners/'),
          api.get('/rooms/')
        ]);

        if (prescriptionRes) {
          const prescription = prescriptionRes.data;
          setFormData(prev => ({
            ...prev,
            number_of_appointments: prescription.number_of_sessions - prescription.sessions_completed,
            days_between_sessions: 
              prescription.therapy_frequency_type === 'weekly_1' ? 7 :
              prescription.therapy_frequency_type === 'weekly_2' ? 3 :
              prescription.therapy_frequency_type === 'weekly_3' ? 2 : 7,
            duration_minutes: prescription.treatment?.default_duration || 30
          }));
        }

        setPractitioners(practitionersRes.data);
        setRooms(roomsRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [prescriptionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
        // Datum und Zeit aus dem ISO-String extrahieren
        const dateTime = new Date(formData.start_date);
        if (isNaN(dateTime.getTime())) {
            throw new Error('Ungültiges Datum oder Zeitformat');
        }
        
        // Formatierung für das Backend
        const formattedDate = dateTime.toISOString().split('T')[0];  // "YYYY-MM-DD"
        const hours = String(dateTime.getHours()).padStart(2, '0');
        const minutes = String(dateTime.getMinutes()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;  // "HH:mm"
        
        const requestData = {
            prescription_id: parseInt(prescriptionId),
            start_date: formattedDate,
            start_time: formattedTime,
            practitioner: formData.practitioner ? parseInt(formData.practitioner) : null,
            room: formData.room ? parseInt(formData.room) : null,
            duration_minutes: parseInt(formData.duration_minutes),
            number_of_appointments: parseInt(formData.number_of_appointments),
            days_between_sessions: parseInt(formData.days_between_sessions)
        };
        
        console.log('Sending data:', requestData); // Debug-Ausgabe
        
        const response = await api.post('/appointments/create-series/', requestData);
        if (response.data.success) {
            navigate('/appointments');
        } else {
            setError(response.data.message || 'Fehler beim Erstellen der Terminserie');
        }
    } catch (error) {
        console.error('Error details:', error.response?.data);
        let errorMessage = 'Fehler beim Erstellen der Terminserie';
        
        if (error.response?.data?.errors) {
            const errors = error.response.data.errors;
            errorMessage = Object.entries(errors)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('\n');
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        setError(errorMessage);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) return <Typography>Lade...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Terminserie erstellen</Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Behandler</InputLabel>
              <Select
                name="practitioner"
                value={formData.practitioner}
                onChange={handleInputChange}
                required
              >
                {practitioners.map((practitioner) => (
                  <MenuItem key={practitioner.id} value={practitioner.id}>
                    {practitioner.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Raum</InputLabel>
              <Select
                name="room"
                value={formData.room}
                onChange={handleInputChange}
                required
              >
                {rooms.map((room) => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Startdatum und -zeit"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Anzahl Termine"
              name="number_of_appointments"
              value={formData.number_of_appointments}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Tage zwischen Terminen"
              name="days_between_sessions"
              value={formData.days_between_sessions}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Dauer (Minuten)"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Terminserie erstellen
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default CreateSeriesComponent; 