import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Save, Cancel, Delete, Event } from '@mui/icons-material';
import api from '../api/axios';

const AbsenceEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Formular-Daten
    const [formData, setFormData] = useState({
        practitioner: '',
        absence_type: 'vacation',
        start_date: '',
        end_date: '',
        start_time: '08:00',
        end_time: '17:00',
        is_full_day: true,
        notes: ''
    });

    // Lade Abwesenheits-Daten
    useEffect(() => {
        const fetchAbsence = async () => {
            try {
                const response = await api.get(`/absences/${id}/`);
                const absence = response.data;
                
                setFormData({
                    practitioner: absence.practitioner,
                    absence_type: absence.absence_type,
                    start_date: absence.start_date,
                    end_date: absence.end_date,
                    start_time: absence.start_time || '08:00',
                    end_time: absence.end_time || '17:00',
                    is_full_day: absence.is_full_day,
                    notes: absence.notes || ''
                });
                setLoading(false);
            } catch (error) {
                console.error('Fehler beim Laden der Abwesenheit:', error);
                setError('Fehler beim Laden der Abwesenheit');
                setLoading(false);
            }
        };

        if (id) {
            fetchAbsence();
        }
    }, [id]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const absenceData = {
                ...formData,
                practitioner: parseInt(formData.practitioner)
            };

            await api.put(`/absences/${id}/`, absenceData);
            setSuccess('Abwesenheit wurde erfolgreich aktualisiert');
            
            // Kurz warten, dann zurück zum Kalender
            setTimeout(() => {
                navigate('/calendar');
            }, 1500);
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Abwesenheit:', error);
            setError('Fehler beim Aktualisieren der Abwesenheit');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Diese Abwesenheit wirklich löschen?')) {
            return;
        }

        try {
            await api.delete(`/absences/${id}/`);
            setSuccess('Abwesenheit wurde erfolgreich gelöscht');
            
            // Kurz warten, dann zurück zum Kalender
            setTimeout(() => {
                navigate('/calendar');
            }, 1500);
        } catch (error) {
            console.error('Fehler beim Löschen der Abwesenheit:', error);
            setError('Fehler beim Löschen der Abwesenheit');
        }
    };

    const handleCancel = () => {
        navigate('/calendar');
    };

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                    <Typography>Lade Abwesenheit...</Typography>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                    <Event sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" component="h1">
                        Abwesenheit bearbeiten
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        {success}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
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
                                    <MenuItem value="parental_leave">Elternzeit</MenuItem>
                                    <MenuItem value="special_leave">Sonderurlaub</MenuItem>
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
                                    color="error"
                                    onClick={handleDelete}
                                    startIcon={<Delete />}
                                    disabled={saving}
                                >
                                    Löschen
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleCancel}
                                    startIcon={<Cancel />}
                                    disabled={saving}
                                >
                                    Abbrechen
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<Save />}
                                    disabled={saving}
                                >
                                    {saving ? 'Speichern...' : 'Speichern'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Container>
    );
};

export default AbsenceEdit; 