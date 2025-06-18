import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Container,
  Card,
  CardContent,
  Stack,
  Divider,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  LocalHospital,
  Event,
  Email,
  Phone,
  Home as HomeIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowCount, setRowCount] = useState(0);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const navigate = useNavigate();

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
    } catch (error) {
      console.error('Fehler beim Laden der Patienten:', error);
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
      headerName: 'Name',
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

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Patienten
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {rowCount} Patienten insgesamt
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchPatients}
            >
              Aktualisieren
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/patients/new')}
            >
              Neuer Patient
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* DataGrid */}
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
            height: 'calc(100vh - 250px)',
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
            '& .MuiDataGrid-columnHeader': {
              fontWeight: 'bold',
            },
            '& .MuiDataGrid-toolbarContainer': {
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #e0e0e0',
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
      </Paper>
    </Box>
  );
}

export default PatientList;
