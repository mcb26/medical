import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Box,
    Alert
} from '@mui/material';
import { Save, Cancel, Event } from '@mui/icons-material';
import api from '../api/axios';

const AbsenceNew = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [practitioners, setPractitioners] = useState([]);
    
    // Formular-Daten
    const [formData, setFormData] = useState({
        practitioner: '',
        absence_type: 'vacation', // vacation, sick, training, other
        start_date: '',
        end_date: '',
        start_time: '08:00',
        end_time: '17:00',
        is_full_day: true,
        notes: ''
    });

    // URL-Parameter auslesen
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const start = params.get('start');
        const end = params.get('end');
        const practitioner = params.get('practitioner');

        if (start) {
            const startDate = new Date(start);
            setFormData(prev => ({
                ...prev,
                start_date: startDate.toISOString().split('T')[0],
                start_time: startDate.toTimeString().slice(0, 5)
            }));
        }

        if (end) {
            const endDate = new Date(end);
            setFormData(prev => ({
                ...prev,
                end_date: endDate.toISOString().split('T')[0],
                end_time: endDate.toTimeString().slice(0, 5)
            }));
        }

        if (practitioner) {
            setFormData(prev => ({
                ...prev,
                practitioner: practitioner
            }));
        }
    }, [location.search]);

    // Lade Behandler
    useEffect(() => {
        const fetchPractitioners = async () => {
            try {
                const response = await api.get('/practitioners/');
                setPractitioners(response.data);
            } catch (error) {
                console.error('Fehler beim Laden der Behandler:', error);
                setError('Fehler beim Laden der Behandler');
            }
        };

        fetchPractitioners();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const absenceData = {
                ...formData,
                practitioner: parseInt(formData.practitioner),
                is_approved: true // Standardmäßig genehmigt
            };

            await api.post('/absences/', absenceData);
            navigate('/calendar');
        } catch (error) {
            console.error('Fehler beim Erstellen der Abwesenheit:', error);
            setError('Fehler beim Erstellen der Abwesenheit');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/calendar');
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                    <Event sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" component="h1">
                        Abwesenheit/Blockzeit erstellen
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Behandler */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Behandler</InputLabel>
                                <Select
                                    value={formData.practitioner}
                                    onChange={(e) => handleInputChange('practitioner', e.target.value)}
                                    label="Behandler"
                                >
                                    {practitioners.map((practitioner) => (
                                        <MenuItem key={practitioner.id} value={practitioner.id}>
                                            {practitioner.first_name} {practitioner.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Abwesenheitstyp */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Typ</InputLabel>
                                <Select
                                    value={formData.absence_type}
                                    onChange={(e) => handleInputChange('absence_type', e.target.value)}
                                    label="Typ"
                                >
                                    <MenuItem value="vacation">Urlaub</MenuItem>
                                    <MenuItem value="sick">Krankheit</MenuItem>
                                    <MenuItem value="training">Fortbildung</MenuItem>
                                    <MenuItem value="other">Sonstiges</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Ganztägig Checkbox */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.is_full_day}
                                        onChange={(e) => handleInputChange('is_full_day', e.target.checked)}
                                    />
                                }
                                label="Ganztägig"
                            />
                        </Grid>

                        {/* Startdatum */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Startdatum"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => handleInputChange('start_date', e.target.value)}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Enddatum */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Enddatum"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => handleInputChange('end_date', e.target.value)}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Startzeit (nur wenn nicht ganztägig) */}
                        {!formData.is_full_day && (
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Startzeit"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        )}

                        {/* Endzeit (nur wenn nicht ganztägig) */}
                        {!formData.is_full_day && (
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Endzeit"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => handleInputChange('end_time', e.target.value)}
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        )}

                        {/* Notizen */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notizen"
                                multiline
                                rows={4}
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                placeholder="Optionale Notizen zur Abwesenheit..."
                            />
                        </Grid>

                        {/* Buttons */}
                        <Grid item xs={12}>
                            <Box display="flex" gap={2} justifyContent="flex-end">
                                <Button
                                    variant="outlined"
                                    onClick={handleCancel}
                                    startIcon={<Cancel />}
                                    disabled={loading}
                                >
                                    Abbrechen
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<Save />}
                                    disabled={loading}
                                >
                                    {loading ? 'Speichern...' : 'Speichern'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Container>
    );
};

export default AbsenceNew; 