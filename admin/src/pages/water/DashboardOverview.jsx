import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  IconButton, Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import api from '../../utils/water/api';
import toast from 'react-hot-toast';

const DEPT_COLOR = '#0288d1';
const COLORS = ['#0288d1', '#00bcd4', '#4fc3f7', '#80deea', '#b2ebf2', '#4dd0e1'];

const ChartCard = ({ title, subtitle, height = 300, children }) => (
  <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `3px solid ${DEPT_COLOR}` }}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{subtitle}</Typography>}
      <Box sx={{ height, mt: subtitle ? 0 : 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);

const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async (showToast = false) => {
    try {
      setRefreshing(true);
      const response = await api.get('/water/admin/dashboard/stats');
      setStats(response.data.data);
      if (showToast) toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to fetch dashboard stats');
      setStats({
        total_consumers: 0, active_connections: 0, pending_applications: 0,
        open_complaints: 0, today_revenue: 0, month_revenue: 0,
        today_applications: 0, today_complaints: 0,
        applicationsTrend: [], revenueTrend: [],
        applicationsByType: [], complaintsByCategory: [], complaintsByStatus: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress sx={{ color: DEPT_COLOR }} size={48} />
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1a1a1a' }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Water Department — auto-refreshes every 30 seconds
          </Typography>
        </Box>
        <Tooltip title="Refresh now">
          <span>
            <IconButton
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              sx={{ bgcolor: DEPT_COLOR, color: 'white', '&:hover': { bgcolor: '#01579b' }, '&:disabled': { bgcolor: '#b3e5fc', color: 'white' } }}
            >
              <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard title="Applications Trend" subtitle="Monthly applications vs approvals" height={300}>
            <AreaChart data={stats?.applicationsTrend || []}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0288d1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0288d1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="applications" stroke="#0288d1" fill="url(#colorApps)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="approved" stroke="#4caf50" fill="url(#colorApproved)" strokeWidth={2} name="Approved" />
              <Line type="monotone" dataKey="rejected" stroke="#f44336" strokeWidth={2} name="Rejected" dot={false} />
            </AreaChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <ChartCard title="Applications by Type" height={300}>
            <PieChart>
              <Pie
                data={stats?.applicationsByType || []}
                cx="50%" cy="50%"
                outerRadius="70%"
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(stats?.applicationsByType || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip />
            </PieChart>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <ChartCard title="Revenue Collection" subtitle="Monthly revenue trend" height={280}>
            <BarChart data={stats?.revenueTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <ChartTooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#0288d1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6}>
          <ChartCard title="Complaints by Category" height={280}>
            <BarChart data={stats?.complaintsByCategory || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
              <ChartTooltip />
              <Bar dataKey="value" fill="#00bcd4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;
