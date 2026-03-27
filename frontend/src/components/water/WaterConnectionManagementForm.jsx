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
  Divider,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
} from '@mui/material';
import DocUpload from '../municipal/DocUpload';
import EmailOtpVerification from './EmailOtpVerification';
import {
  CheckCircle as SuccessIcon,
  Build as MeterIcon,
  OpenWith as ExtendIcon,
  Category as CategoryIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const managementServices = [
  {
    id: 'meter_change',
    title: 'Meter Change / Replacement',
    description: 'Request replacement of old, faulty, or burnt meter',
    icon: MeterIcon,
    color: '#1976d2',
  },
  {
    id: 'load_extension',
    title: 'Load Extension / Pipe Upgrade',
    description: 'Apply for increase in pipe size for commercial or additional domestic use',
    icon: ExtendIcon,
    color: '#7b1fa2',
  },
  {
    id: 'category_change',
    title: 'Change Connection Category',
    description: 'Change from domestic to commercial, or other category transfers',
    icon: CategoryIcon,
    color: '#e65100',
  },
  {
    id: 'ownership_transfer',
    title: 'Ownership Transfer',
    description: 'Transfer water connection to a new owner (on property sale / inheritance)',
    icon: TransferIcon,
    color: '#2e7d32',
  },
];

const pipeSizes = [
  { value: '15mm', label: '15mm (½") - Domestic' },
  { value: '20mm', label: '20mm (¾") - Domestic' },
  { value: '25mm', label: '25mm (1") - Domestic Large' },
  { value: '40mm', label: '40mm - Commercial' },
  { value: '50mm', label: '50mm - Bulk/Commercial' },
];

const connectionCategories = [
  { value: 'domestic', label: 'Domestic / आवासीय' },
  { value: 'commercial', label: 'Commercial / व्यावसायिक' },
  { value: 'industrial', label: 'Industrial / औद्योगिक' },
  { value: 'institutional', label: 'Institutional (School/Hospital)' },
];

const meterChangeReasons = [
  { value: 'faulty', label: 'Meter Not Functioning / Faulty' },
  { value: 'burnt', label: 'Meter Burnt / Damaged' },
  { value: 'old', label: 'Old Meter (>10 years old)' },
  { value: 'upgrade', label: 'Upgrade to Smart Meter' },
  { value: 'theft', label: 'Meter Theft (Police Report Required)' },
];

const WaterConnectionManagementForm = ({ onClose }) => {
  const [selectedService, setSelectedService] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [formData, setFormData] = useState({
    consumer_number: '',
    full_name: '',
    mobile: '',
    // meter change
    meter_change_reason: '',
    current_meter_no: '',
    // load extension
    current_pipe_size: '15mm',
    requested_pipe_size: '25mm',
    reason_for_extension: '',
    // category change
    current_category: 'domestic',
    requested_category: 'commercial',
    usage_description: '',
    // ownership transfer
    new_owner_name: '',
    new_owner_mobile: '',
    new_owner_aadhaar: '',
    transfer_reason: '',
  });

  const [docs, setDocs] = useState({});
  const handleFileChange = (name, file) => setDocs((prev) => ({ ...prev, [name]: file }));
  const handleRemoveFile = (name) => setDocs((prev) => { const d = { ...prev }; delete d[name]; return d; });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.consumer_number || !formData.full_name || !formData.mobile) {
      toast.error('Please fill Consumer Number, Name, and Mobile');
      return false;
    }
    if (formData.mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile number');
      return false;
    }
    if (selectedService === 'meter_change' && !formData.meter_change_reason) {
      toast.error('Please select reason for meter change');
      return false;
    }
    if (selectedService === 'ownership_transfer' && (!formData.new_owner_name || !formData.new_owner_mobile)) {
      toast.error('Please fill new owner details');
      return false;
    }

    return true;
  };

  const handleSubmit = async (email) => {

    setSubmitting(true);
    try {
      const request_data = {
        service_type: selectedService,
        consumer_number: formData.consumer_number,
        full_name: formData.full_name,
        mobile: formData.mobile,
        email,
        ...formData,
      };
      const response = await api.post('/water/applications/submit', {
        application_type: 'connection_management',
        application_data: request_data,
      });
      const reqNo = response.data?.data?.application_number || ('WCM' + Date.now());
      setRequestNumber(reqNo);
      setVerifiedEmail(email);
      setSubmitted(true);
      toast.success('Request submitted successfully!');

      api.post('/water/otp/send-receipt', {
        email,
        application_number: reqNo,
        application_type: 'connection_management',
        application_data: request_data,
        submitted_at: new Date().toISOString(),
      }).catch(() => {
        toast.error('Request saved, but receipt email could not be sent.');
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to submit request. Please try again.');
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
    return (
      <Box>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" color="success.main" gutterBottom>Request Submitted!</Typography>
          <Typography variant="h6" gutterBottom>Request Number:</Typography>
          <Chip label={requestNumber} color="secondary" sx={{ fontSize: '1.2rem', py: 2, px: 3, mb: 3 }} />
          <Box sx={{ bgcolor: '#f3e5f5', p: 3, borderRadius: 2, textAlign: 'left' }}>
            <Typography variant="body1" gutterBottom>
              <strong>Service:</strong> {managementServices.find(s => s.id === selectedService)?.title}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Consumer No:</strong> {formData.consumer_number}
            </Typography>
            <Typography variant="body1"><strong>Mobile:</strong> {formData.mobile}</Typography>
            <Typography variant="body1"><strong>Email:</strong> {verifiedEmail}</Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            Processing time: 5–10 working days • A field inspector may visit for verification • SMS updates sent to {formData.mobile}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} fullWidth sx={{ bgcolor: '#7b1fa2' }}>Close</Button>
        </DialogActions>
      </Box>
    );
  }

  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        {/* Service Selection */}
        {!selectedService && (
          <Box>
            <Typography variant="h6" color="primary" gutterBottom>Select Service Type</Typography>
            <Grid container spacing={2}>
              {managementServices.map((service) => (
                <Grid item xs={12} sm={6} key={service.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: `1px solid ${service.color}40`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedService(service.id)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${service.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <service.icon sx={{ color: service.color }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600} color={service.color}>{service.title}</Typography>
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

        {/* Service form */}
        {selectedService && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Button variant="outlined" size="small" onClick={() => setSelectedService(null)}>← Back</Button>
              <Typography variant="h6" color="secondary">
                {managementServices.find(s => s.id === selectedService)?.title}
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            {/* Common fields */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Consumer Number (CCN) *" name="consumer_number"
                  value={formData.consumer_number} onChange={handleChange} placeholder="WTR2024001234" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Full Name *" name="full_name"
                  value={formData.full_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Mobile Number *" name="mobile"
                  value={formData.mobile} onChange={handleChange} inputProps={{ maxLength: 10 }} />
              </Grid>

              {/* Meter Change fields */}
              {selectedService === 'meter_change' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth required select label="Reason for Meter Change *" name="meter_change_reason"
                      value={formData.meter_change_reason} onChange={handleChange}>
                      {meterChangeReasons.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Current Meter No." name="current_meter_no"
                      value={formData.current_meter_no} onChange={handleChange} placeholder="Printed on meter" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Photo of Current Meter *"
                      name="meter_photo"
                      required
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="Clear photo showing meter number and reading"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Latest Bill Copy"
                      name="bill_copy"
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="Recent water bill (PDF or photo)"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">A meter testing officer will visit. Old meter will be replaced after verification. Charges may apply for non-defective meters.</Alert>
                  </Grid>
                </>
              )}

              {/* Load Extension fields */}
              {selectedService === 'load_extension' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="Current Pipe Size" name="current_pipe_size"
                      value={formData.current_pipe_size} onChange={handleChange}>
                      {pipeSizes.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth required select label="Requested Pipe Size *" name="requested_pipe_size"
                      value={formData.requested_pipe_size} onChange={handleChange}>
                      {pipeSizes.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Reason for Extension" name="reason_for_extension"
                      value={formData.reason_for_extension} onChange={handleChange}
                      placeholder="E.g., Opening a restaurant, additional floors" multiline rows={2} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Building Plan / Layout "
                      name="building_plan"
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="Approved plan showing increased water demand"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Society NOC (if applicable)"
                      name="society_noc"
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="NOC from housing society or RWA"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="warning">Pipe size increase from domestic to commercial rates will change tariff accordingly.</Alert>
                  </Grid>
                </>
              )}

              {/* Category Change fields */}
              {selectedService === 'category_change' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="Current Category" name="current_category"
                      value={formData.current_category} onChange={handleChange}>
                      {connectionCategories.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth required select label="Requested Category *" name="requested_category"
                      value={formData.requested_category} onChange={handleChange}>
                      {connectionCategories.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Description of Use" name="usage_description"
                      value={formData.usage_description} onChange={handleChange}
                      placeholder="Describe how the property will be used" multiline rows={2} />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">Category change affects water tariff. A field inspector will verify usage before approval.</Alert>
                  </Grid>
                </>
              )}

              {/* Ownership Transfer fields */}
              {selectedService === 'ownership_transfer' && (
                <>
                  <Grid item xs={12}>
                    <Divider textAlign="left"><Typography variant="body2" color="text.secondary">New Owner Details</Typography></Divider>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth required label="New Owner Full Name *" name="new_owner_name"
                      value={formData.new_owner_name} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth required label="New Owner Mobile *" name="new_owner_mobile"
                      value={formData.new_owner_mobile} onChange={handleChange} inputProps={{ maxLength: 10 }} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="New Owner Aadhaar" name="new_owner_aadhaar"
                      value={formData.new_owner_aadhaar} onChange={handleChange} inputProps={{ maxLength: 12 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth select label="Reason for Transfer" name="transfer_reason"
                      value={formData.transfer_reason} onChange={handleChange}>
                      <MenuItem value="sale">Property Sale</MenuItem>
                      <MenuItem value="inheritance">Inheritance</MenuItem>
                      <MenuItem value="gift">Gift Deed</MenuItem>
                      <MenuItem value="divorce">Court Order / Divorce</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DocUpload
                      label="Sale Deed / Transfer Document *"
                      name="sale_deed"
                      required
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="Registered sale deed or gift deed or court order"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DocUpload
                      label="New Owner ID Proof *"
                      name="new_owner_id"
                      required
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="Aadhaar / Passport / Voter ID of new owner"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DocUpload
                      label="No-Dues Certificate"
                      name="no_dues_cert"
                      docs={docs}
                      onFileChange={handleFileChange}
                      onRemove={handleRemoveFile}
                      hint="Obtained from ward office confirming no arrears"
                      accept="image/*,.pdf"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="warning">Original registration documents, no-dues certificate, and NOC may be required. Clearance of all pending bills is mandatory before transfer.</Alert>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        {selectedService && (
          <Button variant="contained" onClick={handleSubmitWithOtp} disabled={submitting}
            sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Request'}
          </Button>
        )}
      </DialogActions>

      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        title="Confirm Request via OTP"
      />
    </Box>
  );
};

export default WaterConnectionManagementForm;
