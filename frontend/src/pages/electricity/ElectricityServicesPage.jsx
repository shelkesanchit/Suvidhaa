import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  AppBar,
  Toolbar,
  Button,
  Dialog,
  Fade,
  IconButton,
  Slide,
} from '@mui/material';
import {
  Power as PowerIcon,
  ElectricBolt as BoltIcon,
  Payment as PaymentIcon,
  Report as ReportIcon,
  Build as BuildIcon,
  WbSunny as SolarIcon,
  ArrowBack as BackIcon,
  Close as CloseIcon,
  TrackChanges as TrackIcon,
} from '@mui/icons-material';

import {
  ElectricityBillingForm,
  ElectricityNewConnectionsForm,
  ElectricityConnectionMgmtForm,
  ElectricityComplaintsForm,
  ElectricityValueAddedForm,
  TrackingForm,
} from '../../components/electricity';

import { useServiceAutoOpen } from '../../components/voice/useServiceAutoOpen';
import { useAccessibilityServicePage } from '../../components/accessibility';

const services = [
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Pay bills, recharge prepaid meter, pay installments, multiple consumers, bill calculator',
    icon: PaymentIcon,
    color: '#1565c0',
    gradient: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)',
    component: ElectricityBillingForm,
  },
  {
    id: 'new_connections',
    title: 'New Connections',
    description: 'Apply for domestic/commercial/industrial connection, temporary supply, solar & EV connection',
    icon: BoltIcon,
    color: '#2e7d32',
    gradient: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
    component: ElectricityNewConnectionsForm,
  },
  {
    id: 'track',
    title: 'Track Application / Complaint',
    description: 'Track the real-time status of any application or complaint using your reference number',
    icon: TrackIcon,
    color: '#00695c',
    gradient: 'linear-gradient(135deg, #00897b 0%, #00695c 100%)',
    component: TrackingForm,
  },
  {
    id: 'connection_mgmt',
    title: 'Connection Management',
    description: 'Load change, meter relocation, phase conversion, category change, name change',
    icon: BuildIcon,
    color: '#6a1b9a',
    gradient: 'linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)',
    component: ElectricityConnectionMgmtForm,
  },
  {
    id: 'complaints',
    title: 'Complaints & Services',
    description: 'Report outages, meter issues, dangerous lines, streetlight faults',
    icon: ReportIcon,
    color: '#c62828',
    gradient: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
    component: ElectricityComplaintsForm,
  },
  {
    id: 'value_added',
    title: 'Value-Added Services',
    description: 'Net metering for solar, EV charging, no-dues and consumption certificates',
    icon: SolarIcon,
    color: '#f57c00',
    gradient: 'linear-gradient(135deg, #fb8c00 0%, #f57c00 100%)',
    component: ElectricityValueAddedForm,
  },
];

const ElectricityServicesPage = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Voice command support - auto-open service from URL parameter
  const { autoOpenServiceId, clearAutoOpen } = useServiceAutoOpen();

  // Accessibility mode support - register services for voice navigation
  const accessibilityServices = services.map(service => ({
    id: service.id,
    name: service.title,
    keywords: [service.title.toLowerCase(), service.id.replace('_', ' ')],
    onSelect: () => handleServiceClick(service)
  }));

  const { isActive: isAccessibilityActive, selectedService: accessibilitySelectedService } =
    useAccessibilityServicePage({
      departmentId: 'electricity',
      services: accessibilityServices
    });

  // Handle accessibility mode service selection
  useEffect(() => {
    if (isAccessibilityActive && accessibilitySelectedService) {
      const service = services.find(s => s.id === accessibilitySelectedService.id);
      if (service) {
        setSelectedService(service);
        setDialogOpen(true);
      }
    }
  }, [isAccessibilityActive, accessibilitySelectedService]);

  // Handle auto-opening service via voice command
  useEffect(() => {
    if (autoOpenServiceId) {
      console.log('Auto-opening electricity service:', autoOpenServiceId);

      // Map voice command service IDs to actual service IDs
      const serviceIdMap = {
        'new_connection': 'new_connections',
        'billing': 'billing',
        'complaint': 'complaints',  // Note: voice uses 'complaint', page uses 'complaints'
        'complaints': 'complaints',
        'track': 'track',
        'connection_mgmt': 'connection_mgmt',
        'value_added': 'value_added'
      };

      const actualServiceId = serviceIdMap[autoOpenServiceId] || autoOpenServiceId;
      const validService = services.find(s => s.id === actualServiceId);

      if (validService) {
        console.log('Opening electricity service:', validService.title);
        setSelectedService(validService);
        setDialogOpen(true);
      }
      clearAutoOpen();
    }
  }, [autoOpenServiceId, clearAutoOpen]);

  const handleServiceClick = (service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedService(null);
  };

  const ServiceComponent = selectedService?.component;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #42a5f5 0%, #1565c0 100%)' }}>
        <Toolbar>
          <Button
            startIcon={<BackIcon />}
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <PowerIcon sx={{ mr: 2, fontSize: 30 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Electricity Services
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}>
          Select Electricity Service
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 5 }}>
          Manage your electricity connection, bills, complaints, and special services
        </Typography>

        <Grid container spacing={3}>
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Fade in timeout={400 + index * 100}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 8,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleServiceClick(service)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          p: 4,
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: service.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            boxShadow: `0 6px 20px ${service.color}40`,
                          }}
                        >
                          <Icon sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: service.color }}>
                          {service.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {service.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullScreen
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
      >
        {ServiceComponent && (
          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
            <AppBar 
              position="sticky" 
              sx={{ 
                background: selectedService?.gradient || 'linear-gradient(135deg, #42a5f5 0%, #1565c0 100%)',
                boxShadow: 3
              }}
            >
              <Toolbar>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleCloseDialog}
                  sx={{ mr: 2 }}
                >
                  <CloseIcon />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  {selectedService?.icon && React.createElement(selectedService.icon, { sx: { mr: 2, fontSize: 28 } })}
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedService?.title}
                  </Typography>
                </Box>
              </Toolbar>
            </AppBar>
            <Box
              className="kiosk-form-shell notranslate"
              data-no-translate
              sx={{ flexGrow: 1, overflow: 'auto' }}
            >
              <ServiceComponent onClose={handleCloseDialog} />
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default ElectricityServicesPage;
