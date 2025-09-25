import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function InsuranceGroupList() {
  const [insuranceGroups, setInsuranceGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInsuranceGroups = async () => {
      try {
        const response = await api.get('/insurance-provider-groups/');
        const formattedGroups = response.data.map(group => ({
          ...group,
          formattedCreatedAt: new Date(group.created_at).toLocaleString('de-DE'),
          formattedUpdatedAt: group.updated_at ? 
            new Date(group.updated_at).toLocaleString('de-DE') : '-'
        }));
        setInsuranceGroups(formattedGroups);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Versicherungsgruppen:', error);
        setLoading(false);
      }
    };

    fetchInsuranceGroups();
  }, []);

  const handleRowClick = (params) => {
    navigate(`/insurance-groups/${params.row.id}`);
  };

  const columns = [
    { 
      field: 'name', 
      headerName: 'Gruppenname', 
      width: 250,
      filterable: true,
    },
    { 
      field: 'description', 
      headerName: 'Beschreibung', 
      width: 300,
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
          rows={insuranceGroups}
          columns={columns}
          loading={loading}
          rowCount={insuranceGroups.length}
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

export default InsuranceGroupList;
