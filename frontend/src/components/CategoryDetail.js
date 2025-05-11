import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import api from '../api/axios';

function CategoryDetail() {
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await api.get(`/categories/${id}/`);
        setCategory(response.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Kategorie');
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!category) return <Typography>Kategorie nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Kategorie Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Name:</strong> {category.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Beschreibung:</strong> {category.description}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/categories/${id}/edit`)}
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

export default CategoryDetail; 