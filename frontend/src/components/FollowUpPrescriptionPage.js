import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    CircularProgress,
    Alert,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import api from '../api/axios';

const FollowUpPrescriptionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [originalPrescription, setOriginalPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        number_of_sessions: '',
        therapy_goals: '',
        therapy_frequency_type: 'weekly_1',
        is_urgent: false,
        requires_home_visit: false,
        therapy_report_required: false
    });

    const loadOriginalPrescription = useCallback(async () => {
        try {
            setLoading(true);
            
            // Hole immer einen neuen Token für Sicherheit
            const token = await getNewToken();
            if (!token) {
                throw new Error('Keine Authentifizierung möglich');
            }
            
            try {
                const response = await api.get(`/prescriptions/${id}/`);
                setOriginalPrescription(response.data);
                
                // Setze Standardwerte basierend auf der ursprünglichen Verordnung
                setFormData(prev => ({
                    ...prev,
                    therapy_frequency_type: response.data.therapy_frequency_type,
                    therapy_goals: response.data.therapy_goals || ''
                }));
            } catch (error) {
                console.error('API Error:', error);
                if (error.response?.status === 401) {
                    throw new Error('Authentifizierung fehlgeschlagen');
                } else if (error.response?.status === 404) {
                    throw new Error('Ursprüngliche Verordnung nicht gefunden');
                } else {
                    throw new Error(`Server-Fehler: ${error.response?.status || 'Unbekannt'}`);
                }
            }
        } catch (err) {
            setError(err.message);
            console.error('Fehler beim Laden der ursprünglichen Verordnung:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadOriginalPrescription();
        }
    }, [id, loadOriginalPrescription]);

    // Funktion zum Erhalten eines neuen Tokens
    const getNewToken = async () => {
        try {
            // Verwende den bestehenden Token oder hole einen neuen über den Auth-Service
            const existingToken = localStorage.getItem('token');
            if (existingToken) {
                return existingToken;
            }
            
            // Falls kein Token vorhanden, leite zur Login-Seite weiter
            throw new Error('Keine Authentifizierung verfügbar');
        } catch (error) {
            console.error('Fehler beim Token-Refresh:', error);
            // Leite zur Login-Seite weiter
            window.location.href = '/login';
        }
        return null;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.number_of_sessions) {
            setError('Bitte geben Sie die Anzahl der Sitzungen an');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            
            const followUpData = {
                ...formData,
                number_of_sessions: parseInt(formData.number_of_sessions),
                patient: originalPrescription.patient,
                doctor: originalPrescription.doctor,
                treatment_1: originalPrescription.treatment_1,
                treatment_2: originalPrescription.treatment_2,
                treatment_3: originalPrescription.treatment_3,
                diagnosis_code: originalPrescription.diagnosis_code,
                patient_insurance: originalPrescription.patient_insurance,
                original_prescription: originalPrescription.id
            };

            const response = await api.post(`/prescriptions/${id}/create_follow_up/`, followUpData);
            
            // Navigiere zur neuen Folgeverordnung
            navigate(`/prescriptions/${response.data.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Erstellen der Folgeverordnung');
            console.error('Fehler beim Erstellen der Folgeverordnung:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error && !originalPrescription) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
                <Button 
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(`/prescriptions/${id}`)}
                    sx={{ mt: 2 }}
                >
                    Zurück zur Verordnung
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5">Folgeverordnung erstellen</Typography>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(`/prescriptions/${id}`)}
                    >
                        Zurück zur Verordnung
                    </Button>
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}

            <Grid container spacing={3}>
                {/* Ursprüngliche Verordnung */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Ursprüngliche Verordnung</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Patient
                                    </Typography>
                                    <Typography variant="body1">
                                        {originalPrescription.patient_name} ({originalPrescription.patient_birth_date})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Arzt
                                    </Typography>
                                    <Typography variant="body1">
                                        {originalPrescription.doctor_name}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Behandlungen
                                    </Typography>
                                    <Typography variant="body1">
                                        {originalPrescription.all_treatment_names}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Diagnose
                                    </Typography>
                                    <Typography variant="body1">
                                        {originalPrescription.diagnosis_code_display}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Folgeverordnung Formular */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Folgeverordnung</Typography>
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Anzahl Sitzungen *"
                                            type="number"
                                            value={formData.number_of_sessions}
                                            onChange={(e) => handleInputChange('number_of_sessions', e.target.value)}
                                            required
                                            inputProps={{ min: 1, max: 100 }}
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Therapiehäufigkeit</InputLabel>
                                            <Select
                                                value={formData.therapy_frequency_type}
                                                onChange={(e) => handleInputChange('therapy_frequency_type', e.target.value)}
                                                label="Therapiehäufigkeit"
                                            >
                                                <MenuItem value="weekly_1">1x pro Woche</MenuItem>
                                                <MenuItem value="weekly_2">2x pro Woche</MenuItem>
                                                <MenuItem value="weekly_3">3x pro Woche</MenuItem>
                                                <MenuItem value="weekly_4">4x pro Woche</MenuItem>
                                                <MenuItem value="weekly_5">5x pro Woche</MenuItem>
                                                <MenuItem value="monthly_1">1x pro Monat</MenuItem>
                                                <MenuItem value="monthly_2">2x pro Monat</MenuItem>
                                                <MenuItem value="monthly_3">3x pro Monat</MenuItem>
                                                <MenuItem value="monthly_4">4x pro Monat</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Therapieziele"
                                            multiline
                                            rows={3}
                                            value={formData.therapy_goals}
                                            onChange={(e) => handleInputChange('therapy_goals', e.target.value)}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Besondere Anforderungen
                                        </Typography>
                                        <Box display="flex" gap={1} flexWrap="wrap">
                                            <Chip
                                                label="Dringend"
                                                color={formData.is_urgent ? "error" : "default"}
                                                onClick={() => handleInputChange('is_urgent', !formData.is_urgent)}
                                                clickable
                                            />
                                            <Chip
                                                label="Hausbesuch"
                                                color={formData.requires_home_visit ? "primary" : "default"}
                                                onClick={() => handleInputChange('requires_home_visit', !formData.requires_home_visit)}
                                                clickable
                                            />
                                            <Chip
                                                label="Therapiebericht erforderlich"
                                                color={formData.therapy_report_required ? "warning" : "default"}
                                                onClick={() => handleInputChange('therapy_report_required', !formData.therapy_report_required)}
                                                clickable
                                            />
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Box display="flex" gap={2} justifyContent="flex-end">
                                            <Button
                                                variant="outlined"
                                                onClick={() => navigate(`/prescriptions/${id}`)}
                                                disabled={saving}
                                            >
                                                Abbrechen
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                startIcon={<SaveIcon />}
                                                disabled={saving || !formData.number_of_sessions}
                                            >
                                                {saving ? 'Wird erstellt...' : 'Folgeverordnung erstellen'}
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default FollowUpPrescriptionPage;

