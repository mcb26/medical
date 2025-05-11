import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import PatientAnalysis from './PatientAnalysis';  // Import the PatientAnalysis component

function AnalysisTabs() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <PatientAnalysis />;
      case 1:
        return (
          <Typography variant="body1">Appointment Overview content goes here.</Typography>
        );
      case 2:
        return (
          <Typography variant="body1">Financial Reports content goes here.</Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        centered
        aria-label="Analysis Tabs"
      >
        <Tab label="Patient Analysis" />
        <Tab label="Appointment Overview" />
        <Tab label="Financial Reports" />
      </Tabs>
      <Box p={3}>{renderTabContent()}</Box>
    </Box>
  );
}

export default AnalysisTabs;
