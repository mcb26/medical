import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mui/material';
import { Box, Typography, Button, Chip, Divider, Alert } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon, ExpandMore as ExpandIcon } from '@mui/icons-material';
import PrescriptionForm from './PrescriptionForm';
import FollowUpPrescriptionForm from './FollowUpPrescriptionForm';
import PrescriptionDetail from './PrescriptionDetail';
import SeriesManagement from './SeriesManagement';
import { useNotifications } from '../hooks/useNotifications';

const PrescriptionManagement = ({ patientId, onPrescriptionUpdate }) => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showFollowUpForm, setShowFollowUpForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showSeries, setShowSeries] = useState(false);
    const [expandedPrescription, setExpandedPrescription] = useState(null);
    const { showNotification } = useNotifications();

    useEffect(() => {
        if (patientId) {
            loadPrescriptions();
        }
    }, [patientId]);

    const loadPrescriptions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/prescriptions/?patient=${patientId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Verordnungen');
            }
            
            const data = await response.json();
            setPrescriptions(data);
        } catch (err) {
            setError(err.message);
            showNotification('Fehler beim Laden der Verordnungen', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePrescription = () => {
        setSelectedPrescription(null);
        setShowForm(true);
        setShowFollowUpForm(false);
        setShowDetail(false);
        setShowSeries(false);
    };

    const handleCreateFollowUp = (originalPrescription) => {
        setSelectedPrescription(originalPrescription);
        setShowFollowUpForm(true);
        setShowForm(false);
        setShowDetail(false);
        setShowSeries(false);
    };

    const handleViewPrescription = (prescription) => {
        setSelectedPrescription(prescription);
        setShowDetail(true);
        setShowForm(false);
        setShowFollowUpForm(false);
        setShowSeries(false);
    };

    const handleManageSeries = (prescription) => {
        setSelectedPrescription(prescription);
        setShowSeries(true);
        setShowForm(false);
        setShowFollowUpForm(false);
        setShowDetail(false);
    };

    const handleFormSubmit = async (prescriptionData) => {
        try {
            const url = prescriptionData.id 
                ? `/api/prescriptions/${prescriptionData.id}/`
                : '/api/prescriptions/';
            
            const method = prescriptionData.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...prescriptionData,
                    patient: patientId
                })
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Speichern der Verordnung');
            }
            
            const savedPrescription = await response.json();
            showNotification('Verordnung erfolgreich gespeichert', 'success');
            
            setShowForm(false);
            setShowFollowUpForm(false);
            loadPrescriptions();
            
            if (onPrescriptionUpdate) {
                onPrescriptionUpdate(savedPrescription);
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    };

    const handleFollowUpSubmit = async (followUpData) => {
        try {
            const response = await fetch(`/api/prescriptions/${selectedPrescription.id}/create_follow_up/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(followUpData)
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Erstellen der Folgeverordnung');
            }
            
            const savedFollowUp = await response.json();
            showNotification('Folgeverordnung erfolgreich erstellt', 'success');
            
            setShowFollowUpForm(false);
            loadPrescriptions();
            
            if (onPrescriptionUpdate) {
                onPrescriptionUpdate(savedFollowUp);
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    };

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
            case 'In_Progress': return 'In Behandlung';
            case 'Completed': return 'Abgeschlossen';
            case 'Cancelled': return 'Storniert';
            case 'Extended': return 'Verlängert';
            default: return status;
        }
    };

    const getRootPrescription = (prescription) => {
        if (prescription.original_prescription) {
            return prescriptions.find(p => p.id === prescription.original_prescription);
        }
        return prescription;
    };

    const getFollowUps = (prescription) => {
        return prescriptions.filter(p => 
            p.original_prescription === prescription.id
        ).sort((a, b) => a.follow_up_number - b.follow_up_number);
    };

    const renderPrescriptionCard = (prescription) => {
        const isFollowUp = prescription.is_follow_up;
        const rootPrescription = getRootPrescription(prescription);
        const followUps = getFollowUps(prescription);
        const isExpanded = expandedPrescription === prescription.id;
        
        return (
            <Card key={prescription.id} sx={{ mb: 2, border: isFollowUp ? '1px solid #e0e0e0' : '2px solid #1976d2' }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                            <Typography variant="h6" component="h3">
                                {isFollowUp ? `Folgeverordnung ${prescription.follow_up_number}` : 'Verordnung'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {prescription.prescription_date} • {prescription.doctor?.name || 'Unbekannter Arzt'}
                            </Typography>
                        </Box>
                        <Box display="flex" gap={1}>
                            <Chip 
                                label={getStatusLabel(prescription.status)} 
                                color={getStatusColor(prescription.status)}
                                size="small"
                            />
                            {isFollowUp && (
                                <Chip 
                                    label={`Folge ${prescription.follow_up_number}`}
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        </Box>
                    </Box>

                    <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Behandlungen:</strong> {prescription.get_treatment_names?.() || 'Keine'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Sitzungen:</strong> {prescription.sessions_completed || 0} / {prescription.number_of_sessions}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Häufigkeit:</strong> {prescription.therapy_frequency_type}
                        </Typography>
                    </Box>

                    <Box display="flex" gap={1} flexWrap="wrap">
                        <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handleViewPrescription(prescription)}
                        >
                            Details
                        </Button>
                        
                        {!isFollowUp && (
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleCreateFollowUp(prescription)}
                                variant="outlined"
                            >
                                Folgeverordnung
                            </Button>
                        )}
                        
                        <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleManageSeries(prescription)}
                            variant="outlined"
                        >
                            Terminserie
                        </Button>
                        
                        {followUps.length > 0 && (
                            <Button
                                size="small"
                                startIcon={<ExpandIcon />}
                                onClick={() => setExpandedPrescription(isExpanded ? null : prescription.id)}
                                variant="text"
                            >
                                {isExpanded ? 'Weniger' : `${followUps.length} Folgeverordnungen`}
                            </Button>
                        )}
                    </Box>

                    {isExpanded && followUps.length > 0 && (
                        <Box mt={2}>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>
                                Folgeverordnungen:
                            </Typography>
                            <Timeline position="right">
                                {followUps.map((followUp, index) => (
                                    <TimelineItem key={followUp.id}>
                                        <TimelineSeparator>
                                            <TimelineDot color={getStatusColor(followUp.status)} />
                                            {index < followUps.length - 1 && <TimelineConnector />}
                                        </TimelineSeparator>
                                        <TimelineContent>
                                            <Typography variant="body2">
                                                Folgeverordnung {followUp.follow_up_number}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {followUp.prescription_date} • {followUp.number_of_sessions} Sitzungen
                                            </Typography>
                                        </TimelineContent>
                                    </TimelineItem>
                                ))}
                            </Timeline>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Lade Verordnungen...</Typography>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="error">{error}</Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Box>
            <Card>
                <CardHeader
                    title="Verordnungen"
                    action={
                        <Button
                            startIcon={<AddIcon />}
                            onClick={handleCreatePrescription}
                            variant="contained"
                        >
                            Neue Verordnung
                        </Button>
                    }
                />
                <CardContent>
                    {prescriptions.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" align="center" py={4}>
                            Keine Verordnungen vorhanden
                        </Typography>
                    ) : (
                        <Box>
                            {prescriptions
                                .filter(p => !p.is_follow_up) // Zeige nur ursprüngliche Verordnungen
                                .map(renderPrescriptionCard)
                            }
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            {showForm && (
                <PrescriptionForm
                    open={showForm}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                    prescription={selectedPrescription}
                    patientId={patientId}
                />
            )}

            {showFollowUpForm && selectedPrescription && (
                <FollowUpPrescriptionForm
                    open={showFollowUpForm}
                    onClose={() => setShowFollowUpForm(false)}
                    onSubmit={handleFollowUpSubmit}
                    originalPrescription={selectedPrescription}
                />
            )}

            {showDetail && selectedPrescription && (
                <PrescriptionDetail
                    open={showDetail}
                    onClose={() => setShowDetail(false)}
                    prescription={selectedPrescription}
                    onUpdate={loadPrescriptions}
                />
            )}

            {showSeries && selectedPrescription && (
                <SeriesManagement
                    open={showSeries}
                    onClose={() => setShowSeries(false)}
                    prescription={selectedPrescription}
                    onUpdate={loadPrescriptions}
                />
            )}
        </Box>
    );
};

export default PrescriptionManagement;
