import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import api from '../../utils/gas/api';

const DEPT_COLOR = '#ff6b35';

const statusChip = (label, color) => (
  <Chip label={label} size="small" color={color} sx={{ textTransform: 'capitalize', fontSize: '0.7rem', height: 22 }} />
);

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const response = await api.get('/gas/admin/dashboard/stats');
      if (response.data?.data) {
        const data = response.data.data;
        setRecentApplications(data.recent_applications || []);
        setRecentComplaints(data.recent_complaints || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress sx={{ color: DEPT_COLOR }} />
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
            Gas Distribution — recent activity
          </Typography>
        </Box>
        <Tooltip title="Refresh data">
          <span>
            <IconButton
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              sx={{ bgcolor: DEPT_COLOR, color: 'white', '&:hover': { bgcolor: '#e55a2b' }, '&:disabled': { bgcolor: '#ffccbb', color: 'white' } }}
            >
              <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Recent Applications */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderTop: `3px solid ${DEPT_COLOR}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent Applications</Typography>
                <Typography variant="caption" color="text.secondary">Latest 5 submissions</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>App No.</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Applicant</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentApplications.length > 0 ? (
                      recentApplications.slice(0, 5).map((app, i) => (
                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} color="primary" sx={{ fontFamily: 'monospace' }}>
                              {app.application_number?.slice(-8) || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={500}>{app.full_name || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {app.connection_type?.replace(/_/g, ' ') || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {statusChip(
                              app.application_status?.replace(/_/g, ' ') || '—',
                              app.application_status === 'approved' ? 'success' : app.application_status === 'pending' ? 'warning' : 'default'
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 4, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">No recent applications</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Complaints */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderTop: '3px solid #d32f2f', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent Complaints</Typography>
                <Typography variant="caption" color="text.secondary">Latest 5 complaints</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Complaint No.</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentComplaints.length > 0 ? (
                      recentComplaints.slice(0, 5).map((c, i) => (
                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} color="error" sx={{ fontFamily: 'monospace' }}>
                              {c.complaint_number?.slice(-8) || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {c.complaint_type?.replace(/-/g, ' ') || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {statusChip(
                              c.priority || '—',
                              c.priority === 'urgent' ? 'error' : c.priority === 'high' ? 'warning' : 'default'
                            )}
                          </TableCell>
                          <TableCell>
                            {statusChip(
                              c.status?.replace(/_/g, ' ') || '—',
                              c.status === 'resolved' ? 'success' : c.status === 'in_progress' ? 'info' : 'warning'
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 4, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">No recent complaints</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;
