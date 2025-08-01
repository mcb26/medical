import React, { useState } from 'react';
import { Box, CssBaseline, useTheme, useMediaQuery } from '@mui/material';
import HeaderBar from './HeaderBar';
import FooterBar from './FooterBar';
import SidebarMenu from './SidebarMenu';
import { Outlet, useLocation } from 'react-router-dom'; 

function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Function to toggle the sidebar
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Determine the title based on the route
  const getTitle = () => {
    const pathMap = {
      "/": "Dashboard",
      "/calendar": "Kalender",
      "/appointments": "Termine",
      "/patients": "Patienten",
      "/prescriptions": "Verordnungen",
      "/treatments": "Heilmittel",
      "/insurance-management": "Krankenkassen",
      "/finance": "Finanzen",
      "/billing-cycles": "Abrechnungen",
      "/dataoverview": "Daten",
      "/practice": "Praxis",
      "/settings": "Einstellungen",
      "/profile": "Profil",
    };

    // Check for exact matches first
    if (pathMap[location.pathname]) {
      return pathMap[location.pathname];
    }

    // Check for path starts with
    for (const [path, title] of Object.entries(pathMap)) {
      if (location.pathname.startsWith(path) && path !== "/") {
        return title;
      }
    }

    return "MediCal"; // Default title
  };

  // Determine if the plus icon should be shown
  const showAddIcon = () => {
    const addIconRoutes = [
      "/patients", 
      "/calendar", 
      "/appointments",
      "/treatments", 
      "/prescriptions",
      "/insurance-providers",
      "/insurance-groups",
      "/categories",
      "/specializations",
      "/icdcodes",
      "/diagnosis-groups",
      "/surcharges",
      "/emergency-contacts",
      "/working-hours",
      "/doctors"
    ];
    
    return addIconRoutes.some(route => location.pathname.startsWith(route));
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
    }}>
      <CssBaseline />

      {/* Header Bar with dynamic title and add icon */}
      <HeaderBar 
        toggleDrawer={toggleDrawer} 
        title={getTitle()} 
        showAddIcon={showAddIcon()} 
      />

      {/* Sidebar Menu */}
      <SidebarMenu 
        drawerOpen={drawerOpen} 
        toggleDrawer={toggleDrawer} 
      />

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          mt: { xs: 7, sm: 8 }, // Adjust top margin for header height
          ml: { 
            xs: 0, 
            md: drawerOpen ? '320px' : 0 
          }, // Adjust for sidebar
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          minHeight: 'calc(100vh - 64px)', // Subtract header height
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Outlet />
      </Box>

      {/* Footer Bar - Only show on larger screens */}
      {!isMobile && <FooterBar />}
    </Box>
  );
}

export default DashboardLayout;
