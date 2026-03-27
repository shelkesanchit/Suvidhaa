import React, { useState } from 'react';
import { Box, Tabs, Tab, Divider } from '@mui/material';
import ComplaintForm from './ComplaintForm';

const tabs = [
  { label: 'Register Complaint / Report Issue', Component: ComplaintForm },
];

const ElectricityComplaintsForm = ({ onClose }) => {
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

export default ElectricityComplaintsForm;
