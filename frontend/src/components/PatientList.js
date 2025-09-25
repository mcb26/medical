import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
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
  Divider
} from '@mui/material';
import { useToastActions } from './common/ToastNotifications';
import {
  Person as PersonIcon,
  LocalHospital,
  Email,
  Phone,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { isAuthenticated } from '../services/auth';
import UnifiedPageLayout from './common/UnifiedPageLayout';
import ModernButton from './common/ModernButton';
import { Add as AddIcon } from '@mui/icons-material';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showError } = useToastActions();

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/patients/');
      const formattedPatients = response.data.map(patient => ({
        ...patient,
        fullName: `${patient.first_name} ${patient.last_name}`,
        age: patient.date_of_birth ? 
          Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 
          null,
        formattedDateOfBirth: patient.date_of_birth ? 
          format(new Date(patient.date_of_birth), 'dd.MM.yyyy', { locale: de }) : 
          '-',
        insuranceDisplay: patient.insurance_provider_name || 'Keine Versicherung',
        statusDisplay: patient.status || 'Aktiv'
      }));
      setPatients(formattedPatients);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Patienten:', error);
      showError('Fehler beim Laden der Patienten');
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchPatients();
  }, [navigate, fetchPatients]);

  const handleRowClick = (params) => {
    if (isMobile) {
      setSelectedPatient(params.row);
      setMobileDetailOpen(true);
    } else {
      navigate(`/patients/${params.row.id}`);
    }
  };

  const handleMobileDetailClose = () => {
    setMobileDetailOpen(false);
    setSelectedPatient(null);
  };

  const handleMobileDetailView = () => {
    if (selectedPatient) {
      navigate(`/patients/${selectedPatient.id}`);
    }
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      sortable: true,
    },
    {
      field: 'fullName',
      headerName: 'Name',
      width: 200,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {params.value}
            </Typography>
            {params.row.age && (
              <Typography variant="caption" color="text.secondary">
                {params.row.age} Jahre
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'formattedDateOfBirth',
      headerName: 'Geburtsdatum',
      width: 120,
      sortable: true,
    },
    {
      field: 'insuranceDisplay',
      headerName: 'Versicherung',
      width: 180,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color={params.value === 'Keine Versicherung' ? 'error' : 'primary'}
        />
      ),
    },
    {
      field: 'phone_number',
      headerName: 'Telefon',
      width: 140,
      sortable: true,
    },
    {
      field: 'email',
      headerName: 'E-Mail',
      width: 200,
      sortable: true,
    },
    {
      field: 'statusDisplay',
      headerName: 'Status',
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Aktiv' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Aktionen',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Details anzeigen">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/patients/${params.row.id}`);
              }}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }
  ];

  const actions = [
    {
      label: 'Neuer Patient',
      variant: 'contained',
      icon: <AddIcon />,
      onClick: () => navigate('/patients/new'),
    },
  ];

  return (
    <UnifiedPageLayout
      title="Patienten"
      subtitle="Verwalten Sie Ihre Patienten und deren Daten"
      actions={actions}
      onRefresh={fetchPatients}
      showDataGrid={true}
      dataGridProps={{
        rows: patients,
        columns: columns,
        loading: loading,
        rowCount: patients.length,
        onRowClick: handleRowClick,
      }}
    >
      {/* Mobile Patient Detail Dialog */}
      <Dialog
        open={mobileDetailOpen}
        onClose={handleMobileDetailClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedPatient?.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Patient #{selectedPatient?.id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <CalendarIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Geburtsdatum"
                  secondary={selectedPatient.formattedDateOfBirth}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <LocalHospital />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Versicherung"
                  secondary={selectedPatient.insuranceDisplay}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <Phone />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Telefon"
                  secondary={selectedPatient.phone_number || 'Nicht angegeben'}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                    <Email />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="E-Mail"
                  secondary={selectedPatient.email || 'Nicht angegeben'}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <HomeIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Adresse"
                  secondary={selectedPatient.address || 'Nicht angegeben'}
                />
              </ListItem>
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <ModernButton onClick={handleMobileDetailClose}>
            Schließen
          </ModernButton>
          <ModernButton
            variant="contained"
            onClick={handleMobileDetailView}
          >
            Details anzeigen
          </ModernButton>
        </DialogActions>
      </Dialog>
    </UnifiedPageLayout>
  );
}

export default PatientList;
