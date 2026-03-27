import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { buildDocumentPayload, validateFile } from './formUtils';
import DocUpload from '../municipal/DocUpload';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const GasNewConnectionForm = ({ onClose, gasType = 'lpg' }) => {
  const isPNG = gasType === 'png';
  const steps = ['Applicant', 'Connection', 'Documents', 'Review'];

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');

  const [formData, setFormData] = useState({
    applicant_name: '',
    father_spouse_name: '',
    date_of_birth: '',
    gender: '',
    mobile: '',
    alternate_mobile: '',
    aadhaar_number: '',
    email: '',
    occupation: '',
    annual_income: '',
    family_members: '',
    provider: '',
    connection_type: 'domestic',
    property_type: 'residential',
    ownership_type: 'owned',
    gas_usage: isPNG ? 'cooking' : 'domestic',
    subsidy_required: false,
    ration_card_number: '',
    bank_account_last4: '',
    address: '',
    landmark: '',
    city: '',
    pincode: '',
    preferred_installation_date: '',
    additional_notes: '',
    agrees_to_terms: false,
  });

  const [docs, setDocs] = useState({
    aadhaar_doc: null,
    address_proof_doc: null,
    property_doc: null,
    photo_doc: null,
    noc_doc: null,
  });

  const providerOptions = useMemo(() => {
    if (isPNG) return ['MGL', 'IGL', 'Adani Gas', 'Gujarat Gas', 'Other'];
    return ['Indane', 'Bharat Gas', 'HP Gas', 'Other'];
  }, [isPNG]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onDocChange = (name, file) => {
    if (!file) return;
    const error = validateFile(file, 5);
    if (error) {
      toast.error(error);
      return;
    }
    setDocs((prev) => ({ ...prev, [name]: file }));
    toast.success(`${file.name} selected`);
  };

  const validateCurrentStep = () => {
    if (activeStep === 0) {
      if (!formData.applicant_name || !formData.mobile || !formData.aadhaar_number || !formData.father_spouse_name || !formData.date_of_birth || !formData.gender) {
        toast.error('Please fill all required applicant fields');
        return false;
      }
      if (!/^\d{10}$/.test(formData.mobile)) {
        toast.error('Enter valid 10-digit mobile number');
        return false;
      }
      if (formData.alternate_mobile && !/^\d{10}$/.test(formData.alternate_mobile)) {
        toast.error('Enter valid alternate mobile number');
        return false;
      }
      if (!/^\d{12}$/.test(formData.aadhaar_number)) {
        toast.error('Enter valid 12-digit Aadhaar number');
        return false;
      }
      return true;
    }

    if (activeStep === 1) {
      if (!formData.provider || !formData.connection_type || !formData.address || !formData.city || !formData.pincode) {
        toast.error('Please complete required connection details');
        return false;
      }
      if ((formData.connection_type === 'pmuy' || formData.subsidy_required) && (!formData.ration_card_number || !formData.bank_account_last4)) {
        toast.error('Ration card and bank account last 4 digits are required for subsidy/PMUY');
        return false;
      }
      if (!/^\d{6}$/.test(formData.pincode)) {
        toast.error('Enter valid 6-digit pincode');
        return false;
      }
      return true;
    }

    if (activeStep === 2) {
      if (!docs.aadhaar_doc || !docs.address_proof_doc || !docs.photo_doc) {
        toast.error('Please upload mandatory documents');
        return false;
      }
      if (formData.ownership_type === 'owned' && !docs.property_doc) {
        toast.error('Property document is required for owned property');
        return false;
      }
      if (formData.ownership_type === 'rented' && !docs.noc_doc) {
        toast.error('NOC / rent agreement is required for rented property');
        return false;
      }
      return true;
    }

    if (activeStep === 3 && !formData.agrees_to_terms) {
      toast.error('Please accept declaration before submit');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
      return;
    }

    // Last step — open OTP verification
    setOtpDialogOpen(true);
  };

  const handleSubmitAfterOtp = async (email) => {
    setOtpDialogOpen(false);
    setVerifiedEmail(email);

    try {
      setSubmitting(true);

      const documents = await buildDocumentPayload(docs);

      const payload = {
        application_type: 'new_connection',
        application_data: {
          gas_type: gasType,
          ...formData,
          email,
        },
        documents,
        additional_info: {
          source: 'kiosk',
          form_version: 'v2-full',
          document_count: documents.length,
        },
      };

      const response = await api.post('/gas/applications/submit', payload);
      const appNo = response?.data?.data?.application_number;
      if (!appNo) throw new Error('Application number not received');

      const now = new Date().toISOString();
      setApplicationNumber(appNo);
      setSubmittedAt(now);
      setReceiptOpen(true);
      toast.success('Application submitted successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <DialogTitle sx={{ px: 3, py: 2, bgcolor: isPNG ? '#eaf2ff' : '#fff1e6', borderBottom: isPNG ? '1px solid #cfe0ff' : '1px solid #ffd9bf', pb: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: isPNG ? '#0f4aa6' : '#b45309' }}>
          Apply For {isPNG ? 'PNG' : 'LPG'} Connection
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: isPNG ? '#2a436f' : '#7c3e0a', fontWeight: 500 }}>
          Complete application with documents and additional details
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, px: 3, pb: 2, minHeight: 520 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
          {steps.map((label) => (<Step key={label}><StepLabel>{label}</StepLabel></Step>))}
        </Stepper>

        {activeStep === 0 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Applicant Name *" name="applicant_name" value={formData.applicant_name} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Father/Spouse Name *" name="father_spouse_name" value={formData.father_spouse_name} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required type="date" InputLabelProps={{ shrink: true }} label="Date of Birth *" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required select label="Gender *" name="gender" value={formData.gender} onChange={handleChange}><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem><MenuItem value="other">Other</MenuItem></TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Mobile Number *" name="mobile" value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Alternate Mobile" name="alternate_mobile" value={formData.alternate_mobile} onChange={(e) => setFormData((p) => ({ ...p, alternate_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Aadhaar Number *" name="aadhaar_number" value={formData.aadhaar_number} onChange={(e) => setFormData((p) => ({ ...p, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Email" name="email" value={formData.email} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth type="number" label="Annual Income" name="annual_income" value={formData.annual_income} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth type="number" label="Family Members" name="family_members" value={formData.family_members} onChange={handleChange} /></Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth required select label="Provider *" name="provider" value={formData.provider} onChange={handleChange}>{providerOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required select label="Connection Type *" name="connection_type" value={formData.connection_type} onChange={handleChange}><MenuItem value="domestic">Domestic</MenuItem><MenuItem value="commercial">Commercial</MenuItem>{!isPNG && <MenuItem value="pmuy">PMUY</MenuItem>}</TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Property Type" name="property_type" value={formData.property_type} onChange={handleChange}><MenuItem value="residential">Residential</MenuItem><MenuItem value="commercial">Commercial</MenuItem><MenuItem value="industrial">Industrial</MenuItem></TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Ownership" name="ownership_type" value={formData.ownership_type} onChange={handleChange}><MenuItem value="owned">Owned</MenuItem><MenuItem value="rented">Rented</MenuItem><MenuItem value="leased">Leased</MenuItem></TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Usage" name="gas_usage" value={formData.gas_usage} onChange={handleChange}><MenuItem value="cooking">Cooking</MenuItem><MenuItem value="heating">Heating</MenuItem><MenuItem value="commercial_use">Commercial Use</MenuItem></TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Preferred Installation Date" name="preferred_installation_date" value={formData.preferred_installation_date} onChange={handleChange} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={formData.subsidy_required} onChange={(e) => setFormData((p) => ({ ...p, subsidy_required: e.target.checked }))} />} label="I want to apply for subsidy / benefit eligibility" /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Ration Card Number" name="ration_card_number" value={formData.ration_card_number} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Bank Account Last 4 Digits" name="bank_account_last4" value={formData.bank_account_last4} onChange={(e) => setFormData((p) => ({ ...p, bank_account_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth required multiline rows={3} label="Address *" name="address" value={formData.address} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Landmark" name="landmark" value={formData.landmark} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth required label="City *" name="city" value={formData.city} onChange={handleChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth required label="Pincode *" name="pincode" value={formData.pincode} onChange={(e) => setFormData((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Additional Notes" name="additional_notes" value={formData.additional_notes} onChange={handleChange} /></Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><Alert severity="info">Upload clear images/PDF (max 5MB each)</Alert></Grid>
            <Grid item xs={12} sm={6}><DocUpload label="Aadhaar" name="aadhaar_doc" required docs={docs} onFileChange={onDocChange} onRemove={(n) => setDocs((p) => ({ ...p, [n]: null }))} hint="Govt identity proof" enableQr /></Grid>
            <Grid item xs={12} sm={6}><DocUpload label="Address Proof" name="address_proof_doc" required docs={docs} onFileChange={onDocChange} onRemove={(n) => setDocs((p) => ({ ...p, [n]: null }))} hint="Utility bill or rental doc" enableQr /></Grid>
            <Grid item xs={12} sm={6}><DocUpload label="Applicant Photo" name="photo_doc" required docs={docs} onFileChange={onDocChange} onRemove={(n) => setDocs((p) => ({ ...p, [n]: null }))} accept=".jpg,.jpeg,.png" hint="Passport-size photo" enableQr /></Grid>
            <Grid item xs={12} sm={6}><DocUpload label="Property Document" name="property_doc" required={formData.ownership_type === 'owned'} docs={docs} onFileChange={onDocChange} onRemove={(n) => setDocs((p) => ({ ...p, [n]: null }))} enableQr /></Grid>
            <Grid item xs={12} sm={6}><DocUpload label="NOC / Rent Agreement" name="noc_doc" required={formData.ownership_type === 'rented'} docs={docs} onFileChange={onDocChange} onRemove={(n) => setDocs((p) => ({ ...p, [n]: null }))} enableQr /></Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Review Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Applicant</Typography><Typography>{formData.applicant_name}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Mobile</Typography><Typography>{formData.mobile}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Provider</Typography><Typography>{formData.provider}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Connection Type</Typography><Typography>{formData.connection_type}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2" color="text.secondary">Address</Typography><Typography>{formData.address}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2" color="text.secondary">Documents Selected</Typography><Typography>{Object.values(docs).filter(Boolean).length}</Typography></Grid>
            </Grid>
            <FormControlLabel
              control={<Switch checked={formData.agrees_to_terms} onChange={(e) => setFormData((p) => ({ ...p, agrees_to_terms: e.target.checked }))} />}
              label="I confirm that all information and uploaded documents are genuine."
              sx={{ mt: 2 }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button disabled={activeStep === 0 || submitting} onClick={() => setActiveStep((prev) => prev - 1)}>Back</Button>
        <Button variant="contained" onClick={handleNext} disabled={submitting}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : activeStep === steps.length - 1 ? 'Submit Application' : 'Next'}
        </Button>
      </DialogActions>

      <EmailOtpVerification
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        onVerified={handleSubmitAfterOtp}
        initialEmail={formData.email}
        title="Verify Email to Submit Application"
      />

      <ApplicationReceipt
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); onClose(); }}
        applicationNumber={applicationNumber}
        applicationType="new_connection"
        formData={{ gas_type: gasType, ...formData, email: verifiedEmail }}
        email={verifiedEmail}
        submittedAt={submittedAt}
      />
    </Box>
  );
};

export default GasNewConnectionForm;
