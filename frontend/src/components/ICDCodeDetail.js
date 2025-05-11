import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function ICDCodeDetail() {
  const [icdCode, setIcdCode] = useState(null);
  const [parentCode, setParentCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchICDCode = async () => {
      try {
        const response = await api.get(`/icdcodes/${id}/`);
        setIcdCode(response.data);
        
        // Wenn es einen parent gibt, hole die Details
        if (response.data.parent) {
          const parentResponse = await api.get(`/icdcodes/${response.data.parent}/`);
          setParentCode(parentResponse.data);
        }
        
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden des ICD-Codes');
        setLoading(false);
      }
    };

    fetchICDCode();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!icdCode) return <Typography>ICD-Code nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              ICD-Code Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Code:</strong> {icdCode.code}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Titel:</strong> {icdCode.title}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Beschreibung:</strong> {icdCode.description}</Typography>
          </Grid>
          {parentCode && (
            <Grid item xs={12}>
              <Typography>
                <strong>Übergeordneter Code:</strong> {parentCode.code} - {parentCode.title}
              </Typography>
            </Grid>
          )}
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/icdcodes/${id}/edit`)}
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

export default ICDCodeDetail; 