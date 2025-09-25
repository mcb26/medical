// src/components/AppointmentList.js
import React, { useState, useEffect } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
  Box, 
  Typography, 
  useTheme, 
  useMediaQuery,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { isAuthenticated } from '../services/auth';
import {
  Person as PersonIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  LocalHospital as TreatmentIcon,
  Person as PractitionerIcon,
  Room as RoomIcon,
  Visibility as ViewIcon,
  Code,
  CheckCircle,
  Cancel as CancelIcon
} from '@mui/icons-material';

function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    const fetchAppointments = async () => {
        if (!isAuthenticated()) return;
        
        try {
            setLoading(true);
            const response = await api.get('/appointments/?expand=patient,practitioner,treatment,room');
            const formattedAppointments = response.data.map(appointment => ({
              ...appointment,
              id: appointment.id,
              formattedDate: appointment.appointment_date ? 
                format(new Date(appointment.appointment_date), 'dd.MM.yyyy', { locale: de }) : '-',
              formattedTime: appointment.appointment_date ? 
                format(new Date(appointment.appointment_date), 'HH:mm', { locale: de }) : '-',
              patient_name: appointment.patient && appointment.patient.first_name && appointment.patient.last_name ? 
                `${appointment.patient.first_name} ${appointment.patient.last_name}` : 
                (appointment.patient?.first_name || appointment.patient?.last_name || 'Unbekannt'),
              treatment_name: appointment.treatment && appointment.treatment.treatment_name ? 
                appointment.treatment.treatment_name : 'Unbekannt',
              practitioner_name: appointment.practitioner && appointment.practitioner.first_name && appointment.practitioner.last_name ? 
                `${appointment.practitioner.first_name} ${appointment.practitioner.last_name}` : 
                (appointment.practitioner?.first_name || appointment.practitioner?.last_name || 'Unbekannt'),
              room_name: appointment.room ? appointment.room.name : '-',
              statusDisplay: appointment.status === 'scheduled' ? 'Geplant' :
                            appointment.status === 'completed' ? 'Abgeschlossen' :
                            appointment.status === 'cancelled' ? 'Abgesagt' :
                            appointment.status === 'no_show' ? 'Nicht erschienen' :
                            appointment.status === 'ready_to_bill' ? 'Abrechnungsbereit' : appointment.status,
              billingType: appointment.treatment ? 
                (appointment.treatment.is_self_pay ? 'Selbstzahler' : 
                 appointment.treatment.is_gkv_billable ? 'GKV' : 'Nicht abrechenbar') : 'Unbekannt',
              legsCode: appointment.treatment ? appointment.treatment.legs_code_display : null
            }));
            setAppointments(formattedAppointments);
        } catch (error) {
            console.error('Fehler beim Laden der Termine:', error);
            console.error('Error details:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    fetchAppointments();
  }, [navigate]);

  const handleRowClick = (params) => {
    if (isMobile) {
      setSelectedAppointment(params.row);
      setMobileDetailOpen(true);
    } else {
      navigate(`/appointments/${params.row.id}`);
    }
  };

  const handleMobileDetailClose = () => {
    setMobileDetailOpen(false);
    setSelectedAppointment(null);
  };

  const handleMobileViewAppointment = () => {
    if (selectedAppointment) {
      navigate(`/appointments/${selectedAppointment.id}`);
      handleMobileDetailClose();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'Geplant':
        return 'primary';
      case 'completed':
      case 'Abgeschlossen':
        return 'success';
      case 'cancelled':
      case 'Abgesagt':
        return 'error';
      case 'no_show':
      case 'Nicht erschienen':
        return 'warning';
      case 'ready_to_bill':
      case 'Abrechnungsbereit':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      field: 'formattedDate',
      headerName: 'Datum',
      width: isMobile ? 90 : 120,
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EventIcon color="action" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }} />
          <Typography variant={isMobile ? 'caption' : 'body2'}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'formattedTime',
      headerName: 'Uhrzeit',
      width: isMobile ? 70 : 100,
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TimeIcon color="action" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }} />
          <Typography variant={isMobile ? 'caption' : 'body2'}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'patient_name',
      headerName: 'Patient',
      width: isMobile ? 120 : 200,
      filterable: true,
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
      ),
    },
    {
      field: 'treatment_name',
      headerName: 'Behandlung',
      width: isMobile ? 0 : 200,
      hide: isMobile,
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TreatmentIcon color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'practitioner_name',
      headerName: 'Behandler',
      width: isMobile ? 100 : 180,
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PractitionerIcon color="action" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }} />
          <Typography variant={isMobile ? 'caption' : 'body2'} sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: isMobile ? 60 : 120
          }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'room_name',
      headerName: 'Raum',
      width: isMobile ? 0 : 120,
      hide: isMobile,
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <RoomIcon color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'duration_minutes',
      headerName: 'Dauer',
      width: isMobile ? 60 : 120,
      type: 'number',
      filterable: true,
      renderCell: (params) => (
        <Typography variant={isMobile ? 'caption' : 'body2'}>
          {params.value} Min
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: isMobile ? 100 : 130,
      filterable: true,
      renderCell: (params) => (
        <Chip
          label={params.row.statusDisplay}
          color={getStatusColor(params.value)}
          size={isMobile ? 'small' : 'small'}
          sx={{ 
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            height: isMobile ? 20 : 24
          }}
        />
      ),
    },
    {
      field: 'billingType',
      headerName: 'Abrechnung',
      width: isMobile ? 0 : 150,
      hide: isMobile,
      filterable: true,
      renderCell: (params) => {
        const billingType = params.value;
        const legsCode = params.row.legsCode;
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={billingType}
              color={billingType === 'GKV' ? 'primary' : billingType === 'Selbstzahler' ? 'secondary' : 'default'}
              icon={billingType === 'GKV' ? <CheckCircle /> : billingType === 'Selbstzahler' ? <Code /> : <CancelIcon />}
              size="small"
              variant="outlined"
            />
            {billingType === 'GKV' && legsCode && (
              <Chip
                label={legsCode}
                size="small"
                icon={<Code />}
                sx={{ ml: 0.5 }}
              />
            )}
          </Box>
        );
      },
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
                setSelectedAppointment(params.row);
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

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 }, 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
    }}>
      <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
        <DataGrid
          rows={appointments}
          columns={columns}
          loading={loading}
          rowCount={appointments.length}
          onRowClick={handleRowClick}
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
      </Box>

      {/* Mobile Appointment Detail Dialog */}
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
              <EventIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                Termin Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                #{selectedAppointment?.id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedAppointment && (
            <List sx={{ p: 0 }}>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <EventIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Datum"
                  secondary={selectedAppointment.formattedDate}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <TimeIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Uhrzeit"
                  secondary={selectedAppointment.formattedTime}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Patient"
                  secondary={selectedAppointment.patient_name}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <TreatmentIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Behandlung"
                  secondary={selectedAppointment.treatment_name}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <PractitionerIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Behandler"
                  secondary={selectedAppointment.practitioner_name}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <RoomIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Raum"
                  secondary={selectedAppointment.room_name}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <TimeIcon color="action" />
                </ListItemAvatar>
                <ListItemText
                  primary="Dauer"
                  secondary={`${selectedAppointment.duration_minutes} Minuten`}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Box>
                    <Chip
                      label={selectedAppointment.statusDisplay}
                      color={getStatusColor(selectedAppointment.status)}
                      size="small"
                    />
                  </Box>
                </ListItemAvatar>
                <ListItemText
                  primary="Status"
                  secondary={selectedAppointment.statusDisplay}
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
            onClick={handleMobileViewAppointment}
            fullWidth={isSmallMobile}
          >
            Details anzeigen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AppointmentList;
