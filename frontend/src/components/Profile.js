import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // API-URL aus der Umgebungsvariable oder Fallback
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${API_URL}/api/users/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data) {
        setProfile(response.data);
        setError(null);
      } else {
        setError('Keine Profildaten erhalten');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Detaillierte Fehlerbehandlung
      if (error.response) {
        // Server hat mit einem Status-Code geantwortet
        switch (error.response.status) {
          case 401:
            setError('Nicht autorisiert. Bitte melden Sie sich erneut an.');
            localStorage.removeItem('token');
            navigate('/login');
            break;
          case 403:
            setError('Zugriff verweigert');
            break;
          case 404:
            setError('Profil nicht gefunden');
            break;
          case 500:
            setError('Serverfehler. Bitte versuchen Sie es später erneut.');
            break;
          default:
            setError(`Fehler beim Laden des Profils: ${error.response.data?.detail || error.message}`);
        }
      } else if (error.request) {
        // Request wurde gesendet, aber keine Antwort erhalten
        setError('Keine Antwort vom Server. Bitte überprüfen Sie Ihre Internetverbindung.');
      } else {
        // Fehler beim Erstellen des Requests
        setError(`Fehler: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchProfile}>
              Erneut versuchen
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
        <Alert severity="warning">
          Keine Profildaten verfügbar
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Profilkopf */}
          <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{ width: 100, height: 100, mr: 3 }}
              src={profile?.avatar}
            >
              <PersonIcon sx={{ fontSize: 60 }} />
            </Avatar>
            <Box>
              <Typography variant="h4">
                {profile?.first_name} {profile?.last_name}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                {profile?.role || 'Mitarbeiter'}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Kontaktinformationen */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Kontaktinformationen
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EmailIcon sx={{ mr: 1 }} />
              <Typography>{profile?.email}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PhoneIcon sx={{ mr: 1 }} />
              <Typography>{profile?.phone || 'Keine Telefonnummer hinterlegt'}</Typography>
            </Box>
          </Grid>

          {/* Weitere Informationen */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Weitere Informationen
            </Typography>
            <Typography>
              Mitglied seit: {new Date(profile?.date_joined).toLocaleDateString()}
            </Typography>
            <Typography>
              Letzter Login: {new Date(profile?.last_login).toLocaleDateString()}
            </Typography>
          </Grid>

          {/* Aktionen */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate('/profile/edit')}
            >
              Profil bearbeiten
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default Profile;
