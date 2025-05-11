import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const response = await api.get(`/doctors/${id}/`);
        setDoctor(response.data);
        setLoading(false);
      } catch (err) {
        setError('Fehler beim Laden der Arztdaten');
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!doctor) {
    return <Alert severity="info">Arzt nicht gefunden</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              {doctor.title} {doctor.first_name} {doctor.last_name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" color="textSecondary">
              Praxisname
            </Typography>
            <Typography variant="body1">
              {doctor.practicename || 'Nicht angegeben'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" color="textSecondary">
              Lizenznummer
            </Typography>
            <Typography variant="body1">
              {doctor.license_number}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" color="textSecondary">
              E-Mail
            </Typography>
            <Typography variant="body1">
              {doctor.email}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" color="textSecondary">
              Telefon
            </Typography>
            <Typography variant="body1">
              {doctor.phone_number}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" color="textSecondary">
              Spezialisierungen
            </Typography>
            <Box sx={{ mt: 1 }}>
              {doctor.specializations?.map((spec) => (
                <Chip
                  key={spec.id}
                  label={spec.name}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/doctors/${id}/edit`)}
                sx={{ mr: 1 }}
              >
                Bearbeiten
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/doctors')}
              >
                Zurück zur Übersicht
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default DoctorDetail; 