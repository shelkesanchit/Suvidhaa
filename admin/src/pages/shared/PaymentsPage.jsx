import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Chip, Divider, Alert,
  InputAdornment, IconButton, Tooltip, Paper,
} from '@mui/material';
import {
  Search, Payment, History, Print, Email, CheckCircle, Refresh,
  AccountBalanceWallet, VerifiedUser, ReceiptLong,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder';
const DEMO_CHARGE_PAISE = 100; // ₹1 in paise — demo mode (all payments charge ₹1 via Razorpay)

// ─── Receipt sub-component ──────────────────────────────────────────────────
const PaymentReceipt = React.forwardRef(
  ({ data, deptGradient, deptName, deptColor }, ref) => {
    const consumerName =
      data.consumer?.name ||
      data.consumer?.full_name ||
      data.consumer?.contact_name ||
      '—';

    const rows = [
      ['Receipt No.', data.receipt_number || `RCP-${data.razorpay_payment_id || Date.now()}`],
      ['Consumer ID', data.consumerId],
      ['Consumer Name', consumerName],
      ['Email', data.consumer?.email || '—'],
      ['Mobile', data.consumer?.mobile || data.consumer?.phone || '—'],
      ['Department', deptName],
      ['Bill Period', data.bill_period || 'Current'],
      ['Amount Paid', `₹${Number(data.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Payment Method', data.payment_method || 'Razorpay (Online)'],
      ['Razorpay Payment ID', data.razorpay_payment_id || data.transaction_id || '—'],
      ['Order ID', data.razorpay_order_id || '—'],
      ['Date & Time', new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })],
      ['Status', 'PAID — SUCCESS'],
    ];

    return (
      <Box ref={ref} className="suvidha-receipt">
        {/* Gradient header */}
        <Box
          sx={{
            background: deptGradient,
            color: 'white',
            p: 2.5,
            textAlign: 'center',
            borderRadius: 2,
            mb: 2.5,
          }}
        >
          <Typography variant="h5" fontWeight={800} letterSpacing={1}>
            SUVIDHA
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.3 }}>
            {deptName}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            Official Payment Receipt
          </Typography>
        </Box>

        {/* Rows */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {rows.map(([label, value], i) => (
            <Box
              key={label}
              sx={{
                display: 'flex',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Box sx={{ width: 170, px: 2, py: 1, bgcolor: '#f6f7f8', flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {label}
                </Typography>
              </Box>
              <Box sx={{ px: 2, py: 1, flex: 1, bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: label === 'Amount Paid' ? 800 : label === 'Status' ? 700 : 500,
                    color:
                      label === 'Status'
                        ? 'success.main'
                        : label === 'Amount Paid'
                        ? deptColor
                        : 'text.primary',
                    fontSize: label === 'Amount Paid' ? '0.95rem' : '0.8rem',
                  }}
                >
                  {value}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2.5, fontStyle: 'italic' }}
        >
          This is a computer-generated receipt and does not require a signature.
          <br />
          Powered by SUVIDHA Unified Municipal Services
        </Typography>
      </Box>
    );
  }
);
PaymentReceipt.displayName = 'PaymentReceipt';

// ─── Print helper ────────────────────────────────────────────────────────────
const printReceipt = (receiptData, deptGradient, deptName) => {
  const consumerName =
    receiptData.consumer?.name ||
    receiptData.consumer?.full_name ||
    receiptData.consumer?.contact_name ||
    '—';

  const rows = [
    ['Receipt No.', receiptData.receipt_number || `RCP-${receiptData.razorpay_payment_id || Date.now()}`],
    ['Consumer ID', receiptData.consumerId],
    ['Consumer Name', consumerName],
    ['Email', receiptData.consumer?.email || '—'],
    ['Mobile', receiptData.consumer?.mobile || receiptData.consumer?.phone || '—'],
    ['Department', deptName],
    ['Bill Period', receiptData.bill_period || 'Current'],
    ['Amount Paid', `₹${Number(receiptData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Payment Method', receiptData.payment_method || 'Razorpay (Online)'],
    ['Transaction ID', receiptData.razorpay_payment_id || receiptData.transaction_id || '—'],
    ['Order ID', receiptData.razorpay_order_id || '—'],
    ['Date & Time', new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })],
    ['Status', 'PAID — SUCCESS'],
  ];

  const html = `<!DOCTYPE html><html><head><title>Payment Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .header { background: linear-gradient(135deg,#1976d2,#42a5f5); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
    .header p { margin: 4px 0 0; opacity: .9; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    tr:nth-child(even) td:last-child { background: #fafafa; }
    td { padding: 8px 14px; font-size: 13px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    td:first-child { background: #f6f7f8; font-weight: 600; color: #666; width: 170px; }
    .amount { font-weight: 900; font-size: 16px; color: #1976d2; }
    .status { font-weight: 700; color: green; }
    footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; font-style: italic; }
    @media print { @page { margin: 1cm; } }
  </style></head><body>
  <div class="header"><h1>SUVIDHA</h1><p>${deptName}</p><p style="font-size:12px;opacity:.75">Official Payment Receipt</p></div>
  <table>${rows.map(([l, v]) => `<tr><td>${l}</td><td class="${l === 'Amount Paid' ? 'amount' : l === 'Status' ? 'status' : ''}">${v}</td></tr>`).join('')}</table>
  <footer>This is a computer-generated receipt and does not require a signature.<br>Powered by SUVIDHA Unified Municipal Services</footer>
  </body></html>`;

  const win = window.open('', '_blank', 'width=700,height=900');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
};

// ─── Main PaymentsPage ────────────────────────────────────────────────────────
const PaymentsPage = ({
  deptColor,
  deptGradient,
  deptName,
  consumerPrefix,     // 'E' | 'G' | 'W' | 'M'
  api,
  billEndpoint,       // e.g. '/admin/consumers'
  paymentEndpoint,    // e.g. '/admin/payments'
}) => {
  const [tab, setTab] = useState(0);

  // --- Make Payment state ---
  const [consumerId, setConsumerId] = useState('');
  const [consumerData, setConsumerData] = useState(null);
  const [fetchingBill, setFetchingBill] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // --- OTP state ---
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  // --- Receipt state ---
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // --- History state ---
  const [historyId, setHistoryId] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // ── Fetch consumer bill ──────────────────────────────────────────────────
  const fetchConsumerBill = async () => {
    const id = consumerId.trim();
    if (!id) { toast.error(`Enter a consumer ID (e.g. ${consumerPrefix}100)`); return; }
    try {
      setFetchingBill(true);
      setConsumerData(null);
      const res = await api.get(`${billEndpoint}?consumer_number=${id}`);
      const list = res.data?.data || res.data || [];
      const consumer = Array.isArray(list) ? list[0] : list;
      if (!consumer || Object.keys(consumer).length === 0) {
        toast.error(`Consumer "${id}" not found`);
        return;
      }
      setConsumerData(consumer);
    } catch {
      toast.error('Failed to fetch consumer details');
    } finally {
      setFetchingBill(false);
    }
  };

  // ── Initiate Razorpay payment ─────────────────────────────────────────────
  const initiatePayment = async () => {
    // Use actual outstanding amount for records; backend always charges ₹1 for demo
    const amount = Math.max(
      Number(consumerData?.total_dues ?? consumerData?.outstanding_amount ?? consumerData?.bill_amount ?? 0),
      1
    );
    if (!window.Razorpay) { toast.error('Payment gateway not loaded. Please refresh the page.'); return; }

    try {
      setPaymentLoading(true);
      const orderRes = await api.post(`${paymentEndpoint}/create-order`, {
        consumer_id: consumerData.id,
        consumer_number: consumerId,
        amount,
      });
      const { order_id, razorpay_key } = orderRes.data?.data || orderRes.data;

      const options = {
        key: razorpay_key || RAZORPAY_KEY,
        amount: DEMO_CHARGE_PAISE, // always ₹1 — matches backend order amount
        currency: 'INR',
        name: `SUVIDHA — ${deptName}`,
        description: `Bill Payment for ${consumerId} (Demo ₹1)`,
        order_id,
        prefill: {
          name: consumerData.name || consumerData.full_name || consumerData.contact_name || '',
          email: consumerData.email || '',
          contact: consumerData.mobile || consumerData.phone || '',
        },
        theme: { color: deptColor },
        handler: (response) => handlePaymentSuccess(response, amount),
        modal: { ondismiss: () => setPaymentLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        toast.error(`Payment failed: ${resp.error?.description || 'Unknown error'}`);
        setPaymentLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error('Failed to initiate payment. Please try again.');
      setPaymentLoading(false);
    }
  };

  // ── Handle successful Razorpay payment ───────────────────────────────────
  const handlePaymentSuccess = async (rzpResponse, amount) => {
    try {
      // Verify payment signature + trigger OTP email
      await api.post(`${paymentEndpoint}/verify`, {
        razorpay_order_id: rzpResponse.razorpay_order_id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id,
        razorpay_signature: rzpResponse.razorpay_signature,
        consumer_number: consumerId,
        amount,
      });
      setPendingPayment({ ...rzpResponse, amount });
      setPaymentLoading(false);
      setOtpOpen(true);
      toast.success('Payment received! OTP sent to registered email.');
    } catch {
      toast.error('Payment recorded but verification failed. Contact support.');
      setPaymentLoading(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────
  const verifyOtp = async () => {
    if (!otp.trim() || otp.length < 4) { toast.error('Enter valid OTP (4-6 digits)'); return; }
    try {
      setOtpLoading(true);
      const res = await api.post(`${paymentEndpoint}/verify-otp`, {
        otp: otp.trim(),
        payment_id: pendingPayment.razorpay_payment_id,
        consumer_number: consumerId,
      });
      const receipt = res.data?.data || res.data || {};
      setReceiptData({
        ...receipt,
        ...pendingPayment,
        consumerId,
        consumer: consumerData,
      });
      setOtpOpen(false);
      setOtp('');
      setReceiptOpen(true);
      toast.success('OTP verified — receipt ready!');
    } catch {
      toast.error('Invalid OTP. Please check and retry.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Skip OTP — show receipt directly (fallback)
  const skipOtp = () => {
    setReceiptData({
      ...pendingPayment,
      consumerId,
      consumer: consumerData,
      receipt_number: `RCP-${pendingPayment?.razorpay_payment_id || Date.now()}`,
    });
    setOtpOpen(false);
    setOtp('');
    setReceiptOpen(true);
  };

  // ── Send receipt email ────────────────────────────────────────────────────
  const sendEmail = async () => {
    try {
      await api.post(`${paymentEndpoint}/send-receipt`, {
        payment_id: receiptData.razorpay_payment_id || receiptData.transaction_id,
        consumer_number: consumerId,
      });
      toast.success('Receipt emailed to consumer!');
    } catch {
      toast.error('Failed to send email');
    }
  };

  // ── Fetch payment history ─────────────────────────────────────────────────
  const fetchHistory = async () => {
    const id = historyId.trim();
    if (!id) { toast.error(`Enter a consumer ID (e.g. ${consumerPrefix}100)`); return; }
    try {
      setFetchingHistory(true);
      const res = await api.get(`${paymentEndpoint}/history/${id}`);
      setHistoryData(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to fetch payment history');
      setHistoryData([]);
    } finally {
      setFetchingHistory(false);
    }
  };

  const statusColor = (s) => {
    if (['success', 'completed', 'paid'].includes(s)) return 'success';
    if (['pending', 'processing'].includes(s)) return 'warning';
    if (['failed', 'cancelled'].includes(s)) return 'error';
    return 'default';
  };

  const outstandingAmount =
    Number(consumerData?.total_dues ?? consumerData?.outstanding_amount ?? consumerData?.bill_amount ?? 0);

  const consumerName =
    consumerData?.name || consumerData?.full_name || consumerData?.contact_name || '—';

  // ─────────────────────────────────── RENDER ──────────────────────────────
  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Payments</Typography>
        <Typography variant="body2" color="text.secondary">
          {deptName} — collect bills via Razorpay and view transaction history
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab icon={<AccountBalanceWallet sx={{ fontSize: 18 }} />} iconPosition="start" label="Collect Payment" />
        <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label="Payment History" />
      </Tabs>

      {/* ══════════════ TAB 0: COLLECT PAYMENT ══════════════ */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Consumer search */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Enter Consumer ID to fetch outstanding bill
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    placeholder={`Consumer ID — e.g. ${consumerPrefix}100, ${consumerPrefix}101`}
                    value={consumerId}
                    onChange={(e) => setConsumerId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && fetchConsumerBill()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: 'text.disabled', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={fetchConsumerBill}
                    disabled={fetchingBill}
                    sx={{
                      minWidth: 140,
                      background: deptGradient,
                      '&:hover': { background: deptGradient, filter: 'brightness(1.08)' },
                    }}
                  >
                    {fetchingBill ? <CircularProgress size={20} color="inherit" /> : 'Fetch Bill'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Consumer + Bill card */}
          {consumerData && (
            <>
              <Grid item xs={12} md={7}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <VerifiedUser sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="subtitle1">Consumer Details</Typography>
                    </Box>
                    <Grid container spacing={1.5}>
                      {[
                        ['Consumer ID', consumerId],
                        ['Full Name', consumerName],
                        ['Email', consumerData.email || '—'],
                        ['Mobile', consumerData.mobile || consumerData.phone || '—'],
                        ['Category', consumerData.category || consumerData.connection_type || '—'],
                        ['Status', null],
                      ].map(([label, value]) => (
                        <Grid item xs={6} key={label}>
                          <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                          {label === 'Status' ? (
                            <Chip
                              label={consumerData.status || 'active'}
                              size="small"
                              color={consumerData.status === 'active' ? 'success' : 'default'}
                            />
                          ) : (
                            <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
                              {value}
                            </Typography>
                          )}
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card sx={{ height: '100%', background: deptGradient, color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <AccountBalanceWallet sx={{ fontSize: 44, opacity: 0.85, mb: 1 }} />
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
                      Outstanding Balance
                    </Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ mb: 1, letterSpacing: '-1px' }}>
                      ₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mb: 2.5, bgcolor: 'rgba(0,0,0,0.18)', borderRadius: 1, px: 1.5, py: 0.5 }}>
                      📌 Demo mode — Razorpay will charge ₹1
                    </Typography>

                    <Button
                      fullWidth
                      size="large"
                      variant="contained"
                      disabled={paymentLoading}
                      onClick={initiatePayment}
                      sx={{
                        bgcolor: 'white',
                        color: deptColor,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                        '&:disabled': { bgcolor: 'rgba(255,255,255,0.5)' },
                      }}
                      startIcon={
                        paymentLoading
                          ? <CircularProgress size={18} sx={{ color: deptColor }} />
                          : <Payment />
                      }
                    >
                      {paymentLoading ? 'Opening checkout...' : 'Pay ₹1 via Razorpay (Demo)'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* ══════════════ TAB 1: PAYMENT HISTORY ══════════════ */}
      {tab === 1 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Lookup all transactions for a consumer
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  placeholder={`Consumer ID — e.g. ${consumerPrefix}100, ${consumerPrefix}101`}
                  value={historyId}
                  onChange={(e) => setHistoryId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <History sx={{ color: 'text.disabled', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={fetchHistory}
                  disabled={fetchingHistory}
                  sx={{
                    minWidth: 160,
                    background: deptGradient,
                    '&:hover': { background: deptGradient, filter: 'brightness(1.08)' },
                  }}
                >
                  {fetchingHistory ? <CircularProgress size={20} color="inherit" /> : 'Fetch History'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {historyData !== null && (
            <Card>
              <CardContent sx={{ p: 0 }}>
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      Transactions for
                      <Typography component="span" fontWeight={700} sx={{ ml: 0.5, color: deptColor }}>
                        {historyId}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Array.isArray(historyData) ? historyData.length : 0} record(s) found
                    </Typography>
                  </Box>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={fetchHistory}>
                      <Refresh sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {!Array.isArray(historyData) || historyData.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <ReceiptLong sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }} />
                    <Typography color="text.secondary">No transactions found for {historyId}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 750 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Transaction ID</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Razorpay Ref.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyData.map((txn, i) => (
                          <TableRow key={txn.id || txn.transaction_id || i} hover>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">{i + 1}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                sx={{ fontFamily: 'monospace', color: deptColor }}
                              >
                                {txn.transaction_id || txn.payment_id || `TXN-${i + 1}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {txn.created_at || txn.payment_date
                                  ? new Date(txn.created_at || txn.payment_date).toLocaleString('en-IN')
                                  : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" fontWeight={700}>
                                ₹{Number(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                {(txn.payment_method || '—').replace(/_/g, ' ')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                {(txn.payment_type || txn.type || 'bill').replace(/_/g, ' ')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={txn.status || txn.payment_status || '—'}
                                size="small"
                                color={statusColor(txn.status || txn.payment_status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                                {txn.razorpay_payment_id || txn.reference_id || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ══════════════ OTP DIALOG ══════════════ */}
      <Dialog open={otpOpen} maxWidth="xs" fullWidth disableEscapeKeyDown>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ color: deptColor }} />
          Verify Payment OTP
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment of <strong>
              ₹{Number(pendingPayment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong> received via Razorpay!
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            An OTP has been sent to the consumer's registered email address.
            Enter it to confirm and generate the receipt.
          </Typography>
          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
            autoFocus
            inputProps={{
              style: {
                letterSpacing: '0.6em',
                textAlign: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={skipOtp} color="inherit" size="small">
            Skip OTP
          </Button>
          <Button
            variant="contained"
            onClick={verifyOtp}
            disabled={otpLoading || otp.length < 4}
            sx={{ background: deptGradient, minWidth: 130 }}
          >
            {otpLoading ? <CircularProgress size={20} color="inherit" /> : 'Verify & Get Receipt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════ RECEIPT DIALOG ══════════════ */}
      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              <Typography variant="h6">Payment Receipt</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Email receipt to consumer">
                <IconButton size="small" onClick={sendEmail}>
                  <Email fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print receipt">
                <IconButton
                  size="small"
                  onClick={() => receiptData && printReceipt(receiptData, deptGradient, deptName)}
                >
                  <Print fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {receiptData && (
            <PaymentReceipt
              data={receiptData}
              deptGradient={deptGradient}
              deptName={deptName}
              deptColor={deptColor}
            />
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setReceiptOpen(false)} color="inherit">Close</Button>
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={sendEmail}
            sx={{ borderColor: deptColor, color: deptColor }}
          >
            Email
          </Button>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={() => receiptData && printReceipt(receiptData, deptGradient, deptName)}
            sx={{ background: deptGradient }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentsPage;
