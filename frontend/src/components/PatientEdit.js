import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Grid, CircularProgress, Alert } from '@mui/material';
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
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3, maxWidth: 700, margin: '0 auto' }}>
                <Typography variant="h5" gutterBottom>Patient bearbeiten</Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
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
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button variant="outlined" color="secondary" onClick={() => navigate('/patients')}>
                            Abbrechen
                        </Button>
                        <Button type="submit" variant="contained" color="primary">
                            Speichern
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default PatientEdit; 