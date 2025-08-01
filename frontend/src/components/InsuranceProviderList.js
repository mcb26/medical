import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Paper, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function InsuranceProviderList() {
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInsuranceProviders = async () => {
      try {
        const response = await api.get('/insurance-providers/');
        const formattedProviders = response.data.map(provider => ({
          ...provider,
          groupName: provider.group_name || 'Keine Gruppe',
          formattedCreatedAt: new Date(provider.created_at).toLocaleString('de-DE'),
          formattedUpdatedAt: provider.updated_at ? 
            new Date(provider.updated_at).toLocaleString('de-DE') : '-'
        }));
        setInsuranceProviders(formattedProviders);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Krankenkassen:', error);
        setLoading(false);
      }
    };

    fetchInsuranceProviders();
  }, []);

  const handleRowClick = (params) => {
    navigate(`/insurance-providers/${params.row.id}`);
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Krankenkassenname',
      width: 250,
      filterable: true,
    },
    {
      field: 'group',
      headerName: 'Gruppe',
      width: 200,
      filterable: true,
      renderCell: (params) => (
        <Chip
          label={params.row?.group?.name || 'Keine Gruppe'}
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'provider_id',
      headerName: 'Krankenkassen-ID',
      width: 150,
      filterable: true,
    },
    {
      field: 'phone_number',
      headerName: 'Telefon',
      width: 150,
      filterable: true,
    },
    {
      field: 'email',
      headerName: 'E-Mail',
      width: 200,
      filterable: true,
    },
    {
      field: 'contact_person',
      headerName: 'Ansprechpartner',
      width: 200,
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
    }
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', p: 3 }}>
      <Paper sx={{ height: '100%', width: '100%' }}>
        <DataGrid
          rows={insuranceProviders}
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
            toolbarExport: 'Export',
            toolbarExportLabel: 'Export',
            toolbarExportCSV: 'Als CSV exportieren',
            toolbarExportPrint: 'Drucken',
          }}
        />
      </Paper>
    </Box>
  );
}

export default InsuranceProviderList;
