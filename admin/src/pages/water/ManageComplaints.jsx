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
  Avatar,
  Rating,
} from '@mui/material';
import {
  Visibility,
  Search,
  Refresh,
  Engineering,
  WaterDrop,
  Speed,
  Build,
  Receipt,
  Warning,
  BugReport,
  CheckCircle,
} from '@mui/icons-material';
import api from "../../utils/water/api";
import toast from 'react-hot-toast';

const categoryIcons = {
  'no-water': <WaterDrop />,
  'low-pressure': <Speed />,
  'contaminated': <BugReport />,
  'pipeline-leak': <Build />,
  'meter-stopped': <Speed />,
  'high-bill': <Receipt />,
  'other': <Warning />,
};

const categoryColors = {
  'no-water': '#f44336',
  'low-pressure': '#ff9800',
  'contaminated': '#795548',
  'pipeline-leak': '#e91e63',
  'meter-stopped': '#673ab7',
  'high-bill': '#9c27b0',
  'other': '#607d8b',
};

const ManageComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionData, setActionData] = useState({ status: '', assigned_engineer: '', resolution_notes: '', priority: 5 });

  useEffect(() => {
    fetchComplaints();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchComplaints, 30000);
    return () => clearInterval(interval);
  }, [filterStatus, filterCategory]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get(`/water/admin/complaints?${params}`);
      setComplaints(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      toast.error('Failed to fetch complaints from database');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchComplaints();
  };

  const handleOpenDialog = (complaint) => {
    setSelectedComplaint(complaint);
    setActionData({
      status: complaint.status,
      assigned_engineer: complaint.assigned_engineer || '',
      resolution_notes: complaint.resolution_notes || '',
      priority: complaint.priority || 5
    });
    setDialogOpen(true);
  };

  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setDetailsOpen(true);
  };

  const handleUpdateComplaint = async () => {
    try {
      await api.put(`/water/admin/complaints/${selectedComplaint.id}`, actionData);
      toast.success('Complaint updated successfully');
      setDialogOpen(false);
      fetchComplaints();
    } catch (error) {
      toast.error('Failed to update complaint');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'error',
      assigned: 'info',
      in_progress: 'warning',
      resolved: 'success',
      closed: 'default',
      reopened: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
      reopened: 'Reopened',
    };
    return labels[status] || status;
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error',
    };
    return colors[urgency] || 'default';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'no-water': 'No Water Supply',
      'low-pressure': 'Low Pressure',
      'contaminated': 'Contaminated Water',
      'pipeline-leak': 'Pipeline Leak',
      'meter-stopped': 'Meter Stopped',
      'high-bill': 'High Bill',
      'other': 'Other',
    };
    return labels[category] || category;
  };

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const categoryOptions = [
    { value: 'no-water', label: 'No Water Supply' },
    { value: 'low-pressure', label: 'Low Pressure' },
    { value: 'contaminated', label: 'Contaminated Water' },
    { value: 'pipeline-leak', label: 'Pipeline Leak' },
    { value: 'meter-stopped', label: 'Meter Stopped' },
    { value: 'high-bill', label: 'High Bill' },
    { value: 'other', label: 'Other' },
  ];

  const openCount = complaints.filter(c => c.status === 'open').length;
  const assignedCount = complaints.filter(c => c.status === 'assigned').length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;

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
            Manage Complaints
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and resolve water supply complaints
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchComplaints}
          sx={{ minWidth: 'fit-content' }}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search..."
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
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                size="small"
                select
                label="Category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categoryOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" fullWidth onClick={handleSearch}>
                Filter
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : complaints.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No complaints found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Complaint #</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Complainant</strong></TableCell>
                  <TableCell><strong>Ward</strong></TableCell>
                  <TableCell><strong>Urgency</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Assigned To</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow 
                    key={complaint.id} 
                    hover
                    sx={{
                      borderLeft: complaint.urgency === 'critical' ? '4px solid #f44336' : 
                                  complaint.urgency === 'high' ? '4px solid #ff9800' : 'none'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {complaint.complaint_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 28, 
                            height: 28, 
                            bgcolor: categoryColors[complaint.complaint_category] || '#607d8b'
                          }}
                        >
                          {categoryIcons[complaint.complaint_category] || <Warning sx={{ fontSize: 16 }} />}
                        </Avatar>
                        <Typography variant="body2">
                          {getCategoryLabel(complaint.complaint_category)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{complaint.contact_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {complaint.mobile}
                      </Typography>
                    </TableCell>
                    <TableCell>Ward {complaint.ward}</TableCell>
                    <TableCell>
                      <Chip
                        label={complaint.urgency}
                        color={getUrgencyColor(complaint.urgency)}
                        size="small"
                        variant={complaint.urgency === 'critical' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(complaint.status)}
                        color={getStatusColor(complaint.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {complaint.assigned_engineer || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewDetails(complaint)}
                        title="View Details"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleOpenDialog(complaint)}
                        title="Update Status"
                      >
                        <Engineering />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Update Complaint
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Complaint: <strong>{selectedComplaint?.complaint_number}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Category: <strong>{getCategoryLabel(selectedComplaint?.complaint_category)}</strong>
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
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
                label="Assigned Engineer"
                value={actionData.assigned_engineer}
                onChange={(e) => setActionData({ ...actionData, assigned_engineer: e.target.value })}
                placeholder="Enter engineer name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Priority (1-10, 1 is highest)"
                value={actionData.priority}
                onChange={(e) => setActionData({ ...actionData, priority: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                  <MenuItem key={p} value={p}>
                    {p} {p <= 3 ? '(High)' : p <= 6 ? '(Medium)' : '(Low)'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Resolution Notes"
                value={actionData.resolution_notes}
                onChange={(e) => setActionData({ ...actionData, resolution_notes: e.target.value })}
                placeholder="Add resolution details..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateComplaint}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Complaint Details - {selectedComplaint?.complaint_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedComplaint && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert 
                  severity={selectedComplaint.status === 'resolved' ? 'success' : 
                           selectedComplaint.urgency === 'critical' ? 'error' : 'warning'}
                >
                  Status: <strong>{getStatusLabel(selectedComplaint.status)}</strong> | 
                  Urgency: <strong>{selectedComplaint.urgency}</strong> |
                  Priority: <strong>{selectedComplaint.priority}</strong>
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Complainant Details</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Typography><strong>Name:</strong> {selectedComplaint.contact_name}</Typography>
                  <Typography><strong>Mobile:</strong> {selectedComplaint.mobile}</Typography>
                  <Typography><strong>Consumer #:</strong> {selectedComplaint.consumer_number || 'N/A'}</Typography>
                  <Typography><strong>Ward:</strong> {selectedComplaint.ward || 'N/A'}</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Complaint Details</Typography>
                <Paper sx={{ p: 2, mt: 1 }}>
                  <Typography><strong>Category:</strong> {getCategoryLabel(selectedComplaint.complaint_category)}</Typography>
                  <Typography><strong>Urgency:</strong> {selectedComplaint.urgency}</Typography>
                  <Typography><strong>Assigned To:</strong> {selectedComplaint.assigned_engineer || 'Not Assigned'}</Typography>
                  <Typography><strong>Date:</strong> {new Date(selectedComplaint.created_at).toLocaleString()}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Paper sx={{ p: 2, mt: 1, bgcolor: '#fff3e0' }}>
                  <Typography>{selectedComplaint.description}</Typography>
                </Paper>
              </Grid>

              {selectedComplaint.resolution_notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Resolution Notes</Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: '#e8f5e9' }}>
                    <Typography>{selectedComplaint.resolution_notes}</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setDetailsOpen(false);
              handleOpenDialog(selectedComplaint);
            }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageComplaints;
