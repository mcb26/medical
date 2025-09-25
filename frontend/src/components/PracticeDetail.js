import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import deLocale from 'date-fns/locale/de';
import api from '../api/axios';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const PracticeDetail = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [practice, setPractice] = useState({
        name: '',
        owner_name: '',
        street_address: '',
        phone: '',
        email: '',
        bundesland: '',
        website: '',
        institution_code: '',
        tax_id: '',
        opening_hours: {
            monday: { open: true, start: '08:00', end: '18:00', break_start: '', break_end: '' },
            tuesday: { open: true, start: '08:00', end: '18:00', break_start: '', break_end: '' },
            wednesday: { open: true, start: '08:00', end: '18:00', break_start: '', break_end: '' },
            thursday: { open: true, start: '08:00', end: '18:00', break_start: '', break_end: '' },
            friday: { open: true, start: '08:00', end: '18:00', break_start: '', break_end: '' },
            saturday: { open: false, start: '', end: '', break_start: '', break_end: '' },
            sunday: { open: false, start: '', end: '', break_start: '', break_end: '' }
        },
        bank_details: {},
        calendar_settings: {},
        notification_settings: {},
        invoice_settings: {}
    });
    const [bundeslaender, setBundeslaender] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchPractice();
        fetchBundeslaender();
    }, []);

    const fetchPractice = async () => {
        try {
            // Hole die einzige Praxisinstanz
            const response = await api.get('practice/get_instance/');
            setPractice(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Fehler beim Laden der Praxisdaten:', error);
            setError('Fehler beim Laden der Praxisdaten');
            setLoading(false);
        }
    };

    const fetchBundeslaender = async () => {
        try {
            const response = await api.get('bundeslaender/');
            setBundeslaender(response.data || []);
        } catch (error) {
            setError('Fehler beim Laden der Bundesländer');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put('practice/update_instance/', practice);
            setSuccess('Praxisdaten erfolgreich gespeichert');
            setError('');
        } catch (error) {
            setError('Fehler beim Speichern der Praxisdaten');
            setSuccess('');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPractice(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleOpeningHoursChange = (day, field, value) => {
        setPractice(prev => ({
            ...prev,
            opening_hours: {
                ...prev.opening_hours,
                [day]: {
                    ...prev.opening_hours[day],
                    [field]: value
                }
            }
        }));
    };

    const handleSettingsChange = (section, field, value) => {
        setPractice(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const parseTimeString = (timeStr) => {
        if (!timeStr) return null;
        try {
            const [hours, minutes] = timeStr.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date;
        } catch (error) {
            console.error('Fehler beim Parsen der Zeit:', error);
            return null;
        }
    };

    const formatTimeString = (date) => {
        if (!date) return '';
        try {
            return date.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.error('Fehler beim Formatieren der Zeit:', error);
            return '';
        }
    };

    const handleTimeChange = (day, field, newValue) => {
        try {
            const timeString = newValue ? formatTimeString(newValue) : '';
            handleOpeningHoursChange(day, field, timeString);
        } catch (error) {
            console.error('Fehler bei der Zeitänderung:', error);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
            <Box sx={{ p: 3 }}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Praxiseinstellungen
                    </Typography>
                    
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Tabs value={activeTab} onChange={handleTabChange}>
                        <Tab label="Allgemein" />
                        <Tab label="Öffnungszeiten" />
                        <Tab label="Kalender" />
                        <Tab label="Benachrichtigungen" />
                        <Tab label="Rechnungen" />
                        <Tab label="Bankverbindung" />
                    </Tabs>

                    <form onSubmit={handleSubmit}>
                        <TabPanel value={activeTab} index={0}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Praxisname"
                                        name="name"
                                        value={practice.name || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Inhaber"
                                        name="owner_name"
                                        value={practice.owner_name || ''}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Straße"
                                        name="street_address"
                                        value={practice.street_address || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="PLZ"
                                        name="postal_code"
                                        value={practice.postal_code || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Stadt"
                                        name="city"
                                        value={practice.city || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Telefon"
                                        name="phone"
                                        value={practice.phone || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="E-Mail"
                                        name="email"
                                        type="email"
                                        value={practice.email || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Bundesland</InputLabel>
                                        <Select
                                            name="bundesland"
                                            value={practice.bundesland || ''}
                                            onChange={handleChange}
                                            label="Bundesland"
                                        >
                                            {bundeslaender.map((land) => (
                                                <MenuItem key={land.id} value={land.id}>
                                                    {land.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Website"
                                        name="website"
                                        value={practice.website || ''}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Institutionskennzeichen"
                                        name="institution_code"
                                        value={practice.institution_code || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Steuernummer"
                                        name="tax_id"
                                        value={practice.tax_id || ''}
                                        onChange={handleChange}
                                        required
                                    />
                                </Grid>
                                
                                {/* Öffnungszeiten Übersicht */}
                                <Grid item xs={12}>
                                    <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f8f9fa' }}>
                                        <Typography variant="h6" gutterBottom>
                                            Aktuelle Öffnungszeiten
                                        </Typography>
                                        <Grid container spacing={1}>
                                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                                                const weekdays = {
                                                    monday: 'Montag',
                                                    tuesday: 'Dienstag',
                                                    wednesday: 'Mittwoch',
                                                    thursday: 'Donnerstag',
                                                    friday: 'Freitag',
                                                    saturday: 'Samstag',
                                                    sunday: 'Sonntag'
                                                };
                                                
                                                const daySettings = practice.opening_hours[day];
                                                const isOpen = daySettings?.open;
                                                const startTime = daySettings?.start || '';
                                                const endTime = daySettings?.end || '';
                                                const breakStart = daySettings?.break_start || '';
                                                const breakEnd = daySettings?.break_end || '';
                                                
                                                return (
                                                    <Grid item xs={12} sm={6} md={4} key={day}>
                                                        <Box sx={{ 
                                                            p: 1, 
                                                            border: '1px solid #ddd', 
                                                            borderRadius: 1,
                                                            backgroundColor: isOpen ? '#e8f5e8' : '#f5f5f5'
                                                        }}>
                                                            <Typography variant="subtitle2" fontWeight="bold">
                                                                {weekdays[day]}
                                                            </Typography>
                                                            {isOpen ? (
                                                                <Typography variant="body2">
                                                                    {startTime} - {endTime}
                                                                    {breakStart && breakEnd && (
                                                                        <span style={{ display: 'block', fontSize: '0.8em', color: '#666' }}>
                                                                            Pause: {breakStart} - {breakEnd}
                                                                        </span>
                                                                    )}
                                                                </Typography>
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Geschlossen
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={activeTab} index={1}>
                            <Grid container spacing={2}>
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                                    const weekdays = {
                                        monday: 'Montag',
                                        tuesday: 'Dienstag',
                                        wednesday: 'Mittwoch',
                                        thursday: 'Donnerstag',
                                        friday: 'Freitag',
                                        saturday: 'Samstag',
                                        sunday: 'Sonntag'
                                    };
                                    
                                    return (
                                    <Grid item xs={12} key={day}>
                                            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                                            <Grid container spacing={2} alignItems="center">
                                                <Grid item xs={12} md={2}>
                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                            {weekdays[day]}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} md={2}>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={practice.opening_hours[day]?.open || false}
                                                                onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.checked)}
                                                            />
                                                        }
                                                        label="Geöffnet"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={2}>
                                                    <TimePicker
                                                        label="Öffnet um"
                                                        value={parseTimeString(practice.opening_hours[day]?.start)}
                                                        onChange={(newValue) => handleTimeChange(day, 'start', newValue)}
                                                        disabled={!practice.opening_hours[day]?.open}
                                                        slotProps={{ 
                                                            textField: { 
                                                                fullWidth: true,
                                                                error: false
                                                            } 
                                                        }}
                                                        format="HH:mm"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={2}>
                                                    <TimePicker
                                                        label="Schließt um"
                                                        value={parseTimeString(practice.opening_hours[day]?.end)}
                                                        onChange={(newValue) => handleTimeChange(day, 'end', newValue)}
                                                        disabled={!practice.opening_hours[day]?.open}
                                                        slotProps={{ 
                                                            textField: { 
                                                                fullWidth: true,
                                                                error: false
                                                            } 
                                                        }}
                                                        format="HH:mm"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={2}>
                                                    <TimePicker
                                                        label="Pause von"
                                                        value={parseTimeString(practice.opening_hours[day]?.break_start)}
                                                        onChange={(newValue) => handleTimeChange(day, 'break_start', newValue)}
                                                        disabled={!practice.opening_hours[day]?.open}
                                                        slotProps={{ 
                                                            textField: { 
                                                                fullWidth: true,
                                                                error: false
                                                            } 
                                                        }}
                                                        format="HH:mm"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={2}>
                                                    <TimePicker
                                                        label="Pause bis"
                                                        value={parseTimeString(practice.opening_hours[day]?.break_end)}
                                                        onChange={(newValue) => handleTimeChange(day, 'break_end', newValue)}
                                                        disabled={!practice.opening_hours[day]?.open}
                                                        slotProps={{ 
                                                            textField: { 
                                                                fullWidth: true,
                                                                error: false
                                                            } 
                                                        }}
                                                        format="HH:mm"
                                                    />
                                                </Grid>
                                            </Grid>
                                        </Paper>
                                    </Grid>
                                    );
                                })}
                            </Grid>
                        </TabPanel>

                        <TabPanel value={activeTab} index={2}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Standard-Terminlänge (Minuten)"
                                        type="number"
                                        value={practice.default_appointment_duration || 30}
                                        onChange={(e) => handleChange({
                                            target: {
                                                name: 'default_appointment_duration',
                                                value: parseInt(e.target.value)
                                            }
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Standard-Ansicht</InputLabel>
                                        <Select
                                            value={practice.calendar_settings.default_view || 'timeGridDay'}
                                            onChange={(e) => handleSettingsChange('calendar_settings', 'default_view', e.target.value)}
                                        >
                                            <MenuItem value="timeGridDay">Tag</MenuItem>
                                            <MenuItem value="timeGridWeek">Woche</MenuItem>
                                            <MenuItem value="dayGridMonth">Monat</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={practice.calendar_settings.show_weekends || false}
                                                onChange={(e) => handleSettingsChange('calendar_settings', 'show_weekends', e.target.checked)}
                                            />
                                        }
                                        label="Wochenenden anzeigen"
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={activeTab} index={3}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={practice.notification_settings.send_appointment_confirmations || false}
                                                onChange={(e) => handleSettingsChange('notification_settings', 'send_appointment_confirmations', e.target.checked)}
                                            />
                                        }
                                        label="Terminbestätigungen versenden"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={practice.notification_settings.send_reminders || false}
                                                onChange={(e) => handleSettingsChange('notification_settings', 'send_reminders', e.target.checked)}
                                            />
                                        }
                                        label="Terminerinnerungen versenden"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Erinnerungszeit (Stunden vor Termin)"
                                        type="number"
                                        value={practice.notification_settings.reminder_time || 24}
                                        onChange={(e) => handleSettingsChange('notification_settings', 'reminder_time', parseInt(e.target.value))}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={activeTab} index={4}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Rechnungspräfix"
                                        value={practice.invoice_settings.invoice_prefix || 'RE-'}
                                        onChange={(e) => handleSettingsChange('invoice_settings', 'invoice_prefix', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Nächste Rechnungsnummer"
                                        type="number"
                                        value={practice.invoice_settings.next_invoice_number || 1}
                                        onChange={(e) => handleSettingsChange('invoice_settings', 'next_invoice_number', parseInt(e.target.value))}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="Rechnungsfußtext"
                                        value={practice.invoice_settings.footer_text || ''}
                                        onChange={(e) => handleSettingsChange('invoice_settings', 'footer_text', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Zahlungsziel (Tage)"
                                        type="number"
                                        value={practice.invoice_settings.payment_terms || 14}
                                        onChange={(e) => handleSettingsChange('invoice_settings', 'payment_terms', parseInt(e.target.value))}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <TabPanel value={activeTab} index={5}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Kontoinhaber"
                                        value={practice.bank_details.account_holder || ''}
                                        onChange={(e) => handleSettingsChange('bank_details', 'account_holder', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="IBAN"
                                        value={practice.bank_details.iban || ''}
                                        onChange={(e) => handleSettingsChange('bank_details', 'iban', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="BIC"
                                        value={practice.bank_details.bic || ''}
                                        onChange={(e) => handleSettingsChange('bank_details', 'bic', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Bank"
                                        value={practice.bank_details.bank_name || ''}
                                        onChange={(e) => handleSettingsChange('bank_details', 'bank_name', e.target.value)}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary"
                            >
                                Speichern
                            </Button>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </LocalizationProvider>
    );
};

export default PracticeDetail; 