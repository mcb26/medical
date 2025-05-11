import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function TreatmentList() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowCount, setRowCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTreatments = async () => {
      try {
        const response = await api.get('/treatments/');
        const formattedTreatments = response.data.map(treatment => ({
          ...treatment,
          id: treatment.id,
          categoryName: treatment.category?.name || 'Keine Kategorie',
          formattedPrice: `${treatment.price || 0} €`,
          formattedDuration: `${treatment.duration_minutes} Min`,
          formattedCreatedAt: treatment.created_at ? 
            new Date(treatment.created_at).toLocaleString('de-DE') : '-',
          formattedUpdatedAt: treatment.updated_at ? 
            new Date(treatment.updated_at).toLocaleString('de-DE') : '-'
        }));
        setTreatments(formattedTreatments);
        setRowCount(formattedTreatments.length);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Behandlungen:', error);
        setLoading(false);
      }
    };

    fetchTreatments();
  }, []);

  const handleRowClick = (params) => {
    navigate(`/treatments/${params.row.id}`);
  };

  const columns = [
    {
      field: 'treatment_name',
      headerName: 'Behandlung',
      width: 250,
      filterable: true,
    },
    {
      field: 'categoryName',
      headerName: 'Kategorie',
      width: 180,
      filterable: true,
    },
    {
      field: 'formattedDuration',
      headerName: 'Dauer',
      width: 120,
      filterable: true,
    },
    {
      field: 'formattedPrice',
      headerName: 'Preis',
      width: 120,
      filterable: true,
    },
    {
      field: 'description',
      headerName: 'Beschreibung',
      width: 300,
      filterable: true,
    },
    {
      field: 'insurance_coverage',
      headerName: 'Kassenleistung',
      width: 150,
      filterable: true,
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: params.value ? '#4caf50' : '#f44336',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}
        >
          {params.value ? 'Ja' : 'Nein'}
        </Box>
      ),
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
          rows={treatments}
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

export default TreatmentList;
