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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Refresh } from '@mui/icons-material';
import api from '../../utils/municipal/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CERT_TYPE_OPTIONS = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'death_certificate', label: 'Death Certificate' },
  { value: 'marriage_certificate', label: 'Marriage Certificate' },
  { value: 'domicile_certificate', label: 'Domicile Certificate' },
  { value: 'residence_certificate', label: 'Residence Certificate' },
  { value: 'noc_certificate', label: 'NOC Certificate' },
];

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    certificate_type: '',
    full_name: '',
    mobile: '',
    email: '',
    ward: '',
    event_date: '',
    application_id: '',
  });

  useEffect(() => {
    fetchCertificates();
  }, [typeFilter, statusFilter]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.certificate_type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/municipal/admin/certificates', { params });
      setCertificates(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCertificate = async () => {
    try {
      setProcessing(true);
      const payload = { ...formData };
      if (!payload.application_id) delete payload.application_id;
      await api.post('/municipal/admin/certificates', payload);
      toast.success('Certificate issued successfully');
      fetchCertificates();
      setIssueDialogOpen(false);
      setFormData({
        certificate_type: '', full_name: '', mobile: '',
        email: '', ward: '', event_date: '', application_id: '',
      });
    } catch (error) {
      toast.error('Failed to issue certificate');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { field: 'certificate_number', headerName: 'Certificate No.', width: 160 },
    {
      field: 'certificate_type',
      headerName: 'Type',
      width: 180,
      valueFormatter: (params) =>
        CERT_TYPE_OPTIONS.find(o => o.value === params.value)?.label || params.value,
    },
    { field: 'full_name', headerName: 'Name', width: 160 },
    { field: 'mobile', headerName: 'Mobile', width: 120 },
    { field: 'ward', headerName: 'Ward', width: 80 },
    {
      field: 'event_date',
      headerName: 'Event Date',
      width: 110,
      valueFormatter: (params) => {
        try { return format(new Date(params.value), 'dd/MM/yyyy'); } catch { return params.value || '-'; }
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'issued' || params.value === 'active' ? 'success' : 'warning'}
        />
      ),
    },
    {
      field: 'issued_at',
      headerName: 'Issued On',
      width: 110,
      valueFormatter: (params) => {
        try { return format(new Date(params.value), 'dd/MM/yyyy'); } catch { return params.value || '-'; }
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Certificates
        </Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={fetchCertificates} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            onClick={() => setIssueDialogOpen(true)}
          >
            Issue Certificate
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Certificate Type</InputLabel>
              <Select value={typeFilter} label="Certificate Type" onChange={(e) => setTypeFilter(e.target.value)}>
                <MenuItem value="">All Types</MenuItem>
                {CERT_TYPE_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="issued">Issued</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={certificates}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Issue Certificate Dialog */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue New Certificate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Certificate Type</InputLabel>
                <Select
                  value={formData.certificate_type}
                  label="Certificate Type"
                  onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value })}
                >
                  {CERT_TYPE_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                fullWidth size="small" label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Ward"
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Event Date" type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
            onClick={handleIssueCertificate}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            disabled={processing || !formData.certificate_type || !formData.full_name}
          >
            Issue Certificate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Certificates;
