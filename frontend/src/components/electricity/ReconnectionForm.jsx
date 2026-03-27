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
  Checkbox,
} from '@mui/material';
import { CheckCircle, CloudUpload, Warning, Payment, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import QrUploadButton from './QrUploadButton';

const steps = ['Consumer & Disconnection Details', 'Payment Information', 'Documents Upload', 'Review & Submit'];

const disconnectionReasons = [
  { value: 'non_payment', label: 'Non-Payment of Bills', description: 'Connection disconnected due to unpaid bills', requiresPayment: true },
  { value: 'voluntary', label: 'Voluntary Disconnection', description: 'Consumer requested temporary disconnection', requiresPayment: false },
  { value: 'meter_theft', label: 'Meter Theft/Tampering', description: 'Disconnected due to meter tampering or theft', requiresPayment: true, requiresPoliceReport: true },
  { value: 'illegal_connection', label: 'Illegal/Unauthorized Connection', description: 'Unauthorized use detected', requiresPayment: true, requiresPenalty: true },
  { value: 'safety_issue', label: 'Safety Issue/Hazard', description: 'Disconnected for safety reasons', requiresPayment: false, requiresInspection: true },
  { value: 'renovation', label: 'Property Renovation/Demolition', description: 'Temporary disconnection during construction', requiresPayment: false },
  { value: 'court_order', label: 'Court Order', description: 'Disconnected as per court directive', requiresPayment: false, requiresCourtOrder: true },
  { value: 'other', label: 'Other Reasons', description: 'Any other valid reason', requiresPayment: false },
];

const paymentModes = [
  { value: 'online', label: 'Online Payment (Card/UPI/Net Banking)' },
  { value: 'cash', label: 'Cash at Office Counter' },
  { value: 'cheque', label: 'Cheque/Demand Draft' },
  { value: 'bank_transfer', label: 'Bank Transfer/NEFT/RTGS' },
];

const ReconnectionForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({
    payment_proof: null,
    id_proof: null,
    address_proof: null,
    police_report: null,
    court_order: null,
    undertaking: null,
  });

  const [formData, setFormData] = useState({
    // Consumer Details
    consumer_number: '',
    consumer_name: '',
    mobile_number: '',
    alternate_mobile: '',
    email: '',
    installation_address: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    
    // Disconnection Details
    disconnection_reason: '',
    disconnection_date: '',
    disconnection_order_number: '',
    detailed_reason: '',
    meter_number: '',
    last_bill_date: '',
    
    // Payment Information
    outstanding_amount: '',
    reconnection_fee: '500',
    security_deposit: '',
    total_amount: '',
    payment_mode: '',
    payment_reference: '',
    payment_date: '',
    bank_name: '',
    cheque_number: '',
    cheque_date: '',
    
    // Request Details
    requested_reconnection_date: '',
    urgent_request: 'no',
    urgency_reason: '',
    
    // Declaration
    agree_to_terms: false,
    undertaking_accepted: false,
    no_pending_complaint: false,
    declaration_name: '',
    declaration_place: '',
    declaration_date: '',
  });

  const selectedReason = disconnectionReasons.find(r => r.value === formData.disconnection_reason);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    const newFormData = { 
      ...formData, 
      [name]: newValue 
    };

    // Auto-calculate total amount
    if (name === 'outstanding_amount' || name === 'reconnection_fee' || name === 'security_deposit') {
      const outstanding = parseFloat(newFormData.outstanding_amount) || 0;
      const reconnection = parseFloat(newFormData.reconnection_fee) || 0;
      const deposit = parseFloat(newFormData.security_deposit) || 0;
      newFormData.total_amount = (outstanding + reconnection + deposit).toString();
    }

    setFormData(newFormData);
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
      if (!formData.consumer_number || !formData.consumer_name || !formData.mobile_number || !formData.disconnection_reason) {
        toast.error('Please fill all required consumer and disconnection details');
        return;
      }
      if (formData.mobile_number.length !== 10) {
        toast.error('Mobile number must be 10 digits');
        return;
      }
    }
    
    if (activeStep === 1) {
      if (!formData.outstanding_amount || !formData.total_amount) {
        toast.error('Please fill payment information');
        return;
      }
      if (parseFloat(formData.outstanding_amount) > 0 && !formData.payment_reference) {
        toast.error('Payment reference is required for outstanding dues');
        return;
      }
    }
    
    if (activeStep === 2) {
      if (!uploadedDocs.payment_proof && parseFloat(formData.outstanding_amount) > 0) {
        toast.error('Please upload payment proof for outstanding dues');
        return;
      }
      if (!uploadedDocs.id_proof || !uploadedDocs.undertaking) {
        toast.error('Please upload all mandatory documents');
        return;
      }
      if (selectedReason?.requiresPoliceReport && !uploadedDocs.police_report) {
        toast.error('Police report is required for this disconnection reason');
        return;
      }
      if (selectedReason?.requiresCourtOrder && !uploadedDocs.court_order) {
        toast.error('Court order is required for this disconnection reason');
        return;
      }
      if (!formData.agree_to_terms || !formData.undertaking_accepted || !formData.no_pending_complaint) {
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
        application_type: 'Reconnection',
        documents: documentsArray,
        status: 'Pending',
        submission_date: new Date().toISOString(),
      };

      const response = await api.post('/electricity/applications/submit', {
        application_type: 'reconnection',
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
        application_type: 'reconnection',
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

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Consumer Details
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
                      helperText="Your registered consumer number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Consumer Name"
                      name="consumer_name"
                      value={formData.consumer_name}
                      onChange={handleChange}
                      required
                      helperText="Name as per records"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleChange}
                      required
                      inputProps={{ maxLength: 10 }}
                      helperText="For SMS updates"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Alternate Mobile"
                      name="alternate_mobile"
                      value={formData.alternate_mobile}
                      onChange={handleChange}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      helperText="For email notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Meter Number"
                      name="meter_number"
                      value={formData.meter_number}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Installation Address"
                      name="installation_address"
                      value={formData.installation_address}
                      onChange={handleChange}
                      multiline
                      rows={2}
                      placeholder="Complete address where connection was disconnected"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="District"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="PIN Code"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                  Disconnection Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Reason for Disconnection"
                      name="disconnection_reason"
                      value={formData.disconnection_reason}
                      onChange={handleChange}
                      required
                    >
                      {disconnectionReasons.map((reason) => (
                        <MenuItem key={reason.value} value={reason.value}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{reason.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reason.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {selectedReason && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="body2" fontWeight="bold">{selectedReason.label}</Typography>
                        <Typography variant="caption">{selectedReason.description}</Typography>
                        {selectedReason.requiresPayment && (
                          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'error.main' }}>
                            ⚠️ Payment clearance required
                          </Typography>
                        )}
                        {selectedReason.requiresPenalty && (
                          <Typography variant="caption" display="block" sx={{ color: 'error.main' }}>
                            ⚠️ Penalty charges applicable
                          </Typography>
                        )}
                        {selectedReason.requiresPoliceReport && (
                          <Typography variant="caption" display="block" sx={{ color: 'warning.main' }}>
                            📄 Police FIR/Report required
                          </Typography>
                        )}
                        {selectedReason.requiresInspection && (
                          <Typography variant="caption" display="block" sx={{ color: 'info.main' }}>
                            🔍 Site inspection mandatory
                          </Typography>
                        )}
                      </Alert>
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Disconnection Date"
                      name="disconnection_date"
                      type="date"
                      value={formData.disconnection_date}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Disconnection Order Number"
                      name="disconnection_order_number"
                      value={formData.disconnection_order_number}
                      onChange={handleChange}
                      helperText="If available"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Bill Date"
                      name="last_bill_date"
                      type="date"
                      value={formData.last_bill_date}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Requested Reconnection Date"
                      name="requested_reconnection_date"
                      type="date"
                      value={formData.requested_reconnection_date}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      helperText="Preferred date for reconnection"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Detailed Reason"
                      name="detailed_reason"
                      value={formData.detailed_reason}
                      onChange={handleChange}
                      multiline
                      rows={3}
                      placeholder="Provide detailed explanation about the disconnection and need for reconnection"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel>Is this an urgent request?</FormLabel>
                      <RadioGroup
                        row
                        name="urgent_request"
                        value={formData.urgent_request}
                        onChange={handleChange}
                      >
                        <FormControlLabel value="no" control={<Radio />} label="No (Normal Processing)" />
                        <FormControlLabel value="yes" control={<Radio />} label="Yes (Urgent)" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  {formData.urgent_request === 'yes' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Urgency Reason"
                        name="urgency_reason"
                        value={formData.urgency_reason}
                        onChange={handleChange}
                        multiline
                        rows={2}
                        placeholder="Explain why urgent reconnection is needed (e.g., medical emergency, business loss, etc.)"
                        required
                      />
                    </Grid>
                  )}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Payment sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    Payment Information
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Outstanding Amount (₹)"
                      name="outstanding_amount"
                      type="number"
                      value={formData.outstanding_amount}
                      onChange={handleChange}
                      required
                      inputProps={{ min: '0', step: '0.01' }}
                      helperText="Enter 0 if no dues"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Reconnection Fee (₹)"
                      name="reconnection_fee"
                      type="number"
                      value={formData.reconnection_fee}
                      onChange={handleChange}
                      required
                      inputProps={{ min: '0', step: '50' }}
                      helperText="Standard: ₹500-1000"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Security Deposit (₹)"
                      name="security_deposit"
                      type="number"
                      value={formData.security_deposit}
                      onChange={handleChange}
                      inputProps={{ min: '0', step: '100' }}
                      helperText="If applicable (Refundable)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: '#e3f2fd', textAlign: 'center' }}>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        Total Amount Payable: ₹{formData.total_amount || '0'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Outstanding + Reconnection Fee + Security Deposit)
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {parseFloat(formData.outstanding_amount) > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                    Payment Details for Outstanding Dues
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        select
                        label="Payment Mode"
                        name="payment_mode"
                        value={formData.payment_mode}
                        onChange={handleChange}
                        required
                      >
                        {paymentModes.map((mode) => (
                          <MenuItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Payment Reference/Transaction ID"
                        name="payment_reference"
                        value={formData.payment_reference}
                        onChange={handleChange}
                        required
                        helperText="Receipt/Transaction number"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Payment Date"
                        name="payment_date"
                        type="date"
                        value={formData.payment_date}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleChange}
                        helperText="Bank through which payment made"
                      />
                    </Grid>
                    {formData.payment_mode === 'cheque' && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Cheque Number"
                            name="cheque_number"
                            value={formData.cheque_number}
                            onChange={handleChange}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Cheque Date"
                            name="cheque_date"
                            type="date"
                            value={formData.cheque_date}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            required
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Payment Guidelines:
                </Typography>
                <Typography variant="caption" component="div">
                  • Clear all outstanding dues before reconnection request
                </Typography>
                <Typography variant="caption" component="div">
                  • Reconnection fee is non-refundable
                </Typography>
                <Typography variant="caption" component="div">
                  • Security deposit (if any) will be adjusted in future bills
                </Typography>
                <Typography variant="caption" component="div">
                  • Keep payment receipts for verification
                </Typography>
                {selectedReason?.requiresPenalty && (
                  <Typography variant="caption" component="div" sx={{ color: 'error.main', mt: 1 }}>
                    ⚠️ Additional penalty charges may apply based on disconnection reason
                  </Typography>
                )}
              </Alert>
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
                  Please upload clear scanned copies or photographs of required documents.
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
                    <Checkbox
                      checked={formData.agree_to_terms}
                      onChange={(e) => setFormData({ ...formData, agree_to_terms: e.target.checked })}
                      name="agree_to_terms"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I declare that all information provided is true and correct. I understand that providing false information may lead to rejection and legal action.
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.undertaking_accepted}
                      onChange={(e) => setFormData({ ...formData, undertaking_accepted: e.target.checked })}
                      name="undertaking_accepted"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I undertake to comply with all electricity supply regulations and will not indulge in any unauthorized activities. I accept responsibility for all future bills and charges.
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.no_pending_complaint}
                      onChange={(e) => setFormData({ ...formData, no_pending_complaint: e.target.checked })}
                      name="no_pending_complaint"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I confirm that there are no pending complaints or legal proceedings related to this connection.
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

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Processing Fees & Charges:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Reconnection Fee: ₹{formData.reconnection_fee}
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Site Inspection: ₹200 (if required)
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Expected Timeline: 4-7 working days
                  </Typography>
                  {formData.urgent_request === 'yes' && (
                    <Typography variant="caption" component="div" sx={{ color: 'error.main' }}>
                      • Urgent Processing: Additional ₹500
                    </Typography>
                  )}
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
                    Consumer Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Consumer Number:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.consumer_number}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Name:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.consumer_name}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Mobile:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.mobile_number}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Address:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.installation_address}</Typography></Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                    Disconnection Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Reason:</Typography></Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="bold">
                        {disconnectionReasons.find(r => r.value === formData.disconnection_reason)?.label}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Disconnection Date:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.disconnection_date || 'N/A'}</Typography></Grid>
                    {formData.urgent_request === 'yes' && (
                      <>
                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Urgent Request:</Typography></Grid>
                        <Grid item xs={6}><Chip label="URGENT" color="error" size="small" /></Grid>
                      </>
                    )}
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                    Payment Information
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Outstanding Amount:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">₹{formData.outstanding_amount}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Reconnection Fee:</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontWeight="bold">₹{formData.reconnection_fee}</Typography></Grid>
                    {parseFloat(formData.security_deposit) > 0 && (
                      <>
                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Security Deposit:</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" fontWeight="bold">₹{formData.security_deposit}</Typography></Grid>
                      </>
                    )}
                    <Grid item xs={6}><Typography variant="body2" color="text.secondary">Total Amount:</Typography></Grid>
                    <Grid item xs={6}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        ₹{formData.total_amount}
                      </Typography>
                    </Grid>
                    {formData.payment_reference && (
                      <>
                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Payment Reference:</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{formData.payment_reference}</Typography></Grid>
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

                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold">
                    Important Reminders:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Processing time: 4-7 working days
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Site inspection will be conducted before reconnection
                  </Typography>
                  <Typography variant="caption" component="div">
                    • SMS/Email updates will be sent to registered contacts
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Technician will contact you before visit
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Keep all original documents ready for verification
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

  const getRequiredDocuments = () => {
    const baseDocs = [
      { key: 'payment_proof', label: 'Payment Proof for Outstanding Dues', required: parseFloat(formData.outstanding_amount) > 0 },
      { key: 'id_proof', label: 'Consumer Identity Proof (Aadhaar/PAN)', required: true },
      { key: 'address_proof', label: 'Address Proof', required: false },
      { key: 'undertaking', label: 'Undertaking/Affidavit on ₹100 Stamp Paper', required: true },
    ];

    if (selectedReason?.requiresPoliceReport) {
      baseDocs.push({ key: 'police_report', label: 'Police FIR/Report', required: true });
    }
    if (selectedReason?.requiresCourtOrder) {
      baseDocs.push({ key: 'court_order', label: 'Court Order Document', required: true });
    }

    return baseDocs;
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
              📱 Reconnection Process Timeline
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Step 1:</strong> Payment Verification (1-2 working days)
              <br />
              Our team will verify all payment proofs and clearances.
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Step 2:</strong> Site Inspection (2-3 working days)
              <br />
              Field technician will inspect the installation for safety compliance.
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Step 3:</strong> Reconnection (1-2 working days)
              <br />
              Connection will be restored after approval.
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
              <strong>Total Expected Time:</strong> 4-7 working days
            </Typography>
            {formData.urgent_request === 'yes' && (
              <Typography variant="body2" component="div" sx={{ mt: 1, color: 'warning.main', fontWeight: 'bold' }}>
                ⚡ Urgent request noted - Will be prioritized
              </Typography>
            )}
          </Alert>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              ⚠️ Important Instructions
            </Typography>
            <Typography variant="caption" component="div">
              • Ensure all outstanding dues are cleared
            </Typography>
            <Typography variant="caption" component="div">
              • Keep original payment receipts for verification
            </Typography>
            <Typography variant="caption" component="div">
              • Technician will contact you before visit
            </Typography>
            <Typography variant="caption" component="div">
              • Reconnection fee: ₹{formData.reconnection_fee}
            </Typography>
            {parseFloat(formData.security_deposit) > 0 && (
              <Typography variant="caption" component="div">
                • Security deposit: ₹{formData.security_deposit} (Refundable)
              </Typography>
            )}
            <Typography variant="caption" component="div">
              • Total amount paid: ₹{formData.total_amount}
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
              📍 Track Your Application
            </Typography>
            <Typography variant="caption" display="block">
              • SMS updates to {formData.mobile_number}
            </Typography>
            <Typography variant="caption" display="block">
              • Online tracking with application number
            </Typography>
            <Typography variant="caption" display="block">
              • Helpline: 1912 (Toll-free, 24×7)
            </Typography>
            <Typography variant="caption" display="block">
              • Email: reconnection@suvidha.gov.in
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
          applicationType="reconnection"
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
        initialEmail={formData.email || ''}
      />
    </Box>
  );
};

export default ReconnectionForm;
