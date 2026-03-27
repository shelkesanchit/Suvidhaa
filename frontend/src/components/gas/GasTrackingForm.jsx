import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const parseDescription = (raw) => {
  if (!raw) return { text: '', extra: null };
  const marker = '\n\n[Additional Info]\n';
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw.trim(), extra: null };
  const text = raw.substring(0, idx).trim();
  try {
    const extra = JSON.parse(raw.substring(idx + marker.length));
    return { text, extra };
  } catch {
    return { text: raw.trim(), extra: null };
  }
};

const extraLabels = {
  preferred_visit_date: 'Preferred Visit Date',
  preferred_visit_slot: 'Preferred Slot',
  address: 'Address',
  landmark: 'Landmark',
  additional_information: 'Additional Information',
};

const GasTrackingForm = ({ onClose, gasType = 'lpg' }) => {
  const isPNG = gasType === 'png';
  const [tab, setTab] = useState(0); // 0 application, 1 complaint
  const [loading, setLoading] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTrack = async () => {
    if (!referenceNo.trim()) {
      toast.error('Enter reference number');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setResult(null);

      const normalized = referenceNo.trim().toUpperCase();
      const endpoint = tab === 0 ? `/gas/applications/track/${normalized}` : `/gas/complaints/track/${normalized}`;
      const query = new URLSearchParams();
      if (mobile) query.set('mobile', mobile);
      if (email) query.set('email', email);
      const url = query.toString() ? `${endpoint}?${query.toString()}` : endpoint;
      const response = await api.get(url);

      if (!response?.data?.success) {
        throw new Error('Record not found');
      }

      setResult(response.data.data);
      toast.success('Tracking details loaded');
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || 'Unable to fetch tracking details');
    } finally {
      setLoading(false);
    }
  };

  const statusText = result?.application_status || result?.status || 'N/A';

  return (
    <Box>
      <DialogTitle sx={{ px: 3, py: 2, bgcolor: isPNG ? '#eaf2ff' : '#fff1e6', borderBottom: isPNG ? '1px solid #cfe0ff' : '1px solid #ffd9bf', pb: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: isPNG ? '#0f4aa6' : '#b45309' }}>
          Track {isPNG ? 'PNG' : 'LPG'} Application / Complaint
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: isPNG ? '#2a436f' : '#7c3e0a', fontWeight: 500 }}>
          Enter reference number to check current status
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => { setTab(value); setResult(null); setErrorMsg(''); }}
          sx={{
            mt: 1,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, color: isPNG ? '#2a436f' : '#7c3e0a' },
            '& .Mui-selected': { color: isPNG ? '#0f4aa6' : '#b45309' },
            '& .MuiTabs-indicator': { bgcolor: isPNG ? '#0f4aa6' : '#b45309' },
          }}
        >
          <Tab label="Track Application" />
          <Tab label="Track Complaint" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, px: 3, pb: 2, minHeight: 500 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              required
              label={tab === 0 ? 'Application Number *' : 'Complaint Number *'}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value.toUpperCase())}
              placeholder={tab === 0 ? 'GNC2024XXXXXX' : 'GCP2024XXXXXX'}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button fullWidth variant="contained" sx={{ height: '56px' }} onClick={handleTrack} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Track'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Registered Mobile (for verification)" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Registered Email (optional verification)" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Grid>
        </Grid>

        {errorMsg && <Alert severity="error" sx={{ mt: 2 }}>{errorMsg}</Alert>}

        {result && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={700}>Tracking Result</Typography>
              <Chip label={String(statusText).toUpperCase()} color={statusText === 'approved' || statusText === 'resolved' ? 'success' : 'info'} />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Reference</Typography><Typography>{result.application_number || result.complaint_number || referenceNo}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Status</Typography><Typography>{statusText}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Name</Typography><Typography>{result.full_name || result.applicant_name || 'N/A'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Mobile</Typography><Typography>{result.mobile || result.applicant_phone || 'N/A'}</Typography></Grid>
              <Grid item xs={12}>
                {(() => {
                  const { text, extra } = parseDescription(result.description);
                  return (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Description</Typography>
                      <Box sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 1, p: 1.5 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>
                          {text || 'N/A'}
                        </Typography>
                      </Box>
                      {extra && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Additional Details</Typography>
                          <Box sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 1, p: 1.5 }}>
                            {Object.entries(extraLabels).map(([key, label]) =>
                              extra[key] ? (
                                <Box key={key} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0 }}>{label}:</Typography>
                                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{extra[key]}</Typography>
                                </Box>
                              ) : null
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })()}
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Box>
  );
};

export default GasTrackingForm;
