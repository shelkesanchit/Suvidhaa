import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Role Selection
import RoleSelection from './pages/RoleSelection';

// Shared Login Page (department-aware)
import LoginPage from './pages/LoginPage';

// Electricity Pages
import AdminDashboard from './pages/electricity/AdminDashboard';
import AdminOverview from './pages/electricity/AdminOverview';
import ManageApplications from './pages/electricity/ManageApplications';
import ManageComplaints from './pages/electricity/ManageComplaints';
import ManageUsers from './pages/electricity/ManageUsers';
import Reports from './pages/electricity/Reports';
import SystemSettings from './pages/electricity/SystemSettings';
import TariffManagement from './pages/electricity/TariffManagement';
import MeterReadingManagement from './pages/electricity/MeterReadingManagement';
import ConsumerAccounts from './pages/electricity/ConsumerAccounts';
import ElectricityPayments from './pages/electricity/Payments';

// Gas Pages
import GasDashboard from './pages/gas/GasDashboard';
import GasDashboardOverview from './pages/gas/DashboardOverview';
import GasManageApplications from './pages/gas/ManageApplications';
import GasManageComplaints from './pages/gas/ManageComplaints';
import GasManageConsumers from './pages/gas/ManageConsumers';
import CylinderBookings from './pages/gas/CylinderBookings';
import RegulatoryOperations from './pages/gas/RegulatoryOperations';
import GasReports from './pages/gas/Reports';
import GasTariffManagement from './pages/gas/TariffManagement';
import GasSettings from './pages/gas/Settings';
import GasPayments from './pages/gas/Payments';

// Water Pages
import WaterDashboard from './pages/water/WaterDashboard';
import WaterDashboardOverview from './pages/water/DashboardOverview';
import WaterManageApplications from './pages/water/ManageApplications';
import WaterManageComplaints from './pages/water/ManageComplaints';
import WaterManageConsumers from './pages/water/ManageConsumers';
import WaterReports from './pages/water/Reports';
import WaterTariffManagement from './pages/water/TariffManagement';
import WaterSettings from './pages/water/Settings';
import WaterPayments from './pages/water/Payments';

// Municipal Pages
import MunicipalDashboard from './pages/municipal/MunicipalDashboard';
import MunicipalDashboardOverview from './pages/municipal/DashboardOverview';
import MunicipalManageApplications from './pages/municipal/ManageApplications';
import MunicipalManageComplaints from './pages/municipal/ManageComplaints';
import MunicipalManageConsumers from './pages/municipal/ManageConsumers';
import MunicipalLicenses from './pages/municipal/Licenses';
import MunicipalCertificates from './pages/municipal/Certificates';
import MunicipalPayments from './pages/municipal/Payments';
import MunicipalReports from './pages/municipal/Reports';
import MunicipalSettings from './pages/municipal/Settings';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
      light: '#42a5f5',
    },
    secondary: {
      main: '#f57c00',
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
    divider: 'rgba(0,0,0,0.08)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
        elevation2: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
        elevation4: { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
        elevation10: { boxShadow: '0 8px 40px rgba(0,0,0,0.12)' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
        containedPrimary: {
          '&:hover': { filter: 'brightness(1.08)' },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8f9fa',
            fontWeight: 600,
            fontSize: '0.78rem',
            color: '#5f6b7a',
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            borderBottom: '2px solid rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
          '&.MuiTableRow-hover:hover': { backgroundColor: '#f8f9ff' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, letterSpacing: '0.2px' },
        sizeSmall: { fontSize: '0.72rem', height: 22 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '1.1rem' },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, dept }) => {
  const { isAuthenticated, loading, department } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={dept ? `/${dept}/login` : '/login'} replace />;
  }

  // If a specific department is required, verify it matches
  if (dept && department !== dept) {
    return <Navigate to={`/${dept}/login`} replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children, dept }) => {
  const { isAuthenticated, loading, department } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated && department) {
    // Redirect to the department they're logged into
    if (department === 'electricity') {
      return <Navigate to="/electricity" replace />;
    }
    return <Navigate to={`/${department}`} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Role Selection - Landing Page */}
      <Route path="/" element={<RoleSelection />} />

      {/* Legacy /login redirects to role selection */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* ============ ELECTRICITY ROUTES ============ */}
      <Route
        path="/electricity/login"
        element={
          <PublicRoute dept="electricity">
            <LoginPage department="electricity" />
          </PublicRoute>
        }
      />
      <Route
        path="/electricity/*"
        element={
          <ProtectedRoute dept="electricity">
            <AdminDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="applications" element={<ManageApplications />} />
        <Route path="complaints" element={<ManageComplaints />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="meter-readings" element={<MeterReadingManagement />} />
        <Route path="consumers" element={<ConsumerAccounts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="tariff" element={<TariffManagement />} />
        <Route path="payments" element={<ElectricityPayments />} />
      </Route>

      {/* ============ GAS ROUTES ============ */}
      <Route
        path="/gas/login"
        element={
          <PublicRoute dept="gas">
            <LoginPage department="gas" />
          </PublicRoute>
        }
      />
      <Route
        path="/gas/*"
        element={
          <ProtectedRoute dept="gas">
            <GasDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<GasDashboardOverview />} />
        <Route path="applications" element={<GasManageApplications />} />
        <Route path="complaints" element={<GasManageComplaints />} />
        <Route path="consumers" element={<GasManageConsumers />} />
        <Route path="cylinders" element={<CylinderBookings />} />
        <Route path="regulatory" element={<RegulatoryOperations />} />
        <Route path="reports" element={<GasReports />} />
        <Route path="tariff" element={<GasTariffManagement />} />
        <Route path="settings" element={<GasSettings />} />
        <Route path="payments" element={<GasPayments />} />
      </Route>

      {/* ============ WATER ROUTES ============ */}
      <Route
        path="/water/login"
        element={
          <PublicRoute dept="water">
            <LoginPage department="water" />
          </PublicRoute>
        }
      />
      <Route
        path="/water/*"
        element={
          <ProtectedRoute dept="water">
            <WaterDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<WaterDashboardOverview />} />
        <Route path="applications" element={<WaterManageApplications />} />
        <Route path="complaints" element={<WaterManageComplaints />} />
        <Route path="consumers" element={<WaterManageConsumers />} />
        <Route path="reports" element={<WaterReports />} />
        <Route path="tariff" element={<WaterTariffManagement />} />
        <Route path="settings" element={<WaterSettings />} />
        <Route path="payments" element={<WaterPayments />} />
      </Route>

      {/* ============ MUNICIPAL ROUTES ============ */}
      <Route
        path="/municipal/login"
        element={
          <PublicRoute dept="municipal">
            <LoginPage department="municipal" />
          </PublicRoute>
        }
      />
      <Route
        path="/municipal/*"
        element={
          <ProtectedRoute dept="municipal">
            <MunicipalDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<MunicipalDashboardOverview />} />
        <Route path="applications" element={<MunicipalManageApplications />} />
        <Route path="complaints" element={<MunicipalManageComplaints />} />
        <Route path="consumers" element={<MunicipalManageConsumers />} />
        <Route path="licenses" element={<MunicipalLicenses />} />
        <Route path="certificates" element={<MunicipalCertificates />} />
        <Route path="payments" element={<MunicipalPayments />} />
        <Route path="reports" element={<MunicipalReports />} />
        <Route path="settings" element={<MunicipalSettings />} />
      </Route>

      {/* Catch all - redirect to role selection */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AppRoutes />
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4caf50',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#f44336',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
