import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, Avatar,
  Divider, Badge, Tooltip, Menu, MenuItem, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as ApplicationIcon,
  Report as ComplaintIcon,
  Speed as MeterIcon,
  People as ConsumerIcon,
  ManageAccounts as UsersIcon,
  BarChart as ReportsIcon,
  Settings as SettingsIcon,
  Bolt as TariffIcon,
  AccountBalanceWallet as PaymentsIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  ElectricBolt,
  ChevronLeft,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const DRAWER_WIDTH = 240;
const DEPT_COLOR = '#1976d2';
const DEPT_DARK = '#115293';
const DEPT_GRADIENT = 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)';

const NAV_ITEMS = [
  { label: 'Dashboard',        icon: DashboardIcon,    path: '/electricity' },
  { label: 'Applications',     icon: ApplicationIcon,  path: '/electricity/applications',  badgeKey: 'pending_applications' },
  { label: 'Complaints',       icon: ComplaintIcon,    path: '/electricity/complaints',     badgeKey: 'open_complaints' },
  { label: 'Meter Readings',   icon: MeterIcon,        path: '/electricity/meter-readings' },
  { label: 'Consumers',        icon: ConsumerIcon,     path: '/electricity/consumers' },
  { label: 'Payments',         icon: PaymentsIcon,     path: '/electricity/payments' },
  { label: 'Users',            icon: UsersIcon,        path: '/electricity/users' },
  { label: 'Reports',          icon: ReportsIcon,      path: '/electricity/reports' },
  { label: 'Tariff Rates',     icon: TariffIcon,       path: '/electricity/tariff' },
  { label: 'System Settings',  icon: SettingsIcon,     path: '/electricity/settings' },
];

export default function AdminDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [badges, setBadges] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/dashboard/stats');
        setBadges(res.data);
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const handleDrawerToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen);
    else setDesktopOpen(!desktopOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/electricity/login');
  };

  const isActive = (path) =>
    path === '/electricity'
      ? location.pathname === '/electricity'
      : location.pathname.startsWith(path);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Gradient header */}
      <Box sx={{ p: 2, background: DEPT_GRADIENT, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ElectricBolt sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Electricity Admin
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>
              Power Distribution Dept.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
        {NAV_ITEMS.map(({ label, icon: Icon, path, badgeKey }) => {
          const active = isActive(path);
          const count = badgeKey ? (badges[badgeKey] || 0) : 0;
          return (
            <ListItem key={path} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                onClick={() => { navigate(path); if (isMobile) setMobileOpen(false); }}
                sx={{
                  borderRadius: 1.5,
                  py: 1,
                  px: 1.5,
                  bgcolor: active ? DEPT_COLOR : 'transparent',
                  color: active ? 'white' : 'text.primary',
                  '&:hover': { bgcolor: active ? DEPT_DARK : 'action.hover' },
                  transition: 'background 0.15s',
                }}
              >
                <ListItemIcon sx={{ color: active ? 'white' : DEPT_COLOR, minWidth: 36 }}>
                  <Badge badgeContent={count > 0 ? count : null} color="error" max={99}>
                    <Icon sx={{ fontSize: 20 }} />
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontWeight: active ? 600 : 400, fontSize: '0.9rem' }}
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
            {user?.full_name?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.85rem' }}>
              {user?.full_name || 'Admin'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
              {user?.role || 'admin'}
            </Typography>
          </Box>
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
              <LogoutIcon sx={{ fontSize: 18 }} />
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
            Electricity Department Admin
          </Typography>
          <Tooltip title="Account settings">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
                {user?.full_name?.[0]?.toUpperCase() || 'A'}
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
              <Typography variant="body2">{user?.full_name || 'Admin'}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
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
}
