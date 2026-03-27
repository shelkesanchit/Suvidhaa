import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  IconButton, Tooltip, Chip, Table, TableHead, TableRow,
  TableCell, TableBody, Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AppIcon,
  Report as ComplaintIcon,
  ElectricBolt as BoltIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Warning as WarnIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const DEPT_COLOR = '#1976d2';

const STATUS_COLOR = {
  submitted: 'info', document_verification: 'warning', site_inspection: 'warning',
  approval_pending: 'warning', approved: 'success', work_in_progress: 'info',
  rejected: 'error', completed: 'success', open: 'error', assigned: 'warning',
  in_progress: 'info', resolved: 'success', closed: 'default',
};

const PRIORITY_COLOR = {
  low: 'success', medium: 'warning', high: 'error', critical: 'error',
};

export default function AdminOverview() {
  const [recentApps, setRecentApps] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchAll = async (showToast = false) => {
    try {
      setRefreshing(true);
      const [appsRes, complaintsRes] = await Promise.all([
        api.get('/admin/applications?status=submitted'),
        api.get('/admin/complaints?status=open'),
      ]);
      const apps = Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data.data || []);
      const complaints = Array.isArray(complaintsRes.data) ? complaintsRes.data : (complaintsRes.data.data || []);
      setRecentApps(apps.slice(0, 8));
      setRecentComplaints(complaints.slice(0, 8));
      if (showToast) toast.success('Dashboard refreshed');
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(), 60000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress size={48} sx={{ color: DEPT_COLOR }} />
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1a1a1a' }}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Electricity Department — auto-refreshes every 60 seconds
          </Typography>
        </Box>
        <Tooltip title="Refresh now">
          <span>
            <IconButton
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              sx={{ bgcolor: DEPT_COLOR, color: '#fff', '&:hover': { bgcolor: '#1565c0' }, '&:disabled': { bgcolor: '#bbdefb', color: 'white' } }}
            >
              <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Recent Work */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Pending Applications */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `3px solid ${DEPT_COLOR}` }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Pending Applications</Typography>
                  <Typography variant="caption" color="text.secondary">Awaiting review</Typography>
                </Box>
                <Button size="small" endIcon={<OpenIcon sx={{ fontSize: 13 }} />} onClick={() => navigate('/electricity/applications')} sx={{ fontSize: '0.75rem', color: DEPT_COLOR }}>
                  View All
                </Button>
              </Box>
              {recentApps.length === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <CheckIcon sx={{ fontSize: 36, color: '#c8e6c9', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No pending applications</Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>App No.</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Applicant</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }} align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentApps.map((app) => (
                        <TableRow key={app.id} hover sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }} onClick={() => navigate('/electricity/applications')}>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} color="primary" sx={{ fontFamily: 'monospace' }}>
                              {app.application_number?.slice(-8) || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={500}>{app.full_name}</Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {app.application_type?.replace(/_/g, ' ')}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(app.created_at).toLocaleDateString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={app.status?.replace(/_/g, ' ')} color={STATUS_COLOR[app.status] || 'default'} size="small" sx={{ fontSize: '0.65rem', height: 20, textTransform: 'capitalize' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Open Complaints */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: '3px solid #d32f2f' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Open Complaints</Typography>
                  <Typography variant="caption" color="text.secondary">Needs attention</Typography>
                </Box>
                <Button size="small" endIcon={<OpenIcon sx={{ fontSize: 13 }} />} onClick={() => navigate('/electricity/complaints')} sx={{ fontSize: '0.75rem', color: '#d32f2f' }}>
                  View All
                </Button>
              </Box>
              {recentComplaints.length === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <CheckIcon sx={{ fontSize: 36, color: '#c8e6c9', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No open complaints</Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Complaint No.</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Consumer</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Priority</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentComplaints.map((c) => (
                        <TableRow key={c.id} hover sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }} onClick={() => navigate('/electricity/complaints')}>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} color="error" sx={{ fontFamily: 'monospace' }}>
                              {c.complaint_number?.slice(-8) || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={500}>{c.full_name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">{c.consumer_number}</Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {c.complaint_type?.replace(/_/g, ' ')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={c.priority || '—'} color={PRIORITY_COLOR[c.priority] || 'default'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(c.created_at).toLocaleDateString('en-IN')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Box>
  );
}
