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
  LocalFireDepartment as GasIcon,
  PropaneTank as CylinderIcon,
  ReceiptLong as BillIcon,
  ArrowBack as BackIcon,
  Report as ComplaintIcon,
  TrackChanges as TrackIcon,
  Phone as PhoneIcon,
  Assessment as PipelineIcon,
  Add as AddIcon,
  ManageAccounts as ManageIcon,
  Security as SafetyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import {
  GasNewConnectionForm,
  GasBillPaymentForm,
  GasComplaintForm,
  GasTrackingForm,
  GasCylinderBookingForm,
  GasConnectionManagementForm,
  GasSafetyInfoForm,
} from '../../components/gas';

import { useServiceAutoOpen } from '../../components/voice/useServiceAutoOpen';
import { useAccessibilityServicePage } from '../../components/accessibility';

// PNG Services (Piped Natural Gas)
const pngServices = [
  {
    id: 'png_new_connection',
    title: 'Apply for New PNG Connection',
    description: 'Apply for domestic, commercial, or industrial piped natural gas connection',
    icon: AddIcon,
    color: '#1976d2',
  },
  {
    id: 'png_bill',
    title: 'Billing & Payments',
    description: 'Pay bill, view history, download invoice, EMI for arrears',
    icon: BillIcon,
    color: '#2e7d32',
  },
  {
    id: 'png_complaint',
    title: 'Complaints & Requests',
    description: 'Report gas leak, meter dispute, billing errors, meter testing',
    icon: ComplaintIcon,
    color: '#d32f2f',
  },
  {
    id: 'png_connection_mgmt',
    title: 'Connection Management',
    description: 'Load enhancement, meter upgrade, transfer, or surrender connection',
    icon: ManageIcon,
    color: '#7b1fa2',
  },
  {
    id: 'png_safety',
    title: 'Safety & Information',
    description: 'Book inspection, safety guidelines, alerts, find distributor',
    icon: SafetyIcon,
    color: '#c62828',
  },
  {
    id: 'png_track',
    title: 'Track Application / Complaint',
    description: 'Check status of your PNG application or complaint',
    icon: TrackIcon,
    color: '#0288d1',
  },
];

// LPG Services (Liquefied Petroleum Gas)
const lpgServices = [
  {
    id: 'lpg_new_connection',
    title: 'Apply for New LPG Connection',
    description: 'Apply for Domestic, PMUY (Ujjwala), or Commercial LPG connection',
    icon: AddIcon,
    color: '#f57c00',
  },
  {
    id: 'lpg_cylinder_booking',
    title: 'Book LPG Cylinder',
    description: 'Book LPG cylinder refill with OTP verification',
    icon: CylinderIcon,
    color: '#e91e63',
  },
  {
    id: 'lpg_bill',
    title: 'Billing & Payments',
    description: 'Pay bill, view history, download invoice, EMI for arrears',
    icon: BillIcon,
    color: '#2e7d32',
  },
  {
    id: 'lpg_complaint',
    title: 'Complaints & Requests',
    description: 'Report gas leak, delivery delay, overcharging, cylinder issues',
    icon: ComplaintIcon,
    color: '#d32f2f',
  },
  {
    id: 'lpg_connection_mgmt',
    title: 'Connection Management',
    description: 'Transfer connection, change meter, surrender LPG connection',
    icon: ManageIcon,
    color: '#7b1fa2',
  },
  {
    id: 'lpg_safety',
    title: 'Safety & Information',
    description: 'Book inspection, safety guidelines, SMS alerts, find distributor',
    icon: SafetyIcon,
    color: '#c62828',
  },
  {
    id: 'lpg_track',
    title: 'Track Application / Complaint',
    description: 'Check status of your LPG application or complaint',
    icon: TrackIcon,
    color: '#0288d1',
  },
];

const GasServicesPage = () => {
  const navigate = useNavigate();
  const [gasType, setGasType] = useState(null); // null, 'png', 'lpg'
  const [selectedService, setSelectedService] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Voice command support - auto-open service from URL parameter
  const { autoOpenServiceId, clearAutoOpen } = useServiceAutoOpen();

  // Accessibility mode support - register all services for voice navigation
  const allGasServices = [...pngServices, ...lpgServices];
  const accessibilityServices = allGasServices.map(service => ({
    id: service.id,
    name: service.title,
    keywords: [service.title.toLowerCase(), service.id.replace(/_/g, ' ')],
    onSelect: () => {
      if (service.id.startsWith('png_')) {
        setGasType('png');
      } else if (service.id.startsWith('lpg_')) {
        setGasType('lpg');
      }
      handleServiceClick(service.id);
    }
  }));

  const { isActive: isAccessibilityActive, selectedService: accessibilitySelectedService } =
    useAccessibilityServicePage({
      departmentId: 'gas',
      services: accessibilityServices
    });

  // Handle accessibility mode service selection
  useEffect(() => {
    if (isAccessibilityActive && accessibilitySelectedService) {
      const service = allGasServices.find(s => s.id === accessibilitySelectedService.id);
      if (service) {
        if (service.id.startsWith('png_')) {
          setGasType('png');
        } else if (service.id.startsWith('lpg_')) {
          setGasType('lpg');
        }
        setSelectedService(service.id);
        setDialogOpen(true);
      }
    }
  }, [isAccessibilityActive, accessibilitySelectedService]);

  // Handle auto-opening service via voice command
  useEffect(() => {
    if (autoOpenServiceId) {
      console.log('Auto-opening gas service:', autoOpenServiceId);

      // For gas, we need to handle both PNG and LPG services
      // Default to LPG for general commands like 'new_connection'
      const serviceIdMap = {
        'new_connection': 'lpg_new_connection',
        'billing': 'lpg_bill',
        'complaint': 'lpg_complaint',
        'track': 'lpg_track',
      };

      const actualServiceId = serviceIdMap[autoOpenServiceId] || autoOpenServiceId;

      // Check if it's a valid service
      const allServices = [...pngServices, ...lpgServices];
      const validService = allServices.find(s => s.id === actualServiceId);

      if (validService) {
        console.log('Opening gas service:', validService.title);

        // Set the appropriate gas type based on service ID
        if (actualServiceId.startsWith('png_')) {
          setGasType('png');
        } else if (actualServiceId.startsWith('lpg_')) {
          setGasType('lpg');
        }

        setSelectedService(actualServiceId);
        setDialogOpen(true);
      }
      clearAutoOpen();
    }
  }, [autoOpenServiceId, clearAutoOpen]);

  const handleGasTypeSelect = (type) => {
    setGasType(type);
  };

  const handleServiceClick = (serviceId) => {
    setSelectedService(serviceId);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedService(null);
  };

  const handleBack = () => {
    if (gasType) {
      setGasType(null);
    } else {
      navigate('/');
    }
  };

  const renderFormComponent = () => {
    switch (selectedService) {
      case 'png_new_connection':
        return <GasNewConnectionForm onClose={handleCloseDialog} gasType="png" />;
      case 'lpg_new_connection':
        return <GasNewConnectionForm onClose={handleCloseDialog} gasType="lpg" />;
      case 'lpg_cylinder_booking':
        return <GasCylinderBookingForm onClose={handleCloseDialog} />;
      case 'png_bill':
        return <GasBillPaymentForm onClose={handleCloseDialog} gasType="png" />;
      case 'lpg_bill':
        return <GasBillPaymentForm onClose={handleCloseDialog} gasType="lpg" />;
      case 'png_complaint':
        return <GasComplaintForm onClose={handleCloseDialog} gasType="png" />;
      case 'lpg_complaint':
        return <GasComplaintForm onClose={handleCloseDialog} gasType="lpg" />;
      case 'png_connection_mgmt':
        return <GasConnectionManagementForm onClose={handleCloseDialog} gasType="png" />;
      case 'lpg_connection_mgmt':
        return <GasConnectionManagementForm onClose={handleCloseDialog} gasType="lpg" />;
      case 'png_safety':
        return <GasSafetyInfoForm onClose={handleCloseDialog} gasType="png" />;
      case 'lpg_safety':
        return <GasSafetyInfoForm onClose={handleCloseDialog} gasType="lpg" />;
      case 'png_track':
      case 'lpg_track':
        return <GasTrackingForm onClose={handleCloseDialog} gasType={gasType} />;
      default:
        return null;
    }
  };

  const currentServices = gasType === 'png' ? pngServices : gasType === 'lpg' ? lpgServices : [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Toaster position="top-center" />
      
      {/* Header */}
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
        <Toolbar>
          <Button
            startIcon={<BackIcon />}
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <GasIcon sx={{ mr: 2, fontSize: 30 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Gas Distribution Services
            {gasType && (
              <Chip 
                label={gasType.toUpperCase()} 
                sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
              />
            )}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Emergency Banner */}
        <Box
          sx={{
            bgcolor: '#d32f2f',
            color: 'white',
            p: 3,
            borderRadius: 2,
            mb: 4,
            textAlign: 'center',
            border: '3px solid #b71c1c',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <PhoneIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">
              GAS LEAK EMERGENCY?
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ my: 1, letterSpacing: 2 }}>
            CALL 1906 IMMEDIATELY
          </Typography>
          <Typography variant="body1">
            Do NOT use electrical switches or open flames. Open windows and evacuate.
          </Typography>
        </Box>

        {/* Gas Type Selection Screen */}
        {!gasType && (
          <>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}
            >
              Select Gas Service Type
            </Typography>

            <Grid container spacing={3} justifyContent="center">
              {/* PNG Card */}
              <Grid item xs={12} sm={6} md={4}>
                <Fade in timeout={500}>
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
                    <CardActionArea onClick={() => handleGasTypeSelect('png')} sx={{ height: '100%' }}>
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 4 }}>
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            boxShadow: '0 6px 20px #1976d240',
                          }}
                        >
                          <PipelineIcon sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                          PNG Services
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Piped Natural Gas — new connection, billing, complaints, and connection management
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              </Grid>

              {/* LPG Card */}
              <Grid item xs={12} sm={6} md={4}>
                <Fade in timeout={700}>
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
                    <CardActionArea onClick={() => handleGasTypeSelect('lpg')} sx={{ height: '100%' }}>
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 4 }}>
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #fb8c00 0%, #f57c00 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            boxShadow: '0 6px 20px #f57c0040',
                          }}
                        >
                          <CylinderIcon sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#f57c00' }}>
                          LPG Services
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Liquefied Petroleum Gas — cylinder booking, billing, complaints, and connection management
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              </Grid>
            </Grid>
          </>
        )}

        {/* Service Selection Screen */}
        {gasType && (
          <>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}
            >
              {gasType === 'png' ? 'PNG Services' : 'LPG Services'}
            </Typography>

            <Grid container spacing={3}>
              {currentServices.map((service, index) => (
                <Grid item xs={12} sm={6} md={4} key={service.id}>
                  <Fade in timeout={300 + index * 100}>
                    <Card
                      sx={{
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: 6,
                        },
                      }}
                    >
                      <CardActionArea onClick={() => handleServiceClick(service.id)} sx={{ height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 3 }}>
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: '50%',
                              bgcolor: `${service.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 2,
                            }}
                          >
                            <service.icon sx={{ fontSize: 40, color: service.color }} />
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
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
          </>
        )}

        {/* Info Section */}
        <Box sx={{ mt: 6, p: 4, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
            About Gas Distribution Services
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="#1976d2">
                PNG (Piped Natural Gas)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Continuous gas supply through pipelines<br />
                • Metered billing based on consumption<br />
                • Available in select areas of the city<br />
                • More economical for regular usage<br />
                • No storage hassle
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="#f57c00">
                LPG (Liquefied Petroleum Gas)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Cylinder-based gas supply<br />
                • Available everywhere in India<br />
                • Providers: Indane, Bharat Gas, HP Gas<br />
                • PMUY (Ujjwala) for eligible beneficiaries<br />
                • Online booking and home delivery
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Contact Info */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Helpline: 1906 | Email: gas@suvidha.gov.in | Office Hours: 9 AM - 6 PM
          </Typography>
        </Box>
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
                background: gasType === 'lpg' 
                  ? 'linear-gradient(135deg, #fb8c00 0%, #f57c00 100%)'
                  : 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)',
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
                <GasIcon sx={{ mr: 2, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                  {gasType === 'png' ? 'PNG' : 'LPG'} Services
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

export default GasServicesPage;
