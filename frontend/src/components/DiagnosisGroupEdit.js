import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, TextField, Grid } from '@mui/material';
import api from '../api/axios';

function DiagnosisGroupEdit() {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDiagnosisGroup = async () => {
      try {
        const response = await api.get(`/diagnosis-groups/${id}/`);
        setFormData(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Diagnosegruppe');
        setLoading(false);
      }
    };

    fetchDiagnosisGroup();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/diagnosis-groups/${id}/`, formData);
      navigate(`/diagnosis-groups/${id}`);
    } catch (error) {
      setError('Fehler beim Aktualisieren der Diagnosegruppe');
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
                Diagnosegruppe bearbeiten
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
                  onClick={() => navigate(`/diagnosis-groups/${id}`)}
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

export default DiagnosisGroupEdit; 