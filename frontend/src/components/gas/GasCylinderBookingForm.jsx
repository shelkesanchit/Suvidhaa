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
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const GasCylinderBookingForm = ({ onClose }) => {
  const [loadingConsumer, setLoadingConsumer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');

  const [formData, setFormData] = useState({
    mobile: '',
    consumer_number: '',
    email: '',
    cylinder_type: 'domestic_14.2kg',
    quantity: 1,
    delivery_preference: 'home_delivery',
    preferred_slot: 'anytime',
  });

  const [consumer, setConsumer] = useState(null);

  const handleLookupByMobile = async () => {
    if (!/^\d{10}$/.test(formData.mobile)) {
      toast.error('Enter valid 10-digit mobile number');
      return;
    }

    try {
      setLoadingConsumer(true);
      const response = await api.get(`/gas/applications/consumer-by-mobile/${formData.mobile}`);
      const consumerData = response?.data?.data;
      setConsumer(consumerData || null);
      if (consumerData?.consumer_number) {
        setFormData((prev) => ({
          ...prev,
          consumer_number: consumerData.consumer_number,
        }));
      }
      toast.success('Consumer details loaded');
    } catch (error) {
      setConsumer(null);
      toast.error(error?.response?.data?.message || 'Consumer not found');
    } finally {
      setLoadingConsumer(false);
    }
  };

  const validateForm = () => {
    if (!/^\d{10}$/.test(formData.mobile)) {
      toast.error('Enter valid 10-digit mobile number');
      return false;
    }
    if (!formData.consumer_number) {
      toast.error('Enter consumer number to proceed');
      return false;
    }
    return true;
  };

  const handleSubmitClick = () => {
    if (!validateForm()) return;
    setOtpDialogOpen(true);
  };

  const handleSubmitAfterOtp = async (email) => {
    setOtpDialogOpen(false);
    setVerifiedEmail(email);

    try {
      setSubmitting(true);

      const payload = {
        consumer_number: formData.consumer_number,
        mobile: formData.mobile,
        email,
        cylinder_type: formData.cylinder_type,
        quantity: Number(formData.quantity) || 1,
        delivery_preference: formData.delivery_preference,
        additional_info: {
          preferred_slot: formData.preferred_slot,
        },
      };

      const response = await api.post('/gas/applications/cylinder-booking', payload);
      const bookingNo = response?.data?.data?.booking_number;
      if (!bookingNo) throw new Error('Booking number not received');

      const now = new Date().toISOString();
      setBookingNumber(bookingNo);
      setSubmittedAt(now);
      setReceiptOpen(true);
      toast.success('Cylinder booked successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to book cylinder');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <DialogTitle sx={{ px: 3, py: 2, bgcolor: '#fff0f5', borderBottom: '1px solid #ffd0e1', pb: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#ad1457' }}>Book LPG Refill</Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: '#7a204f', fontWeight: 500 }}>
          Quick booking with only essential details
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, px: 3, pb: 2, minHeight: 500 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={8}><TextField fullWidth required label="Registered Mobile Number *" value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} /></Grid>
          <Grid item xs={12} sm={4}><Button fullWidth variant="outlined" sx={{ height: '56px' }} onClick={handleLookupByMobile} disabled={loadingConsumer}>{loadingConsumer ? <CircularProgress size={22} color="inherit" /> : 'Verify'}</Button></Grid>
          <Grid item xs={12}><TextField fullWidth required label="Consumer Number *" value={formData.consumer_number} onChange={(e) => setFormData((p) => ({ ...p, consumer_number: e.target.value.toUpperCase() }))} /></Grid>
          {consumer && <Grid item xs={12}><Alert severity="success">Verified: {consumer.full_name} ({consumer.consumer_number})</Alert></Grid>}

          <Grid item xs={12}><TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="For booking receipt" /></Grid>

          <Grid item xs={12} sm={6}><TextField fullWidth select required label="Cylinder Type *" value={formData.cylinder_type} onChange={(e) => setFormData((p) => ({ ...p, cylinder_type: e.target.value }))}><MenuItem value="domestic_14.2kg">Domestic 14.2 KG</MenuItem><MenuItem value="domestic_5kg">Domestic 5 KG</MenuItem><MenuItem value="commercial_19kg">Commercial 19 KG</MenuItem><MenuItem value="commercial_47.5kg">Commercial 47.5 KG</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth required type="number" label="Quantity *" value={formData.quantity} inputProps={{ min: 1, max: 2 }} onChange={(e) => setFormData((p) => ({ ...p, quantity: Math.max(1, Math.min(2, Number(e.target.value) || 1)) }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select required label="Delivery Preference *" value={formData.delivery_preference} onChange={(e) => setFormData((p) => ({ ...p, delivery_preference: e.target.value }))}><MenuItem value="home_delivery">Home Delivery</MenuItem><MenuItem value="self_pickup">Self Pickup</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Preferred Slot" value={formData.preferred_slot} onChange={(e) => setFormData((p) => ({ ...p, preferred_slot: e.target.value }))}><MenuItem value="anytime">Anytime</MenuItem><MenuItem value="morning">Morning</MenuItem><MenuItem value="afternoon">Afternoon</MenuItem><MenuItem value="evening">Evening</MenuItem></TextField></Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button variant="contained" onClick={handleSubmitClick} disabled={submitting}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : 'Book Refill'}
        </Button>
      </DialogActions>

      <EmailOtpVerification
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        onVerified={handleSubmitAfterOtp}
        initialEmail={formData.email}
        title="Verify Email to Confirm Booking"
      />

      <ApplicationReceipt
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); onClose(); }}
        applicationNumber={bookingNumber}
        applicationType="cylinder_booking"
        formData={{ ...formData, email: verifiedEmail }}
        email={verifiedEmail}
        submittedAt={submittedAt}
      />
    </Box>
  );
};

export default GasCylinderBookingForm;
