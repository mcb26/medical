import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Grid,
  FormControlLabel,
  Checkbox,
  Alert
} from '@mui/material';

function PrescriptionNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prescriptionId = searchParams.get('prescriptionId');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    treatment_1: '',
    treatment_2: '',
    treatment_3: '',
    diagnosis_group: '',
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
    prescription_date: new Date().toISOString().split('T')[0]
  });

  const [options, setOptions] = useState({
    patients: [],
    doctors: [],
    treatments: [],
    icd_codes: []
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
          patientsResponse,
          diagnosesResponse,
          treatmentsResponse,
          doctorsResponse
        ] = await Promise.all([
          api.get('patients/'),
          api.get('icdcodes/'),
          api.get('treatments/'),
          api.get('doctors/')
        ]);

        setOptions({
          patients: patientsResponse.data,
          doctors: doctorsResponse.data,
          treatments: treatmentsResponse.data,
          icd_codes: diagnosesResponse.data
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Fehler beim Laden der Daten');
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (prescriptionId) {
      api.get(`/prescriptions/${prescriptionId}/`).then(res => {
        setFormData(prev => ({
          ...prev,
          patient: res.data.patient,
          treatment_1: res.data.treatment_1,
          number_of_sessions: res.data.number_of_sessions
        }));
      });
    }
  }, [prescriptionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const requiredFields = ['patient', 'doctor', 'treatment_1', 'diagnosis_code', 'diagnosis_text', 'number_of_sessions'];
      const emptyFields = requiredFields.filter(field => !formData[field]);
      
      if (emptyFields.length > 0) {
        setError('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const dataToSend = {
        ...formData,
        treatment_2: formData.treatment_2 || null,
        treatment_3: formData.treatment_3 || null,
        diagnosis_group: formData.diagnosis_group || null,
        diagnosis_code: formData.diagnosis_code || null,
        diagnosis_text: formData.diagnosis_text || null,
        number_of_sessions: parseInt(formData.number_of_sessions),
        sessions_completed: parseInt(formData.sessions_completed)
      };

      const response = await api.post('prescriptions/', dataToSend);
      navigate('/prescriptions');
    } catch (error) {
      console.error("Error creating prescription:", error);
      setError(error.response?.data?.detail || 'Fehler beim Speichern der Verordnung');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Neue Verordnung</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              required
              fullWidth
              label="Patient"
              value={formData.patient}
              onChange={(e) => setFormData({ 
                ...formData, 
                patient: e.target.value
              })}
              margin="normal"
            >
              {options.patients.map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  {`${patient.first_name} ${patient.last_name}`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              required
              fullWidth
              label="ICD-10 Code"
              value={formData.diagnosis_code}
              onChange={(e) => {
                const selectedIcd = options.icd_codes.find(code => code.id === e.target.value);
                setFormData({
                  ...formData,
                  diagnosis_code: e.target.value,
                  diagnosis_text: selectedIcd?.description || '',
                  diagnosis_group: selectedIcd?.diagnosis_group?.id || ''
                });
              }}
              margin="normal"
            >
              {options.icd_codes.map((icd) => (
                <MenuItem key={icd.id} value={icd.id}>
                  {`${icd.code} - ${icd.title}`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Diagnosegruppe"
              value={options.icd_codes.find(code => code.id === formData.diagnosis_code)?.diagnosis_group?.name || ''}
              disabled
              margin="normal"
              helperText="Wird automatisch aus dem ICD-10 Code ermittelt"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Diagnosetext"
              value={formData.diagnosis_text}
              disabled
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              required
              fullWidth
              label="Arzt"
              value={formData.doctor}
              onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
              margin="normal"
            >
              {options.doctors.map((doctor) => (
                <MenuItem key={doctor.id} value={doctor.id}>
                  {`${doctor.title || ''} ${doctor.first_name} ${doctor.last_name}`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              required
              fullWidth
              label="Erste Behandlung"
              value={formData.treatment_1}
              onChange={(e) => setFormData({ ...formData, treatment_1: e.target.value })}
              margin="normal"
            >
              {options.treatments.map((treatment) => (
                <MenuItem key={treatment.id} value={treatment.id}>
                  {treatment.treatment_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Zweite Behandlung (optional)"
              value={formData.treatment_2}
              onChange={(e) => setFormData({ ...formData, treatment_2: e.target.value })}
              margin="normal"
            >
              <MenuItem value="">
                <em>Keine zweite Behandlung</em>
              </MenuItem>
              {options.treatments.map((treatment) => (
                <MenuItem key={treatment.id} value={treatment.id}>
                  {treatment.treatment_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Dritte Behandlung (optional)"
              value={formData.treatment_3}
              onChange={(e) => setFormData({ ...formData, treatment_3: e.target.value })}
              margin="normal"
            >
              <MenuItem value="">
                <em>Keine dritte Behandlung</em>
              </MenuItem>
              {options.treatments.map((treatment) => (
                <MenuItem key={treatment.id} value={treatment.id}>
                  {treatment.treatment_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              type="number"
              label="Anzahl Behandlungen"
              value={formData.number_of_sessions}
              onChange={(e) => setFormData({ ...formData, number_of_sessions: e.target.value })}
              margin="normal"
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={3}
              label="Therapieziele / weitere med. Befunde und Hinweise"
              value={formData.therapy_goals}
              onChange={(e) => setFormData({ ...formData, therapy_goals: e.target.value })}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_urgent}
                  onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
                />
              }
              label="Dringend"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.requires_home_visit}
                  onChange={(e) => setFormData({ ...formData, requires_home_visit: e.target.checked })}
                />
              }
              label="Hausbesuch erforderlich"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.therapy_report_required}
                  onChange={(e) => setFormData({ ...formData, therapy_report_required: e.target.checked })}
                />
              }
              label="Therapiebericht erforderlich"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              required
              fullWidth
              label="Behandlungsart"
              value={formData.treatment_type}
              onChange={(e) => setFormData({ ...formData, treatment_type: e.target.value })}
              margin="normal"
            >
              <MenuItem value="Physiotherapie">Physiotherapie</MenuItem>
              <MenuItem value="Podologische Therapie">Podologische Therapie</MenuItem>
              <MenuItem value="Stimm-, Sprech-, Sprach- und Schlucktherapie">
                Stimm-, Sprech-, Sprach- und Schlucktherapie
              </MenuItem>
              <MenuItem value="Ergotherapie">Ergotherapie</MenuItem>
              <MenuItem value="Ernährungstherapie">Ernährungstherapie</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              required
              fullWidth
              label="Therapiefrequenz"
              value={formData.therapy_frequency_type}
              onChange={(e) => setFormData({ ...formData, therapy_frequency_type: e.target.value })}
              margin="normal"
            >
              {FREQUENCY_CHOICES.map((choice) => (
                <MenuItem key={choice.value} value={choice.value}>
                  {choice.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" color="primary">
                Speichern
              </Button>
              <Button variant="outlined" onClick={() => navigate('/prescriptions')}>
                Abbrechen
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default PrescriptionNew;
