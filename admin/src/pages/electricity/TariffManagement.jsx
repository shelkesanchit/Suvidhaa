import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, IconButton, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, CircularProgress,
  Alert, Grid, Divider, InputAdornment,
} from '@mui/material';
import { Edit, Save, Bolt, Refresh, Warning } from '@mui/icons-material';
import electricityApi from '../../utils/electricity/api';
import toast from 'react-hot-toast';

const TARIFF_LABELS = {
  tariff_residential_upto_100:      { label: 'Residential — 0 to 100 units',    category: 'Residential', unit: '₹/kWh' },
  tariff_residential_101_300:       { label: 'Residential — 101 to 300 units',   category: 'Residential', unit: '₹/kWh' },
  tariff_residential_above_300:     { label: 'Residential — Above 300 units',    category: 'Residential', unit: '₹/kWh' },
  tariff_commercial:                { label: 'Commercial (All units)',            category: 'Commercial',  unit: '₹/kWh' },
  tariff_industrial:                { label: 'Industrial (All units)',            category: 'Industrial',  unit: '₹/kWh' },
  tariff_agricultural:              { label: 'Agricultural (All units)',          category: 'Agricultural', unit: '₹/kWh' },
  fixed_charge_residential:         { label: 'Residential Fixed Charge',         category: 'Fixed Charges', unit: '₹/month' },
  fixed_charge_commercial:          { label: 'Commercial Fixed Charge',          category: 'Fixed Charges', unit: '₹/month' },
  fixed_charge_industrial:          { label: 'Industrial Fixed Charge',          category: 'Fixed Charges', unit: '₹/month' },
  tax_rate:                         { label: 'Electricity Tax Rate',             category: 'Taxes',       unit: '%' },
  late_payment_surcharge:           { label: 'Late Payment Surcharge',           category: 'Taxes',       unit: '%' },
};

const CATEGORY_COLORS = {
  Residential:    { color: '#1976d2', bg: '#e3f2fd' },
  Commercial:     { color: '#2e7d32', bg: '#e8f5e9' },
  Industrial:     { color: '#f57c00', bg: '#fff3e0' },
  Agricultural:   { color: '#0097a7', bg: '#e0f7fa' },
  'Fixed Charges':{ color: '#7b1fa2', bg: '#f3e5f5' },
  Taxes:          { color: '#d32f2f', bg: '#ffebee' },
};

export default function TariffManagement() {
  const [tariffs, setTariffs] = useState({});
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      let raw = {};
      try {
        const res = await electricityApi.get('/settings/tariffs/all');
        raw = res.data || {};
      } catch {
        // fallback to all settings
        const res = await electricityApi.get('/settings');
        const all = res.data || {};
        Object.entries(all).forEach(([k, v]) => {
          if (k.startsWith('tariff_') || k.startsWith('fixed_charge') || k.startsWith('tax_') || k.startsWith('late_')) {
            raw[k] = typeof v === 'object' ? v.value : v;
          }
        });
      }
      setTariffs(raw);
    } catch {
      toast.error('Failed to load tariffs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTariffs(); }, []);

  const handleEdit = (key) => {
    setEditDialog(key);
    setEditValue(String(tariffs[key] || ''));
  };

  const handleSave = async () => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) { toast.error('Value must be a valid positive number'); return; }
    try {
      setSaving(true);
      await electricityApi.put(`/settings/${editDialog}`, { value: val });
      toast.success('Tariff rate updated successfully');
      setTariffs(prev => ({ ...prev, [editDialog]: val }));
      setEditDialog(null);
    } catch {
      toast.error('Failed to update tariff rate');
    } finally {
      setSaving(false);
    }
  };

  // Build grouped structure
  const grouped = {};
  Object.entries(tariffs).forEach(([key, value]) => {
    const meta = TARIFF_LABELS[key];
    const category = meta?.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ key, value, label: meta?.label || key, unit: meta?.unit || '₹/kWh' });
  });

  const editMeta = editDialog ? TARIFF_LABELS[editDialog] : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Tariff Rates</Typography>
          <Typography variant="body2" color="text.secondary">Energy charges, fixed charges, and applicable taxes</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchTariffs} disabled={loading}>Refresh</Button>
      </Box>

      <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
        <strong>Important:</strong> Changes to tariff rates affect all new bill calculations. Existing bills are not retroactively updated.
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : Object.keys(grouped).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Bolt sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
          <Typography color="text.secondary">No tariff rates found in database</Typography>
          <Typography variant="caption" color="text.secondary">Check that electricity_system_settings table has tariff entries</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {Object.entries(grouped).map(([category, items]) => {
            const cc = CATEGORY_COLORS[category] || { color: '#616161', bg: '#f5f5f5' };
            return (
              <Grid item xs={12} md={6} key={category}>
                <Card>
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: cc.bg, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `2px solid ${cc.color}33` }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cc.color }} />
                    <Typography fontWeight={700} sx={{ color: cc.color }}>{category}</Typography>
                    <Chip label={`${items.length} rates`} size="small" sx={{ height: 18, fontSize: '0.68rem', bgcolor: `${cc.color}22`, color: cc.color, ml: 'auto' }} />
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Rate Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }} align="right">Rate</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }} align="center">Edit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map(({ key, value, label, unit }) => (
                        <TableRow key={key} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{label}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{key}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Typography variant="body1" fontWeight={700} sx={{ color: cc.color }}>
                                {unit.startsWith('₹') ? '₹' : ''}{Number(value || 0).toFixed(2)}{unit === '%' ? '%' : ''}
                              </Typography>
                              {unit !== '%' && <Typography variant="caption" color="text.secondary">/kWh</Typography>}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit rate">
                              <IconButton size="small" onClick={() => handleEdit(key)} color="primary">
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Tariff Rate</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editDialog && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {editMeta?.label || editDialog}
              </Typography>
              <TextField
                fullWidth label="Rate" type="number" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: editMeta?.unit?.startsWith('₹')
                    ? <InputAdornment position="start">₹</InputAdornment>
                    : undefined,
                  endAdornment: editMeta?.unit === '%'
                    ? <InputAdornment position="end">%</InputAdornment>
                    : editMeta?.unit?.includes('month')
                    ? <InputAdornment position="end">/month</InputAdornment>
                    : <InputAdornment position="end">/kWh</InputAdornment>,
                }}
                helperText="Enter a positive numeric value"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button variant="contained" startIcon={saving ? null : <Save />} onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Update Rate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
