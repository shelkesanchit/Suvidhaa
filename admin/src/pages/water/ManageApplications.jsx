import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Paper,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Visibility,
  Search,
  FilterList,
  Refresh,
  CheckCircle,
  Cancel,
  Schedule,
  Engineering,
} from '@mui/icons-material';
import api from "../../utils/water/api";
import toast from 'react-hot-toast';

const ManageApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionData, setActionData] = useState({ status: '', remarks: '', current_stage: '', assigned_engineer: '' });

  useEffect(() => {
    fetchApplications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchApplications, 30000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get(`/water/admin/applications?${params}`);
      setApplications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to fetch applications from database');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchApplications();
  };

  const handleOpenDialog = (app) => {
    setSelectedApp(app);
    setActionData({
      status: app.status,
      remarks: '',
      current_stage: app.current_stage || '',
      assigned_engineer: app.assigned_engineer || ''
    });
    setDialogOpen(true);
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setDetailsOpen(true);
  };

  const handleUpdateStatus = async () => {
    try {
      await api.put(`/water/admin/applications/${selectedApp.id}`, actionData);
      toast.success('Application updated successfully');
      setDialogOpen(false);
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update application');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'info',
      document_verification: 'warning',
      site_inspection: 'secondary',
      approval_pending: 'warning',
      approved: 'success',
      rejected: 'error',
      work_in_progress: 'primary',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      submitted: 'Submitted',
      document_verification: 'Doc Verification',
      site_inspection: 'Site Inspection',
      approval_pending: 'Approval Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      work_in_progress: 'Work in Progress',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const stageOptions = [
    { value: 'Application Submitted', label: 'Application Submitted' },
    { value: 'Document Verification', label: 'Document Verification' },
    { value: 'Site Inspection Scheduled', label: 'Site Inspection Scheduled' },
    { value: 'Site Inspection Completed', label: 'Site Inspection Completed' },
    { value: 'Approval Pending', label: 'Approval Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Work Order Issued', label: 'Work Order Issued' },
    { value: 'Work in Progress', label: 'Work in Progress' },
    { value: 'Connection Completed', label: 'Connection Completed' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'document_verification', label: 'Document Verification' },
    { value: 'site_inspection', label: 'Site Inspection' },
    { value: 'approval_pending', label: 'Approval Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'work_in_progress', label: 'Work in Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

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
            Manage Applications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and process water connection applications
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchApplications}
          sx={{ minWidth: 'fit-content' }}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, mobile, or application number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Filter by Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" fullWidth onClick={handleSearch}>
                Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : applications.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No applications found</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Application #</strong></TableCell>
                  <TableCell><strong>Applicant</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Pipe Size</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Fee</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {app.application_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{app.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {app.mobile}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={app.application_type?.replace('_', ' ')} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{app.pipe_size_requested}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(app.status)}
                        color={getStatusColor(app.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>₹{app.total_fee?.toLocaleString()}</TableCell>
                    <TableCell>
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewDetails(app)}
                        title="View Details"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleOpenDialog(app)}
                        title="Update Status"
                      >
                        <Engineering />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Update Application Status
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Application: <strong>{selectedApp?.application_number}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Applicant: <strong>{selectedApp?.full_name}</strong>
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Status"
                value={actionData.status}
                onChange={(e) => setActionData({ ...actionData, status: e.target.value })}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Current Stage"
                value={actionData.current_stage}
                onChange={(e) => setActionData({ ...actionData, current_stage: e.target.value })}
              >
                {stageOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assigned Engineer"
                value={actionData.assigned_engineer}
                onChange={(e) => setActionData({ ...actionData, assigned_engineer: e.target.value })}
                placeholder="Enter engineer name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Remarks"
                value={actionData.remarks}
                onChange={(e) => setActionData({ ...actionData, remarks: e.target.value })}
                placeholder="Add any remarks or notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Application Details - {selectedApp?.application_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedApp && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Current Status: <strong>{getStatusLabel(selectedApp.status)}</strong> | 
                  Stage: <strong>{selectedApp.current_stage}</strong>
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Applicant Details</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Typography><strong>Name:</strong> {selectedApp.full_name}</Typography>
                  <Typography><strong>Mobile:</strong> {selectedApp.mobile}</Typography>
                  <Typography><strong>Email:</strong> {selectedApp.email || 'N/A'}</Typography>
                  <Typography><strong>Aadhaar:</strong> {selectedApp.aadhaar_number || 'N/A'}</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Connection Details</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Typography><strong>Type:</strong> {selectedApp.application_type?.replace('_', ' ')}</Typography>
                  <Typography><strong>Property Type:</strong> {selectedApp.property_type}</Typography>
                  <Typography><strong>Pipe Size:</strong> {selectedApp.pipe_size_requested}</Typography>
                  <Typography><strong>Purpose:</strong> {selectedApp.connection_purpose || 'Drinking'}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Typography>{selectedApp.address || `${selectedApp.house_flat_no}, ${selectedApp.building_name}, Ward ${selectedApp.ward}`}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Fee Details</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Application Fee</Typography>
                      <Typography fontWeight={600}>₹{selectedApp.application_fee || 500}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Connection Fee</Typography>
                      <Typography fontWeight={600}>₹{selectedApp.connection_fee || 0}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Total Fee</Typography>
                      <Typography fontWeight={600} color="primary">₹{selectedApp.total_fee?.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Stage History</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Stepper orientation="vertical">
                    {(selectedApp.stage_history || []).map((stage, index) => (
                      <Step key={index} active completed>
                        <StepLabel>
                          <Typography variant="body2">{stage.stage}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(stage.timestamp).toLocaleString()}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setDetailsOpen(false);
              handleOpenDialog(selectedApp);
            }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageApplications;
