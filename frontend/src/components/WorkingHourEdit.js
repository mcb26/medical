import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

function WorkingHourEdit() {
  const [formData, setFormData] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
    break_start_time: '',
    break_end_time: '',
    valid_from: null,
    valid_until: null,
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  const weekdays = [
    'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
  ];

  useEffect(() => {
    const fetchWorkingHour = async () => {
      try {
        const response = await api.get(`/working-hours/${id}/`);
        setFormData({
          ...response.data,
          valid_from: response.data.valid_from ? new Date(response.data.valid_from) : null,
          valid_until: response.data.valid_until ? new Date(response.data.valid_until) : null
        });
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Arbeitszeit');
        setLoading(false);
      }
    };

    fetchWorkingHour();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        valid_from: formData.valid_from?.toISOString().split('T')[0],
        valid_until: formData.valid_until?.toISOString().split('T')[0]
      };
      await api.put(`/working-hours/${id}/`, dataToSubmit);
      navigate(`/working-hours/${id}`);
    } catch (error) {
      setError('Fehler beim Aktualisieren der Arbeitszeit');
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value
    }));
  };

  const handleDateChange = (name) => (date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Arbeitszeit bearbeiten
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Wochentag</InputLabel>
                <Select
                  name="day_of_week"
                  value={formData.day_of_week}
                  onChange={handleChange}
                  label="Wochentag"
                >
                  {weekdays.map((day, index) => (
                    <MenuItem key={index} value={index}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Startzeit"
                name="start_time"
                type="time"
                value={formData.start_time}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Endzeit"
                name="end_time"
                type="time"
                value={formData.end_time}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pausenbeginn"
                name="break_start_time"
                type="time"
                value={formData.break_start_time}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pausenende"
                name="break_end_time"
                type="time"
                value={formData.break_end_time}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                <DatePicker
                  label="Gültig von"
                  value={formData.valid_from}
                  onChange={handleDateChange('valid_from')}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                <DatePicker
                  label="Gültig bis"
                  value={formData.valid_until}
                  onChange={handleDateChange('valid_until')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDate={formData.valid_from}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleChange}
                    name="is_active"
                  />
                }
                label="Aktiv"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  sx={{ mr: 1 }}
                >
                  Speichern
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(`/working-hours/${id}`)}
                >
                  Abbrechen
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

export default WorkingHourEdit; 