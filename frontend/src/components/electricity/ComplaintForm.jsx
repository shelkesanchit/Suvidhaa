import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { CheckCircle as SuccessIcon, CloudUpload, Delete, AttachFile, CheckCircle, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import QrUploadButton from './QrUploadButton';

const steps = ['Complainant Details', 'Complaint Information', 'Review & Submit'];

const complaintCategories = [
  { value: 'supply_related', label: 'Supply Related' },
  { value: 'billing_related', label: 'Billing Related' },
  { value: 'meter_related', label: 'Meter Related' },
  { value: 'service_connection', label: 'Service Connection' },
  { value: 'quality_of_supply', label: 'Quality of Supply' },
  { value: 'other', label: 'Other' },
];

const supplyIssues = [
  'No Power Supply',
  'Frequent Power Cuts',
  'Low Voltage',
  'High Voltage',
  'Single Phase Failure',
  'Voltage Fluctuation',
  'Burnt Transformer',
  'Line Fault/Break',
  'Pole Damage',
];

const billingIssues = [
  'Wrong Bill Amount',
  'High Bill/Excess Billing',
  'Bill Not Received',
  'Wrong Meter Reading',
  'Penalty Charges Issue',
  'Payment Not Updated',
  'Duplicate Bill',
];

const meterIssues = [
  'Meter Not Working',
  'Meter Display Blank',
  'Meter Running Fast',
  'Meter Burnt',
  'Meter Reading Error',
  'Meter Seal Broken',
  'Smart Meter Issue',
];

const priorityLevels = [
  { value: 'low', label: 'Low', desc: 'Non-urgent issues' },
  { value: 'medium', label: 'Medium', desc: 'Requires attention within 48 hours' },
  { value: 'high', label: 'High', desc: 'Urgent - No power supply' },
  { value: 'critical', label: 'Critical', desc: 'Emergency - Safety hazard' },
];

// Document requirements based on complaint category
const documentRequirements = {
  supply_related: [
    { id: 'photo_issue', name: 'Photo of Issue', description: 'Photo showing the power outage/damage area', required: false },
    { id: 'photo_transformer', name: 'Transformer/Pole Photo', description: 'Photo of nearby transformer or pole if damaged', required: false },
    { id: 'location_photo', name: 'Location Photo', description: 'Photo of your premises/area', required: false },
  ],
  billing_related: [
    { id: 'electricity_bill', name: 'Recent Electricity Bill', description: 'Copy of the disputed electricity bill', required: true },
    { id: 'previous_bills', name: 'Previous Bills', description: 'Last 2-3 months bills for comparison', required: false },
    { id: 'payment_receipt', name: 'Payment Receipt', description: 'Receipt if claiming payment already made', required: false },
    { id: 'bank_statement', name: 'Bank Statement', description: 'Transaction proof if payment disputed', required: false },
  ],
  meter_related: [
    { id: 'meter_photo', name: 'Meter Photo', description: 'Clear photo showing meter display and number', required: true },
    { id: 'meter_reading_photo', name: 'Meter Reading Photo', description: 'Photo showing current meter reading', required: true },
    { id: 'meter_seal_photo', name: 'Meter Seal Photo', description: 'Photo of meter seal if broken/tampered', required: false },
    { id: 'electricity_bill', name: 'Recent Electricity Bill', description: 'For verifying meter number', required: false },
  ],
  service_connection: [
    { id: 'application_copy', name: 'Application Copy', description: 'Copy of your connection application', required: false },
    { id: 'identity_proof', name: 'Identity Proof', description: 'Aadhaar/Voter ID/Passport copy', required: true },
    { id: 'premises_photo', name: 'Premises Photo', description: 'Photo of the premises location', required: false },
    { id: 'noc_document', name: 'NOC Document', description: 'Any relevant NOC or permission document', required: false },
  ],
  quality_of_supply: [
    { id: 'voltage_reading', name: 'Voltage Reading Photo', description: 'Photo of voltage meter/reading if available', required: false },
    { id: 'damaged_equipment', name: 'Damaged Equipment Photo', description: 'Photo of any equipment damaged due to voltage issue', required: false },
    { id: 'electricity_bill', name: 'Recent Electricity Bill', description: 'For consumer verification', required: false },
  ],
  other: [
    { id: 'supporting_doc', name: 'Supporting Document', description: 'Any relevant document for your complaint', required: false },
    { id: 'photo_issue', name: 'Photo of Issue', description: 'Photo showing the issue if applicable', required: false },
  ],
};

const ComplaintForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [complaintNumber, setComplaintNumber] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [formData, setFormData] = useState({
    // Complainant Details
    full_name: '',
    father_husband_name: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    address: '',
    landmark: '',
    city: '',
    district: '',
    state: 'Maharashtra',
    pincode: '',

    // Consumer Details
    is_consumer: 'no',
    consumer_number: '',
    consumer_name: '',

    // Complaint Details
    complaint_category: '',
    complaint_type: '',
    priority: 'medium',
    subject: '',
    description: '',
    affected_since: '',
    location_details: '',
    nearby_transformer: '',
    pole_number: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Reset complaint_type and documents when category changes
    if (name === 'complaint_category') {
      setFormData({ ...formData, [name]: value, complaint_type: '' });
      setUploadedDocuments({});
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDocumentUpload = async (event, docId) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should not exceed 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocuments(prev => ({
        ...prev,
        [docId]: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result.split(',')[1],
        }
      }));
      toast.success('Document uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (docId) => {
    setUploadedDocuments(prev => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });
    toast.success('Document removed');
  };

  const getRequiredDocuments = () => {
    return documentRequirements[formData.complaint_category] || [];
  };

  const hasRequiredDocuments = () => {
    const requiredDocs = getRequiredDocuments().filter(doc => doc.required);
    return requiredDocs.every(doc => uploadedDocuments[doc.id]);
  };

  const getComplaintTypeOptions = () => {
    switch (formData.complaint_category) {
      case 'supply_related':
        return supplyIssues;
      case 'billing_related':
        return billingIssues;
      case 'meter_related':
        return meterIssues;
      default:
        return [];
    }
  };

  const handleNext = () => {
    // Validation for step 0
    if (activeStep === 0) {
      if (!formData.full_name || !formData.mobile || !formData.address || !formData.city || !formData.pincode) {
        toast.error('Please fill all required fields');
        return;
      }
      if (formData.mobile.length !== 10) {
        toast.error('Mobile number must be 10 digits');
        return;
      }
    }

    // Validation for step 1
    if (activeStep === 1) {
      if (!formData.complaint_category || !formData.complaint_type || !formData.subject || !formData.description) {
        toast.error('Please fill all required complaint details');
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
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
      const complaintData = {
        ...formData,
        documents: Object.entries(uploadedDocuments).map(([docId, doc]) => ({
          id: docId,
          ...doc
        })),
      };

      const response = await api.post('/electricity/complaints/submit', complaintData);
      const cNum = response.data.complaint_number;
      const ts = new Date().toISOString();
      setComplaintNumber(cNum);
      setSubmitted(true);
      setVerifiedEmail(email);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Complaint registered successfully');
      api.post('/electricity/otp/send-receipt', {
        email,
        application_number: cNum,
        application_type: 'complaint',
        application_data: formData,
        submitted_at: ts,
      }).catch(console.warn);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to register complaint');
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Complainant Information
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please provide accurate contact details for complaint updates
              </Alert>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name *"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Father's/Husband's Name"
                name="father_husband_name"
                value={formData.father_husband_name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mobile Number *"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Alternate Mobile"
                name="alternate_mobile"
                value={formData.alternate_mobile}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Full Address *"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City *"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="District"
                name="district"
                value={formData.district}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Pincode *"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                inputProps={{ maxLength: 6 }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                Consumer Information (Optional)
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl>
                <FormLabel>Are you an existing consumer?</FormLabel>
                <RadioGroup
                  row
                  name="is_consumer"
                  value={formData.is_consumer}
                  onChange={handleChange}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.is_consumer === 'yes' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Consumer Number"
                    name="consumer_number"
                    value={formData.consumer_number}
                    onChange={handleChange}
                    helperText="Enter your electricity consumer number"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Consumer Name (as per bill)"
                    name="consumer_name"
                    value={formData.consumer_name}
                    onChange={handleChange}
                  />
                </Grid>
              </>
            )}
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Complaint Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Complaint Category *"
                name="complaint_category"
                value={formData.complaint_category}
                onChange={handleChange}
                required
              >
                {complaintCategories.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Complaint Type *"
                name="complaint_type"
                value={formData.complaint_type}
                onChange={handleChange}
                disabled={!formData.complaint_category}
                required
              >
                {getComplaintTypeOptions().map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Priority Level *</FormLabel>
                <RadioGroup
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  {priorityLevels.map((level) => (
                    <FormControlLabel
                      key={level.value}
                      value={level.value}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {level.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {level.desc}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject/Brief Description *"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="e.g., No power supply in my area since morning"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Detailed Description *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Please provide complete details about the issue..."
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Issue Started Date/Time"
                name="affected_since"
                type="datetime-local"
                value={formData.affected_since}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Exact Location/Area"
                name="location_details"
                value={formData.location_details}
                onChange={handleChange}
                placeholder="Street name, colony, area"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nearby Transformer (if known)"
                name="nearby_transformer"
                value={formData.nearby_transformer}
                onChange={handleChange}
                placeholder="Transformer ID or location"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pole Number (if visible)"
                name="pole_number"
                value={formData.pole_number}
                onChange={handleChange}
              />
            </Grid>

            {/* Dynamic Document Upload Section */}
            {formData.complaint_category && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom color="primary">
                  Required Documents
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Upload documents relevant to your <strong>{complaintCategories.find(c => c.value === formData.complaint_category)?.label}</strong> complaint.
                    Fields marked with <span style={{ color: 'red' }}>*</span> are required.
                  </Typography>
                </Alert>

                <Grid container spacing={2}>
                  {getRequiredDocuments().map((doc) => (
                    <Grid item xs={12} md={6} key={doc.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: uploadedDocuments[doc.id] ? 'success.main' : doc.required ? 'warning.main' : 'grey.300',
                          bgcolor: uploadedDocuments[doc.id] ? 'success.lighter' : 'background.paper',
                          borderRadius: 2
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {doc.name} {doc.required && <span style={{ color: 'red' }}>*</span>}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {doc.description}
                            </Typography>
                          </Box>
                          {uploadedDocuments[doc.id] && (
                            <Tooltip title="Remove document">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeDocument(doc.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>

                        {uploadedDocuments[doc.id] ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <CheckCircle color="success" fontSize="small" />
                            <Typography variant="body2" color="success.main" fontWeight={600} noWrap>
                              {uploadedDocuments[doc.id].name}
                            </Typography>
                          </Box>
                        ) : (
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUpload />}
                            size="small"
                            fullWidth
                            color={doc.required ? 'warning' : 'primary'}
                          >
                            Upload {doc.required ? '(Required)' : '(Optional)'}
                            <input
                              type="file"
                              hidden
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) => handleDocumentUpload(e, doc.id)}
                            />
                          </Button>
                        )}
                        {!uploadedDocuments[doc.id] && (
                          <QrUploadButton
                            docKey={doc.id}
                            docLabel={doc.label}
                            onFileReceived={(f) => setUploadedDocuments(prev => ({ ...prev, [doc.id]: f }))}
                          />
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {!hasRequiredDocuments() && getRequiredDocuments().some(d => d.required) && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Please upload all required documents before proceeding to review.
                  </Alert>
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="subtitle2" fontWeight={600}>
                  Emergency Helpline: 1912
                </Typography>
                <Typography variant="body2">
                  For life-threatening situations or immediate electrical hazards, please call our 24x7 emergency helpline
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Review Your Complaint
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please verify all details before submitting
            </Alert>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Complainant Details
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}><Typography variant="body2">Name:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.full_name}</Typography></Grid>

                <Grid item xs={4}><Typography variant="body2">Mobile:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.mobile}</Typography></Grid>

                <Grid item xs={4}><Typography variant="body2">Email:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.email || 'N/A'}</Typography></Grid>

                <Grid item xs={4}><Typography variant="body2">Address:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.address}, {formData.city} - {formData.pincode}</Typography></Grid>
              </Grid>
            </Paper>

            {formData.is_consumer === 'yes' && formData.consumer_number && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Consumer Information
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}><Typography variant="body2">Consumer Number:</Typography></Grid>
                  <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.consumer_number}</Typography></Grid>

                  <Grid item xs={4}><Typography variant="body2">Consumer Name:</Typography></Grid>
                  <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.consumer_name}</Typography></Grid>
                </Grid>
              </Paper>
            )}

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Complaint Information
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}><Typography variant="body2">Category:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{complaintCategories.find(c => c.value === formData.complaint_category)?.label}</Typography></Grid>

                <Grid item xs={4}><Typography variant="body2">Type:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.complaint_type}</Typography></Grid>

                <Grid item xs={4}><Typography variant="body2">Priority:</Typography></Grid>
                <Grid item xs={8}>
                  <Chip
                    label={formData.priority.toUpperCase()}
                    color={formData.priority === 'critical' ? 'error' : formData.priority === 'high' ? 'warning' : 'default'}
                    size="small"
                  />
                </Grid>

                <Grid item xs={4}><Typography variant="body2">Subject:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.subject}</Typography></Grid>

                <Grid item xs={4}><Typography variant="body2">Description:</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2">{formData.description}</Typography></Grid>

                {formData.location_details && (
                  <>
                    <Grid item xs={4}><Typography variant="body2">Location:</Typography></Grid>
                    <Grid item xs={8}><Typography variant="body2" fontWeight={600}>{formData.location_details}</Typography></Grid>
                  </>
                )}

                {Object.keys(uploadedDocuments).length > 0 && (
                  <>
                    <Grid item xs={4}><Typography variant="body2">Documents:</Typography></Grid>
                    <Grid item xs={8}>
                      {Object.entries(uploadedDocuments).map(([docId, doc]) => (
                        <Chip
                          key={docId}
                          label={`✓ ${doc.name}`}
                          size="small"
                          color="success"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>

            <Alert severity="warning">
              By submitting this complaint, you confirm that all information provided is accurate and complete.
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
          Complaint Registered Successfully!
        </Typography>
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'success.lighter', my: 3, maxWidth: 500, mx: 'auto' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your Complaint Number
          </Typography>
          <Typography variant="h4" color="primary" fontWeight={700}>
            {complaintNumber}
          </Typography>
        </Paper>
        <Typography color="text.secondary" paragraph>
          Your complaint has been registered and assigned to our technical team.
        </Typography>
        <Alert severity="info" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            What happens next?
          </Typography>
          <Typography variant="body2">
            • You will receive an SMS/Email confirmation<br />
            • Our team will assess the issue within 2-4 hours<br />
            • Resolution time depends on complaint priority<br />
            • Track your complaint status using the complaint number
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Expected Resolution Time: {formData.priority === 'critical' ? '2-4 hours' : formData.priority === 'high' ? '12-24 hours' : '24-48 hours'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
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
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={() => setShowOtpDialog(true)} color="primary">
            Submit Complaint
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

export default ComplaintForm;
