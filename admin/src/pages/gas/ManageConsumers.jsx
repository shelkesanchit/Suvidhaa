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
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Visibility,
  Edit,
  Refresh,
  Search,
  Add,
} from '@mui/icons-material';
import api from "../../utils/gas/api";
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ManageConsumers = () => {
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConsumers();
  }, []);

  const fetchConsumers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/gas/admin/consumers');
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
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'connection_type', headerName: 'Connection', width: 120 },
    {
      field: 'connection_status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'active' ? 'success' : 'default'}
        />
      ),
    },
    { field: 'address', headerName: 'Address', width: 200 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton onClick={() => handleViewDetails(params.row)} size="small">
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary">
              <Edit />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredConsumers = consumers.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.consumer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Manage Consumers
        </Typography>
        <Button startIcon={<Add />} variant="contained">
          Add Consumer
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, consumer no., or mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              startIcon={<Refresh />}
              onClick={fetchConsumers}
              variant="outlined"
            >
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
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
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
                <Chip label={selectedConsumer.connection_status} color={selectedConsumer.connection_status === 'active' ? 'success' : 'default'} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.full_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Connection Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.connection_type}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography variant="body1" gutterBottom>{selectedConsumer.address}</Typography>
              </Grid>
              {selectedConsumer.email && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1" gutterBottom>{selectedConsumer.email}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" color="primary">Edit Consumer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageConsumers;
