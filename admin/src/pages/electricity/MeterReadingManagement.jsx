import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, CircularProgress,
  Alert, Grid, Checkbox, LinearProgress,
} from '@mui/material';
import { Search, Refresh, History, Send, FlashOn, CheckCircle, Warning } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function MeterReadingManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [readings, setReadings] = useState({});
  const [readingDates, setReadingDates] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [historyDialog, setHistoryDialog] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterState) params.append('state', filterState);
      if (filterCity) params.append('city', filterCity);
      const res = await api.get(`/admin/meter-readings/customers?${params}`);
      const rows = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setCustomers(rows);
      const initDates = {};
      rows.forEach(r => { initDates[r.id] = today; });
      setReadingDates(initDates);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = search
    ? customers.filter(c => {
        const q = search.toLowerCase();
        return (
          c.full_name?.toLowerCase().includes(q) ||
          c.consumer_number?.toLowerCase().includes(q) ||
          c.meter_number?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q)
        );
      })
    : customers;

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getReading = (id) => readings[id] || '';
  const isValid = (c) => {
    const v = Number(getReading(c.id));
    const prev = Number(c.last_reading || 0);
    return v > prev;
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginated.map(c => c.id);
    const allSelected = pageIds.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) pageIds.forEach(id => n.delete(id));
      else pageIds.forEach(id => { if (readings[id]) n.add(id); });
      return n;
    });
  };

  const enteredCount = Object.values(readings).filter(v => v !== '' && !isNaN(v)).length;
  const validSelected = [...selected].filter(id => {
    const c = customers.find(x => x.id === id);
    return c && readings[id] && isValid(c);
  });

  const handleBulkSubmit = async () => {
    if (validSelected.length === 0) {
      toast.error('No valid readings selected');
      return;
    }
    try {
      setSubmitting(true);
      const payload = validSelected.map(id => {
        const c = customers.find(x => x.id === id);
        return {
          customerId: id,
          currentReading: Number(readings[id]),
          previousReading: Number(c.last_reading || 0),
          readingDate: readingDates[id] || today,
        };
      });
      await api.post('/admin/meter-readings/bulk', { readings: payload });
      toast.success(`${validSelected.length} readings submitted and bills generated`);
      setReadings({});
      setSelected(new Set());
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit readings');
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (c) => {
    setHistoryDialog(c);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/admin/meter-readings/history/${c.id}`);
      setHistory(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Meter Readings</Typography>
          <Typography variant="body2" color="text.secondary">
            {customers.length} consumers &nbsp;·&nbsp; {enteredCount} readings entered &nbsp;·&nbsp; {selected.size} selected
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchCustomers} disabled={loading}>Refresh</Button>
      </Box>

      {/* Bulk submit bar */}
      {selected.size > 0 && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit" variant="contained" size="small" startIcon={<Send />}
              onClick={handleBulkSubmit} disabled={submitting || validSelected.length === 0}
              sx={{ bgcolor: '#1976d2', color: '#fff', '&:hover': { bgcolor: '#1565c0' } }}
            >
              {submitting ? <CircularProgress size={16} color="inherit" /> : `Submit ${validSelected.length} Readings`}
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <strong>{selected.size}</strong> consumers selected &nbsp;·&nbsp; <strong>{validSelected.length}</strong> valid readings ready to submit
        </Alert>
      )}

      <Card>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Search by name, consumer no., meter no., city..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              sx={{ flex: '1 1 260px', maxWidth: 380 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
            />
            <TextField size="small" label="State" value={filterState} onChange={e => setFilterState(e.target.value)} sx={{ width: 120 }} />
            <TextField size="small" label="City" value={filterCity} onChange={e => setFilterCity(e.target.value)} sx={{ width: 130 }} />
            <Button size="small" variant="outlined" onClick={() => { setFilterState(''); setFilterCity(''); fetchCustomers(); }}>
              Clear
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ py: 4 }}><LinearProgress /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FlashOn sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
              <Typography color="text.secondary">No consumers found</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" indeterminate={paginated.some(c => selected.has(c.id)) && !paginated.every(c => selected.has(c.id))}
                        checked={paginated.length > 0 && paginated.every(c => selected.has(c.id))} onChange={toggleSelectAll} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Consumer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Meter No.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Reading</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 150 }}>New Reading (kWh)</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 140 }}>Reading Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Consumption</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((c) => {
                    const val = readings[c.id];
                    const hasVal = val !== undefined && val !== '';
                    const valid = hasVal && isValid(c);
                    const consumption = hasVal && valid ? Number(val) - Number(c.last_reading || 0) : null;
                    return (
                      <TableRow key={c.id} hover selected={selected.has(c.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                            disabled={!hasVal || !valid} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{c.full_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.consumer_number}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.meter_number}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{c.last_reading ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {c.last_reading_date ? new Date(c.last_reading_date).toLocaleDateString('en-IN') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" type="number" placeholder="Enter reading"
                            value={val || ''}
                            onChange={e => setReadings(prev => ({ ...prev, [c.id]: e.target.value }))}
                            sx={{
                              width: 130,
                              '& .MuiOutlinedInput-root': {
                                borderColor: hasVal ? (valid ? '#2e7d32' : '#d32f2f') : undefined,
                                '& fieldset': { borderColor: hasVal ? (valid ? '#2e7d32' : '#d32f2f') : undefined },
                              },
                            }}
                            inputProps={{ min: Number(c.last_reading || 0) + 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" type="date" value={readingDates[c.id] || today}
                            onChange={e => setReadingDates(prev => ({ ...prev, [c.id]: e.target.value }))}
                            sx={{ width: 130 }}
                            inputProps={{ max: today }}
                          />
                        </TableCell>
                        <TableCell>
                          {consumption !== null ? (
                            <Chip
                              label={`${consumption} kWh`}
                              size="small"
                              icon={consumption > 0 ? <CheckCircle sx={{ fontSize: 14 }} /> : <Warning sx={{ fontSize: 14 }} />}
                              color={consumption > 0 ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ fontSize: '0.72rem', height: 22 }}
                            />
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Reading History">
                            <IconButton size="small" onClick={() => openHistory(c)}>
                              <History sx={{ fontSize: 17 }} />
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

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onClose={() => { setHistoryDialog(null); setHistory([]); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Meter Reading History
          {historyDialog && <Typography variant="body2" color="text.secondary">{historyDialog.full_name} — {historyDialog.meter_number}</Typography>}
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>No reading history available</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Reading (kWh)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Consumption</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Bill Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{h.reading_date ? new Date(h.reading_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{h.current_reading ?? h.reading_value}</TableCell>
                    <TableCell align="right">{h.units_consumed ? `${h.units_consumed} kWh` : '—'}</TableCell>
                    <TableCell align="right">{h.bill_amount ? `₹${Number(h.bill_amount).toLocaleString()}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setHistoryDialog(null); setHistory([]); }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
