import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Paper,
  Chip,
  Divider,
  Alert,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
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
import toast from 'react-hot-toast';
import api from '../../utils/api';

// All water application prefixes
const WATER_APP_PREFIXES = ['WNC', 'WRC', 'WDC', 'WTR', 'WPS', 'WMC', 'WTS', 'WCM', 'WAPP'];

const statusColors = {
  submitted: 'info',
  open: 'warning',
  document_verification: 'info',
  site_inspection: 'warning',
  approval_pending: 'warning',
  assigned: 'info',
  in_progress: 'warning',
  work_in_progress: 'warning',
  approved: 'success',
  completed: 'success',
  resolved: 'success',
  closed: 'default',
  rejected: 'error',
};

const statusLabels = {
  submitted: 'Submitted',
  open: 'Open',
  document_verification: 'Document Verification',
  site_inspection: 'Site Inspection',
  approval_pending: 'Pending Approval',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  work_in_progress: 'Work In Progress',
  approved: 'Approved',
  completed: 'Completed',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

const categoryLabels = {
  // Complaint categories (frontend values)
  'no-water': 'No Water Supply',
  'low-pressure': 'Low Pressure',
  contaminated: 'Contaminated Water',
  'pipeline-leak': 'Pipeline Leak',
  'meter-stopped': 'Meter Stopped',
  'high-bill': 'High Bill Dispute',
  'illegal-connection': 'Illegal Connection',
  sewerage: 'Sewerage Issue',
  other: 'Other',
  // Complaint categories (database mapped values)
  no_water_supply: 'No Water Supply',
  low_pressure: 'Low Pressure',
  water_quality: 'Water Quality Issue',
  pipeline_leakage: 'Pipeline Leak',
  meter_fault: 'Meter Fault',
  billing_dispute: 'Billing Dispute',
  sewerage_blockage: 'Sewerage Blockage',
  tanker_delay: 'Tanker Delay',
  // Application types
  new_connection: 'New Connection',
  reconnection: 'Reconnection',
  disconnection: 'Disconnection',
  transfer: 'Ownership Transfer',
  pipe_size_change: 'Pipe Size Change',
  meter_change: 'Meter Change',
  tanker_service: 'Tanker Service',
  connection_management: 'Connection Management',
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Custom timeline step
const TimelineStep = ({ step, isLast, isComplete }) => {
  const dotColor = isComplete
    ? '#2e7d32'
    : isLast
    ? '#1976d2'
    : '#9e9e9e';

  return (
    <Box sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            left: 9,
            top: 22,
            bottom: 0,
            width: 2,
            bgcolor: isComplete ? '#c8e6c9' : '#e0e0e0',
          }}
        />
      )}
      <Box sx={{ flexShrink: 0, mt: 0.5, zIndex: 1 }}>
        {isComplete ? (
          <CheckCircle sx={{ fontSize: 20, color: '#2e7d32' }} />
        ) : isLast ? (
          <FiberManualRecord sx={{ fontSize: 20, color: '#1976d2' }} />
        ) : (
          <FiberManualRecord sx={{ fontSize: 20, color: '#9e9e9e' }} />
        )}
      </Box>
      <Box sx={{ pb: isLast ? 0 : 2.5, flex: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: isLast && !isComplete ? '#1976d2' : '#0d1b2a' }}>
          {step.status}
        </Typography>
        {step.date && (
          <Typography variant="caption" color="text.secondary" display="block">
            {step.date}
          </Typography>
        )}
        {step.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {step.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const WaterTrackingForm = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  const [trackingType, setTrackingType] = useState('auto');
  const [showDetails, setShowDetails] = useState(true);
  const [referenceNumber, setReferenceNumber] = useState('');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const detectType = (refNumber) => {
    if (refNumber.startsWith('WCP')) return 'complaint';
    if (WATER_APP_PREFIXES.some((p) => refNumber.startsWith(p))) return 'application';
    return null;
  };

  const handleTrack = async () => {
    const ref = referenceNumber.trim().toUpperCase();
    if (!ref) {
      toast.error('Please enter a reference number');
      return;
    }

    // Determine type
    let resolvedType = trackingType;
    if (trackingType === 'auto') {
      resolvedType = detectType(ref);
      if (!resolvedType) {
        setError('Reference number not recognised. Check your receipt or SMS — it starts with WNC, WRC, WDC, WTR, WPS, WMC, WTS, WCM (applications) or WCP (complaints).');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint =
        resolvedType === 'complaint'
          ? `/water/complaints/track/${ref}`
          : `/water/applications/track/${ref}`;

      const response = await api.get(endpoint);

      if (!response.data.success) {
        setError(response.data.message || 'Reference number not found');
        return;
      }

      const data = response.data.data;
      const isComplaint = resolvedType === 'complaint';

      // Build timeline
      let timeline = [];

      if (isComplaint) {
        timeline.push({ status: 'Registered', date: formatDate(data.created_at || data.submitted_at), description: 'Complaint registered successfully' });
        if (data.stage_history && Array.isArray(data.stage_history) && data.stage_history.length > 0) {
          data.stage_history.forEach((h) => {
            timeline.push({
              status: h.stage || h.status,
              date: formatDate(h.timestamp),
              description: h.remarks || h.resolution_notes || '',
            });
          });
        } else {
          if (data.assigned_engineer) {
            timeline.push({ status: 'Assigned', date: null, description: `Assigned to ${data.assigned_engineer}` });
          }
          if (data.status === 'in_progress' || data.status === 'work_in_progress') {
            timeline.push({ status: 'In Progress', date: null, description: 'Work is in progress' });
          }
          if (data.resolved_at) {
            timeline.push({ status: 'Resolved', date: formatDate(data.resolved_at), description: data.resolution_notes || 'Issue resolved' });
          }
          if (data.closed_at) {
            timeline.push({ status: 'Closed', date: formatDate(data.closed_at), description: 'Complaint closed' });
          }
        }
      } else {
        // Application
        if (data.stage_history && Array.isArray(data.stage_history) && data.stage_history.length > 0) {
          timeline = data.stage_history.map((h) => ({
            status: h.stage || h.status,
            date: formatDate(h.timestamp),
            description: h.remarks || h.description || '',
          }));
        } else {
          timeline.push({ status: 'Submitted', date: formatDate(data.submitted_at), description: 'Application submitted successfully' });
          if (data.current_stage && data.current_stage !== 'Application Submitted') {
            timeline.push({ status: data.current_stage, date: null, description: statusLabels[data.status] || data.status });
          }
        }
        if (data.completed_at && !timeline.some((t) => t.status === 'Completed')) {
          timeline.push({ status: 'Completed', date: formatDate(data.completed_at), description: 'Application completed' });
        }
      }

      const appType = data.complaint_category || data.application_type || '';
      setTrackingData({
        type: isComplaint ? 'Complaint' : 'Application',
        reference_number: ref,
        name: data.contact_name || data.full_name || 'N/A',
        mobile: data.mobile || 'N/A',
        email: data.email,
        registered_date: formatDate(data.created_at || data.submitted_at),
        category: categoryLabels[appType] || appType.replace(/_/g, ' ') || 'N/A',
        current_status: statusLabels[data.status] || data.status,
        status_key: data.status,
        ward: data.ward || 'N/A',
        address: data.address,
        assigned_to: data.assigned_engineer,
        description: data.description,
        rejection_reason: data.rejection_reason || data.remarks,
        resolution_notes: data.resolution_notes,
        timeline,
      });
      toast.success('Status found!');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Reference number not found. Please double-check and try again.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to fetch status. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!trackingData) return 0;
    const finalStatuses = ['completed', 'resolved', 'approved', 'closed', 'rejected'];
    if (finalStatuses.includes(trackingData.status_key)) return 100;
    const expectedStages = trackingData.type === 'Application' ? 6 : 4;
    return Math.min(Math.round((trackingData.timeline.length / expectedStages) * 100), 95);
  };

  const isFinished = ['completed', 'resolved', 'approved', 'closed', 'rejected'].includes(trackingData?.status_key);

  return (
    <Box>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
          Track Application / Complaint
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your reference number to check real-time status and progress
        </Typography>

        {!trackingData ? (
          <Box>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                Search
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    select
                    label="Type"
                    value={trackingType}
                    onChange={(e) => { setTrackingType(e.target.value); setError(null); }}
                  >
                    <MenuItem value="auto">Auto Detect</MenuItem>
                    <MenuItem value="application">Application</MenuItem>
                    <MenuItem value="complaint">Complaint</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    required
                    label="Reference Number *"
                    value={referenceNumber}
                    onChange={(e) => { setReferenceNumber(e.target.value.toUpperCase()); setError(null); }}
                    placeholder="WNC2026000001, WRC2026000001 or WCP2026000001"
                    helperText="All application types supported — found on your receipt or SMS"
                    onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                  />
                </Grid>
              </Grid>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {loading && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Fetching your details, please wait...
                </Typography>
              </Paper>
            )}

            {!loading && !error && (
              <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                <Search sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Enter your reference number above to track status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported: New Connection, Reconnection, Disconnection, Transfer, Pipe Size Change, Meter Change, Tanker Service and Complaints
                </Typography>
              </Paper>
            )}
          </Box>
        ) : (
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
                          {trackingData.reference_number}
                        </Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => copyToClipboard(trackingData.reference_number)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Chip
                      label={trackingData.current_status.toUpperCase()}
                      color={statusColors[trackingData.status_key] || 'default'}
                      sx={{ fontWeight: 700, fontSize: '0.82rem', px: 1.5, py: 2.5 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}><Divider /></Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{trackingData.type}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Category</Typography>
                  <Typography variant="body2" fontWeight={600}>{trackingData.category}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Registered On</Typography>
                  <Typography variant="body2" fontWeight={600}>{trackingData.registered_date}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Ward</Typography>
                  <Typography variant="body2" fontWeight={600}>{trackingData.ward}</Typography>
                </Grid>
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
                <Typography variant="subtitle1" fontWeight={600} color="primary">{trackingData.type} Details</Typography>
                <IconButton size="small">{showDetails ? <ExpandLess /> : <ExpandMore />}</IconButton>
              </Box>
              <Collapse in={showDetails}>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Name</Typography>
                    <Typography variant="body2" fontWeight={600}>{trackingData.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Mobile</Typography>
                    <Typography variant="body2" fontWeight={600}>{trackingData.mobile}</Typography>
                  </Grid>
                  {trackingData.email && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Email</Typography>
                      <Typography variant="body2" fontWeight={600}>{trackingData.email}</Typography>
                    </Grid>
                  )}
                  {trackingData.address && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Address</Typography>
                      <Typography variant="body2">{trackingData.address}</Typography>
                    </Grid>
                  )}
                  {trackingData.description && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Description</Typography>
                      <Typography variant="body2">{trackingData.description}</Typography>
                    </Grid>
                  )}
                  {trackingData.assigned_to && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Assigned To</Typography>
                      <Typography variant="body2" fontWeight={600}>{trackingData.assigned_to}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Collapse>
            </Paper>

            {/* Timeline */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>Progress Timeline</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Step-by-step journey of your {trackingData.type.toLowerCase()}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {trackingData.timeline.length > 0 ? (
                <Box>
                  {trackingData.timeline.map((step, index) => {
                    const isLast = index === trackingData.timeline.length - 1;
                    const isComplete = !isLast || isFinished;
                    return (
                      <TimelineStep key={index} step={step} isLast={isLast} isComplete={isComplete} />
                    );
                  })}
                </Box>
              ) : (
                <Typography color="text.secondary" variant="body2">No timeline information available yet.</Typography>
              )}
            </Paper>

            {/* Rejection / Resolution */}
            {(trackingData.status_key === 'rejected' || trackingData.rejection_reason) && (
              <Alert severity="error" sx={{ mb: 3 }} icon={<Warning />}>
                <strong>Rejected:</strong> {trackingData.rejection_reason || 'Your request was rejected. Please contact the office for more details.'}
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
                    Call our helpline <strong>1916</strong> or visit your nearest water department office for help with your {trackingData.type.toLowerCase()}.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Button
              variant="outlined" size="large" fullWidth
              onClick={() => { setTrackingData(null); setReferenceNumber(''); setError(null); }}
            >
              Track Another Application / Complaint
            </Button>
          </Box>
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
              sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
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

export default WaterTrackingForm;
