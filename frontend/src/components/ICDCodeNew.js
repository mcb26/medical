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
import api from '../api/axios';

function ICDCodeNew() {
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    parent: ''
  });
  const [parentCodes, setParentCodes] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParentCodes = async () => {
      try {
        const response = await api.get('/icdcodes/');
        setParentCodes(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der übergeordneten Codes:', error);
      }
    };

    fetchParentCodes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/icdcodes/', formData);
      navigate(`/icdcodes/${response.data.id}`);
    } catch (error) {
      setError('Fehler beim Erstellen des ICD-Codes');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Neuer ICD-Code
              </Typography>
            </Grid>
            {error && (
              <Grid item xs={12}>
                <Typography color="error">{error}</Typography>
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titel"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Übergeordneter Code</InputLabel>
                <Select
                  name="parent"
                  value={formData.parent}
                  onChange={handleChange}
                  label="Übergeordneter Code"
                >
                  <MenuItem value="">
                    <em>Kein übergeordneter Code</em>
                  </MenuItem>
                  {parentCodes.map((code) => (
                    <MenuItem key={code.id} value={code.id}>
                      {code.code} - {code.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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

export default ICDCodeNew; 