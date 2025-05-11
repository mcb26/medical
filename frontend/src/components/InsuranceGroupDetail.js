import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
  LocalHospital as LocalHospitalIcon
} from '@mui/icons-material';
import api from '../api/axios';

function InsuranceGroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupResponse, providersResponse] = await Promise.all([
        api.get(`/insurance-provider-groups/${id}/`),
        api.get(`/insurance-providers/?group=${id}`)
      ]);
      setGroup(groupResponse.data);
      setProviders(providersResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Gruppendaten:', error);
      setError('Fehler beim Laden der Krankenkassengruppe');
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Gruppe löschen möchten? Alle Zuordnungen zu Krankenkassen werden aufgehoben.')) {
      try {
        await api.delete(`/insurance-provider-groups/${id}/`);
        navigate('/insurance-groups');
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        setError('Fehler beim Löschen der Gruppe');
      }
    }
  };

  const handleRemoveProvider = async (providerId) => {
    if (window.confirm('Krankenkasse aus dieser Gruppe entfernen?')) {
      try {
        await api.patch(`/insurance-providers/${providerId}/`, { group: null });
        fetchGroupData(); // Aktualisiere die Daten
      } catch (error) {
        console.error('Fehler beim Entfernen der Krankenkasse:', error);
        setError('Fehler beim Entfernen der Krankenkasse aus der Gruppe');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {group.name}
              </Typography>
              <Chip
                icon={<AccountBalanceIcon />}
                label={`${providers.length} Krankenkassen`}
                variant="outlined"
                sx={{ mr: 1 }}
              />
              {/* Hier können später weitere Chips für Abrechnungsmerkmale hinzugefügt werden */}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/insurance-groups/${id}/edit`)}
                startIcon={<EditIcon />}
              >
                Bearbeiten
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                startIcon={<DeleteIcon />}
              >
                Löschen
              </Button>
            </Box>
          </Box>

          {group.description && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="action" />
                <Typography variant="subtitle2" color="text.secondary">
                  Beschreibung
                </Typography>
              </Box>
              <Typography paragraph>{group.description}</Typography>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalHospitalIcon color="action" />
              <Typography variant="h6">
                Zugeordnete Krankenkassen
              </Typography>
            </Box>
            {providers.length > 0 ? (
              <List>
                {providers.map((provider) => (
                  <ListItem
                    key={provider.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                  >
                    <ListItemText
                      primary={provider.name}
                      secondary={provider.provider_id}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Aus Gruppe entfernen">
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveProvider(provider.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                Keine Krankenkassen zugeordnet
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/insurance-groups')}
            >
              Zurück zur Übersicht
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default InsuranceGroupDetail; 