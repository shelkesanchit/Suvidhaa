import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  Grid,
  Stepper,
  Step,
  StepLabel,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import { CheckCircle as SuccessIcon, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';


// More granular steps for a guided experience
const steps = [
  'Applicant Details',
  'Property Details',
  'System Details',
  'Review & Submit',
];

const propertyTypes = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'institutional', label: 'Institutional' },
];

const installationTypes = [
  { value: 'grid_connected', label: 'Grid Connected (Net Metering)' },
  { value: 'off_grid', label: 'Off Grid (with Battery)' },
  { value: 'hybrid', label: 'Hybrid System' },
];

const SolarRooftopForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);

  const [formData, setFormData] = useState({
    // Applicant Details
    consumer_number: '',
    full_name: '',
    contact_number: '',
    email: '',
    // Property Details
    property_type: '',
    roof_area: '',
    // System Details
    estimated_capacity: '',
    current_monthly_bill: '',
    installation_type: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    handleSubmit(email);
  };

  const handleSubmit = async (email) => {
    try {
      const response = await api.post('/electricity/applications/submit', {
        application_type: 'solar_rooftop',
        application_data: formData,
      });

      const appNum = response.data.application_number;
      const ts = new Date().toISOString();
      setApplicationNumber(appNum);
      setSubmitted(true);
      setVerifiedEmail(email);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Solar rooftop application submitted successfully!');
      api.post('/electricity/otp/send-receipt', {
        email,
        application_number: appNum,
        application_type: 'solar_rooftop',
        application_data: formData,
        submitted_at: ts,
      }).catch(console.warn);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit application');
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">Applicant Details</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Consumer Number *"
                name="consumer_number"
                value={formData.consumer_number}
                onChange={handleChange}
                required
                placeholder="EC2026XXXXXX"
                helperText="Enter your existing electricity consumer number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name *"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                helperText="As per electricity bill"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Number *"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                required
                inputProps={{ maxLength: 10 }}
                helperText="10-digit mobile number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                helperText="For application updates"
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">Property Details</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Property Type *"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                required
                helperText="Type of property for installation"
              >
                {propertyTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Available Roof Area (sq ft) *"
                name="roof_area"
                type="number"
                value={formData.roof_area}
                onChange={handleChange}
                required
                inputProps={{ min: '0' }}
                helperText="Usable area for solar panels"
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">System Details</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Capacity (kW) *"
                name="estimated_capacity"
                type="number"
                value={formData.estimated_capacity}
                onChange={handleChange}
                required
                inputProps={{ min: '0', step: '0.5' }}
                helperText="1 kW requires ~100 sq ft"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Monthly Bill (₹) *"
                name="current_monthly_bill"
                type="number"
                value={formData.current_monthly_bill}
                onChange={handleChange}
                required
                inputProps={{ min: '0' }}
                helperText="Average monthly bill amount"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Installation Type *"
                name="installation_type"
                value={formData.installation_type}
                onChange={handleChange}
                required
                helperText="Select system type"
              >
                {installationTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Benefits:</strong> Up to 40% government subsidy available • Reduce electricity bills by 70-90% • 25+ years lifespan • Net metering facility • Environment friendly
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">Review Your Application</Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Please verify all details carefully before submitting. Our team will contact you within 3 working days.
            </Alert>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Applicant Details</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}><Typography variant="body2">Consumer Number:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.consumer_number}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Full Name:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.full_name}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Contact Number:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.contact_number}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Email:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.email}</Typography></Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Property Details</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}><Typography variant="body2">Property Type:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.property_type.toUpperCase()}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Available Roof Area:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.roof_area} sq ft</Typography></Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>System Details</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}><Typography variant="body2">Estimated Capacity:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.estimated_capacity} kW</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Current Monthly Bill:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>₹ {formData.current_monthly_bill}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Installation Type:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{installationTypes.find(t => t.value === formData.installation_type)?.label}</Typography></Grid>
            </Grid>
            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>What happens next?</strong>
              </Typography>
              <Typography variant="body2">
                1. Site survey will be conducted within 7 working days<br/>
                2. Technical feasibility report will be shared<br/>
                3. Subsidy and cost details will be provided<br/>
                4. Installation timeline will be communicated
              </Typography>
            </Alert>
          </Box>
        );
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Application Submitted Successfully!
        </Typography>
        <Typography variant="h6" color="primary" gutterBottom sx={{ my: 3 }}>
          Application Number: {applicationNumber}
        </Typography>
        <Typography color="text.secondary" paragraph>
          Your solar rooftop application has been received and will be processed within 7 working days.
        </Typography>
        <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Next Steps:</strong>
          </Typography>
          <Typography variant="body2">
            1. Site survey will be conducted within 7 working days<br/>
            2. Technical feasibility report will be shared<br/>
            3. Subsidy and cost details will be provided<br/>
            4. Our team will contact you for further process<br/>
            5. Please note down your application number for future reference
          </Typography>
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setShowReceipt(true)}>
            Print Receipt
          </Button>
          <Button variant="contained" onClick={onClose} size="large">
            Close
          </Button>
        </Box>
        <ApplicationReceipt
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          applicationNumber={applicationNumber}
          applicationType="solar_rooftop"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400 }}>
          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={() => setShowOtpDialog(true)} size="large">
            Submit Application
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        )}
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.email || ''}
      />
    </Box>
  );
};

export default SolarRooftopForm;
