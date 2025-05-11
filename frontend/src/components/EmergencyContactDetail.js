import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function EmergencyContactDetail() {
  const [contact, setContact] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contactResponse = await api.get(`/emergency-contacts/${id}/`);
        setContact(contactResponse.data);
        
        if (contactResponse.data.patient) {
          const patientResponse = await api.get(`/patients/${contactResponse.data.patient}/`);
          setPatient(patientResponse.data);
        }
        
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden des Notfallkontakts');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!contact) return <Typography>Notfallkontakt nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Notfallkontakt Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Name:</strong> {contact.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Beziehung:</strong> {contact.relationship}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Telefon:</strong> {contact.phone}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Mobil:</strong> {contact.mobile}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>E-Mail:</strong> {contact.email}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Adresse:</strong> {contact.address}</Typography>
          </Grid>
          {patient && (
            <Grid item xs={12}>
              <Typography>
                <strong>Patient:</strong> {patient.first_name} {patient.last_name}
              </Typography>
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography>
              <strong>Notizen:</strong> {contact.notes || 'Keine Notizen'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/emergency-contacts/${id}/edit`)}
                sx={{ mr: 1 }}
              >
                Bearbeiten
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/dataoverview')}
              >
                Zurück
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default EmergencyContactDetail; 