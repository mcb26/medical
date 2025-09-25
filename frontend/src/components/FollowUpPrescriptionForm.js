import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Chip,
    Divider,
    Alert,
    Grid
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';

const FollowUpPrescriptionForm = ({ open, onClose, onSubmit, originalPrescription }) => {
    const [formData, setFormData] = useState({
        number_of_sessions: '',
        therapy_goals: '',
        therapy_frequency_type: 'weekly_1',
        is_urgent: false,
        requires_home_visit: false,
        therapy_report_required: false
    });
    const [loading, setLoading] = useState(false);
    const [treatments, setTreatments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [icdCodes, setIcCodes] = useState([]);
    const { showNotification } = useNotifications();

    useEffect(() => {
        if (open && originalPrescription) {
            // Lade verfügbare Behandlungen, Ärzte und ICD-Codes
            loadFormData();
            
            // Setze Standardwerte basierend auf ursprünglicher Verordnung
            setFormData({
                number_of_sessions: '',
                therapy_goals: originalPrescription.therapy_goals || '',
                therapy_frequency_type: originalPrescription.therapy_frequency_type || 'weekly_1',
                is_urgent: originalPrescription.is_urgent || false,
                requires_home_visit: originalPrescription.requires_home_visit || false,
                therapy_report_required: originalPrescription.therapy_report_required || false
            });
        }
    }, [open, originalPrescription]);

    const loadFormData = async () => {
        try {
            // Lade Behandlungen
            const treatmentsResponse = await fetch('/api/treatments/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            if (treatmentsResponse.ok) {
                const treatmentsData = await treatmentsResponse.json();
                setTreatments(treatmentsData);
            }

            // Lade Ärzte
            const doctorsResponse = await fetch('/api/doctors/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            if (doctorsResponse.ok) {
                const doctorsData = await doctorsResponse.json();
                setDoctors(doctorsData);
            }

            // Lade ICD-Codes
            const icdResponse = await fetch('/api/icd-codes/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            if (icdResponse.ok) {
                const icdData = await icdResponse.json();
                setIcCodes(icdData);
            }
        } catch (error) {
            showNotification('Fehler beim Laden der Formulardaten', 'error');
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.number_of_sessions || formData.number_of_sessions <= 0) {
            showNotification('Bitte geben Sie die Anzahl der Sitzungen an', 'error');
            return;
        }

        try {
            setLoading(true);
            
            const submitData = {
                ...formData,
                number_of_sessions: parseInt(formData.number_of_sessions),
                // Verwende die gleichen Behandlungen wie die ursprüngliche Verordnung
                treatment_1: originalPrescription.treatment_1?.id,
                treatment_2: originalPrescription.treatment_2?.id,
                treatment_3: originalPrescription.treatment_3?.id,
                diagnosis_code: originalPrescription.diagnosis_code?.id,
                doctor: originalPrescription.doctor?.id
            };

            await onSubmit(submitData);
            handleClose();
        } catch (error) {
            showNotification('Fehler beim Erstellen der Folgeverordnung', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            number_of_sessions: '',
            therapy_goals: '',
            therapy_frequency_type: 'weekly_1',
            is_urgent: false,
            requires_home_visit: false,
            therapy_report_required: false
        });
        onClose();
    };

    const frequencyOptions = [
        { value: 'weekly_1', label: '1x pro Woche' },
        { value: 'weekly_2', label: '2x pro Woche' },
        { value: 'weekly_3', label: '3x pro Woche' },
        { value: 'weekly_4', label: '4x pro Woche' },
        { value: 'weekly_5', label: '5x pro Woche' },
        { value: 'monthly_1', label: '1x pro Monat' },
        { value: 'monthly_2', label: '2x pro Monat' },
        { value: 'monthly_3', label: '3x pro Monat' },
        { value: 'monthly_4', label: '4x pro Monat' }
    ];

    if (!originalPrescription) {
        return null;
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Folgeverordnung erstellen
                    </Typography>
                    <Button onClick={handleClose} startIcon={<CloseIcon />}>
                        Schließen
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box mb={3}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>Ursprüngliche Verordnung:</strong> {originalPrescription.prescription_date} • {originalPrescription.number_of_sessions} Sitzungen
                        </Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom>
                        Behandlungen der ursprünglichen Verordnung:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                        {originalPrescription.treatment_1 && (
                            <Chip label={originalPrescription.treatment_1.treatment_name} color="primary" />
                        )}
                        {originalPrescription.treatment_2 && (
                            <Chip label={originalPrescription.treatment_2.treatment_name} color="secondary" />
                        )}
                        {originalPrescription.treatment_3 && (
                            <Chip label={originalPrescription.treatment_3.treatment_name} color="default" />
                        )}
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                        <strong>Diagnose:</strong> {originalPrescription.diagnosis_code?.code} - {originalPrescription.diagnosis_code?.title}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

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
                                helperText="Anzahl der Sitzungen für die Folgeverordnung"
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
                                    {frequencyOptions.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
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
                                helperText="Beschreiben Sie die Ziele für die weitere Behandlung"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Besondere Anforderungen:
                            </Typography>
                            <Box display="flex" gap={2} flexWrap="wrap">
                                <Chip
                                    label="Dringend"
                                    color={formData.is_urgent ? 'error' : 'default'}
                                    onClick={() => handleInputChange('is_urgent', !formData.is_urgent)}
                                    clickable
                                />
                                <Chip
                                    label="Hausbesuch"
                                    color={formData.requires_home_visit ? 'warning' : 'default'}
                                    onClick={() => handleInputChange('requires_home_visit', !formData.requires_home_visit)}
                                    clickable
                                />
                                <Chip
                                    label="Therapiebericht erforderlich"
                                    color={formData.therapy_report_required ? 'info' : 'default'}
                                    onClick={() => handleInputChange('therapy_report_required', !formData.therapy_report_required)}
                                    clickable
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Abbrechen
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading || !formData.number_of_sessions}
                >
                    {loading ? 'Wird erstellt...' : 'Folgeverordnung erstellen'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FollowUpPrescriptionForm;
