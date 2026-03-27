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
import { buildDocumentPayload, validateFile } from './formUtils';
import DocUpload from '../municipal/DocUpload';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const complaintOptionsPNG = [
  { value: 'billing', label: 'Billing Dispute' },
  { value: 'delivery', label: 'Supply/Pressure Issue' },
  { value: 'safety', label: 'Safety Concern' },
  { value: 'quality', label: 'Gas Quality Issue' },
  { value: 'other', label: 'Other' },
];

const complaintOptionsLPG = [
  { value: 'delivery', label: 'Cylinder Delivery Delay' },
  { value: 'billing', label: 'Overcharging / Billing' },
  { value: 'safety', label: 'Safety Concern' },
  { value: 'quality', label: 'Cylinder Quality Issue' },
  { value: 'other', label: 'Other' },
];

const GasComplaintForm = ({ onClose, gasType = 'lpg' }) => {
  const isPNG = gasType === 'png';
  const complaintOptions = isPNG ? complaintOptionsPNG : complaintOptionsLPG;

  const [submitting, setSubmitting] = useState(false);
  const [complaintNumber, setComplaintNumber] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [attachment, setAttachment] = useState(null);
  const docs = { attachment };

  const [formData, setFormData] = useState({
    consumer_id: '',
    mobile: '',
    contact_name: '',
    email: '',
    complaint_category: '',
    urgency: 'medium',
    preferred_visit_date: '',
    preferred_visit_slot: 'anytime',
    address: '',
    landmark: '',
    description: '',
    additional_information: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttachment = (file) => {
    if (!file) return;
    const error = validateFile(file, 5);
    if (error) {
      toast.error(error);
      return;
    }
    setAttachment(file);
    toast.success(`${file.name} selected`);
  };

  const validateForm = () => {
    if (!formData.complaint_category || !formData.description || !formData.contact_name) {
      toast.error('Please fill required complaint fields');
      return false;
    }
    if (!formData.consumer_id && !formData.mobile) {
      toast.error('Provide consumer number or mobile number');
      return false;
    }
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      toast.error('Enter valid 10-digit mobile number');
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

      const documents = attachment ? await buildDocumentPayload({ attachment }) : [];
      const attachmentName = attachment?.name || null;

      const payload = {
        complaint_data: {
          ...formData,
          email,
          gas_type: gasType,
          attachment_url: attachmentName,
          additional_info: {
            preferred_visit_date: formData.preferred_visit_date,
            preferred_visit_slot: formData.preferred_visit_slot,
            address: formData.address,
            landmark: formData.landmark,
            additional_information: formData.additional_information,
            documents,
          },
        },
      };

      const response = await api.post('/gas/complaints/submit', payload);
      const complaintNo = response?.data?.data?.complaint_number;
      if (!complaintNo) throw new Error('Complaint number missing in response');

      const now = new Date().toISOString();
      setComplaintNumber(complaintNo);
      setSubmittedAt(now);
      setReceiptOpen(true);
      toast.success('Complaint registered successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <DialogTitle sx={{ px: 3, py: 2, bgcolor: isPNG ? '#eaf2ff' : '#fff1e6', borderBottom: isPNG ? '1px solid #cfe0ff' : '1px solid #ffd9bf', pb: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: isPNG ? '#0f4aa6' : '#b45309' }}>Register {isPNG ? 'PNG' : 'LPG'} Complaint</Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: isPNG ? '#2a436f' : '#7c3e0a', fontWeight: 500 }}>
          Complete complaint details with optional evidence document
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, px: 3, pb: 2, minHeight: 520 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>For active gas leak emergency, call 1906 immediately.</Alert>

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Consumer Number" name="consumer_id" value={formData.consumer_id} onChange={handleChange} placeholder="GC2024XXXXXX" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile Number" name="mobile" value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth required label="Contact Name *" name="contact_name" value={formData.contact_name} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Email" name="email" value={formData.email} onChange={handleChange} placeholder="For receipt delivery" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth required select label="Complaint Category *" name="complaint_category" value={formData.complaint_category} onChange={handleChange}>{complaintOptions.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Priority" name="urgency" value={formData.urgency} onChange={handleChange}><MenuItem value="low">Low</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="high">High</MenuItem><MenuItem value="critical">Critical</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Preferred Visit Date" name="preferred_visit_date" value={formData.preferred_visit_date} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Preferred Slot" name="preferred_visit_slot" value={formData.preferred_visit_slot} onChange={handleChange}><MenuItem value="anytime">Anytime</MenuItem><MenuItem value="morning">Morning</MenuItem><MenuItem value="afternoon">Afternoon</MenuItem><MenuItem value="evening">Evening</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Landmark" name="landmark" value={formData.landmark} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField fullWidth required multiline rows={4} label="Problem Description *" name="description" value={formData.description} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Additional Information" name="additional_information" value={formData.additional_information} onChange={handleChange} /></Grid>
          <Grid item xs={12}><DocUpload label="Photo / Supporting Document" name="attachment" docs={docs} onFileChange={(n, f) => handleAttachment(f)} onRemove={() => setAttachment(null)} hint="Optional evidence" enableQr /></Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button variant="contained" onClick={handleSubmitClick} disabled={submitting}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Complaint'}
        </Button>
      </DialogActions>

      <EmailOtpVerification
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        onVerified={handleSubmitAfterOtp}
        initialEmail={formData.email}
        title="Verify Email to Submit Complaint"
      />

      <ApplicationReceipt
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); onClose(); }}
        applicationNumber={complaintNumber}
        applicationType="complaint"
        formData={{ ...formData, gas_type: gasType, email: verifiedEmail }}
        email={verifiedEmail}
        submittedAt={submittedAt}
      />
    </Box>
  );
};

export default GasComplaintForm;
