import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
  IconButton,
  Collapse,
  Typography
} from '@mui/material';
import {
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Feed as FeedIcon,
  Spa as SpaIcon,
  Euro as EuroIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminIcon,
  Assessment as AssessmentIcon,
  TableChart as TableChartIcon,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  ExpandLess,
  ExpandMore,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function SidebarMenu({ drawerOpen, toggleDrawer }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { permissions, hasPermission } = usePermissions();
  const [expandedItems, setExpandedItems] = useState({});

  // Event Listener für Permissions-Updates
  useEffect(() => {
    const handlePermissionsUpdate = () => {
      // Permissions wurden aktualisiert
    };

    window.addEventListener('permissions-updated', handlePermissionsUpdate);
    return () => {
      window.removeEventListener('permissions-updated', handlePermissionsUpdate);
    };
  }, []);

  // Verbesserte Menü-Struktur mit Gruppierung
  const menuItems = [
    {
      group: 'Hauptfunktionen',
      items: [
        {
          text: 'Dashboard',
          icon: <HomeIcon />,
          path: '/',
          description: 'Übersicht und Statistiken',
          badge: null
        },
        {
          text: 'Kalender',
          icon: <CalendarIcon />,
          path: '/calendar',
          description: 'Terminplanung und Übersicht',
          badge: null
        },
        {
          text: 'Termine',
          icon: <EventIcon />,
          path: '/appointments',
          description: 'Terminverwaltung',
          badge: null
        }
      ]
    },
    {
      group: 'Patientenverwaltung',
      items: [
        {
          text: 'Patienten',
          icon: <PeopleIcon />,
          path: '/patients',
          description: 'Patientendaten verwalten',
          badge: null
        },
        {
          text: 'Verordnungen',
          icon: <FeedIcon />,
          path: '/prescriptions',
          description: 'Verordnungen und Rezepte',
          badge: null
        },
        {
          text: 'Heilmittel',
          icon: <SpaIcon />,
          path: '/treatments',
          description: 'Behandlungen und Therapien',
          badge: null
        }
      ]
    },
    {
      group: 'Verwaltung',
      items: [
        {
          text: 'Krankenkassen',
          icon: <SpaIcon />,
          path: '/insurance-management',
          description: 'Versicherungsverwaltung',
          badge: null
        },
        {
          text: 'Finanzen',
          icon: <EuroIcon />,
          path: '/finance',
          description: 'Finanzübersicht und Abrechnung',
          badge: null
        },
        {
          text: 'Abrechnungen',
          icon: <AssessmentIcon />,
          path: '/billing-cycles',
          description: 'Abrechnungszyklen',
          badge: null
        },
        {
          text: 'Rechnungsübersicht',
          icon: <ReceiptIcon />,
          path: '/invoices',
          description: 'Alle Rechnungen und Zahlungsbuchung',
          badge: null
        },
        {
          text: 'Zuzahlungsrechnungen',
          icon: <ReceiptIcon />,
          path: '/copay-invoices',
          description: 'Zuzahlungsrechnungen aus Terminen erstellen',
          badge: null
        }
      ]
    },
    {
      group: 'System',
      items: [
        {
          text: 'Absagen-Management',
          icon: <ScheduleIcon />,
          path: '/waitlist',
          description: 'Warteliste für Terminabsagen',
          badge: null
        },
        {
          text: 'Benachrichtigungen',
          icon: <NotificationsIcon />,
          path: '/notifications',
          description: 'Benachrichtigungen verwalten',
          badge: null
        },
        {
          text: 'Admin-Panel',
          icon: <AdminIcon />,
          path: '/admin-panel',
          description: 'Globale Benutzerverwaltung und Systemeinstellungen',
          badge: null
        },
        {
          text: 'Daten',
          icon: <TableChartIcon />,
          path: '/dataoverview',
          description: 'Datenübersicht und Analysen',
          badge: null
        },
        {
          text: 'Einstellungen',
          icon: <SettingsIcon />,
          path: '/settings',
          description: 'Systemeinstellungen',
          badge: null
        }
      ]
    }
  ];

  // Toggle für expandierte Menü-Items
  const handleExpandToggle = (groupName) => {
    setExpandedItems(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Navigation-Handler
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      toggleDrawer(); // Schließe Sidebar auf Mobile
    }
  };

  // Prüfe ob ein Menü-Item aktiv ist
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Prüfe Berechtigungen für ein Menü-Item
  const hasAccess = (item) => {
    // Dashboard ist immer verfügbar
    if (item.path === '/') return true;
    
    // Mapping von Pfaden zu Berechtigungen
    const permissionMap = {
      '/calendar': ['appointments', 'read'],
      '/appointments': ['appointments', 'read'],
      '/patients': ['patients', 'read'],
      '/prescriptions': ['prescriptions', 'read'],
      '/treatments': ['treatments', 'read'],
      '/insurance-management': ['insurance', 'read'],
      '/finance': ['finance', 'read'],
      '/billing-cycles': ['billing', 'read'],
      '/waitlist': ['appointments', 'read'],
      '/notifications': ['notifications', 'read'],
      '/admin-panel': ['users', 'read'],
      '/dataoverview': ['reports', 'read'],
      '/settings': ['settings', 'read']
    };

    const [module, action] = permissionMap[item.path] || ['general', 'read'];
    return hasPermission(module, action);
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "persistent"}
      open={drawerOpen}
      onClose={toggleDrawer}
      sx={{
        width: drawerOpen ? 320 : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          overflowX: 'hidden',
          transition: theme.transitions.create(['width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Box sx={{ overflow: 'auto', height: '100%' }}>
        {/* Logo/Branding Bereich */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            MediCal
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Praxisverwaltung
          </Typography>
        </Box>

        {/* Menü-Items */}
        <List sx={{ pt: 1 }}>
          {menuItems.map((group, groupIndex) => (
            <Box key={groupIndex}>
              {/* Gruppen-Header */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  backgroundColor: theme.palette.grey[50],
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {group.group}
                </Typography>
              </Box>

              {/* Gruppen-Items */}
              <Collapse in={expandedItems[group.group] !== false}>
                {group.items.map((item, itemIndex) => {
                  const isItemActive = isActive(item.path);
                  const hasItemAccess = hasAccess(item);

                  if (!hasItemAccess) return null;

                  return (
                    <ListItem
                      key={itemIndex}
                      disablePadding
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <Tooltip
                        title={item.description}
                        placement="right"
                        arrow
                        disableHoverListener={drawerOpen}
                      >
                        <ListItemButton
                          onClick={() => handleNavigation(item.path)}
                          selected={isItemActive}
                          sx={{
                            pl: 3,
                            pr: 2,
                            py: 1.5,
                            minHeight: 48,
                            '&.Mui-selected': {
                              backgroundColor: theme.palette.primary.light,
                              color: theme.palette.primary.contrastText,
                              '&:hover': {
                                backgroundColor: theme.palette.primary.main,
                              },
                              '& .MuiListItemIcon-root': {
                                color: theme.palette.primary.contrastText,
                              },
                            },
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 40,
                              color: isItemActive 
                                ? theme.palette.primary.contrastText 
                                : theme.palette.text.secondary,
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isItemActive ? 600 : 400,
                            }}
                          />
                          {item.badge && (
                            <ListItemSecondaryAction>
                              <Badge
                                badgeContent={item.badge}
                                color="error"
                                sx={{
                                  '& .MuiBadge-badge': {
                                    fontSize: '0.75rem',
                                    minWidth: 20,
                                    height: 20,
                                  },
                                }}
                              />
                            </ListItemSecondaryAction>
                          )}
                          {isItemActive && (
                            <ArrowRightIcon
                              sx={{
                                fontSize: 16,
                                color: theme.palette.primary.contrastText,
                                ml: 1,
                              }}
                            />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    </ListItem>
                  );
                })}
              </Collapse>

              {/* Divider zwischen Gruppen */}
              {groupIndex < menuItems.length - 1 && (
                <Divider sx={{ my: 1 }} />
              )}
            </Box>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

export default SidebarMenu;
