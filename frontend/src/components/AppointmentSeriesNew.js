import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  TextField, Button, Box, MenuItem, Checkbox, FormControlLabel, Grid, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Alert, Chip, Divider
} from '@mui/material';
import { Delete as DeleteIcon, Code, CheckCircle, Cancel as CancelIcon } from '@mui/icons-material';
import { getFrequencyLabel } from '../constants/prescriptionConstants';

// API_URL entfernt, da nicht verwendet

function AppointmentSeriesNew({ prescriptionId: propPrescriptionId }) {
  const { prescriptionId: urlPrescriptionId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryPrescriptionId = queryParams.get('prescriptionId');
  const prescriptionId = propPrescriptionId || urlPrescriptionId || queryPrescriptionId;
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [prescription, setPrescription] = useState(null);
  const [formData, setFormData] = useState({
    patient: '',
    practitioner: '',
    room: '',
    treatment: '',
    insurance: '',
    appointment_date: '',
    duration_minutes: '',
    status: 'planned',
    patient_attended: true,
    notes: '',
    session_number: 1,
    total_sessions: 1,
  });
  const [roundStartTime, setRoundStartTime] = useState(true);
  const [numberOfAppointments, setNumberOfAppointments] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [intervalDays, setIntervalDays] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    // Lade alle Stammdaten und Prescription parallel
    const fetchAll = async () => {
      try {
        const [
          patientsRes,
          practitionersRes,
          roomsRes,
          treatmentsRes,
          insurancesRes,
          prescriptionRes
        ] = await Promise.all([
          api.get('patients/'),
          api.get('practitioners/'),
          api.get('rooms/'),
          api.get('treatments/'),
          api.get('insurance-providers/'),
          prescriptionId ? api.get(`prescriptions/${prescriptionId}/`) : Promise.resolve({ data: null })
        ]);
        
        setPatients(patientsRes.data);
        setPractitioners(practitionersRes.data);
        setRooms(roomsRes.data);
        setTreatments(treatmentsRes.data);
        setInsurances(insurancesRes.data);

        if (prescriptionRes.data) {
          setPrescription(prescriptionRes.data);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        setError('Fehler beim Laden der Daten');
      }
    };

    fetchAll();
  }, [prescriptionId]);

  useEffect(() => {
    // Prescription und Patienten müssen geladen sein!
    if (
      prescription &&
      patients.length > 0 &&
      treatments.length > 0 &&
      insurances.length > 0
    ) {
      
      // Finde die Behandlung in der treatments-Liste
      const treatment = treatments.find(t => t.id === prescription.treatment_1);
      
      // Finde den Patienten in der patients-Liste
      // const patient = patients.find(p => p.id === prescription.patient);
      
      // Finde die Versicherung in der insurances-Liste
      // const insurance = insurances.find(i => i.id === prescription.patient_insurance);
      
      const newFormData = {
        ...formData,
        patient: prescription.patient?.toString() || '',
        treatment: prescription.treatment_1?.toString() || '',
        insurance: prescription.patient_insurance?.toString() || '',
        duration_minutes: treatment?.duration_minutes?.toString() || '',
        notes: prescription.therapy_goals || '',
      };
      
      setFormData(newFormData);
      
      if (prescription.number_of_sessions) {
        setNumberOfAppointments(prescription.number_of_sessions);
      }
    }
  }, [prescription, patients, treatments, insurances, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'treatment') {
      const selectedTreatment = treatments.find((treatment) => treatment.id === parseInt(value));
      if (selectedTreatment) {
        setFormData((prev) => ({ ...prev, duration_minutes: selectedTreatment.duration_minutes || '' }));
      }
    }
  };

  const getTreatmentBillingInfo = (treatmentId) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) return null;
    
    if (treatment.is_self_pay) {
      return {
        type: 'Selbstzahler',
        price: treatment.self_pay_price ? `${treatment.self_pay_price} €` : 'N/A'
      };
    } else if (treatment.is_gkv_billable) {
      return {
        type: 'GKV',
        legs_code: treatment.legs_code_display,
        prescription_type: treatment.prescription_type_indicator,
        telemedicine: treatment.is_telemedicine
      };
    } else {
      return {
        type: 'Nicht abrechenbar'
      };
    }
  };

  const handleCheckboxChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  const handleGenerateAppointments = () => {
    if (!formData.patient || !formData.practitioner || !formData.room || !formData.treatment || !formData.appointment_date || !formData.duration_minutes) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    const baseDate = new Date(formData.appointment_date);
    const appts = [];
    for (let i = 0; i < numberOfAppointments; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i * intervalDays);
      let appointmentDate = new Date(date);
      if (roundStartTime) {
        let minutes = appointmentDate.getMinutes();
        let roundedMinutes = minutes < 30 ? 0 : 30;
        appointmentDate.setMinutes(roundedMinutes, 0, 0);
      }
      appts.push({
        ...formData,
        appointment_date: appointmentDate.toISOString(),
        session_number: i + 1,
        total_sessions: numberOfAppointments,
        prescription: prescription?.id || prescriptionId || formData.prescription || '',
        notes: formData.notes || prescription?.therapy_goals || '',
        duration_minutes: formData.duration_minutes || (treatments.find(t => t.id === prescription?.treatment_1)?.duration_minutes) || 30,
        status: formData.status || 'planned',
        series_identifier: `series_${Date.now()}_${prescription?.id || 'manual'}`,
        is_recurring: true,
        // insurance wird über prescription gehandhabt
      });
    }
    setAppointments(appts);
    setError(null);
  };

  const handleEditAppointment = (index, field, value) => {
    setAppointments(prev => prev.map((appt, i) => i === index ? { ...appt, [field]: value } : appt));
  };

  const handleDeleteAppointment = (index) => {
    setAppointments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateAll = async () => {
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht autorisiert. Bitte melden Sie sich erneut an.');
        navigate('/login');
        return;
      }

      for (const appt of appointments) {
        const formattedData = {
          patient: appt.patient ? parseInt(appt.patient) : undefined,
          practitioner: appt.practitioner ? parseInt(appt.practitioner) : undefined,
          room: appt.room ? parseInt(appt.room) : undefined,
          treatment: appt.treatment ? parseInt(appt.treatment) : undefined,
          appointment_date: appt.appointment_date || new Date().toISOString(),
          duration_minutes: appt.duration_minutes ? parseInt(appt.duration_minutes) : (formData.duration_minutes ? parseInt(formData.duration_minutes) : 30),
          status: appt.status?.toLowerCase() || 'planned',
          notes: appt.notes || formData.notes || prescription?.therapy_goals || '',
          prescription: appt.prescription ? parseInt(appt.prescription) : (prescription?.id ? parseInt(prescription.id) : undefined),
          session_number: appt.session_number || 1,
          total_sessions: appt.total_sessions || numberOfAppointments,
          series_identifier: appt.series_identifier || `series_${Date.now()}_${prescription?.id || 'manual'}`,
          is_recurring: appt.is_recurring !== undefined ? appt.is_recurring : true,
          // Zusätzliche Daten aus der Verordnung - insurance wird über prescription gehandhabt
        };
        await api.post('appointments/', formattedData);
      }
      setSuccess('Alle Termine wurden erfolgreich erstellt.');
      setAppointments([]);
      setTimeout(() => navigate('/appointments'), 1500);
    } catch (error) {
      setError('Fehler beim Erstellen der Termine: ' + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
    }
  };

  return (
    <Box sx={{ mt: 3, maxWidth: '900px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Terminserie erstellen
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {/* Verordnungsdaten Anzeige */}
      {prescription && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>Verordnungsdaten (vorbelegt):</strong>
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <strong>Patient:</strong> {(() => {
                  const patient = patients.find(p => p.id === prescription.patient);
                  return patient ? `${patient.first_name} ${patient.last_name}` : 'Nicht angegeben';
                })()}
              </Typography>
              <Typography variant="body2">
                <strong>Behandlung:</strong> {treatments.find(t => t.id === prescription.treatment_1)?.treatment_name || 'Nicht angegeben'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <strong>Anzahl Einheiten:</strong> {prescription.number_of_sessions}
              </Typography>
              <Typography variant="body2">
                <strong>Frequenz:</strong> {getFrequencyLabel(prescription.therapy_frequency_type) || 'Nicht angegeben'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Abrechnungsinformationen:</strong>
              </Typography>
              {(() => {
                const billingInfo = getTreatmentBillingInfo(prescription.treatment_1);
                if (!billingInfo) return <Typography variant="body2" color="text.secondary">Keine Abrechnungsinformationen verfügbar</Typography>;
                
                return (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={billingInfo.type}
                      color={billingInfo.type === 'GKV' ? 'primary' : billingInfo.type === 'Selbstzahler' ? 'secondary' : 'default'}
                      icon={billingInfo.type === 'GKV' ? <CheckCircle /> : billingInfo.type === 'Selbstzahler' ? <Code /> : <CancelIcon />}
                      size="small"
                    />
                    {billingInfo.type === 'GKV' && billingInfo.legs_code && (
                      <Chip 
                        label={`LEGS: ${billingInfo.legs_code}`}
                        variant="outlined"
                        size="small"
                        icon={<Code />}
                      />
                    )}
                    {billingInfo.type === 'GKV' && billingInfo.prescription_type && (
                      <Chip 
                        label={`VKZ: ${billingInfo.prescription_type}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {billingInfo.type === 'Selbstzahler' && billingInfo.price && (
                      <Chip 
                        label={`Preis: ${billingInfo.price}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {billingInfo.type === 'GKV' && billingInfo.telemedicine && (
                      <Chip 
                        label="Telemedizin"
                        color="info"
                        size="small"
                      />
                    )}
                  </Box>
                );
              })()}
            </Grid>
          </Grid>
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Patient"
            name="patient"
            value={formData.patient}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={patients.length === 0 || !!prescription}
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id.toString()}>
                {patient.first_name} {patient.last_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Therapeut"
            name="practitioner"
            value={formData.practitioner}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            {practitioners.map((practitioner) => (
              <MenuItem key={practitioner.id} value={practitioner.id}>
                {practitioner.first_name} {practitioner.last_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Raum"
            name="room"
            value={formData.room}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            {rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <MenuItem key={room.id} value={room.id}>
                  {room.name || room.room_name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>Keine Räume verfügbar</MenuItem>
            )}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Behandlung"
            name="treatment"
            value={formData.treatment}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={!!prescription}
          >
            {treatments.map((treatment) => (
              <MenuItem key={treatment.id} value={treatment.id}>
                {treatment.treatment_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Datum und Uhrzeit"
            type="datetime-local"
            name="appointment_date"
            value={formData.appointment_date}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Dauer"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputProps={{ readOnly: !!prescription }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          >
            <MenuItem value="planned">Geplant</MenuItem>
            <MenuItem value="completed">Abgeschlossen</MenuItem>
            <MenuItem value="cancelled">Storniert</MenuItem>
            <MenuItem value="billed">Abgerechnet</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Versicherung"
            name="insurance"
            value={formData.insurance}
            onChange={handleChange}
            fullWidth
            margin="normal"
            disabled={!!prescription}
          >
            {insurances.map((insurance) => (
              <MenuItem key={insurance.id} value={insurance.id}>
                {insurance.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.patient_attended}
                onChange={handleCheckboxChange}
                name="patient_attended"
              />
            }
            label="Patient erschienen"
            sx={{ marginY: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={roundStartTime}
                onChange={e => setRoundStartTime(e.target.checked)}
                name="roundStartTime"
              />
            }
            label="Startzeit runden"
            sx={{ marginY: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Bemerkung"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Anzahl der Termine"
            type="number"
            value={numberOfAppointments}
            onChange={e => setNumberOfAppointments(Number(e.target.value))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Abstand in Tagen"
            type="number"
            value={intervalDays}
            onChange={e => setIntervalDays(Number(e.target.value))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1 }}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateAppointments}
        >
          Vorschau generieren
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => navigate('/appointments')}
        >
          Abbrechen
        </Button>
      </Box>
      {appointments.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Vorschau der Termine
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum & Uhrzeit</TableCell>
                  <TableCell>Behandler</TableCell>
                  <TableCell>Raum</TableCell>
                  <TableCell>Behandlung</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Bemerkung</TableCell>
                  <TableCell>Nr.</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.map((appt, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        type="datetime-local"
                        value={appt.appointment_date.slice(0, 16)}
                        onChange={e => handleEditAppointment(idx, 'appointment_date', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.practitioner}
                        onChange={e => handleEditAppointment(idx, 'practitioner', e.target.value)}
                        fullWidth
                      >
                        {practitioners.map((practitioner) => (
                          <MenuItem key={practitioner.id} value={practitioner.id}>
                            {practitioner.first_name} {practitioner.last_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.room}
                        onChange={e => handleEditAppointment(idx, 'room', e.target.value)}
                        fullWidth
                      >
                        {rooms.map((room) => (
                          <MenuItem key={room.id} value={room.id}>
                            {room.name || room.room_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.treatment}
                        onChange={e => handleEditAppointment(idx, 'treatment', e.target.value)}
                        fullWidth
                      >
                        {treatments.map((treatment) => (
                          <MenuItem key={treatment.id} value={treatment.id}>
                            {treatment.treatment_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={appt.status}
                        onChange={e => handleEditAppointment(idx, 'status', e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="planned">Geplant</MenuItem>
                        <MenuItem value="completed">Abgeschlossen</MenuItem>
                        <MenuItem value="cancelled">Storniert</MenuItem>
                        <MenuItem value="billed">Abgerechnet</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={appt.notes || ''}
                        onChange={e => handleEditAppointment(idx, 'notes', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      {appt.session_number} / {appt.total_sessions}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteAppointment(idx)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={handleCreateAll}>
              Alle Termine erstellen
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default AppointmentSeriesNew; 