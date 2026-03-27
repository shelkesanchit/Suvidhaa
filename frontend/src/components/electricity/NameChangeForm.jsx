import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CheckCircle, CloudUpload, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import QrUploadButton from './QrUploadButton';

const steps = ['Consumer & Applicant Details', 'Name Change Information', 'Documents Upload', 'Review & Submit'];

const nameChangeReasons = [
  { value: 'ownership_transfer', label: 'Ownership Transfer (Sale/Purchase)', description: 'Transfer of connection due to sale or purchase of property' },
  { value: 'legal_heir', label: 'Legal Heir/Succession', description: 'Transfer to legal heir after death of consumer' },
  { value: 'marriage', label: 'After Marriage', description: 'Name change after marriage' },
  { value: 'divorce', label: 'After Divorce', description: 'Name change after divorce' },
  { value: 'spelling_correction', label: 'Spelling Correction', description: 'Correction of spelling error in name' },
  { value: 'court_order', label: 'Court Order/Gazette', description: 'Name change as per court order or gazette notification' },
  { value: 'adoption', label: 'Adoption', description: 'Name change due to adoption' },
  { value: 'partition', label: 'Property Partition', description: 'Transfer due to property partition among family members' },
  { value: 'other', label: 'Other', description: 'Any other valid reason' },
];

const relationTypes = [
  'Self', 'Son/Daughter', 'Spouse', 'Father/Mother', 'Brother/Sister', 
  'Grandson/Granddaughter', 'Son-in-law/Daughter-in-law', 'Legal Heir', 'Buyer', 'Other'
];

const NameChangeForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({
    electricity_bill: null,
    identity_proof_old: null,
    identity_proof_new: null,
    address_proof: null,
    ownership_proof: null,
    relationship_proof: null,
    affidavit: null,
    noc: null,
  });

  const [formData, setFormData] = useState({
    // Current Consumer Details
    consumer_number: '',
    current_consumer_name: '',
    current_mobile: '',
    current_email: '',
    installation_address: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    meter_number: '',
    
    // New Consumer/Applicant Details
    new_consumer_name: '',
    new_mobile: '',
    new_alternate_mobile: '',
    new_email: '',
    new_address_same: 'yes',
    new_address: '',
    new_city: '',
    new_district: '',
    new_state: '',
    new_pincode: '',
    
    // Applicant Personal Details
    father_husband_name: '',
    date_of_birth: '',
    gender: '',
    occupation: '',
    
    // Name Change Details
    reason_for_change: '',
    detailed_reason: '',
    relationship_with_old_consumer: '',
    date_of_event: '', // death date, marriage date, sale date, etc.
    
    // Legal Documents
    has_court_order: 'no',
    court_order_number: '',
    court_order_date: '',
    gazette_notification: '',
    
    // Transfer Details (for ownership transfer)
    is_transfer: 'no',
    transfer_type: '', // sale, gift, inheritance
    transfer_date: '',
    consideration_amount: '',
    
    // Declaration
    agree_to_terms: false,
    undertaking_accepted: false,
    declaration_name: '',
    declaration_place: '',
    declaration_date: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
    
    // Auto-fill new address if same as old
    if (name === 'new_address_same' && value === 'yes') {
      setFormData(prev => ({
        ...prev,
        new_address: prev.installation_address,
        new_city: prev.city,
        new_district: prev.district,
        new_state: prev.state,
        new_pincode: prev.pincode,
      }));
    }
    
    // Determine if it's a transfer
    if (name === 'reason_for_change') {
      const transferReasons = ['ownership_transfer', 'legal_heir', 'partition'];
      setFormData(prev => ({
        ...prev,
        is_transfer: transferReasons.includes(value) ? 'yes' : 'no'
      }));
    }
  };

  const handleFileChange = (docType) => async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should not exceed 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result.split(',')[1],
        }
      }));
      toast.success(`${file.name} uploaded successfully`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!formData.consumer_number || !formData.current_consumer_name || !formData.current_mobile || !formData.installation_address) {
        toast.error('Please fill all required consumer details');
        return;
      }
      if (formData.current_mobile.length !== 10) {
        toast.error('Mobile number must be 10 digits');
        return;
      }
    }
    
    if (activeStep === 1) {
      if (!formData.new_consumer_name || !formData.new_mobile || !formData.reason_for_change) {
        toast.error('Please fill all required name change details');
        return;
      }
      if (formData.new_consumer_name === formData.current_consumer_name) {
        toast.error('New name must be different from current name');
        return;
      }
    }
    
    if (activeStep === 2) {
      if (!uploadedDocs.electricity_bill || !uploadedDocs.identity_proof_new || !uploadedDocs.affidavit) {
        toast.error('Please upload all mandatory documents');
        return;
      }
      if (formData.is_transfer === 'yes' && !uploadedDocs.ownership_proof) {
        toast.error('Please upload ownership transfer documents');
        return;
      }
      if (!formData.agree_to_terms || !formData.undertaking_accepted) {
        toast.error('Please accept all declarations');
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
    setLoading(true);

    try {
      // Prepare documents array
      const documentsArray = [];
      Object.keys(uploadedDocs).forEach((docType) => {
        if (uploadedDocs[docType]) {
          documentsArray.push({
            type: docType.replace(/_/g, ' ').toUpperCase(),
            name: uploadedDocs[docType].name,
            data: uploadedDocs[docType].data,
            mimeType: uploadedDocs[docType].type,
          });
        }
      });

      const applicationData = {
        ...formData,
        application_type: 'Name Change',
        documents: documentsArray,
        status: 'Pending',
        submission_date: new Date().toISOString(),
      };

      const response = await api.post('/electricity/applications/submit', {
        application_type: 'name_change',
        application_data: formData,
        documents: documentsArray,
      });

      const appNum = response.data.application_number;
      const ts = new Date().toISOString();
      setApplicationNumber(appNum);
      setSuccess(true);
      setVerifiedEmail(email);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Application submitted successfully!');
      api.post('/electricity/otp/send-receipt', {
        email,
        application_number: appNum,
        application_type: 'change_of_name',
        application_data: formData,
        submitted_at: ts,
      }).catch(console.warn);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRequiredDocuments = () => {
    const baseDocs = [
      { key: 'electricity_bill', label: 'Latest Electricity Bill', required: true },
      { key: 'identity_proof_new', label: 'New Consumer Identity Proof (Aadhaar/PAN)', required: true },
      { key: 'address_proof', label: 'Address Proof', required: false },
      { key: 'affidavit', label: 'Affidavit/Undertaking on ₹100 Stamp Paper', required: true },
    ];

    const reasonDocs = {
      ownership_transfer: [
        { key: 'ownership_proof', label: 'Sale Deed/Transfer Deed', required: true },
        { key: 'noc', label: 'NOC from Previous Owner', required: false },
      ],
      legal_heir: [
        { key: 'ownership_proof', label: 'Death Certificate', required: true },
        { key: 'relationship_proof', label: 'Legal Heir Certificate', required: true },
      ],
      marriage: [
        { key: 'relationship_proof', label: 'Marriage Certificate', required: true },
      ],
      divorce: [
        { key: 'relationship_proof', label: 'Divorce Decree', required: true },
      ],
      court_order: [
        { key: 'relationship_proof', label: 'Court Order/Gazette Notification', required: true },
      ],
      adoption: [
        { key: 'relationship_proof', label: 'Adoption Certificate', required: true },
      ],
      partition: [
        { key: 'ownership_proof', label: 'Partition Deed', required: true },
      ],
    };

    const additionalDocs = reasonDocs[formData.reason_for_change] || [];
    return [...baseDocs, ...additionalDocs];
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Current Consumer Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Consumer Number"
                      name="consumer_number"
                      value={formData.consumer_number}
                      onChange={handleChange}
                      required
                      placeholder="EC2026XXXXXX"
                      helperText="Enter your existing consumer number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Current Consumer Name"
                      name="current_consumer_name"
                      value={formData.current_consumer_name}
                      onChange={handleChange}
                      required
                      helperText="Name as per current records"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      name="current_mobile"
                      value={formData.current_mobile}
                      onChange={handleChange}
                      required
                      inputProps={{ maxLength: 10 }}
                      helperText="Registered mobile number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="current_email"
                      type="email"
                      value={formData.current_email}
                      onChange={handleChange}
                      helperText="For communication"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Meter Number"
                      name="meter_number"
                      value={formData.meter_number}
                      onChange={handleChange}
                      helperText="Meter serial number"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Installation Address (Current Supply Location)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Complete Address"
                      name="installation_address"
                      value={formData.installation_address}
                      onChange={handleChange}
                      required
                      multiline
                      rows={2}
                      placeholder="House/Flat No., Building Name, Street Name"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Landmark"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleChange}
                      placeholder="Nearby landmark"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="District"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PIN Code"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      required
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  New Consumer/Applicant Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="New Consumer Name"
                      name="new_consumer_name"
                      value={formData.new_consumer_name}
                      onChange={handleChange}
                      required
                      helperText="Name to be registered"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Father's/Husband's Name"
                      name="father_husband_name"
                      value={formData.father_husband_name}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl component="fieldset" required>
                      <FormLabel component="legend">Gender</FormLabel>
                      <RadioGroup
                        row
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                      >
                        <FormControlLabel value="male" control={<Radio />} label="Male" />
                        <FormControlLabel value="female" control={<Radio />} label="Female" />
                        <FormControlLabel value="other" control={<Radio />} label="Other" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Occupation"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      name="new_mobile"
                      value={formData.new_mobile}
                      onChange={handleChange}
                      required
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Alternate Mobile"
                      name="new_alternate_mobile"
                      value={formData.new_alternate_mobile}
                      onChange={handleChange}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="new_email"
                      type="email"
                      value={formData.new_email}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                  Correspondence Address
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <FormControl component="fieldset">
                  <FormLabel>Is new address same as installation address?</FormLabel>
                  <RadioGroup
                    row
                    name="new_address_same"
                    value={formData.new_address_same}
                    onChange={handleChange}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                    <FormControlLabel value="no" control={<Radio />} label="No" />
                  </RadioGroup>
                </FormControl>

                {formData.new_address_same === 'no' && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Complete Address"
                        name="new_address"
                        value={formData.new_address}
                        onChange={handleChange}
                        multiline
                        rows={2}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="City"
                        name="new_city"
                        value={formData.new_city}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="District"
                        name="new_district"
                        value={formData.new_district}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="State"
                        name="new_state"
                        value={formData.new_state}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="PIN Code"
                        name="new_pincode"
                        value={formData.new_pincode}
                        onChange={handleChange}
                        inputProps={{ maxLength: 6 }}
                        required
                      />
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Name Change Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Reason for Name Change"
                      name="reason_for_change"
                      value={formData.reason_for_change}
                      onChange={handleChange}
                      required
                    >
                      {nameChangeReasons.map((reason) => (
                        <MenuItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Relationship with Current Consumer"
                      name="relationship_with_old_consumer"
                      value={formData.relationship_with_old_consumer}
                      onChange={handleChange}
                      required
                    >
                      {relationTypes.map((rel) => (
                        <MenuItem key={rel} value={rel}>
                          {rel}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {formData.reason_for_change && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="body2" fontWeight="bold">
                          {nameChangeReasons.find(r => r.value === formData.reason_for_change)?.label}
                        </Typography>
                        <Typography variant="caption">
                          {nameChangeReasons.find(r => r.value === formData.reason_for_change)?.description}
                        </Typography>
                      </Alert>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Detailed Reason"
                      name="detailed_reason"
                      value={formData.detailed_reason}
                      onChange={handleChange}
                      multiline
                      rows={3}
                      placeholder="Provide detailed explanation for the name change"
                    />
                  </Grid>

                  {['legal_heir', 'marriage', 'divorce', 'ownership_transfer'].includes(formData.reason_for_change) && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={
                          formData.reason_for_change === 'legal_heir' ? 'Date of Death' :
                          formData.reason_for_change === 'marriage' ? 'Date of Marriage' :
                          formData.reason_for_change === 'divorce' ? 'Date of Divorce' :
                          'Date of Transfer'
                        }
                        name="date_of_event"
                        type="date"
                        value={formData.date_of_event}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                  )}

                  {formData.reason_for_change === 'court_order' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Court Order Number"
                          name="court_order_number"
                          value={formData.court_order_number}
                          onChange={handleChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Court Order Date"
                          name="court_order_date"
                          type="date"
                          value={formData.court_order_date}
                          onChange={handleChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Gazette Notification Number"
                          name="gazette_notification"
                          value={formData.gazette_notification}
                          onChange={handleChange}
                        />
                      </Grid>
                    </>
                  )}

                  {formData.is_transfer === 'yes' && (
                    <>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          select
                          label="Transfer Type"
                          name="transfer_type"
                          value={formData.transfer_type}
                          onChange={handleChange}
                        >
                          <MenuItem value="sale">Sale</MenuItem>
                          <MenuItem value="gift">Gift</MenuItem>
                          <MenuItem value="inheritance">Inheritance</MenuItem>
                          <MenuItem value="partition">Partition</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Transfer Date"
                          name="transfer_date"
                          type="date"
                          value={formData.transfer_date}
                          onChange={handleChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Consideration Amount (₹)"
                          name="consideration_amount"
                          type="number"
                          value={formData.consideration_amount}
                          onChange={handleChange}
                          placeholder="0"
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        );

      case 2:
        const requiredDocs = getRequiredDocuments();
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  📄 Document Upload
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Please upload clear scanned copies or photographs of the following documents.
                  Maximum file size: 5MB per document. Supported formats: PDF, JPG, PNG
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  {requiredDocs.map((doc) => (
                    <Grid item xs={12} sm={6} key={doc.key}>
                      <Box
                        sx={{
                          p: 2,
                          border: '2px dashed',
                          borderColor: uploadedDocs[doc.key] ? 'success.main' : 'grey.300',
                          borderRadius: 1,
                          textAlign: 'center',
                          bgcolor: uploadedDocs[doc.key] ? 'success.50' : 'background.paper',
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          {doc.label} {doc.required && <Chip label="Required" size="small" color="error" />}
                        </Typography>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange(doc.key)}
                          style={{ display: 'none' }}
                          id={`upload-${doc.key}`}
                        />
                        <label htmlFor={`upload-${doc.key}`}>
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={uploadedDocs[doc.key] ? <CheckCircle /> : <CloudUpload />}
                            size="small"
                            color={uploadedDocs[doc.key] ? 'success' : 'primary'}
                          >
                            {uploadedDocs[doc.key] ? 'Uploaded' : 'Choose File'}
                          </Button>
                        </label>
                        {uploadedDocs[doc.key] && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }} color="success.main">
                            ✓ {uploadedDocs[doc.key].name}
                          </Typography>
                        )}
                        <QrUploadButton
                          docKey={doc.key}
                          docLabel={doc.label}
                          onFileReceived={(f) => setUploadedDocs(prev => ({ ...prev, [doc.key]: f }))}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="h6" color="warning.main" gutterBottom>
                  ⚠️ Declaration & Undertaking
                </Typography>
                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Radio
                      checked={formData.agree_to_terms}
                      onChange={(e) => handleChange({ target: { name: 'agree_to_terms', value: e.target.checked, type: 'checkbox' } })}
                      name="agree_to_terms"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I declare that the information provided above is true and correct to the best of my knowledge.
                      I understand that any false information may lead to rejection of the application and legal action.
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Radio
                      checked={formData.undertaking_accepted}
                      onChange={(e) => handleChange({ target: { name: 'undertaking_accepted', value: e.target.checked, type: 'checkbox' } })}
                      name="undertaking_accepted"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I undertake to pay all outstanding dues, if any, on the existing connection before the name change is processed.
                      I shall be responsible for all future bills and charges related to this connection.
                    </Typography>
                  }
                />

                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Applicant Name"
                        name="declaration_name"
                        value={formData.declaration_name}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Place"
                        name="declaration_place"
                        value={formData.declaration_place}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Date"
                        name="declaration_date"
                        type="date"
                        value={formData.declaration_date}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Processing Fees & Timeline:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Application Processing Fee: ₹100
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Name Change Processing Fee: ₹200
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Expected Processing Time: 15-20 working days
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  📋 Review Your Application
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Please review all information carefully before submitting
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                    Current Consumer Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Consumer Number:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.consumer_number}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Current Name:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.current_consumer_name}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Mobile:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.current_mobile}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Installation Address:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.installation_address}, {formData.city}</Typography></Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                    New Consumer Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">New Name:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.new_consumer_name}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Father's/Husband's Name:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.father_husband_name}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Date of Birth:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.date_of_birth}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Gender:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.gender}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Mobile:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.new_mobile}</Typography></Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                    Name Change Information
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Reason:</Typography></Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="bold">
                        {nameChangeReasons.find(r => r.value === formData.reason_for_change)?.label}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Relationship:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.relationship_with_old_consumer}</Typography></Grid>
                    {formData.detailed_reason && (
                      <>
                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Details:</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.detailed_reason}</Typography></Grid>
                      </>
                    )}
                    {formData.is_transfer === 'yes' && (
                      <>
                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Transfer Type:</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.transfer_type}</Typography></Grid>
                        {formData.consideration_amount && (
                          <>
                            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Amount:</Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2" fontWeight="bold">₹{formData.consideration_amount}</Typography></Grid>
                          </>
                        )}
                      </>
                    )}
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="info.main" gutterBottom>
                    Documents Uploaded
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.keys(uploadedDocs).filter(key => uploadedDocs[key]).map((docKey) => (
                      <Grid item xs={12} key={docKey}>
                        <Chip
                          icon={<CheckCircle />}
                          label={`${docKey.replace(/_/g, ' ').toUpperCase()}: ${uploadedDocs[docKey].name}`}
                          color="success"
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Alert severity="warning">
                  <Typography variant="body2" fontWeight="bold">
                    Important Notes:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Processing time: 15-20 working days from document verification
                  </Typography>
                  <Typography variant="caption" component="div">
                    • You will be notified via SMS/Email about application status
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Clear all pending dues before name change is finalized
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Original documents may be required for verification
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <Box>
        <DialogContent sx={{ mt: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Application Number
            </Typography>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5', display: 'inline-block' }}>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {applicationNumber}
              </Typography>
            </Paper>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Please save this number for future reference
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              📱 What Happens Next?
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Step 1:</strong> Document Verification (3-5 working days)
              <br />
              Your uploaded documents will be verified by our team.
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Step 2:</strong> Field Inspection (if required) (5-7 working days)
              <br />
              Our technician may visit for verification.
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Step 3:</strong> Processing & Approval (7-10 working days)
              <br />
              Name change will be processed after clearing all dues.
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Total Expected Time:</strong> 15-20 working days
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              ⚠️ Important Instructions
            </Typography>
            <Typography variant="caption" component="div">
              • Clear all pending electricity bills before name change
            </Typography>
            <Typography variant="caption" component="div">
              • Keep original documents ready for verification if requested
            </Typography>
            <Typography variant="caption" component="div">
              • You will receive SMS/Email notifications at each stage
            </Typography>
            <Typography variant="caption" component="div">
              • Visit nearest office with application number if urgent
            </Typography>
            <Typography variant="caption" component="div">
              • Processing fee of ₹300 will be adjusted in next bill
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
              📍 Track Your Application
            </Typography>
            <Typography variant="caption" display="block">
              • Online: Visit our portal with application number
            </Typography>
            <Typography variant="caption" display="block">
              • Call: 1912 (Toll-free helpline)
            </Typography>
            <Typography variant="caption" display="block">
              • SMS: Send STATUS {applicationNumber} to 9876543210
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setShowReceipt(true)}>
            Print Receipt
          </Button>
          <Button variant="contained" size="large" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
        <ApplicationReceipt
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          applicationNumber={applicationNumber}
          applicationType="change_of_name"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={e => e.preventDefault()}>
        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setShowOtpDialog(true)}
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </Box>
      </form>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.new_consumer_email || formData.email || ''}
      />
    </Box>
  );
};

export default NameChangeForm;
