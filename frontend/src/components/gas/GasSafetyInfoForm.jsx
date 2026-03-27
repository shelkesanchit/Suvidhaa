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
  Tab,
  Tabs,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { buildDocumentPayload, validateFile } from './formUtils';
import DocUpload from '../municipal/DocUpload';

const GasSafetyInfoForm = ({ onClose, gasType = 'lpg' }) => {
  const isPNG = gasType === 'png';
  const [tab, setTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [supportDoc, setSupportDoc] = useState(null);
  const docs = { support_document: supportDoc };

  const [formData, setFormData] = useState({
    consumer_number: '',
    contact_name: '',
    mobile: '',
    alternate_mobile: '',
    emergency_contact: '',
    premises_type: 'residential',
    appliance_count: '',
    address: '',
    landmark: '',
    preferred_date: '',
    preferred_slot: 'anytime',
    description: '',
  });

  const onSupportDoc = (file) => {
    if (!file) return;
    const error = validateFile(file, 5);
    if (error) return toast.error(error);
    setSupportDoc(file);
    toast.success(`${file.name} selected`);
  };

  const submitInspectionRequest = async () => {
    if (!formData.contact_name || !formData.mobile || !formData.description) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
      toast.error('Enter valid 10-digit mobile number');
      return;
    }

    try {
      setSubmitting(true);
      const documents = supportDoc ? await buildDocumentPayload({ support_document: supportDoc }) : [];
      const response = await api.post('/gas/complaints/submit', {
        complaint_data: {
          consumer_id: formData.consumer_number,
          contact_name: formData.contact_name,
          mobile: formData.mobile,
          complaint_category: 'safety',
          description: `Safety inspection request (${gasType.toUpperCase()}): ${formData.description}`,
          urgency: 'medium',
          attachment_url: supportDoc?.name || null,
          additional_info: {
            alternate_mobile: formData.alternate_mobile,
            emergency_contact: formData.emergency_contact,
            premises_type: formData.premises_type,
            appliance_count: formData.appliance_count,
            address: formData.address,
            landmark: formData.landmark,
            preferred_date: formData.preferred_date,
            preferred_slot: formData.preferred_slot,
            documents,
          },
        },
      });

      setReference(response?.data?.data?.complaint_number || 'Generated');
      toast.success('Inspection request submitted');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <DialogTitle sx={{ px: 3, py: 2, bgcolor: '#fdecec', borderBottom: '1px solid #f4c9c9', pb: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#9f1d1d' }}>
          Safety & Information
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: '#7f1d1d', fontWeight: 500 }}>
          Gas safety guidance and inspection request
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            mt: 1,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, color: '#7f1d1d' },
            '& .Mui-selected': { color: '#9f1d1d' },
            '& .MuiTabs-indicator': { bgcolor: '#9f1d1d' },
          }}
        >
          <Tab label="Book Inspection" />
          <Tab label="Safety Guidelines" />
          <Tab label="Emergency" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, px: 3, pb: 2, minHeight: 520 }}>
        {tab === 0 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Alert severity="info">Submit a basic safety inspection request. Team will contact you.</Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Consumer Number" value={formData.consumer_number} onChange={(e) => setFormData((p) => ({ ...p, consumer_number: e.target.value.toUpperCase() }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Contact Name *" value={formData.contact_name} onChange={(e) => setFormData((p) => ({ ...p, contact_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Mobile Number *" value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Alternate Mobile" value={formData.alternate_mobile} onChange={(e) => setFormData((p) => ({ ...p, alternate_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Emergency Contact" value={formData.emergency_contact} onChange={(e) => setFormData((p) => ({ ...p, emergency_contact: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Premises Type" value={formData.premises_type} onChange={(e) => setFormData((p) => ({ ...p, premises_type: e.target.value }))}>
                <MenuItem value="residential">Residential</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="industrial">Industrial</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Gas Appliance Count" value={formData.appliance_count} onChange={(e) => setFormData((p) => ({ ...p, appliance_count: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Preferred Inspection Date" value={formData.preferred_date} onChange={(e) => setFormData((p) => ({ ...p, preferred_date: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Preferred Slot" value={formData.preferred_slot} onChange={(e) => setFormData((p) => ({ ...p, preferred_slot: e.target.value }))}>
                <MenuItem value="anytime">Anytime</MenuItem>
                <MenuItem value="morning">Morning</MenuItem>
                <MenuItem value="afternoon">Afternoon</MenuItem>
                <MenuItem value="evening">Evening</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Landmark" value={formData.landmark} onChange={(e) => setFormData((p) => ({ ...p, landmark: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required multiline rows={3} label="Issue / Inspection Notes *" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}><DocUpload label="Supporting Photo / Document" name="support_document" docs={docs} onFileChange={(n, f) => onSupportDoc(f)} onRemove={() => setSupportDoc(null)} hint="Optional" enableQr /></Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={submitInspectionRequest} disabled={submitting}>
                {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Inspection Request'}
              </Button>
            </Grid>
            {reference && (
              <Grid item xs={12}>
                <Alert severity="success">Request registered. Reference: <Chip label={reference} size="small" /></Alert>
              </Grid>
            )}
          </Grid>
        )}

        {tab === 1 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Basic Safety Checklist</Typography>
            <Typography variant="body2">1. Keep regulator and pipes away from heat.</Typography>
            <Typography variant="body2">2. Check leakage with soap-water, never with flame.</Typography>
            <Typography variant="body2">3. Ensure kitchen ventilation at all times.</Typography>
            <Typography variant="body2">4. Turn off regulator when not in use.</Typography>
            <Typography variant="body2">5. Use authorized service providers only.</Typography>
          </Paper>
        )}

        {tab === 2 && (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              Gas Leak Emergency: Call 1906 immediately.
            </Alert>
            <Typography variant="body2" color="text.secondary">Do not switch electrical devices on/off, open all windows, and leave the area safely.</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Box>
  );
};

export default GasSafetyInfoForm;
