import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

function ICDCodeEdit() {
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    parent: ''
  });
  const [parentCodes, setParentCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [icdResponse, parentsResponse] = await Promise.all([
          api.get(`/icd-codes/${id}/`),
          api.get('/icd-codes/')
        ]);
        
        setFormData(icdResponse.data);
        // Filtere den aktuellen Code aus der Liste der möglichen Eltern-Codes
        setParentCodes(parentsResponse.data.filter(code => code.id !== parseInt(id)));
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/icd-codes/${id}/`, formData);
              navigate(`/icd-codes/${id}`);
    } catch (error) {
      setError('Fehler beim Aktualisieren des ICD-Codes');
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
                ICD-Code bearbeiten
              </Typography>
            </Grid>
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
                  value={formData.parent || ''}
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
                  onClick={() => navigate(`/icdcodes/${id}`)}
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

export default ICDCodeEdit; 