import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Person,
  ContactMail,
  MedicalServices,
  Save,
  ArrowBack
} from '@mui/icons-material';
import api from '../api/axios';

function PatientNew() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    email: '',
    phone_number: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: '',
    medical_history: '',
    allergies: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('patients/', formData);
      console.log('Patient erstellt:', response.data);
      navigate('/patients');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Patienten');
    }
  };

  const steps = ['Persönliche Daten', 'Kontaktinformationen', 'Medizinische Informationen'];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" gutterBottom>
            Neuen Patienten anlegen
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/patients')}
          >
            Zurück
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Persönliche Daten */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <Person sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Persönliche Daten
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Vorname"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nachname"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Geburtsdatum"
                      name="dob"
                      type="date"
                      value={formData.dob}
                      onChange={handleChange}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Kontaktinformationen */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <ContactMail sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Kontaktinformationen
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="E-Mail"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Telefonnummer"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Straße und Hausnummer"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Stadt"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Postleitzahl"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Land"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Medizinische Informationen */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <MedicalServices sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Medizinische Informationen
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Medizinische Vorgeschichte"
                      name="medical_history"
                      value={formData.medical_history}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Allergien"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<Save />}
                sx={{ minWidth: 200 }}
              >
                Patient anlegen
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}

export default PatientNew;
