import React, { useState } from 'react';
import api from '../../utils/api';
import {
  Box,
  Typography,
  TextField,
  Button,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

// Load Razorpay checkout script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Open a print-ready receipt in a new window
function printReceipt({ receiptData, bill, email }) {
  const dateStr = receiptData.payment_date
    ? new Date(receiptData.payment_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' });

  const rows = [
    ['Receipt No.',           receiptData.receipt_number  || '—'],
    ['Consumer ID',           bill.consumer_number         || '—'],
    ['Consumer Name',         receiptData.consumer_name   || bill.consumer_name || '—'],
    ['Billing Month',         bill.billing_month           || '—'],
    ['Department',            'Electricity Department'],
    ['Amount Paid',           '₹1.00 (Demo mode)'],
    ['Actual Bill Amount',    `₹${bill.total_amount?.toFixed(2) || '—'}`],
    ['Transaction ID',        receiptData.transaction_id   || '—'],
    ['Razorpay Payment ID',   receiptData.razorpay_payment_id || '—'],
    ['Receipt Email',         email || '—'],
    ['Date & Time',           dateStr],
    ['Status',                'PAID — SUCCESS ✓'],
  ];

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 16px;background:#f6f7f8;font-weight:600;color:#555;font-size:13px;border-bottom:1px solid #eee;width:200px">${label}</td>
      <td style="padding:9px 16px;font-size:13px;border-bottom:1px solid #eee;${label === 'Status' ? 'color:green;font-weight:700' : label === 'Amount Paid' ? 'color:#1976d2;font-weight:700;font-size:15px' : ''}">${value}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payment Receipt – ${receiptData.receipt_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding:20px}
    .card{max-width:640px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
    .header{background:linear-gradient(135deg,#1976d2,#42a5f5);color:#fff;padding:28px 32px;text-align:center}
    .header h1{font-size:26px;letter-spacing:3px;margin-bottom:4px}
    .header p{font-size:13px;opacity:.85;margin:2px 0}
    .body{padding:24px 32px}
    table{width:100%;border-collapse:collapse;border:1px solid #ddd;border-radius:8px;overflow:hidden}
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;font-weight:900;color:rgba(25,118,210,0.08);pointer-events:none;white-space:nowrap;z-index:0}
    .footer{padding:14px 32px;background:#f5f5f5;text-align:center}
    .footer p{color:#aaa;font-size:11px;font-style:italic}
    @media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}button{display:none!important}}
  </style>
</head>
<body>
  <div class="watermark">PAID</div>
  <div class="card">
    <div class="header">
      <h1>SUVIDHA</h1>
      <p>Electricity Department</p>
      <p style="font-size:12px;opacity:.7">Official Payment Receipt</p>
    </div>
    <div class="body">
      <table>${rowsHtml}</table>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt. No signature required.</p>
      <p>SUVIDHA – Smart Utility Kiosk | Government of India</p>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=720,height=700');
  w.document.write(html);
  w.document.close();
}

const BillPaymentForm = ({ onClose }) => {
  const [consumerNumber, setConsumerNumber] = useState('');
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  // step: 'bill' | 'otp' | 'success'
  const [step, setStep] = useState('bill');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // ── Step 1: Fetch bill ────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!consumerNumber.trim()) { toast.error('Please enter consumer number'); return; }
    setLoading(true);
    try {
      const response = await api.get(`/electricity/bills/fetch/${consumerNumber.trim().toUpperCase()}`);
      if (response.data?.success && response.data?.data) {
        const billResponse = response.data.data;
        if (!billResponse.bills || billResponse.bills.length === 0) {
          toast('No pending bills found for this consumer.');
          setBill(null);
          return;
        }
        const latestBill = billResponse.bills[0];
        setBill({
          bill_number:    latestBill.bill_number,
          consumer_number: billResponse.consumer_number || consumerNumber,
          consumer_name:  billResponse.consumer_name || 'Registered Consumer',
          billing_month:  latestBill.billing_period || 'Current Period',
          due_date:       latestBill.due_date,
          units_consumed: parseFloat(latestBill.consumption_units) || 0,
          energy_charges: parseFloat(latestBill.energy_charges) || 0,
          fixed_charges:  parseFloat(latestBill.fixed_charges) || 0,
          taxes:          parseFloat(latestBill.taxes) || 0,
          total_amount:   parseFloat(latestBill.total_amount) || 0,
          status:         latestBill.status || 'unpaid',
        });
        toast.success('Bill fetched successfully!');
      } else {
        toast.error(response.data?.error || 'Bill not found');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Consumer not found. Please check the consumer number.');
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Open Razorpay checkout ───────────────────────────────────────
  const handlePayment = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address to receive the OTP');
      return;
    }
    setLoading(true);
    try {
      // 1. Create Razorpay order on backend
      const orderRes = await api.post('/electricity/payments/create-order-public', {
        consumer_number: bill.consumer_number,
        bill_number:     bill.bill_number,
        email:           email.trim(),
      });

      if (!orderRes.data?.success) {
        toast.error(orderRes.data?.error || 'Could not create payment order');
        return;
      }

      const { order_id, amount, currency, razorpay_key, consumer_name } = orderRes.data.data;

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Check your internet connection.');
        return;
      }

      // 3. Open Razorpay checkout
      const options = {
        key:         razorpay_key,
        amount,
        currency,
        order_id,
        name:        'SUVIDHA - Electricity Dept',
        description: `Bill Payment — ${bill.consumer_number}`,
        prefill: {
          name:  consumer_name,
          email: email.trim(),
        },
        theme: { color: '#1976d2' },
        handler: async (response) => {
          // 4. Verify payment on backend
          try {
            const verifyRes = await api.post('/electricity/payments/verify-public', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              email:               email.trim(),
            });

            if (verifyRes.data?.success) {
              const e = email.trim();
              const [user, domain] = e.split('@');
              setMaskedEmail(`${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 2))}@${domain}`);
              setStep('otp');
              toast.success('Payment done! Check your email for the OTP.');
            } else {
              toast.error(verifyRes.data?.error || 'Payment verification failed');
            }
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.error || 'Verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => toast('Payment cancelled.'),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment initiation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) { toast.error('Please enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await api.post('/electricity/payments/verify-otp-public', {
        otp:             otpValue.trim(),
        consumer_number: bill.consumer_number,
        email:           email.trim(),
      });

      if (res.data?.success) {
        setReceiptData(res.data.data);
        setStep('success');
        toast.success('OTP verified! Payment complete.');
      } else {
        toast.error(res.data?.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Email receipt ────────────────────────────────────────────────────────
  const handleEmailReceipt = async () => {
    setSendingEmail(true);
    try {
      await api.post('/electricity/payments/send-receipt-public', {
        consumer_number: bill.consumer_number,
        email: email.trim(),
      });
      toast.success(`Receipt sent to ${email.trim()}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send receipt email');
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (step === 'success') {
    const dateStr = receiptData?.payment_date
      ? new Date(receiptData.payment_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    return (
      <Box>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
            <Typography variant="h5" color="success.main" fontWeight={700}>Payment Successful!</Typography>
          </Box>

          {/* Receipt card */}
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
            {/* Header */}
            <Box sx={{ background: 'linear-gradient(135deg, #1976d2, #42a5f5)', color: '#fff', px: 3, py: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} letterSpacing={2}>SUVIDHA</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>Electricity Department — Payment Receipt</Typography>
            </Box>

            {/* Details */}
            <Box sx={{ p: 0 }}>
              {[
                ['Receipt No.',         receiptData?.receipt_number  || '—'],
                ['Consumer ID',         bill?.consumer_number         || '—'],
                ['Consumer Name',       receiptData?.consumer_name   || bill?.consumer_name || '—'],
                ['Billing Month',       bill?.billing_month           || '—'],
                ['Amount Paid',         '₹1.00 (Demo)'],
                ['Transaction ID',      receiptData?.transaction_id   || '—'],
                ['Razorpay Payment ID', receiptData?.razorpay_payment_id || '—'],
                ['Date & Time',         dateStr],
                ['Status',              '✓ PAID'],
              ].map(([label, value], i) => (
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    borderBottom: i < 8 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <Box sx={{ width: 160, px: 2, py: 1.2, bgcolor: '#f8f9fa', flexShrink: 0 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} fontSize={12}>{label}</Typography>
                  </Box>
                  <Box sx={{ px: 2, py: 1.2, flex: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={label === 'Status' || label === 'Amount Paid' ? 700 : 400}
                      color={label === 'Status' ? 'success.main' : label === 'Amount Paid' ? 'primary.main' : 'text.primary'}
                      fontSize={label === 'Amount Paid' ? 14 : 13}
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {value}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Footer */}
            <Box sx={{ bgcolor: '#f5f5f5', px: 3, py: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled">
                Computer-generated receipt. No signature required. | SUVIDHA – Smart Utility Kiosk
              </Typography>
            </Box>
          </Box>

          {/* Action buttons */}
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DownloadIcon />}
                onClick={() => printReceipt({ receiptData, bill, email: email.trim() })}
                sx={{ py: 1.2 }}
              >
                Download
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="success"
                fullWidth
                startIcon={sendingEmail ? <CircularProgress size={16} /> : <EmailIcon />}
                onClick={handleEmailReceipt}
                disabled={sendingEmail}
                sx={{ py: 1.2 }}
              >
                {sendingEmail ? 'Sending…' : 'Email Receipt'}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} fullWidth>Close</Button>
        </DialogActions>
      </Box>
    );
  }

  // ── OTP step ─────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <Box>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>Payment Successful via Razorpay</Typography>
            <Typography variant="body2" color="textSecondary">
              An OTP has been sent to <strong>{maskedEmail || 'your registered email'}</strong>
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Enter the 6-digit OTP to confirm and complete your bill payment.
          </Alert>

          <TextField
            fullWidth
            label="Enter OTP"
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, inputMode: 'numeric' }}
            placeholder="6-digit OTP"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={handleVerifyOtp}
            disabled={loading || otpValue.length !== 6}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify OTP & Complete'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">Cancel</Button>
        </DialogActions>
      </Box>
    );
  }

  // ── Bill search / payment screen ─────────────────────────────────────────
  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Enter your Consumer Number to view and pay your electricity bill
        </Alert>

        <TextField
          fullWidth
          label="Consumer Number"
          value={consumerNumber}
          onChange={(e) => setConsumerNumber(e.target.value)}
          placeholder="E.g., E100"
          sx={{ mb: 2 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading}
          fullWidth
          sx={{ mb: 3 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Fetch Bill'}
        </Button>

        {bill && (
          <>
            <Card sx={{ mb: 2, bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">Bill Details</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Consumer Name</Typography>
                    <Typography variant="body1" fontWeight={600}>{bill.consumer_name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Billing Month</Typography>
                    <Typography variant="body1">{bill.billing_month}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Units Consumed</Typography>
                    <Typography variant="body1">{bill.units_consumed} kWh</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Due Date</Typography>
                    <Typography variant="body1" color="error">{bill.due_date}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 1, mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={8}><Typography>Energy Charges</Typography></Grid>
                    <Grid item xs={4} textAlign="right"><Typography>₹{bill.energy_charges.toFixed(2)}</Typography></Grid>
                    <Grid item xs={8}><Typography>Fixed Charges</Typography></Grid>
                    <Grid item xs={4} textAlign="right"><Typography>₹{bill.fixed_charges.toFixed(2)}</Typography></Grid>
                    <Grid item xs={8}><Typography>Taxes</Typography></Grid>
                    <Grid item xs={4} textAlign="right"><Typography>₹{bill.taxes.toFixed(2)}</Typography></Grid>
                  </Grid>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5" color="primary" fontWeight={700}>Total:</Typography>
                  <Typography variant="h4" color="primary" fontWeight={700}>
                    ₹{bill.total_amount.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Alert severity="warning" sx={{ mb: 2 }}>
              Demo mode — Razorpay will charge <strong>₹1</strong> (not the full bill amount)
            </Alert>

            <TextField
              fullWidth
              label="Email Address for OTP & Receipt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your@email.com"
              sx={{ mb: 2 }}
              helperText="An OTP will be sent to this email to confirm payment"
            />

            <Button
              variant="contained"
              color="success"
              fullWidth
              onClick={handlePayment}
              disabled={loading}
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} /> : `Pay via Razorpay (₹1 Demo)`}
            </Button>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Box>
  );
};

export default BillPaymentForm;
