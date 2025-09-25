import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Button,
  Typography,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Avatar
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Event as EventIcon,
  LocalHospital as TreatmentIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import PrescriptionOCR from './PrescriptionOCR';
// getFrequencyLabel entfernt, da nicht verwendet
import { isAuthenticated } from '../services/auth';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import prescriptionService from '../services/prescriptionService';
import { STATUS_CONFIG } from '../constants/prescriptionConstants';

function PrescriptionList() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0
  });
  const [totalRows, setTotalRows] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchPrescriptions = useCallback(async () => {
    if (!isAuthenticated()) return;
    
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
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchPrescriptions();
  }, [navigate, fetchPrescriptions]);

  const handleRowClick = (params) => {
    if (isMobile) {
      setSelectedPrescription(params.row);
      setMobileDetailOpen(true);
    } else {
      navigate(`/prescriptions/${params.id}`);
    }
  };

  const handleMobileDetailClose = () => {
    setMobileDetailOpen(false);
    setSelectedPrescription(null);
  };

  const handleMobileViewPrescription = () => {
    if (selectedPrescription) {
      navigate(`/prescriptions/${selectedPrescription.id}`);
      handleMobileDetailClose();
    }
  };

  const handlePrescriptionCreated = (prescriptionId) => {
    setShowOCR(false);
    fetchPrescriptions(); // Liste aktualisieren
  };

  // getStatusChip Funktion entfernt, da nicht verwendet

  const columns = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: isMobile ? 60 : 90,
      hide: isMobile
    },
    { 
      field: 'patient_name', 
      headerName: 'Patient', 
      width: isMobile ? 120 : 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: isMobile ? 20 : 24, height: isMobile ? 20 : 24 }}>
            <PersonIcon sx={{ fontSize: isMobile ? '0.75rem' : '1rem' }} />
          </Avatar>
          <Typography variant={isMobile ? 'caption' : 'body2'} sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: isMobile ? 70 : 150
          }}>
            {params.value}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'treatment_type', 
      headerName: 'Behandlungsart', 
      width: isMobile ? 0 : 200,
      hide: isMobile,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TreatmentIcon color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: isMobile ? 100 : 130,
      renderCell: (params) => (
        <Box sx={{ 
          color: `${STATUS_CONFIG[params.value]?.color || 'default'}.main`,
          fontWeight: 'bold' 
        }}>
          {STATUS_CONFIG[params.value]?.label || params.value}
        </Box>
      )
    },
    { 
      field: 'frequency_label', 
      headerName: 'Frequenz', 
      width: isMobile ? 0 : 150,
      hide: isMobile
    },
    { 
      field: 'start_date', 
      headerName: 'Startdatum', 
      width: isMobile ? 90 : 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EventIcon color="action" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }} />
          <Typography variant={isMobile ? 'caption' : 'body2'}>
            {params.value}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'end_date', 
      headerName: 'Enddatum', 
      width: isMobile ? 0 : 130,
      hide: isMobile,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EventIcon color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Aktionen',
      width: isMobile ? 60 : 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {isMobile ? (
            <ViewIcon 
              sx={{ 
                fontSize: '1.25rem', 
                color: theme.palette.primary.main,
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPrescription(params.row);
                setMobileDetailOpen(true);
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Klicken für Details
            </Typography>
          )}
        </Box>
      ),
    }
  ];

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
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
        {/* Action Bar */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/prescriptions/new')}
          >
            Neue Verordnung
          </Button>
          <Button
            variant="outlined"
            startIcon={<CameraIcon />}
            onClick={() => setShowOCR(true)}
          >
            OCR hinzufügen
          </Button>
        </Box>
        
        <Box sx={{ mx: 0 }}>
          <Paper elevation={3} sx={{ borderRadius: 2, height: 'calc(100vh - 240px)' }}>
            <DataGrid
              rows={prescriptions}
              columns={columns}
              loading={loading}
              rowCount={totalRows}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              paginationMode="server"
              slots={{
                toolbar: GridToolbar,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              pageSizeOptions={[10, 15, 25, 50, 100]}
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
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: theme.palette.grey[50],
                  borderBottom: `2px solid ${theme.palette.divider}`,
                },
              }}
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
      </Box>

      {/* Mobile Prescription Detail Dialog */}
      <Dialog
        open={mobileDetailOpen}
        onClose={handleMobileDetailClose}
        fullScreen={isSmallMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <AssignmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                Verordnung Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                #{selectedPrescription?.id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedPrescription && (
            <List sx={{ p: 0 }}>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Patient"
                  secondary={selectedPrescription.patient_name}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <TreatmentIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Behandlungsart"
                  secondary={selectedPrescription.treatment_type}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Box>
                    <Chip
                      label={STATUS_CONFIG[selectedPrescription.status]?.label || selectedPrescription.status}
                      color={STATUS_CONFIG[selectedPrescription.status]?.color || 'default'}
                      size="small"
                    />
                  </Box>
                </ListItemAvatar>
                <ListItemText
                  primary="Status"
                  secondary={STATUS_CONFIG[selectedPrescription.status]?.label || selectedPrescription.status}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <EventIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Startdatum"
                  secondary={selectedPrescription.start_date}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <EventIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Enddatum"
                  secondary={selectedPrescription.end_date}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <AssignmentIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Frequenz"
                  secondary={selectedPrescription.frequency_label}
                />
              </ListItem>
            </List>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 0,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1
        }}>
          <Button
            variant="outlined"
            onClick={handleMobileDetailClose}
            fullWidth={isSmallMobile}
          >
            Schließen
          </Button>
          <Button
            variant="contained"
            startIcon={<ViewIcon />}
            onClick={handleMobileViewPrescription}
            fullWidth={isSmallMobile}
          >
            Details anzeigen
          </Button>
        </DialogActions>
      </Dialog>

      {/* OCR Dialog */}
      <Dialog
        open={showOCR}
        onClose={() => setShowOCR(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Rezept per OCR hinzufügen
        </DialogTitle>
        <DialogContent>
          <PrescriptionOCR onPrescriptionCreated={handlePrescriptionCreated} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOCR(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PrescriptionList;
