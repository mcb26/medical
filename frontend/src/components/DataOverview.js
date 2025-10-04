import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Paper,
  CircularProgress,
  Alert,
  Button,
  Typography,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  LocalHospital as TreatmentIcon,
  Description as PrescriptionIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

function DataOverview() {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({
    patients: [],
    appointments: [],
    prescriptions: [],
    treatments: [],
    practitioners: [],
    rooms: [],
    doctors: [],
    insuranceProviders: [],
    insuranceProviderGroups: [],
    categories: [],
    specializations: [],
    icdCodes: [],
    diagnosisGroups: [],
    billingCycles: [],
    surcharges: [],
    emergencyContacts: [],
    practiceSettings: [],
    calendarSettings: [],
    bundeslaender: [],
    localHolidays: [],
    workingHours: [],
    practices: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    
    const safeApiCall = async (endpoint) => {
      try {
        const response = await api.get(endpoint);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return [];
        }
        console.warn(`Warnung: Fehler beim Laden von ${endpoint}:`, error);
        return [];
      }
    };

    try {
      const [
        patients,
        appointments,
        prescriptions,
        treatments,
        practitioners,
        rooms,
        doctors,
        insuranceProviders,
        insuranceProviderGroups,
        categories,
        specializations,
        icdCodes,
        diagnosisGroups,
        billingCycles,
        surcharges,
        emergencyContacts,
        practiceSettings,
        calendarSettings,
        bundeslaender,
        localHolidays,
        workingHours,
        practices
      ] = await Promise.all([
        safeApiCall('/patients/'),
        safeApiCall('/appointments/'),
        safeApiCall('/prescriptions/'),
        safeApiCall('/treatments/'),
        safeApiCall('/practitioners/'),
        safeApiCall('/rooms/'),
        safeApiCall('/doctors/'),
        safeApiCall('/insurance-providers/'),
        safeApiCall('/insurance-provider-groups/'),
        safeApiCall('/categories/'),
        safeApiCall('/specializations/'),
        safeApiCall('/icd-codes/'),
        safeApiCall('/diagnosis-groups/'),
        safeApiCall('/billing-cycles/'),
        safeApiCall('/surcharges/'),
        safeApiCall('/emergency-contacts/'),
        safeApiCall('/practice-settings/'),
        safeApiCall('/settings/'),
        safeApiCall('/bundeslaender/'),
        safeApiCall('/local-holidays/'),
        safeApiCall('/working-hours/'),
        safeApiCall('/practice/')
      ]);

      setData({
        patients,
        appointments,
        prescriptions,
        treatments,
        practitioners,
        rooms,
        doctors,
        insuranceProviders,
        insuranceProviderGroups,
        categories,
        specializations,
        icdCodes,
        diagnosisGroups,
        billingCycles,
        surcharges,
        emergencyContacts,
        practiceSettings,
        calendarSettings,
        bundeslaender,
        localHolidays,
        workingHours,
        practices
      });
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setError('Fehler beim Laden der Daten');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    fetchStats();
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/export/${activeTab}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      setError('Fehler beim Exportieren der Daten');
    }
  };

  const handleDelete = async () => {
    if (!selectedRows.length) return;
    
    if (!window.confirm(`Möchten Sie wirklich ${selectedRows.length} Einträge löschen?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedRows.map(id => api.delete(`/${activeTab}/${id}/`))
      );
      handleRefresh();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      setError('Fehler beim Löschen der Daten');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderStatsCard = (title, value, icon, color) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {React.createElement(icon, { sx: { color, mr: 1 } })}
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{ color }}>
          {typeof value === 'object' ? JSON.stringify(value) : value}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderActionButtons = () => (
    <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate(`/${activeTab}/new`)}
      >
        Neu
      </Button>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={handleRefresh}
      >
        Aktualisieren
      </Button>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={() => handleExport('csv')}
      >
        Export CSV
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={handlePrint}
      >
        Drucken
      </Button>
      {selectedRows.length > 0 && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Löschen ({selectedRows.length})
        </Button>
      )}
    </Box>
  );

  const getValidRows = (key) => {
    const rows = data[key] || [];
    return rows.map(row => ({
      ...row,
      id: row.id || row.uuid || Math.random().toString(36).substr(2, 9)
    }));
  };

  const getValidColumns = (key) => {
    const columns = {
      patients: [
        { field: 'first_name', headerName: 'Vorname', width: 150 },
        { field: 'last_name', headerName: 'Nachname', width: 150 },
        { field: 'date_of_birth', headerName: 'Geburtsdatum', width: 120 },
        { field: 'insurance_number', headerName: 'Versicherungsnummer', width: 150 }
      ],
      appointments: [
        { field: 'date', headerName: 'Datum', width: 150 },
        { field: 'time', headerName: 'Uhrzeit', width: 100 },
        { field: 'patient_name', headerName: 'Patient', width: 200 },
        { field: 'treatment_name', headerName: 'Behandlung', width: 200 }
      ],
      // ... weitere Spalten für andere Tabs
    };
    return columns[key] || [];
  };

  // const getCreatePath = (key) => {
  //   const paths = {
  //     patients: '/patients/new',
  //     appointments: '/appointments/new',
  //     prescriptions: '/prescriptions/new',
  //     treatments: '/treatments/new',
  //     practitioners: '/practitioners/new',
  //     rooms: '/rooms/new',
  //     doctors: '/doctors/new',
  //     insuranceProviders: '/insurance-providers/new',
  //     insuranceProviderGroups: '/insurance-provider-groups/new',
  //     categories: '/categories/new',
  //     specializations: '/specializations/new',
  //     icdCodes: '/icdcodes/new',
  //     diagnosisGroups: '/diagnosis-groups/new',
  //     billingCycles: '/billing-cycles/new',
  //     surcharges: '/surcharges/new',
  //     emergencyContacts: '/emergency-contacts/new',
  //     practiceSettings: '/practice-settings',
  //     calendarSettings: '/settings/new',
  //     bundeslaender: '/bundesland/new',
  //     localHolidays: '/local-holidays/new',
  //     workingHours: '/working-hours/new',
  //     practices: '/practice/new'
  //   };
  //   return paths[key] || '/';
  // };

  // const handleCreate = (key) => {
  //   navigate(getCreatePath(key));
  // };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Datenübersicht
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          {renderStatsCard('Patienten', (stats.patients && stats.patients.total) || 0, PersonIcon, '#1976d2')}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderStatsCard('Termine', (stats.appointments && stats.appointments.total) || 0, EventIcon, '#2e7d32')}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderStatsCard('Behandlungen', (stats.treatments && stats.treatments.total) || 0, TreatmentIcon, '#ed6c02')}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderStatsCard('Rezepte', (stats.prescriptions && stats.prescriptions.total) || 0, PrescriptionIcon, '#9c27b0')}
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Patienten" />
          <Tab label="Termine" />
          <Tab label="Rezepte" />
          <Tab label="Behandlungen" />
          <Tab label="Behandler" />
          <Tab label="Räume" />
          <Tab label="Ärzte" />
          <Tab label="Krankenkassen" />
          <Tab label="Krankenkassengruppen" />
          <Tab label="Kategorien" />
          <Tab label="Spezialisierungen" />
          <Tab label="ICD-Codes" />
          <Tab label="Diagnosegruppen" />
          <Tab label="Abrechnungszyklen" />
          <Tab label="Zuschläge" />
          <Tab label="Notfallkontakte" />
          <Tab label="Praxis-Einstellungen" />
          <Tab label="Kalender-Einstellungen" />
          <Tab label="Bundesländer" />
          <Tab label="Feiertage" />
          <Tab label="Arbeitszeiten" />
          <Tab label="Praxen" />
        </Tabs>
      </Paper>

      {renderActionButtons()}

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={getValidRows(activeTab)}
          columns={getValidColumns(activeTab)}
          loading={loading}
          slots={{
            toolbar: GridToolbar,
          }}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
          }}
          pageSizeOptions={[5, 10, 20]}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection);
          }}
        />
      </Box>
    </Box>
  );
}

export default DataOverview;
