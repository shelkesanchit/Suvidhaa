import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const GasBillPaymentForm = ({ onClose, gasType = 'lpg' }) => {
  const isPNG = gasType === 'png';

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [consumerId, setConsumerId] = useState('');
  const [billData, setBillData] = useState(null);
  const [history, setHistory] = useState([]);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    payer_name: '',
    payer_mobile: '',
    payer_email: '',
    billing_address: '',
    gst_number: '',
    remarks: '',
  });

  const handleFetchBill = async () => {
    if (!consumerId.trim()) {
      toast.error('Enter consumer number');
      return;
    }

    try {
      setLoading(true);
      setPaymentResult(null);
      const response = await api.get(`/gas/bills/fetch/${consumerId.trim().toUpperCase()}`);
      setBillData(response?.data?.data || null);
      toast.success('Bill details fetched');
    } catch (error) {
      setBillData(null);
      toast.error(error?.response?.data?.message || 'Failed to fetch bill');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchHistory = async () => {
    if (!consumerId.trim()) {
      toast.error('Enter consumer number');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/gas/payments/history/${consumerId.trim().toUpperCase()}`);
      setHistory(response?.data?.data || []);
      toast.success('History loaded');
    } catch (error) {
      setHistory([]);
      toast.error(error?.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!billData?.bill) {
      toast.error('No bill selected for payment');
      return;
    }

    if (!paymentDetails.payer_name || !paymentDetails.payer_mobile) {
      toast.error('Payer name and mobile are required');
      return;
    }

    if (!/^\d{10}$/.test(paymentDetails.payer_mobile)) {
      toast.error('Enter valid 10-digit payer mobile number');
      return;
    }

    try {
      setPaying(true);

      const payload = {
        consumer_id: consumerId.trim().toUpperCase(),
        booking_number: billData.bill.booking_number || undefined,
        amount: billData.bill.total_amount || 0,
        payment_method: paymentMethod,
        additional_info: {
          ...paymentDetails,
        },
      };

      const response = await api.post('/gas/payments/process', payload);
      setPaymentResult(response?.data?.data || null);
      toast.success('Payment successful');
      handleFetchBill();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Box>
      <DialogTitle sx={{ px: 3, py: 2, bgcolor: isPNG ? '#eaf2ff' : '#fff1e6', borderBottom: isPNG ? '1px solid #cfe0ff' : '1px solid #ffd9bf', pb: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: isPNG ? '#0f4aa6' : '#b45309' }}>
          {isPNG ? 'PNG Billing & Payments' : 'LPG Billing & Payments'}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: isPNG ? '#2a436f' : '#7c3e0a', fontWeight: 500 }}>
          Check dues, pay online, and view payment history
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            mt: 1,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, color: isPNG ? '#2a436f' : '#7c3e0a' },
            '& .Mui-selected': { color: isPNG ? '#0f4aa6' : '#b45309' },
            '& .MuiTabs-indicator': { bgcolor: isPNG ? '#0f4aa6' : '#b45309' },
          }}
        >
          <Tab label="Pay Bill" />
          <Tab label="Payment History" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, px: 3, pb: 2, minHeight: 500 }}>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              required
              label="Consumer Number *"
              value={consumerId}
              onChange={(e) => setConsumerId(e.target.value.toUpperCase())}
              placeholder={isPNG ? 'PNG2024XXXXXX' : 'GC2024XXXXXX'}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button fullWidth variant="contained" sx={{ height: '56px' }} onClick={tab === 0 ? handleFetchBill : handleFetchHistory} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Fetch'}
            </Button>
          </Grid>
        </Grid>

        {tab === 0 && billData && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Bill Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography color="text.secondary">Name</Typography><Typography>{billData.customer?.full_name || 'N/A'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography color="text.secondary">Consumer ID</Typography><Typography>{billData.customer?.consumer_id || 'N/A'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography color="text.secondary">Status</Typography><Typography>{billData.bill?.status || 'N/A'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography color="text.secondary">Amount</Typography><Typography>₹ {billData.bill?.total_amount || 0}</Typography></Grid>
              {billData.bill?.booking_number && (
                <Grid item xs={12}><Typography color="text.secondary">Booking Number</Typography><Typography>{billData.bill.booking_number}</Typography></Grid>
              )}
            </Grid>

            <Box sx={{ mt: 2 }}>
              <TextField fullWidth select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
              </TextField>
            </Box>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Payer Name *" value={paymentDetails.payer_name} onChange={(e) => setPaymentDetails((p) => ({ ...p, payer_name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Payer Mobile *" value={paymentDetails.payer_mobile} onChange={(e) => setPaymentDetails((p) => ({ ...p, payer_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Payer Email" value={paymentDetails.payer_email} onChange={(e) => setPaymentDetails((p) => ({ ...p, payer_email: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="GST Number" value={paymentDetails.gst_number} onChange={(e) => setPaymentDetails((p) => ({ ...p, gst_number: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Billing Address" value={paymentDetails.billing_address} onChange={(e) => setPaymentDetails((p) => ({ ...p, billing_address: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Remarks" value={paymentDetails.remarks} onChange={(e) => setPaymentDetails((p) => ({ ...p, remarks: e.target.value }))} />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={handlePayNow}
              disabled={paying || Number(billData.bill?.total_amount || 0) <= 0}
            >
              {paying ? <CircularProgress size={22} color="inherit" /> : 'Pay Now'}
            </Button>
          </Paper>
        )}

        {tab === 1 && (
          <Box>
            {history.length === 0 ? (
              <Alert severity="info">No payment history found for this consumer.</Alert>
            ) : (
              <Grid container spacing={1.5}>
                {history.map((item) => (
                  <Grid item xs={12} key={item.transaction_id}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography fontWeight={700}>{item.transaction_id}</Typography>
                      <Typography variant="body2" color="text.secondary">Amount: ₹ {item.amount} | Method: {item.payment_method} | Status: {item.payment_status}</Typography>
                      <Typography variant="body2" color="text.secondary">Receipt: {item.receipt_number || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {paymentResult && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Payment done. Transaction: {paymentResult.transaction_id} | Receipt: {paymentResult.receipt_number}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Box>
  );
};

export default GasBillPaymentForm;
