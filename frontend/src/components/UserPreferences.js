import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const UserPreferences = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [prefs, setPrefs] = useState({
    theme: 'light',
    language: 'de',
    timezone: 'Europe/Berlin',
    default_calendar_view: 'timeGridWeek',
    receive_email_notifications: true,
    receive_sms_notifications: false,
    default_room: '',
    default_practitioner: ''
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user-preferences/me');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setPrefs({
        theme: data.theme ?? 'light',
        language: data.language ?? 'de',
        timezone: data.timezone ?? 'Europe/Berlin',
        default_calendar_view: data.default_calendar_view ?? 'timeGridWeek',
        receive_email_notifications: !!data.receive_email_notifications,
        receive_sms_notifications: !!data.receive_sms_notifications,
        default_room: data.default_room ?? '',
        default_practitioner: data.default_practitioner ?? ''
      });
    } catch (e) {
      setError('Benutzereinstellungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/user-preferences/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      setSuccess('Einstellungen gespeichert');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError('Einstellungen konnten nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Profil & Benutzereinstellungen
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  label="Theme"
                  value={prefs.theme}
                  onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}
                >
                  <MenuItem value="light">Hell</MenuItem>
                  <MenuItem value="dark">Dunkel</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Kalenderansicht</InputLabel>
                <Select
                  label="Kalenderansicht"
                  value={prefs.default_calendar_view}
                  onChange={(e) => setPrefs({ ...prefs, default_calendar_view: e.target.value })}
                >
                  <MenuItem value="timeGridWeek">Wochenansicht</MenuItem>
                  <MenuItem value="timeGridDay">Tagesansicht</MenuItem>
                  <MenuItem value="dayGridMonth">Monatsansicht</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sprache</InputLabel>
                <Select
                  label="Sprache"
                  value={prefs.language}
                  onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                >
                  <MenuItem value="de">Deutsch</MenuItem>
                  <MenuItem value="en">Englisch</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Zeitzone"
                value={prefs.timezone}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.receive_email_notifications}
                    onChange={(e) => setPrefs({ ...prefs, receive_email_notifications: e.target.checked })}
                  />
                }
                label="E-Mail-Benachrichtigungen"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.receive_sms_notifications}
                    onChange={(e) => setPrefs({ ...prefs, receive_sms_notifications: e.target.checked })}
                  />
                }
                label="SMS-Benachrichtigungen"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={savePreferences}
              disabled={loading}
            >
              {loading ? 'Speichern…' : 'Speichern'}
            </Button>
            <Button variant="text" onClick={loadPreferences} disabled={loading}>Neu laden</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserPreferences;


