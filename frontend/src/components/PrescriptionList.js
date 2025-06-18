import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Warning as WarningIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import api from '../api/axios';
import { getFrequencyLabel } from '../constants/prescriptionConstants';
import { isAuthenticated } from '../services/auth';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import prescriptionService from '../services/prescriptionService';
import { STATUS_CONFIG } from '../constants/prescriptionConstants';

function PrescriptionList() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0
  });
  const [totalRows, setTotalRows] = useState(0);
  const navigate = useNavigate();

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const result = await prescriptionService.getPrescriptions(
        paginationModel.page + 1,
        paginationModel.pageSize
      );

      if (result.success) {
        setPrescriptions(result.data.map(prescription => ({
          ...prescription,
          id: prescription.id || Math.random()
        })));
        setTotalRows(result.total || 0);
        setError(null);
      } else {
        setError(result.error?.message || 'Fehler beim Laden der Daten');
        setPrescriptions([]);
        setTotalRows(0);
      }
    } catch (error) {
      setError(error?.message || 'Ein unerwarteter Fehler ist aufgetreten');
      setPrescriptions([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPrescriptions();
  }, [navigate]);

  const getStatusChip = (status) => {
    const statusConfig = {
      'Open': { color: 'primary', label: 'Offen' },
      'In_Progress': { color: 'warning', label: 'In Behandlung' },
      'Completed': { color: 'success', label: 'Abgeschlossen' },
      'Cancelled': { color: 'error', label: 'Storniert' }
    };
    
    const config = statusConfig[status] || { color: 'default', label: status };
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'patient_name', headerName: 'Patient', width: 200 },
    { field: 'treatment_type', headerName: 'Behandlungsart', width: 200 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => (
        <Box sx={{ 
          color: `${STATUS_CONFIG[params.value]?.color || 'default'}.main`,
          fontWeight: 'bold' 
        }}>
          {STATUS_CONFIG[params.value]?.label || params.value}
        </Box>
      )
    },
    { field: 'frequency_label', headerName: 'Frequenz', width: 150 },
    { field: 'start_date', headerName: 'Startdatum', width: 130 },
    { field: 'end_date', headerName: 'Enddatum', width: 130 }
  ];

  const handleRowClick = (params) => {
    navigate(`/prescriptions/${params.id}`);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.toString()}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <Box sx={{ mx: 0 }}>
          <Paper elevation={3} sx={{ borderRadius: 2, height: 'calc(100vh - 180px)' }}>
            <DataGrid
              rows={prescriptions}
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
              disableRowSelectionOnClick={false}
              sx={{
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                },
              }}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default PrescriptionList;
