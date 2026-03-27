import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Switch,
  FormControlLabel,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Refresh,
  WaterDrop,
  Home,
  Business,
  Factory,
  LocalHospital,
} from '@mui/icons-material';
import api from "../../utils/water/api";
import toast from 'react-hot-toast';

const categoryIcons = {
  domestic: <Home />,
  commercial: <Business />,
  industrial: <Factory />,
  institutional: <LocalHospital />,
};

const categoryColors = {
  domestic: '#4caf50',
  commercial: '#2196f3',
  industrial: '#ff9800',
  institutional: '#9c27b0',
};

const TariffManagement = () => {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState(null);
  const [formData, setFormData] = useState({
    category: 'domestic',
    slab_name: '',
    min_units: 0,
    max_units: null,
    rate_per_kl: 0,
    fixed_charge: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/water/admin/tariffs');
      setTariffs(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tariffs:', error);
      toast.error('Failed to fetch tariffs');
      setTariffs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tariff = null) => {
    if (tariff) {
      setEditMode(true);
      setSelectedTariff(tariff);
      setFormData({
        category: tariff.category,
        slab_name: tariff.slab_name,
        min_units: tariff.min_units,
        max_units: tariff.max_units,
        rate_per_kl: tariff.rate_per_kl,
        fixed_charge: tariff.fixed_charge,
        is_active: tariff.is_active,
      });
    } else {
      setEditMode(false);
      setSelectedTariff(null);
      setFormData({
        category: 'domestic',
        slab_name: '',
        min_units: 0,
        max_units: null,
        rate_per_kl: 0,
        fixed_charge: 0,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTariff(null);
    setEditMode(false);
  };

  const handleSaveTariff = async () => {
    try {
      if (editMode) {
        await api.put(`/water/admin/tariffs/${selectedTariff.id}`, formData);
        toast.success('Tariff updated successfully');
      } else {
        await api.post('/water/admin/tariffs', formData);
        toast.success('Tariff created successfully');
      }
      handleCloseDialog();
      fetchTariffs();
    } catch (error) {
      toast.error('Failed to save tariff');
    }
  };

  const handleDeleteTariff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tariff?')) return;
    
    try {
      await api.delete(`/water/admin/tariffs/${id}`);
      toast.success('Tariff deleted successfully');
      fetchTariffs();
    } catch (error) {
      toast.error('Failed to delete tariff');
    }
  };

  const handleToggleStatus = async (tariff) => {
    try {
      await api.put(`/water/admin/tariffs/${tariff.id}`, {
        ...tariff,
        is_active: !tariff.is_active,
      });
      toast.success(`Tariff ${!tariff.is_active ? 'activated' : 'deactivated'}`);
      fetchTariffs();
    } catch (error) {
      toast.error('Failed to update tariff status');
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      domestic: 'Domestic',
      commercial: 'Commercial',
      industrial: 'Industrial',
      institutional: 'Institutional',
    };
    return labels[category] || category;
  };

  const groupedTariffs = tariffs.reduce((acc, tariff) => {
    if (!acc[tariff.category]) acc[tariff.category] = [];
    acc[tariff.category].push(tariff);
    return acc;
  }, {});

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
            Tariff Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure water tariff rates and slabs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchTariffs}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Tariff
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['domestic', 'commercial', 'industrial', 'institutional'].map((category) => {
          const categoryTariffs = groupedTariffs[category] || [];
          const avgRate = categoryTariffs.length > 0
            ? categoryTariffs.reduce((sum, t) => sum + t.rate_per_kl, 0) / categoryTariffs.length
            : 0;
          
          return (
            <Grid item xs={6} md={3} key={category}>
              <Card sx={{ bgcolor: `${categoryColors[category]}15`, borderLeft: `4px solid ${categoryColors[category]}` }}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {categoryIcons[category]}
                    <Typography variant="subtitle1" fontWeight={600}>
                      {getCategoryLabel(category)}
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700} color={categoryColors[category]}>
                    ₹{avgRate.toFixed(2)}/KL
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {categoryTariffs.length} slab(s) configured
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Tariff Tables by Category */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {Object.entries(groupedTariffs).map(([category, categoryTariffs]) => (
            <Grid item xs={12} md={6} key={category}>
              <Card>
                <CardContent sx={{ pb: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: `${categoryColors[category]}20`,
                      color: categoryColors[category],
                      display: 'flex'
                    }}>
                      {categoryIcons[category]}
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      {getCategoryLabel(category)} Tariffs
                    </Typography>
                  </Box>
                </CardContent>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Slab</strong></TableCell>
                      <TableCell><strong>Range (KL)</strong></TableCell>
                      <TableCell><strong>Rate/KL</strong></TableCell>
                      <TableCell><strong>Fixed</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryTariffs.map((tariff) => (
                      <TableRow key={tariff.id} hover>
                        <TableCell>{tariff.slab_name}</TableCell>
                        <TableCell>
                          {tariff.min_units} - {tariff.max_units || '∞'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            ₹{tariff.rate_per_kl.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>₹{tariff.fixed_charge}</TableCell>
                        <TableCell>
                          <Chip
                            label={tariff.is_active ? 'Active' : 'Inactive'}
                            color={tariff.is_active ? 'success' : 'default'}
                            size="small"
                            onClick={() => handleToggleStatus(tariff)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(tariff)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTariff(tariff.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categoryTariffs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No tariffs configured
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {editMode ? 'Edit Tariff' : 'Add New Tariff'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value="domestic">Domestic</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="industrial">Industrial</MenuItem>
                <MenuItem value="institutional">Institutional</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Slab Name"
                value={formData.slab_name}
                onChange={(e) => setFormData({ ...formData, slab_name: e.target.value })}
                placeholder="e.g., Slab 1, Above 30 KL"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Min Units (KL)"
                value={formData.min_units}
                onChange={(e) => setFormData({ ...formData, min_units: parseInt(e.target.value) || 0 })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">KL</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Units (KL)"
                value={formData.max_units || ''}
                onChange={(e) => setFormData({ ...formData, max_units: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Leave empty for unlimited"
                InputProps={{
                  endAdornment: <InputAdornment position="end">KL</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Rate per KL"
                value={formData.rate_per_kl}
                onChange={(e) => setFormData({ ...formData, rate_per_kl: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Fixed Charge"
                value={formData.fixed_charge}
                onChange={(e) => setFormData({ ...formData, fixed_charge: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTariff}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TariffManagement;
