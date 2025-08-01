import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Container,
  Stack,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useToast } from './common/ToastNotifications';
import { LoadingOverlay } from './common/ProgressBar';
import { ListSkeleton } from './common/SkeletonLoader';
import { Breadcrumbs } from './common/Breadcrumbs';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  LocalHospital,
  Event,
  Email,
  Phone,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ModernButton from './common/ModernButton';
import ModernCard, { CardSection, CardGrid } from './common/ModernCard';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowCount, setRowCount] = useState(0);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('patients/');
      const formattedPatients = response.data.map(patient => ({
        ...patient,
        id: patient.id,
        fullName: `${patient.first_name} ${patient.last_name}`,
        formattedBirthDate: patient.dob ? 
          format(new Date(patient.dob), 'dd.MM.yyyy', { locale: de }) : '-',
        formattedCreatedAt: patient.created_at ? 
          format(new Date(patient.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '-',
        formattedUpdatedAt: patient.updated_at ? 
          format(new Date(patient.updated_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '-',
        insuranceTypeDisplay: patient.insurance_type === 'public' ? 'Gesetzlich' : 'Privat',
        fullAddress: `${patient.street_address || ''}, ${patient.postal_code || ''} ${patient.city || ''}`
      }));
      setPatients(formattedPatients);
      setRowCount(formattedPatients.length);
      toast.success(`${formattedPatients.length} Patienten erfolgreich geladen`);
    } catch (error) {
      console.error('Fehler beim Laden der Patienten:', error);
      toast.error('Fehler beim Laden der Patienten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleRowClick = (params) => {
    navigate(`/patients/${params.row.id}`);
  };

  const columns = [
    {
      field: 'fullName',
      headerName: 'Patientenname',
      width: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="body1">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'formattedBirthDate',
      headerName: 'Geburtsdatum',
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="action" />
          <Typography>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'E-Mail',
      width: 220,
      renderCell: (params) => (
        <Tooltip title={`E-Mail an ${params.row.fullName} senden`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email color="action" />
            <Typography>{params.value || '-'}</Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'phone_number',
      headerName: 'Telefon',
      width: 160,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Phone color="action" />
          <Typography>{params.value || '-'}</Typography>
        </Box>
      ),
    },
    {
      field: 'fullAddress',
      headerName: 'Adresse',
      width: 280,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HomeIcon color="action" />
          <Typography>{params.value || '-'}</Typography>
        </Box>
      ),
    },
    {
      field: 'insuranceTypeDisplay',
      headerName: 'Versicherung',
      width: 150,
      renderCell: (params) => (
        <Chip
          icon={<LocalHospital />}
          label={params.value}
          color={params.row.insurance_type === 'public' ? 'primary' : 'secondary'}
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'insurance_number',
      headerName: 'Versicherten-Nr.',
      width: 160,
    },
    {
      field: 'actions',
      headerName: 'Aktionen',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Termin vereinbaren">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/appointments/new?patient=${params.row.id}`);
              }}
              color="primary"
            >
              <Event />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }
  ];

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 }, 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
    }}>
      <Breadcrumbs />
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                color: theme.palette.text.primary,
                mb: 0.5
              }}
            >
              Patienten
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.text.secondary,
                fontSize: '0.875rem'
              }}
            >
              {rowCount} Patienten insgesamt • Verwalten Sie Ihre Patientendaten
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <ModernButton
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchPatients}
              size="medium"
            >
              Aktualisieren
            </ModernButton>
            <ModernButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/patients/new')}
              size="medium"
            >
              Neuer Patient
            </ModernButton>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <CardSection title="Übersicht">
          <CardGrid columns={{ xs: 1, sm: 2, md: 4 }} spacing={3}>
            <ModernCard
              variant="info"
              title="Gesamt"
              sx={{ textAlign: 'center' }}
            >
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                {patients.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Patienten insgesamt
              </Typography>
            </ModernCard>
            
            <ModernCard
              variant="success"
              title="Gesetzlich"
              sx={{ textAlign: 'center' }}
            >
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                {patients.filter(p => p.insurance_type === 'public').length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Gesetzlich versichert
              </Typography>
            </ModernCard>
            
            <ModernCard
              variant="warning"
              title="Privat"
              sx={{ textAlign: 'center' }}
            >
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                {patients.filter(p => p.insurance_type === 'private').length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Privat versichert
              </Typography>
            </ModernCard>
            
            <ModernCard
              variant="primary"
              title="Neu heute"
              sx={{ textAlign: 'center' }}
            >
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {patients.filter(p => {
                  const today = new Date().toDateString();
                  const createdDate = new Date(p.created_at).toDateString();
                  return createdDate === today;
                }).length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Heute hinzugefügt
              </Typography>
            </ModernCard>
          </CardGrid>
        </CardSection>

        {/* Data Grid */}
        <LoadingOverlay open={loading} message="Lade Patienten...">
          <ModernCard
            variant="elevated"
            title="Patientenliste"
            subtitle={`${rowCount} Patienten gefunden`}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Aktualisieren">
                  <IconButton
                    onClick={fetchPatients}
                    disabled={loading}
                    sx={{ color: 'primary.main' }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Neuen Patienten hinzufügen">
                  <IconButton
                    onClick={() => navigate('/patients/new')}
                    sx={{ color: 'primary.main' }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            sx={{ mt: 3 }}
          >
          <DataGrid
            rows={patients}
            columns={columns}
            loading={loading}
            rowCount={rowCount}
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
                paginationModel: {
                  pageSize: 25,
                },
              },
              sorting: {
                sortModel: [{ field: 'fullName', sort: 'asc' }],
              },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            checkboxSelection
            onRowClick={handleRowClick}
            onRowSelectionModelChange={(newSelection) => {
              setSelectedPatients(newSelection);
            }}
            sx={{
              height: 'calc(100vh - 400px)',
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${theme.palette.divider}`,
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.grey[50],
                borderBottom: `2px solid ${theme.palette.divider}`,
                fontSize: '0.875rem',
                fontWeight: 600,
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: theme.palette.primary[50],
                },
                '&:nth-of-type(even)': {
                  backgroundColor: theme.palette.grey[25],
                },
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-toolbarContainer': {
                padding: theme.spacing(2),
                backgroundColor: theme.palette.background.paper,
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
            }}
            density="comfortable"
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
              toolbarExport: 'Export',
              toolbarExportLabel: 'Export',
              toolbarExportCSV: 'Als CSV exportieren',
              toolbarExportPrint: 'Drucken',
              noRowsLabel: 'Keine Patienten gefunden',
              footerRowSelected: (count) => `${count} Patienten ausgewählt`,
              columnMenuLabel: 'Menü',
              columnMenuShowColumns: 'Spalten anzeigen',
              columnMenuFilter: 'Filter',
              columnMenuHideColumn: 'Spalte ausblenden',
              columnMenuUnsort: 'Sortierung aufheben',
              columnMenuSortAsc: 'Aufsteigend sortieren',
              columnMenuSortDesc: 'Absteigend sortieren',
            }}
          />
          </ModernCard>
        </LoadingOverlay>
      </Container>
    </Box>
  );
}

export default PatientList;
