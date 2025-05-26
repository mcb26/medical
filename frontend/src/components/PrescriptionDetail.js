import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
  Button,
  Alert,
  Grid,
  Paper,
  FormControl,
  FormControlLabel,
  Checkbox,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Chip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import api from '../api/axios';
import { FREQUENCY_CHOICES, getFrequencyLabel, STATUS_CONFIG } from '../constants/prescriptionConstants';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import deLocale from '@fullcalendar/core/locales/de';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import AppointmentSeriesPreview from './AppointmentSeriesPreview';

function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showSeriesPreview, setShowSeriesPreview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prescriptionResponse, practitionersResponse, roomsResponse, appointmentsResponse] = await Promise.all([
          api.get(`/prescriptions/${id}/`),
          api.get('/practitioners/'),
          api.get('/rooms/'),
          api.get(`/appointments/?prescription=${id}`)
        ]);

        console.log('Prescription Data:', prescriptionResponse.data);
        console.log('Treatment Name:', prescriptionResponse.data.treatment_name);
        console.log('Treatment Object:', prescriptionResponse.data.treatment);

        setPrescription(prescriptionResponse.data);
        setPractitioners(practitionersResponse.data);
        setRooms(roomsResponse.data);
        setAppointments(appointmentsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf_document', file);

    try {
      await api.patch(`/prescriptions/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Aktualisiere die Prescription-Daten nach dem Upload
      const response = await api.get(`/prescriptions/${id}/`);
      setPrescription(response.data);
    } catch (error) {
      console.error('Fehler beim PDF-Upload:', error);
      setError('Fehler beim Hochladen des PDFs');
    }
  };

  const handleEdit = () => {
    navigate(`/prescriptions/${id}/edit`);
  };

  const handleCreateSeries = () => {
    setShowSeriesPreview(true);
  };

  const handleSeriesConfirm = async (config) => {
    try {
      await api.post(`/appointments/series/${prescription.id}/`, config);
      setShowSeriesPreview(false);
      // Aktualisiere die Verordnungsdaten
      const response = await api.get(`/prescriptions/${id}/`);
      setPrescription(response.data);
    } catch (error) {
      console.error('Fehler beim Erstellen der Terminserie:', error);
      setError('Fehler beim Erstellen der Terminserie');
    }
  };

  const handleSeriesCancel = () => {
    setShowSeriesPreview(false);
  };

  const renderCheckboxField = (checked, label) => (
    <Box sx={{ 
      border: '1px solid #ccc', 
      p: 1, 
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      bgcolor: checked ? '#e3f2fd' : 'transparent'
    }}>
      <Checkbox checked={checked} readOnly />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );

  // Funktion für die Statusfarbe
  const getStatusColor = (status) => {
    switch (status) {
      case 'Geplant': return 'info';
      case 'Abgeschlossen': return 'success';
      case 'Abgesagt': return 'error';
      default: return 'default';
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
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!prescription) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Verordnung nicht gefunden</Alert>
      </Box>
    );
  }

  if (showSeriesPreview) {
    return (
      <AppointmentSeriesPreview
        prescription={prescription}
        onConfirm={handleSeriesConfirm}
        onCancel={handleSeriesCancel}
      />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/prescriptions')}
        >
          Zurück zur Liste
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Bearbeiten
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<EventIcon />}
            onClick={handleCreateSeries}
          >
            Terminserie erstellen
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Verordnungsdetails
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Patient
            </Typography>
            <Typography variant="body1">
              {prescription.patient_name}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Verordnungsdatum
            </Typography>
            <Typography variant="body1">
              {format(new Date(prescription.prescription_date), 'dd.MM.yyyy', { locale: de })}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Arzt
            </Typography>
            <Typography variant="body1">
              {prescription.doctor_name}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={STATUS_CONFIG[prescription.status]?.label || prescription.status}
              color={STATUS_CONFIG[prescription.status]?.color || 'default'}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Behandlungen
            </Typography>
            <Box sx={{ mt: 1 }}>
              {prescription.treatment_1_name && (
                <Chip label={prescription.treatment_1_name} sx={{ mr: 1, mb: 1 }} />
              )}
              {prescription.treatment_2_name && (
                <Chip label={prescription.treatment_2_name} sx={{ mr: 1, mb: 1 }} />
              )}
              {prescription.treatment_3_name && (
                <Chip label={prescription.treatment_3_name} sx={{ mr: 1, mb: 1 }} />
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Diagnose
            </Typography>
            <Typography variant="body1">
              {prescription.diagnosis_code_display}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Diagnosetext
            </Typography>
            <Typography variant="body1">
              {prescription.diagnosis_text}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Anzahl Behandlungen
            </Typography>
            <Typography variant="body1">
              {prescription.number_of_sessions}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Durchgeführte Behandlungen
            </Typography>
            <Typography variant="body1">
              {prescription.sessions_completed}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Frequenz
            </Typography>
            <Typography variant="body1">
              {prescription.therapy_frequency_type}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Therapieziele
            </Typography>
            <Typography variant="body1">
              {prescription.therapy_goals}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              {prescription.is_urgent && (
                <Chip label="Dringend" color="error" sx={{ mr: 1, mb: 1 }} />
              )}
              {prescription.requires_home_visit && (
                <Chip label="Hausbesuch erforderlich" color="warning" sx={{ mr: 1, mb: 1 }} />
              )}
              {prescription.therapy_report_required && (
                <Chip label="Therapiebericht erforderlich" color="info" sx={{ mr: 1, mb: 1 }} />
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default PrescriptionDetail;
