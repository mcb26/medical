// src/components/AppointmentList.js
import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await api.get('/appointments/');
        console.log('Rohdaten:', response.data); // Debug-Log
        const formattedAppointments = response.data.map(appointment => ({
          ...appointment,
          id: appointment.id,
          formattedDate: format(new Date(appointment.appointment_date), 'dd.MM.yyyy', { locale: de }),
          formattedTime: format(new Date(appointment.appointment_date), 'HH:mm', { locale: de }),
          // Formatiere die Zeitstempel direkt hier
          formattedCreatedAt: appointment.created_at ? 
            format(new Date(appointment.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '-',
          formattedUpdatedAt: appointment.updated_at ? 
            format(new Date(appointment.updated_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '-',
        }));
        setAppointments(formattedAppointments);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleRowClick = (params) => {
    navigate(`/appointments/${params.row.id}`);
  };

  const columns = [
    {
      field: 'formattedDate',
      headerName: 'Datum',
      width: 120,
      filterable: true,
    },
    {
      field: 'formattedTime',
      headerName: 'Uhrzeit',
      width: 100,
      filterable: true,
    },
    {
      field: 'patient_name',
      headerName: 'Patient',
      width: 200,
      filterable: true,
    },
    {
      field: 'treatment_name',
      headerName: 'Behandlung',
      width: 200,
      filterable: true,
    },
    {
      field: 'practitioner_name',
      headerName: 'Behandler',
      width: 180,
      filterable: true,
    },
    {
      field: 'room_name',
      headerName: 'Raum',
      width: 120,
      filterable: true,
    },
    {
      field: 'duration_minutes',
      headerName: 'Dauer (Min)',
      width: 120,
      type: 'number',
      filterable: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      filterable: true,
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: 
              params.value === 'Geplant' ? '#2196f3' :
              params.value === 'Abgeschlossen' ? '#4caf50' :
              params.value === 'Abgesagt' ? '#f44336' : '#grey',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'notes',
      headerName: 'Notizen',
      width: 200,
      filterable: true,
    },
    {
      field: 'prescription_id',
      headerName: 'Verordnungs-ID',
      width: 150,
      filterable: true,
    },
    {
      field: 'series_identifier',
      headerName: 'Serien-ID',
      width: 120,
      filterable: true,
    },
    {
      field: 'formattedCreatedAt',
      headerName: 'Erstellt am',
      width: 180,
      filterable: true,
    },
    {
      field: 'formattedUpdatedAt',
      headerName: 'Aktualisiert am',
      width: 180,
      filterable: true,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
        <DataGrid
          rows={appointments}
          columns={columns}
          loading={loading}
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
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          checkboxSelection
          onRowClick={handleRowClick}
          sx={{
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
          }}
        />
      </Paper>
    </Box>
  );
}

export default AppointmentList;
