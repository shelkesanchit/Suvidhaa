import React, { useState } from 'react';
import { Box, Tabs, Tab, Divider } from '@mui/material';
import BillPaymentForm from './BillPaymentForm';
import PrepaidRechargeForm from './PrepaidRechargeForm';
import BillCalculator from './BillCalculator';

const tabs = [
  { label: 'Pay Electricity Bill', Component: BillPaymentForm },
  { label: 'Prepaid Meter Recharge', Component: PrepaidRechargeForm },
  { label: 'Bill Calculator', Component: BillCalculator },
];

const ElectricityBillingForm = ({ onClose }) => {
  const [tab, setTab] = useState(0);
  const { Component } = tabs[tab];

  return (
    <Box>
      <Box sx={{ bgcolor: '#eaf2ff', borderBottom: '1px solid #cfe0ff' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: '#0f4aa6', height: 3 } }}
          sx={{
            '& .MuiTab-root': {
              color: '#2a436f',
              fontWeight: 700,
              textTransform: 'none',
              '&.Mui-selected': { color: '#0f4aa6' },
            },
            '& .MuiTabs-scrollButtons': { color: '#2a436f' },
          }}
        >
          {tabs.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>
      </Box>
      <Divider />
      <Component onClose={onClose} />
    </Box>
  );
};

export default ElectricityBillingForm;
