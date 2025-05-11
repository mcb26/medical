import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import PaymentForm from './PaymentForm';
import InvoiceList from './InvoiceList';
import BillingCycleForm from './BillingCycleForm';
import CopaymentForm from './CopaymentForm';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      sx={{ mt: 3 }}
    >
      {value === index && (
        <Box>
          <Typography>{children}</Typography>
        </Box>
      )}
    </Box>
  );
}

function FinanceTabs() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Tabs value={value} onChange={handleChange} centered>
        <Tab label="Payments" />
        <Tab label="Invoices" />
        <Tab label="Billing Cycles" />
        <Tab label="Co-payments" />
      </Tabs>

      <TabPanel value={value} index={0}>
        <PaymentForm />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <InvoiceList />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <BillingCycleForm />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <CopaymentForm />
      </TabPanel>
    </Box>
  );
}

export default FinanceTabs;
