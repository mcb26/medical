import React, { useState, useEffect } from 'react';
import { 
  Box, 
  useTheme, 
  useMediaQuery,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { isAuthenticated } from '../services/auth';
import UnifiedPageLayout from './common/UnifiedPageLayout';
import ModernButton from './common/ModernButton';
import {
  LocalHospital as TreatmentIcon,
  Category as CategoryIcon,
  AccessTime as DurationIcon,
  Euro as PriceIcon,
  Description as DescriptionIcon,
  CheckCircle as InsuranceIcon,
  Add as AddIcon
} from '@mui/icons-material';

function TreatmentList() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchTreatments();
  }, [navigate]);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/treatments/');
      const formattedTreatments = response.data.map(treatment => ({
        ...treatment,
        categoryDisplay: treatment.category_name || 'Keine Kategorie',
        insuranceDisplay: treatment.is_covered_by_insurance ? 'Versichert' : 'Privat',
        priceDisplay: `${treatment.price?.toFixed(2)} €`,
        durationDisplay: treatment.duration ? `${treatment.duration} Min.` : 'Nicht angegeben'
      }));
      setTreatments(formattedTreatments);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Behandlungen:', error);
      setLoading(false);
    }
  };

  const handleRowClick = (params) => {
    if (isMobile) {
      setSelectedTreatment(params.row);
      setMobileDetailOpen(true);
    } else {
      navigate(`/treatments/${params.row.id}`);
    }
  };

  const handleMobileDetailClose = () => {
    setMobileDetailOpen(false);
    setSelectedTreatment(null);
  };

  const handleMobileDetailView = () => {
    if (selectedTreatment) {
      navigate(`/treatments/${selectedTreatment.id}`);
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
      field: 'treatment_name',
      headerName: 'Behandlung',
      width: 250,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
            <TreatmentIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {params.value}
            </Typography>
            {params.row.code && (
              <Typography variant="caption" color="text.secondary">
                Code: {params.row.code}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'categoryDisplay',
      headerName: 'Kategorie',
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          icon={<CategoryIcon />}
        />
      ),
    },
    {
      field: 'priceDisplay',
      headerName: 'Preis',
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PriceIcon color="action" sx={{ fontSize: '1rem' }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'durationDisplay',
      headerName: 'Dauer',
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <DurationIcon color="action" sx={{ fontSize: '1rem' }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'insuranceDisplay',
      headerName: 'Versicherung',
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Versichert' ? 'success' : 'warning'}
          icon={<InsuranceIcon />}
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
          <ModernButton
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/treatments/${params.row.id}`);
            }}
          >
            Details
          </ModernButton>
        </Box>
      ),
    }
  ];

  const actions = [
    {
      label: 'Neue Behandlung',
      variant: 'contained',
      icon: <AddIcon />,
      onClick: () => navigate('/treatments/new'),
    },
  ];

  return (
    <UnifiedPageLayout
      title="Behandlungen"
      subtitle="Verwalten Sie Ihre Behandlungen und Therapien"
      actions={actions}
      onRefresh={fetchTreatments}
      showDataGrid={true}
      dataGridProps={{
        rows: treatments,
        columns: columns,
        loading: loading,
        rowCount: treatments.length,
        onRowClick: handleRowClick,
      }}
    >
      {/* Mobile Treatment Detail Dialog */}
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
              <TreatmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedTreatment?.treatment_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Behandlung #{selectedTreatment?.id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTreatment && (
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <CategoryIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Kategorie"
                  secondary={selectedTreatment.categoryDisplay}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <PriceIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Preis"
                  secondary={selectedTreatment.priceDisplay}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <DurationIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Dauer"
                  secondary={selectedTreatment.durationDisplay}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                    <InsuranceIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Versicherung"
                  secondary={selectedTreatment.insuranceDisplay}
                />
              </ListItem>
              {selectedTreatment.description && (
                <>
                  <Divider />
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        <DescriptionIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Beschreibung"
                      secondary={selectedTreatment.description}
                    />
                  </ListItem>
                </>
              )}
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

export default TreatmentList;
