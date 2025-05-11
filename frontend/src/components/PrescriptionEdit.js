import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Home as HomeIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import api from '../api/axios';

function PrescriptionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    patients: [],
    doctors: [],
    treatments: [],
    icd_codes: []
  });

  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    treatment: '',
    treatment_2: '',
    treatment_3: '',
    diagnosis_group: {
      id: '',
      name: ''
    },
    diagnosis_code: '',
    diagnosis_text: '',
    treatment_type: 'Physiotherapie',
    number_of_sessions: 1,
    sessions_completed: 0,
    therapy_frequency_type: 'weekly_1',
    is_urgent: false,
    requires_home_visit: false,
    therapy_report_required: false,
    therapy_goals: '',
    prescription_date: '',
    status: 'Open',
    insurance_provider_name: '',
    insurance_number: '',
    provider_number: ''
  });

  const FREQUENCY_CHOICES = [
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          prescriptionRes,
          patientsRes,
          doctorsRes,
          treatmentsRes,
          icdCodesRes
        ] = await Promise.all([
          api.get(`/prescriptions/${id}/`),
          api.get('/patients/'),
          api.get('/doctors/'),
          api.get('/treatments/'),
          api.get('/icd-codes/')
        ]);

        setFormData(prescriptionRes.data);
        setOptions({
          patients: patientsRes.data,
          doctors: doctorsRes.data,
          treatments: treatmentsRes.data,
          icd_codes: icdCodesRes.data
        });
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/prescriptions/${id}/`, formData);
      navigate(`/prescriptions/${id}`);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError('Fehler beim Speichern der Verordnung');
    }
  };

  const handleDoctorChange = (e) => {
    const selectedDoctor = options.doctors.find(doc => doc.id === e.target.value);
    setFormData({
      ...formData,
      doctor: e.target.value,
      provider_number: selectedDoctor?.license_number || ''
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        {/* Header */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="h6" sx={{ color: '#1976d2' }}>
              {formData.insurance_provider_name}
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: 'right' }}>
            <Typography variant="h6">Heilmittelverordnung bearbeiten</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Versichertendaten - ohne Betriebsstättennummer */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Versichertendaten
                </Typography>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Versicherten-Nr."
                  value={formData.insurance_number}
                  disabled
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Patient/in
                </Typography>
                <TextField
                  select
                  fullWidth
                  margin="normal"
                  label="Patient"
                  value={formData.patient}
                  onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                >
                  {options.patients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {`${patient.first_name} ${patient.last_name}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Paper>
            </Grid>

            {/* Arztdaten mit Betriebsstättennummer */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Verordnender Arzt
                </Typography>
                <TextField
                  select
                  required
                  fullWidth
                  label="Arzt"
                  value={formData.doctor}
                  onChange={handleDoctorChange}
                  margin="normal"
                >
                  {options.doctors.map((doctor) => (
                    <MenuItem key={doctor.id} value={doctor.id}>
                      {`${doctor.title || ''} ${doctor.first_name} ${doctor.last_name} (${doctor.license_number})`}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Betriebsstättennummer"
                  value={formData.provider_number}
                  disabled
                />
              </Paper>
            </Grid>

            {/* Behandlungen */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Behandlungen
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      required
                      fullWidth
                      label="Behandlung 1"
                      value={formData.treatment}
                      onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                      margin="normal"
                    >
                      {options.treatments.map((treatment) => (
                        <MenuItem key={treatment.id} value={treatment.id}>
                          {treatment.treatment_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Behandlung 2 (optional)"
                      value={formData.treatment_2}
                      onChange={(e) => setFormData({ ...formData, treatment_2: e.target.value })}
                      margin="normal"
                    >
                      <MenuItem value="">Keine zusätzliche Behandlung</MenuItem>
                      {options.treatments.map((treatment) => (
                        <MenuItem key={treatment.id} value={treatment.id}>
                          {treatment.treatment_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Behandlung 3 (optional)"
                      value={formData.treatment_3}
                      onChange={(e) => setFormData({ ...formData, treatment_3: e.target.value })}
                      margin="normal"
                    >
                      <MenuItem value="">Keine zusätzliche Behandlung</MenuItem>
                      {options.treatments.map((treatment) => (
                        <MenuItem key={treatment.id} value={treatment.id}>
                          {treatment.treatment_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                margin="normal"
              >
                <MenuItem value="Open">Offen</MenuItem>
                <MenuItem value="Planned">Geplant</MenuItem>
                <MenuItem value="In_Progress">In Behandlung</MenuItem>
                <MenuItem value="Completed">Abgeschlossen</MenuItem>
                <MenuItem value="Cancelled">Storniert</MenuItem>
                <MenuItem value="Billed">Abgerechnet</MenuItem>
              </TextField>
            </Grid>

            {/* Diagnose und ICD-Code */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Diagnosegruppe
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="ICD-10 Code"
                      value={formData.diagnosis_code}
                      onChange={(e) => {
                        const selectedIcd = options.icd_codes.find(code => code.id === e.target.value);
                        setFormData({
                          ...formData,
                          diagnosis_code: e.target.value,
                          diagnosis_text: selectedIcd?.description || '',
                          diagnosis_group: selectedIcd?.diagnosis_group || { id: '', name: '' }
                        });
                      }}
                    >
                      {options.icd_codes.map((icd) => (
                        <MenuItem key={icd.id} value={icd.id}>
                          {`${icd.code} - ${icd.title}`}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      label="Diagnosetext"
                      value={formData.diagnosis_text}
                      disabled
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Rest der Felder analog zu PrescriptionNew.js */}
            {/* ... */}

            {/* Aktionsbuttons */}
            <Grid item xs={12}>
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(`/prescriptions/${id}`)}
                  startIcon={<HomeIcon />}
                >
                  Zurück
                </Button>
                <Button 
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                >
                  Speichern
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

export default PrescriptionEdit;
