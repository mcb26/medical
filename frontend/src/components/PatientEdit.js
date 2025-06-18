import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, 
    Paper, 
    Typography, 
    TextField, 
    Button, 
    Grid, 
    CircularProgress, 
    Alert,
    Card,
    CardContent
} from '@mui/material';
import api from '../api/axios';

const PatientEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchPatient();
    }, [id]);

    const fetchPatient = async () => {
        try {
            const response = await api.get(`patients/${id}/`);
            setPatient(response.data);
            setLoading(false);
        } catch (err) {
            setError('Fehler beim Laden des Patienten');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPatient(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.put(`patients/${id}/`, patient);
            setSuccess('Patient erfolgreich gespeichert');
            setTimeout(() => navigate('/patients'), 1200);
        } catch (err) {
            setError('Fehler beim Speichern des Patienten');
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (!patient) {
        return <Alert severity="error">Patient nicht gefunden</Alert>;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
                <Box sx={{ mx: 0 }}>
                    {/* Header */}
                    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="h4" gutterBottom>Patient bearbeiten</Typography>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                    </Paper>

                    {/* Form Content */}
                    <Paper elevation={3} sx={{ borderRadius: 2 }}>
                        <CardContent>
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={3}>
                                    {/* Persönliche Informationen */}
                                    <Grid item xs={12}>
                                        <Typography variant="h6" gutterBottom>Persönliche Informationen</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Vorname"
                                            name="first_name"
                                            value={patient.first_name || ''}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Nachname"
                                            name="last_name"
                                            value={patient.last_name || ''}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Geburtsdatum"
                                            name="dob"
                                            type="date"
                                            value={patient.dob || ''}
                                            onChange={handleChange}
                                            InputLabelProps={{ shrink: true }}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="E-Mail"
                                            name="email"
                                            type="email"
                                            value={patient.email || ''}
                                            onChange={handleChange}
                                        />
                                    </Grid>

                                    {/* Kontaktinformationen */}
                                    <Grid item xs={12}>
                                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Kontaktinformationen</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Telefonnummer"
                                            name="phone_number"
                                            value={patient.phone_number || ''}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Straße"
                                            name="street_address"
                                            value={patient.street_address || ''}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="PLZ"
                                            name="postal_code"
                                            value={patient.postal_code || ''}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Stadt"
                                            name="city"
                                            value={patient.city || ''}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Land"
                                            name="country"
                                            value={patient.country || ''}
                                            onChange={handleChange}
                                        />
                                    </Grid>

                                    {/* Medizinische Informationen */}
                                    <Grid item xs={12}>
                                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Medizinische Informationen</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Allergien"
                                            name="allergies"
                                            value={patient.allergies || ''}
                                            onChange={handleChange}
                                            multiline
                                            rows={2}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Medizinische Vorgeschichte"
                                            name="medical_history"
                                            value={patient.medical_history || ''}
                                            onChange={handleChange}
                                            multiline
                                            rows={3}
                                        />
                                    </Grid>

                                    {/* Buttons */}
                                    <Grid item xs={12}>
                                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                            <Button 
                                                variant="outlined" 
                                                color="secondary" 
                                                onClick={() => navigate('/patients')}
                                                size="large"
                                            >
                                                Abbrechen
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                variant="contained" 
                                                color="primary"
                                                size="large"
                                            >
                                                Speichern
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};

export default PatientEdit; 