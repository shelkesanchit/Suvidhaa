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
  Fade,
  Dialog,
  Chip,
  IconButton,
  Slide,
} from '@mui/material';
import {
  Water as WaterIcon,
  Receipt as BillIcon,
  Report as ComplaintIcon,
  TrackChanges as TrackIcon,
  ArrowBack as BackIcon,
  AddCircle as AddIcon,
  ManageAccounts as ManageIcon,
  LocalShipping as TankerIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import {
  WaterNewConnectionForm,
  WaterBillPaymentForm,
  WaterComplaintForm,
  WaterTrackingForm,
  WaterConnectionManagementForm,
  WaterTankerServicesForm,
} from '../../components/water';
import { useServiceAutoOpen } from '../../components/voice/useServiceAutoOpen';
import { useAccessibilityServicePage } from '../../components/accessibility';

const waterServices = [
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Pay water bill, sewerage charges, view consumption history, tanker charges',
    icon: BillIcon,
    color: '#2e7d32',
    gradient: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
  },
  {
    id: 'new_connection',
    title: 'New Connections',
    description: 'Apply for water / sewerage connection, book site visit',
    icon: AddIcon,
    color: '#0277bd',
    gradient: 'linear-gradient(135deg, #0288d1 0%, #0277bd 100%)',
  },
  {
    id: 'connection_mgmt',
    title: 'Connection Management',
    description: 'Meter change, load extension, change category, transfer ownership',
    icon: ManageIcon,
    color: '#6a1b9a',
    gradient: 'linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)',
  },
  {
    id: 'complaint',
    title: 'Complaints & Requests',
    description: 'Report leakage, low pressure, contamination, meter issues, pipe burst',
    icon: ComplaintIcon,
    color: '#c62828',
    gradient: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
  },
  {
    id: 'tanker',
    title: 'Tanker & Special Services',
    description: 'Book emergency tanker, bulk water supply, recycled water charges',
    icon: TankerIcon,
    color: '#e65100',
    gradient: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
  },
  {
    id: 'track',
    title: 'Track Application / Complaint',
    description: 'Check status of your water application or complaint',
    icon: TrackIcon,
    color: '#0097a7',
    gradient: 'linear-gradient(135deg, #00acc1 0%, #0097a7 100%)',
  },
];

const WaterServicesPage = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Voice command support - auto-open service from URL parameter
  const { autoOpenServiceId, clearAutoOpen } = useServiceAutoOpen();

  // Accessibility mode support - register services for voice navigation
  const accessibilityServices = waterServices.map(service => ({
    id: service.id,
    name: service.title,
    keywords: [service.title.toLowerCase(), service.id.replace('_', ' ')],
    onSelect: () => handleServiceClick(service.id)
  }));

  const { isActive: isAccessibilityActive, selectedService: accessibilitySelectedService } =
    useAccessibilityServicePage({
      departmentId: 'water',
      services: accessibilityServices
    });

  // Handle accessibility mode service selection
  useEffect(() => {
    if (isAccessibilityActive && accessibilitySelectedService) {
      const service = waterServices.find(s => s.id === accessibilitySelectedService.id);
      if (service) {
        setSelectedService(service.id);
        setDialogOpen(true);
      }
    }
  }, [isAccessibilityActive, accessibilitySelectedService]);

  // Handle auto-opening service via voice command
  useEffect(() => {
    if (autoOpenServiceId) {
      // Verify the service ID is valid
      const validService = waterServices.find(s => s.id === autoOpenServiceId);
      if (validService) {
        setSelectedService(autoOpenServiceId);
        setDialogOpen(true);
      }
      clearAutoOpen();
    }
  }, [autoOpenServiceId, clearAutoOpen]);

  const handleServiceClick = (serviceId) => {
    setSelectedService(serviceId);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedService(null);
  };

  const getServiceInfo = () => {
    return waterServices.find(s => s.id === selectedService) || {};
  };

  const renderFormComponent = () => {
    switch (selectedService) {
      case 'billing':
        return <WaterBillPaymentForm onClose={handleCloseDialog} />;
      case 'new_connection':
        return <WaterNewConnectionForm onClose={handleCloseDialog} />;
      case 'connection_mgmt':
        return <WaterConnectionManagementForm onClose={handleCloseDialog} />;
      case 'complaint':
        return <WaterComplaintForm onClose={handleCloseDialog} />;
      case 'tanker':
        return <WaterTankerServicesForm onClose={handleCloseDialog} />;
      case 'track':
        return <WaterTrackingForm onClose={handleCloseDialog} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Toaster position="top-center" />

      {/* Header */}
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #0288d1 100%)' }}>
        <Toolbar>
          <Button
            startIcon={<BackIcon />}
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <WaterIcon sx={{ mr: 2, fontSize: 30 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Water Supply Services
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Emergency Banner */}
        <Box
          sx={{
            bgcolor: '#0277bd',
            color: 'white',
            p: 3,
            borderRadius: 2,
            mb: 4,
            textAlign: 'center',
            border: '3px solid #01579b',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <PhoneIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" fontWeight="bold">
              WATER EMERGENCY / PIPE BURST?
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ my: 1, letterSpacing: 2 }}>
            CALL 1916 IMMEDIATELY
          </Typography>
          <Typography variant="body1">
            For water contamination or major pipe burst — available 24×7
          </Typography>
        </Box>

        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}
        >
          Select Water Service
        </Typography>
        <Typography
          variant="body1"
          align="center"
          color="text.secondary"
          sx={{ mb: 5 }}
        >
          Manage your water connection, bills, complaints, and special services
        </Typography>

        <Grid container spacing={3}>
          {waterServices.map((service, index) => (
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
                    onClick={() => handleServiceClick(service.id)}
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
                        <service.icon sx={{ fontSize: 40, color: 'white' }} />
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
          ))}
        </Grid>
      </Container>

      {/* Service Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullScreen
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
      >
        {selectedService && (
          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
            <AppBar 
              position="sticky" 
              sx={{ 
                background: getServiceInfo().gradient || 'linear-gradient(135deg, #0288d1 0%, #0277bd 100%)',
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
                <WaterIcon sx={{ mr: 2, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                  {getServiceInfo().title || 'Water Services'}
                </Typography>
              </Toolbar>
            </AppBar>
            <Box className="kiosk-form-shell" sx={{ flexGrow: 1, overflow: 'auto' }}>
              {renderFormComponent()}
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default WaterServicesPage;
