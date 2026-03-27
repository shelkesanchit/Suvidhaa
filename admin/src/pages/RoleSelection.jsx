import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import {
  ElectricBolt,
  LocalFireDepartment,
  Water,
  AccountBalance,
  ArrowForward,
} from '@mui/icons-material';

const departments = [
  {
    id: 'electricity',
    title: 'Electricity',
    subtitle: 'Department',
    description: 'Manage connections, bills, meter readings and complaints',
    icon: ElectricBolt,
    color: '#1976d2',
    gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    path: '/electricity/login',
    badge: 'Power',
  },
  {
    id: 'gas',
    title: 'Gas',
    subtitle: 'Department',
    description: 'Manage gas connections, cylinder bookings, and services',
    icon: LocalFireDepartment,
    color: '#ff6b35',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    path: '/gas/login',
    badge: 'Distribution',
  },
  {
    id: 'water',
    title: 'Water',
    subtitle: 'Department',
    description: 'Manage water connections, bills, and supply services',
    icon: Water,
    color: '#0288d1',
    gradient: 'linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%)',
    path: '/water/login',
    badge: 'Supply',
  },
  {
    id: 'municipal',
    title: 'Municipal',
    subtitle: 'Corporation',
    description: 'Manage applications, complaints, licenses and certificates',
    icon: AccountBalance,
    color: '#2e7d32',
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
    path: '/municipal/login',
    badge: 'Civic',
  },
];

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#e8eaed',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#1a1a1a',
              mb: 1.5,
              fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' },
              letterSpacing: '-0.5px',
            }}
          >
            SUVIDHA Admin Portal
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: '#5f6368', fontWeight: 400, fontSize: { xs: '0.95rem', md: '1.1rem' } }}
          >
            Unified Municipal Services Management System
          </Typography>
        </Box>

        {/* Department Cards */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            bgcolor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: '#5f6368', letterSpacing: '2px', mb: 3, display: 'block', textAlign: 'center', fontWeight: 600 }}
          >
            Select Your Department
          </Typography>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            {departments.map((dept) => {
              const Icon = dept.icon;
              return (
                <Grid item xs={12} sm={6} key={dept.id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      bgcolor: '#ffffff',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: `0 14px 32px rgba(0, 0, 0, 0.12)`,
                        border: `1px solid ${dept.color}`,
                      },
                    }}
                  >
                    <CardActionArea onClick={() => navigate(dept.path)} sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                        {/* Color stripe */}
                        <Box
                          sx={{
                            width: 6,
                            background: dept.gradient,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ p: { xs: 2, md: 2.5 }, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                background: dept.gradient,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: `0 4px 12px ${dept.color}40`,
                              }}
                            >
                              <Icon sx={{ color: 'white', fontSize: 28 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 700, lineHeight: 1 }}>
                                  {dept.title}
                                </Typography>
                                <Chip
                                  label={dept.badge}
                                  size="small"
                                  sx={{
                                    bgcolor: `${dept.color}15`,
                                    color: dept.color,
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    height: 18,
                                    border: `1px solid ${dept.color}30`,
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mb: 1 }}>
                                {dept.subtitle}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                {dept.description}
                              </Typography>
                            </Box>
                            <ArrowForward sx={{ color: dept.color, fontSize: 18, mt: 0.5 }} />
                          </Box>
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>

        <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', textAlign: 'center', mt: 3 }}>
          Authorized personnel only — all access is logged
        </Typography>
      </Container>
    </Box>
  );
};

export default RoleSelection;
