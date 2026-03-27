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
  CircularProgress,
} from '@mui/material';
import DocUpload from '../municipal/DocUpload';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import {
  CheckCircle as SuccessIcon,
  CheckCircle as CheckIcon,
  WaterDrop,
  Speed,
  Build,
  Receipt,
  Warning,
  BugReport,
  FloodOutlined as PipeBurstIcon,
  Science as SamplingIcon,
  ReceiptLong as MeterDisputeIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const complaintCategories = [
  { value: 'no-water', label: 'No Water Supply / पानी नहीं आ रहा', icon: <WaterDrop />, color: '#f44336' },
  { value: 'low-pressure', label: 'Low Pressure / कम प्रेशर', icon: <Speed />, color: '#ff9800' },
  { value: 'contaminated', label: 'Contaminated Water / गंदा पानी', icon: <BugReport />, color: '#795548' },
  { value: 'pipeline-leak', label: 'Pipeline Leakage / पाइप रिसाव', icon: <Build />, color: '#e91e63' },
  { value: 'pipe-burst', label: 'Pipe Burst (Emergency) / पाइप फट गया', icon: <PipeBurstIcon />, color: '#b71c1c' },
  { value: 'meter-stopped', label: 'Meter Stopped/Faulty / मीटर खराब', icon: <Speed />, color: '#673ab7' },
  { value: 'meter-reading-dispute', label: 'Meter Reading Dispute / मीटर रीडिंग विवाद', icon: <MeterDisputeIcon />, color: '#1565c0' },
  { value: 'high-bill', label: 'High Bill / ज़्यादा बिल', icon: <Receipt />, color: '#9c27b0' },
  { value: 'water-sampling', label: 'Water Sampling / Testing Request', icon: <SamplingIcon />, color: '#00695c' },
  { value: 'other', label: 'Other Issue / अन्य समस्या', icon: <Warning />, color: '#607d8b' },
];

const WaterComplaintForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [complaintNumber, setComplaintNumber] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [docs, setDocs] = useState({});
  const [formData, setFormData] = useState({
    consumer_number: '',
    complaint_category: '',
    urgency: 'normal',
    description: '',
    contact_name: '',
    mobile: '',
    email: '',
    ward: '',
    address: '',
    landmark: '',
  });

  const handleFileChange = (name, file) => setDocs((prev) => ({ ...prev, [name]: file }));
  const handleRemoveFile = (name) => setDocs((prev) => { const d = { ...prev }; delete d[name]; return d; });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'complaint_category') {
      setSelectedCategory(value);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setFormData({ ...formData, complaint_category: category });
  };

  const validateForm = () => {
    if (!formData.complaint_category) {
      toast.error('Please select complaint type');
      return false;
    }
    if (!formData.contact_name || !formData.mobile) {
      toast.error('Please fill contact details');
      return false;
    }
    if (formData.mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile number');
      return false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.description) {
      toast.error('Please describe your problem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (verifiedEmail) => {

    setSubmitting(true);
    try {
      // Convert uploaded files to base64 for Supabase storage
      const docsArray = await Promise.all(
        Object.entries(docs).map(([documentType, file]) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: reader.result.split(',')[1],
              documentType,
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
        )
      );

      const complaint_data = {
        complaint_category: formData.complaint_category,
        consumer_number: formData.consumer_number || null,
        contact_name: formData.contact_name,
        mobile: formData.mobile,
        email: verifiedEmail || null,
        ward: formData.ward || null,
        address: formData.address || null,
        landmark: formData.landmark || null,
        description: formData.description,
        urgency: formData.urgency,
      };

      const response = await api.post('/water/complaints/submit', { complaint_data, documents: docsArray });
      const complaintNo = response.data.data.complaint_number;
      const ts = new Date().toISOString();
      setComplaintNumber(complaintNo);
      setSubmitted(true);
      setVerifiedEmail(verifiedEmail);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Complaint registered successfully!');

      api.post('/water/otp/send-receipt', {
        email: verifiedEmail,
        application_number: complaintNo,
        application_type: 'complaint',
        application_data: complaint_data,
        submitted_at: ts,
      }).catch(() => {
        toast.error('Complaint saved, but receipt email could not be sent.');
      });
    } catch (error) {
      console.error('Complaint submission error:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to submit complaint. Please try again.');
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

  const handleOtpVerified = (verifiedEmail) => {
    setShowOtpDialog(false);
    setFormData((prev) => ({ ...prev, email: verifiedEmail }));
    handleSubmit(verifiedEmail);
  };

  if (submitted) {
    return (
      <Box>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" color="success.main" gutterBottom>
            Complaint Registered!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Complaint ID (Token):
          </Typography>
          <Chip
            label={complaintNumber}
            color="error"
            sx={{ fontSize: '1.5rem', py: 3, px: 4, mb: 3 }}
          />
          <Box sx={{ bgcolor: '#fff3e0', p: 3, borderRadius: 2, mt: 2, textAlign: 'left' }}>
            <Typography variant="body1" gutterBottom>
              <strong>Complaint Type:</strong> {complaintCategories.find(c => c.value === selectedCategory)?.label}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Contact:</strong> {formData.contact_name}
            </Typography>
            <Typography variant="body1">
              <strong>Mobile:</strong> {formData.mobile}
            </Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              • Complaint assigned to Ward Engineer<br />
              • Track status using Complaint ID<br />
              • SMS update on resolution<br />
              • Emergency helpline: 1800-XXX-XXXX
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1, pb: 3 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setShowReceipt(true)}>
             Print Receipt
          </Button>
          <Button variant="contained" onClick={onClose} sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#d32f2f' } }}>
            Close
          </Button>
        </DialogActions>
        <ApplicationReceipt
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          applicationNumber={complaintNumber}
          applicationType="complaint"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        {activeStep === 0 && (
          <>
            <Typography variant="h6" color="primary" gutterBottom>
              Select Problem Type / समस्या का प्रकार *
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {complaintCategories.map((category) => (
                <Grid item xs={6} sm={4} key={category.value}>
                  <Card
                    onClick={() => handleCategorySelect(category.value)}
                    sx={{
                      cursor: 'pointer',
                      position: 'relative',
                      border: selectedCategory === category.value ? `3px solid ${category.color}` : '1px solid #e0e0e0',
                      bgcolor: selectedCategory === category.value ? `${category.color}25` : 'white',
                      boxShadow: selectedCategory === category.value ? `0 4px 12px ${category.color}40` : 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: selectedCategory === category.value ? `0 6px 16px ${category.color}50` : 4,
                        bgcolor: selectedCategory === category.value ? `${category.color}30` : '#f5f5f5',
                        borderColor: category.color,
                      },
                    }}
                  >
                    {selectedCategory === category.value && (
                      <CheckIcon
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          fontSize: 22,
                          color: category.color,
                          bgcolor: 'white',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box sx={{ color: category.color, mb: 1 }}>
                        {React.cloneElement(category.icon, { sx: { fontSize: 36 } })}
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={selectedCategory === category.value ? 700 : 400}
                        sx={{ color: selectedCategory === category.value ? category.color : 'text.primary' }}
                      >
                        {category.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {selectedCategory === 'pipe-burst' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>PIPE BURST EMERGENCY:</strong> Call <strong>1916</strong> immediately for urgent response. This form will also register a complaint for follow-up.
              </Alert>
            )}
            {selectedCategory === 'water-sampling' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                A water quality inspector will visit your premises within 3 working days to collect a sample for testing.
              </Alert>
            )}
            {selectedCategory === 'meter-reading-dispute' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please attach a photo of your current meter reading in the description. A meter inspector will be assigned within 7 working days.
              </Alert>
            )}

            {!selectedCategory && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Select a problem type and click Next.
              </Alert>
            )}
          </>
        )}

        {activeStep === 1 && (
          <>
            <Typography variant="h6" color="primary" gutterBottom>
              Contact Information / संपर्क जानकारी
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Complaint Type: {complaintCategories.find(c => c.value === selectedCategory)?.label}
            </Alert>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Consumer Number (if available)"
                  name="consumer_number"
                  value={formData.consumer_number}
                  onChange={handleChange}
                  placeholder="E.g., WTR2024001234"
                  helperText="Helps retrieve property history"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Contact Person Name *"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="संपर्क व्यक्ति का नाम"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Mobile Number *"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10-digit mobile"
                  inputProps={{ maxLength: 10 }}
                  helperText="For engineer to coordinate"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Email Address *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  helperText="Required for OTP confirmation and receipt"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Ward Number"
                  name="ward"
                  value={formData.ward}
                  onChange={handleChange}
                  placeholder="e.g., 1, 2, 3"
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Full Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Complete address of the problem location"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Landmark (Nearby Reference Point)"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="E.g., Near City Hospital, Behind Bus Stand"
                  helperText="Helps field staff locate the issue quickly"
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" color="primary" gutterBottom>
              Problem Description / समस्या का विवरण *
            </Typography>
            <Grid container spacing={3} sx={{ mb: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={3}
                  label="Describe your problem *"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="E.g., No water supply since morning 6 AM, affecting all floors..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Urgency Level / तात्कालिकता *"
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                >
                  <MenuItem value="normal">Normal — Response within 3-5 days</MenuItem>
                  <MenuItem value="urgent">Urgent — Response within 24 hours</MenuItem>
                  <MenuItem value="emergency">Emergency — Immediate response needed</MenuItem>
                </TextField>
              </Grid>
              {['contaminated', 'meter-reading-dispute', 'pipeline-leak', 'pipe-burst'].includes(selectedCategory) && (
                <Grid item xs={12}>
                  <DocUpload
                    label={selectedCategory === 'meter-reading-dispute' ? 'Meter Photo (current reading)' :
                      selectedCategory === 'contaminated' ? 'Water/Sample Photo (evidence)' :
                      'Leak/Damage Photo'}
                    name="evidence_photo"
                    required={selectedCategory === 'contaminated' || selectedCategory === 'meter-reading-dispute'}
                    docs={docs}
                    onFileChange={handleFileChange}
                    onRemove={handleRemoveFile}
                    hint="JPG, PNG (max 5 MB) — Helps faster resolution"
                    accept="image/*"
                  />
                </Grid>
              )}
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          Cancel
        </Button>
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={() => setActiveStep(1)}
            disabled={!selectedCategory}
            sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#d32f2f' } }}
          >
            Next
          </Button>
        )}
        {activeStep === 1 && (
          <>
            <Button
              variant="outlined"
              onClick={() => setActiveStep(0)}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitWithOtp}
              disabled={submitting}
              sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#d32f2f' } }}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </>
        )}
      </DialogActions>

      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.email}
        title="Confirm Complaint via OTP"
      />
    </Box>
  );
};

export default WaterComplaintForm;
