import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { de } from 'date-fns/locale';
import api from '../api/axios';
import { useToastActions } from './common/ToastNotifications';

function PatientInsuranceManagement({ patientId, onInsuranceUpdate }) {
  const [insurances, setInsurances] = useState([]);
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [formData, setFormData] = useState({
    insurance_provider: '',
    insurance_number: '',
    valid_from: new Date(),
    valid_to: null,
    is_private: false
  });
  const [errors, setErrors] = useState({});
  const { showSuccess, showError } = useToastActions();

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insurancesResponse, providersResponse] = await Promise.all([
        api.get(`/patients/${patientId}/`),
        api.get('/insurance-providers/')
      ]);
      
      setInsurances(insurancesResponse.data.insurances || []);
      setInsuranceProviders(providersResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Versicherungsdaten:', error);
      showError('Fehler beim Laden der Versicherungsdaten');
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingInsurance(null);
    setFormData({
      insurance_provider: '',
      insurance_number: '',
      valid_from: new Date(),
      valid_to: null,
      is_private: false
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (insurance) => {
    setEditingInsurance(insurance);
    setFormData({
      insurance_provider: insurance.insurance_provider,
      insurance_number: insurance.insurance_number || '',
      valid_from: new Date(insurance.valid_from),
      valid_to: insurance.valid_to ? new Date(insurance.valid_to) : null,
      is_private: insurance.is_private
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (insuranceId) => {
    if (!window.confirm('Möchten Sie diese Versicherung wirklich löschen?')) {
      return;
    }

    try {
      await api.delete(`/patient-insurances/${insuranceId}/`);
      showSuccess('Versicherung erfolgreich gelöscht');
      fetchData();
      if (onInsuranceUpdate) onInsuranceUpdate();
    } catch (error) {
      console.error('Fehler beim Löschen der Versicherung:', error);
      showError('Fehler beim Löschen der Versicherung');
    }
  };

  const handleSubmit = async () => {
    // Validierung
    const newErrors = {};
    if (!formData.insurance_provider) {
      newErrors.insurance_provider = 'Versicherung ist erforderlich';
    }
    if (!formData.valid_from) {
      newErrors.valid_from = 'Gültig ab ist erforderlich';
    }
    if (formData.valid_to && formData.valid_to <= formData.valid_from) {
      newErrors.valid_to = 'Gültig bis muss nach Gültig ab liegen';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const submitData = {
        ...formData,
        patient: patientId,
        valid_from: formData.valid_from.toISOString().split('T')[0],
        valid_to: formData.valid_to ? formData.valid_to.toISOString().split('T')[0] : null
      };

      if (editingInsurance) {
        await api.put(`/patient-insurances/${editingInsurance.id}/`, submitData);
        showSuccess('Versicherung erfolgreich aktualisiert');
      } else {
        await api.post('/patient-insurances/', submitData);
        showSuccess('Versicherung erfolgreich hinzugefügt');
      }

      setDialogOpen(false);
      fetchData();
      if (onInsuranceUpdate) onInsuranceUpdate();
    } catch (error) {
      console.error('Fehler beim Speichern der Versicherung:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        showError('Fehler beim Speichern der Versicherung');
      }
    }
  };

  const isInsuranceValid = (insurance) => {
    const today = new Date();
    const validFrom = new Date(insurance.valid_from);
    const validTo = insurance.valid_to ? new Date(insurance.valid_to) : null;
    
    return today >= validFrom && (!validTo || today <= validTo);
  };

  const getCurrentInsurance = () => {
    return insurances.find(insurance => isInsuranceValid(insurance));
  };

  const currentInsurance = getCurrentInsurance();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Lade Versicherungsdaten...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Versicherungen</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
              size="small"
            >
              Versicherung hinzufügen
            </Button>
          </Box>

          {/* Aktuelle Versicherung */}
          {currentInsurance && (
            <Alert 
              severity="success" 
              icon={<CheckCircleIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Aktuelle Versicherung:
              </Typography>
              <Typography variant="body2">
                {currentInsurance.insurance_provider_name} 
                {currentInsurance.insurance_number && ` (${currentInsurance.insurance_number})`}
                <Chip 
                  label={currentInsurance.is_private ? 'Privat' : 'Gesetzlich'} 
                  size="small" 
                  color={currentInsurance.is_private ? 'secondary' : 'primary'}
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Alert>
          )}

          {/* Versicherungshistorie */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Versicherung</TableCell>
                  <TableCell>Versicherungsnummer</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Gültig ab</TableCell>
                  <TableCell>Gültig bis</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {insurances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Keine Versicherungen vorhanden
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  insurances
                    .sort((a, b) => new Date(b.valid_from) - new Date(a.valid_from))
                    .map((insurance) => (
                      <TableRow key={insurance.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {insurance.insurance_provider_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {insurance.insurance_number || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={insurance.is_private ? 'Privat' : 'Gesetzlich'}
                            color={insurance.is_private ? 'secondary' : 'primary'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(insurance.valid_from).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          {insurance.valid_to 
                            ? new Date(insurance.valid_to).toLocaleDateString('de-DE')
                            : 'Unbegrenzt'
                          }
                        </TableCell>
                        <TableCell>
                          {isInsuranceValid(insurance) ? (
                            <Chip
                              label="Aktiv"
                              color="success"
                              size="small"
                              icon={<CheckCircleIcon />}
                            />
                          ) : (
                            <Chip
                              label="Inaktiv"
                              color="default"
                              size="small"
                              icon={<WarningIcon />}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(insurance)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(insurance.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog für Hinzufügen/Bearbeiten */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingInsurance ? 'Versicherung bearbeiten' : 'Neue Versicherung hinzufügen'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.insurance_provider}>
                <InputLabel>Versicherung *</InputLabel>
                <Select
                  value={formData.insurance_provider}
                  onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                  label="Versicherung *"
                >
                  {insuranceProviders.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.insurance_provider && (
                  <Typography variant="caption" color="error">
                    {errors.insurance_provider}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Versicherungsnummer"
                value={formData.insurance_number}
                onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })}
                error={!!errors.insurance_number}
                helperText={errors.insurance_number}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Gültig ab *"
                type="date"
                value={formData.valid_from ? formData.valid_from.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, valid_from: new Date(e.target.value) })}
                fullWidth
                error={!!errors.valid_from}
                helperText={errors.valid_from}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Gültig bis (optional)"
                type="date"
                value={formData.valid_to ? formData.valid_to.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, valid_to: e.target.value ? new Date(e.target.value) : null })}
                fullWidth
                error={!!errors.valid_to}
                helperText={errors.valid_to}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_private}
                    onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  />
                }
                label="Private Versicherung"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingInsurance ? 'Aktualisieren' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PatientInsuranceManagement;
