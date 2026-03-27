import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Fade,
} from '@mui/material';
import {
  ElectricBolt as ElectricIcon,
  LocalFireDepartment as GasIcon,
  Water as WaterIcon,
  AccountBalance as MunicipalIcon,
} from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: 'electricity',
      title: 'Electricity Utility Offices',
      description: 'New connections, bill payments, complaints, and more',
      icon: ElectricIcon,
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      lightGradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      route: '/electricity',
    },
    {
      id: 'gas',
      title: 'Gas Distribution Offices',
      description: 'Gas connections, cylinder bookings, and services',
      icon: GasIcon,
      color: '#f57c00',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      lightGradient: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      route: '/gas',
    },
    {
      id: 'water',
      title: 'Water Supply Services',
      description: 'Water connections, bill payments, tanker booking, complaints',
      icon: WaterIcon,
      color: '#0288d1',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      lightGradient: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)',
      route: '/water',
    },
    {
      id: 'municipal',
      title: 'Municipal Corporations',
      description: 'Property tax, trade license, civic services, and more',
      icon: MunicipalIcon,
      color: '#388e3c',
      gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
      lightGradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      route: '/municipal',
    },
  ];

  const handleServiceClick = (route) => {
    navigate(route);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Animated background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.15,
          background: `
            radial-gradient(circle at 20% 30%, rgba(103, 126, 234, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(2, 136, 209, 0.3) 0%, transparent 50%)
          `,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        {/* Header with Logo */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {/* Logo */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 10px 40px rgba(103, 126, 234, 0.4)',
                mb: 3,
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  fontSize: '2.5rem',
                  letterSpacing: '2px',
                }}
              >
                SUVIDHA
              </Typography>
            </Box>

            <Typography
              variant="h3"
              sx={{
                color: '#2c3e50',
                fontWeight: 'bold',
                mb: 1,
                fontSize: '2rem',
              }}
            >
              Smart Urban Virtual Interactive Digital Helpdesk Assistant
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#546e7a',
                fontWeight: 400,
                fontSize: '1.1rem',
              }}
            >
              Self-Service Kiosk System
            </Typography>
          </Box>
        </Fade>

        {/* Service Selection Cards */}
        <Typography
          variant="h4"
          align="center"
          sx={{
            color: '#37474f',
            fontWeight: 'bold',
            mb: 3,
            fontSize: '1.8rem',
          }}
        >
          Select Service
        </Typography>

        <Grid container spacing={3} sx={{ mb: 2 }}>
          {services.map((service, index) => (
            <Grid item xs={12} sm={6} md={3} key={service.id}>
              <Fade in timeout={1000 + index * 200}>
                <Card
                  sx={{
                    height: '280px',
                    background: 'white',
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '2px solid transparent',
                    '&:hover': {
                      transform: 'translateY(-12px) scale(1.02)',
                      boxShadow: `0 20px 40px ${service.color}30`,
                      borderColor: service.color,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleServiceClick(service.route)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3,
                        textAlign: 'center',
                      }}
                    >
                      {/* Icon with gradient background */}
                      <Box
                        sx={{
                          width: 90,
                          height: 90,
                          borderRadius: '50%',
                          background: service.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2.5,
                          boxShadow: `0 8px 24px ${service.color}40`,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'rotate(360deg)',
                          },
                        }}
                      >
                        <service.icon sx={{ fontSize: 45, color: 'white' }} />
                      </Box>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 'bold',
                          mb: 1.5,
                          color: service.color,
                          fontSize: '1.4rem',
                        }}
                      >
                        {service.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: '#78909c',
                          lineHeight: 1.5,
                          fontSize: '0.95rem',
                        }}
                      >
                        {service.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography
            variant="body1"
            sx={{
              color: '#546e7a',
              fontWeight: 500,
              mb: 0.5,
            }}
          >
            © 2026 C-DAC. All rights reserved.
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#78909c',
              fontSize: '0.9rem',
            }}
          >
            Touch any card to get started
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingPage;
