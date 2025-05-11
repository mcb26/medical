import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function DoctorNew() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    practicename: '',
    title: '',
    first_name: '',
    last_name: '',
    license_number: '',
    specializations: [],
    email: '',
    phone_number: ''
  });
  const [specializations, setSpecializations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Lade verfügbare Spezialisierungen
    const fetchSpecializations = async () => {
      try {
        const response = await api.get('/specializations/');
        setSpecializations(response.data);
      } catch (err) {
        setError('Fehler beim Laden der Spezialisierungen');
      }
    };
    fetchSpecializations();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/doctors/', formData);
      navigate('/doctors/' + response.data.id);
    } catch (err) {
      setError('Fehler beim Speichern des Arztes');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Neuen Arzt anlegen
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Praxisname"
            name="practicename"
            value={formData.practicename}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Titel"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            required
            label="Vorname"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            required
            label="Nachname"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            required
            label="Lizenznummer"
            name="license_number"
            value={formData.license_number}
            onChange={handleChange}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Spezialisierungen</InputLabel>
            <Select
              multiple
              name="specializations"
              value={formData.specializations}
              onChange={handleChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={specializations.find(s => s.id === value)?.name} 
                    />
                  ))}
                </Box>
              )}
            >
              {specializations.map((spec) => (
                <MenuItem key={spec.id} value={spec.id}>
                  {spec.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            required
            type="email"
            label="E-Mail"
            name="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            required
            label="Telefonnummer"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            margin="normal"
          />
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              sx={{ mr: 1 }}
            >
              Speichern
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/doctors')}
            >
              Abbrechen
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default DoctorNew; 