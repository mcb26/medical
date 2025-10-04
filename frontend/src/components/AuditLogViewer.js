import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import {
  History as HistoryIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

const AuditLogViewer = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    model_name: '',
    action: '',
    user: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/audit-logs/?${params.toString()}`);
      setAuditLogs(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Änderungshistorie: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    loadAuditLogs();
  };

  const getActionColor = (action) => {
    const colors = {
      'create': 'success',
      'update': 'info',
      'delete': 'error',
      'view': 'default'
    };
    return colors[action] || 'default';
  };

  const getActionIcon = (action) => {
    const icons = {
      'create': '✓',
      'update': '✎',
      'delete': '✗',
      'view': '👁'
    };
    return icons[action] || '?';
  };

  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: de });
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon /> Änderungshistorie
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Hier sehen Sie alle Änderungen an den Daten in der Praxisverwaltung.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filter
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Modell</InputLabel>
                <Select
                  value={filters.model_name}
                  onChange={(e) => handleFilterChange('model_name', e.target.value)}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="Patient">Patient</MenuItem>
                  <MenuItem value="Appointment">Termin</MenuItem>
                  <MenuItem value="Prescription">Rezept</MenuItem>
                  <MenuItem value="Treatment">Behandlung</MenuItem>
                  <MenuItem value="User">Benutzer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Aktion</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="create">Erstellt</MenuItem>
                  <MenuItem value="update">Geändert</MenuItem>
                  <MenuItem value="delete">Gelöscht</MenuItem>
                  <MenuItem value="view">Angesehen</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Von Datum"
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Bis Datum"
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={applyFilters}>
              Filter anwenden
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => {
                setFilters({
                  model_name: '',
                  action: '',
                  user: '',
                  date_from: '',
                  date_to: ''
                });
                loadAuditLogs();
              }}
            >
              Zurücksetzen
            </Button>
            <IconButton onClick={loadAuditLogs} title="Aktualisieren">
              <RefreshIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Audit Log Tabelle */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Zeitstempel</TableCell>
                  <TableCell>Aktion</TableCell>
                  <TableCell>Modell</TableCell>
                  <TableCell>Objekt-ID</TableCell>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>Feld</TableCell>
                  <TableCell>Alter Wert</TableCell>
                  <TableCell>Neuer Wert</TableCell>
                  <TableCell>Notizen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<span>{getActionIcon(log.action)}</span>}
                        label={log.action_display}
                        color={getActionColor(log.action)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={log.model_name} variant="outlined" size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        #{log.object_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {log.user_initials && (
                          <Chip 
                            label={log.user_initials} 
                            size="small" 
                            color="primary"
                          />
                        )}
                        <Typography variant="body2">
                          {log.user_name || 'System'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {log.field_name && (
                        <Typography variant="body2" fontFamily="monospace">
                          {log.field_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.old_value || ''}>
                        <Typography variant="body2" color="text.secondary">
                          {truncateText(log.old_value)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.new_value || ''}>
                        <Typography variant="body2" color="text.primary">
                          {truncateText(log.new_value)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {log.notes && (
                        <Tooltip title={log.notes}>
                          <IconButton size="small">
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {auditLogs.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Keine Änderungen gefunden
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuditLogViewer;

