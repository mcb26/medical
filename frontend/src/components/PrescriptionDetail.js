import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Grid,
    Chip,
    Divider,
    Card,
    CardContent
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const PrescriptionDetail = ({ open, onClose, prescription }) => {
    if (!prescription) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'default';
            case 'In_Progress': return 'primary';
            case 'Completed': return 'success';
            case 'Cancelled': return 'error';
            case 'Extended': return 'warning';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Open': return 'Offen';
            case 'In_Progress': return 'In Bearbeitung';
            case 'Completed': return 'Abgeschlossen';
            case 'Cancelled': return 'Storniert';
            case 'Extended': return 'Verlängert';
            default: return status;
        }
    };

    const getFrequencyLabel = (frequency) => {
        switch (frequency) {
            case 'weekly_1': return '1x pro Woche';
            case 'weekly_2': return '2x pro Woche';
            case 'weekly_3': return '3x pro Woche';
            case 'weekly_4': return '4x pro Woche';
            case 'weekly_5': return '5x pro Woche';
            case 'monthly_1': return '1x pro Monat';
            case 'monthly_2': return '2x pro Monat';
            case 'monthly_3': return '3x pro Monat';
            case 'monthly_4': return '4x pro Monat';
            default: return frequency;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Verordnungsdetails</Typography>
                    <Button onClick={onClose} startIcon={<CloseIcon />}>
                        Schließen
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">Grundinformationen</Typography>
                                    <Chip 
                                        label={getStatusLabel(prescription.status)} 
                                        color={getStatusColor(prescription.status)}
                                    />
                                </Box>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Patient
                                        </Typography>
                                        <Typography variant="body1">
                                            {prescription.patient_name} ({prescription.patient_birth_date})
                                        </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Arzt
                                        </Typography>
                                        <Typography variant="body1">
                                            {prescription.doctor_name}
                                        </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Verordnungsdatum
                                        </Typography>
                                        <Typography variant="body1">
                                            {prescription.prescription_date}
                                        </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Anzahl Sitzungen
                                        </Typography>
                                        <Typography variant="body1">
                                            {prescription.number_of_sessions}
                                        </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Abgeschlossene Sitzungen
                                        </Typography>
                                        <Typography variant="body1">
                                            {prescription.sessions_completed || 0}
                                        </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Therapiehäufigkeit
                                        </Typography>
                                        <Typography variant="body1">
                                            {getFrequencyLabel(prescription.therapy_frequency_type)}
                                        </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Krankenkasse
                                        </Typography>
                                        <Typography variant="body1">
                                            {prescription.insurance_provider_name} ({prescription.insurance_number})
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" mb={2}>Behandlungen</Typography>
                                <Typography variant="body1" mb={2}>
                                    {prescription.all_treatment_names}
                                </Typography>
                                
                                <Grid container spacing={2}>
                                    {prescription.treatment_1 && (
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Behandlung 1
                                            </Typography>
                                            <Typography variant="body1">
                                                {prescription.treatment_name}
                                            </Typography>
                                        </Grid>
                                    )}
                                    
                                    {prescription.treatment_2 && prescription.treatment_2_name && (
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Behandlung 2
                                            </Typography>
                                            <Typography variant="body1">
                                                {prescription.treatment_2_name}
                                            </Typography>
                                        </Grid>
                                    )}
                                    
                                    {prescription.treatment_3 && prescription.treatment_3_name && (
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Behandlung 3
                                            </Typography>
                                            <Typography variant="body1">
                                                {prescription.treatment_3_name}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" mb={2}>Diagnose</Typography>
                                <Typography variant="body1">
                                    {prescription.diagnosis_code_display}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {(prescription.therapy_goals && prescription.therapy_goals.trim() !== '') && (
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>Therapieziele</Typography>
                                    <Typography variant="body1">
                                        {prescription.therapy_goals}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" mb={2}>Besondere Anforderungen</Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                    {prescription.is_urgent && (
                                        <Chip label="Dringend" color="error" size="small" />
                                    )}
                                    {prescription.requires_home_visit && (
                                        <Chip label="Hausbesuch" color="primary" size="small" />
                                    )}
                                    {prescription.therapy_report_required && (
                                        <Chip label="Therapiebericht erforderlich" color="warning" size="small" />
                                    )}
                                    {!prescription.is_urgent && !prescription.requires_home_visit && !prescription.therapy_report_required && (
                                        <Typography variant="body2" color="text.secondary">
                                            Keine besonderen Anforderungen
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {prescription.is_follow_up && (
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>Folgeverordnung</Typography>
                                    <Typography variant="body1">
                                        Folgeverordnung {prescription.follow_up_number}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    Schließen
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PrescriptionDetail;
