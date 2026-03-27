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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Visibility, Add, Refresh, Edit } from '@mui/icons-material';
import api from '../../utils/municipal/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const LICENSE_TYPE_OPTIONS = [
  { value: 'trade_license', label: 'Trade License' },
  { value: 'health_hygiene', label: 'Health & Hygiene' },
  { value: 'food_establishment', label: 'Food Establishment' },
  { value: 'advertisement_permit', label: 'Advertisement Permit' },
  { value: 'building_permit', label: 'Building Permit' },
  { value: 'road_cutting', label: 'Road Cutting' },
];

const STATUS_OPTIONS = ['active', 'expired', 'suspended', 'cancelled'];

const getStatusColor = (status) => {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'warning';
  if (status === 'suspended') return 'error';
  return 'default';
};

const Licenses = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    license_type: '',
    business_name: '',
    owner_name: '',
    mobile: '',
    address: '',
    ward: '',
    valid_from: '',
    valid_until: '',
    application_id: '',
  });

  useEffect(() => {
    fetchLicenses();
  }, [statusFilter, typeFilter]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.license_type = typeFilter;
      const response = await api.get('/municipal/admin/licenses', { params });
      setLicenses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
      toast.error('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueLicense = async () => {
    try {
      setProcessing(true);
      const payload = { ...formData };
      if (!payload.application_id) delete payload.application_id;
      await api.post('/municipal/admin/licenses', payload);
      toast.success('License issued successfully');
      fetchLicenses();
      setIssueDialogOpen(false);
      setFormData({
        license_type: '', business_name: '', owner_name: '', mobile: '',
        address: '', ward: '', valid_from: '', valid_until: '', application_id: '',
      });
    } catch (error) {
      toast.error('Failed to issue license');
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedLicense || !newStatus) return;
    try {
      setProcessing(true);
      await api.patch(`/municipal/admin/licenses/${selectedLicense.id}/status`, { status: newStatus });
      toast.success('License status updated');
      fetchLicenses();
      setStatusDialogOpen(false);
    } catch (error) {
      toast.error('Failed to update license status');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { field: 'license_number', headerName: 'License No.', width: 150 },
    {
      field: 'license_type',
      headerName: 'Type',
      width: 160,
      valueFormatter: (params) =>
        LICENSE_TYPE_OPTIONS.find(o => o.value === params.value)?.label || params.value,
    },
    { field: 'business_name', headerName: 'Business Name', width: 180 },
    { field: 'owner_name', headerName: 'Owner', width: 140 },
    { field: 'mobile', headerName: 'Mobile', width: 120 },
    { field: 'ward', headerName: 'Ward', width: 80 },
    {
      field: 'valid_until',
      headerName: 'Valid Until',
      width: 110,
      valueFormatter: (params) => {
        try { return format(new Date(params.value), 'dd/MM/yyyy'); } catch { return params.value; }
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color={getStatusColor(params.value)} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      renderCell: (params) => (
        <Tooltip title="Update Status">
          <IconButton
            onClick={() => {
              setSelectedLicense(params.row);
              setNewStatus(params.row.status || '');
              setStatusDialogOpen(true);
            }}
            size="small"
          >
            <Edit />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Licenses
        </Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={fetchLicenses} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            onClick={() => setIssueDialogOpen(true)}
          >
            Issue License
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All Status</MenuItem>
                {STATUS_OPTIONS.map(s => (
                  <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>License Type</InputLabel>
              <Select value={typeFilter} label="License Type" onChange={(e) => setTypeFilter(e.target.value)}>
                <MenuItem value="">All Types</MenuItem>
                {LICENSE_TYPE_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={licenses}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Issue License Dialog */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue New License</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>License Type</InputLabel>
                <Select
                  value={formData.license_type}
                  label="License Type"
                  onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                >
                  {LICENSE_TYPE_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Business Name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Owner Name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Ward"
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Valid From" type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Valid Until" type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Application ID (optional)"
                value={formData.application_id}
                onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleIssueLicense}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            disabled={processing || !formData.license_type || !formData.business_name}
          >
            Issue License
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update License Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            License: <strong>{selectedLicense?.license_number}</strong>
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={newStatus} label="Status" onChange={(e) => setNewStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={processing || !newStatus}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Licenses;
