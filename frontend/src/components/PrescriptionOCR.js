import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CameraAlt as CameraIcon,
  CheckCircle as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import api from '../api/axios';

const PrescriptionOCR = ({ onPrescriptionCreated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingData, setEditingData] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showDoctorDialog, setShowDoctorDialog] = useState(false);
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [doctorSuggestions, setDoctorSuggestions] = useState([]);
  const [newPatientData, setNewPatientData] = useState({});
  const [newDoctorData, setNewDoctorData] = useState({});
  
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Dateityp validieren
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Nicht unterstützter Dateityp. Bitte wählen Sie eine JPG, PNG oder PDF Datei.');
        return;
      }
      
      // Dateigröße prüfen (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Datei zu groß. Maximale Größe: 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Vorschau erstellen
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleCameraCapture = (event) => {
    const capturedFile = event.target.files[0];
    if (capturedFile) {
      // Dateityp validieren
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(capturedFile.type)) {
        setError('Nicht unterstützter Dateityp für Kamera. Bitte wählen Sie eine JPG oder PNG Datei.');
        return;
      }
      
      // Dateigröße prüfen (max 10MB)
      if (capturedFile.size > 10 * 1024 * 1024) {
        setError('Datei zu groß. Maximale Größe: 10MB');
        return;
      }
      
      setFile(capturedFile);
      setError(null);
      
      // Vorschau erstellen
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(capturedFile);
    }
  };

  const processOCR = async () => {
    if (!file) {
      setError('Bitte wählen Sie eine Datei aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/prescriptions/ocr/process/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setOcrData(response.data.extracted_data);
      setValidation(response.data.validation);
      setEditingData(response.data.extracted_data);
      
    } catch (error) {
      console.error('OCR Fehler:', error);
      
      // Detaillierte Fehlermeldung anzeigen
      let errorMessage = 'Fehler bei der OCR-Verarbeitung';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Zusätzliche Informationen für OCR-Fehler
      if (errorMessage.includes('no such group') || errorMessage.includes('permission')) {
        errorMessage += ' - Bitte stellen Sie sicher, dass die Datei lesbar ist und versuchen Sie es erneut.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditData = () => {
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    setOcrData(editingData);
    setShowEditDialog(false);
  };

  const handleCancelEdit = () => {
    setEditingData(ocrData);
    setShowEditDialog(false);
  };

  const createPrescription = async () => {
    if (!ocrData) {
      setError('Keine OCR-Daten verfügbar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/prescriptions/ocr/create/', {
        ocr_data: ocrData,
        uploaded_file: file.name
      });

      setSuccess('Verordnung erfolgreich erstellt!');
      
      // Callback für Parent-Komponente
      if (onPrescriptionCreated) {
        onPrescriptionCreated(response.data.prescription_id);
      }
      
      // Reset
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Verordnung:', error);
      
      // Patienten- oder Arzt-Matching erforderlich
      if (error.response?.data?.action === 'select_patient_or_create_new') {
        setPatientSuggestions(error.response.data.suggestions);
        setNewPatientData(error.response.data.new_patient_data);
        setShowPatientDialog(true);
        return;
      }
      
      if (error.response?.data?.action === 'select_doctor_or_create_new') {
        setDoctorSuggestions(error.response.data.suggestions);
        setNewDoctorData(error.response.data.new_doctor_data);
        setShowDoctorDialog(true);
        return;
      }
      
      setError(error.response?.data?.error || 'Fehler beim Erstellen der Verordnung');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelection = async (patientId = null) => {
    try {
      let finalOcrData = { ...ocrData };
      
      if (patientId) {
        // Bestehenden Patienten ausgewählt
        finalOcrData.selected_patient_id = patientId;
      } else {
        // Neuen Patienten erstellen
        finalOcrData.new_patient_data = newPatientData;
      }
      
      const response = await api.post('/prescriptions/ocr/create/', {
        ocr_data: finalOcrData,
        uploaded_file: file.name
      });

      setSuccess('Verordnung erfolgreich erstellt!');
      setShowPatientDialog(false);
      
      if (onPrescriptionCreated) {
        onPrescriptionCreated(response.data.prescription_id);
      }
      
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Fehler bei Patientenauswahl:', error);
      setError(error.response?.data?.error || 'Fehler bei der Patientenauswahl');
    }
  };

  const handleDoctorSelection = async (doctorId = null) => {
    try {
      let finalOcrData = { ...ocrData };
      
      if (doctorId) {
        // Bestehenden Arzt ausgewählt
        finalOcrData.selected_doctor_id = doctorId;
      } else {
        // Neuen Arzt erstellen
        finalOcrData.new_doctor_data = newDoctorData;
      }
      
      const response = await api.post('/prescriptions/ocr/create/', {
        ocr_data: finalOcrData,
        uploaded_file: file.name
      });

      setSuccess('Verordnung erfolgreich erstellt!');
      setShowDoctorDialog(false);
      
      if (onPrescriptionCreated) {
        onPrescriptionCreated(response.data.prescription_id);
      }
      
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Fehler bei Arztauswahl:', error);
      setError(error.response?.data?.error || 'Fehler bei der Arztauswahl');
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setOcrData(null);
    setValidation(null);
    setError(null);
    setSuccess(null);
    setShowEditDialog(false);
    setEditingData({});
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.8) return 'Hoch';
    if (score >= 0.6) return 'Mittel';
    return 'Niedrig';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rezept per OCR hinzufügen
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Laden Sie ein Rezept-Bild oder PDF hoch, um die Daten automatisch zu extrahieren
      </Typography>

      {/* Erfolgs-/Fehlermeldungen */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Datei-Upload */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Datei auswählen
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Datei hochladen
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Grid>
          
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<CameraIcon />}
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading}
            >
              Kamera
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              style={{ display: 'none' }}
            />
          </Grid>
          
          {file && (
            <Grid item>
              <Chip
                label={file.name}
                onDelete={resetForm}
                color="primary"
                variant="outlined"
              />
            </Grid>
          )}
        </Grid>

        {/* Vorschau */}
        {preview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Vorschau:
            </Typography>
            <img
              src={preview}
              alt="Vorschau"
              style={{
                maxWidth: '300px',
                maxHeight: '200px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </Box>
        )}

        {/* OCR verarbeiten Button */}
        {file && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={processOCR}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {loading ? 'Verarbeite...' : 'OCR verarbeiten'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* OCR Ergebnisse */}
      {ocrData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Erkannte Daten
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`Konfidenz: ${getConfidenceLabel(ocrData.confidence_score)}`}
                color={getConfidenceColor(ocrData.confidence_score)}
                size="small"
              />
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={handleEditData}
              >
                Bearbeiten
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {Object.entries(ocrData).map(([key, value]) => {
              if (key === 'confidence_score' || key === 'raw_text') return null;
              
              return (
                <Grid item xs={12} sm={6} key={key}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Typography variant="body1">
                        {value || '-'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Validierung */}
          {validation && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Validierung
              </Typography>
              
              {validation.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Fehler:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {validation.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Warnungen:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Box>
          )}

          {/* Verordnung erstellen */}
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={createPrescription}
              disabled={loading || validation?.errors?.length > 0}
              startIcon={<SaveIcon />}
            >
              Verordnung erstellen
            </Button>
          </Box>
        </Paper>
      )}

      {/* Bearbeitungs-Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Daten bearbeiten
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {Object.entries(editingData).map(([key, value]) => {
              if (key === 'confidence_score' || key === 'raw_text') return null;
              
              return (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    fullWidth
                    label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    value={value || ''}
                    onChange={(e) => setEditingData({
                      ...editingData,
                      [key]: e.target.value
                    })}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} startIcon={<CancelIcon />}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" startIcon={<SaveIcon />}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Patienten-Auswahl Dialog */}
      <Dialog
        open={showPatientDialog}
        onClose={() => setShowPatientDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Patient auswählen oder neu anlegen
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Der Patient "{newPatientData.first_name} {newPatientData.last_name}" wurde nicht gefunden. 
            Wählen Sie einen bestehenden Patienten aus oder erstellen Sie einen neuen.
          </Typography>
          
          {patientSuggestions.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ähnliche Patienten gefunden:
              </Typography>
              <Grid container spacing={2}>
                {patientSuggestions.map((patient) => (
                  <Grid item xs={12} key={patient.id}>
                    <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handlePatientSelection(patient.id)}>
                      <CardContent>
                        <Typography variant="subtitle1">
                          {patient.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Geboren: {patient.birth_date || 'Unbekannt'}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          Ähnlichkeit: {Math.round(patient.match_score * 100)}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Neuen Patienten erstellen:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Vorname"
                  value={newPatientData.first_name || ''}
                  onChange={(e) => setNewPatientData({...newPatientData, first_name: e.target.value})}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Nachname"
                  value={newPatientData.last_name || ''}
                  onChange={(e) => setNewPatientData({...newPatientData, last_name: e.target.value})}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Geburtsdatum (DD.MM.YYYY)"
                  value={newPatientData.birth_date || ''}
                  onChange={(e) => setNewPatientData({...newPatientData, birth_date: e.target.value})}
                  variant="outlined"
                  size="small"
                  placeholder="01.01.1990"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPatientDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={() => handlePatientSelection()} variant="contained">
            Neuen Patienten erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Arzt-Auswahl Dialog */}
      <Dialog
        open={showDoctorDialog}
        onClose={() => setShowDoctorDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Arzt auswählen oder neu anlegen
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Der Arzt "{newDoctorData.first_name} {newDoctorData.last_name}" wurde nicht gefunden. 
            Wählen Sie einen bestehenden Arzt aus oder erstellen Sie einen neuen.
          </Typography>
          
          {doctorSuggestions.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ähnliche Ärzte gefunden:
              </Typography>
              <Grid container spacing={2}>
                {doctorSuggestions.map((doctor) => (
                  <Grid item xs={12} key={doctor.id}>
                    <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleDoctorSelection(doctor.id)}>
                      <CardContent>
                        <Typography variant="subtitle1">
                          {doctor.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          LANR: {doctor.license_number || 'Unbekannt'}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          Ähnlichkeit: {Math.round(doctor.match_score * 100)}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Neuen Arzt erstellen:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Vorname"
                  value={newDoctorData.first_name || ''}
                  onChange={(e) => setNewDoctorData({...newDoctorData, first_name: e.target.value})}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Nachname"
                  value={newDoctorData.last_name || ''}
                  onChange={(e) => setNewDoctorData({...newDoctorData, last_name: e.target.value})}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="BSNR"
                  value={newDoctorData.bsnr || ''}
                  onChange={(e) => setNewDoctorData({...newDoctorData, bsnr: e.target.value})}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="LANR"
                  value={newDoctorData.lanr || ''}
                  onChange={(e) => setNewDoctorData({...newDoctorData, lanr: e.target.value})}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDoctorDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={() => handleDoctorSelection()} variant="contained">
            Neuen Arzt erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrescriptionOCR;
