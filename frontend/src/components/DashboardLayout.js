import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import HeaderBar from './HeaderBar';
import FooterBar from './FooterBar';
import SidebarMenu from './SidebarMenu';
import { Outlet, useLocation } from 'react-router-dom'; 

function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();  // Get the current route

  // Function to toggle the sidebar
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Determine the title based on the route
  const getTitle = () => {
    if (location.pathname === "/calendar") {
      return "Kalender";
    } else if (location.pathname.startsWith("/patients")) {
      return "Patienten";
    } else if (location.pathname === "/settings") {
      return "Einstellungen";
    } else if (location.pathname === "/profile") {
      return "Profil";
    } else if (location.pathname.startsWith("/treatment")) {
      return "Heilmittel";
    } else if (location.pathname.startsWith("/prescriptions")) {
      return "Verordnungen";
    } else {
      return "MediCal";  // Default title
    }
  };

  // Determine if the plus icon should be shown
  const showAddIcon = () => {
    return ["/patients", "/calendar", "/treatments", "/prescriptions"].some(route => location.pathname.startsWith(route));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Header Bar with dynamic title and add icon */}
      <HeaderBar toggleDrawer={toggleDrawer} title={getTitle()} showAddIcon={showAddIcon()} />

      {/* Sidebar Menu */}
      <SidebarMenu drawerOpen={drawerOpen} toggleDrawer={toggleDrawer} />

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />  {/* Render the content for the current route */}
      </Box>

      {/* Footer Bar */}
      <FooterBar />
    </Box>
  );
}

export default DashboardLayout;
