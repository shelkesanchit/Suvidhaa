import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Grid, Chip, CircularProgress, Alert, Paper,
  Divider,
} from '@mui/material';
import { Download, Search, Assessment, TrendingUp } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#1976d2', '#2e7d32', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'];

const METHOD_LABELS = {
  online:       'Online',
  upi:          'UPI',
  card:         'Card',
  cash:         'Cash',
  net_banking:  'Net Banking',
  wallet:       'Wallet',
};

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!startDate || !endDate) { toast.error('Select both start and end dates'); return; }
    if (startDate > endDate) { toast.error('Start date must be before end date'); return; }
    try {
      setLoading(true);
      const res = await api.get(`/admin/reports/payments?start_date=${startDate}&end_date=${endDate}`);
      const rows = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setData(rows);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ['Date', 'Payment Method', 'Total Amount (₹)', 'Transactions'];
    const rows = data.map(r => [
      r.date, METHOD_LABELS[r.payment_method] || r.payment_method,
      Number(r.total_amount || 0).toFixed(2), r.transaction_count,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `electricity_report_${startDate}_${endDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Derived stats
  const totalRevenue = data?.reduce((s, r) => s + Number(r.total_amount || 0), 0) || 0;
  const totalTxns = data?.reduce((s, r) => s + Number(r.transaction_count || 0), 0) || 0;

  const byMethod = data ? Object.entries(
    data.reduce((acc, r) => {
      const m = r.payment_method || 'other';
      if (!acc[m]) acc[m] = { name: METHOD_LABELS[m] || m, amount: 0, count: 0 };
      acc[m].amount += Number(r.total_amount || 0);
      acc[m].count += Number(r.transaction_count || 0);
      return acc;
    }, {})
  ).map(([, v]) => v) : [];

  const byDate = data ? Object.entries(
    data.reduce((acc, r) => {
      const d = r.date;
      if (!acc[d]) acc[d] = { date: d, revenue: 0 };
      acc[d].revenue += Number(r.total_amount || 0);
      return acc;
    }, {})
  ).map(([, v]) => v).sort((a, b) => a.date.localeCompare(b.date)) : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0d1b2a" sx={{ mb: 0.5 }}>Payment Reports</Typography>
          <Typography variant="body2" color="text.secondary">Revenue collection analytics and payment breakdown</Typography>
        </Box>
        {data && data.length > 0 && (
          <Button variant="outlined" startIcon={<Download />} onClick={downloadCSV}>Export CSV</Button>
        )}
      </Box>

      {/* Filter Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField fullWidth size="small" type="date" label="Start Date" value={startDate}
                onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <TextField fullWidth size="small" type="date" label="End Date" value={endDate}
                onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: today }} />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <Button fullWidth variant="contained" startIcon={loading ? null : <Search />} onClick={fetchReport} disabled={loading} sx={{ py: 1 }}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data section */}
      {data === null ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Assessment sx={{ fontSize: 72, color: '#e0e0e0', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">Select date range and generate report</Typography>
          <Typography variant="body2" color="text.secondary">Payment data will appear here</Typography>
        </Box>
      ) : data.length === 0 ? (
        <Alert severity="info">No payment records found for the selected date range ({startDate} to {endDate}).</Alert>
      ) : (
        <>
          {/* Charts */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {/* Revenue by Date */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    <TrendingUp sx={{ mr: 1, fontSize: 20, color: '#1976d2', verticalAlign: 'middle' }} />
                    Daily Revenue Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={byDate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                      <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [`₹${Number(v).toLocaleString()}`, 'Revenue']} labelFormatter={l => `Date: ${l}`} />
                      <Bar dataKey="revenue" fill="#1976d2" radius={[3, 3, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Revenue by Method */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>By Payment Method</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={byMethod} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => [`₹${Number(v).toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Divider sx={{ my: 1.5 }} />
                  {byMethod.map((m, i) => (
                    <Box key={m.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                        <Typography variant="body2">{m.name}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>₹{Number(m.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Data Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Payment Records ({data.length} entries)
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Payment Method</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Transactions</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Total Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Avg. per Txn</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((row, i) => {
                      const amt = Number(row.total_amount || 0);
                      const cnt = Number(row.transaction_count || 0);
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={METHOD_LABELS[row.payment_method] || row.payment_method || 'Unknown'}
                              size="small" variant="outlined"
                              sx={{ fontSize: '0.72rem', height: 22 }}
                            />
                          </TableCell>
                          <TableCell align="right">{cnt.toLocaleString()}</TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={600} color="success.main">₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" color="text.secondary">₹{cnt > 0 ? Math.round(amt / cnt).toLocaleString() : 0}</Typography></TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Total row */}
                    <TableRow sx={{ bgcolor: '#f0f4ff' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{totalTxns.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#1976d2' }}>₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>₹{totalTxns > 0 ? Math.round(totalRevenue / totalTxns).toLocaleString() : 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
