import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Visibility, Refresh, Search, Warning } from '@mui/icons-material';
import api from '../../utils/municipal/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DEPT_LABELS = {
  vital_records: 'Vital Records',
  building: 'Building',
  grievance: 'Grievance',
  health_env: 'Health & Env',
  housing: 'Housing',
  roads: 'Roads',
  sanitation: 'Sanitation',
  trade_license: 'Trade License',
  admin_services: 'Admin Services',
  general: 'General',
};

const getUrgencyColor = (urgency) => {
  if (urgency === 'critical') return 'error';
  if (urgency === 'high') return 'warning';
  if (urgency === 'medium') return 'info';
  return 'default';
};

const getStatusColor = (status) => {
  if (status === 'resolved' || status === 'closed') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'assigned') return 'primary';
  return 'warning';
};

const ManageComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updateForm, setUpdateForm] = useState({ status: '', resolution_notes: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, urgencyFilter, deptFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (urgencyFilter) params.urgency = urgencyFilter;
      if (deptFilter) params.department = deptFilter;
      if (searchTerm) params.search = searchTerm;
      const response = await api.get('/municipal/admin/complaints', { params });
      setComplaints(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = complaints.filter(
    c => c.urgency === 'critical' && !['resolved', 'closed'].includes(c.status)
  ).length;

  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateForm({ status: complaint.status || '', resolution_notes: '' });
    setDetailsOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedComplaint) return;
    try {
      setProcessing(true);
      await api.patch(`/municipal/admin/complaints/${selectedComplaint.id}/status`, updateForm);
      toast.success('Complaint status updated');
      fetchComplaints();
      setDetailsOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { field: 'complaint_number', headerName: 'Complaint No.', width: 150 },
    { field: 'contact_name', headerName: 'Contact', width: 150 },
    { field: 'mobile', headerName: 'Mobile', width: 120 },
    { field: 'complaint_category', headerName: 'Category', width: 160,
      valueFormatter: (params) => params.value?.replace(/_/g, ' ') },
    {
      field: 'department',
      headerName: 'Department',
      width: 130,
      valueFormatter: (params) => DEPT_LABELS[params.value] || params.value,
    },
    {
      field: 'urgency',
      headerName: 'Urgency',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color={getUrgencyColor(params.value)} />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip label={params.value?.replace(/_/g, ' ')} size="small" color={getStatusColor(params.value)} />
      ),
    },
    {
      field: 'submitted_at',
      headerName: 'Submitted',
      width: 110,
      valueFormatter: (params) => {
        try { return format(new Date(params.value), 'dd/MM/yyyy'); } catch { return params.value; }
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      renderCell: (params) => (
        <Tooltip title="View & Update">
          <IconButton onClick={() => handleViewDetails(params.row)} size="small">
            <Visibility />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const filteredComplaints = complaints.filter(c =>
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.complaint_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile?.includes(searchTerm)
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Manage Complaints
      </Typography>

      {/* Critical complaints alert */}
      {criticalCount > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee', border: '1px solid #f44336' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            <Typography color="error" fontWeight={600}>
              {criticalCount} critical complaint{criticalCount > 1 ? 's' : ''} require immediate attention!
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, complaint no., or mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchComplaints()}
              InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Urgency</InputLabel>
              <Select value={urgencyFilter} label="Urgency" onChange={(e) => setUrgencyFilter(e.target.value)}>
                <MenuItem value="">All Urgency</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select value={deptFilter} label="Department" onChange={(e) => setDeptFilter(e.target.value)}>
                <MenuItem value="">All Departments</MenuItem>
                {Object.entries(DEPT_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button startIcon={<Refresh />} onClick={fetchComplaints} variant="outlined" size="small">
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredComplaints}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Details / Update Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complaint Details & Status Update</DialogTitle>
        <DialogContent dividers>
          {selectedComplaint && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Complaint Number</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.complaint_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Contact Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.contact_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Mobile</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.mobile}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Department</Typography>
                <Typography variant="body1" gutterBottom>
                  {DEPT_LABELS[selectedComplaint.department] || selectedComplaint.department}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedComplaint.complaint_category?.replace(/_/g, ' ')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Urgency</Typography>
                <Chip
                  label={selectedComplaint.urgency}
                  size="small"
                  color={getUrgencyColor(selectedComplaint.urgency)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Current Status</Typography>
                <Chip
                  label={selectedComplaint.status?.replace(/_/g, ' ')}
                  size="small"
                  color={getStatusColor(selectedComplaint.status)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Submitted At</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedComplaint.submitted_at
                    ? format(new Date(selectedComplaint.submitted_at), 'dd/MM/yyyy HH:mm')
                    : '-'}
                </Typography>
              </Grid>

              {/* Update Fields */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1, mb: 1 }}>
                  Update Status
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>New Status</InputLabel>
                  <Select
                    value={updateForm.status}
                    label="New Status"
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="assigned">Assigned</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {(updateForm.status === 'resolved' || updateForm.status === 'closed') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Resolution Notes"
                    multiline
                    rows={3}
                    value={updateForm.resolution_notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, resolution_notes: e.target.value })}
                    placeholder="Describe how the complaint was resolved..."
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            color="primary"
            disabled={processing || !updateForm.status}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageComplaints;
