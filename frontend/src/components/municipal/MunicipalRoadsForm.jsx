import React, { useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, Button, Tabs, Tab,
  Stepper, Step, StepLabel, Alert, Chip, CircularProgress,
  Paper, Divider, Typography, DialogContent, DialogActions,
  DialogTitle, Switch, FormControlLabel, Select, InputLabel, FormControl,
} from '@mui/material';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';
import DocUpload from './DocUpload';
import { validateFile } from './formUtils';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const HEADER_COLOR = '#e65100';
const HOVER_COLOR  = '#bf360c';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

const POT_STEPS   = ['Reporter Details', 'Damage Details',       'Location & Documents'];
const LIGHT_STEPS = ['Reporter Details', 'Light/Pole Details',   'Location & Documents'];
const DRAIN_STEPS = ['Reporter Details', 'Issue Details',        'Location & Documents'];
const CUT_STEPS   = ['Applicant Details','Work Details',         'Traffic & Safety Plan', 'Documents'];

const getTodayPlus = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function MunicipalRoadsForm({ onClose }) {
  const [activeTab,  setActiveTab]  = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  /* ── Tab 0: Pothole / Road Damage ─────────────────────────────────── */
  const [potData, setPotData] = useState({
    fullName: '', mobile: '', email: '', aadhaar: '', address: '', ward: '',
    propertyFront: '',
    roadName: '', roadType: '', damageType: '', severity: '',
    damageLength: '', damageWidth: '', potholeDepth: '',
    accidentsReported: '', damageDuration: '', drainageIssue: '',
    exactLocation: '', landmark: '', distanceFromLandmark: '', gpsCoords: '',
    previouslyReported: '', prevComplaintNo: '',
  });
  const [potDocs,       setPotDocs]       = useState({});
  const [potSubmitting, setPotSubmitting] = useState(false);
  const [potSubmitted,  setPotSubmitted]  = useState(false);
  const [potRef,        setPotRef]        = useState('');

  /* ── Tab 1: Broken Streetlight ─────────────────────────────────────── */
  const [lightData, setLightData] = useState({
    fullName: '', mobile: '', email: '', address: '', ward: '', nearestLandmark: '',
    complaintType: '', poleId: '', streetName: '', areaType: '',
    numLightsAffected: '', issueDuration: '', safetyRisk: '',
    exactLocation: '', gpsCoords: '', nearbyJunction: '',
    previouslyReported: '', prevComplaintNo: '',
  });
  const [lightDocs,       setLightDocs]       = useState({});
  const [lightSubmitting, setLightSubmitting] = useState(false);
  const [lightSubmitted,  setLightSubmitted]  = useState(false);
  const [lightRef,        setLightRef]        = useState('');

  /* ── Tab 2: Drain / Manhole / Stormwater ──────────────────────────── */
  const [drainData, setDrainData] = useState({
    fullName: '', mobile: '', email: '', address: '', ward: '',
    issueType: '', drainType: '', roadBlocked: '', floodDepth: '',
    sewageVisible: '', issueDuration: '', manholeId: '',
    exactLocation: '', nearestCrossRoad: '', gpsCoords: '', affectedLength: '',
    previouslyReported: '', prevComplaintNo: '',
  });
  const [drainDocs,       setDrainDocs]       = useState({});
  const [drainSubmitting, setDrainSubmitting] = useState(false);
  const [drainSubmitted,  setDrainSubmitted]  = useState(false);
  const [drainRef,        setDrainRef]        = useState('');

  /* ── Tab 3: Road Cutting Permit ────────────────────────────────────── */
  const [cutData, setCutData] = useState({
    applicantType: '', orgName: '', contactName: '', designation: '',
    mobile: '', email: '', officeAddress: '', regNo: '', gstin: '',
    purpose: '', roadName: '', ward: '',
    totalLength: '', trenchWidth: '', trenchDepth: '',
    startDate: '', endDate: '', workHoursFrom: '', workHoursTo: '',
    nightWork: '', completionDate: '', isMainRoad: '',
    diversionRoute: '', trafficMarshal: '', numMarshals: '',
    barricadingType: '', signage: '', safetyOfficer: '',
    noiseVibration: '', machinery: '', debrisDisposal: '',
    roadRestoration: '', restorationDeposit: '',
  });
  const [cutDocs,       setCutDocs]       = useState({});
  const [cutSubmitting, setCutSubmitting] = useState(false);
  const [cutSubmitted,  setCutSubmitted]  = useState(false);
  const [cutRef,        setCutRef]        = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [receiptAppType, setReceiptAppType] = useState('');
  const [receiptFormData, setReceiptFormData] = useState({});
  const [receiptAppNum, setReceiptAppNum] = useState('');

  /* ── Tab switch ─────────────────────────────────────────────────────── */
  const handleTabChange = (_, val) => {
    setActiveTab(val);
    setActiveStep(0);
    setPotSubmitted(false);
    setLightSubmitted(false);
    setDrainSubmitted(false);
    setCutSubmitted(false);
  };

  /* ── Field updaters ─────────────────────────────────────────────────── */
  const updPot = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile')  v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setPotData(p => ({ ...p, [f]: v }));
  };
  const updLight = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile') v = v.replace(/\D/g, '').slice(0, 10);
    setLightData(p => ({ ...p, [f]: v }));
  };
  const updDrain = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile') v = v.replace(/\D/g, '').slice(0, 10);
    setDrainData(p => ({ ...p, [f]: v }));
  };
  const updCut = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile') v = v.replace(/\D/g, '').slice(0, 10);
    setCutData(p => ({ ...p, [f]: v }));
  };

  /* ── Doc handlers ───────────────────────────────────────────────────── */
  const mkDocHandler = (setter) => (name, file) => {
    if (!file) return;
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setter(p => ({ ...p, [name]: file }));
    toast.success(`${file.name} selected`);
  };
  const mkRemove = (setter) => (name) =>
    setter(p => { const n = { ...p }; delete n[name]; return n; });

  const handlePotDoc   = mkDocHandler(setPotDocs);
  const removePotDoc   = mkRemove(setPotDocs);
  const handleLightDoc = mkDocHandler(setLightDocs);
  const removeLightDoc = mkRemove(setLightDocs);
  const handleDrainDoc = mkDocHandler(setDrainDocs);
  const removeDrainDoc = mkRemove(setDrainDocs);
  const handleCutDoc   = mkDocHandler(setCutDocs);
  const removeCutDoc   = mkRemove(setCutDocs);

  /* ── Validation ─────────────────────────────────────────────────────── */
  const validateStep = () => {
    /* ---- Tab 0: Pothole / Road Damage ---- */
    if (activeTab === 0) {
      if (activeStep === 0) {
        if (!potData.fullName.trim())      { toast.error('Full Name is required');                  return false; }
        if (potData.mobile.length < 10)    { toast.error('Valid 10-digit mobile required');         return false; }
        if (!potData.address.trim())       { toast.error('Address / Locality is required');         return false; }
        if (!potData.ward)                 { toast.error('Ward is required');                       return false; }
      }
      if (activeStep === 1) {
        if (!potData.roadName.trim())      { toast.error('Road Name / Route is required');          return false; }
        if (!potData.roadType)             { toast.error('Road Type is required');                  return false; }
        if (!potData.damageType)           { toast.error('Type of Damage is required');             return false; }
        if (!potData.severity)             { toast.error('Severity is required');                   return false; }
      }
      if (activeStep === 2) {
        if (!potData.exactLocation.trim()) { toast.error('Exact Location is required');             return false; }
        if (!potData.landmark.trim())      { toast.error('Nearest Landmark is required');           return false; }
        if (!potDocs['road_photo'])        { toast.error('Road Damage Photo is required');          return false; }
      }
    }
    /* ---- Tab 1: Broken Streetlight ---- */
    if (activeTab === 1) {
      if (activeStep === 0) {
        if (!lightData.fullName.trim())       { toast.error('Full Name is required');               return false; }
        if (lightData.mobile.length < 10)     { toast.error('Valid 10-digit mobile required');      return false; }
        if (!lightData.address.trim())        { toast.error('Address / Locality is required');      return false; }
        if (!lightData.ward)                  { toast.error('Ward is required');                    return false; }
      }
      if (activeStep === 1) {
        if (!lightData.complaintType)         { toast.error('Type of Complaint is required');       return false; }
        if (!lightData.streetName.trim())     { toast.error('Street / Road Name is required');      return false; }
        if (!lightData.numLightsAffected)     { toast.error('Number of lights affected is required');return false; }
      }
      if (activeStep === 2) {
        if (!lightData.exactLocation.trim())  { toast.error('Exact Location Description is required');return false; }
        if (!lightDocs['light_photo'])        { toast.error('Photo of Broken Streetlight is required');return false; }
      }
    }
    /* ---- Tab 2: Drain / Manhole ---- */
    if (activeTab === 2) {
      if (activeStep === 0) {
        if (!drainData.fullName.trim())       { toast.error('Full Name is required');               return false; }
        if (drainData.mobile.length < 10)     { toast.error('Valid 10-digit mobile required');      return false; }
        if (!drainData.address.trim())        { toast.error('Address / Locality is required');      return false; }
        if (!drainData.ward)                  { toast.error('Ward is required');                    return false; }
      }
      if (activeStep === 1) {
        if (!drainData.issueType)             { toast.error('Issue Type is required');              return false; }
        if (!drainData.roadBlocked)           { toast.error('Please indicate if road is blocked');  return false; }
      }
      if (activeStep === 2) {
        if (!drainData.exactLocation.trim())  { toast.error('Exact Location/Address is required');  return false; }
        if (!drainData.nearestCrossRoad.trim()){ toast.error('Nearest Cross Road is required');     return false; }
        if (!drainDocs['drain_photo'])        { toast.error('Photo of Drain/Manhole Issue is required');return false; }
      }
    }
    /* ---- Tab 3: Road Cutting Permit ---- */
    if (activeTab === 3) {
      if (activeStep === 0) {
        if (!cutData.orgName.trim())          { toast.error('Organisation / Company Name is required');return false; }
        if (!cutData.contactName.trim())      { toast.error('Contact Person Name is required');     return false; }
        if (!cutData.designation.trim())      { toast.error('Designation is required');             return false; }
        if (cutData.mobile.length < 10)       { toast.error('Valid 10-digit mobile required');      return false; }
        if (!cutData.email.trim())            { toast.error('Official Email is required');          return false; }
        if (!cutData.officeAddress.trim())    { toast.error('Office Address is required');          return false; }
      }
      if (activeStep === 1) {
        if (!cutData.purpose)                 { toast.error('Purpose of Road Cutting is required'); return false; }
        if (!cutData.roadName.trim())         { toast.error('Road / Street Name is required');      return false; }
        if (!cutData.ward)                    { toast.error('Ward is required');                    return false; }
        if (!cutData.totalLength)             { toast.error('Total Length of Cutting is required'); return false; }
        if (!cutData.trenchWidth)             { toast.error('Width of Trench is required');         return false; }
        if (!cutData.trenchDepth)             { toast.error('Depth of Trench is required');         return false; }
        if (!cutData.startDate)               { toast.error('Proposed Start Date is required');     return false; }
        if (!cutData.endDate)                 { toast.error('Proposed End Date is required');       return false; }
      }
      if (activeStep === 2) {
        if (!cutData.roadRestoration)         { toast.error('Road Restoration Method is required'); return false; }
      }
      if (activeStep === 3) {
        if (!cutDocs['work_order'])           { toast.error('Work Order / Sanction Letter is required');return false; }
        if (!cutDocs['authorisation_letter']) { toast.error('Organisation Authorisation Letter is required');return false; }
      }
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) setActiveStep(s => s + 1); };
  const handleBack = () => setActiveStep(s => s - 1);

  /* ── Submit handlers ────────────────────────────────────────────────── */
  const handlePotSubmit = async (email) => {
    if (!validateStep()) return;
    setPotSubmitting(true);
    try {
      const docsArray = await Promise.all(
        Object.entries(potDocs)
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
        application_type: 'road_damage_report',
        application_data: potData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `RDC-${Date.now()}`;
      setPotRef(appNum);
      setPotSubmitted(true);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('road_damage_report');
      setReceiptFormData({ ...potData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'road_damage_report',
        application_data: { ...potData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Road damage complaint submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setPotSubmitting(false);
    }
  };

  const handleLightSubmit = async (email) => {
    if (!validateStep()) return;
    setLightSubmitting(true);
    try {
      const docsArray = await Promise.all(
        Object.entries(lightDocs)
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
        application_type: 'streetlight_complaint',
        application_data: lightData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `SLC-${Date.now()}`;
      setLightRef(appNum);
      setLightSubmitted(true);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('streetlight_complaint');
      setReceiptFormData({ ...lightData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'streetlight_complaint',
        application_data: { ...lightData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Streetlight complaint submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLightSubmitting(false);
    }
  };

  const handleDrainSubmit = async (email) => {
    if (!validateStep()) return;
    setDrainSubmitting(true);
    try {
      const docsArray = await Promise.all(
        Object.entries(drainDocs)
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
        application_type: 'drain_manhole_complaint',
        application_data: drainData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `DRN-${Date.now()}`;
      setDrainRef(appNum);
      setDrainSubmitted(true);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('drain_complaint');
      setReceiptFormData({ ...drainData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'drain_manhole_complaint',
        application_data: { ...drainData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Drain/manhole complaint submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setDrainSubmitting(false);
    }
  };

  const handleCutSubmit = async (email) => {
    if (!validateStep()) return;
    setCutSubmitting(true);
    try {
      const docsArray = await Promise.all(
        Object.entries(cutDocs)
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
        application_type: 'road_cutting_permit',
        application_data: cutData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `RCP-${Date.now()}`;
      setCutRef(appNum);
      setCutSubmitted(true);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('road_cutting_permit');
      setReceiptFormData({ ...cutData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'road_cutting_permit',
        application_data: { ...cutData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Road cutting permit application submitted!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setCutSubmitting(false);
    }
  };

  const handleSubmit = (email) => {
    if (activeTab === 0)      handlePotSubmit(email);
    else if (activeTab === 1) handleLightSubmit(email);
    else if (activeTab === 2) handleDrainSubmit(email);
    else if (activeTab === 3) handleCutSubmit(email);
  };

  /* ── Success screen ─────────────────────────────────────────────────── */
  const SuccessScreen = ({ refNo, nextSteps }) => (
    <Box textAlign="center" py={4}>
      <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 1.5 }} />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Application Submitted Successfully!
      </Typography>
      <Chip
        label={`Reference: ${refNo}`}
        color="success"
        sx={{ fontSize: 15, py: 2.5, px: 1, mb: 2 }}
      />
      <Alert severity="info" sx={{ textAlign: 'left', mb: 3 }}>
        {nextSteps}
      </Alert>
      <Button variant="outlined" onClick={onClose}>Close</Button>
    </Box>
  );

  /* ════════════════════════════════════════════════════════════════════
     TAB 0 — POTHOLE / ROAD DAMAGE
  ════════════════════════════════════════════════════════════════════ */
  const renderPotStep = () => {
    if (potSubmitted) return (
      <SuccessScreen
        refNo={potRef}
        nextSteps="Your road damage complaint has been registered. The Roads Department will inspect the site within 3–5 working days. You can track your complaint using the reference number. For emergency road hazards call 1800-XXX-XXXX (24×7)."
      />
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name *" value={potData.fullName} onChange={updPot('fullName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Mobile *" value={potData.mobile}
            onChange={updPot('mobile')} inputProps={{ maxLength: 10 }}
            placeholder="10-digit mobile number"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email" type="email" value={potData.email} onChange={updPot('email')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Aadhaar Number" value={potData.aadhaar}
            onChange={updPot('aadhaar')} inputProps={{ maxLength: 12 }}
            placeholder="12-digit Aadhaar"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Address / Locality *" value={potData.address}
            onChange={updPot('address')} multiline rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={potData.ward} onChange={updPot('ward')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Is road in front of your property?</InputLabel>
            <Select
              value={potData.propertyFront}
              label="Is road in front of your property?"
              onChange={updPot('propertyFront')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
              <MenuItem value="Nearby area">Nearby area</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Road Name / Route *" value={potData.roadName} onChange={updPot('roadName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Road Type *</InputLabel>
            <Select value={potData.roadType} label="Road Type *" onChange={updPot('roadType')}>
              {[
                'Municipal road', 'State highway passing through city', 'Internal colony road',
                'Market road', 'School/Hospital zone road', 'Bridge approach road', 'Service lane',
              ].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Type of Damage *</InputLabel>
            <Select value={potData.damageType} label="Type of Damage *" onChange={updPot('damageType')}>
              {[
                'Pothole — small <30cm', 'Pothole — large >30cm', 'Road collapse/sinkage',
                'Damaged road edge/shoulder', 'Broken divider/median', 'Missing road studs/cats-eyes',
                'Damaged speed breaker', 'Broken footpath adjacent to road',
                'Waterlogging on road', 'Other',
              ].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Severity *</InputLabel>
            <Select value={potData.severity} label="Severity *" onChange={updPot('severity')}>
              {[
                'Minor — passable safely', 'Moderate — causing inconvenience',
                'Severe — risk to 2-wheelers', 'Critical — risk to all vehicles',
                'Emergency — immediate risk to life',
              ].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {(potData.severity === 'Critical — risk to all vehicles' ||
          potData.severity === 'Emergency — immediate risk to life') && (
          <Grid item xs={12}>
            <Alert severity="error">
              Emergency road damage! Please also call our 24×7 Roads Helpline: 1800-XXX-XXXX
            </Alert>
          </Grid>
        )}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth label="Approximate Length of Damage (meters)"
            value={potData.damageLength} onChange={updPot('damageLength')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth label="Approximate Width of Damage (meters)"
            value={potData.damageWidth} onChange={updPot('damageWidth')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth label="Depth of Pothole (cm) — if applicable"
            value={potData.potholeDepth} onChange={updPot('potholeDepth')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Any accidents reported due to this?</InputLabel>
            <Select
              value={potData.accidentsReported}
              label="Any accidents reported due to this?"
              onChange={updPot('accidentsReported')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
              <MenuItem value="Unknown">Unknown</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>How long has this damage existed?</InputLabel>
            <Select
              value={potData.damageDuration}
              label="How long has this damage existed?"
              onChange={updPot('damageDuration')}
            >
              {['Less than 1 week', '1–4 weeks', '1–3 months', 'More than 3 months']
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Any drainage issue contributing?</InputLabel>
            <Select
              value={potData.drainageIssue}
              label="Any drainage issue contributing?"
              onChange={updPot('drainageIssue')}
            >
              <MenuItem value="Yes — blocked drain nearby">Yes — blocked drain nearby</MenuItem>
              <MenuItem value="No">No</MenuItem>
              <MenuItem value="Unsure">Unsure</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Exact GPS/Address Location *"
            value={potData.exactLocation} onChange={updPot('exactLocation')}
            multiline rows={2}
            placeholder="Plot no, street, nearest junction"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Nearest Landmark *" value={potData.landmark} onChange={updPot('landmark')} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="Distance from Landmark (meters)"
            value={potData.distanceFromLandmark} onChange={updPot('distanceFromLandmark')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="GPS Coordinates (optional)"
            value={potData.gpsCoords} onChange={updPot('gpsCoords')}
            placeholder="e.g. 18.9220° N, 72.8347° E"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Previously Reported?</InputLabel>
            <Select
              value={potData.previouslyReported}
              label="Previously Reported?"
              onChange={updPot('previouslyReported')}
            >
              <MenuItem value="Yes">Yes — I have a complaint no.</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {potData.previouslyReported === 'Yes' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Previous Complaint No."
              value={potData.prevComplaintNo} onChange={updPot('prevComplaintNo')}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Road Damage Photo *" name="road_photo" required
            hint="Clear photo showing damage extent"
            docs={potDocs} onFileChange={handlePotDoc} onRemove={removePotDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Additional Photo (wide angle/context)" name="context_photo"
            hint="Shows surrounding area and hazard"
            docs={potDocs} onFileChange={handlePotDoc} onRemove={removePotDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Accident Report (if any)" name="accident_report"
            hint="FIR / hospital report if accident occurred"
            docs={potDocs} onFileChange={handlePotDoc} onRemove={removePotDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  /* ════════════════════════════════════════════════════════════════════
     TAB 1 — BROKEN STREETLIGHT / PUBLIC LIGHTING
  ════════════════════════════════════════════════════════════════════ */
  const renderLightStep = () => {
    const isDanger = ['Damaged pole — fallen/leaning', 'Exposed wiring on pole']
      .includes(lightData.complaintType);

    if (lightSubmitted) return (
      <SuccessScreen
        refNo={lightRef}
        nextSteps="Your streetlight / public lighting complaint has been registered. The Electrical Department will inspect the site within 2–3 working days. For electrical hazards or fallen poles, contact Emergency: 100 / Electricity Department immediately."
      />
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name *" value={lightData.fullName} onChange={updLight('fullName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Mobile *" value={lightData.mobile}
            onChange={updLight('mobile')} inputProps={{ maxLength: 10 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email" type="email" value={lightData.email} onChange={updLight('email')} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Address / Locality *" value={lightData.address}
            onChange={updLight('address')} multiline rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={lightData.ward} onChange={updLight('ward')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Nearest Identifiable Landmark"
            value={lightData.nearestLandmark} onChange={updLight('nearestLandmark')}
          />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Type of Complaint *</InputLabel>
            <Select
              value={lightData.complaintType}
              label="Type of Complaint *"
              onChange={updLight('complaintType')}
            >
              {[
                'Light not working', 'Light flickering/unstable', 'Damaged pole — standing',
                'Broken pole — fallen/leaning', 'Exposed wiring on pole', 'Light on during daytime',
                'Light too dim', 'Light cover/shade broken', 'Transformer/cable box issue',
                'CCTV camera on pole damaged', 'Other',
              ].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {isDanger && (
          <Grid item xs={12}>
            <Alert severity="error">
              DANGER! Do not touch the pole or wire. Keep public away. Contact Emergency: 100 / Electricity Dept immediately.
            </Alert>
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Pole/Light ID Number"
            value={lightData.poleId} onChange={updLight('poleId')}
            placeholder="Usually painted on the pole"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Street / Road Name *" value={lightData.streetName} onChange={updLight('streetName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Type of Area</InputLabel>
            <Select value={lightData.areaType} label="Type of Area" onChange={updLight('areaType')}>
              {[
                'Residential street', 'Main road', 'Highway', 'Market area',
                'School/hospital zone', 'Park/garden', 'Bridge/underpass', 'Other',
              ].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Number of lights affected *</InputLabel>
            <Select
              value={lightData.numLightsAffected}
              label="Number of lights affected *"
              onChange={updLight('numLightsAffected')}
            >
              {['1', '2–5', '6–10', 'More than 10'].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>How long has this issue persisted?</InputLabel>
            <Select
              value={lightData.issueDuration}
              label="How long has this issue persisted?"
              onChange={updLight('issueDuration')}
            >
              {['Today', '1–7 days', '1–4 weeks', 'More than 1 month']
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Does it create safety risk at night?</InputLabel>
            <Select
              value={lightData.safetyRisk}
              label="Does it create safety risk at night?"
              onChange={updLight('safetyRisk')}
            >
              <MenuItem value="Yes — area is completely dark">Yes — area is completely dark</MenuItem>
              <MenuItem value="Yes — partially dark">Yes — partially dark</MenuItem>
              <MenuItem value="No — other lights cover the area">No — other lights cover the area</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Exact Location Description *"
            value={lightData.exactLocation} onChange={updLight('exactLocation')}
            multiline rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="GPS Coordinates (optional)"
            value={lightData.gpsCoords} onChange={updLight('gpsCoords')}
            placeholder="e.g. 18.9220° N, 72.8347° E"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Nearby Junction / Cross Road"
            value={lightData.nearbyJunction} onChange={updLight('nearbyJunction')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Previously Reported?</InputLabel>
            <Select
              value={lightData.previouslyReported}
              label="Previously Reported?"
              onChange={updLight('previouslyReported')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {lightData.previouslyReported === 'Yes' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Previous Complaint No."
              value={lightData.prevComplaintNo} onChange={updLight('prevComplaintNo')}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Photo of Broken/Dark Streetlight *" name="light_photo" required
            docs={lightDocs} onFileChange={handleLightDoc} onRemove={removeLightDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Photo of Damaged Pole/Wiring" name="pole_photo"
            hint="Critical for safety hazards — wires, broken poles"
            docs={lightDocs} onFileChange={handleLightDoc} onRemove={removeLightDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  /* ════════════════════════════════════════════════════════════════════
     TAB 2 — DRAIN / MANHOLE / STORMWATER
  ════════════════════════════════════════════════════════════════════ */
  const renderDrainStep = () => {
    const isOpenManhole = drainData.issueType.includes('Open') || drainData.issueType.includes('Missing');
    const isDeepFlooding = ['Waist deep', 'More than waist'].includes(drainData.floodDepth);

    if (drainSubmitted) return (
      <SuccessScreen
        refNo={drainRef}
        nextSteps="Your drain/manhole complaint has been registered. The Drainage Department will attend to the issue within 24–48 hours. For open manhole or sewage emergencies, call Roads Emergency: 1800-XXX-XXXX immediately."
      />
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name *" value={drainData.fullName} onChange={updDrain('fullName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Mobile *" value={drainData.mobile}
            onChange={updDrain('mobile')} inputProps={{ maxLength: 10 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email" type="email" value={drainData.email} onChange={updDrain('email')} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Address / Locality *" value={drainData.address}
            onChange={updDrain('address')} multiline rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={drainData.ward} onChange={updDrain('ward')} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Issue Type *</InputLabel>
            <Select value={drainData.issueType} label="Issue Type *" onChange={updDrain('issueType')}>
              {[
                'Open/uncovered manhole', 'Broken manhole cover', 'Overflowing drain',
                'Blocked drain — no water flow', 'Foul smell from drain', 'Drain causing waterlogging',
                'Missing manhole cover', 'Collapsed drain/sewer', 'Sewage mixing in stormwater', 'Other',
              ].map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {isOpenManhole && (
          <Grid item xs={12}>
            <Alert severity="error">
              DANGER: Open manhole! Please barricade immediately and call Roads Emergency: 1800-XXX-XXXX
            </Alert>
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Drain/Manhole Type</InputLabel>
            <Select value={drainData.drainType} label="Drain/Manhole Type" onChange={updDrain('drainType')}>
              {[
                'Main sewer manhole', 'Stormwater drain', 'Road-side nala',
                'Internal colony drain', 'Underground sewer', 'Not known',
              ].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Is the road/path blocked due to this? *</InputLabel>
            <Select
              value={drainData.roadBlocked}
              label="Is the road/path blocked due to this? *"
              onChange={updDrain('roadBlocked')}
            >
              <MenuItem value="Yes — completely blocked">Yes — completely blocked</MenuItem>
              <MenuItem value="Yes — partially blocked">Yes — partially blocked</MenuItem>
              <MenuItem value="No — only flooding">No — only flooding</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Approximate Depth of Water / Flooding</InputLabel>
            <Select
              value={drainData.floodDepth}
              label="Approximate Depth of Water / Flooding"
              onChange={updDrain('floodDepth')}
            >
              {['No standing water', 'Up to ankle level', 'Knee deep', 'Waist deep', 'More than waist']
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {isDeepFlooding && (
          <Grid item xs={12}>
            <Alert severity="warning">
              Severe flooding — do not attempt to cross. Move to higher ground.
            </Alert>
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Is sewage visible / foul smell?</InputLabel>
            <Select
              value={drainData.sewageVisible}
              label="Is sewage visible / foul smell?"
              onChange={updDrain('sewageVisible')}
            >
              <MenuItem value="Yes — sewage overflow">Yes — sewage overflow</MenuItem>
              <MenuItem value="Yes — foul smell only">Yes — foul smell only</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>How long has this been happening?</InputLabel>
            <Select
              value={drainData.issueDuration}
              label="How long has this been happening?"
              onChange={updDrain('issueDuration')}
            >
              {['Just started today', '2–7 days', '1–4 weeks', 'Recurring/chronic']
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Nearest manhole/drain ID (if visible)"
            value={drainData.manholeId} onChange={updDrain('manholeId')}
          />
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Exact Location/Address *"
            value={drainData.exactLocation} onChange={updDrain('exactLocation')}
            multiline rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Nearest Cross Road / Junction *"
            value={drainData.nearestCrossRoad} onChange={updDrain('nearestCrossRoad')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="GPS Coordinates (optional)"
            value={drainData.gpsCoords} onChange={updDrain('gpsCoords')}
            placeholder="e.g. 18.9220° N, 72.8347° E"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Affected Length of drain (approx. meters)"
            value={drainData.affectedLength} onChange={updDrain('affectedLength')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Previously Reported?</InputLabel>
            <Select
              value={drainData.previouslyReported}
              label="Previously Reported?"
              onChange={updDrain('previouslyReported')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {drainData.previouslyReported === 'Yes' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Previous Complaint No."
              value={drainData.prevComplaintNo} onChange={updDrain('prevComplaintNo')}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Photo of Drain/Manhole Issue *" name="drain_photo" required
            docs={drainDocs} onFileChange={handleDrainDoc} onRemove={removeDrainDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Additional Photo — Water Level / Flooding" name="flood_photo"
            hint="Shows depth and spread of issue"
            docs={drainDocs} onFileChange={handleDrainDoc} onRemove={removeDrainDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Video File (short clip)" name="video_evidence"
            hint="Optional — .mp4 under 5MB"
            accept=".mp4,.mov"
            docs={drainDocs} onFileChange={handleDrainDoc} onRemove={removeDrainDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  /* ════════════════════════════════════════════════════════════════════
     TAB 3 — ROAD CUTTING PERMIT
  ════════════════════════════════════════════════════════════════════ */
  const renderCutStep = () => {
    if (cutSubmitted) return (
      <SuccessScreen
        refNo={cutRef}
        nextSteps="Your road cutting permit application has been registered. The Roads Department will review it within 3–5 working days. A site inspection may be scheduled. Permit (if approved) is issued within 7–10 working days. Pay the road restoration deposit before commencing work."
      />
    );

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Applicant Type *</InputLabel>
            <Select value={cutData.applicantType} label="Applicant Type *" onChange={updCut('applicantType')}>
              {[
                'Government department', 'Semi-government/PSU', 'Telecom company',
                'Internet/cable provider', 'Water supply dept.', 'Gas utility',
                'Electricity dept.', 'Private contractor on behalf of above', 'Individual/Builder',
              ].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Organisation / Company Name *"
            value={cutData.orgName} onChange={updCut('orgName')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Contact Person Name *"
            value={cutData.contactName} onChange={updCut('contactName')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Designation *"
            value={cutData.designation} onChange={updCut('designation')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Official Mobile *" value={cutData.mobile}
            onChange={updCut('mobile')} inputProps={{ maxLength: 10 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Official Email *" type="email"
            value={cutData.email} onChange={updCut('email')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Office Address *"
            value={cutData.officeAddress} onChange={updCut('officeAddress')}
            multiline rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Organisation Registration / License No."
            value={cutData.regNo} onChange={updCut('regNo')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="GSTIN (Optional)"
            value={cutData.gstin} onChange={updCut('gstin')}
          />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Purpose of Road Cutting *</InputLabel>
            <Select value={cutData.purpose} label="Purpose of Road Cutting *" onChange={updCut('purpose')}>
              {[
                'Water pipeline laying/repair', 'Sewer line laying/repair', 'Gas pipeline laying',
                'Telephone/optical fiber cable', 'Electricity cable/transformer',
                'Storm water drain', 'Road widening work', 'Bridge/culvert repair', 'Other civic work',
              ].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Road / Street Name(s) *"
            value={cutData.roadName} onChange={updCut('roadName')}
            placeholder="Comma-separated if multiple roads"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={cutData.ward} onChange={updCut('ward')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Total Length of Cutting Required (meters) *"
            value={cutData.totalLength} onChange={updCut('totalLength')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="Width of Trench (cm) *"
            value={cutData.trenchWidth} onChange={updCut('trenchWidth')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="Depth of Trench (cm) *"
            value={cutData.trenchDepth} onChange={updCut('trenchDepth')}
            type="number" inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Proposed Start Date *" type="date"
            value={cutData.startDate} onChange={updCut('startDate')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: getTodayPlus(3) }}
            helperText="Minimum 3 days advance notice required"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Proposed End Date *" type="date"
            value={cutData.endDate} onChange={updCut('endDate')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: cutData.startDate || getTodayPlus(3) }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="Working Hours — From" type="time"
            value={cutData.workHoursFrom} onChange={updCut('workHoursFrom')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="Working Hours — To" type="time"
            value={cutData.workHoursTo} onChange={updCut('workHoursTo')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth>
            <InputLabel>Night Work Required?</InputLabel>
            <Select value={cutData.nightWork} label="Night Work Required?" onChange={updCut('nightWork')}>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth label="Full Road Restoration by (date)" type="date"
            value={cutData.completionDate} onChange={updCut('completionDate')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: cutData.endDate || getTodayPlus(3) }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Is work over main road?</InputLabel>
            <Select value={cutData.isMainRoad} label="Is work over main road?" onChange={updCut('isMainRoad')}>
              <MenuItem value="Yes — state highway">Yes — state highway</MenuItem>
              <MenuItem value="Yes — municipal main road">Yes — municipal main road</MenuItem>
              <MenuItem value="No — internal/service road">No — internal/service road</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            fullWidth label="Alternative Route for Diversion"
            value={cutData.diversionRoute} onChange={updCut('diversionRoute')}
            placeholder="Describe alternate route for traffic"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Traffic Marshal arranged?</InputLabel>
            <Select
              value={cutData.trafficMarshal}
              label="Traffic Marshal arranged?"
              onChange={updCut('trafficMarshal')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {cutData.trafficMarshal === 'Yes' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Number of traffic marshals/guards *"
              value={cutData.numMarshals} onChange={updCut('numMarshals')}
              type="number" inputProps={{ min: 1 }}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Barricading type *</InputLabel>
            <Select value={cutData.barricadingType} label="Barricading type *" onChange={updCut('barricadingType')}>
              {[
                'Metal barricades', 'Plastic delineators', 'Sandbags',
                'Road cones only', 'Will be decided on site',
              ].map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Signage / Warning lights at night?</InputLabel>
            <Select
              value={cutData.signage}
              label="Signage / Warning lights at night?"
              onChange={updCut('signage')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Safety Officer Assigned (Name)"
            value={cutData.safetyOfficer} onChange={updCut('safetyOfficer')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Will work create noise/vibration?</InputLabel>
            <Select
              value={cutData.noiseVibration}
              label="Will work create noise/vibration?"
              onChange={updCut('noiseVibration')}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Machinery/equipment to be used"
            value={cutData.machinery} onChange={updCut('machinery')}
            placeholder="e.g., JCB, Pipe layer, Welding tools"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Debris disposal arrangement *</InputLabel>
            <Select
              value={cutData.debrisDisposal}
              label="Debris disposal arrangement *"
              onChange={updCut('debrisDisposal')}
            >
              <MenuItem value="Municipal garbage van contracted">Municipal garbage van contracted</MenuItem>
              <MenuItem value="Own vehicle">Own vehicle</MenuItem>
              <MenuItem value="Left on site — describe">Left on site — describe</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Road restoration method *</InputLabel>
            <Select
              value={cutData.roadRestoration}
              label="Road restoration method *"
              onChange={updCut('roadRestoration')}
            >
              {[
                'Full bituminous recarpeting', 'Patch repair with bitumen', 'Paver blocks relaid',
                'Concrete cutting and rejoining', 'Municipal will restore — pay charges', 'Other',
              ].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Deposit for road restoration (₹)"
            value={cutData.restorationDeposit} onChange={updCut('restorationDeposit')}
            type="number" inputProps={{ min: 0 }}
            placeholder="As per road cutting bylaws. Amount will be specified in permit"
          />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            Road restoration deposit is mandatory. Failure to restore within specified period will lead to forfeiture of deposit and blacklisting of agency.
          </Alert>
        </Grid>
      </Grid>
    );

    if (activeStep === 3) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Work Order / Sanction Letter *" name="work_order" required
            hint="From competent authority — BSNL/MSEDCL/PWD/etc."
            docs={cutDocs} onFileChange={handleCutDoc} onRemove={removeCutDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Organisation Authorisation Letter *" name="authorisation_letter" required
            hint="Signed by head of organisation"
            docs={cutDocs} onFileChange={handleCutDoc} onRemove={removeCutDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Site Plan showing road cutting path *" name="site_plan"
            docs={cutDocs} onFileChange={handleCutDoc} onRemove={removeCutDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Applicant ID / Company Certificate" name="company_cert"
            docs={cutDocs} onFileChange={handleCutDoc} onRemove={removeCutDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Environmental Clearance" name="env_clearance"
            hint="Required for major utility works"
            docs={cutDocs} onFileChange={handleCutDoc} onRemove={removeCutDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  /* ── Derived state ──────────────────────────────────────────────────── */
  const getSteps = () => {
    if (activeTab === 0) return POT_STEPS;
    if (activeTab === 1) return LIGHT_STEPS;
    if (activeTab === 2) return DRAIN_STEPS;
    return CUT_STEPS;
  };
  const steps      = getSteps();
  const isLastStep = activeStep === steps.length - 1;
  const isSubmitted =
    activeTab === 0 ? potSubmitted :
    activeTab === 1 ? lightSubmitted :
    activeTab === 2 ? drainSubmitted :
    cutSubmitted;
  const submitting =
    activeTab === 0 ? potSubmitting :
    activeTab === 1 ? lightSubmitting :
    activeTab === 2 ? drainSubmitting :
    cutSubmitting;

  /* ── Render ─────────────────────────────────────────────────────────── */
  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    handleSubmit(email);
  };

  return (
    <Box>
      <DialogTitle sx={{ bgcolor: HEADER_COLOR, color: '#fff', py: 2 }}>
        <Typography variant="h6" fontWeight={700}>Municipal Roads &amp; Infrastructure</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Report potholes, broken streetlights, drain/manhole issues, or apply for road cutting permits
        </Typography>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Pothole / Road Damage" />
          <Tab label="Broken Streetlight" />
          <Tab label="Drain / Manhole" />
          <Tab label="Road Cutting Permit" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3, minHeight: 440 }}>
        {!isSubmitted && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}

        {activeTab === 0 && renderPotStep()}
        {activeTab === 1 && renderLightStep()}
        {activeTab === 2 && renderDrainStep()}
        {activeTab === 3 && renderCutStep()}
      </DialogContent>

      {!isSubmitted && (
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleBack} variant="outlined" disabled={activeStep === 0}>
            Back
          </Button>
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
        initialEmail={activeTab === 0 ? potData.email || '' : activeTab === 1 ? lightData.email || '' : activeTab === 2 ? drainData.email || '' : cutData.email || ''}
        title="Verify Email to Submit Application"
      />
      <ApplicationReceipt
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        applicationNumber={receiptAppNum}
        applicationType={receiptAppType}
        formData={receiptFormData}
        email={verifiedEmail}
        submittedAt={submittedAt}
      />
    </Box>
  );
}

