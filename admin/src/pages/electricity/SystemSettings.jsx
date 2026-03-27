import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, CircularProgress,
  Alert, Grid, Accordion, AccordionSummary, AccordionDetails, Divider,
} from '@mui/material';
import { Search, Edit, Save, ExpandMore, Settings, Refresh, Info } from '@mui/icons-material';
import electricityApi from '../../utils/electricity/api';
import toast from 'react-hot-toast';

const GROUP_CONFIG = {
  tariff:      { label: 'Tariff Rates',        color: '#1976d2', bg: '#e3f2fd' },
  fixed:       { label: 'Fixed Charges',       color: '#2e7d32', bg: '#e8f5e9' },
  tax:         { label: 'Taxes & Surcharges',  color: '#f57c00', bg: '#fff3e0' },
  late:        { label: 'Late Payment',        color: '#d32f2f', bg: '#ffebee' },
  contact:     { label: 'Contact Info',        color: '#0097a7', bg: '#e0f7fa' },
  office:      { label: 'Office Details',      color: '#7b1fa2', bg: '#f3e5f5' },
  application: { label: 'Application Config',  color: '#455a64', bg: '#eceff1' },
  url:         { label: 'URLs & Links',        color: '#e65100', bg: '#fbe9e7' },
  other:       { label: 'Other Settings',      color: '#616161', bg: '#f5f5f5' },
};

const getGroup = (key) => {
  for (const prefix of Object.keys(GROUP_CONFIG)) {
    if (key.startsWith(prefix)) return prefix;
  }
  return 'other';
};

export default function SystemSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await electricityApi.get('/settings');
      const raw = res.data;
      const items = Object.entries(raw).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? val.value : val,
        description: typeof val === 'object' ? val.description : '',
        group: getGroup(key),
      })).sort((a, b) => a.key.localeCompare(b.key));
      setSettings(items);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleEdit = (setting) => {
    setEditDialog(setting);
    setEditValue(setting.value || '');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await electricityApi.put(`/settings/${editDialog.key}`, { value: editValue });
      toast.success(`Setting "${editDialog.key}" updated`);
      setSettings(prev => prev.map(s => s.key === editDialog.key ? { ...s, value: editValue } : s));
      setEditDialog(null);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? settings.filter(s => s.key.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    : settings;

  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>System Settings</Typography>
          <Typography variant="body2" color="text.secondary">{settings.length} configuration parameters</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchSettings} disabled={loading}>Refresh</Button>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Admin Only:</strong> Changes to system settings take effect immediately and affect all billing calculations.
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '12px !important', pt: 2 }}>
          <TextField
            fullWidth size="small" placeholder="Search by key name or description..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Settings sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
          <Typography color="text.secondary">No settings found</Typography>
        </Box>
      ) : (
        Object.entries(grouped).map(([groupKey, items]) => {
          const gc = GROUP_CONFIG[groupKey] || GROUP_CONFIG.other;
          return (
            <Accordion key={groupKey} defaultExpanded={['tariff', 'fixed', 'tax'].includes(groupKey)} sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: gc.bg }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: gc.color }} />
                  <Typography fontWeight={600} sx={{ color: gc.color }}>{gc.label}</Typography>
                  <Chip label={items.length} size="small" sx={{ height: 18, fontSize: '0.68rem', bgcolor: `${gc.color}22`, color: gc.color }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 600, width: '35%' }}>Setting Key</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '20%' }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Edit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(s => (
                      <TableRow key={s.key} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#455a64' }}>{s.key}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{s.description || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={String(s.value || '—').slice(0, 30)}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.72rem', height: 22, fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit value">
                            <IconButton size="small" onClick={() => handleEdit(s)} color="primary">
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Setting</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editDialog && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{editDialog.key}</strong>
                {editDialog.description && <><br /><small>{editDialog.description}</small></>}
              </Alert>
              <TextField
                fullWidth label="Value" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                multiline={editValue.length > 50}
                rows={editValue.length > 50 ? 3 : 1}
                helperText="Current value will be replaced immediately upon save"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button variant="contained" startIcon={saving ? null : <Save />} onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Save Change'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
