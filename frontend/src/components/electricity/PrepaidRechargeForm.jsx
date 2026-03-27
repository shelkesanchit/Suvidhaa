import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  IconButton,
} from '@mui/material';
import {
  BoltOutlined,
  CheckCircleOutlined,
  InfoOutlined,
  PaymentOutlined,
  ReceiptLongOutlined,
  CloseOutlined,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PrepaidRechargeForm = ({ onClose }) => {
  const [consumerNumber, setConsumerNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('online');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [rechargeDetails, setRechargeDetails] = useState(null);

  const quickAmounts = [500, 1000, 1500, 2000, 3000, 5000];
  const paymentModes = [
    { value: 'online', label: 'Online Payment (UPI/Card/Net Banking)' },
    { value: 'cash', label: 'Cash at Counter' },
    { value: 'wallet', label: 'Digital Wallet' },
  ];

  const handleRecharge = async () => {
    if (!consumerNumber || !amount || amount < 100) {
      toast.error('Please enter valid consumer number and amount (minimum ₹100)');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/electricity/payments/prepaid-recharge', {
        consumer_number: consumerNumber,
        amount: parseFloat(amount),
        payment_mode: paymentMode,
      });

      const txnId = 'TXN' + Date.now();
      setTransactionId(txnId);
      
      // Calculate estimated units based on actual tariff
      const estimatedUnits = (parseFloat(amount) / 6.42).toFixed(2);
      const processingFee = (parseFloat(amount) * 0.02).toFixed(2); // 2% processing fee
      const netAmount = (parseFloat(amount) - processingFee).toFixed(2);
      
      setRechargeDetails({
        consumer_number: consumerNumber,
        amount: amount,
        processing_fee: processingFee,
        net_amount: netAmount,
        estimated_units: estimatedUnits,
        payment_mode: paymentMode,
        recharge_time: new Date().toLocaleString(),
      });
      
      setSuccess(true);
      toast.success('Recharge successful!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box>
        <DialogContent sx={{ mt: 3 }}>
          {/* Transaction Summary */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'success.lighter', borderRadius: 2, mb: 3 }}>
            <Box textAlign="center">
              <Typography variant="overline" color="text.secondary">
                Transaction ID
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.dark" gutterBottom>
                {transactionId}
              </Typography>
              <Chip label="Payment Confirmed" color="success" sx={{ mt: 1 }} />
            </Box>
          </Paper>

          {/* Recharge Details */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
              Recharge Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Consumer Number</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>{rechargeDetails?.consumer_number}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Recharge Amount</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>₹{rechargeDetails?.amount}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Processing Fee (2%)</TableCell>
                  <TableCell align="right">- ₹{rechargeDetails?.processing_fee}</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                  <TableCell>
                    <Typography fontWeight={700}>Net Amount Credited</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={700} color="primary">₹{rechargeDetails?.net_amount}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2}><Divider sx={{ my: 1 }} /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Estimated Units</TableCell>
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      <BoltOutlined color="warning" fontSize="small" />
                      <Typography fontWeight={600}>{rechargeDetails?.estimated_units} kWh</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Payment Mode</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={paymentModes.find(p => p.value === rechargeDetails?.payment_mode)?.label.split('(')[0].trim()}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Recharge Time</TableCell>
                  <TableCell align="right">{rechargeDetails?.recharge_time}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          {/* Important Information */}
          <Alert severity="info" icon={<InfoOutlined />}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Important Information
            </Typography>
            <Typography variant="body2">
              • Units will be credited to your meter within 5 minutes
              <br />
              • Please check your prepaid meter display for updated balance
              <br />
              • Keep this transaction ID for future reference
              <br />
              • SMS confirmation will be sent to your registered mobile number
            </Typography>
          </Alert>

          <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Note:</strong> Actual units may vary slightly based on applicable taxes and charges. 
              For any queries, contact customer care at 1912 or visit your nearest office with transaction ID.
            </Typography>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
          <Button 
            variant="outlined" 
            startIcon={<ReceiptLongOutlined />}
            onClick={() => window.print()}
          >
            Print Receipt
          </Button>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Box>
    );
  }

  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        {/* Consumer Details */}
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            Consumer Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <TextField
            fullWidth
            label="Prepaid Consumer Number *"
            value={consumerNumber}
            onChange={(e) => setConsumerNumber(e.target.value.toUpperCase())}
            required
            placeholder="EC2026XXXXXX"
            helperText="Enter your 12-digit prepaid consumer number"
            InputProps={{
              startAdornment: <ReceiptLongOutlined sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Paper>

        {/* Recharge Amount */}
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            Recharge Amount
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Quick Recharge Options
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {quickAmounts.map((quickAmount) => (
              <Grid item xs={4} key={quickAmount}>
                <Chip
                  label={`₹${quickAmount}`}
                  onClick={() => setAmount(quickAmount.toString())}
                  color={amount === quickAmount.toString() ? 'primary' : 'default'}
                  sx={{ 
                    width: '100%', 
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    py: 2,
                  }}
                />
              </Grid>
            ))}
          </Grid>

          <TextField
            fullWidth
            label="Custom Amount (₹) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            inputProps={{ min: '100', step: '50' }}
            helperText="Minimum recharge amount: ₹100"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>,
            }}
          />

          {amount && amount >= 100 && (
            <Card sx={{ mt: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.light' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Recharge Amount
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      ₹{amount}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Processing Fee (2%)
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="error">
                      - ₹{(parseFloat(amount) * 0.02).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Net Amount
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      ₹{(parseFloat(amount) - (parseFloat(amount) * 0.02)).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Estimated Units
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <BoltOutlined color="warning" fontSize="small" />
                      <Typography variant="h6" fontWeight={700} color="warning.main">
                        {((parseFloat(amount) - (parseFloat(amount) * 0.02)) / 6.42).toFixed(2)} kWh
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  * Based on average tariff of ₹6.42/unit. Actual units may vary based on your category and applicable charges.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Payment Mode */}
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            Payment Mode
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            {paymentModes.map((mode) => (
              <Grid item xs={12} key={mode.value}>
                <Card
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: paymentMode === mode.value ? 'primary.main' : 'divider',
                    bgcolor: paymentMode === mode.value ? 'primary.lighter' : 'background.paper',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter' },
                  }}
                  onClick={() => setPaymentMode(mode.value)}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <PaymentOutlined color={paymentMode === mode.value ? 'primary' : 'action'} />
                    <Typography variant="body1" fontWeight={paymentMode === mode.value ? 600 : 400}>
                      {mode.label}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Benefits */}
        <Alert severity="success" icon={<CheckCircleOutlined />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Prepaid Meter Benefits
          </Typography>
          <Typography variant="body2">
            ✓ Instant credit to your meter
            <br />
            ✓ No late payment charges or penalties
            <br />
            ✓ Better control over electricity usage
            <br />
            ✓ No security deposit required
            <br />
            ✓ Pay only for what you use
          </Typography>
        </Alert>

        <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Important:</strong> Please ensure your prepaid meter is in working condition. 
            Units will be credited within 5 minutes of successful payment. Keep your transaction ID safe for future reference.
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading || !consumerNumber || !amount || amount < 100}
          startIcon={loading ? <CircularProgress size={20} /> : <PaymentOutlined />}
          onClick={handleRecharge}
          size="large"
        >
          {loading ? 'Processing...' : `Pay ₹${amount || '0'}`}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default PrepaidRechargeForm;
