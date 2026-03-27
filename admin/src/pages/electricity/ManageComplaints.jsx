import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Tooltip, CircularProgress, Alert, Tabs, Tab, Grid,
} from '@mui/material';
import { Search, Refresh, Visibility, Edit, Report, CheckCircle } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'error' },
  assigned:    { label: 'Assigned',    color: 'warning' },
  in_progress: { label: 'In Progress', color: 'info' },
  resolved:    { label: 'Resolved',    color: 'success' },
  closed:      { label: 'Closed',      color: 'default' },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'success' },
  medium:   { label: 'Medium',   color: 'warning' },
  high:     { label: 'High',     color: 'error' },
  critical: { label: 'Critical', color: 'error' },
};

const TABS = [
  { label: 'All',         value: '' },
  { label: 'Open',        value: 'open' },
  { label: 'Assigned',    value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved',    value: 'resolved' },
  { label: 'Closed',      value: 'closed' },
];

export default function ManageComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [updateDialog, setUpdateDialog] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', resolution_notes: '' });

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const statusFilter = TABS[activeTab].value;
      const res = await api.get(`/admin/complaints${statusFilter ? `?status=${statusFilter}` : ''}`);
      setComplaints(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); setPage(0); }, [activeTab]);

  const openUpdate = (c) => {
    setUpdateForm({ status: c.status, resolution_notes: c.resolution_notes || '' });
    setUpdateDialog(c);
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      await api.put(`/admin/complaints/${updateDialog.id}`, updateForm);
      toast.success('Complaint updated successfully');
      setUpdateDialog(null);
      fetchComplaints();
    } catch {
      toast.error('Failed to update complaint');
    } finally {
      setSaving(false);
    }
  };

  const filtered = complaints.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.complaint_number?.toLowerCase().includes(q) ||
      c.full_name?.toLowerCase().includes(q) ||
      c.consumer_number?.toLowerCase().includes(q) ||
      c.complaint_type?.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getHistory = (c) => {
    try {
      return Array.isArray(c.stage_history) ? c.stage_history : JSON.parse(c.stage_history || '[]');
    } catch { return []; }
  };

  // Summary counts
  const counts = {};
  complaints.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Complaints</Typography>
          <Typography variant="body2" color="text.secondary">{filtered.length} total complaints</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchComplaints} disabled={loading}>Refresh</Button>
      </Box>

      {/* Summary strip */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { label: 'Open',        color: '#d32f2f', bg: '#ffebee', key: 'open' },
          { label: 'Assigned',    color: '#f57c00', bg: '#fff3e0', key: 'assigned' },
          { label: 'In Progress', color: '#1976d2', bg: '#e3f2fd', key: 'in_progress' },
          { label: 'Resolved',    color: '#2e7d32', bg: '#e8f5e9', key: 'resolved' },
        ].map(({ label, color, bg, key }) => (
          <Grid item xs={6} sm={3} key={key}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: bg, textAlign: 'center', border: `1px solid ${color}33` }}>
              <Typography variant="h5" fontWeight={700} sx={{ color }}>{counts[key] || 0}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Card>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
          {TABS.map((t, i) => <Tab key={i} label={t.label} sx={{ fontSize: '0.8rem', minWidth: 80 }} />)}
        </Tabs>

        <CardContent sx={{ pb: 0 }}>
          <TextField
            size="small" placeholder="Search by number, name, consumer no., type..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: { xs: '100%', sm: 380 }, mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Report sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
              <Typography color="text.secondary">No complaints found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600, width: 140 }}>Complaint No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Consumer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((c) => {
                    const sc = STATUS_CONFIG[c.status] || { label: c.status, color: 'default' };
                    const pc = PRIORITY_CONFIG[c.priority] || { label: c.priority || '—', color: 'default' };
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {c.complaint_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{c.full_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.consumer_number}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {c.complaint_type?.replace(/_/g, ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={pc.label} color={pc.color} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(c.created_at).toLocaleDateString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setDetailDialog(c)} sx={{ mr: 0.5 }}>
                              <Visibility sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Update Status">
                            <IconButton size="small" onClick={() => openUpdate(c)} color="primary">
                              <Edit sx={{ fontSize: 17 }} />
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
          component="div" count={filtered.length} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </Card>

      {/* Update Dialog */}
      <Dialog open={!!updateDialog} onClose={() => setUpdateDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Complaint Status</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {updateDialog && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{updateDialog.complaint_number}</strong> — {updateDialog.full_name}
              <br /><small>{updateDialog.complaint_type?.replace(/_/g,' ')} | Priority: {updateDialog.priority}</small>
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={updateForm.status} onChange={e => setUpdateForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      <Chip label={v.label} color={v.color} size="small" sx={{ height: 20, fontSize: '0.72rem' }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} size="small" label="Resolution Notes"
                placeholder="Describe the action taken or resolution..."
                value={updateForm.resolution_notes} onChange={e => setUpdateForm(p => ({ ...p, resolution_notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUpdateDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Complaint Details</DialogTitle>
        <DialogContent dividers>
          {detailDialog && (() => {
            const sc = STATUS_CONFIG[detailDialog.status] || { label: detailDialog.status, color: 'default' };
            const pc = PRIORITY_CONFIG[detailDialog.priority] || { label: detailDialog.priority || '—', color: 'default' };
            const history = getHistory(detailDialog);
            return (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip label={detailDialog.complaint_number} variant="outlined" size="small" sx={{ fontFamily: 'monospace' }} />
                    <Chip label={sc.label} color={sc.color} size="small" />
                    <Chip label={`Priority: ${pc.label}`} color={pc.color} size="small" variant="outlined" />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      Filed: {new Date(detailDialog.created_at).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>Consumer Info</Typography>
                  {[['Name', detailDialog.full_name], ['Consumer No.', detailDialog.consumer_number], ['Phone', detailDialog.phone]].map(([k,v]) => v && (
                    <Box key={k} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ width: 90 }}>{k}:</Typography>
                      <Typography variant="caption" fontWeight={500}>{v}</Typography>
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>Complaint Info</Typography>
                  {[['Type', detailDialog.complaint_type?.replace(/_/g,' ')], ['Location', detailDialog.location], ['Assigned To', detailDialog.assigned_to]].map(([k,v]) => v && (
                    <Box key={k} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ width: 90 }}>{k}:</Typography>
                      <Typography variant="caption" fontWeight={500}>{v}</Typography>
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>Description</Typography>
                  <Box sx={{ p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    <Typography variant="body2">{detailDialog.description}</Typography>
                  </Box>
                </Grid>

                {detailDialog.resolution_notes && (
                  <Grid item xs={12}>
                    <Alert severity="success" variant="outlined">
                      <strong>Resolution:</strong> {detailDialog.resolution_notes}
                    </Alert>
                  </Grid>
                )}

                {history.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                      Progress Timeline
                    </Typography>
                    <Box sx={{ pl: 0.5 }}>
                      {history.map((h, i) => {
                        const isLast = i === history.length - 1;
                        return (
                          <Box key={i} sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
                            {!isLast && (
                              <Box sx={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, bgcolor: '#c8e6c9' }} />
                            )}
                            <Box sx={{
                              width: 24, height: 24, borderRadius: '50%', flexShrink: 0, mt: 0.5, zIndex: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              bgcolor: isLast ? '#e3f2fd' : '#e8f5e9',
                              border: `2px solid ${isLast ? '#1976d2' : '#2e7d32'}`,
                            }}>
                              {isLast
                                ? <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} />
                                : <CheckCircle sx={{ fontSize: 14, color: '#2e7d32' }} />}
                            </Box>
                            <Box sx={{ pb: 2 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ color: isLast ? '#1976d2' : '#0d1b2a' }}>
                                {h.stage || h.status}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : ''}
                              </Typography>
                              {(h.notes || h.resolution_notes) && (
                                <Typography variant="caption" color="text.secondary">
                                  {h.notes || h.resolution_notes}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Grid>
                )}
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailDialog(null)}>Close</Button>
          <Button variant="contained" onClick={() => { openUpdate(detailDialog); setDetailDialog(null); }}>Update Status</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
