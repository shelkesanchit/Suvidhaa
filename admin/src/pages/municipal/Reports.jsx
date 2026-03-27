import React from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const DEPT_COLOR = '#2e7d32';
const COLORS = ['#2e7d32', '#f57c00', '#0288d1', '#d32f2f', '#7b1fa2', '#00897b', '#e64a19', '#1565c0', '#558b2f'];

const monthlyApplications = [
  { month: 'Oct', applications: 145, resolved: 120 },
  { month: 'Nov', applications: 162, resolved: 148 },
  { month: 'Dec', applications: 138, resolved: 130 },
  { month: 'Jan', applications: 175, resolved: 160 },
  { month: 'Feb', applications: 190, resolved: 175 },
  { month: 'Mar', applications: 210, resolved: 195 },
];

const deptDistribution = [
  { name: 'Vital Records', value: 22 },
  { name: 'Building', value: 18 },
  { name: 'Grievance', value: 15 },
  { name: 'Health & Env', value: 12 },
  { name: 'Housing', value: 10 },
  { name: 'Roads', value: 8 },
  { name: 'Sanitation', value: 7 },
  { name: 'Trade License', value: 5 },
  { name: 'Admin Services', value: 3 },
];

const complaintsTrend = [
  { month: 'Oct', received: 45, resolved: 38 },
  { month: 'Nov', received: 52, resolved: 48 },
  { month: 'Dec', received: 40, resolved: 38 },
  { month: 'Jan', received: 60, resolved: 55 },
  { month: 'Feb', received: 55, resolved: 50 },
  { month: 'Mar', received: 70, resolved: 65 },
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
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1a1a1a' }}>
          Reports & Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
          Municipal services performance overview
        </Typography>
      </Box>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Monthly Applications vs Resolved" height={300}>
            <BarChart data={monthlyApplications}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="applications" fill={DEPT_COLOR} name="Applications" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resolved" fill="#66bb6a" name="Resolved" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ChartCard title="Applications by Department" height={300}>
            <PieChart>
              <Pie
                data={deptDistribution}
                cx="50%" cy="50%"
                outerRadius="70%"
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {deptDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [`${v}%`, name]} />
            </PieChart>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Complaints — Received vs Resolved" height={270}>
            <LineChart data={complaintsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="received" stroke="#d32f2f" strokeWidth={2} name="Received" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="resolved" stroke={DEPT_COLOR} strokeWidth={2} name="Resolved" dot={{ r: 4 }} />
            </LineChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `3px solid ${DEPT_COLOR}` }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Department Distribution</Typography>
              <Box sx={{ mt: 1 }}>
                {deptDistribution.slice(0, 5).map((dept, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i], flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary">{dept.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} color={COLORS[i]}>{dept.value}%</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
