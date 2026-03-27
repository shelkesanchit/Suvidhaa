import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Paper,
  Chip,
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Search,
  ContentCopy,
  ExpandMore,
  ExpandLess,
  Warning,
  Info,
  FiberManualRecord,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// All electricity application type labels
const APP_TYPE_LABELS = {
  new_connection: 'New Connection',
  change_of_load: 'Change of Load',
  change_of_name: 'Change of Name',
  address_correction: 'Address Correction',
  reconnection: 'Reconnection',
  category_change: 'Category Change',
  solar_rooftop: 'Solar Rooftop',
  ev_charging: 'EV Charging Station',
  prepaid_recharge: 'Prepaid Recharge',
  meter_reading: 'Meter Reading',
};

const COMPLAINT_TYPE_LABELS = {
  no_power: 'No Power Supply',
  low_voltage: 'Low Voltage',
  meter_issue: 'Meter Issue',
  billing_dispute: 'Billing Dispute',
  transformer_fault: 'Transformer Fault',
  wire_damage: 'Wire / Cable Damage',
  street_light: 'Street Light',
  other: 'Other',
};

const STATUS_COLOR = {
  submitted: 'info',
  document_verification: 'info',
  site_inspection: 'warning',
  approval_pending: 'warning',
  approved: 'success',
  rejected: 'error',
  work_in_progress: 'warning',
  completed: 'success',
  open: 'warning',
  assigned: 'warning',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

const FINAL_STATUSES = ['completed', 'approved', 'resolved', 'closed', 'rejected'];

// Ordered stages for progress calculation
const APP_STAGE_ORDER = ['submitted', 'document_verification', 'site_inspection', 'approval_pending', 'approved', 'work_in_progress', 'completed'];
const COMPLAINT_STAGE_ORDER = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Custom timeline step (no MUI Stepper — avoids icon issues)
const TimelineStep = ({ stage, isLast, isComplete }) => (
  <Box sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
    {!isLast && (
      <Box sx={{ position: 'absolute', left: 9, top: 22, bottom: 0, width: 2, bgcolor: isComplete ? '#c8e6c9' : '#e0e0e0' }} />
    )}
    <Box sx={{ flexShrink: 0, mt: 0.5, zIndex: 1 }}>
      {isComplete
        ? <CheckCircle sx={{ fontSize: 20, color: '#2e7d32' }} />
        : isLast
        ? <FiberManualRecord sx={{ fontSize: 20, color: '#1976d2' }} />
        : <FiberManualRecord sx={{ fontSize: 20, color: '#9e9e9e' }} />}
    </Box>
    <Box sx={{ pb: isLast ? 0 : 2.5, flex: 1 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ color: isLast && !isComplete ? '#1976d2' : '#0d1b2a' }}>
        {stage.stage || stage.status || stage.stage_name}
      </Typography>
      {stage.timestamp && (
        <Typography variant="caption" color="text.secondary" display="block">
          {formatDate(stage.timestamp)}
        </Typography>
      )}
      {stage.remarks && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {stage.remarks}
        </Typography>
      )}
    </Box>
  </Box>
);

const TrackingForm = ({ onClose }) => {
  const [trackingType, setTrackingType] = useState('application');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleTrack = async () => {
    const ref = referenceNumber.trim().toUpperCase();
    if (!ref) {
      toast.error('Please enter a reference number');
      return;
    }

    setLoading(true);
    try {
      const endpoint = trackingType === 'application'
        ? `/electricity/applications/track/${ref}`
        : `/electricity/complaints/track/${ref}`;

      const response = await api.get(endpoint);
      // Handle both wrapped and unwrapped responses
      const data = response.data.application || response.data.complaint || response.data.data || response.data;
      setTrackingData({ ...data, _trackingType: trackingType });
      toast.success('Record found!');
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'No record found with this reference number');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!trackingData) return 0;
    const status = trackingData.status;
    if (FINAL_STATUSES.includes(status)) return 100;
    const order = trackingData._trackingType === 'application' ? APP_STAGE_ORDER : COMPLAINT_STAGE_ORDER;
    const idx = order.indexOf(status);
    if (idx < 0) return Math.min((trackingData.stage_history?.length || 1) * 15, 90);
    return Math.round(((idx + 1) / order.length) * 95);
  };

  const isFinished = FINAL_STATUSES.includes(trackingData?.status);
  const refNum = trackingData?.application_number || trackingData?.complaint_number || '';
  const appType = trackingData?.application_type || '';
  const complaintType = trackingData?.complaint_type || '';
  const typeLabel = APP_TYPE_LABELS[appType] || COMPLAINT_TYPE_LABELS[complaintType] || (appType || complaintType).replace(/_/g, ' ').toUpperCase();

  // Applicant info: electricity apps store data in application_data JSON; complaints have top-level fields
  const appData = trackingData?.application_data || {};
  const displayName = appData.full_name || trackingData?.full_name || trackingData?.applicant_name;
  const displayPhone = appData.phone || appData.mobile || trackingData?.phone || trackingData?.mobile;
  const displayEmail = appData.email || trackingData?.email;
  const displayAddress = appData.address || trackingData?.address || trackingData?.location;

  const stageHistory = Array.isArray(trackingData?.stage_history) ? trackingData.stage_history : [];

  const placeholderText = trackingType === 'application'
    ? 'NC2026000001, CL2026000001, RC2026000001, CN2026000001, SR2026000001…'
    : 'CMP2026000001';

  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
          Track Application / Complaint
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your reference number to check real-time status and progress
        </Typography>

        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">Search</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth select label="Track Type"
                value={trackingType}
                onChange={(e) => { setTrackingType(e.target.value); setTrackingData(null); setReferenceNumber(''); }}
              >
                <MenuItem value="application">Application Status</MenuItem>
                <MenuItem value="complaint">Complaint Status</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Reference Number *"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
                placeholder={placeholderText}
                helperText={
                  trackingType === 'application'
                    ? 'NC, CL, CN, AC, RC, CC, SR, EV, PR, MR — all application types supported'
                    : 'Enter your complaint reference number'
                }
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              />
            </Grid>
          </Grid>
        </Paper>

        {loading && (
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
            <LinearProgress sx={{ width: '100%', borderRadius: 1, mb: 2 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Fetching your details, please wait...
            </Typography>
          </Paper>
        )}

        {trackingData && !loading && (
          <Box>
            {/* Status Overview */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>Status Overview</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Reference Number</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight={700} color="primary" sx={{ fontFamily: 'monospace' }}>
                          {refNum}
                        </Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => copyToClipboard(refNum)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Chip
                      label={(trackingData.status || '').replace(/_/g, ' ').toUpperCase()}
                      color={STATUS_COLOR[trackingData.status] || 'default'}
                      sx={{ fontWeight: 700, fontSize: '0.82rem', px: 1.5, py: 2.5 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}><Divider /></Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{typeLabel || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Submitted On</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {trackingData.submitted_at ? new Date(trackingData.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </Typography>
                </Grid>
                {trackingData.consumer_number && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Consumer No.</Typography>
                    <Typography variant="body2" fontWeight={600}>{trackingData.consumer_number}</Typography>
                  </Grid>
                )}
                {trackingData.priority && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Priority</Typography>
                    <Chip
                      label={trackingData.priority.toUpperCase()}
                      color={trackingData.priority === 'critical' || trackingData.priority === 'high' ? 'error' : 'default'}
                      size="small"
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Overall Progress</Typography>
                    <Typography variant="body2" color="primary" fontWeight={700}>{getProgressPercentage()}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage()}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#e0e0e0' }}
                  />
                  {!isFinished && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Current stage: {(trackingData.current_stage || trackingData.status || '').replace(/_/g, ' ')}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Details */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
              <Box
                display="flex" justifyContent="space-between" alignItems="center"
                onClick={() => setShowDetails(!showDetails)}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <Typography variant="subtitle1" fontWeight={600} color="primary">
                  {trackingType === 'application' ? 'Application' : 'Complaint'} Details
                </Typography>
                <IconButton size="small">{showDetails ? <ExpandLess /> : <ExpandMore />}</IconButton>
              </Box>
              <Collapse in={showDetails}>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {displayName && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Applicant Name</Typography>
                      <Typography variant="body2" fontWeight={600}>{displayName}</Typography>
                    </Grid>
                  )}
                  {displayPhone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Contact Number</Typography>
                      <Typography variant="body2" fontWeight={600}>{displayPhone}</Typography>
                    </Grid>
                  )}
                  {displayEmail && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Email</Typography>
                      <Typography variant="body2" fontWeight={600}>{displayEmail}</Typography>
                    </Grid>
                  )}
                  {displayAddress && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Address</Typography>
                      <Typography variant="body2">{displayAddress}</Typography>
                    </Grid>
                  )}
                  {(trackingData.description) && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Description</Typography>
                      <Typography variant="body2">{trackingData.description}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Collapse>
            </Paper>

            {/* Timeline */}
            {stageHistory.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>Progress Timeline</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Step-by-step journey of your {trackingType}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Box>
                  {stageHistory.map((stage, index) => {
                    const isLast = index === stageHistory.length - 1;
                    const isComplete = !isLast || isFinished;
                    return <TimelineStep key={index} stage={stage} isLast={isLast} isComplete={isComplete} />;
                  })}
                </Box>
              </Paper>
            )}

            {/* Remarks / rejection */}
            {trackingData.remarks && (
              <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
                <strong>Notice:</strong> {trackingData.remarks}
              </Alert>
            )}
            {trackingData.status === 'rejected' && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Your application was rejected. Please contact the electricity board office or call <strong>1912</strong> for more details.
              </Alert>
            )}
            {trackingData.resolution_notes && (
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>Resolution:</strong> {trackingData.resolution_notes}
              </Alert>
            )}

            {/* Help */}
            <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9', mb: 3 }}>
              <Box display="flex" alignItems="flex-start" gap={1.5}>
                <Info sx={{ color: '#1976d2', mt: 0.25 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>Need Assistance?</Typography>
                  <Typography variant="body2" color="text.secondary">
                    For queries regarding your {trackingType}, call <strong>1912</strong> or visit your nearest electricity board office. Available 24/7.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Button
              variant="outlined" size="large" fullWidth
              onClick={() => { setTrackingData(null); setReferenceNumber(''); }}
            >
              Track Another Application / Complaint
            </Button>
          </Box>
        )}

        {!trackingData && !loading && (
          <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
            <Search sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Enter your reference number above to track status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All application types supported: New Connection, Load Change, Name Change, Reconnection, Solar, EV, and more
            </Typography>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        {!trackingData ? (
          <>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button
              variant="contained"
              onClick={handleTrack}
              disabled={loading || !referenceNumber.trim()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Search />}
            >
              {loading ? 'Searching...' : 'Track Status'}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Box>
  );
};

export default TrackingForm;
