import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Paper,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Download,
  Refresh,
  Assessment,
  TrendingUp,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  DateRange,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import api from "../../utils/water/api";
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState({
    summary: {},
    collections: [],
    applications: [],
    complaints: [],
    categoryWise: [],
    wardWise: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, selectedMonth]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/water/admin/reports?type=${reportType}&month=${selectedMonth}`);
      const raw = response.data.data || {};

      // Summary
      const totalConsumers = (raw.consumers || []).reduce((s, c) => s + Number(c.total || 0), 0);
      const activeConnections = (raw.consumers || []).reduce((s, c) => s + Number(c.active || 0), 0);
      const totalCollected = Number(raw.revenue?.total || 0);
      const totalApplications = (raw.applications || []).reduce((s, a) => s + Number(a.count || 0), 0);
      const totalComplaints = (raw.complaints || []).reduce((s, c) => s + Number(c.total || 0), 0);
      const resolvedComplaints = (raw.complaints || []).reduce((s, c) => s + Number(c.resolved || 0), 0);

      // Daily revenue as collections
      const collections = (raw.revenue?.daily || []).map(d => ({
        month: d.date,
        billed: Number(d.revenue || 0),
        collected: Number(d.revenue || 0),
      }));

      // Applications by type with status breakdown
      const appMap = {};
      for (const row of (raw.applications || [])) {
        const type = row.application_type || 'Other';
        if (!appMap[type]) appMap[type] = { type, pending: 0, approved: 0, rejected: 0 };
        const status = (row.status || '').toLowerCase();
        const cnt = Number(row.count || 0);
        if (status === 'approved' || status === 'completed') appMap[type].approved += cnt;
        else if (status === 'rejected') appMap[type].rejected += cnt;
        else appMap[type].pending += cnt;
      }

      // Complaints by category
      const complaints = (raw.complaints || []).map(c => ({
        category: c.complaint_category || 'Other',
        open: Math.max(0, Number(c.total || 0) - Number(c.resolved || 0)),
        resolved: Number(c.resolved || 0),
      }));

      // Category wise consumers
      const categoryWise = (raw.consumers || []).map(c => ({
        category: c.category || 'Other',
        consumers: Number(c.total || 0),
        revenue: Number(c.outstanding_dues || 0),
      }));

      setReportData({
        summary: {
          totalConsumers,
          activeConnections,
          totalBilled: totalCollected,
          totalCollected,
          totalApplications,
          totalComplaints,
          resolvedComplaints,
        },
        collections,
        applications: Object.values(appMap),
        complaints,
        categoryWise,
        wardWise: [],
      });
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to fetch report data from database');
      setReportData({
        summary: { totalConsumers: 0, activeConnections: 0, totalBilled: 0, totalCollected: 0, totalApplications: 0, totalComplaints: 0, resolvedComplaints: 0 },
        collections: [],
        categoryWise: [],
        wardWise: [],
        applications: [],
        complaints: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    toast.success('Report export feature coming soon!');
  };

  const handleExportExcel = () => {
    toast.success('Excel export feature coming soon!');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={600} color="primary.dark" sx={{ mb: 0.5 }}>
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive water department reports and statistics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExportPDF} size="small">
            Export PDF
          </Button>
          <Button variant="contained" startIcon={<Download />} onClick={handleExportExcel} size="small">
            Export Excel
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Report Period"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="month"
                label="Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" fullWidth startIcon={<Refresh />} onClick={fetchReportData}>
                Generate
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {reportData.summary.totalConsumers?.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Consumers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="success.main">
                ₹{reportData.summary.totalCollected?.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Collected</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {reportData.summary.totalApplications}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Applications</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: '#fce4ec' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {(reportData.summary.totalComplaints || 0) - (reportData.summary.resolvedComplaints || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pending Complaints</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Revenue" icon={<TrendingUp />} iconPosition="start" />
          <Tab label="Category Analysis" icon={<PieChartIcon />} iconPosition="start" />
          <Tab label="Applications" icon={<Assessment />} iconPosition="start" />
          <Tab label="Complaints" icon={<BarChartIcon />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* Revenue Tab */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Monthly Billing vs Collection</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.collections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000)}K`} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="billed" 
                        stackId="1"
                        stroke="#1976d2" 
                        fill="#1976d233" 
                        name="Billed Amount" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="collected" 
                        stackId="2"
                        stroke="#2e7d32" 
                        fill="#2e7d3233" 
                        name="Collected Amount" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Ward-wise Revenue</Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.wardWise} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `₹${(v/1000)}K`} />
                      <YAxis type="category" dataKey="ward" width={80} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#1976d2" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Collection Efficiency</Typography>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e8f5e9', height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="h2" fontWeight={700} color="success.main">
                    {reportData.summary.totalBilled > 0 ? Math.round((reportData.summary.totalCollected / reportData.summary.totalBilled) * 100) : 0}%
                  </Typography>
                  <Typography variant="h6" color="text.secondary">Collection Rate</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Billed: ₹{reportData.summary.totalBilled?.toLocaleString()} | 
                      Collected: ₹{reportData.summary.totalCollected?.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Category Analysis Tab */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Consumer Distribution by Category</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.categoryWise}
                        dataKey="consumers"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.categoryWise.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Revenue by Category</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.categoryWise}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000)}K`} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#1976d2" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Category-wise Summary</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell align="right"><strong>Consumers</strong></TableCell>
                      <TableCell align="right"><strong>Revenue</strong></TableCell>
                      <TableCell align="right"><strong>Avg Revenue/Consumer</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.categoryWise.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell align="right">{row.consumers?.toLocaleString() || 0}</TableCell>
                        <TableCell align="right">₹{row.revenue?.toLocaleString() || 0}</TableCell>
                        <TableCell align="right">₹{row.consumers > 0 ? Math.round(row.revenue / row.consumers).toLocaleString() : 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* Applications Tab */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>Application Status by Type</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.applications}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pending" fill="#ff9800" name="Pending" />
                      <Bar dataKey="approved" fill="#4caf50" name="Approved" />
                      <Bar dataKey="rejected" fill="#f44336" name="Rejected" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>Application Summary</Typography>
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {reportData.applications.reduce((sum, a) => sum + a.pending, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Pending Applications</Typography>
                </Paper>
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {reportData.applications.reduce((sum, a) => sum + a.approved, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Approved Applications</Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {reportData.applications.reduce((sum, a) => sum + a.rejected, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Rejected Applications</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Complaints Tab */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>Complaints by Category</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.complaints} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="open" fill="#f44336" name="Open" />
                      <Bar dataKey="resolved" fill="#4caf50" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>Resolution Rate</Typography>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e8f5e9', mb: 2 }}>
                  <Typography variant="h2" fontWeight={700} color="success.main">
                    {reportData.summary.totalComplaints > 0 ? Math.round((reportData.summary.resolvedComplaints / reportData.summary.totalComplaints) * 100) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Complaints Resolved</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total:</strong> {reportData.summary.totalComplaints || 0}
                  </Typography>
                  <Typography variant="body2" gutterBottom color="success.main">
                    <strong>Resolved:</strong> {reportData.summary.resolvedComplaints || 0}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    <strong>Pending:</strong> {(reportData.summary.totalComplaints || 0) - (reportData.summary.resolvedComplaints || 0)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
