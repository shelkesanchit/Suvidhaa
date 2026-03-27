import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Edit,
  Add,
  Refresh,
} from '@mui/icons-material';
import api from "../../utils/gas/api";
import toast from 'react-hot-toast';

const TariffManagement = () => {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [formData, setFormData] = useState({
    state: '',
    city: '',
    cylinder_type: '14kg',
    price_per_cylinder: '',
    base_price: '',
    subsidy_amount: '',
    effective_from: '',
    supplier: '',
  });

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/gas/admin/tariffs');
      setTariffs(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tariffs:', error);
      toast.error('Failed to load tariffs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tariff = null) => {
    if (tariff) {
      setEditingTariff(tariff);
      setFormData({
        state: tariff.state || '',
        city: tariff.city || '',
        cylinder_type: tariff.cylinder_type || '14kg',
        price_per_cylinder: tariff.price_per_cylinder || '',
        base_price: tariff.base_price || '',
        subsidy_amount: tariff.subsidy_amount || '',
        effective_from: tariff.effective_from?.split('T')[0] || '',
        supplier: tariff.supplier || '',
      });
    } else {
      setEditingTariff(null);
      setFormData({
        state: '',
        city: '',
        cylinder_type: '14kg',
        price_per_cylinder: '',
        base_price: '',
        subsidy_amount: '',
        effective_from: '',
        supplier: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTariff) {
        await api.put(`/gas/admin/tariffs/${editingTariff.id}`, formData);
        toast.success('Tariff updated successfully');
      } else {
        await api.post('/gas/admin/tariffs', formData);
        toast.success('Tariff created successfully');
      }
      fetchTariffs();
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save tariff');
    }
  };

  const columns = [
    { field: 'state', headerName: 'State', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    {
      field: 'cylinder_type',
      headerName: 'Cylinder Type',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color="primary" variant="outlined" />
      )
    },
    {
      field: 'price_per_cylinder',
      headerName: 'Price/Cylinder (₹)',
      width: 150,
      valueFormatter: (params) => `₹${params.value || 0}`
    },
    {
      field: 'base_price',
      headerName: 'Base Price (₹)',
      width: 130,
      valueFormatter: (params) => `₹${params.value || 0}`
    },
    {
      field: 'subsidy_amount',
      headerName: 'Subsidy (₹)',
      width: 120,
      valueFormatter: (params) => params.value ? `₹${params.value}` : '-'
    },
    { field: 'supplier', headerName: 'Supplier', width: 130 },
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
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      renderCell: (params) => (
        <Tooltip title="Edit">
          <IconButton onClick={() => handleOpenDialog(params.row)} size="small">
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
          Tariff Management
        </Typography>
        <Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchTariffs}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => handleOpenDialog()}
          >
            Add Tariff
          </Button>
        </Box>
      </Box>

      {/* Info Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h6">Total Tariff Rates</Typography>
            <Typography variant="h4" fontWeight={700}>
              {tariffs.length}
            </Typography>
            <Typography variant="body2">All cylinder types</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'secondary.main', color: 'white' }}>
            <Typography variant="h6">Active Rates</Typography>
            <Typography variant="h4" fontWeight={700}>
              {tariffs.filter(t => t.is_active !== false).length}
            </Typography>
            <Typography variant="body2">Currently in effect</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'success.main', color: 'white' }}>
            <Typography variant="h6">Avg Price</Typography>
            <Typography variant="h4" fontWeight={700}>
              ₹{tariffs.length > 0 ? (tariffs.reduce((a, t) => a + parseFloat(t.price_per_cylinder || 0), 0) / tariffs.length).toFixed(0) : 0}
            </Typography>
            <Typography variant="body2">Per cylinder</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Data Grid */}
      <Paper sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={tariffs}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTariff ? 'Edit Tariff' : 'Add New Tariff'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g., Maharashtra"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Mumbai"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Cylinder Type</InputLabel>
                <Select
                  value={formData.cylinder_type}
                  label="Cylinder Type"
                  onChange={(e) => setFormData({ ...formData, cylinder_type: e.target.value })}
                >
                  <MenuItem value="5kg">5 kg</MenuItem>
                  <MenuItem value="14kg">14 kg</MenuItem>
                  <MenuItem value="19kg">19 kg</MenuItem>
                  <MenuItem value="47kg">47 kg</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price per Cylinder (₹)"
                type="number"
                value={formData.price_per_cylinder}
                onChange={(e) => setFormData({ ...formData, price_per_cylinder: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Price (₹)"
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Subsidy Amount (₹)"
                type="number"
                value={formData.subsidy_amount}
                onChange={(e) => setFormData({ ...formData, subsidy_amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="e.g., HPCL"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Effective From"
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTariff ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TariffManagement;
