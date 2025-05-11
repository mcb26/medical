import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  LocalHospital as TreatmentIcon,
  Description as PrescriptionIcon,
  MeetingRoom as RoomIcon,
  HealthAndSafety as DoctorIcon,
  AccountBalance as InsuranceIcon,
  Category as CategoryIcon,
  School as SpecializationIcon,
  Code as ICDCodeIcon,
  LocalHospital as DiagnosisIcon,
  Receipt as BillingIcon,
  AddCircle as SurchargeIcon,
  ContactPhone as EmergencyContactIcon,
  Settings as SettingsIcon,
  CalendarToday as CalendarIcon,
  LocationCity as BundeslandIcon,
  BeachAccess as HolidayIcon,
  Schedule as WorkingHourIcon,
  Business as PracticeIcon,
  Group as InsuranceGroupIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
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
        safeApiCall('/icdcodes/'),
        safeApiCall('/diagnosis-groups/'),
        safeApiCall('/billing-cycles/'),
        safeApiCall('/surcharges/'),
        safeApiCall('/emergency-contacts/'),
        safeApiCall('/practice-settings/'),
        safeApiCall('/settings/'),
        safeApiCall('/bundesland/'),
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
      console.error('Kritischer Fehler beim Laden der Daten:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    fetchStats();
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/export/${activeTab}/${format}/`);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Möchten Sie die ausgewählten Einträge wirklich löschen?')) {
      try {
        await Promise.all(selectedRows.map(id => 
          api.delete(`/${activeTab}/${id}/`)
        ));
        fetchAllData();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const renderStatsCard = (title, value, icon, color) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Box sx={{ 
              backgroundColor: `${color}.light`, 
              borderRadius: '50%', 
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {icon}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h6" component="div">
              {value}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderActionButtons = () => (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
        Exportieren
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

  const columns = {
    patients: [
      { field: 'fullName', headerName: 'Name', width: 200 },
      { field: 'formattedBirthDate', headerName: 'Geburtsdatum', width: 120 },
      { field: 'email', headerName: 'E-Mail', width: 200 },
      { field: 'phone_number', headerName: 'Telefon', width: 150 }
    ],
    appointments: [
      { field: 'patient_name', headerName: 'Patient', width: 200 },
      { field: 'appointment_date', headerName: 'Termin', width: 180 },
      { field: 'treatment_name', headerName: 'Behandlung', width: 200 },
      { field: 'status', headerName: 'Status', width: 120 }
    ],
    prescriptions: [
      { field: 'patient_name', headerName: 'Patient', width: 200 },
      { field: 'doctor_name', headerName: 'Arzt', width: 200 },
      { field: 'treatment_1_name', headerName: 'Behandlung', width: 200 },
      { field: 'status', headerName: 'Status', width: 120 }
    ],
    treatments: [
      { field: 'treatment_name', headerName: 'Behandlung', width: 200 },
      { field: 'duration_minutes', headerName: 'Dauer (Min)', width: 120 },
      { field: 'category', headerName: 'Kategorie', width: 150 }
    ],
    practitioners: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'is_active', headerName: 'Status', width: 120 }
    ],
    rooms: [
      { field: 'name', headerName: 'Name', width: 150 },
      { field: 'capacity', headerName: 'Kapazität', width: 120 },
      { field: 'is_active', headerName: 'Status', width: 120 }
    ],
    doctors: [
      { field: 'fullName', headerName: 'Name', width: 200 },
      { field: 'specializations', headerName: 'Fachgebiete', width: 200 },
      { field: 'email', headerName: 'E-Mail', width: 200 }
    ],
    insuranceProviders: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'type', headerName: 'Typ', width: 120 }
    ],
    insuranceProviderGroups: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'description', headerName: 'Beschreibung', width: 300 }
    ],
    categories: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'description', headerName: 'Beschreibung', width: 300 }
    ],
    specializations: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'description', headerName: 'Beschreibung', width: 300 }
    ],
    icdCodes: [
      { field: 'code', headerName: 'Code', width: 120 },
      { field: 'title', headerName: 'Titel', width: 200 },
      { field: 'description', headerName: 'Beschreibung', width: 300 }
    ],
    diagnosisGroups: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'description', headerName: 'Beschreibung', width: 300 }
    ],
    billingCycles: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'period', headerName: 'Zeitraum', width: 150 }
    ],
    surcharges: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'amount', headerName: 'Betrag', width: 120 }
    ],
    emergencyContacts: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'phone_number', headerName: 'Telefon', width: 150 },
      { field: 'relationship', headerName: 'Beziehung', width: 150 }
    ],
    bundeslaender: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'abbreviation', headerName: 'Kürzel', width: 100 }
    ],
    localHolidays: [
      { field: 'holiday_name', headerName: 'Name', width: 200 },
      { field: 'date', headerName: 'Datum', width: 120 }
    ],
    workingHours: [
      { field: 'day_of_week', headerName: 'Wochentag', width: 120 },
      { field: 'start_time', headerName: 'Von', width: 100 },
      { field: 'end_time', headerName: 'Bis', width: 100 }
    ],
    practices: [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'city', headerName: 'Stadt', width: 150 },
      { field: 'phone', headerName: 'Telefon', width: 150 }
    ]
  };

  // Hilfsfunktion zum Überprüfen der Daten
  const getValidRows = (key) => {
    if (!data[key] || !Array.isArray(data[key])) {
      return [];
    }
    return data[key].map((item, index) => ({
      ...item,
      id: item.id || index // Fallback-ID wenn keine vorhanden
    }));
  };

  // Hilfsfunktion zum Überprüfen der Spalten
  const getValidColumns = (key) => {
    if (!columns[key] || !Array.isArray(columns[key])) {
      return [{ field: 'id', headerName: 'ID', width: 100 }];
    }
    return columns[key];
  };

  const getCreatePath = (key) => {
    const pathMap = {
      patients: '/patients/new',
      appointments: '/appointments/new',
      prescriptions: '/prescriptions/new',
      treatments: '/treatments/new',
      practitioners: '/practitioners/new',
      rooms: '/rooms/new',
      doctors: '/doctors/new',
      insuranceProviders: '/insurance-providers/new',
      insuranceProviderGroups: '/insurance-groups/new',
      categories: '/categories/new',
      specializations: '/specializations/new',
      icdCodes: '/icdcodes/new',
      diagnosisGroups: '/diagnosis-groups/new',
      billingCycles: '/billing-cycles/new',
      surcharges: '/surcharges/new',
      emergencyContacts: '/emergency-contacts/new',
      practiceSettings: '/practice-settings/new',
      calendarSettings: '/calendar-settings/new',
      bundeslaender: '/bundesland/new',
      localHolidays: '/local-holidays/new',
      workingHours: '/working-hours/new',
      practices: '/practice/new'
    };
    return pathMap[key] || `/${key}/new`;
  };

  // Funktion zum Erstellen einer neuen Instanz
  const handleCreate = (key) => {
    const path = getCreatePath(key);
    navigate(path);
  };

  // Custom Toolbar Komponente
  const CustomToolbar = React.memo(({ tableKey }) => {
    return (
      <Box sx={{ 
        p: 1, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <GridToolbar />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleCreate(tableKey)}
          sx={{ ml: 2 }}
        >
          Neu erstellen
        </Button>
      </Box>
    );
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const dataKeys = Object.keys(data);

  return (
    <Box sx={{ p: 3 }}>
      {/* Statistik-Karten */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard(
            'Aktive Patienten',
            stats.activePatients || 0,
            <PersonIcon sx={{ color: 'primary.main' }} />,
            'primary'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard(
            'Termine heute',
            stats.todayAppointments || 0,
            <EventIcon sx={{ color: 'success.main' }} />,
            'success'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard(
            'Offene Rechnungen',
            stats.openInvoices || 0,
            <BillingIcon sx={{ color: 'warning.main' }} />,
            'warning'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard(
            'Aktive Behandler',
            stats.activePractitioners || 0,
            <DoctorIcon sx={{ color: 'info.main' }} />,
            'info'
          )}
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="data overview tabs"
          >
            <Tab icon={<PersonIcon />} label="Patienten" />
            <Tab icon={<EventIcon />} label="Termine" />
            <Tab icon={<PrescriptionIcon />} label="Verordnungen" />
            <Tab icon={<TreatmentIcon />} label="Behandlungen" />
            <Tab icon={<PersonIcon />} label="Therapeuten" />
            <Tab icon={<RoomIcon />} label="Räume" />
            <Tab icon={<DoctorIcon />} label="Ärzte" />
            <Tab icon={<InsuranceIcon />} label="Versicherungen" />
            <Tab icon={<InsuranceGroupIcon />} label="Versicherungsgruppen" />
            <Tab icon={<CategoryIcon />} label="Kategorien" />
            <Tab icon={<SpecializationIcon />} label="Spezialisierungen" />
            <Tab icon={<ICDCodeIcon />} label="ICD Codes" />
            <Tab icon={<DiagnosisIcon />} label="Diagnosegruppen" />
            <Tab icon={<BillingIcon />} label="Abrechnungszyklen" />
            <Tab icon={<SurchargeIcon />} label="Zuschläge" />
            <Tab icon={<EmergencyContactIcon />} label="Notfallkontakte" />
            <Tab icon={<SettingsIcon />} label="Praxiseinstellungen" />
            <Tab icon={<CalendarIcon />} label="Kalendereinstellungen" />
            <Tab icon={<BundeslandIcon />} label="Bundesländer" />
            <Tab icon={<HolidayIcon />} label="Feiertage" />
            <Tab icon={<WorkingHourIcon />} label="Arbeitszeiten" />
            <Tab icon={<PracticeIcon />} label="Praxen" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              {renderActionButtons()}
            </Grid>
          </Grid>
        </Box>

        {dataKeys.map((key, index) => (
          activeTab === index && (
            <Box key={key} sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={getValidRows(key)}
                columns={getValidColumns(key)}
                loading={loading}
                checkboxSelection
                onRowSelectionModelChange={(newSelection) => {
                  setSelectedRows(newSelection);
                }}
                slots={{
                  toolbar: GridToolbar,
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 },
                  },
                }}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                onRowClick={(params) => navigate(`/${key}/${params.row.id}`)}
                sx={{
                  '& .MuiDataGrid-root': {
                    border: 'none',
                  },
                  '& .MuiDataGrid-row': {
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  },
                }}
                density="compact"
                localeText={{
                  toolbarDensity: 'Zeilenhöhe',
                  toolbarDensityLabel: 'Zeilenhöhe',
                  toolbarDensityCompact: 'Kompakt',
                  toolbarDensityStandard: 'Standard',
                  toolbarDensityComfortable: 'Komfortabel',
                  toolbarColumns: 'Spalten',
                  toolbarColumnsLabel: 'Spalten auswählen',
                  toolbarFilters: 'Filter',
                  toolbarFiltersLabel: 'Filter anzeigen',
                  toolbarFiltersTooltipHide: 'Filter ausblenden',
                  toolbarFiltersTooltipShow: 'Filter anzeigen',
                  toolbarQuickFilterPlaceholder: 'Suchen...',
                  noRowsLabel: 'Keine Daten verfügbar',
                }}
              />
            </Box>
          )
        ))}
      </Paper>
    </Box>
  );
}

export default DataOverview;
