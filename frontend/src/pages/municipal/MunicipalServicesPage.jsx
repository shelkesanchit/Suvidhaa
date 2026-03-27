import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Card, CardContent, CardActionArea,
  AppBar, Toolbar, Button, Fade, Grid, Dialog, IconButton, Slide,
} from '@mui/material';
import {
  AccountBalance as MunicipalIcon,
  ArrowBack as BackIcon,
  Receipt as TaxIcon,
  Store as StoreIcon,
  Article as ArticleIcon,
  CleaningServices as CleaningServicesIcon,
  Construction as ConstructionIcon,
  LocalHospital as HealthIcon,
  Apartment as ApartmentIcon,
  Favorite as FavoriteIcon,
  RecordVoiceOver as GrievanceIcon,
  AdminPanelSettings as AdminIcon,
  HomeWork as HomeWorkIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  MunicipalPropertyTaxForm,
  MunicipalBirthDeathCertForm,
  MunicipalTradeLicenseForm,
  MunicipalBuildingPermitForm,
  MunicipalSanitationForm,
  MunicipalRoadsForm,
  MunicipalHealthEnvForm,
  MunicipalHousingForm,
  MunicipalMarriageRegForm,
  MunicipalGrievanceForm,
  MunicipalAdminServicesForm,
} from '../../components/municipal';

import { useServiceAutoOpen } from '../../components/voice/useServiceAutoOpen';
import { useAccessibilityServicePage } from '../../components/accessibility';

const municipalServices = [
  {
    id: 'property_tax',
    title: 'Property & Taxes',
    description: 'Pay property/house tax, view receipts, assessment revision',
    icon: TaxIcon,
    color: '#1565c0',
    gradient: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  },
  {
    id: 'birth_death_cert',
    title: 'Birth & Death Certificates',
    description: 'Apply, download, and correct birth/death certificates',
    icon: ArticleIcon,
    color: '#2e7d32',
    gradient: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
  },
  {
    id: 'trade_license',
    title: 'Trade & Business Licenses',
    description: 'New license, renewal, fee payment, and certificate download',
    icon: StoreIcon,
    color: '#e65100',
    gradient: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
  },
  {
    id: 'building_permit',
    title: 'Building & Construction',
    description: 'Building plan approval, permits, occupancy certificate',
    icon: HomeWorkIcon,
    color: '#6a1b9a',
    gradient: 'linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)',
  },
  {
    id: 'sanitation',
    title: 'Sanitation & Waste',
    description: 'Garbage complaints, bulk waste pickup, SW charges',
    icon: CleaningServicesIcon,
    color: '#5d4037',
    gradient: 'linear-gradient(135deg, #795548 0%, #5d4037 100%)',
  },
  {
    id: 'roads',
    title: 'Roads & Infrastructure',
    description: 'Pothole complaints, streetlights, drain issues, road cutting',
    icon: ConstructionIcon,
    color: '#f57c00',
    gradient: 'linear-gradient(135deg, #fb8c00 0%, #f57c00 100%)',
  },
  {
    id: 'health_env',
    title: 'Health & Environment',
    description: 'Health licenses, food establishment, fogging, env clearance',
    icon: HealthIcon,
    color: '#00695c',
    gradient: 'linear-gradient(135deg, #00796b 0%, #00695c 100%)',
  },
  {
    id: 'housing',
    title: 'Housing & Encroachment',
    description: 'Municipal housing allotment, rent payment, report encroachment',
    icon: ApartmentIcon,
    color: '#4527a0',
    gradient: 'linear-gradient(135deg, #512da8 0%, #4527a0 100%)',
  },
  {
    id: 'marriage',
    title: 'Marriage Registration',
    description: 'Apply for marriage registration and download certificate',
    icon: FavoriteIcon,
    color: '#c2185b',
    gradient: 'linear-gradient(135deg, #d81b60 0%, #c2185b 100%)',
  },
  {
    id: 'grievance_rti',
    title: 'Grievances & RTI',
    description: 'Lodge complaint, track status, RTI application, book appointment',
    icon: GrievanceIcon,
    color: '#37474f',
    gradient: 'linear-gradient(135deg, #455a64 0%, #37474f 100%)',
  },
  {
    id: 'admin_services',
    title: 'General Admin Services',
    description: 'NOC, domicile/resident certificate, subscriptions, ad fees',
    icon: AdminIcon,
    color: '#1a237e',
    gradient: 'linear-gradient(135deg, #283593 0%, #1a237e 100%)',
  },
];

const renderFormComponent = (serviceId, onClose) => {
  switch (serviceId) {
    case 'property_tax': return <MunicipalPropertyTaxForm onClose={onClose} />;
    case 'birth_death_cert': return <MunicipalBirthDeathCertForm onClose={onClose} />;
    case 'trade_license': return <MunicipalTradeLicenseForm onClose={onClose} />;
    case 'building_permit': return <MunicipalBuildingPermitForm onClose={onClose} />;
    case 'sanitation': return <MunicipalSanitationForm onClose={onClose} />;
    case 'roads': return <MunicipalRoadsForm onClose={onClose} />;
    case 'health_env': return <MunicipalHealthEnvForm onClose={onClose} />;
    case 'housing': return <MunicipalHousingForm onClose={onClose} />;
    case 'marriage': return <MunicipalMarriageRegForm onClose={onClose} />;
    case 'grievance_rti': return <MunicipalGrievanceForm onClose={onClose} />;
    case 'admin_services': return <MunicipalAdminServicesForm onClose={onClose} />;
    default: return null;
  }
};

const MunicipalServicesPage = () => {
  const navigate = useNavigate();
  const [openService, setOpenService] = useState(null);

  // Voice command support - auto-open service from URL parameter
  const { autoOpenServiceId, clearAutoOpen } = useServiceAutoOpen();

  // Accessibility mode support - register services for voice navigation
  const accessibilityServices = municipalServices.map(service => ({
    id: service.id,
    name: service.title,
    keywords: [service.title.toLowerCase(), service.id.replace(/_/g, ' ')],
    onSelect: () => setOpenService(service.id)
  }));

  const { isActive: isAccessibilityActive, selectedService: accessibilitySelectedService } =
    useAccessibilityServicePage({
      departmentId: 'municipal',
      services: accessibilityServices
    });

  // Handle accessibility mode service selection
  useEffect(() => {
    if (isAccessibilityActive && accessibilitySelectedService) {
      const service = municipalServices.find(s => s.id === accessibilitySelectedService.id);
      if (service) {
        setOpenService(service.id);
      }
    }
  }, [isAccessibilityActive, accessibilitySelectedService]);

  // Handle auto-opening service via voice command
  useEffect(() => {
    if (autoOpenServiceId) {
      console.log('Auto-opening municipal service:', autoOpenServiceId);

      // Map voice command service IDs to actual service IDs
      const serviceIdMap = {
        'property_tax': 'property_tax',
        'birth_death': 'birth_death_cert',
        'trade_license': 'trade_license',
        'building_permit': 'building_permit',
        'sanitation': 'sanitation',
        'roads': 'roads',
        'health_env': 'health_env',
        'housing': 'housing',
        'marriage': 'marriage',
        'grievance': 'grievance_rti',
        'admin_services': 'admin_services'
      };

      const actualServiceId = serviceIdMap[autoOpenServiceId] || autoOpenServiceId;
      const validService = municipalServices.find(s => s.id === actualServiceId);

      if (validService) {
        console.log('Opening municipal service:', validService.title);
        setOpenService(actualServiceId);
      }
      clearAutoOpen();
    }
  }, [autoOpenServiceId, clearAutoOpen]);

  const handleOpen = (serviceId) => setOpenService(serviceId);
  const handleClose = () => setOpenService(null);

  const getServiceInfo = () => {
    return municipalServices.find(s => s.id === openService) || {};
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #388e3c 0%, #1b5e20 100%)' }}>
        <Toolbar>
          <Button startIcon={<BackIcon />} color="inherit" onClick={() => navigate('/')} sx={{ mr: 2 }}>
            Back
          </Button>
          <MunicipalIcon sx={{ mr: 2, fontSize: 30 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Municipal Corporation Services
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}>
          Civic Services
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Access taxes, licenses, certificates, complaints, and more — all in one place
        </Typography>

        <Grid container spacing={3}>
          {municipalServices.map((service, index) => (
            <Grid item xs={12} sm={6} md={4} key={service.id}>
              <Fade in timeout={400 + index * 80}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleOpen(service.id)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 4 }}>
                      <Box
                        sx={{
                          width: 80, height: 80, borderRadius: '50%',
                          background: service.gradient,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mb: 2, boxShadow: `0 6px 20px ${service.color}40`,
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

      <Dialog
        open={Boolean(openService)}
        onClose={handleClose}
        fullScreen
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
      >
        {openService && (
          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
            <AppBar 
              position="sticky" 
              sx={{ 
                background: getServiceInfo().gradient || 'linear-gradient(135deg, #388e3c 0%, #1b5e20 100%)',
                boxShadow: 3
              }}
            >
              <Toolbar>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleClose}
                  sx={{ mr: 2 }}
                >
                  <CloseIcon />
                </IconButton>
                <MunicipalIcon sx={{ mr: 2, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                  {getServiceInfo().title || 'Municipal Services'}
                </Typography>
              </Toolbar>
            </AppBar>
            <Box className="kiosk-form-shell" sx={{ flexGrow: 1, overflow: 'auto' }}>
              {renderFormComponent(openService, handleClose)}
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default MunicipalServicesPage;

