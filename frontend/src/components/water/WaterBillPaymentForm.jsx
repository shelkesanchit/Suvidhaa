import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Receipt,
  CreditCard,
  QrCode2,
  AccountBalance,
  Money,
  History as HistoryIcon,
  LocalShipping as TankerIcon,
  Opacity as SewerIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import EmailOtpVerification from './EmailOtpVerification';

const paymentMethods = [
  { value: 'upi', label: 'UPI', icon: <QrCode2 /> },
  { value: 'card', label: 'Credit/Debit Card', icon: <CreditCard /> },
  { value: 'netbanking', label: 'Net Banking', icon: <AccountBalance /> },
  { value: 'cash', label: 'Cash at Counter', icon: <Money /> },
];

const WaterBillPaymentForm = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [pendingPaymentType, setPendingPaymentType] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [tankerConsumerNo, setTankerConsumerNo] = useState('');
  const [tankerBill, setTankerBill] = useState(null);
  const [tankerLoading, setTankerLoading] = useState(false);
  const [tankerPaymentSuccess, setTankerPaymentSuccess] = useState(false);
  const [billHistory, setBillHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formData, setFormData] = useState({
    consumer_number: '',
    mobile: '',
    payment_method: 'upi',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const fetchBill = async () => {
    if (!formData.consumer_number) {
      toast.error('Please enter Consumer Number (CCN)');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`/water/bills/fetch?consumer_number=${formData.consumer_number}`);
      const { consumer, bill } = response.data.data;
      const combined = {
        consumer_number: consumer.consumer_number,
        consumer_name: consumer.full_name,
        address: consumer.address,
        connection_type: consumer.category,
        meter_no: consumer.meter_number || 'N/A',
        bill_number: bill.bill_number,
        bill_month: bill.bill_month,
        due_date: bill.due_date,
        previous_reading: bill.previous_reading,
        current_reading: bill.current_reading,
        consumption_kl: bill.consumption_kl,
        water_charges: parseFloat(bill.water_charges),
        sewerage_charges: parseFloat(bill.sewerage_charges),
        service_tax: parseFloat(bill.service_tax),
        arrears: parseFloat(bill.arrears || 0),
        late_fee: parseFloat(bill.late_fee || 0),
        total_amount: parseFloat(bill.total_amount),
        status: bill.status,
      };
      setBillData(combined);
      setStep(2);
      toast.success('Bill fetched successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to fetch bill. Please check the consumer number.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (email) => {
    setLoading(true);
    try {
      const response = await api.post('/water/payments/process', {
        consumer_number: billData.consumer_number,
        bill_number: billData.bill_number || null,
        amount: billData.total_amount,
        payment_method: formData.payment_method,
        mobile: formData.mobile,
        email,
      });
      const { transaction_id, receipt_number } = response.data.data;
      setTransactionId(transaction_id);
      setReceiptNumber(receipt_number);
      setVerifiedEmail(email);
      setPaymentSuccess(true);
      toast.success('Payment successful!');

      api.post('/water/otp/send-receipt', {
        email,
        application_number: receipt_number || transaction_id,
        application_type: 'bill_payment',
        application_data: {
          consumer_number: billData.consumer_number,
          bill_number: billData.bill_number || null,
          bill_month: billData.bill_month,
          amount: billData.total_amount,
          payment_method: formData.payment_method,
          transaction_id,
          receipt_number,
          charge_type: activeTab === 1 ? 'sewerage' : 'water',
        },
        submitted_at: new Date().toISOString(),
      }).catch(() => {
        toast.error('Payment completed, but receipt email could not be sent.');
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Payment failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTankerBill = async () => {
    if (!tankerConsumerNo) {
      toast.error('Please enter Consumer Number');
      return;
    }
    setTankerLoading(true);
    try {
      const response = await api.get(`/water/bills/fetch?consumer_number=${tankerConsumerNo}`);
      const { consumer, bill } = response.data.data;
      setTankerBill({
        consumer_number: tankerConsumerNo,
        consumer_name: consumer.full_name,
        bill_number: bill.bill_number,
        tanker_deliveries: [
          { date: bill.bill_month, volume_kl: bill.consumption_kl, rate_per_kl: 120, amount: parseFloat(bill.total_amount), status: bill.status === 'paid' ? 'Paid' : 'Unpaid' }
        ],
        total_unpaid: bill.status === 'paid' ? 0 : parseFloat(bill.total_amount),
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Consumer not found.';
      toast.error(msg);
    } finally {
      setTankerLoading(false);
    }
  };

  const handleTankerPayment = async (email) => {
    setTankerLoading(true);
    try {
      const response = await api.post('/water/payments/process', {
        consumer_number: tankerConsumerNo,
        bill_number: tankerBill.bill_number || null,
        amount: tankerBill.total_unpaid,
        payment_method: 'upi',
        email,
      });
      const transactionId = response.data?.data?.transaction_id || `TKR${Date.now()}`;
      const receiptNo = response.data?.data?.receipt_number || transactionId;
      setVerifiedEmail(email);
      setTankerPaymentSuccess(true);
      toast.success('Tanker charges paid successfully!');

      api.post('/water/otp/send-receipt', {
        email,
        application_number: receiptNo,
        application_type: 'bill_payment',
        application_data: {
          consumer_number: tankerConsumerNo,
          bill_number: tankerBill.bill_number || null,
          amount: tankerBill.total_unpaid,
          payment_method: 'upi',
          transaction_id: transactionId,
          receipt_number: receiptNo,
          charge_type: 'tanker',
        },
        submitted_at: new Date().toISOString(),
      }).catch(() => {
        toast.error('Payment completed, but receipt email could not be sent.');
      });
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setTankerLoading(false);
    }
  };

  const handlePayWithOtp = () => {
    if (!billData) {
      toast.error('Please fetch bill details first.');
      return;
    }
    setPendingPaymentType('bill');
    setShowOtpDialog(true);
  };

  const handleTankerPayWithOtp = () => {
    if (!tankerBill) {
      toast.error('Please fetch tanker dues first.');
      return;
    }
    if (!tankerBill.total_unpaid || tankerBill.total_unpaid <= 0) {
      toast.error('No unpaid tanker dues found.');
      return;
    }
    setPendingPaymentType('tanker');
    setShowOtpDialog(true);
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    if (pendingPaymentType === 'bill') {
      handlePayment(email);
    }
    if (pendingPaymentType === 'tanker') {
      handleTankerPayment(email);
    }
    setPendingPaymentType('');
  };

  if (paymentSuccess) {
    return (
      <Box>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" color="success.main" gutterBottom>Payment Successful!</Typography>
          <Chip label={`Txn: ${transactionId}`} color="primary" sx={{ fontSize: '1.1rem', py: 2, px: 3, mb: 2 }} />
          {receiptNumber && <Chip label={`Receipt: ${receiptNumber}`} color="success" sx={{ fontSize: '1rem', py: 2, px: 3, mb: 3, ml: 1 }} />}
          <Box sx={{ bgcolor: '#e8f5e9', p: 3, borderRadius: 2 }}>
            <Typography variant="body1" gutterBottom><strong>Consumer Number:</strong> {billData?.consumer_number}</Typography>
            <Typography variant="body1" gutterBottom><strong>Amount Paid:</strong> ₹{billData?.total_amount?.toFixed(2)}</Typography>
            <Typography variant="body1" gutterBottom><strong>Bill Month:</strong> {billData?.bill_month}</Typography>
            <Typography variant="body1"><strong>Payment Method:</strong> {paymentMethods.find(m => m.value === formData.payment_method)?.label}</Typography>
            <Typography variant="body1"><strong>Email:</strong> {verifiedEmail}</Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            Receipt sent to registered mobile • Payment updated within 24 hours • Helpline: 1916
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} fullWidth>Close</Button>
        </DialogActions>
      </Box>
    );
  }

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(e, val) => { setActiveTab(val); setStep(1); setBillData(null); }}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Receipt />} label="Pay Water Bill" iconPosition="start" />
        <Tab icon={<SewerIcon />} label="Sewerage Charges" iconPosition="start" />
        <Tab icon={<HistoryIcon />} label="Consumption History" iconPosition="start" />
        <Tab icon={<TankerIcon />} label="Tanker Charges" iconPosition="start" />
      </Tabs>

      <DialogContent sx={{ mt: 1 }}>
        {/* Tab 0: Pay Water Bill */}
        {activeTab === 0 && (
          <Box>
            {step === 1 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>Enter your Consumer Number (CCN / RR Number) to view bill</Alert>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField fullWidth required label="Consumer Number (CCN) *" name="consumer_number"
                      value={formData.consumer_number} onChange={handleChange}
                      placeholder="E.g., WTR2024001234"
                      helperText="Consumer Number is printed on your water bill" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Mobile Number (for receipt)" name="mobile"
                      value={formData.mobile} onChange={handleChange}
                      placeholder="10-digit mobile" inputProps={{ maxLength: 10 }} />
                  </Grid>
                </Grid>
              </Box>
            )}
            {step === 2 && billData && (
              <Box>
                <Card sx={{ mb: 3, bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} /> Consumer Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Consumer Number</Typography><Typography fontWeight={600}>{billData.consumer_number}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Consumer Name</Typography><Typography fontWeight={600}>{billData.consumer_name}</Typography></Grid>
                      <Grid item xs={12}><Typography variant="body2" color="textSecondary">Address</Typography><Typography>{billData.address}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Connection Type</Typography><Typography>{billData.connection_type}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Meter No</Typography><Typography>{billData.meter_no}</Typography></Grid>
                    </Grid>
                  </CardContent>
                </Card>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">Bill Details - {billData.bill_month}</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Previous Reading</Typography><Typography>{billData.previous_reading} KL</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Current Reading</Typography><Typography>{billData.current_reading} KL</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Consumption</Typography><Typography>{billData.consumption_kl} KL</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Due Date</Typography><Typography color="error">{billData.due_date}</Typography></Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 1 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={8}><Typography>Water Charges</Typography></Grid>
                        <Grid item xs={4} textAlign="right"><Typography>₹{billData.water_charges.toFixed(2)}</Typography></Grid>
                        <Grid item xs={8}><Typography>Sewerage Charges</Typography></Grid>
                        <Grid item xs={4} textAlign="right"><Typography>₹{billData.sewerage_charges.toFixed(2)}</Typography></Grid>
                        <Grid item xs={8}><Typography>Service Tax</Typography></Grid>
                        <Grid item xs={4} textAlign="right"><Typography>₹{billData.service_tax.toFixed(2)}</Typography></Grid>
                      </Grid>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h5" color="primary" fontWeight={700}>Total Amount:</Typography>
                      <Typography variant="h4" color="primary" fontWeight={700}>₹{billData.total_amount.toFixed(2)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel><Typography variant="h6" color="primary">Select Payment Method</Typography></FormLabel>
                      <RadioGroup name="payment_method" value={formData.payment_method} onChange={handleChange}>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          {paymentMethods.map((method) => (
                            <Grid item xs={6} key={method.value}>
                              <Box sx={{ border: formData.payment_method === method.value ? '2px solid #4facfe' : '1px solid #e0e0e0', borderRadius: 2, p: 2, cursor: 'pointer', bgcolor: formData.payment_method === method.value ? '#e3f2fd' : 'white', '&:hover': { borderColor: '#4facfe' } }}
                                onClick={() => setFormData({ ...formData, payment_method: method.value })}>
                                <FormControlLabel value={method.value} control={<Radio />}
                                  label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{method.icon}<Typography>{method.label}</Typography></Box>} />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 1: Sewerage Charges */}
        {activeTab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Sewerage / drainage charges are levied separately for properties connected to the municipal sewer network.
            </Alert>
            {step === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField fullWidth required label="Consumer Number (CCN) *" name="consumer_number"
                    value={formData.consumer_number} onChange={handleChange} placeholder="E.g., WTR2024001234" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleChange} inputProps={{ maxLength: 10 }} />
                </Grid>
              </Grid>
            )}
            {step === 2 && billData && (
              <Box>
                <Card sx={{ mb: 3, bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>Sewerage Charge Breakup</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Consumer</Typography><Typography fontWeight={600}>{billData.consumer_name}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Sewer Connection</Typography><Typography>Yes — Active</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Month</Typography><Typography>{billData.bill_month}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Due Date</Typography><Typography color="error">{billData.due_date}</Typography></Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 1 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={8}><Typography>Sewerage Connection Charge</Typography></Grid>
                        <Grid item xs={4} textAlign="right"><Typography>₹60.00</Typography></Grid>
                        <Grid item xs={8}><Typography>Drainage Maintenance</Typography></Grid>
                        <Grid item xs={4} textAlign="right"><Typography>₹15.00</Typography></Grid>
                        <Grid item xs={8}><Typography>GST (5%)</Typography></Grid>
                        <Grid item xs={4} textAlign="right"><Typography>₹3.75</Typography></Grid>
                      </Grid>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h5" color="primary" fontWeight={700}>Total:</Typography>
                      <Typography variant="h4" color="primary" fontWeight={700}>₹78.75</Typography>
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel><Typography variant="h6" color="primary">Select Payment Method</Typography></FormLabel>
                      <RadioGroup name="payment_method" value={formData.payment_method} onChange={handleChange}>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          {paymentMethods.map((method) => (
                            <Grid item xs={6} key={method.value}>
                              <Box sx={{ border: formData.payment_method === method.value ? '2px solid #4caf50' : '1px solid #e0e0e0', borderRadius: 2, p: 2, cursor: 'pointer', bgcolor: formData.payment_method === method.value ? '#e8f5e9' : 'white', '&:hover': { borderColor: '#4caf50' } }}
                                onClick={() => setFormData({ ...formData, payment_method: method.value })}>
                                <FormControlLabel value={method.value} control={<Radio />}
                                  label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{method.icon}<Typography>{method.label}</Typography></Box>} />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Consumption History */}
        {activeTab === 2 && (
          <Box>
            {step === 1 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>Enter your Consumer Number to view bill history</Alert>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField fullWidth required label="Consumer Number (CCN) *" name="consumer_number"
                      value={formData.consumer_number} onChange={handleChange} placeholder="E.g., WTR2024001234" />
                  </Grid>
                </Grid>
              </Box>
            )}
            {step === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">Bill History</Typography>
                {historyLoading ? (
                  <Box textAlign="center" py={4}><CircularProgress /></Box>
                ) : billHistory.length === 0 ? (
                  <Alert severity="info">No bill history found for this consumer.</Alert>
                ) : (
                  <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#e3f2fd' }}>
                        <TableRow>
                          <TableCell><strong>Month</strong></TableCell>
                          <TableCell align="right"><strong>Consumption (KL)</strong></TableCell>
                          <TableCell align="right"><strong>Amount</strong></TableCell>
                          <TableCell><strong>Due Date</strong></TableCell>
                          <TableCell align="center"><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {billHistory.map((row, i) => (
                          <TableRow key={i} hover>
                            <TableCell>{row.bill_month}</TableCell>
                            <TableCell align="right">{row.consumption_kl} KL</TableCell>
                            <TableCell align="right">₹{parseFloat(row.total_amount).toFixed(2)}</TableCell>
                            <TableCell>{row.due_date || '—'}</TableCell>
                            <TableCell align="center">
                              <Chip label={row.status} size="small"
                                color={row.status === 'paid' ? 'success' : row.status === 'overdue' ? 'error' : 'warning'}
                                variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Tab 3: Tanker Water Charges */}
        {activeTab === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>Pay charges for municipal water tanker deliveries to your property</Alert>
            {!tankerBill && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField fullWidth required label="Consumer Number (CCN) *"
                    value={tankerConsumerNo} onChange={(e) => setTankerConsumerNo(e.target.value)}
                    placeholder="E.g., WTR2024001234" />
                </Grid>
              </Grid>
            )}
            {tankerBill && !tankerPaymentSuccess && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">Tanker Delivery Summary — {tankerBill.consumer_name}</Typography>
                <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#fff3e0' }}>
                      <TableRow>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell align="right"><strong>Volume (KL)</strong></TableCell>
                        <TableCell align="right"><strong>Rate/KL</strong></TableCell>
                        <TableCell align="right"><strong>Amount</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tankerBill.tanker_deliveries.map((row, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{row.date}</TableCell>
                          <TableCell align="right">{row.volume_kl}</TableCell>
                          <TableCell align="right">₹{row.rate_per_kl}</TableCell>
                          <TableCell align="right">₹{row.amount}</TableCell>
                          <TableCell align="center">
                            <Chip label={row.status} size="small" color={row.status === 'Paid' ? 'success' : 'warning'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                  <Typography variant="h5" color="warning.dark" fontWeight={700}>Total Unpaid:</Typography>
                  <Typography variant="h4" color="warning.dark" fontWeight={700}>₹{tankerBill.total_unpaid}</Typography>
                </Box>
              </Box>
            )}
            {tankerPaymentSuccess && (
              <Box textAlign="center" py={3}>
                <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" color="success.main">Tanker Charges Paid!</Typography>
                <Typography variant="body1" mt={1}>Transaction ID: TKR{Date.now()}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        {/* Tab 0 actions */}
        {activeTab === 0 && step === 1 && (
          <Button variant="contained" onClick={fetchBill} disabled={loading}
            sx={{ bgcolor: '#4facfe', '&:hover': { bgcolor: '#0288d1' } }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Fetch Bill'}
          </Button>
        )}
        {activeTab === 0 && step === 2 && (
          <>
            <Button variant="outlined" onClick={() => setStep(1)}>Back</Button>
            <Button variant="contained" onClick={handlePayWithOtp} disabled={loading}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : `Pay ₹${billData?.total_amount?.toFixed(2)}`}
            </Button>
          </>
        )}
        {/* Tab 1 actions */}
        {activeTab === 1 && step === 1 && (
          <Button variant="contained" onClick={fetchBill} disabled={loading}
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Fetch Sewerage Bill'}
          </Button>
        )}
        {activeTab === 1 && step === 2 && (
          <>
            <Button variant="outlined" onClick={() => setStep(1)}>Back</Button>
            <Button variant="contained" onClick={handlePayWithOtp} disabled={loading}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Pay ₹78.75'}
            </Button>
          </>
        )}
        {/* Tab 2 actions */}
        {activeTab === 2 && step === 1 && (
          <Button variant="contained" onClick={async () => {
            if (!formData.consumer_number) { toast.error('Enter CCN'); return; }
            setHistoryLoading(true);
            setStep(2);
            try {
              const res = await api.get(`/water/bills/history?consumer_number=${formData.consumer_number}`);
              setBillHistory(res.data.data || []);
            } catch {
              toast.error('Failed to load bill history');
              setBillHistory([]);
            } finally {
              setHistoryLoading(false);
            }
          }}
            sx={{ bgcolor: '#1976d2' }}>
            View History
          </Button>
        )}
        {activeTab === 2 && step === 2 && (
          <Button variant="outlined" onClick={() => setStep(1)}>Back</Button>
        )}
        {/* Tab 3 actions */}
        {activeTab === 3 && !tankerBill && !tankerPaymentSuccess && (
          <Button variant="contained" onClick={fetchTankerBill} disabled={tankerLoading}
            sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}>
            {tankerLoading ? <CircularProgress size={24} color="inherit" /> : 'Fetch Tanker Dues'}
          </Button>
        )}
        {activeTab === 3 && tankerBill && !tankerPaymentSuccess && (
          <>
            <Button variant="outlined" onClick={() => setTankerBill(null)}>Back</Button>
            <Button variant="contained" onClick={handleTankerPayWithOtp} disabled={tankerLoading}
              sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}>
              {tankerLoading ? <CircularProgress size={24} color="inherit" /> : `Pay ₹${tankerBill.total_unpaid}`}
            </Button>
          </>
        )}
      </DialogActions>

      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => {
          setShowOtpDialog(false);
          setPendingPaymentType('');
        }}
        onVerified={handleOtpVerified}
        initialEmail={formData.email || ''}
        title={pendingPaymentType === 'tanker' ? 'Confirm Tanker Payment via OTP' : 'Confirm Bill Payment via OTP'}
      />
    </Box>
  );
};

export default WaterBillPaymentForm;
