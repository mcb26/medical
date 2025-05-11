import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Grid 
} from '@mui/material';
import api from '../api/axios';

function BundeslandNew() {
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/bundesland/', formData);
      navigate(`/bundesland/${response.data.id}`);
    } catch (error) {
      setError('Fehler beim Erstellen des Bundeslandes');
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
                Neues Bundesland
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
                helperText="z.B. Baden-Württemberg"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Kürzel"
                name="abbreviation"
                value={formData.abbreviation}
                onChange={handleChange}
                required
                inputProps={{ maxLength: 2 }}
                helperText="z.B. BW"
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

export default BundeslandNew; 