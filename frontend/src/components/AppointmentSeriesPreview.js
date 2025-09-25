import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Alert,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { format, addDays, parseISO, isWithinInterval, parseISO as parseDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Delete as DeleteIcon, Edit as EditIcon, Warning as WarningIcon, Block as BlockIcon } from '@mui/icons-material';
import api from '../api/axios';

function AppointmentSeriesPreview({ prescription, onConfirm, onCancel }) {
  const [practitioners, setPractitioners] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [frequency, setFrequency] = useState('weekly');
  const [previewAppointments, setPreviewAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Behandlungsauswahl
  const [selectedTreatment, setSelectedTreatment] = useState('');
  const [treatmentOptions, setTreatmentOptions] = useState([]);
  const [treatment, setTreatment] = useState(null);
  
  // Abwesenheiten
  const [absences, setAbsences] = useState([]);
  
  // Dialog für Abwesenheits-Bearbeitung
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [editingAbsence, setEditingAbsence] = useState(null);

  // Lade Behandler, Räume und Abwesenheiten
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [practitionersRes, roomsRes, absencesRes] = await Promise.all([
          api.get('/practitioners/'),
          api.get('/rooms/'),
          api.get('/absences/')
        ]);
        setPractitioners(practitionersRes.data);
        setRooms(roomsRes.data);
        setAbsences(absencesRes.data);
      } catch (error) {
        setError('Fehler beim Laden der Daten');
      }
    };
    fetchData();
  }, []);

  // Lade Behandlungsoptionen aus der Verordnung und setze Standardwerte
  useEffect(() => {
    if (prescription) {
      const options = [];
      if (prescription.treatment_1) options.push(prescription.treatment_1);
      if (prescription.treatment_2) options.push(prescription.treatment_2);
      if (prescription.treatment_3) options.push(prescription.treatment_3);
      setTreatmentOptions(options);
      
      // Setze die erste Behandlung als Standard
      if (options.length > 0) {
        setSelectedTreatment(options[0]);
      }
      
      // Setze Standardwerte basierend auf der Verordnung
      if (prescription.therapy_frequency_type) {
        // Konvertiere Verordnungsfrequenz zu Serie-Frequenz
        if (prescription.therapy_frequency_type.includes('weekly')) {
          setFrequency('weekly');
        } else if (prescription.therapy_frequency_type.includes('monthly')) {
          setFrequency('monthly');
        } else {
          setFrequency('weekly'); // Standard
        }
      }
      
      // Setze Startdatum auf heute, falls nicht gesetzt
      if (!startDate) {
        const today = new Date();
        setStartDate(today.toISOString().split('T')[0]);
      }
    }
  }, [prescription, startDate]);

  // Lade Details zur gewählten Behandlung
  useEffect(() => {
    const fetchTreatment = async () => {
      if (selectedTreatment) {
        try {
          const res = await api.get(`/treatments/${selectedTreatment}/`);
          setTreatment(res.data);
        } catch (err) {
          setError('Fehler beim Laden der Behandlungsdetails');
        }
      } else {
        setTreatment(null);
      }
    };
    fetchTreatment();
  }, [selectedTreatment]);

  // Hilfsfunktion für Abwesenheits-Typ-Anzeige
  const getAbsenceTypeDisplay = (absenceType) => {
    const typeMap = {
      'vacation': 'Urlaub',
      'sick': 'Krankheit',
      'parental_leave': 'Elternzeit',
      'special_leave': 'Sonderurlaub',
      'training': 'Fortbildung',
      'other': 'Sonstiges'
    };
    return typeMap[absenceType] || absenceType;
  };

  // Hilfsfunktion für Datums-Formatierung
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy', { locale: de });
  };

  // Funktion zur Überprüfung von Abwesenheiten
  const checkAbsenceConflict = (appointmentDate, practitionerId) => {
    const appointmentDateTime = new Date(appointmentDate);
    const appointmentDateOnly = appointmentDateTime.toISOString().split('T')[0];
    const appointmentTime = appointmentDateTime.toTimeString().slice(0, 5);
    
    return absences.find(absence => {
      if (absence.practitioner !== practitionerId) return false;
      
      const absenceStart = new Date(absence.start_date);
      const absenceEnd = new Date(absence.end_date);
      const appointmentDateObj = new Date(appointmentDateOnly);
      
      // Prüfe ob das Termindatum innerhalb der Abwesenheit liegt
      if (appointmentDateObj >= absenceStart && appointmentDateObj <= absenceEnd) {
        if (absence.is_full_day) {
          return true; // Ganztägige Abwesenheit
        } else {
          // Stundenweise Abwesenheit prüfen
          const absenceStartTime = absence.start_time;
          const absenceEndTime = absence.end_time;
          return appointmentTime >= absenceStartTime && appointmentTime < absenceEndTime;
        }
      }
      return false;
    });
  };

  const generatePreview = () => {
    if (!selectedPractitioner || !selectedRoom || !startDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    if (!selectedTreatment || !treatment) {
      setError('Bitte wählen Sie eine Behandlung aus');
      return;
    }
    if (!prescription.number_of_sessions || prescription.number_of_sessions < 1) {
      setError('Die Anzahl der Sitzungen muss mindestens 1 betragen');
      return;
    }
    const durationMinutes = treatment.duration_minutes || 30;
    if (!durationMinutes || durationMinutes < 1) {
      setError('Die Behandlungsdauer ist nicht gültig');
      return;
    }

    const appointments = [];
    const startDateTime = parseISO(`${startDate}T${startTime}`);
    const intervalDays = frequency === 'weekly' ? 7 : 1;

    for (let i = 0; i < prescription.number_of_sessions; i++) {
      const appointmentDate = addDays(startDateTime, i * intervalDays);
      const absenceConflict = checkAbsenceConflict(appointmentDate.toISOString(), parseInt(selectedPractitioner));
      
      appointments.push({
        appointment_date: appointmentDate.toISOString(),
        practitioner: parseInt(selectedPractitioner),
        room: parseInt(selectedRoom),
        duration_minutes: durationMinutes,
        treatment: treatment.id,
        prescription: parseInt(prescription.id),
        patient: parseInt(prescription.patient),
        hasAbsenceConflict: !!absenceConflict,
        absenceConflict: absenceConflict
      });
    }
    setPreviewAppointments(appointments);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!selectedTreatment || !treatment) {
      setError('Bitte wählen Sie eine Behandlung aus');
      return;
    }
    if (!selectedPractitioner || !selectedRoom || !startDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    if (!prescription.number_of_sessions || prescription.number_of_sessions < 1) {
      setError('Die Anzahl der Sitzungen muss mindestens 1 betragen');
      return;
    }

    // Filtere Termine mit ungelösten Abwesenheits-Konflikten
    const appointmentsWithUnresolvedConflicts = previewAppointments.filter(
      apt => apt.hasAbsenceConflict && !apt.ignoreAbsenceConflict
    );

    if (appointmentsWithUnresolvedConflicts.length > 0) {
      setError(`Es gibt noch ${appointmentsWithUnresolvedConflicts.length} Termine mit Abwesenheits-Konflikten. Bitte lösen Sie diese zuerst auf.`);
      return;
    }

    // Erstelle nur die Termine ohne Konflikte oder mit ignorierten Konflikten
    const validAppointments = previewAppointments.filter(
      apt => !apt.hasAbsenceConflict || apt.ignoreAbsenceConflict
    );

    try {
      // Erstelle die Termine einzeln
      const createdAppointments = [];
      for (const appointment of validAppointments) {
        const appointmentData = {
          patient: appointment.patient,
          practitioner: appointment.practitioner,
          appointment_date: appointment.appointment_date,
          treatment: appointment.treatment,
          prescription: appointment.prescription,
          duration_minutes: appointment.duration_minutes,
          room: appointment.room,
          notes: appointment.ignoreAbsenceConflict ? 'Abwesenheits-Konflikt ignoriert' : ''
        };

        const response = await api.post('/appointments/', appointmentData);
        createdAppointments.push(response.data);
      }

      setSuccess(`${createdAppointments.length} Termine wurden erfolgreich erstellt`);
      onConfirm(createdAppointments);
    } catch (error) {
      setError(`Fehler beim Erstellen der Termine: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteAppointment = (index) => {
    setPreviewAppointments(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditAppointment = (index, field, value) => {
    setPreviewAppointments(prev => prev.map((appointment, i) => {
      if (i === index) {
        const updatedAppointment = { ...appointment, [field]: value };
        
        // Wenn sich Datum oder Behandler geändert hat, Abwesenheits-Konflikt neu prüfen
        if (field === 'appointment_date' || field === 'practitioner') {
          const absenceConflict = checkAbsenceConflict(
            updatedAppointment.appointment_date, 
            updatedAppointment.practitioner
          );
          updatedAppointment.hasAbsenceConflict = !!absenceConflict;
          updatedAppointment.absenceConflict = absenceConflict;
        }
        
        return updatedAppointment;
      }
      return appointment;
    }));
  };

  const handleIgnoreAbsenceConflict = (index) => {
    setPreviewAppointments(prev => prev.map((appointment, i) => {
      if (i === index) {
        return { ...appointment, ignoreAbsenceConflict: true };
      }
      return appointment;
    }));
  };

  // Abwesenheits-Dialog Funktionen
  const handleAbsenceClick = (absence) => {
    setSelectedAbsence(absence);
    setEditingAbsence({
      ...absence,
      start_date: absence.start_date,
      end_date: absence.end_date,
      start_time: absence.start_time || '08:00',
      end_time: absence.end_time || '17:00'
    });
    setAbsenceDialogOpen(true);
  };

  const handleAbsenceEdit = async () => {
    try {
      await api.put(`/absences/${editingAbsence.id}/`, editingAbsence);
      
      // Aktualisiere die lokalen Abwesenheiten
      setAbsences(prev => prev.map(abs => 
        abs.id === editingAbsence.id ? editingAbsence : abs
      ));
      
      // Aktualisiere die Vorschau-Termine
      setPreviewAppointments(prev => prev.map(appointment => {
        if (appointment.absenceConflict?.id === editingAbsence.id) {
          const newConflict = { ...editingAbsence };
          const hasConflict = checkAbsenceConflict(appointment.appointment_date, appointment.practitioner);
          return {
            ...appointment,
            hasAbsenceConflict: !!hasConflict,
            absenceConflict: hasConflict
          };
        }
        return appointment;
      }));
      
      setAbsenceDialogOpen(false);
      setSelectedAbsence(null);
      setEditingAbsence(null);
    } catch (error) {
      console.error('Fehler beim Bearbeiten der Abwesenheit:', error);
      setError('Fehler beim Bearbeiten der Abwesenheit');
    }
  };

  const handleAbsenceDelete = async () => {
    if (!window.confirm('Diese Abwesenheit wirklich löschen?')) {
      return;
    }

    try {
      await api.delete(`/absences/${editingAbsence.id}/`);
      
      // Entferne die Abwesenheit aus der lokalen Liste
      setAbsences(prev => prev.filter(abs => abs.id !== editingAbsence.id));
      
      // Aktualisiere die Vorschau-Termine
      setPreviewAppointments(prev => prev.map(appointment => {
        if (appointment.absenceConflict?.id === editingAbsence.id) {
          const hasConflict = checkAbsenceConflict(appointment.appointment_date, appointment.practitioner);
          return {
            ...appointment,
            hasAbsenceConflict: !!hasConflict,
            absenceConflict: hasConflict
          };
        }
        return appointment;
      }));
      
      setAbsenceDialogOpen(false);
      setSelectedAbsence(null);
      setEditingAbsence(null);
    } catch (error) {
      console.error('Fehler beim Löschen der Abwesenheit:', error);
      setError('Fehler beim Löschen der Abwesenheit');
    }
  };

  const handleAbsenceDialogClose = () => {
    setAbsenceDialogOpen(false);
    setSelectedAbsence(null);
    setEditingAbsence(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Terminserie erstellen
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Verordnungsdaten Anzeige */}
      {prescription && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>Verordnungsdaten (vorbelegt):</strong>
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <strong>Patient:</strong> {prescription.patient_name}
              </Typography>
              <Typography variant="body2">
                <strong>Behandlung:</strong> {prescription.treatment_1_name || 'Nicht angegeben'}
              </Typography>
              <Typography variant="body2">
                <strong>Versicherung:</strong> {prescription.patient_insurance_name || 'Nicht angegeben'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <strong>Anzahl Einheiten:</strong> {prescription.number_of_sessions}
              </Typography>
              <Typography variant="body2">
                <strong>Frequenz:</strong> {prescription.therapy_frequency_type || 'Nicht angegeben'}
              </Typography>
              <Typography variant="body2">
                <strong>Behandlungsdauer:</strong> {treatment ? `${treatment.duration_minutes} Minuten` : 'Wird geladen...'}
              </Typography>
            </Grid>
          </Grid>
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Behandler</InputLabel>
            <Select
              value={selectedPractitioner}
              onChange={(e) => setSelectedPractitioner(e.target.value)}
            >
              {practitioners.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Raum</InputLabel>
            <Select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Startdatum"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="time"
            label="Uhrzeit"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Frequenz</InputLabel>
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <MenuItem value="daily">Täglich</MenuItem>
              <MenuItem value="weekly">Wöchentlich</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Behandlung</InputLabel>
            <Select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
            >
              {treatmentOptions.map((id) => (
                <MenuItem key={id} value={id}>
                  {/* Behandlungstitel dynamisch laden */}
                  {id && (
                    <TreatmentName treatmentId={id} />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={generatePreview}
        sx={{ mb: 3 }}
      >
        Vorschau generieren
      </Button>

      {previewAppointments.length > 0 && (
        <Alert 
          severity={previewAppointments.some(apt => apt.hasAbsenceConflict) ? "warning" : "info"}
          sx={{ mb: 2 }}
        >
          {previewAppointments.some(apt => apt.hasAbsenceConflict) ? (
            <>
              <strong>Abwesenheits-Konflikte gefunden:</strong> 
              {previewAppointments.filter(apt => apt.hasAbsenceConflict).length} von {previewAppointments.length} Terminen haben Konflikte mit Abwesenheiten.
              Sie können diese ignorieren oder die Termine verschieben.
            </>
          ) : (
            "Alle Termine sind verfügbar und können erstellt werden."
          )}
        </Alert>
      )}

      {previewAppointments.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Uhrzeit</TableCell>
                  <TableCell>Behandler</TableCell>
                  <TableCell>Raum</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewAppointments.map((appointment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        type="date"
                        value={format(new Date(appointment.appointment_date), 'yyyy-MM-dd')}
                        onChange={(e) => handleEditAppointment(index, 'appointment_date',
                          new Date(`${e.target.value}T${format(new Date(appointment.appointment_date), 'HH:mm')}`).toISOString()
                        )}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="time"
                        value={format(new Date(appointment.appointment_date), 'HH:mm')}
                        onChange={(e) => handleEditAppointment(index, 'appointment_date',
                          new Date(`${format(new Date(appointment.appointment_date), 'yyyy-MM-dd')}T${e.target.value}`).toISOString()
                        )}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <Select
                          value={appointment.practitioner}
                          onChange={(e) => handleEditAppointment(index, 'practitioner', e.target.value)}
                        >
                          {practitioners.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <Select
                          value={appointment.room}
                          onChange={(e) => handleEditAppointment(index, 'room', e.target.value)}
                        >
                          {rooms.map((r) => (
                            <MenuItem key={r.id} value={r.id}>
                              {r.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {appointment.hasAbsenceConflict ? (
                        appointment.ignoreAbsenceConflict ? (
                          <Tooltip title="Abwesenheits-Konflikt wird ignoriert">
                            <Chip
                              icon={<BlockIcon />}
                              label="Ignoriert"
                              color="warning"
                              size="small"
                              clickable
                              onClick={() => {
                                // Hier könnte ein Dialog mit Details geöffnet werden
                                console.log('Ignorierte Abwesenheit:', appointment.absenceConflict);
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip 
                            title={
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                  {getAbsenceTypeDisplay(appointment.absenceConflict?.absence_type)}
                                  {appointment.absenceConflict?.notes && ` - ${appointment.absenceConflict.notes}`}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Zeitraum:</strong> {formatDate(appointment.absenceConflict?.start_date)} - {formatDate(appointment.absenceConflict?.end_date)}
                                </Typography>
                                {!appointment.absenceConflict?.is_full_day && (
                                  <Typography variant="body2">
                                    <strong>Zeit:</strong> {appointment.absenceConflict?.start_time} - {appointment.absenceConflict?.end_time}
                                  </Typography>
                                )}
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
                                  Klicken zum Bearbeiten
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Chip
                              icon={<WarningIcon />}
                              label="Abwesenheit"
                              color="error"
                              size="small"
                              clickable
                              onClick={() => handleAbsenceClick(appointment.absenceConflict)}
                            />
                          </Tooltip>
                        )
                      ) : (
                        <Chip
                          icon={<EditIcon />}
                          label="Verfügbar"
                          color="success"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {appointment.hasAbsenceConflict && !appointment.ignoreAbsenceConflict && (
                          <Tooltip title="Abwesenheits-Konflikt ignorieren">
                            <IconButton 
                              onClick={() => handleIgnoreAbsenceConflict(index)}
                              size="small"
                              color="warning"
                            >
                              <BlockIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton onClick={() => handleDeleteAppointment(index)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button variant="contained" onClick={handleConfirm}>
              Termine erstellen
            </Button>
          </Box>
        </>
      )}

      {/* Dialog für Abwesenheits-Bearbeitung */}
      <Dialog 
        open={absenceDialogOpen} 
        onClose={handleAbsenceDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Abwesenheit bearbeiten
        </DialogTitle>
        <DialogContent>
          {editingAbsence && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Typ</InputLabel>
                  <Select
                    value={editingAbsence.absence_type}
                    onChange={(e) => setEditingAbsence(prev => ({
                      ...prev,
                      absence_type: e.target.value
                    }))}
                    label="Typ"
                  >
                    <MenuItem value="vacation">Urlaub</MenuItem>
                    <MenuItem value="sick">Krankheit</MenuItem>
                    <MenuItem value="parental_leave">Elternzeit</MenuItem>
                    <MenuItem value="special_leave">Sonderurlaub</MenuItem>
                    <MenuItem value="training">Fortbildung</MenuItem>
                    <MenuItem value="other">Sonstiges</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingAbsence.is_full_day}
                      onChange={(e) => setEditingAbsence(prev => ({
                        ...prev,
                        is_full_day: e.target.checked
                      }))}
                    />
                  }
                  label="Ganztägig"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Startdatum"
                  type="date"
                  value={editingAbsence.start_date}
                  onChange={(e) => setEditingAbsence(prev => ({
                    ...prev,
                    start_date: e.target.value
                  }))}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Enddatum"
                  type="date"
                  value={editingAbsence.end_date}
                  onChange={(e) => setEditingAbsence(prev => ({
                    ...prev,
                    end_date: e.target.value
                  }))}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {!editingAbsence.is_full_day && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Startzeit"
                      type="time"
                      value={editingAbsence.start_time}
                      onChange={(e) => setEditingAbsence(prev => ({
                        ...prev,
                        start_time: e.target.value
                      }))}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Endzeit"
                      type="time"
                      value={editingAbsence.end_time}
                      onChange={(e) => setEditingAbsence(prev => ({
                        ...prev,
                        end_time: e.target.value
                      }))}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notizen"
                  multiline
                  rows={4}
                  value={editingAbsence.notes || ''}
                  onChange={(e) => setEditingAbsence(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  placeholder="Optionale Notizen zur Abwesenheit..."
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleAbsenceDelete} 
            color="error"
            variant="outlined"
          >
            Löschen
          </Button>
          <Button onClick={handleAbsenceDialogClose}>
            Abbrechen
          </Button>
          <Button onClick={handleAbsenceEdit} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Hilfskomponente für Behandlungstitel
function TreatmentName({ treatmentId }) {
  const [name, setName] = useState('');
  useEffect(() => {
    let mounted = true;
    api.get(`/treatments/${treatmentId}/`).then(res => {
      if (mounted) setName(res.data.treatment_name);
    });
    return () => { mounted = false; };
  }, [treatmentId]);
  return name || treatmentId;
}

export default AppointmentSeriesPreview; 