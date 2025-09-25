import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { UnifiedButton, UnifiedCard } from './common/UnifiedComponents';

function BulkBillingForm() {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validierung der Eingabedaten
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Ungültige Datumseingabe\n\nBitte geben Sie gültige Datumsformate ein. Das Datum muss im Format YYYY-MM-DD eingegeben werden.');
      setLoading(false);
      return;
    }

    if (startDate >= endDate) {
      setError('Ungültiger Zeitraum\n\nDas Enddatum muss nach dem Startdatum liegen. Bitte wählen Sie einen gültigen Zeitraum.');
      setLoading(false);
      return;
    }
    
    // Prüfe ob das Datum in der Zukunft liegt
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate > today) {
      setError('Datum in der Zukunft\n\nDas Startdatum darf nicht in der Zukunft liegen. Bitte wählen Sie ein Datum in der Vergangenheit oder heute.');
      setLoading(false);
      return;
    }
    
    // Prüfe ob der Zeitraum zu groß ist (mehr als 1 Jahr)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      setError('Zeitraum zu groß\n\nDer gewählte Zeitraum ist zu groß. Bitte wählen Sie einen Zeitraum von maximal 1 Jahr.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/billing-cycles/bulk/', formData);
      
      console.log('API-Antwort erhalten:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data is array:', Array.isArray(response.data));
      
      // Zeige detaillierte Ergebnisse
      let message = 'Massenabrechnung abgeschlossen:\n\n';
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // Prüfe die API-Antwort-Struktur
      if (response.data.message && response.data.billing_cycles !== undefined) {
        // Neue API-Struktur: {message: string, billing_cycles: Array, summary: Object, details: Array}
        const apiMessage = response.data.message;
        const billingCycles = response.data.billing_cycles;
        const summary = response.data.summary;
        const details = response.data.details;
        
        let fullMessage = `✅ ${apiMessage}\n\n`;
        
        // Zeige Zusammenfassung
        if (summary) {
          fullMessage += `📊 Zusammenfassung:\n`;
          fullMessage += `- Erfolgreich: ${summary.success} Krankenkassen\n`;
          fullMessage += `- Übersprungen: ${summary.skipped} Krankenkassen\n`;
          fullMessage += `- Fehler: ${summary.error} Krankenkassen\n\n`;
        }
        
        // Zeige Details für übersprungene und fehlerhafte
        if (details && (summary?.skipped > 0 || summary?.error > 0)) {
          fullMessage += `📋 Details:\n`;
          details.forEach(result => {
            if (result.status === 'skipped') {
              fullMessage += `⏭️ ${result.insurance_provider}: ${result.message}\n`;
            } else if (result.status === 'error') {
              fullMessage += `❌ ${result.insurance_provider}: ${result.message}\n`;
            }
          });
          fullMessage += '\n';
        }
        
        // Zeige erstellte Abrechnungszyklen
        if (billingCycles && billingCycles.length > 0) {
          fullMessage += `✅ Erstellte Abrechnungszeiträume:\n`;
          billingCycles.forEach(cycle => {
            fullMessage += `• ${cycle.insurance_provider}: ${cycle.appointments_count} Termine\n`;
          });
        } else {
          fullMessage += `ℹ️ Keine neuen Abrechnungszeiträume erstellt.\n`;
        }
        
        setSuccess(fullMessage);
        
        setTimeout(() => {
          navigate('/billing-cycles');
        }, 5000);
        return;
      } else if (Array.isArray(response.data)) {
        // Alte API-Struktur: Array von Ergebnissen
        response.data.forEach(result => {
          if (result.status === 'success') {
            successCount++;
            message += `✅ ${result.insurance_provider}: Erfolgreich abgerechnet\n`;
            message += `  - ${result.appointments_count} Termine abgerechnet\n`;
            message += `  - KK-Betrag: ${result.total_insurance_amount} €\n`;
            message += `  - Zuzahlung: ${result.total_patient_copay} €\n`;
          } else if (result.status === 'skipped') {
            skippedCount++;
            if (result.message.includes('Bereits existierender Zyklus')) {
              message += `⚠️ ${result.insurance_provider}: Übersprungen\n`;
              message += `  - Grund: Bereits ein Abrechnungszyklus für diesen Zeitraum vorhanden\n`;
              message += `  - Hinweis: Doppelabrechnungen werden automatisch verhindert\n`;
            } else if (result.message.includes('Keine abrechenbaren Termine')) {
              message += `ℹ️ ${result.insurance_provider}: Übersprungen\n`;
              message += `  - Grund: Keine abrechnungsbereiten Termine im angegebenen Zeitraum\n`;
              message += `  - Hinweis: Termine müssen den Status "ready_to_bill" haben\n`;
            } else {
              message += `ℹ️ ${result.insurance_provider}: Übersprungen\n`;
              message += `  - Grund: ${result.message}\n`;
            }
          } else if (result.status === 'error') {
            errorCount++;
            message += `❌ ${result.insurance_provider}: Fehler\n`;
            message += `  - Fehler: ${result.message}\n`;
            message += `  - Hinweis: Bitte überprüfen Sie die Termine und Verordnungen\n`;
          }
          message += '\n';
        });
        
        // Zusammenfassung
        message += `📊 Zusammenfassung:\n`;
        message += `- Erfolgreich: ${successCount} Krankenkassen\n`;
        message += `- Übersprungen: ${skippedCount} Krankenkassen\n`;
        message += `- Fehler: ${errorCount} Krankenkassen\n`;
        
        if (successCount === 0 && errorCount === 0) {
          message += `\n💡 Tipp: Wenn alle Krankenkassen übersprungen wurden, existieren möglicherweise bereits Abrechnungszyklen für diesen Zeitraum.`;
        }

        setSuccess(message);
        setTimeout(() => {
          navigate('/billing-cycles');
        }, 5000);
      } else {
        console.error('Unerwartete API-Antwort:', response.data);
        setError('Unerwartete Antwort vom Server. Bitte versuchen Sie es erneut.');
        return;
      }
    } catch (error) {
      console.error('Fehler bei der Massenabrechnung:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMessage = 'Unbekannter Fehler bei der Massenabrechnung';
      let details = '';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Spezifische Fehlermeldungen für häufige Probleme
      if (errorMessage.includes('Bitte gültiges Start- und Enddatum')) {
        errorMessage = 'Ungültige Datumseingabe';
        details = 'Bitte überprüfen Sie das Start- und Enddatum. Das Datum muss im Format YYYY-MM-DD eingegeben werden.';
      } else if (errorMessage.includes('Das Enddatum muss nach dem Startdatum')) {
        errorMessage = 'Ungültiger Zeitraum';
        details = 'Das Enddatum muss nach dem Startdatum liegen.';
      } else if (errorMessage.includes('Keine abrechnungsbereiten Termine')) {
        errorMessage = 'Keine Termine für Abrechnung verfügbar';
        details = 'Im angegebenen Zeitraum wurden keine Termine mit dem Status "ready_to_bill" gefunden.';
      } else if (errorMessage.includes('Bereits existierender Zyklus')) {
        errorMessage = 'Abrechnungszyklus bereits vorhanden';
        details = 'Für diesen Zeitraum existiert bereits ein Abrechnungszyklus. Doppelabrechnungen werden automatisch verhindert.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Ungültige Anfrage';
        details = 'Die eingegebenen Daten sind nicht korrekt. Bitte überprüfen Sie Ihre Eingaben.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server-Fehler';
        details = 'Ein Problem auf dem Server ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator.';
      }
      
      const fullErrorMessage = details ? `${errorMessage}\n\n${details}` : errorMessage;
      setError(fullErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <UnifiedCard
        title="Massenabrechnung erstellen"
        subtitle="Erstellen Sie Abrechnungszyklen für alle Krankenkassen in einem bestimmten Zeitraum"
        maxWidth={600}
        sx={{ mx: 'auto' }}
      >
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Hinweise zur Massenabrechnung:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            • Nur Termine mit Status "ready_to_bill" werden abgerechnet
          </Typography>
          <Typography variant="body2">
            • Bereits existierende Abrechnungszyklen werden übersprungen
          </Typography>
          <Typography variant="body2">
            • Termine müssen gültige Verordnungen haben
          </Typography>
          <Typography variant="body2">
            • Verordnungen müssen den Status "In_Progress" oder "Extended" haben
          </Typography>
        </Alert>

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

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Startdatum"
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            label="Enddatum"
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            sx={{ mb: 3 }}
            InputLabelProps={{ shrink: true }}
            required
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <UnifiedButton
              variant="contained"
              type="submit"
              loading={loading}
              disabled={!formData.start_date || !formData.end_date}
              fullWidth
            >
              Massenabrechnung starten
            </UnifiedButton>
            <UnifiedButton
              variant="outlined"
              onClick={() => navigate('/billing-cycles')}
              disabled={loading}
            >
              Abbrechen
            </UnifiedButton>
          </Box>
        </form>
      </UnifiedCard>
    </Box>
  );
}

export default BulkBillingForm; 