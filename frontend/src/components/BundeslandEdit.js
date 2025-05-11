import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Grid 
} from '@mui/material';
import api from '../api/axios';

function BundeslandEdit() {
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBundesland = async () => {
      try {
        const response = await api.get(`/bundesland/${id}/`);
        setFormData(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden des Bundeslandes');
        setLoading(false);
      }
    };

    fetchBundesland();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/bundesland/${id}/`, formData);
      navigate(`/bundesland/${id}`);
    } catch (error) {
      setError('Fehler beim Aktualisieren des Bundeslandes');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
                Bundesland bearbeiten
              </Typography>
            </Grid>
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
                  onClick={() => navigate(`/bundesland/${id}`)}
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

export default BundeslandEdit; 