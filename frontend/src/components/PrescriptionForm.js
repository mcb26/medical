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
    Grid,
    Alert
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';

const PrescriptionForm = ({ open, onClose, onSubmit, prescription, patientId }) => {
    const [formData, setFormData] = useState({
        number_of_sessions: '',
        therapy_goals: '',
        therapy_frequency_type: 'weekly_1',
        is_urgent: false,
        requires_home_visit: false,
        therapy_report_required: false,
        treatment_1: '',
        treatment_2: '',
        treatment_3: '',
        diagnosis_code: '',
        doctor: ''
    });
    const [loading, setLoading] = useState(false);
    const [treatments, setTreatments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [icdCodes, setIcCodes] = useState([]);
    const { showNotification } = useNotifications();

    useEffect(() => {
        if (open) {
            loadFormData();
            if (prescription) {
                setFormData({
                    number_of_sessions: prescription.number_of_sessions || '',
                    therapy_goals: prescription.therapy_goals || '',
                    therapy_frequency_type: prescription.therapy_frequency_type || 'weekly_1',
                    is_urgent: prescription.is_urgent || false,
                    requires_home_visit: prescription.requires_home_visit || false,
                    therapy_report_required: prescription.therapy_report_required || false,
                    treatment_1: prescription.treatment_1?.id || '',
                    treatment_2: prescription.treatment_2?.id || '',
                    treatment_3: prescription.treatment_3?.id || '',
                    diagnosis_code: prescription.diagnosis_code?.id || '',
                    doctor: prescription.doctor?.id || ''
                });
            }
        }
    }, [open, prescription]);

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
        
        if (!formData.number_of_sessions || !formData.treatment_1 || !formData.diagnosis_code || !formData.doctor) {
            showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
            return;
        }

        try {
            setLoading(true);
            
            const submitData = {
                ...formData,
                number_of_sessions: parseInt(formData.number_of_sessions),
                patient: patientId
            };

            await onSubmit(submitData);
            handleClose();
        } catch (error) {
            showNotification('Fehler beim Speichern der Verordnung', 'error');
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
            therapy_report_required: false,
            treatment_1: '',
            treatment_2: '',
            treatment_3: '',
            diagnosis_code: '',
            doctor: ''
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

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {prescription ? 'Verordnung bearbeiten' : 'Neue Verordnung'}
                    </Typography>
                    <Button onClick={handleClose} startIcon={<CloseIcon />}>
                        Schließen
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
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
                                    {frequencyOptions.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Behandlung 1 *</InputLabel>
                                <Select
                                    value={formData.treatment_1}
                                    onChange={(e) => handleInputChange('treatment_1', e.target.value)}
                                    label="Behandlung 1 *"
                                >
                                    {treatments.map(treatment => (
                                        <MenuItem key={treatment.id} value={treatment.id}>
                                            {treatment.treatment_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Behandlung 2</InputLabel>
                                <Select
                                    value={formData.treatment_2}
                                    onChange={(e) => handleInputChange('treatment_2', e.target.value)}
                                    label="Behandlung 2"
                                >
                                    <MenuItem value="">Keine</MenuItem>
                                    {treatments.map(treatment => (
                                        <MenuItem key={treatment.id} value={treatment.id}>
                                            {treatment.treatment_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Behandlung 3</InputLabel>
                                <Select
                                    value={formData.treatment_3}
                                    onChange={(e) => handleInputChange('treatment_3', e.target.value)}
                                    label="Behandlung 3"
                                >
                                    <MenuItem value="">Keine</MenuItem>
                                    {treatments.map(treatment => (
                                        <MenuItem key={treatment.id} value={treatment.id}>
                                            {treatment.treatment_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Diagnose *</InputLabel>
                                <Select
                                    value={formData.diagnosis_code}
                                    onChange={(e) => handleInputChange('diagnosis_code', e.target.value)}
                                    label="Diagnose *"
                                >
                                    {icdCodes.map(icd => (
                                        <MenuItem key={icd.id} value={icd.id}>
                                            {icd.code} - {icd.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Arzt *</InputLabel>
                                <Select
                                    value={formData.doctor}
                                    onChange={(e) => handleInputChange('doctor', e.target.value)}
                                    label="Arzt *"
                                >
                                    {doctors.map(doctor => (
                                        <MenuItem key={doctor.id} value={doctor.id}>
                                            {doctor.title} {doctor.first_name} {doctor.last_name}
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
                            />
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
                    disabled={loading || !formData.number_of_sessions || !formData.treatment_1 || !formData.diagnosis_code || !formData.doctor}
                >
                    {loading ? 'Wird gespeichert...' : 'Verordnung speichern'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PrescriptionForm;
