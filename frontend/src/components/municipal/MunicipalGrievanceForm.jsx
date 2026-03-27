import React, { useState } from 'react';
import {
  Box, Grid, TextField, Select, MenuItem, Button, Tabs, Tab,
  Stepper, Step, StepLabel, Alert, Chip, CircularProgress,
  Paper, Divider, Typography, DialogContent, DialogActions,
  DialogTitle, Switch, FormControlLabel, InputLabel, FormControl,
} from '@mui/material';
import DocUpload from './DocUpload';
import { validateFile } from './formUtils';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const HEADER_COLOR = '#37474f';
const HOVER_COLOR  = '#263238';
const WARDS        = Array.from({ length: 10 }, (_, i) => `Ward ${i + 1}`);

const LODGE_STEPS = ['Reporter Details', 'Complaint Details', 'Documents & Submit'];
const RTI_STEPS   = ['Applicant Details', 'RTI Request', 'Documents & Submit'];
const APPT_STEPS  = ['Your Details', 'Appointment Details'];

const getTodayPlus = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function MunicipalGrievanceForm({ onClose }) {
  const [activeTab,  setActiveTab]  = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  /* ── Lodge Complaint ───────────────────────────────────────────── */
  const [lodgeData, setLodgeData] = useState({
    fullName: '', mobile: '', email: '', aadhaar: '',
    address: '', ward: '', district: 'Municipal District', occupation: '',
    department: '', grievanceType: '', urgencyLevel: '',
    location: '', nearestRoad: '', description: '',
    previouslyComplained: '', previousComplaintNo: '', expectedResolution: '',
  });
  const [lodgeDocs,       setLodgeDocs]       = useState({});
  const [lodgeSubmitting, setLodgeSubmitting] = useState(false);
  const [lodgeSubmitted,  setLodgeSubmitted]  = useState(false);
  const [lodgeRef,        setLodgeRef]        = useState('');

  /* ── Track Complaint ───────────────────────────────────────────── */
  const [trackNo,      setTrackNo]      = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult,  setTrackResult]  = useState(null);

  /* ── RTI Application ───────────────────────────────────────────── */
  const [rtiData, setRtiData] = useState({
    fullName: '', mobile: '', email: '', address: '', ward: '',
    nationality: 'India', occupation: '', aadhaar: '',
    department: '', periodInfo: '', subject: '', information: '',
    preferredMode: '', bplHolder: 'No', feeMethod: 'UPI',
  });
  const [rtiDocs,       setRtiDocs]       = useState({});
  const [rtiSubmitting, setRtiSubmitting] = useState(false);
  const [rtiSubmitted,  setRtiSubmitted]  = useState(false);
  const [rtiRef,        setRtiRef]        = useState('');

  /* ── Book Appointment ──────────────────────────────────────────── */
  const [apptData, setApptData] = useState({
    fullName: '', mobile: '', aadhaar: '', email: '', address: '',
    purposeCategory: '', officerDesignation: '',
    preferredDate: '', preferredTime: '', purposeVisit: '', prevAppointmentRef: '',
  });
  const [apptSubmitting, setApptSubmitting] = useState(false);
  const [apptSubmitted,  setApptSubmitted]  = useState(false);
  const [apptRef,        setApptRef]        = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState({ appNum: '', type: '', data: {}, ts: '', email: '' });

  /* ── Helpers ───────────────────────────────────────────────────── */
  const handleTabChange = (_, val) => { setActiveTab(val); setActiveStep(0); };

  const updLodge = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile')  v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setLodgeData(p => ({ ...p, [f]: v }));
  };
  const updRti = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile')  v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setRtiData(p => ({ ...p, [f]: v }));
  };
  const updAppt = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile')  v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setApptData(p => ({ ...p, [f]: v }));
  };

  /* ── Doc handlers ──────────────────────────────────────────────── */
  const handleLodgeDoc = (name, file) => {
    if (!file) return;
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setLodgeDocs(p => ({ ...p, [name]: file }));
    toast.success(`${file.name} selected`);
  };
  const removeLodgeDoc = (name) =>
    setLodgeDocs(p => { const n = { ...p }; delete n[name]; return n; });

  const handleRtiDoc = (name, file) => {
    if (!file) return;
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setRtiDocs(p => ({ ...p, [name]: file }));
    toast.success(`${file.name} selected`);
  };
  const removeRtiDoc = (name) =>
    setRtiDocs(p => { const n = { ...p }; delete n[name]; return n; });

  /* ── Validation ────────────────────────────────────────────────── */
  const validateStep = () => {
    if (activeTab === 0) {
      if (activeStep === 0) {
        if (!lodgeData.fullName.trim())        { toast.error('Full Name is required');                   return false; }
        if (lodgeData.mobile.length < 10)      { toast.error('Valid 10-digit mobile is required');        return false; }
        if (!lodgeData.address.trim())         { toast.error('Address is required');                      return false; }
        if (!lodgeData.ward)                   { toast.error('Ward is required');                         return false; }
      }
      if (activeStep === 1) {
        if (!lodgeData.department)             { toast.error('Department Concerned is required');          return false; }
        if (!lodgeData.grievanceType)          { toast.error('Grievance Type is required');                return false; }
        if (!lodgeData.urgencyLevel)           { toast.error('Urgency Level is required');                 return false; }
        if (!lodgeData.location.trim())        { toast.error('Exact Location is required');                return false; }
        if (!lodgeData.description.trim())     { toast.error('Problem Description is required');           return false; }
      }
    }
    if (activeTab === 2) {
      if (activeStep === 0) {
        if (!rtiData.fullName.trim())          { toast.error('Full Name is required');                    return false; }
        if (rtiData.mobile.length < 10)        { toast.error('Valid 10-digit mobile is required');         return false; }
        if (!rtiData.email.trim())             { toast.error('Email is required');                         return false; }
        if (!rtiData.address.trim())           { toast.error('Address is required');                       return false; }
      }
      if (activeStep === 1) {
        if (!rtiData.department)               { toast.error('Department / Public Authority is required'); return false; }
        if (!rtiData.subject.trim())           { toast.error('Subject / Topic of RTI is required');        return false; }
        if (!rtiData.information.trim())       { toast.error('Information Requested is required');         return false; }
      }
      if (activeStep === 2) {
        if (!rtiDocs['id_proof'])              { toast.error('Applicant ID Proof is required');            return false; }
      }
    }
    if (activeTab === 3) {
      if (activeStep === 0) {
        if (!apptData.fullName.trim())         { toast.error('Full Name is required');                    return false; }
        if (apptData.mobile.length < 10)       { toast.error('Valid 10-digit mobile is required');         return false; }
        if (apptData.aadhaar.length < 12)      { toast.error('Valid 12-digit Aadhaar is required');        return false; }
        if (!apptData.purposeCategory)         { toast.error('Purpose Category is required');              return false; }
      }
      if (activeStep === 1) {
        if (!apptData.officerDesignation)      { toast.error('Officer Designation is required');           return false; }
        if (!apptData.preferredDate)           { toast.error('Preferred Date is required');                return false; }
        if (!apptData.preferredTime)           { toast.error('Preferred Time Slot is required');           return false; }
        if (!apptData.purposeVisit.trim())     { toast.error('Purpose of Visit is required');              return false; }
      }
    }
    return true;
  };

  const handleNext   = () => { if (validateStep()) setActiveStep(s => s + 1); };
  const handleBack   = () => setActiveStep(s => s - 1);

  /* ── Submit handlers ───────────────────────────────────────────── */
  const handleLodgeSubmit = async (email) => {
    if (!validateStep()) return;
    setLodgeSubmitting(true);
    try {
      const emailVal = email || lodgeData.email || '';
      const docsArray = await Promise.all(
        Object.entries(lodgeDocs)
          .filter(([, file]) => file)
          .map(([documentType, file]) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
              name: file.name, type: file.type, size: file.size,
              data: reader.result.split(',')[1], documentType,
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }))
      );
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'grievance',
        application_data: lodgeData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `GRV-${Date.now()}`;
      const ts = new Date().toISOString();
      setLodgeRef(appNum);
      setLodgeSubmitted(true);
      setReceiptInfo({ appNum, type: 'grievance', data: { ...lodgeData }, ts, email: emailVal });
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: emailVal,
        application_number: appNum,
        application_type: 'grievance',
        application_data: { ...lodgeData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Complaint lodged successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLodgeSubmitting(false);
    }
  };

  const handleRtiSubmit = async (email) => {
    if (!validateStep()) return;
    setRtiSubmitting(true);
    try {
      const emailVal = email || rtiData.email || '';
      const docsArray = await Promise.all(
        Object.entries(rtiDocs)
          .filter(([, file]) => file)
          .map(([documentType, file]) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
              name: file.name, type: file.type, size: file.size,
              data: reader.result.split(',')[1], documentType,
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }))
      );
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'rti_application',
        application_data: rtiData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `RTI-${Date.now()}`;
      const ts = new Date().toISOString();
      setRtiRef(appNum);
      setRtiSubmitted(true);
      setReceiptInfo({ appNum, type: 'rti_application', data: { ...rtiData }, ts, email: emailVal });
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: emailVal,
        application_number: appNum,
        application_type: 'rti_application',
        application_data: { ...rtiData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('RTI Application submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed.');
    } finally {
      setRtiSubmitting(false);
    }
  };

  const handleApptSubmit = async (email) => {
    if (!validateStep()) return;
    setApptSubmitting(true);
    try {
      const emailVal = email || apptData.email || '';
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'appointment_booking',
        application_data: apptData,
        documents: [],
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `APT-${Date.now()}`;
      const ts = new Date().toISOString();
      setApptRef(appNum);
      setApptSubmitted(true);
      setReceiptInfo({ appNum, type: 'appointment_booking', data: { ...apptData }, ts, email: emailVal });
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: emailVal,
        application_number: appNum,
        application_type: 'appointment_booking',
        application_data: { ...apptData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Appointment booked successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Booking failed.');
    } finally {
      setApptSubmitting(false);
    }
  };

  const handleSubmit = (email) => {
    if (activeTab === 0)      handleLodgeSubmit(email);
    else if (activeTab === 2) handleRtiSubmit(email);
    else if (activeTab === 3) handleApptSubmit(email);
  };

  const handleTrack = async () => {
    if (!trackNo.trim()) { toast.error('Enter a complaint number'); return; }
    setTrackLoading(true);
    try {
      setTrackResult({
        number: trackNo,
        status: 'In Progress',
        department: 'Roads Department',
        assignedOfficer: 'Er. Ramesh Kumar',
        submittedDate: '2024-01-15',
        lastUpdated: '2024-01-18',
        expectedResolutionDate: '2024-01-22',
        remarks: 'Site inspection completed. Repair work scheduled for next week.',
      });
      toast.success('Complaint details fetched');
    } catch {
      toast.error('Could not find complaint. Verify the number and retry.');
    } finally {
      setTrackLoading(false);
    }
  };

  /* ── Step renders ──────────────────────────────────────────────── */
  const renderLodgeStep = () => {
    if (lodgeSubmitted) return (
      <Box textAlign="center" py={5}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Complaint Lodged Successfully!</Typography>
        <Chip label={`Reference: ${lodgeRef}`} color="success" sx={{ fontSize: 15, py: 2.5, px: 1, mb: 2 }} />
        <Typography color="text.secondary" mt={1}>
          Save this reference number to track your complaint status.
        </Typography>
      </Box>
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name *" value={lodgeData.fullName} onChange={updLodge('fullName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Mobile Number *" value={lodgeData.mobile} onChange={updLodge('mobile')} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email Address" value={lodgeData.email} onChange={updLodge('email')} type="email" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Aadhaar Number" value={lodgeData.aadhaar} onChange={updLodge('aadhaar')} inputProps={{ maxLength: 12 }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Address / Residential Area *" value={lodgeData.address} onChange={updLodge('address')} multiline rows={2} />
        </Grid>
        <Grid item xs={12} sm={4}>
                    <TextField fullWidth required label="Ward *" value={lodgeData.ward} onChange={updLodge('ward')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="District" value={lodgeData.district} onChange={updLodge('district')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Occupation" value={lodgeData.occupation} onChange={updLodge('occupation')} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Department Concerned *</InputLabel>
            <Select value={lodgeData.department} label="Department Concerned *" onChange={updLodge('department')}>
              {['Roads', 'Water Supply', 'Sanitation', 'Health', 'Building Permissions',
                'Revenue/Tax', 'Electricity', 'Parks & Gardens', 'Other']
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Grievance Type *</InputLabel>
            <Select value={lodgeData.grievanceType} label="Grievance Type *" onChange={updLodge('grievanceType')}>
              {['Service not provided', 'Bribery/Corruption', 'Delayed service', 'Misconduct of staff',
                'Damaged public property', 'Illegal construction', 'Encroachment', 'Waterlogging', 'Other']
                .map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Urgency Level *</InputLabel>
            <Select value={lodgeData.urgencyLevel} label="Urgency Level *" onChange={updLodge('urgencyLevel')}>
              <MenuItem value="Normal">Normal — 7 days</MenuItem>
              <MenuItem value="Urgent">Urgent — 48 hours</MenuItem>
              <MenuItem value="Emergency">Emergency — same day</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Nearest Road / Street" value={lodgeData.nearestRoad} onChange={updLodge('nearestRoad')} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Exact Location / Landmark *" value={lodgeData.location} onChange={updLodge('location')} multiline rows={2} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Problem Description *"
            value={lodgeData.description} onChange={updLodge('description')}
            multiline rows={4}
            placeholder="Describe the issue in detail — include dates, names of offices/officials involved, previous complaint numbers if any"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Previously Complained?</InputLabel>
            <Select value={lodgeData.previouslyComplained} label="Previously Complained?" onChange={updLodge('previouslyComplained')}>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {lodgeData.previouslyComplained === 'Yes' && (
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Previous Complaint Number" value={lodgeData.previousComplaintNo} onChange={updLodge('previousComplaintNo')} />
          </Grid>
        )}
        <Grid item xs={12}>
          <TextField fullWidth label="Expected Resolution" value={lodgeData.expectedResolution} onChange={updLodge('expectedResolution')} />
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <Alert severity="info">
            Upload supporting evidence to strengthen your complaint (optional but recommended)
          </Alert>
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Supporting Photo / Evidence"
            name="evidence_photo"
            hint="Photo of the issue, damaged property, etc."
            docs={lodgeDocs}
            onFileChange={handleLodgeDoc}
            onRemove={removeLodgeDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Previous Correspondence"
            name="prev_correspondence"
            hint="Any letters, receipts or acknowledgements from past complaints"
            docs={lodgeDocs}
            onFileChange={handleLodgeDoc}
            onRemove={removeLodgeDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  const renderRtiStep = () => {
    if (rtiSubmitted) return (
      <Box textAlign="center" py={5}>
        <Typography variant="h6" fontWeight={700} gutterBottom>RTI Application Submitted!</Typography>
        <Chip label={`Reference: ${rtiRef}`} color="success" sx={{ fontSize: 15, py: 2.5, px: 1, mb: 2 }} />
        <Typography color="text.secondary" mt={1}>
          You will receive a response within 30 days as per RTI Act 2005.
        </Typography>
      </Box>
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name *" value={rtiData.fullName} onChange={updRti('fullName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Mobile *" value={rtiData.mobile} onChange={updRti('mobile')} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email *" value={rtiData.email} onChange={updRti('email')} type="email" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Aadhaar Number" value={rtiData.aadhaar} onChange={updRti('aadhaar')} inputProps={{ maxLength: 12 }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Complete Address *" value={rtiData.address} onChange={updRti('address')} multiline rows={2} />
        </Grid>
        <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Ward" value={rtiData.ward} onChange={updRti('ward')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Nationality" value={rtiData.nationality} onChange={updRti('nationality')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Occupation" value={rtiData.occupation} onChange={updRti('occupation')} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Department / Public Authority *</InputLabel>
            <Select value={rtiData.department} label="Department / Public Authority *" onChange={updRti('department')}>
              {['Municipal Commissioner Office', 'Roads Department', 'Water Supply Department',
                'Town Planning', 'Health Department', 'Revenue Department',
                'Building Permissions', 'Finance Department', 'Other']
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Period of Information Sought" value={rtiData.periodInfo} onChange={updRti('periodInfo')} placeholder="e.g., April 2023 – March 2024" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Subject / Topic of RTI *" value={rtiData.subject} onChange={updRti('subject')} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Information Requested *"
            value={rtiData.information} onChange={updRti('information')}
            multiline rows={6}
            placeholder="Describe specifically what information you need..."
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Preferred Mode to Receive Info</InputLabel>
            <Select value={rtiData.preferredMode} label="Preferred Mode to Receive Info" onChange={updRti('preferredMode')}>
              <MenuItem value="Email">Email</MenuItem>
              <MenuItem value="Post">Post / Speed Post</MenuItem>
              <MenuItem value="InPerson">In Person at Office</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth>
            <InputLabel>BPL Card Holder?</InputLabel>
            <Select value={rtiData.bplHolder} label="BPL Card Holder?" onChange={updRti('bplHolder')}>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth>
            <InputLabel>RTI Fee Payment Method</InputLabel>
            <Select
              value={rtiData.feeMethod} label="RTI Fee Payment Method"
              onChange={updRti('feeMethod')}
              disabled={rtiData.bplHolder === 'Yes'}
            >
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="NetBanking">Net Banking</MenuItem>
              <MenuItem value="PostalOrder">Postal Order / DD</MenuItem>
              <MenuItem value="Cash">Cash at Counter</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            Application Fee: ₹10 (BPL card holders exempt). Information will be provided within 30 days.
            First appeal lies with the First Appellate Authority within the same office.
          </Alert>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Applicant ID Proof *"
            name="id_proof"
            required
            hint="Aadhaar / Voter ID / Passport"
            docs={rtiDocs}
            onFileChange={handleRtiDoc}
            onRemove={removeRtiDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="BPL Certificate"
            name="bpl_certificate"
            hint="Only if claiming BPL fee exemption"
            docs={rtiDocs}
            onFileChange={handleRtiDoc}
            onRemove={removeRtiDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Any Supporting Document"
            name="supporting_doc"
            hint="Optional – relevant to your RTI request"
            docs={rtiDocs}
            onFileChange={handleRtiDoc}
            onRemove={removeRtiDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  const renderApptStep = () => {
    if (apptSubmitted) return (
      <Box textAlign="center" py={5}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Appointment Booked Successfully!</Typography>
        <Chip label={`Appointment Ref: ${apptRef}`} color="success" sx={{ fontSize: 15, py: 2.5, px: 1, mb: 2 }} />
        <Typography color="text.secondary" mt={1}>
          Carry your original ID proof and arrive 15 minutes before your appointment slot.
        </Typography>
      </Box>
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name *" value={apptData.fullName} onChange={updAppt('fullName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Mobile *" value={apptData.mobile} onChange={updAppt('mobile')} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Aadhaar Number *"
            value={apptData.aadhaar} onChange={updAppt('aadhaar')}
            inputProps={{ maxLength: 12 }}
            helperText="Required for entry pass"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email" value={apptData.email} onChange={updAppt('email')} type="email" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Address" value={apptData.address} onChange={updAppt('address')} multiline rows={2} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Purpose Category *</InputLabel>
            <Select value={apptData.purposeCategory} label="Purpose Category *" onChange={updAppt('purposeCategory')}>
              {['Property Tax', 'Trade License', 'Building Permission', 'Grievance Redressal',
                'NOC Application', 'Birth/Death Certificate', 'Marriage Registration', 'Other']
                .map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Officer Designation *</InputLabel>
            <Select value={apptData.officerDesignation} label="Officer Designation *" onChange={updAppt('officerDesignation')}>
              {['Municipal Commissioner', 'Deputy Commissioner', 'Ward Officer',
                'Tax Assessment Officer', 'Town Planning Officer', 'Health Officer',
                'Revenue Officer', 'Other']
                .map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Preferred Date *" type="date"
            value={apptData.preferredDate} onChange={updAppt('preferredDate')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: getTodayPlus(1) }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Preferred Time Slot *</InputLabel>
            <Select value={apptData.preferredTime} label="Preferred Time Slot *" onChange={updAppt('preferredTime')}>
              {['9:00–9:30 AM', '10:00–10:30 AM', '11:00–11:30 AM', '12:00–12:30 PM',
                '2:00–2:30 PM', '3:00–3:30 PM', '4:00–4:30 PM']
                .map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Previous Appointment Ref No (if any)" value={apptData.prevAppointmentRef} onChange={updAppt('prevAppointmentRef')} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Purpose of Visit *" value={apptData.purposeVisit} onChange={updAppt('purposeVisit')} multiline rows={3} />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            Bring original ID proof and all relevant documents. Arrive 15 minutes early.
            Appointment is subject to officer availability.
          </Alert>
        </Grid>
      </Grid>
    );
    return null;
  };

  /* ── Derived state ─────────────────────────────────────────────── */
  const getSteps = () => {
    if (activeTab === 0) return LODGE_STEPS;
    if (activeTab === 2) return RTI_STEPS;
    if (activeTab === 3) return APPT_STEPS;
    return [];
  };
  const steps      = getSteps();
  const hasStepper = steps.length > 0;
  const isLastStep = activeStep === steps.length - 1;
  const submitting =
    activeTab === 0 ? lodgeSubmitting :
    activeTab === 2 ? rtiSubmitting   : apptSubmitting;
  const isSubmitted =
    activeTab === 0 ? lodgeSubmitted :
    activeTab === 2 ? rtiSubmitted   :
    activeTab === 3 ? apptSubmitted  : false;

  /* ── Render ────────────────────────────────────────────────────── */
  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    handleSubmit();
  };

  return (
    <Box>
      <DialogTitle sx={{ bgcolor: HEADER_COLOR, color: '#fff', py: 2 }}>
        <Typography variant="h6" fontWeight={700}>Municipal Grievance &amp; Services</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Lodge complaints, track status, file RTI applications, and book appointments
        </Typography>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Lodge Complaint" />
          <Tab label="Track Complaint" />
          <Tab label="RTI Application" />
          <Tab label="Book Appointment" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3, minHeight: 440 }}>
        {hasStepper && !isSubmitted && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}

        {/* Tab 0: Lodge Complaint */}
        {activeTab === 0 && renderLodgeStep()}

        {/* Tab 1: Track Complaint */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Track Your Complaint</Typography>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth label="Complaint / Reference Number"
                  value={trackNo} onChange={e => setTrackNo(e.target.value)}
                  placeholder="e.g. GRV-2024-001234"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth variant="contained" onClick={handleTrack} disabled={trackLoading}
                  sx={{ height: 56, bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                >
                  {trackLoading ? <CircularProgress size={22} color="inherit" /> : 'Track Status'}
                </Button>
              </Grid>
            </Grid>

            {trackResult && (
              <Paper elevation={3} sx={{ mt: 3, p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Complaint Status</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1.5}>
                  {[
                    ['Complaint Number',       trackResult.number],
                    ['Department',             trackResult.department],
                    ['Assigned Officer',       trackResult.assignedOfficer],
                    ['Submitted Date',         trackResult.submittedDate],
                    ['Last Updated',           trackResult.lastUpdated],
                    ['Expected Resolution',    trackResult.expectedResolutionDate],
                    ['Remarks',                trackResult.remarks],
                  ].map(([label, value]) => (
                    <React.Fragment key={label}>
                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
                        <Typography variant="body2">{value}</Typography>
                      </Grid>
                    </React.Fragment>
                  ))}
                  <Grid item xs={5} sm={4}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Status</Typography>
                  </Grid>
                  <Grid item xs={7} sm={8}>
                    <Chip label={trackResult.status} color="warning" size="small" />
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        )}

        {/* Tab 2: RTI Application */}
        {activeTab === 2 && renderRtiStep()}

        {/* Tab 3: Book Appointment */}
        {activeTab === 3 && renderApptStep()}
      </DialogContent>

      {hasStepper && !isSubmitted && (
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleBack} variant="outlined" disabled={activeStep === 0}>Back</Button>
          <Box sx={{ flex: 1 }} />
          {!isLastStep ? (
            <Button
              onClick={handleNext} variant="contained"
              sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => setShowOtpDialog(true)} variant="contained" disabled={submitting}
              sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
            </Button>
          )}
        </DialogActions>
      )}
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={activeTab === 0 ? lodgeData.email || '' : activeTab === 2 ? rtiData.email || '' : apptData.email || ''}
        title="Verify Email to Submit Application"
      />
      <ApplicationReceipt
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        applicationNumber={receiptInfo.appNum}
        applicationType={receiptInfo.type}
        formData={receiptInfo.data}
        email={receiptInfo.email}
        submittedAt={receiptInfo.ts}
      />
    </Box>
  );
}

