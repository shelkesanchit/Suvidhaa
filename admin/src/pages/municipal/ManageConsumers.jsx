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
import { Visibility, Refresh, Search } from '@mui/icons-material';
import api from '../../utils/municipal/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ManageConsumers = () => {
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [consumerTypeFilter, setConsumerTypeFilter] = useState('');

  useEffect(() => {
    fetchConsumers();
  }, [consumerTypeFilter]);

  const fetchConsumers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (consumerTypeFilter) params.consumer_type = consumerTypeFilter;
      if (searchTerm) params.search = searchTerm;
      const response = await api.get('/municipal/admin/consumers', { params });
      setConsumers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch consumers:', error);
      toast.error('Failed to load consumers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (consumer) => {
    setSelectedConsumer(consumer);
    setDetailsOpen(true);
  };

  const columns = [
    { field: 'consumer_number', headerName: 'Consumer No.', width: 150 },
    { field: 'full_name', headerName: 'Name', width: 180 },
    { field: 'mobile', headerName: 'Mobile', width: 130 },
    { field: 'email', headerName: 'Email', width: 180 },
    { field: 'ward', headerName: 'Ward', width: 80 },
    { field: 'consumer_type', headerName: 'Type', width: 140,
      renderCell: (params) => (
        <Chip label={params.value?.replace(/_/g, ' ')} size="small" color="primary" variant="outlined" />
      )
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Registered',
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
        <Tooltip title="View Details">
          <IconButton onClick={() => handleViewDetails(params.row)} size="small">
            <Visibility />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const filteredConsumers = consumers.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.consumer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Manage Consumers
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, consumer no., mobile, or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchConsumers()}
              InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Consumer Type</InputLabel>
              <Select
                value={consumerTypeFilter}
                label="Consumer Type"
                onChange={(e) => setConsumerTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="institution">Institution</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button startIcon={<Refresh />} onClick={fetchConsumers} variant="outlined" size="small">
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredConsumers}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id || row.consumer_number}
        />
      </Paper>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Consumer Details</DialogTitle>
        <DialogContent dividers>
          {selectedConsumer && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Consumer Number</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.consumer_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedConsumer.is_active ? 'Active' : 'Inactive'}
                  color={selectedConsumer.is_active ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Full Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.full_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Mobile</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.mobile}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.email || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Ward</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.ward || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Consumer Type</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedConsumer.consumer_type?.replace(/_/g, ' ') || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Registered On</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedConsumer.created_at
                    ? format(new Date(selectedConsumer.created_at), 'dd/MM/yyyy')
                    : '-'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageConsumers;
