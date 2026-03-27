import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Paper, Typography, Button,
  FormControl, InputLabel, Select, MenuItem, TextField,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { format, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

const DEPT_COLOR = '#ff6b35';
const COLORS = ['#ff6b35', '#f7931e', '#2e7d32', '#0288d1', '#9c27b0'];

const monthlyData = [
  { month: 'Jan', newConnections: 85, revenue: 125000, complaints: 12 },
  { month: 'Feb', newConnections: 92, revenue: 138000, complaints: 8 },
  { month: 'Mar', newConnections: 108, revenue: 156000, complaints: 15 },
  { month: 'Apr', newConnections: 95, revenue: 142000, complaints: 10 },
  { month: 'May', newConnections: 110, revenue: 168000, complaints: 7 },
  { month: 'Jun', newConnections: 125, revenue: 185000, complaints: 11 },
];

const connectionTypeData = [
  { name: 'PNG Domestic', value: 450 },
  { name: 'PNG Commercial', value: 180 },
  { name: 'PNG Industrial', value: 65 },
  { name: 'LPG Single', value: 320 },
  { name: 'LPG Double', value: 85 },
];

const cylinderSalesData = [
  { month: 'Jan', '14.2kg': 520, '19kg': 180, '5kg': 95 },
  { month: 'Feb', '14.2kg': 580, '19kg': 210, '5kg': 110 },
  { month: 'Mar', '14.2kg': 610, '19kg': 195, '5kg': 125 },
  { month: 'Apr', '14.2kg': 550, '19kg': 220, '5kg': 105 },
  { month: 'May', '14.2kg': 640, '19kg': 240, '5kg': 130 },
  { month: 'Jun', '14.2kg': 680, '19kg': 260, '5kg': 145 },
];

const ChartCard = ({ title, height = 300, children }) => (
  <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `3px solid ${DEPT_COLOR}` }}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
      <Box sx={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);

const Reports = () => {
  const [reportType, setReportType] = useState('monthly');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleExport = (fmt) => toast.success(`Report exported as ${fmt.toUpperCase()}`);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1a1a1a' }}>
          Reports & Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
          Gas distribution performance overview
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Report Type</InputLabel>
                <Select value={reportType} label="Report Type" onChange={(e) => setReportType(e.target.value)}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {reportType === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" type="date" label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" type="date" label="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6} md={reportType === 'custom' ? 3 : 9}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button variant="contained" size="small" startIcon={<Download />} onClick={() => handleExport('pdf')} sx={{ bgcolor: DEPT_COLOR, '&:hover': { bgcolor: '#e55a2b' } }}>
                  PDF
                </Button>
                <Button variant="outlined" size="small" startIcon={<Download />} onClick={() => handleExport('excel')} sx={{ borderColor: DEPT_COLOR, color: DEPT_COLOR, '&:hover': { borderColor: '#e55a2b', color: '#e55a2b' } }}>
                  Excel
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Connections & Revenue Trend" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, name) => [name === 'Revenue (₹)' ? `₹${v.toLocaleString()}` : v, name]} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="newConnections" fill={DEPT_COLOR} name="New Connections" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" fill="#2e7d32" name="Revenue (₹)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ChartCard title="Connection Distribution" height={300}>
            <PieChart>
              <Pie
                data={connectionTypeData}
                cx="50%" cy="50%"
                innerRadius="35%"
                outerRadius="65%"
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {connectionTypeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Chart Row 2 */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ChartCard title="Cylinder Sales by Type" height={280}>
            <LineChart data={cylinderSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="14.2kg" stroke={DEPT_COLOR} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="19kg" stroke="#f7931e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="5kg" stroke="#2e7d32" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
