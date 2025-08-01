import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton, 
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Feed as FeedIcon,
  Spa as SpaIcon,
  Medication as MedicationIcon,
  Leaderboard as LeaderboardIcon,
  TableChart as TableChartIcon,
  Euro as EuroIcon,
  Business as BusinessIcon,
  LocalHospital as HospitalIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { getUserInitials, getUserFullName } from '../services/auth';
import UserAvatar from './common/UserAvatar';
import { useAdminPermissions } from '../hooks/usePermissions';

function SidebarMenu({ drawerOpen, toggleDrawer }) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [userInitials, setUserInitials] = useState('U');
  const [userFullName, setUserFullName] = useState('Unbekannter Benutzer');
  const { canAccessAdminPanel } = useAdminPermissions();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <HomeIcon />,
      path: '/',
      description: 'Übersicht und Statistiken'
    },
    {
      text: 'Kalender',
      icon: <CalendarIcon />,
      path: '/calendar',
      description: 'Terminplanung und Übersicht'
    },
    {
      text: 'Termine',
      icon: <EventIcon />,
      path: '/appointments',
      description: 'Terminverwaltung'
    },
    {
      text: 'Patienten',
      icon: <PeopleIcon />,
      path: '/patients',
      description: 'Patientendaten verwalten'
    },
    {
      text: 'Verordnungen',
      icon: <FeedIcon />,
      path: '/prescriptions',
      description: 'Verordnungen und Rezepte'
    },
    {
      text: 'Heilmittel',
      icon: <MedicationIcon />,
      path: '/treatments',
      description: 'Behandlungen und Therapien'
    },
    {
      text: 'Krankenkassen',
      icon: <SpaIcon />,
      path: '/insurance-management',
      description: 'Versicherungsverwaltung'
    },
    {
      text: 'Finanzen',
      icon: <EuroIcon />,
      path: '/finance',
      description: 'Finanzübersicht und Abrechnung'
    },
    {
      text: 'Benachrichtigungen',
      icon: <NotificationsIcon />,
      path: '/notifications',
      description: 'Benachrichtigungen verwalten'
    },
    // Admin-Panel nur für Admins sichtbar
    ...(canAccessAdminPanel ? [{
      text: 'Admin-Panel',
      icon: <AdminIcon />,
      path: '/admin-panel',
      description: 'Globale Benutzerverwaltung und Systemeinstellungen'
    }] : []),
    {
      text: 'Abrechnungen',
      icon: <AssessmentIcon />,
      path: '/billing-cycles',
      description: 'Abrechnungszyklen'
    },
    {
      text: 'Daten',
      icon: <TableChartIcon />,
      path: '/dataoverview',
      description: 'Datenanalyse und Berichte'
    },
    {
      text: 'Praxis',
      icon: <BusinessIcon />,
      path: '/practice',
      description: 'Praxiseinstellungen'
    },
  ];

  // Benutzerinformationen beim Mounten laden
  useEffect(() => {
    const loadUserInfo = () => {
      const initials = getUserInitials();
      const fullName = getUserFullName();
      setUserInitials(initials);
      setUserFullName(fullName);
    };

    loadUserInfo();
    
    // Event Listener für Storage-Änderungen
    const handleStorageChange = (e) => {
      if (e.key === 'userProfile') {
        loadUserInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
      <Box sx={{ 
        p: 3, 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <UserAvatar 
          size="large"
          variant="sidebar"
          showTooltip={false}
          sx={{ 
            mx: 'auto', 
            mb: 2,
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          MediCal
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
          {userFullName}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Praxisverwaltung
        </Typography>
      </Box>

      <Divider />

      {/* Menu Items */}
      <List sx={{
        flexGrow: 1,
        py: 1,
        backgroundColor: theme.palette.background.paper,
      }}>
        {menuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Tooltip
              key={index}
              title={isMobile ? item.description : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={toggleDrawer}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  backgroundColor: active ? theme.palette.primary[50] : 'transparent',
                  color: active ? theme.palette.primary.main : theme.palette.text.primary,
                  border: active ? `1px solid ${theme.palette.primary[200]}` : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: active ? theme.palette.primary[100] : theme.palette.grey[50],
                    transform: 'translateX(4px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                  '& .MuiListItemIcon-root': {
                    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: active ? 600 : 500,
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 40,
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.25rem',
                  }
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  secondary={!isMobile && item.description}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: theme.palette.text.secondary,
                    display: isMobile ? 'none' : 'block',
                  }}
                />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.grey[50],
      }}>
        <Typography variant="caption" sx={{
          color: theme.palette.text.secondary,
          textAlign: 'center',
          display: 'block',
        }}>
          Version 2.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      open={drawerOpen}
      onClose={toggleDrawer}
      variant={isMobile ? "temporary" : "persistent"}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: 280, sm: 320 },
          boxSizing: 'border-box',
          borderRight: 'none',
          background: theme.palette.background.paper,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          // Abstand für die HeaderBar hinzufügen
          top: { xs: 56, sm: 64 },
          height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default SidebarMenu;
