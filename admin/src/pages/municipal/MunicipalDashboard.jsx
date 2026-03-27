import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Description,
  Report,
  People,
  Assessment,
  Settings,
  Logout,
  AccountBalance as MunicipalIcon,
  ChevronLeft,
  VerifiedUser,
  CardMembership,
  Payment,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const DRAWER_WIDTH = 240;
const DEPT_COLOR = '#2e7d32';
const DEPT_DARK = '#1b5e20';
const DEPT_GRADIENT = 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/municipal' },
  { text: 'Applications', icon: <Description />, path: '/municipal/applications' },
  { text: 'Complaints', icon: <Report />, path: '/municipal/complaints' },
  { text: 'Consumers', icon: <People />, path: '/municipal/consumers' },
  { text: 'Licenses', icon: <VerifiedUser />, path: '/municipal/licenses' },
  { text: 'Certificates', icon: <CardMembership />, path: '/municipal/certificates' },
  { text: 'Payments', icon: <Payment />, path: '/municipal/payments' },
  { text: 'Reports', icon: <Assessment />, path: '/municipal/reports' },
  { text: 'Settings', icon: <Settings />, path: '/municipal/settings' },
];

const MunicipalDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen);
    else setDesktopOpen(!desktopOpen);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Gradient header */}
      <Box sx={{ p: 2, background: DEPT_GRADIENT, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MunicipalIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Municipal Admin
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>
              Corporation Dept.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/municipal' && location.pathname.startsWith(item.path));

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 1.5,
                  py: 1,
                  px: 1.5,
                  bgcolor: isActive ? DEPT_COLOR : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  '&:hover': { bgcolor: isActive ? DEPT_DARK : 'action.hover' },
                  transition: 'background 0.15s',
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'white' : DEPT_COLOR, minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 400, fontSize: '0.9rem' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User Section */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: DEPT_COLOR, width: 36, height: 36, fontSize: '0.9rem' }}>
            {user?.full_name?.charAt(0) || user?.name?.charAt(0) || 'M'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.85rem' }}>
              {user?.full_name || user?.name || 'Municipal Admin'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
              {user?.role?.replace('_', ' ') || 'admin'}
            </Typography>
          </Box>
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
              <Logout sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { xs: 0, md: desktopOpen ? `${DRAWER_WIDTH}px` : 0 },
          background: DEPT_GRADIENT,
          boxShadow: 2,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            {desktopOpen && !isMobile ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600 }}>
            Municipal Corporation Admin
          </Typography>
          <Tooltip title="Account settings">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
                {user?.full_name?.charAt(0) || user?.name?.charAt(0) || 'M'}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { mt: 1.5, minWidth: 180 } }}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.full_name || user?.name || 'Municipal Admin'}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="persistent"
        open={desktopOpen}
        sx={{
          display: { xs: 'none', md: 'block' },
          width: desktopOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid rgba(0,0,0,0.08)',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { xs: '100%', md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          mt: '64px',
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MunicipalDashboard;
