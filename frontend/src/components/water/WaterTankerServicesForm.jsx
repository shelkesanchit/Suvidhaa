import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Divider,
} from '@mui/material';
import EmailOtpVerification from './EmailOtpVerification';
import {
  CheckCircle as SuccessIcon,
  ReportProblem as EmergencyIcon,
  LocalShipping as TankerIcon,
  Recycling as RecycleIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const tankerServices = [
  {
    id: 'emergency',
    title: 'Emergency Water Tanker',
    description: 'Urgent supply during crisis — delivered same day or within 24 hours',
    icon: EmergencyIcon,
    color: '#c62828',
    badge: 'URGENT',
  },
  {
    id: 'bulk_supply',
    title: 'Bulk Water Supply',
    description: 'Pre-scheduled bulk supply for construction, events, or institutions',
    icon: TankerIcon,
    color: '#1565c0',
    badge: null,
  },
  {
    id: 'recycled_water',
    title: 'Treated / Recycled Water',
    description: 'Secondary treated water for gardening, construction, or industrial use',
    icon: RecycleIcon,
    color: '#2e7d32',
    badge: 'ECO',
  },
];

const wardOptions = [
  'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5',
  'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10',
];

const WaterTankerServicesForm = ({ onClose }) => {
  const [selectedService, setSelectedService] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    address: '',
    ward: '',
    // emergency
    emergency_reason: '',
    // bulk supply
    organization_name: '',
    volume_kl: '',
    supply_date: '',
    duration_days: '',
    purpose: '',
    // recycled
    consumer_number: '',
    recycled_purpose: '',
    recycled_volume_kl: '',
    delivery_address: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.mobile || formData.mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile number');
      return false;
    }
    if (!formData.full_name) {
      toast.error('Please enter Full Name');
      return false;
    }
    if (selectedService !== 'recycled_water' && (!formData.address || !formData.ward)) {
      toast.error('Please fill Address and Ward');
      return false;
    }
    if (selectedService === 'bulk_supply' && !formData.volume_kl) {
      toast.error('Please enter volume required');
      return false;
    }
    if (selectedService === 'recycled_water') {
      if (!formData.consumer_number) {
        toast.error('Please enter Consumer Number');
        return false;
      }
      if (!formData.recycled_volume_kl) {
        toast.error('Please enter Volume Required');
        return false;
      }
      if (!formData.recycled_purpose) {
        toast.error('Please select Purpose');
        return false;
      }
      if (!formData.delivery_address) {
        toast.error('Please enter Delivery Address');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (email) => {

    setSubmitting(true);
    try {
      const applicationData = { service_type: selectedService, email, ...formData };
      const response = await api.post('/water/applications/submit', {
        application_type: 'tanker_service',
        application_data: applicationData,
      });
      const num = response.data?.data?.application_number || ('WTK' + Date.now());
      setBookingNumber(num);
      setVerifiedEmail(email);
      setSubmitted(true);
      toast.success('Tanker booking confirmed!');

      api.post('/water/otp/send-receipt', {
        email,
        application_number: num,
        application_type: 'tanker_service',
        application_data: applicationData,
        submitted_at: new Date().toISOString(),
      }).catch(() => {
        toast.error('Booking saved, but receipt email could not be sent.');
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to book tanker. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWithOtp = () => {
    if (!validateForm()) {
      return;
    }
    setShowOtpDialog(true);
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    handleSubmit(email);
  };

  if (submitted) {
    const service = tankerServices.find(s => s.id === selectedService);
    return (
      <Box>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" color="success.main" gutterBottom>Booking Confirmed!</Typography>
          <Typography variant="h6" gutterBottom>Booking Reference:</Typography>
          <Chip label={bookingNumber} color="primary" sx={{ fontSize: '1.2rem', py: 2, px: 3, mb: 3 }} />
          <Box sx={{ bgcolor: '#e1f5fe', p: 3, borderRadius: 2, textAlign: 'left' }}>
            <Typography variant="body1" gutterBottom><strong>Service:</strong> {service?.title}</Typography>
            {formData.full_name && <Typography variant="body1" gutterBottom><strong>Name:</strong> {formData.full_name}</Typography>}
            <Typography variant="body1" gutterBottom><strong>Mobile:</strong> {formData.mobile}</Typography>
            {formData.ward && <Typography variant="body1"><strong>Ward:</strong> {formData.ward}</Typography>}
            <Typography variant="body1"><strong>Email:</strong> {verifiedEmail}</Typography>
          </Box>
          <Alert severity={selectedService === 'emergency' ? 'warning' : 'info'} sx={{ mt: 3, textAlign: 'left' }}>
            {selectedService === 'emergency'
              ? 'Emergency tanker will be dispatched within 24 hours. You will receive an SMS confirmation.'
              : selectedService === 'bulk_supply'
              ? 'Bulk supply will be scheduled as requested. Payment to be made at time of delivery. Advance 50% may be required.'
              : 'Recycled water delivery will be scheduled. Suitable only for non-potable use.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} fullWidth sx={{ bgcolor: '#0277bd' }}>Close</Button>
        </DialogActions>
      </Box>
    );
  }

  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        {!selectedService && (
          <Box>
            <Typography variant="h6" color="primary" gutterBottom>Select Tanker Service</Typography>
            <Grid container spacing={2}>
              {tankerServices.map((service) => (
                <Grid item xs={12} key={service.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: `1px solid ${service.color}40`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedService(service.id)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${service.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <service.icon sx={{ color: service.color }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600} color={service.color}>{service.title}</Typography>
                              {service.badge && <Chip label={service.badge} size="small" sx={{ bgcolor: service.color, color: 'white', fontSize: '0.65rem' }} />}
                            </Box>
                            <Typography variant="body2" color="text.secondary">{service.description}</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {selectedService && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Button variant="outlined" size="small" onClick={() => setSelectedService(null)}>← Back</Button>
              <Typography variant="h6" color="primary">
                {tankerServices.find(s => s.id === selectedService)?.title}
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            {/* Emergency Tanker */}
            {selectedService === 'emergency' && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="error" icon={<EmergencyIcon />}>
                    For life-threatening emergencies, also call 1916 immediately. This form is for record and dispatch tracking.
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Full Name *" name="full_name"
                    value={formData.full_name} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Mobile Number *" name="mobile"
                    value={formData.mobile} onChange={handleChange} inputProps={{ maxLength: 10 }} />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField fullWidth required label="Delivery Address *" name="address"
                    value={formData.address} onChange={handleChange} multiline rows={2} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required label="Ward *" name="ward"
                    value={formData.ward} onChange={handleChange}
                    placeholder="Enter ward number/name" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Reason for Emergency" name="emergency_reason"
                    value={formData.emergency_reason} onChange={handleChange}
                    placeholder="E.g., main pipeline burst, area without supply for 3 days"
                    multiline rows={2} />
                </Grid>
              </Grid>
            )}

            {/* Bulk Supply */}
            {selectedService === 'bulk_supply' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Contact Name *" name="full_name"
                    value={formData.full_name} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Mobile Number *" name="mobile"
                    value={formData.mobile} onChange={handleChange} inputProps={{ maxLength: 10 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Organisation / Company Name" name="organization_name"
                    value={formData.organization_name} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Ward *" name="ward"
                    value={formData.ward} onChange={handleChange}
                    placeholder="Enter ward number/name" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required label="Volume Required (KL) *" name="volume_kl"
                    value={formData.volume_kl} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Preferred Supply Date" name="supply_date"
                    value={formData.supply_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Duration (days)" name="duration_days"
                    value={formData.duration_days} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField fullWidth required label="Delivery Address *" name="address"
                    value={formData.address} onChange={handleChange} multiline rows={2} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth select label="Purpose" name="purpose"
                    value={formData.purpose} onChange={handleChange}>
                    <MenuItem value="construction">Construction</MenuItem>
                    <MenuItem value="event">Event / Function</MenuItem>
                    <MenuItem value="institution">Institutional Use</MenuItem>
                    <MenuItem value="industrial">Industrial</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">Rate: ₹500 per KL for potable water. 50% advance payment required. Cash / UPI accepted at delivery.</Alert>
                </Grid>
              </Grid>
            )}

            {/* Recycled Water */}
            {selectedService === 'recycled_water' && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="success">Treated secondary water is available at subsidised rates of ₹150/KL. Suitable for irrigation, construction, and industrial washing — NOT for drinking.</Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Full Name *" name="full_name"
                    value={formData.full_name} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Mobile Number *" name="mobile"
                    value={formData.mobile} onChange={handleChange} inputProps={{ maxLength: 10 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Consumer Number (CCN) *" name="consumer_number"
                    value={formData.consumer_number} onChange={handleChange} placeholder="WTR2024001234" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required label="Volume Required (KL) *" name="recycled_volume_kl"
                    value={formData.recycled_volume_kl} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required select label="Purpose *" name="recycled_purpose"
                    value={formData.recycled_purpose} onChange={handleChange}>
                    <MenuItem value="gardening">Gardening / Irrigation</MenuItem>
                    <MenuItem value="construction">Construction</MenuItem>
                    <MenuItem value="industrial_wash">Industrial Washing</MenuItem>
                    <MenuItem value="road_cleaning">Road / Premises Cleaning</MenuItem>
                    <MenuItem value="other">Other Non-Potable Use</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Ward" name="ward"
                    value={formData.ward} onChange={handleChange}
                    placeholder="Enter ward number/name" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth required label="Delivery Address *" name="delivery_address"
                    value={formData.delivery_address} onChange={handleChange} multiline rows={2} />
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        {selectedService && (
          <Button variant="contained" onClick={handleSubmitWithOtp} disabled={submitting}
            sx={{ bgcolor: '#0277bd', '&:hover': { bgcolor: '#01579b' } }}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Confirm Booking'}
          </Button>
        )}
      </DialogActions>

      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        title="Confirm Booking via OTP"
      />
    </Box>
  );
};

export default WaterTankerServicesForm;
