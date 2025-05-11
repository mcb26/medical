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

      const response = await axios.get('http://localhost:8000/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Fehler beim Laden des Profils');
      if (error.response?.status === 401) {
        navigate('/login');
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
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
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
