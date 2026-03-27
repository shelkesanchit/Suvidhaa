import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Grid,
  Chip,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CheckCircle as SuccessIcon, CloudUpload, CheckCircle, Delete, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import QrUploadButton from './QrUploadButton';

const CategoryChangeForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    consumer_number: '',
    current_category: '',
    new_category: '',
    reason: '',
    contact_number: '',
  });
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);

  const allDocuments = [
    { id: 'ownership_proof', label: 'Property Ownership Proof', required: true, categories: ['residential', 'commercial', 'industrial', 'agricultural'] },
    { id: 'business_registration', label: 'Business Registration Certificate', required: true, categories: ['commercial'] },
    { id: 'land_documents', label: 'Land Documents', required: true, categories: ['agricultural'] },
    { id: 'industrial_license', label: 'Industrial License', required: true, categories: ['industrial'] },
    { id: 'electricity_bill', label: 'Latest Electricity Bill', required: true, categories: ['residential', 'commercial', 'industrial', 'agricultural'] },
  ];

  const getVisibleDocuments = () => {
    if (!formData.new_category) return allDocuments.filter(d => d.id === 'ownership_proof' || d.id === 'electricity_bill');
    return allDocuments.filter(d => d.categories.includes(formData.new_category));
  };

  const handleDocUpload = (docId) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must not exceed 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocs(prev => ({ ...prev, [docId]: { name: file.name, type: file.type, size: file.size, data: reader.result.split(',')[1] } }));
      toast.success(`${file.name} uploaded`);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (docId) => {
    setUploadedDocs(prev => { const u = { ...prev }; delete u[docId]; return u; });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    handleSubmit(email);
  };

  const handleSubmit = async (email) => {
    setLoading(true);

    try {
      const requiredDocs = getVisibleDocuments().filter(d => d.required);
      const missing = requiredDocs.filter(d => !uploadedDocs[d.id]);
      if (missing.length > 0) {
        toast.error(`Please upload: ${missing.map(d => d.label).join(', ')}`);
        setLoading(false);
        return;
      }

      const documentsArray = Object.entries(uploadedDocs).map(([id, doc]) => ({ id, ...doc }));

      const response = await api.post('/electricity/applications/submit', {
        application_type: 'category_change',
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
      toast.success('Category change request submitted!');
      api.post('/electricity/otp/send-receipt', {
        email,
        application_number: appNum,
        application_type: 'category_change',
        application_data: formData,
        submitted_at: ts,
      }).catch(console.warn);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Request Submitted Successfully!
        </Typography>
        <Chip
          label={applicationNumber}
          color="primary"
          sx={{ fontSize: '1.2rem', py: 2, px: 3, mb: 3 }}
        />
        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          Your category change request will be reviewed. Please submit required documents at the nearest office within 7 days.
        </Alert>
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
          applicationNumber={applicationNumber}
          applicationType="category_change"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={e => e.preventDefault()}>
      <DialogContent sx={{ mt: 1 }}>
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            Consumer Details
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Consumer Number *"
                name="consumer_number"
                value={formData.consumer_number}
                onChange={handleChange}
                required
                placeholder="EC2026XXXXXX"
                helperText="Enter your 12-digit consumer number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Current Category *"
                name="current_category"
                value={formData.current_category}
                onChange={handleChange}
                required
              >
                <MenuItem value="residential">Residential (₹5.50-8.50/unit)</MenuItem>
                <MenuItem value="commercial">Commercial (₹9.00/unit)</MenuItem>
                <MenuItem value="industrial">Industrial (₹7.50/unit)</MenuItem>
                <MenuItem value="agricultural">Agricultural (₹4.00/unit)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="New Category Required *"
                name="new_category"
                value={formData.new_category}
                onChange={handleChange}
                required
              >
                <MenuItem value="residential">Residential (₹5.50-8.50/unit)</MenuItem>
                <MenuItem value="commercial">Commercial (₹9.00/unit)</MenuItem>
                <MenuItem value="industrial">Industrial (₹7.50/unit)</MenuItem>
                <MenuItem value="agricultural">Agricultural (₹4.00/unit)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Reason for Change *"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
              >
                <MenuItem value="business_started">Started Business</MenuItem>
                <MenuItem value="business_closed">Business Closed</MenuItem>
                <MenuItem value="change_of_use">Change of Property Use</MenuItem>
                <MenuItem value="farming_activity">Starting Farming Activity</MenuItem>
                <MenuItem value="industrial_setup">Industrial Setup</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
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
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            Required Documents
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Upload clear copies of all required documents (PDF/JPG/PNG, max 5MB each).
              {!formData.new_category && ' Select a new category above to see required documents.'}
            </Typography>
          </Alert>
          <Grid container spacing={2}>
            {getVisibleDocuments().map((doc) => (
              <Grid item xs={12} md={6} key={doc.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: uploadedDocs[doc.id] ? 'success.main' : doc.required ? 'warning.main' : 'grey.300',
                    bgcolor: uploadedDocs[doc.id] ? 'success.lighter' : 'background.paper',
                    borderRadius: 2,
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {doc.label} {doc.required && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    {uploadedDocs[doc.id] && (
                      <Button size="small" color="error" onClick={() => removeDoc(doc.id)} sx={{ minWidth: 0, p: 0.5 }}>
                        <Delete fontSize="small" />
                      </Button>
                    )}
                  </Box>
                  {uploadedDocs[doc.id] ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircle color="success" fontSize="small" />
                      <Typography variant="body2" color="success.main" noWrap>{uploadedDocs[doc.id].name}</Typography>
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
                      <input type="file" hidden accept="image/*,.pdf" onChange={handleDocUpload(doc.id)} />
                    </Button>
                  )}
                  {!uploadedDocs[doc.id] && (
                    <QrUploadButton
                      docKey={doc.id}
                      docLabel={doc.label}
                      onFileReceived={(f) => setUploadedDocs(prev => ({ ...prev, [doc.id]: f }))}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => setShowOtpDialog(true)}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={''}
      />
    </Box>
  );
};

export default CategoryChangeForm;
