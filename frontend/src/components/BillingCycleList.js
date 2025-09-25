import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { isAuthenticated } from '../services/auth';
import UnifiedPageLayout from './common/UnifiedPageLayout';
import ModernButton from './common/ModernButton';
import { Add as AddIcon, PlayArrow as PlayIcon } from '@mui/icons-material';

function BillingCycleList() {
  const [billingCycles, setBillingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBillingCycles = useCallback(async () => {
    if (!isAuthenticated()) return;
    
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
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchBillingCycles();
  }, [fetchBillingCycles, navigate]);

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Entwurf',
      'ready': 'Bereit zum Export',
      'exported': 'Exportiert',
      'completed': 'Abgeschlossen'
    };
    return labels[status] || status;
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      sortable: true,
    },
    {
      field: 'insurance_provider_name',
      headerName: 'Krankenkasse',
      width: 200,
      sortable: true,
    },
    {
      field: 'formattedStartDate',
      headerName: 'Startdatum',
      width: 120,
      sortable: true,
    },
    {
      field: 'formattedEndDate',
      headerName: 'Enddatum',
      width: 120,
      sortable: true,
    },
    {
      field: 'statusDisplay',
      headerName: 'Status',
      width: 150,
      sortable: true,
    },
    {
      field: 'formattedAmount',
      headerName: 'Betrag',
      width: 120,
      sortable: true,
    },
    {
      field: 'actions',
      headerName: 'Aktionen',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <ModernButton 
            variant="outlined" 
            size="small"
            onClick={() => navigate(`/billing-cycles/${params.row.id}`)}
            sx={{ mr: 1 }}
          >
            Details
          </ModernButton>
          <ModernButton 
            variant="outlined" 
            size="small"
            onClick={() => navigate(`/billing-cycles/${params.row.id}/edit`)}
          >
            Bearbeiten
          </ModernButton>
        </Box>
      ),
    }
  ];

  const actions = [
    {
      label: 'Massenabrechnung starten',
      variant: 'contained',
      icon: <PlayIcon />,
      onClick: () => navigate('/billing-cycles/bulk'),
    },
    {
      label: 'Neue Abrechnung',
      variant: 'contained',
      icon: <AddIcon />,
      onClick: () => navigate('/billing-cycles/new'),
    },
  ];

  return (
    <UnifiedPageLayout
      title="Abrechnungszyklen"
      subtitle="Verwalten Sie Ihre Abrechnungszyklen und Massenabrechnungen"
      actions={actions}
      onRefresh={fetchBillingCycles}
      showDataGrid={true}
      dataGridProps={{
        rows: billingCycles,
        columns: columns,
        loading: loading,
        rowCount: billingCycles.length,
        onRowClick: (params) => navigate(`/billing-cycles/${params.row.id}`),
      }}
    />
  );
}

export default BillingCycleList;
