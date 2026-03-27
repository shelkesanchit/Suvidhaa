import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Tooltip, CircularProgress, Grid, Avatar, Divider,
} from '@mui/material';
import {
  Search, Refresh, Visibility, People, Home, Business, Agriculture,
  Factory, ElectricBolt,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  active:       { label: 'Active',       color: 'success' },
  disconnected: { label: 'Disconnected', color: 'error' },
  suspended:    { label: 'Suspended',    color: 'warning' },
};

const CATEGORY_ICONS = {
  domestic:      Home,
  commercial:    Business,
  industrial:    Factory,
  agricultural:  Agriculture,
};

export default function ConsumerAccounts() {
  const [consumers, setConsumers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [detailDialog, setDetailDialog] = useState(null);

  const fetchConsumers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page + 1, limit: rowsPerPage });
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      const res = await api.get(`/admin/consumers?${params}`);
      const rows = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setConsumers(rows);
      setTotal(res.data.total || rows.length);
    } catch {
      toast.error('Failed to load consumers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConsumers(); }, [page, rowsPerPage, statusFilter, categoryFilter]);

  const filtered = search
    ? consumers.filter(c => {
        const q = search.toLowerCase();
        return (
          c.consumer_number?.toLowerCase().includes(q) ||
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.meter_number?.toLowerCase().includes(q)
        );
      })
    : consumers;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Consumers</Typography>
          <Typography variant="body2" color="text.secondary">{total} registered consumers</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchConsumers} disabled={loading}>Refresh</Button>
      </Box>

      <Card>
        <CardContent sx={{ pb: 0 }}>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small" placeholder="Search name, consumer no., email, meter no..."
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ flex: '1 1 260px', maxWidth: 360 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Status</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Categories</MenuItem>
                {Object.keys(CATEGORY_ICONS).map(k => (
                  <MenuItem key={k} value={k} sx={{ textTransform: 'capitalize' }}>{k}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <People sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
              <Typography color="text.secondary">No consumers found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Consumer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Consumer No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Meter No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((c) => {
                    const sc = STATUS_CONFIG[c.connection_status || c.status] || { label: c.connection_status || c.status || 'Unknown', color: 'default' };
                    const CatIcon = CATEGORY_ICONS[c.category] || ElectricBolt;
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: '#1976d222', fontSize: '0.75rem', color: '#1976d2' }}>
                              {c.full_name?.[0]?.toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{c.full_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {c.consumer_number || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {c.meter_number || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CatIcon sx={{ fontSize: 15, color: '#666' }} />
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{c.category}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{c.city}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.state}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setDetailDialog(c)}>
                              <Visibility sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>

        <TablePagination
          component="div"
          count={search ? filtered.length : total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Consumer Details</DialogTitle>
        <DialogContent dividers>
          {detailDialog && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar sx={{ width: 52, height: 52, bgcolor: '#1976d2', fontSize: '1.2rem' }}>
                    {detailDialog.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{detailDialog.full_name}</Typography>
                    <Chip
                      label={(STATUS_CONFIG[detailDialog.connection_status || detailDialog.status] || { label: detailDialog.connection_status || 'Unknown', color: 'default' }).label}
                      color={(STATUS_CONFIG[detailDialog.connection_status || detailDialog.status] || { color: 'default' }).color}
                      size="small"
                    />
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider><Typography variant="caption" color="text.secondary">Personal Info</Typography></Divider>
              </Grid>
              {[['Email', detailDialog.email], ['Phone', detailDialog.phone], ['Member Since', detailDialog.created_at && new Date(detailDialog.created_at).toLocaleDateString('en-IN')]].map(([k, v]) => v && (
                <Grid item xs={6} key={k}>
                  <Typography variant="caption" color="text.secondary">{k}</Typography>
                  <Typography variant="body2" fontWeight={500}>{v}</Typography>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Divider><Typography variant="caption" color="text.secondary">Connection Details</Typography></Divider>
              </Grid>
              {[['Consumer No.', detailDialog.consumer_number], ['Meter No.', detailDialog.meter_number], ['Category', detailDialog.category], ['Tariff Type', detailDialog.tariff_type], ['Sanctioned Load', detailDialog.sanctioned_load && `${detailDialog.sanctioned_load} kW`]].map(([k, v]) => v && (
                <Grid item xs={6} key={k}>
                  <Typography variant="caption" color="text.secondary">{k}</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>{v}</Typography>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Divider><Typography variant="caption" color="text.secondary">Address</Typography></Divider>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  {[detailDialog.address_line1, detailDialog.address_line2, detailDialog.city, detailDialog.state, detailDialog.pincode].filter(Boolean).join(', ')}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
