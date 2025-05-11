import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function DiagnosisGroupDetail() {
  const [diagnosisGroup, setDiagnosisGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDiagnosisGroup = async () => {
      try {
        const response = await api.get(`/diagnosis-groups/${id}/`);
        setDiagnosisGroup(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Diagnosegruppe');
        setLoading(false);
      }
    };

    fetchDiagnosisGroup();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!diagnosisGroup) return <Typography>Diagnosegruppe nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Diagnosegruppe Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Name:</strong> {diagnosisGroup.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Beschreibung:</strong> {diagnosisGroup.description}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/diagnosis-groups/${id}/edit`)}
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

export default DiagnosisGroupDetail; 