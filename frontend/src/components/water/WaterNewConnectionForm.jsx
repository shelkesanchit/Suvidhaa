import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { CheckCircle as SuccessIcon, EventAvailable as SiteVisitIcon, Opacity as SewerIcon, Print as PrintIcon } from '@mui/icons-material';
import DocUpload from '../municipal/DocUpload';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const steps = ['Applicant Details', 'Property Details', 'Connection Details', 'Documents', 'Review & Submit'];

// As per Indian Municipal Standards
const applicantCategories = [
  { value: 'individual', label: 'Individual / व्यक्तिगत' },
  { value: 'housing_society', label: 'Co-operative Housing Society / सहकारी आवास समिति' },
  { value: 'firm', label: 'Firm / Partnership' },
  { value: 'private_company', label: 'Private Ltd Company' },
  { value: 'trust', label: 'Trust / न्यास' },
  { value: 'government', label: 'Government Department' },
];

const propertyTypes = [
  { value: 'residential', label: 'Residential / आवासीय' },
  { value: 'commercial', label: 'Commercial / व्यावसायिक' },
  { value: 'industrial', label: 'Industrial / औद्योगिक' },
  { value: 'institutional', label: 'Institutional (School, Hospital) / संस्थागत' },
  { value: 'construction', label: 'Construction Site / निर्माण स्थल' },
];

const connectionPurposes = [
  { value: 'drinking', label: 'Drinking / Domestic Use' },
  { value: 'construction', label: 'Construction' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'industrial', label: 'Industrial Process' },
];

const connectionTypes = [
  { value: 'permanent', label: 'Permanent / स्थायी' },
  { value: 'temporary', label: 'Temporary / अस्थायी' },
];

const pipeSizes = [
  { value: '15mm', label: '15mm (½") - Domestic' },
  { value: '20mm', label: '20mm (¾") - Domestic' },
  { value: '25mm', label: '25mm (1") - Domestic Large' },
  { value: '40mm', label: '40mm - Commercial' },
  { value: '50mm', label: '50mm - Bulk/Commercial' },
];

const ownershipTypes = [
  { value: 'owner', label: 'Owner / मालिक' },
  { value: 'tenant', label: 'Tenant / किरायेदार' },
  { value: 'leaseholder', label: 'Leaseholder / पट्टाधारी' },
];

const wards = [
  { value: '1', label: 'Ward 1' },
  { value: '2', label: 'Ward 2' },
  { value: '3', label: 'Ward 3' },
  { value: '4', label: 'Ward 4' },
  { value: '5', label: 'Ward 5' },
  { value: '6', label: 'Ward 6' },
  { value: '7', label: 'Ward 7' },
  { value: '8', label: 'Ward 8' },
];

const WaterNewConnectionForm = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [siteVisitSubmitted, setSiteVisitSubmitted] = useState(false);
  const [siteVisitData, setSiteVisitData] = useState({
    full_name: '',
    mobile: '',
    address: '',
    ward: '',
    visit_date: '',
    visit_purpose: 'new_connection',
  });
  const [formData, setFormData] = useState({
    // Applicant Details (Category I from document)
    applicant_category: 'individual',
    full_name: '',
    father_spouse_name: '',
    aadhaar_number: '',
    mobile: '',
    email: '',

    // Property Details (Category II from document)
    property_id: '', // Property Index Number - Most Critical Field
    house_flat_no: '',
    building_name: '',
    ward: '',
    landmark: '',
    property_type: '',
    ownership_status: 'owner',

    // Connection Details (Category III from document)
    connection_purpose: 'drinking',
    pipe_size: '15mm',
    connection_type: 'permanent',
    include_sewerage: false,

    // Documents
    aadhaar_doc: null,
    property_doc: null, // Sale Deed / Property Tax Receipt
  });

  const handleSiteVisitChange = (e) => {
    const { name, value } = e.target;
    setSiteVisitData({ ...siteVisitData, [name]: value });
  };

  const handleSiteVisitSubmit = () => {
    if (!siteVisitData.full_name || !siteVisitData.mobile || !siteVisitData.address || !siteVisitData.ward || !siteVisitData.visit_date) {
      toast.error('Please fill all required fields');
      return;
    }
    if (siteVisitData.mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile number');
      return;
    }
    setTimeout(() => {
      setSiteVisitSubmitted(true);
      toast.success('Site visit booked successfully!');
    }, 800);
  };

  const [docs, setDocs] = useState({});
  const handleDocFileChange = (name, file) => setDocs((prev) => ({ ...prev, [name]: file }));
  const handleDocRemove = (name) => setDocs((prev) => { const d = { ...prev }; delete d[name]; return d; });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileChange = (e, fieldName) => {
    // legacy handler kept for checkbox compat
  };

  const validateStep = () => {
    switch (activeStep) {
      case 0: // Applicant Details
        if (!formData.full_name || !formData.father_spouse_name || !formData.mobile || !formData.aadhaar_number) {
          toast.error('Please fill all mandatory fields');
          return false;
        }
        if (formData.mobile.length !== 10) {
          toast.error('Enter valid 10-digit mobile number');
          return false;
        }
        if (formData.aadhaar_number.length !== 12) {
          toast.error('Enter valid 12-digit Aadhaar number');
          return false;
        }
        return true;
      case 1: // Property Details
        if (!formData.property_id || !formData.house_flat_no || !formData.ward || !formData.property_type) {
          toast.error('Please fill all mandatory fields');
          return false;
        }
        return true;
      case 2: // Connection Details
        if (!formData.connection_purpose || !formData.pipe_size) {
          toast.error('Please select connection details');
          return false;
        }
        return true;
      case 3: // Documents
        if (!docs.aadhaar_doc || !docs.property_doc) {
          toast.error('Please upload mandatory documents');
          return false;
        }
        return true;
      case 4: // Review
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (activeStep === steps.length - 1) {
        setShowOtpDialog(true);
      } else {
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    handleSubmit(email);
  };

  const handleSubmit = async (email) => {
    try {
      setSubmitting(true);

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

      // Prepare the application data
      const application_data = {
        applicant_category: formData.applicant_category,
        full_name: formData.full_name,
        father_spouse_name: formData.father_spouse_name,
        aadhaar_number: formData.aadhaar_number,
        mobile: formData.mobile,
        email,
        property_id: formData.property_id,
        house_flat_no: formData.house_flat_no,
        building_name: formData.building_name,
        ward: formData.ward,
        landmark: formData.landmark,
        property_type: formData.property_type,
        ownership_status: formData.ownership_status,
        connection_purpose: formData.connection_purpose,
        pipe_size: formData.pipe_size,
        connection_type: formData.connection_type,
        include_sewerage: formData.include_sewerage,
      };

      // Submit to API with documents
      const response = await api.post('/water/applications/submit', {
        application_type: 'new_connection',
        application_data,
        documents: docsArray,
      });

      const appNum = response.data.data.application_number;
      const ts = new Date().toISOString();
      setApplicationNumber(appNum);
      setSubmitted(true);
      setVerifiedEmail(email);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Application submitted successfully!');

      // Send receipt email
      api.post('/water/otp/send-receipt', {
        email,
        application_number: appNum,
        application_type: 'new_connection',
        application_data: formData,
        submitted_at: ts,
      }).catch(console.warn);
    } catch (error) {
      console.error('Submit error:', error);
      // Handle different error types
      let errorMessage = 'Failed to submit application. Please try again.';
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        // Request was made but no response (network error)
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        // Error in request setup
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Box>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" color="success.main" gutterBottom>
            Application Submitted!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Application Number:
          </Typography>
          <Chip
            label={applicationNumber}
            color="primary"
            sx={{ fontSize: '1.5rem', py: 3, px: 4, mb: 3 }}
          />
          <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
            <Typography variant="body2">
              • Save your application number for tracking<br />
              • Document verification: 3-5 working days<br />
              • Site inspection will be scheduled after verification<br />
              • SMS updates on registered mobile: {formData.mobile}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1, pb: 3 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setShowReceipt(true)}>
            Print Receipt
          </Button>
          <Button variant="contained" onClick={onClose} sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#0277bd' } }}>
            Close
          </Button>
        </DialogActions>
        <ApplicationReceipt
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          applicationNumber={applicationNumber}
          applicationType="new_connection"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(e, val) => { setActiveTab(val); setActiveStep(0); }}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<SewerIcon />} label="Connection Application" iconPosition="start" />
        <Tab icon={<SiteVisitIcon />} label="Book Site Visit" iconPosition="start" />
      </Tabs>

      {/* Tab 0: Connection Application (existing form) */}
      {activeTab === 0 && (
        <>
      <DialogContent sx={{ mt: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Applicant Details */}
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                Applicant Information / आवेदक जानकारी
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="Applicant Category / आवेदक श्रेणी"
                name="applicant_category"
                value={formData.applicant_category}
                onChange={handleChange}
              >
                {applicantCategories.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Full Name (as per Aadhaar) *"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="पूरा नाम"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Father's / Spouse's Name *"
                name="father_spouse_name"
                value={formData.father_spouse_name}
                onChange={handleChange}
                placeholder="पिता/पति का नाम"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Aadhaar Number (UID) *"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleChange}
                placeholder="12-digit Aadhaar"
                inputProps={{ maxLength: 12 }}
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
                helperText="For OTP validation & SMS alerts"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="For digital billing"
              />
            </Grid>
          </Grid>
        )}

        {/* Step 1: Property Details */}
        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                Property Details / संपत्ति विवरण
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Property ID / Index Number *"
                name="property_id"
                value={formData.property_id}
                onChange={handleChange}
                placeholder="E.g., PROP-2024-12345"
                helperText="Links to Property Tax database"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="House / Flat / Shop No. *"
                name="house_flat_no"
                value={formData.house_flat_no}
                onChange={handleChange}
                placeholder="E.g., Flat 401, Shop 5"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Building / Society Name"
                name="building_name"
                value={formData.building_name}
                onChange={handleChange}
                placeholder="For field inspector"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Ward *"
                name="ward"
                value={formData.ward}
                onChange={handleChange}
                placeholder="Enter ward number/name"
                helperText="Determines jurisdiction"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="E.g., Near City Hospital"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="Property Type *"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                helperText="Determines tariff category"
              >
                {propertyTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel>Ownership Status / स्वामित्व *</FormLabel>
                <RadioGroup
                  row
                  name="ownership_status"
                  value={formData.ownership_status}
                  onChange={handleChange}
                >
                  {ownershipTypes.map((opt) => (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio />}
                      label={opt.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* Step 2: Connection Details */}
        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                Connection Specifications / कनेक्शन विवरण
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="Connection Purpose *"
                name="connection_purpose"
                value={formData.connection_purpose}
                onChange={handleChange}
              >
                {connectionPurposes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="Pipe Size (Ferrule) *"
                name="pipe_size"
                value={formData.pipe_size}
                onChange={handleChange}
                helperText="15-25mm for domestic use"
              >
                {pipeSizes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="Connection Type *"
                name="connection_type"
                value={formData.connection_type}
                onChange={handleChange}
              >
                {connectionTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Tariff Information:</strong><br />
                  • Domestic: Lowest rate for household use<br />
                  • Commercial: Higher rate for business premises<br />
                  • Construction: Charged at 2-3x normal rate (temporary)
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Include Sewerage Connection"
                value={formData.include_sewerage ? 'yes' : 'no'}
                onChange={(e) => setFormData({ ...formData, include_sewerage: e.target.value === 'yes' })}
                helperText="Select Yes if you want sewerage connection along with water connection"
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        )}

        {/* Step 3: Documents */}
        {activeStep === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                Upload Documents / दस्तावेज़ अपलोड करें
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                Formats: JPG, PNG, PDF (Max 5MB)
              </Alert>
            </Grid>
            <Grid item xs={12} md={6}>
              <DocUpload
                label="Aadhaar Card * (Proof of Identity)"
                name="aadhaar_doc"
                required
                docs={docs}
                onFileChange={handleDocFileChange}
                onRemove={handleDocRemove}
                hint="Front and back; JPG, PNG or PDF"
                accept="image/*,.pdf"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DocUpload
                label="Property Document * (Ownership Proof)"
                name="property_doc"
                required
                docs={docs}
                onFileChange={handleDocFileChange}
                onRemove={handleDocRemove}
                hint="Sale Deed / Property Tax Receipt / Allotment Letter"
                accept="image/*,.pdf"
              />
            </Grid>
            {formData.ownership_status === 'tenant' && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  As a Tenant, an NOC from the Property Owner is required.
                </Alert>
                <DocUpload
                  label="NOC from Property Owner * (Landlord)"
                  name="noc_owner"
                  required
                  docs={docs}
                  onFileChange={handleDocFileChange}
                  onRemove={handleDocRemove}
                  hint="Signed & notarized NOC on stamp paper"
                  accept="image/*,.pdf"
                />
              </Grid>
            )}
          </Grid>
        )}

        {/* Step 4: Review & Submit */}
        {activeStep === 4 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                Review Application
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: '#e3f2fd', p: 3, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Applicant</Typography>
                <Typography>Name: {formData.full_name}</Typography>
                <Typography>Mobile: {formData.mobile}</Typography>
                <Typography>Aadhaar: {formData.aadhaar_number}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: '#fff3e0', p: 3, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Property</Typography>
                <Typography>Property ID: {formData.property_id}</Typography>
                <Typography>Address: {formData.house_flat_no}, {formData.building_name}, Ward {formData.ward}</Typography>
                <Typography>Type: {propertyTypes.find(p => p.value === formData.property_type)?.label}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: '#e8f5e9', p: 3, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Connection</Typography>
                <Typography>Purpose: {connectionPurposes.find(p => p.value === formData.connection_purpose)?.label}</Typography>
                <Typography>Pipe Size: {formData.pipe_size}</Typography>
                <Typography>Type: {connectionTypes.find(c => c.value === formData.connection_type)?.label}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="warning">
                <strong>Estimated Charges:</strong> Application Fee + Security Deposit + Road Cutting (if applicable)
              </Alert>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} variant="outlined" disabled={submitting}>
            Back
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={submitting}
          sx={{ bgcolor: '#4facfe', '&:hover': { bgcolor: '#0288d1' } }}
        >
          {submitting ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            activeStep === steps.length - 1 ? 'Submit Application' : 'Next'
          )}
        </Button>
      </DialogActions>
        </>
      )}

      {/* Tab 1: Book Site Visit */}
      {activeTab === 1 && (
        <>
          {siteVisitSubmitted ? (
            <DialogContent sx={{ textAlign: 'center', py: 4 }}>
              <SuccessIcon sx={{ fontSize: 70, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" color="success.main" gutterBottom>Site Visit Booked!</Typography>
              <Chip label={`Visit Date: ${siteVisitData.visit_date}`} color="primary" sx={{ py: 2, px: 3, mb: 2 }} />
              <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                A field inspector will visit on the selected date between 10 AM–5 PM. • SMS confirmation on: {siteVisitData.mobile} • Please keep property documents ready.
              </Alert>
            </DialogContent>
          ) : (
            <DialogContent sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Book a site visit for connection feasibility assessment or for a new connection estimate.
              </Alert>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Full Name *" name="full_name"
                    value={siteVisitData.full_name} onChange={handleSiteVisitChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Mobile Number *" name="mobile"
                    value={siteVisitData.mobile} onChange={handleSiteVisitChange}
                    inputProps={{ maxLength: 10 }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth required label="Property Address *" name="address"
                    value={siteVisitData.address} onChange={handleSiteVisitChange}
                    placeholder="Full address for inspector" multiline rows={2} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Ward *" name="ward"
                    value={siteVisitData.ward} onChange={handleSiteVisitChange}
                    placeholder="Enter ward number/name" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Preferred Visit Date *" name="visit_date"
                    type="date" value={siteVisitData.visit_date} onChange={handleSiteVisitChange}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: new Date().toISOString().split('T')[0] }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth select label="Purpose of Visit" name="visit_purpose"
                    value={siteVisitData.visit_purpose} onChange={handleSiteVisitChange}>
                    <MenuItem value="new_connection">New Water Connection Assessment</MenuItem>
                    <MenuItem value="sewerage_connection">Sewerage Connection Assessment</MenuItem>
                    <MenuItem value="feasibility_check">Feasibility Check</MenuItem>
                    <MenuItem value="complaint_inspection">Complaint Inspection</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </DialogContent>
          )}
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            {!siteVisitSubmitted && (
              <Button variant="contained" onClick={handleSiteVisitSubmit}
                sx={{ bgcolor: '#0288d1' }}>
                Book Site Visit
              </Button>
            )}
            {siteVisitSubmitted && (
              <Button variant="contained" onClick={onClose}>Close</Button>
            )}
          </DialogActions>
        </>
      )}
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.email || ''}
      />
    </Box>
  );
};

export default WaterNewConnectionForm;
