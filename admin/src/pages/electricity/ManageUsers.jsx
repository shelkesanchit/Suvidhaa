import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Tooltip, CircularProgress, Alert, Grid, Avatar, Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Search, Refresh, PersonAdd, Visibility, VisibilityOff, ManageAccounts,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    color: 'error' },
  staff:    { label: 'Staff',    color: 'warning' },
  customer: { label: 'Customer', color: 'info' },
};

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/toggle-status`);
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch {
      toast.error('Failed to toggle user status');
    }
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required';
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!/^\d{10}$/.test(form.phone)) e.phone = '10-digit phone required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await api.post('/admin/users/staff', form);
      toast.success('Staff member created successfully');
      setCreateDialog(false);
      setForm({ full_name: '', email: '', phone: '', password: '' });
      setErrors({});
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create staff member');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const counts = {};
  users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
  const activeCount = users.filter(u => u.is_active).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Users</Typography>
          <Typography variant="body2" color="text.secondary">{users.length} total users &nbsp;·&nbsp; {activeCount} active</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchUsers} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateDialog(true)}>Add Staff</Button>
        </Box>
      </Box>

      {/* Summary strip */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { label: 'Total',     value: users.length,                 color: '#1976d2', bg: '#e3f2fd' },
          { label: 'Admins',    value: counts.admin || 0,            color: '#d32f2f', bg: '#ffebee' },
          { label: 'Staff',     value: counts.staff || 0,            color: '#f57c00', bg: '#fff3e0' },
          { label: 'Customers', value: counts.customer || 0,         color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'Active',    value: activeCount,                  color: '#0097a7', bg: '#e0f7fa' },
        ].map(({ label, value, color, bg }) => (
          <Grid item xs={6} sm={4} md key={label}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: bg, textAlign: 'center', border: `1px solid ${color}33` }}>
              <Typography variant="h5" fontWeight={700} sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Search by name, email, phone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              sx={{ flex: '1 1 240px', maxWidth: 360 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Roles</MenuItem>
                {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ManageAccounts sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
              <Typography color="text.secondary">No users found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((u) => {
                    const rc = ROLE_CONFIG[u.role] || { label: u.role, color: 'default' };
                    return (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: rc.color === 'error' ? '#ffebee' : rc.color === 'warning' ? '#fff3e0' : '#e3f2fd', fontSize: '0.75rem', color: rc.color === 'error' ? '#d32f2f' : rc.color === 'warning' ? '#f57c00' : '#1976d2' }}>
                              {u.full_name?.[0]?.toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{u.full_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{u.phone || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={rc.label} color={rc.color} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={u.is_active ? 'Active' : 'Inactive'}
                            color={u.is_active ? 'success' : 'default'}
                            size="small" variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {u.role !== 'admin' && (
                            <Tooltip title={u.is_active ? 'Deactivate User' : 'Activate User'}>
                              <Switch
                                size="small" checked={!!u.is_active}
                                onChange={() => toggleStatus(u)}
                                color="success"
                              />
                            </Tooltip>
                          )}
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
          component="div" count={filtered.length} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </Card>

      {/* Create Staff Dialog */}
      <Dialog open={createDialog} onClose={() => { setCreateDialog(false); setErrors({}); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Staff Member</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>Staff members can manage applications, complaints, and meter readings.</Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Full Name *" value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                error={!!errors.full_name} helperText={errors.full_name} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Email *" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                error={!!errors.email} helperText={errors.email} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Phone (10 digits) *" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                error={!!errors.phone} helperText={errors.phone} inputProps={{ maxLength: 10 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Password (min 8 chars) *"
                type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                error={!!errors.password} helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                      {showPass ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setCreateDialog(false); setErrors({}); }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Create Staff Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
