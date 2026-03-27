import React, { useState } from 'react';
import { Box, Tabs, Tab, Divider } from '@mui/material';
import LoadChangeForm from './LoadChangeForm';
import NameChangeForm from './NameChangeForm';
import CategoryChangeForm from './CategoryChangeForm';
import ReconnectionForm from './ReconnectionForm';
import MeterReadingForm from './MeterReadingForm';

const tabs = [
  { label: 'Change of Load', Component: LoadChangeForm },
  { label: 'Change of Name / Transfer', Component: NameChangeForm },
  { label: 'Change Tariff Category', Component: CategoryChangeForm },
  { label: 'Reconnection', Component: ReconnectionForm },
  { label: 'Submit Meter Reading', Component: MeterReadingForm },
];

const ElectricityConnectionMgmtForm = ({ onClose }) => {
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
              color: '#2a436f !important',
              fontWeight: 700,
              textTransform: 'none',
              '&.Mui-selected': {
                color: '#0f4aa6 !important',
              },
            },
            '& .MuiTabs-scrollButtons': {
              color: '#2a436f',
            },
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

export default ElectricityConnectionMgmtForm;
