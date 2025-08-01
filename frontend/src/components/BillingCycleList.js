import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Button,
  Typography 
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function BillingCycleList() {
  const [billingCycles, setBillingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBillingCycles = useCallback(async () => {
    try {
      const response = await api.get('/billing-cycles/');
      const formattedCycles = response.data.map(cycle => ({
        ...cycle,
        formattedStartDate: format(new Date(cycle.start_date), 'dd.MM.yyyy', { locale: de }),
        formattedEndDate: format(new Date(cycle.end_date), 'dd.MM.yyyy', { locale: de }),
        formattedAmount: `${cycle.total_amount?.toFixed(2)} €`,
        statusDisplay: getStatusLabel(cycle.status)
      }));
      setBillingCycles(formattedCycles);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnungszyklen:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingCycles();
  }, [fetchBillingCycles]);

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Entwurf',
      'ready': 'Bereit zum Export',
      'exported': 'Exportiert',
      'completed': 'Abgeschlossen'
    };
    return labels[status] || status;
  };

  const handleStartBulkBilling = async () => {
    try {
      const startDate = prompt('Startdatum (YYYY-MM-DD):');
      const endDate = prompt('Enddatum (YYYY-MM-DD):');
      
      if (!startDate || !endDate) {
        alert('Bitte geben Sie Start- und Enddatum ein.');
        return;
      }

      // Validierung der Datumsformate
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        alert('Bitte geben Sie gültige Datumsformate ein (YYYY-MM-DD).');
        return;
      }

      if (start >= end) {
        alert('Das Enddatum muss nach dem Startdatum liegen.');
        return;
      }

      const response = await api.post('/billing-cycles/bulk/', {
        start_date: startDate,
        end_date: endDate
      });

      // Zeige detaillierte Ergebnisse
      let message = 'Massenabrechnung abgeschlossen:\n\n';
      response.data.forEach(result => {
        message += `${result.insurance_provider}: ${result.status}\n`;
        if (result.status === 'success') {
          message += `  - ${result.appointments_count} Termine\n`;
          message += `  - KK-Betrag: ${result.total_insurance_amount} €\n`;
          message += `  - Zuzahlung: ${result.total_patient_copay} €\n`;
        } else if (result.status === 'error') {
          message += `  - Fehler: ${result.message}\n`;
        } else {
          message += `  - ${result.message}\n`;
        }
        message += '\n';
      });

      alert(message);
      fetchBillingCycles(); // Liste aktualisieren
    } catch (error) {
      console.error('Fehler bei der Massenabrechnung:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Unbekannter Fehler bei der Massenabrechnung';
      alert(`Fehler bei der Massenabrechnung: ${errorMessage}`);
    }
  };

  const columns = [
    {
      field: 'insurance_provider_name',
      headerName: 'Krankenkasse',
      width: 200,
      filterable: true,
    },
    {
      field: 'formattedStartDate',
      headerName: 'Von',
      width: 120,
      filterable: true,
    },
    {
      field: 'formattedEndDate',
      headerName: 'Bis',
      width: 120,
      filterable: true,
    },
    {
      field: 'statusDisplay',
      headerName: 'Status',
      width: 150,
      filterable: true,
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: 
              params.value === 'Abgeschlossen' ? '#4caf50' :
              params.value === 'Exportiert' ? '#2196f3' :
              params.value === 'Bereit zum Export' ? '#ff9800' : '#9e9e9e',
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
      field: 'total_insurance_amount',
      headerName: 'KK-Betrag',
      width: 150,
      filterable: true,
      renderCell: (params) => (
        <Typography>
          {params.value ? `${parseFloat(params.value).toFixed(2)} €` : '0.00 €'}
        </Typography>
      ),
    },
    {
      field: 'total_patient_copay',
      headerName: 'Zuzahlung',
      width: 150,
      filterable: true,
      renderCell: (params) => (
        <Typography>
          {params.value ? `${parseFloat(params.value).toFixed(2)} €` : '0.00 €'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Aktionen',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate(`/billing-cycles/${params.row.id}`)}
            sx={{ mr: 1 }}
          >
            Details
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate(`/billing-cycles/${params.row.id}/edit`)}
          >
            Bearbeiten
          </Button>
        </Box>
      ),
    }
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Abrechnungszyklen</Typography>
        <Box>
          <Button 
            variant="contained" 
            onClick={() => navigate('/billing-cycles/bulk')}
            sx={{ mr: 2 }}
          >
            Massenabrechnung starten
          </Button>
          <Button 
            variant="contained" 
            onClick={() => navigate('/billing-cycles/new')}
          >
            Neue Abrechnung
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: '100%', width: '100%' }}>
        <DataGrid
          rows={billingCycles}
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
          onRowClick={(params) => navigate(`/billing-cycles/${params.row.id}`)}
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

export default BillingCycleList;
