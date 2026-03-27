import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select,
  MenuItem, Tooltip, CircularProgress, Alert, Tabs, Tab, Grid, Divider,
} from '@mui/material';
import {
  Search, Refresh, Visibility, Edit, OpenInNew,
  CheckCircle, Assignment,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  submitted:             { label: 'Submitted',              color: 'info' },
  document_verification: { label: 'Doc Verification',       color: 'warning' },
  site_inspection:       { label: 'Site Inspection',        color: 'warning' },
  approval_pending:      { label: 'Approval Pending',       color: 'warning' },
  approved:              { label: 'Approved',               color: 'success' },
  work_in_progress:      { label: 'Work in Progress',       color: 'info' },
  rejected:              { label: 'Rejected',               color: 'error' },
  completed:             { label: 'Completed',              color: 'success' },
};

const STAGES = [
  'Application Received', 'Document Verification', 'Site Inspection',
  'Technical Review', 'Approval', 'Work Order Issued', 'Installation', 'Meter Fitted', 'Completed',
];

const TABS = [
  { label: 'All',         value: '' },
  { label: 'Submitted',   value: 'submitted' },
  { label: 'In Review',   value: 'document_verification' },
  { label: 'Pending',     value: 'approval_pending' },
  { label: 'Approved',    value: 'approved' },
  { label: 'Rejected',    value: 'rejected' },
  { label: 'Completed',   value: 'completed' },
];

export default function ManageApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [updateDialog, setUpdateDialog] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null);
  const [docDialog, setDocDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', current_stage: '', remarks: '' });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const statusFilter = TABS[activeTab].value;
      const res = await api.get(`/admin/applications${statusFilter ? `?status=${statusFilter}` : ''}`);
      setApplications(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); setPage(0); }, [activeTab]);

  const openUpdate = (app) => {
    setUpdateForm({ status: app.status, current_stage: app.current_stage || '', remarks: app.remarks || '' });
    setUpdateDialog(app);
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      await api.put(`/admin/applications/${updateDialog.id}`, updateForm);
      toast.success('Application updated successfully');
      setUpdateDialog(null);
      fetchApplications();
    } catch {
      toast.error('Failed to update application');
    } finally {
      setSaving(false);
    }
  };

  const filtered = applications.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.application_number?.toLowerCase().includes(q) ||
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.application_type?.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getStageHistory = (app) => {
    try {
      const h = Array.isArray(app.stage_history) ? app.stage_history : JSON.parse(app.stage_history || '[]');
      return h;
    } catch { return []; }
  };

  const getAppData = (app) => {
    try {
      return typeof app.application_data === 'object' ? app.application_data : JSON.parse(app.application_data || '{}');
    } catch { return {}; }
  };

  const getDocs = (app) => {
    try {
      return Array.isArray(app.documents) ? app.documents : JSON.parse(app.documents || '[]');
    } catch { return []; }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Applications</Typography>
          <Typography variant="body2" color="text.secondary">{filtered.length} total applications</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchApplications} disabled={loading}>Refresh</Button>
      </Box>

      <Card>
        {/* Status Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
          {TABS.map((t, i) => <Tab key={i} label={t.label} sx={{ fontSize: '0.8rem', minWidth: 80 }} />)}
        </Tabs>

        <CardContent sx={{ pb: 0 }}>
          {/* Search */}
          <TextField
            size="small" placeholder="Search by name, application no., email, type..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: { xs: '100%', sm: 350 }, mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Assignment sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
              <Typography color="text.secondary">No applications found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600, width: 140 }}>App. Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Applicant</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Stage</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((app) => {
                    const sc = STATUS_CONFIG[app.status] || { label: app.status, color: 'default' };
                    const docs = getDocs(app);
                    return (
                      <TableRow key={app.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {app.application_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{app.full_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{app.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {app.application_type?.replace(/_/g, ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {app.current_stage || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(app.created_at).toLocaleDateString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setDetailDialog(app)} sx={{ mr: 0.5 }}>
                              <Visibility sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Update Status">
                            <IconButton size="small" onClick={() => openUpdate(app)} color="primary">
                              <Edit sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          {docs.length > 0 && (
                            <Tooltip title="View Documents">
                              <IconButton size="small" onClick={() => setDocDialog(docs)} color="secondary">
                                <OpenInNew sx={{ fontSize: 17 }} />
                              </IconButton>
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

      {/* Update Status Dialog */}
      <Dialog open={!!updateDialog} onClose={() => setUpdateDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Application Status</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {updateDialog && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{updateDialog.application_number}</strong> — {updateDialog.full_name}
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
              <FormControl fullWidth size="small">
                <InputLabel>Current Stage</InputLabel>
                <Select label="Current Stage" value={updateForm.current_stage} onChange={e => setUpdateForm(p => ({ ...p, current_stage: e.target.value }))}>
                  {STAGES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} size="small" label="Remarks / Notes"
                value={updateForm.remarks} onChange={e => setUpdateForm(p => ({ ...p, remarks: e.target.value }))} />
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
        <DialogTitle sx={{ fontWeight: 700 }}>Application Details</DialogTitle>
        <DialogContent dividers>
          {detailDialog && (() => {
            const d = getAppData(detailDialog);
            const history = getStageHistory(detailDialog);
            const sc = STATUS_CONFIG[detailDialog.status] || { label: detailDialog.status, color: 'default' };
            return (
              <Grid container spacing={2}>
                {/* Status bar */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip label={detailDialog.application_number} variant="outlined" size="small" sx={{ fontFamily: 'monospace' }} />
                    <Chip label={sc.label} color={sc.color} size="small" />
                    <Chip label={detailDialog.application_type?.replace(/_/g, ' ')} size="small" variant="outlined" />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      Submitted: {new Date(detailDialog.created_at).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </Grid>

                {/* Applicant */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>Applicant Info</Typography>
                  <Box sx={{ display: 'grid', gap: 0.75 }}>
                    {[['Name', d.full_name || detailDialog.full_name], ['Email', d.email || detailDialog.email], ['Phone', d.mobile || detailDialog.phone], ['DOB', d.dob], ['Gender', d.gender], ['ID Type', d.identity_type], ['ID Number', d.identity_number]].map(([k, v]) => v && (
                      <Box key={k} sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ width: 90, flexShrink: 0 }}>{k}:</Typography>
                        <Typography variant="caption" fontWeight={500}>{v}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>

                {/* Connection */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>Connection Details</Typography>
                  <Box sx={{ display: 'grid', gap: 0.75 }}>
                    {[['Category', d.connection_category || d.category], ['Purpose', d.purpose], ['Load (kW)', d.required_load], ['Supply Voltage', d.supply_voltage], ['Phases', d.phases], ['Address', d.address], ['City', d.city], ['State', d.state], ['Pincode', d.pincode]].map(([k, v]) => v && (
                      <Box key={k} sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ width: 90, flexShrink: 0 }}>{k}:</Typography>
                        <Typography variant="caption" fontWeight={500}>{v}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>

                {/* Remarks */}
                {detailDialog.remarks && (
                  <Grid item xs={12}>
                    <Alert severity="info" variant="outlined">
                      <strong>Admin Remarks:</strong> {detailDialog.remarks}
                    </Alert>
                  </Grid>
                )}

                {/* Stage History */}
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
                              {h.remarks && (
                                <Typography variant="caption" color="text.secondary">{h.remarks}</Typography>
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

      {/* Document Dialog */}
      <Dialog open={!!docDialog} onClose={() => setDocDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Documents ({(docDialog || []).length})</DialogTitle>
        <DialogContent dividers>
          {(docDialog || []).map((doc, i) => {
            const url = typeof doc === 'string' ? doc : (doc.url || doc.path || '');
            const name = typeof doc === 'string' ? `Document ${i + 1}` : (doc.name || doc.type || `Document ${i + 1}`);
            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            return (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{name}</Typography>
                {isImage ? (
                  <Box component="img" src={url} alt={name} sx={{ maxWidth: '100%', borderRadius: 1, border: '1px solid #e0e0e0' }} />
                ) : (
                  <Button variant="outlined" size="small" href={url} target="_blank" startIcon={<OpenInNew />}>
                    View / Download
                  </Button>
                )}
                {i < (docDialog || []).length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
