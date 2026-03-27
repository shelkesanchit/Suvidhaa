import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import api from '../../utils/municipal/api';

const DEPT_COLOR = '#2e7d32';

const APP_TYPE_LABELS = {
  birth_certificate: 'Birth Certificate',
  death_certificate: 'Death Certificate',
  marriage_certificate: 'Marriage Certificate',
  domicile_certificate: 'Domicile Certificate',
  building_plan_approval: 'Building Plan Approval',
  completion_certificate: 'Completion Certificate',
  occupancy_certificate: 'Occupancy Certificate',
  demolition_permission: 'Demolition Permission',
  public_grievance: 'Public Grievance',
  rtl_application: 'RTI Application',
  health_license: 'Health License',
  food_establishment_license: 'Food Establishment',
  environmental_noc: 'Environmental NOC',
  housing_scheme_application: 'Housing Scheme',
  tenement_registration: 'Tenement Reg.',
  road_repair_request: 'Road Repair',
  road_cutting_permission: 'Road Cutting',
  street_light_complaint: 'Street Light',
  garbage_collection_complaint: 'Garbage Collection',
  drainage_repair: 'Drainage Repair',
  new_trade_license: 'New Trade License',
  trade_license_renewal: 'License Renewal',
  trade_license_amendment: 'License Amendment',
  shop_establishment: 'Shop Establishment',
  name_change: 'Name Change',
  address_proof: 'Address Proof',
  income_certificate: 'Income Certificate',
  caste_certificate: 'Caste Certificate',
  residence_certificate: 'Residence Certificate',
  noc_certificate: 'NOC Certificate',
};

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
      const response = await api.get('/municipal/admin/dashboard/stats');
      if (response.data?.data) {
        const data = response.data.data;
        setRecentApplications(data.recentApplications || []);
        setRecentComplaints(data.recentComplaints || []);
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
            Municipal Corporation — recent activity
          </Typography>
        </Box>
        <Tooltip title="Refresh data">
          <span>
            <IconButton
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              sx={{ bgcolor: DEPT_COLOR, color: 'white', '&:hover': { bgcolor: '#1b5e20' }, '&:disabled': { bgcolor: '#c8e6c9', color: 'white' } }}
            >
              <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Recent Applications */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%', borderTop: `3px solid ${DEPT_COLOR}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent Applications</Typography>
                <Typography variant="caption" color="text.secondary">Latest submissions</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>App No.</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Applicant</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentApplications.length > 0 ? (
                      recentApplications.slice(0, 8).map((app, i) => (
                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} sx={{ color: DEPT_COLOR, fontFamily: 'monospace' }}>
                              {app.application_number?.slice(-8) || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={500}>{app.full_name || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption">
                              {APP_TYPE_LABELS[app.application_type] || app.application_type || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {statusChip(
                              app.status?.replace(/_/g, ' ') || '—',
                              app.status === 'approved' || app.status === 'completed' ? 'success' :
                              app.status === 'rejected' ? 'error' :
                              app.status === 'submitted' ? 'warning' : 'default'
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 5, textAlign: 'center' }}>
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
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%', borderTop: '3px solid #d32f2f', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent Complaints</Typography>
                <Typography variant="caption" color="text.secondary">Latest submissions</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Complaint No.</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>Urgency</TableCell>
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
                              {c.complaint_category?.replace(/_/g, ' ') || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {statusChip(
                              c.urgency || '—',
                              c.urgency === 'critical' ? 'error' : c.urgency === 'high' ? 'warning' : 'default'
                            )}
                          </TableCell>
                          <TableCell>
                            {statusChip(
                              c.status?.replace(/_/g, ' ') || '—',
                              c.status === 'resolved' || c.status === 'closed' ? 'success' : c.status === 'in_progress' ? 'info' : 'warning'
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 5, textAlign: 'center' }}>
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
