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
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Paper,
    LinearProgress
} from '@mui/material';
import {
    Close as CloseIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    Room as RoomIcon
} from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';

const SeriesManagement = ({ open, onClose, prescription, onUpdate }) => {
    const [seriesInfo, setSeriesInfo] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showExtendForm, setShowExtendForm] = useState(false);
    const [practitioners, setPractitioners] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        practitioner: '',
        room: '',
        frequency: 'weekly_1',
        duration_minutes: 30,
        notes: ''
    });
    const { showNotification } = useNotifications();

    useEffect(() => {
        if (open && prescription) {
            loadSeriesData();
            loadFormData();
        }
    }, [open, prescription]);

    const loadSeriesData = async () => {
        try {
            setLoading(true);
            
            // Lade Termine der Verordnung
            const response = await fetch(`/api/appointments/?prescription=${prescription.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setAppointments(data);
                
                // Gruppiere Termine nach Serie
                const seriesGroups = {};
                data.forEach(appointment => {
                    const seriesId = appointment.series_identifier || 'single';
                    if (!seriesGroups[seriesId]) {
                        seriesGroups[seriesId] = [];
                    }
                    seriesGroups[seriesId].push(appointment);
                });
                
                // Erstelle Serien-Info
                const seriesData = Object.entries(seriesGroups).map(([seriesId, seriesAppointments]) => {
                    const total = seriesAppointments.length;
                    const completed = seriesAppointments.filter(a => a.status === 'completed').length;
                    const cancelled = seriesAppointments.filter(a => a.status === 'cancelled').length;
                    const remaining = total - completed - cancelled;
                    
                    return {
                        series_identifier: seriesId,
                        total_appointments: total,
                        completed_appointments: completed,
                        cancelled_appointments: cancelled,
                        remaining_appointments: remaining,
                        progress_percentage: total > 0 ? (completed / total) * 100 : 0,
                        appointments: seriesAppointments.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
                    };
                });
                
                setSeriesInfo(seriesData);
            }
        } catch (error) {
            showNotification('Fehler beim Laden der Serien-Daten', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadFormData = async () => {
        try {
            // Lade Behandler
            const practitionersResponse = await fetch('/api/practitioners/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            if (practitionersResponse.ok) {
                const practitionersData = await practitionersResponse.json();
                setPractitioners(practitionersData);
            }

            // Lade Räume
            const roomsResponse = await fetch('/api/rooms/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            if (roomsResponse.ok) {
                const roomsData = await roomsResponse.json();
                setRooms(roomsData);
            }
        } catch (error) {
            showNotification('Fehler beim Laden der Formulardaten', 'error');
        }
    };

    const handleCreateSeries = async (e) => {
        e.preventDefault();
        
        if (!formData.start_date || !formData.end_date || !formData.practitioner) {
            showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
            return;
        }

        try {
            setLoading(true);
            
            const response = await fetch('/api/appointments/create_series/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prescription: prescription.id,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    practitioner: formData.practitioner,
                    room: formData.room || null,
                    frequency: formData.frequency,
                    duration_minutes: parseInt(formData.duration_minutes),
                    notes: formData.notes
                })
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Erstellen der Terminserie');
            }
            
            const result = await response.json();
            showNotification(`Terminserie erfolgreich erstellt: ${result.appointments.length} Termine`, 'success');
            
            setShowCreateForm(false);
            loadSeriesData();
            
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExtendSeries = async (e) => {
        e.preventDefault();
        
        if (!formData.additional_sessions || !formData.practitioner) {
            showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
            return;
        }

        try {
            setLoading(true);
            
            const response = await fetch('/api/appointments/extend_series/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prescription: prescription.id,
                    additional_sessions: parseInt(formData.additional_sessions),
                    practitioner: formData.practitioner,
                    room: formData.room || null,
                    frequency: formData.frequency,
                    duration_minutes: parseInt(formData.duration_minutes),
                    notes: formData.notes
                })
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Verlängern der Terminserie');
            }
            
            const result = await response.json();
            showNotification(`Serie erfolgreich verlängert: ${result.appointments.length} neue Termine`, 'success');
            
            setShowExtendForm(false);
            loadSeriesData();
            
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSeries = async (seriesIdentifier) => {
        if (!window.confirm('Möchten Sie wirklich alle zukünftigen Termine dieser Serie stornieren?')) {
            return;
        }

        try {
            setLoading(true);
            
            const response = await fetch(`/api/appointments/cancel_series/${seriesIdentifier}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Stornieren der Serie');
            }
            
            showNotification('Serie erfolgreich storniert', 'success');
            loadSeriesData();
            
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'planned': return 'default';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            case 'no_show': return 'warning';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'planned': return 'Geplant';
            case 'completed': return 'Abgeschlossen';
            case 'cancelled': return 'Storniert';
            case 'no_show': return 'Nicht erschienen';
            default: return status;
        }
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

    const renderSeriesCard = (series) => {
        return (
            <Card key={series.series_identifier} sx={{ mb: 2 }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Serie: {series.series_identifier}
                        </Typography>
                        <Box display="flex" gap={1}>
                            <Chip 
                                label={`${series.completed_appointments}/${series.total_appointments}`}
                                color="primary"
                                size="small"
                            />
                            <Chip 
                                label={`${Math.round(series.progress_percentage)}%`}
                                color="secondary"
                                size="small"
                            />
                        </Box>
                    </Box>

                    <LinearProgress 
                        variant="determinate" 
                        value={series.progress_percentage} 
                        sx={{ mb: 2 }}
                    />

                    <Box display="flex" gap={2} mb={2}>
                        <Typography variant="body2">
                            <strong>Gesamt:</strong> {series.total_appointments}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                            <strong>Abgeschlossen:</strong> {series.completed_appointments}
                        </Typography>
                        <Typography variant="body2" color="error.main">
                            <strong>Storniert:</strong> {series.cancelled_appointments}
                        </Typography>
                        <Typography variant="body2" color="primary.main">
                            <strong>Verbleibend:</strong> {series.remaining_appointments}
                        </Typography>
                    </Box>

                    <Box display="flex" gap={1}>
                        <Button
                            size="small"
                            startIcon={<CalendarIcon />}
                            onClick={() => setShowExtendForm(true)}
                            variant="outlined"
                        >
                            Serie verlängern
                        </Button>
                        <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleCancelSeries(series.series_identifier)}
                            variant="outlined"
                            color="error"
                        >
                            Stornieren
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                        Termine:
                    </Typography>
                    <List dense>
                        {series.appointments.slice(0, 5).map((appointment) => (
                            <ListItem key={appointment.id}>
                                <ListItemText
                                    primary={new Date(appointment.appointment_date).toLocaleString('de-DE')}
                                    secondary={`${appointment.practitioner?.first_name} ${appointment.practitioner?.last_name} • ${appointment.room?.name || 'Kein Raum'}`}
                                />
                                <ListItemSecondaryAction>
                                    <Chip 
                                        label={getStatusLabel(appointment.status)}
                                        color={getStatusColor(appointment.status)}
                                        size="small"
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                        {series.appointments.length > 5 && (
                            <ListItem>
                                <ListItemText
                                    secondary={`... und ${series.appointments.length - 5} weitere Termine`}
                                />
                            </ListItem>
                        )}
                    </List>
                </CardContent>
            </Card>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Terminserien-Verwaltung
                    </Typography>
                    <Button onClick={onClose} startIcon={<CloseIcon />}>
                        Schließen
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent>
                {loading && <LinearProgress sx={{ mb: 2 }} />}

                <Box mb={3}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>Verordnung:</strong> {prescription?.prescription_date} • {prescription?.number_of_sessions} Sitzungen
                        </Typography>
                    </Alert>

                    <Box display="flex" gap={2} mb={2}>
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setShowCreateForm(true)}
                            variant="contained"
                        >
                            Neue Terminserie erstellen
                        </Button>
                    </Box>
                </Box>

                {seriesInfo && seriesInfo.length > 0 ? (
                    <Box>
                        {seriesInfo.map(renderSeriesCard)}
                    </Box>
                ) : (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Keine Terminserien vorhanden
                        </Typography>
                    </Paper>
                )}

                {/* Formular für neue Serie */}
                {showCreateForm && (
                    <Dialog open={showCreateForm} onClose={() => setShowCreateForm(false)} maxWidth="md" fullWidth>
                        <DialogTitle>Neue Terminserie erstellen</DialogTitle>
                        <DialogContent>
                            <form onSubmit={handleCreateSeries}>
                                <Grid container spacing={3} sx={{ mt: 1 }}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Startdatum *"
                                            type="datetime-local"
                                            value={formData.start_date}
                                            onChange={(e) => handleInputChange('start_date', e.target.value)}
                                            required
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Enddatum *"
                                            type="datetime-local"
                                            value={formData.end_date}
                                            onChange={(e) => handleInputChange('end_date', e.target.value)}
                                            required
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Behandler *</InputLabel>
                                            <Select
                                                value={formData.practitioner}
                                                onChange={(e) => handleInputChange('practitioner', e.target.value)}
                                                label="Behandler *"
                                            >
                                                {practitioners.map(practitioner => (
                                                    <MenuItem key={practitioner.id} value={practitioner.id}>
                                                        {practitioner.first_name} {practitioner.last_name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Raum</InputLabel>
                                            <Select
                                                value={formData.room}
                                                onChange={(e) => handleInputChange('room', e.target.value)}
                                                label="Raum"
                                            >
                                                <MenuItem value="">Kein Raum</MenuItem>
                                                {rooms.map(room => (
                                                    <MenuItem key={room.id} value={room.id}>
                                                        {room.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Häufigkeit</InputLabel>
                                            <Select
                                                value={formData.frequency}
                                                onChange={(e) => handleInputChange('frequency', e.target.value)}
                                                label="Häufigkeit"
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
                                        <TextField
                                            fullWidth
                                            label="Dauer (Minuten)"
                                            type="number"
                                            value={formData.duration_minutes}
                                            onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                                            inputProps={{ min: 15, max: 180, step: 15 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Notizen"
                                            multiline
                                            rows={3}
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowCreateForm(false)} disabled={loading}>
                                Abbrechen
                            </Button>
                            <Button
                                onClick={handleCreateSeries}
                                variant="contained"
                                startIcon={<SaveIcon />}
                                disabled={loading}
                            >
                                {loading ? 'Wird erstellt...' : 'Serie erstellen'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

                {/* Formular für Serie verlängern */}
                {showExtendForm && (
                    <Dialog open={showExtendForm} onClose={() => setShowExtendForm(false)} maxWidth="md" fullWidth>
                        <DialogTitle>Terminserie verlängern</DialogTitle>
                        <DialogContent>
                            <form onSubmit={handleExtendSeries}>
                                <Grid container spacing={3} sx={{ mt: 1 }}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Zusätzliche Sitzungen *"
                                            type="number"
                                            value={formData.additional_sessions || ''}
                                            onChange={(e) => handleInputChange('additional_sessions', e.target.value)}
                                            required
                                            inputProps={{ min: 1, max: 50 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Behandler *</InputLabel>
                                            <Select
                                                value={formData.practitioner}
                                                onChange={(e) => handleInputChange('practitioner', e.target.value)}
                                                label="Behandler *"
                                            >
                                                {practitioners.map(practitioner => (
                                                    <MenuItem key={practitioner.id} value={practitioner.id}>
                                                        {practitioner.first_name} {practitioner.last_name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Raum</InputLabel>
                                            <Select
                                                value={formData.room}
                                                onChange={(e) => handleInputChange('room', e.target.value)}
                                                label="Raum"
                                            >
                                                <MenuItem value="">Kein Raum</MenuItem>
                                                {rooms.map(room => (
                                                    <MenuItem key={room.id} value={room.id}>
                                                        {room.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Häufigkeit</InputLabel>
                                            <Select
                                                value={formData.frequency}
                                                onChange={(e) => handleInputChange('frequency', e.target.value)}
                                                label="Häufigkeit"
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
                                        <TextField
                                            fullWidth
                                            label="Dauer (Minuten)"
                                            type="number"
                                            value={formData.duration_minutes}
                                            onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                                            inputProps={{ min: 15, max: 180, step: 15 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Notizen"
                                            multiline
                                            rows={3}
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowExtendForm(false)} disabled={loading}>
                                Abbrechen
                            </Button>
                            <Button
                                onClick={handleExtendSeries}
                                variant="contained"
                                startIcon={<SaveIcon />}
                                disabled={loading}
                            >
                                {loading ? 'Wird verlängert...' : 'Serie verlängern'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SeriesManagement;
