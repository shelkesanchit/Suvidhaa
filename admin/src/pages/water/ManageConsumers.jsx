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
  Tabs,
  Tab,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Visibility,
  Search,
  Refresh,
  Edit,
  WaterDrop,
  Person,
  Business,
  Factory,
  LocalHospital,
  Home,
  Receipt,
  Speed,
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

const ManageConsumers = () => {
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchConsumers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchConsumers, 30000);
    return () => clearInterval(interval);
  }, [filterStatus, filterCategory]);

  const fetchConsumers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get(`/water/admin/consumers?${params}`);
      setConsumers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch consumers:', error);
      toast.error('Failed to fetch consumers from database');
      setConsumers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchConsumers();
  };

  const handleViewDetails = (consumer) => {
    setSelectedConsumer(consumer);
    setTabValue(0);
    setDetailsOpen(true);
  };

  const handleEditConsumer = (consumer) => {
    setSelectedConsumer(consumer);
    setEditData({
      name: consumer.name,
      email: consumer.email,
      mobile: consumer.mobile,
      address: consumer.address,
      category: consumer.category,
      status: consumer.status,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/water/admin/consumers/${selectedConsumer.id}`, editData);
      toast.success('Consumer updated successfully');
      setEditOpen(false);
      fetchConsumers();
    } catch (error) {
      toast.error('Failed to update consumer');
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : status === 'inactive' ? 'error' : 'warning';
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

  const activeCount = consumers.filter(c => c.status === 'active').length;
  const inactiveCount = consumers.filter(c => c.status === 'inactive').length;
  const totalDues = consumers.reduce((sum, c) => sum + (c.total_dues || 0), 0);

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
            Manage Consumers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage water connection consumers
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchConsumers}
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
                placeholder="Search by name, consumer #..."
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
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
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
                <MenuItem value="domestic">Domestic</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="industrial">Industrial</MenuItem>
                <MenuItem value="institutional">Institutional</MenuItem>
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

      {/* Consumers Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : consumers.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No consumers found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Consumer #</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Meter</strong></TableCell>
                  <TableCell><strong>Last Reading</strong></TableCell>
                  <TableCell><strong>Outstanding</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {consumers.map((consumer) => (
                  <TableRow key={consumer.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {consumer.consumer_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: categoryColors[consumer.category],
                            fontSize: '0.85rem'
                          }}
                        >
                          {consumer.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{consumer.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {consumer.mobile}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={categoryIcons[consumer.category]}
                        label={getCategoryLabel(consumer.category)}
                        size="small"
                        sx={{ 
                          bgcolor: `${categoryColors[consumer.category]}20`,
                          color: categoryColors[consumer.category],
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{consumer.meter_number}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {consumer.connection_size}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{consumer.last_reading?.toLocaleString() || '-'} KL</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {consumer.last_reading_date ? new Date(consumer.last_reading_date).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={consumer.total_dues > 0 ? 'error.main' : 'success.main'}
                      >
                        ₹{consumer.total_dues?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={consumer.status}
                        color={getStatusColor(consumer.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewDetails(consumer)}
                        title="View Details"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleEditConsumer(consumer)}
                        title="Edit Consumer"
                      >
                        <Edit />
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Consumer Details - {selectedConsumer?.consumer_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedConsumer && (
            <>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="Basic Info" icon={<Person />} iconPosition="start" />
                <Tab label="Connection" icon={<WaterDrop />} iconPosition="start" />
                <Tab label="Billing" icon={<Receipt />} iconPosition="start" />
              </Tabs>

              {tabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Personal Details</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography><strong>Name:</strong> {selectedConsumer.name}</Typography>
                      <Typography><strong>Email:</strong> {selectedConsumer.email}</Typography>
                      <Typography><strong>Mobile:</strong> {selectedConsumer.mobile}</Typography>
                      <Typography><strong>Address:</strong> {selectedConsumer.address}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Account Info</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography><strong>Consumer #:</strong> {selectedConsumer.consumer_number}</Typography>
                      <Typography><strong>Category:</strong> {getCategoryLabel(selectedConsumer.category)}</Typography>
                      <Typography><strong>Status:</strong> 
                        <Chip label={selectedConsumer.status} color={getStatusColor(selectedConsumer.status)} size="small" sx={{ ml: 1 }} />
                      </Typography>
                      <Typography><strong>Registration:</strong> {new Date(selectedConsumer.created_at).toLocaleDateString()}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}

              {tabValue === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Meter Details</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography><strong>Meter Number:</strong> {selectedConsumer.meter_number}</Typography>
                      <Typography><strong>Connection Size:</strong> {selectedConsumer.connection_size}</Typography>
                      <Typography><strong>Last Reading:</strong> {selectedConsumer.last_reading?.toLocaleString()} KL</Typography>
                      <Typography><strong>Reading Date:</strong> {selectedConsumer.last_reading_date ? new Date(selectedConsumer.last_reading_date).toLocaleDateString() : 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}

              {tabValue === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: selectedConsumer.total_dues > 0 ? '#fff3e0' : '#e8f5e9' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Billing Summary</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="h4" color={selectedConsumer.total_dues > 0 ? 'warning.main' : 'success.main'}>
                            ₹{selectedConsumer.total_dues?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Outstanding Amount</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h4" color="primary">
                            {selectedConsumer.last_reading?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Last Meter Reading (KL)</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setDetailsOpen(false);
              handleEditConsumer(selectedConsumer);
            }}
          >
            Edit Consumer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Edit Consumer
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editData.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mobile"
                value={editData.mobile || ''}
                onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Address"
                value={editData.address || ''}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={editData.category || ''}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
              >
                <MenuItem value="domestic">Domestic</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="industrial">Industrial</MenuItem>
                <MenuItem value="institutional">Institutional</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={editData.status || ''}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageConsumers;
