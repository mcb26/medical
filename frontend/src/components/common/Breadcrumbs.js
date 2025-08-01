import React from 'react';
import { 
  Breadcrumbs as MuiBreadcrumbs, 
  Link, 
  Typography, 
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

// Breadcrumb-Item Komponente
const BreadcrumbItem = ({ item, isLast, isHome = false }) => {
  const theme = useTheme();
  
  if (isLast) {
    return (
      <Typography
        variant="body2"
        color="text.primary"
        sx={{
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {isHome && <HomeIcon sx={{ fontSize: 16 }} />}
        {item.label}
      </Typography>
    );
  }

  return (
    <Link
      component={RouterLink}
      to={item.path}
      color="inherit"
      underline="hover"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        color: 'text.secondary',
        '&:hover': {
          color: 'primary.main',
        },
        transition: 'color 0.2s ease-in-out',
      }}
    >
      {isHome && <HomeIcon sx={{ fontSize: 16 }} />}
      {item.label}
    </Link>
  );
};

// Hauptkomponente
export const Breadcrumbs = ({ 
  items = [], 
  showHome = true,
  maxItems = 5,
  separator = <NavigateNextIcon fontSize="small" />,
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();

  // Automatische Breadcrumbs basierend auf URL
  const generateBreadcrumbsFromPath = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    if (showHome) {
      breadcrumbs.push({
        label: 'Start',
        path: '/',
        isHome: true
      });
    }

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Label aus Segment generieren
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        label,
        path: currentPath,
        isHome: false
      });
    });

    return breadcrumbs;
  };

  // Verwende bereitgestellte Items oder generiere automatisch
  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbsFromPath();

  // Begrenze die Anzahl der Items auf mobilen Geräten
  const displayItems = isMobile ? breadcrumbItems.slice(-2) : breadcrumbItems;

  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <Box
      sx={{
        py: 2,
        px: { xs: 2, sm: 3 },
        backgroundColor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        ...sx
      }}
    >
      <MuiBreadcrumbs
        separator={separator}
        maxItems={maxItems}
        itemsBeforeCollapse={1}
        itemsAfterCollapse={2}
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
            mx: { xs: 0.5, sm: 1 },
          },
        }}
      >
        {displayItems.map((item, index) => (
          <BreadcrumbItem
            key={item.path}
            item={item}
            isLast={index === displayItems.length - 1}
            isHome={item.isHome}
          />
        ))}
      </MuiBreadcrumbs>
    </Box>
  );
};

// Spezielle Breadcrumbs für verschiedene Seiten
export const PatientBreadcrumbs = ({ patientName, isDetail = false }) => {
  const items = [
    { label: 'Start', path: '/', isHome: true },
    { label: 'Patienten', path: '/patients' },
  ];

  if (isDetail && patientName) {
    items.push({ label: patientName, path: '/patients/detail' });
  }

  return <Breadcrumbs items={items} />;
};

export const AppointmentBreadcrumbs = ({ appointmentTitle, isDetail = false }) => {
  const items = [
    { label: 'Start', path: '/', isHome: true },
    { label: 'Termine', path: '/appointments' },
  ];

  if (isDetail && appointmentTitle) {
    items.push({ label: appointmentTitle, path: '/appointments/detail' });
  }

  return <Breadcrumbs items={items} />;
};

export const PrescriptionBreadcrumbs = ({ prescriptionTitle, isDetail = false }) => {
  const items = [
    { label: 'Start', path: '/', isHome: true },
    { label: 'Verordnungen', path: '/prescriptions' },
  ];

  if (isDetail && prescriptionTitle) {
    items.push({ label: prescriptionTitle, path: '/prescriptions/detail' });
  }

  return <Breadcrumbs items={items} />;
};

export default Breadcrumbs; 