import React from 'react';
import { Drawer, List, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import {
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Feed as FeedIcon,
  Spa as SpaIcon,
  Medication as MedicationIcon,
  Leaderboard as LeaderboardIcon,
  TableChart as TableChartIcon,
  Euro as EuroIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

function SidebarMenu({ drawerOpen, toggleDrawer }) {
  const menuItems = [
    { text: 'Start', icon: <HomeIcon />, path: '/' },
    { text: 'Kalender', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Termine', icon: <CalendarIcon />, path: '/appointments' },
    { text: 'Verordnungen', icon: <FeedIcon />, path: '/prescriptions' },
    { text: 'Patienten', icon: <PeopleIcon />, path: '/patients' },
    { text: 'Krankenkassen', icon: <SpaIcon />, path: '/insurance-management' },
    { text: 'Heilmittel', icon: <MedicationIcon />, path: '/treatments' },
    { text: 'Finanzen', icon: <EuroIcon />, path: '/finance' },
    { text: 'Daten', icon: <TableChartIcon />, path: '/dataoverview' },
    { text: 'Abrechnungen', icon: <EuroIcon />, path: '/billing-cycles' },
    { text: 'Praxis', icon: <BusinessIcon />, path: '/practice' },
  ];

  return (
    <Drawer open={drawerOpen} onClose={toggleDrawer}>
      <List style={{ backgroundColor: '#f4f4f4' }}>
        {menuItems.map((item, index) => (
          <ListItemButton
            key={index}
            component={Link}
            to={item.path}
            onClick={toggleDrawer}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

export default SidebarMenu;
