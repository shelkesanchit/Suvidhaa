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
import {
  Visibility,
  CheckCircle,
  Refresh,
  Search,
  LocalShipping,
} from '@mui/icons-material';
import api from "../../utils/gas/api";
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CylinderBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await api.get('/gas/admin/cylinder-bookings', { params });
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load cylinder bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setProcessing(true);
      await api.put(`/gas/admin/cylinder-bookings/${bookingId}/status`, {
        status: newStatus,
      });
      toast.success(`Booking ${newStatus} successfully`);
      fetchBookings();
      setDetailsOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { field: 'booking_number', headerName: 'Booking No.', width: 150 },
    { field: 'full_name', headerName: 'Consumer', width: 150 },
    { field: 'cylinder_type', headerName: 'Cylinder Type', width: 130 },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    {
      field: 'delivery_type',
      headerName: 'Delivery',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'express' ? 'secondary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'booking_status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value?.replace(/_/g, ' ')}
          size="small"
          color={
            params.value === 'delivered' ? 'success' :
            params.value === 'dispatched' ? 'info' :
            params.value === 'confirmed' ? 'primary' :
            params.value === 'placed' ? 'warning' : 'default'
          }
        />
      ),
    },
    {
      field: 'total_amount',
      headerName: 'Amount',
      width: 100,
      valueFormatter: (params) => `₹${params.value || 0}`
    },
    {
      field: 'booking_date',
      headerName: 'Booked On',
      width: 110,
      valueFormatter: (params) => {
        try {
          return format(new Date(params.value), 'dd/MM/yyyy');
        } catch {
          return params.value;
        }
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton onClick={() => handleViewDetails(params.row)} size="small">
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.booking_status === 'confirmed' && (
            <Tooltip title="Dispatch">
              <IconButton
                onClick={() => handleStatusUpdate(params.row.id, 'dispatched')}
                size="small"
                color="info"
              >
                <LocalShipping />
              </IconButton>
            </Tooltip>
          )}
          {params.row.booking_status === 'dispatched' && (
            <Tooltip title="Mark Delivered">
              <IconButton
                onClick={() => handleStatusUpdate(params.row.id, 'delivered')}
                size="small"
                color="success"
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const filteredBookings = bookings.filter(b =>
    b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.mobile?.includes(searchTerm)
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Cylinder Bookings
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by consumer or booking no."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="placed">Placed</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="dispatched">Dispatched</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              startIcon={<Refresh />}
              onClick={fetchBookings}
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
          rows={filteredBookings}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id || row.booking_number}
        />
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent dividers>
          {selectedBooking && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Booking Number</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.booking_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedBooking.booking_status?.replace(/_/g, ' ')}
                  color={selectedBooking.booking_status === 'delivered' ? 'success' : 'warning'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Consumer</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.full_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Consumer Number</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.consumer_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Cylinder Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.cylinder_type}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Quantity</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.quantity}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Delivery Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.delivery_type}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                <Typography variant="body1" fontWeight={600} gutterBottom>₹{selectedBooking.total_amount}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Delivery Address</Typography>
                <Typography variant="body1" gutterBottom>{selectedBooking.delivery_address}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedBooking?.booking_status === 'placed' && (
            <Button
              onClick={() => handleStatusUpdate(selectedBooking.id, 'confirmed')}
              color="primary"
              variant="contained"
              disabled={processing}
            >
              Confirm Booking
            </Button>
          )}
          {selectedBooking?.booking_status === 'confirmed' && (
            <Button
              onClick={() => handleStatusUpdate(selectedBooking.id, 'dispatched')}
              color="info"
              variant="contained"
              disabled={processing}
            >
              Dispatch
            </Button>
          )}
          {selectedBooking?.booking_status === 'dispatched' && (
            <Button
              onClick={() => handleStatusUpdate(selectedBooking.id, 'delivered')}
              color="success"
              variant="contained"
              disabled={processing}
            >
              Mark Delivered
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CylinderBookings;
