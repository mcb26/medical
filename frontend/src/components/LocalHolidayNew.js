import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

function LocalHolidayNew() {
  const [formData, setFormData] = useState({
    name: '',
    date: null,
    bundesland: '',
    description: ''
  });
  const [bundeslaender, setBundeslaender] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBundeslaender = async () => {
      try {
        const response = await api.get('/bundesland/');
        setBundeslaender(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Bundesländer:', error);
      }
    };

    fetchBundeslaender();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        date: formData.date?.toISOString().split('T')[0]
      };
      const response = await api.post('/local-holidays/', dataToSubmit);
      navigate(`/local-holidays/${response.data.id}`);
    } catch (error) {
      setError('Fehler beim Erstellen des Feiertags');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date: date
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Neuer Feiertag
              </Typography>
            </Grid>
            {error && (
              <Grid item xs={12}>
                <Typography color="error">{error}</Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                <DatePicker
                  label="Datum"
                  value={formData.date}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Bundesland</InputLabel>
                <Select
                  name="bundesland"
                  value={formData.bundesland}
                  onChange={handleChange}
                  label="Bundesland"
                >
                  {bundeslaender.map((bundesland) => (
                    <MenuItem key={bundesland.id} value={bundesland.id}>
                      {bundesland.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
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
                  onClick={() => navigate('/dataoverview')}
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

export default LocalHolidayNew; 