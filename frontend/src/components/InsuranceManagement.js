import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InsuranceGroupList from './InsuranceGroupList';
import InsuranceProviderList from './InsuranceProviderList';
import { Add as AddIcon } from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`insurance-tabpanel-${index}`}
      aria-labelledby={`insurance-tab-${index}`}
      sx={{ mt: 2 }}
    >
      {value === index && (
        <Paper elevation={2}>
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

function InsuranceManagement() {
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddNew = () => {
    if (tabValue === 0) {
      navigate('/insurance-groups/new');
    } else {
      navigate('/insurance-providers/new');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Krankenkassen-Verwaltung</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          {tabValue === 0 ? 'Neue Gruppe' : 'Neue Krankenkasse'}
        </Button>
      </Box>

      <Paper elevation={2}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="insurance management tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Krankenkassengruppen" />
          <Tab label="Krankenkassen" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <InsuranceGroupList />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <InsuranceProviderList />
      </TabPanel>
    </Box>
  );
}

export default InsuranceManagement;
