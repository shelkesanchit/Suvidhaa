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

const HEADER_COLOR = '#5d4037';
const HOVER_COLOR  = '#3e2723';
const WARDS        = Array.from({ length: 10 }, (_, i) => `Ward ${i + 1}`);

const GARB_STEPS = ['Your Details',    'Complaint Details',  'Photos & Submit'];
const BULK_STEPS = ['Contact Details', 'Pickup Request',     'Confirm'];
const SANI_STEPS = ['Your Details',    'Service Request',    'Submit'];

const getTodayPlus = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function MunicipalSanitationForm({ onClose }) {
  const [activeTab,  setActiveTab]  = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  /* ── Garbage Complaint ─────────────────────────────────────────── */
  const [garbData, setGarbData] = useState({
    fullName: '', mobile: '', email: '', aadhaar: '',
    address: '', ward: '', altContact: '',
    complaintType: '', collectionPoint: '', nearestLandmark: '',
    daysSinceCollection: '', frequencyOfIssue: '', approxVolume: '',
    typeOfWaste: [], healthRisk: '', description: '',
  });
  const [garbDocs,       setGarbDocs]       = useState({});
  const [garbSubmitting, setGarbSubmitting] = useState(false);
  const [garbSubmitted,  setGarbSubmitted]  = useState(false);
  const [garbRef,        setGarbRef]        = useState('');

  /* ── Bulk Waste Pickup ─────────────────────────────────────────── */
  const [bulkData, setBulkData] = useState({
    fullName: '', mobile: '', email: '', aadhaar: '',
    premisesAddress: '', ward: '', altMobile: '',
    wasteType: '', approxQuantity: '', preferredDate: '',
    preferredTime: '', vehicleType: '', laneWidth: '',
    specialInstructions: '', isCommercial: 'No',
  });
  const [bulkDeclaration, setBulkDeclaration] = useState(false);
  const [bulkSubmitting,  setBulkSubmitting]  = useState(false);
  const [bulkSubmitted,   setBulkSubmitted]   = useState(false);
  const [bulkRef,         setBulkRef]         = useState('');

  /* ── Pay Solid Waste Charges ───────────────────────────────────── */
  const [swConsumerNo,   setSwConsumerNo]   = useState('');
  const [swBillData,     setSwBillData]     = useState(null);
  const [swPayMethod,    setSwPayMethod]    = useState('UPI');
  const [swFetching,     setSwFetching]     = useState(false);
  const [swPaying,       setSwPaying]       = useState(false);
  const [swPaid,         setSwPaid]         = useState(false);
  const [swReceiptNo,    setSwReceiptNo]    = useState('');

  /* ── Sanitation Services Request ───────────────────────────────── */
  const [saniData, setSaniData] = useState({
    fullName: '', mobile: '', email: '',
    address: '', ward: '', aadhaar: '',
    requestType: '', premisesType: '', locationDescription: '',
    serviceFrequency: '', urgency: 'Normal',
    numLabourers: '', equipmentNeeded: '', additionalNotes: '',
  });
  const [saniSubmitting, setSaniSubmitting] = useState(false);
  const [saniSubmitted,  setSaniSubmitted]  = useState(false);
  const [saniRef,        setSaniRef]        = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [receiptAppType, setReceiptAppType] = useState('');
  const [receiptFormData, setReceiptFormData] = useState({});
  const [receiptAppNum, setReceiptAppNum] = useState('');

  /* ── Tab switch ────────────────────────────────────────────────── */
  const handleTabChange = (_, val) => { setActiveTab(val); setActiveStep(0); };

  /* ── Field updaters ────────────────────────────────────────────── */
  const updGarb = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile' || f === 'altContact') v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setGarbData(p => ({ ...p, [f]: v }));
  };
  const updBulk = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile' || f === 'altMobile') v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setBulkData(p => ({ ...p, [f]: v }));
  };
  const updSani = (f) => (e) => {
    let v = e.target.value;
    if (f === 'mobile') v = v.replace(/\D/g, '').slice(0, 10);
    if (f === 'aadhaar') v = v.replace(/\D/g, '').slice(0, 12);
    setSaniData(p => ({ ...p, [f]: v }));
  };

  /* ── Doc handlers ──────────────────────────────────────────────── */
  const mkDocHandler = (setter) => (name, file) => {
    if (!file) return;
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setter(p => ({ ...p, [name]: file }));
    toast.success(`${file.name} selected`);
  };
  const mkRemoveHandler = (setter) => (name) =>
    setter(p => { const n = { ...p }; delete n[name]; return n; });

  const handleGarbDoc  = mkDocHandler(setGarbDocs);
  const removeGarbDoc  = mkRemoveHandler(setGarbDocs);

  /* ── Validation ────────────────────────────────────────────────── */
  const validateStep = () => {
    if (activeTab === 0) {
      if (activeStep === 0) {
        if (!garbData.fullName.trim())        { toast.error('Full Name is required');                   return false; }
        if (garbData.mobile.length < 10)      { toast.error('Valid 10-digit mobile is required');        return false; }
        if (!garbData.address.trim())         { toast.error('Address is required');                      return false; }
        if (!garbData.ward)                   { toast.error('Ward is required');                         return false; }
      }
      if (activeStep === 1) {
        if (!garbData.complaintType)          { toast.error('Complaint Type is required');               return false; }
        if (!garbData.collectionPoint.trim()) { toast.error('Collection Point / Area is required');      return false; }
        if (!garbData.nearestLandmark.trim()) { toast.error('Nearest Landmark is required');             return false; }
      }
      if (activeStep === 2) {
        if (!garbDocs['garbage_photo'])       { toast.error('Photo of Garbage Issue is required');       return false; }
      }
    }
    if (activeTab === 1) {
      if (activeStep === 0) {
        if (!bulkData.fullName.trim())        { toast.error('Full Name is required');                    return false; }
        if (bulkData.mobile.length < 10)      { toast.error('Valid 10-digit mobile is required');         return false; }
        if (!bulkData.premisesAddress.trim()) { toast.error('Premises Address is required');             return false; }
        if (!bulkData.ward)                   { toast.error('Ward is required');                         return false; }
      }
      if (activeStep === 1) {
        if (!bulkData.wasteType)              { toast.error('Waste Type is required');                   return false; }
        if (!bulkData.approxQuantity)         { toast.error('Approximate Quantity is required');         return false; }
        if (!bulkData.preferredDate)          { toast.error('Preferred Pickup Date is required');        return false; }
      }
      if (activeStep === 2) {
        if (!bulkDeclaration)                 { toast.error('Please confirm the declaration to proceed'); return false; }
      }
    }
    if (activeTab === 3) {
      if (activeStep === 0) {
        if (!saniData.fullName.trim())        { toast.error('Full Name is required');                    return false; }
        if (saniData.mobile.length < 10)      { toast.error('Valid 10-digit mobile is required');         return false; }
        if (!saniData.address.trim())         { toast.error('Address is required');                      return false; }
        if (!saniData.ward)                   { toast.error('Ward is required');                         return false; }
      }
      if (activeStep === 1) {
        if (!saniData.requestType)            { toast.error('Request Type is required');                 return false; }
        if (!saniData.premisesType)           { toast.error('Premises Type is required');                return false; }
        if (!saniData.locationDescription.trim()){ toast.error('Area/Location Description is required'); return false; }
        if (!saniData.serviceFrequency)       { toast.error('Service Frequency is required');            return false; }
      }
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) setActiveStep(s => s + 1); };
  const handleBack = () => setActiveStep(s => s - 1);

  /* ── Submit handlers ───────────────────────────────────────────── */
  const handleGarbSubmit = async (email) => {
    if (!validateStep()) return;
    setGarbSubmitting(true);
    try {
      const docsArray = await Promise.all(
        Object.entries(garbDocs)
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
        application_type: 'garbage_complaint',
        application_data: garbData,
        documents: docsArray,
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `GRB-${Date.now()}`;
      const ts = new Date().toISOString();
      setGarbRef(appNum);
      setGarbSubmitted(true);
      setReceiptAppNum(appNum);
      setReceiptAppType('garbage_complaint');
      setReceiptFormData({ ...garbData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'garbage_complaint',
        application_data: { ...garbData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Garbage complaint submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setGarbSubmitting(false);
    }
  };

  const handleBulkSubmit = async (email) => {
    if (!validateStep()) return;
    setBulkSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'bulk_waste_pickup',
        application_data: bulkData,
        documents: [],
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `BWP-${Date.now()}`;
      const ts = new Date().toISOString();
      setBulkRef(appNum);
      setBulkSubmitted(true);
      setReceiptAppNum(appNum);
      setReceiptAppType('bulk_waste_pickup');
      setReceiptFormData({ ...bulkData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'bulk_waste_pickup',
        application_data: { ...bulkData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Bulk pickup request submitted!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSaniSubmit = async (email) => {
    if (!validateStep()) return;
    setSaniSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'sanitation_services_request',
        application_data: saniData,
        documents: [],
      });
      const appNum = res.data?.reference_number || res.data?.data?.application_number || `SSR-${Date.now()}`;
      const ts = new Date().toISOString();
      setSaniRef(appNum);
      setSaniSubmitted(true);
      setReceiptAppNum(appNum);
      setReceiptAppType('sanitation_services_request');
      setReceiptFormData({ ...saniData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'sanitation_services_request',
        application_data: { ...saniData },
        submitted_at: ts,
      }).catch(console.warn);
      toast.success('Sanitation service request submitted!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed.');
    } finally {
      setSaniSubmitting(false);
    }
  };

  const handleSubmit = (email) => {
    if (activeTab === 0)      handleGarbSubmit(email);
    else if (activeTab === 1) handleBulkSubmit(email);
    else if (activeTab === 3) handleSaniSubmit(email);
  };

  const handleFetchSwBill = async () => {
    if (!swConsumerNo.trim()) { toast.error('Enter Consumer / Property Number'); return; }
    setSwFetching(true);
    try {
      setSwBillData({
        consumerNo:   swConsumerNo,
        name:         'Ramesh Sharma',
        ward:         'Ward 5',
        propertyType: 'Residential',
        annualCharges: 600,
        pendingFrom:  '2024-04-01',
        totalDue:     1200,
      });
      toast.success('Bill fetched successfully');
    } catch {
      toast.error('Could not fetch bill. Check number and retry.');
    } finally {
      setSwFetching(false);
    }
  };

  const handlePayNow = async () => {
    if (!swBillData) { toast.error('Fetch bill first'); return; }
    setSwPaying(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'solid_waste_payment',
        application_data: { consumerNo: swConsumerNo, paymentMethod: swPayMethod, ...swBillData },
        documents: {},
      });
      setSwReceiptNo(res.data?.reference_number || `SWP-${Date.now()}`);
      setSwPaid(true);
      toast.success('Payment successful!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setSwPaying(false);
    }
  };

  /* ── Success screen helper ─────────────────────────────────────── */
  const SuccessScreen = ({ refNo, message }) => (
    <Box textAlign="center" py={5}>
      <Typography variant="h6" fontWeight={700} gutterBottom>Submitted Successfully!</Typography>
      <Chip label={`Reference: ${refNo}`} color="success" sx={{ fontSize: 15, py: 2.5, px: 1, mb: 2 }} />
      <Typography color="text.secondary" mt={1}>{message}</Typography>
    </Box>
  );

  /* ── Step renders ──────────────────────────────────────────────── */

  /* Tab 0: Garbage Complaint */
  const renderGarbStep = () => {
    if (garbSubmitted)
      return <SuccessScreen refNo={garbRef} message="Sanitation team will resolve the issue within 48 hours." />;

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name *" value={garbData.fullName} onChange={updGarb('fullName')} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile *" value={garbData.mobile} onChange={updGarb('mobile')} inputProps={{ maxLength: 10 }} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={garbData.email} onChange={updGarb('email')} type="email" /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Aadhaar Number" value={garbData.aadhaar} onChange={updGarb('aadhaar')} inputProps={{ maxLength: 12 }} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Address *" value={garbData.address} onChange={updGarb('address')} multiline rows={2} /></Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={garbData.ward} onChange={updGarb('ward')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Alternative Contact (optional)" value={garbData.altContact} onChange={updGarb('altContact')} inputProps={{ maxLength: 10 }} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Complaint Type *</InputLabel>
            <Select value={garbData.complaintType} label="Complaint Type *" onChange={updGarb('complaintType')}>
              {['Garbage not collected', 'Overflowing garbage bin', 'Burning garbage illegally',
                'Garbage dumped on road', 'Animal carcass on road', 'Littering/No bin available',
                'Scattered waste after collection', 'Malodour from waste point', 'Other']
                .map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Garbage Collection Point / Area *" value={garbData.collectionPoint} onChange={updGarb('collectionPoint')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Nearest Landmark *" value={garbData.nearestLandmark} onChange={updGarb('nearestLandmark')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Days Since Last Collection" value={garbData.daysSinceCollection} onChange={updGarb('daysSinceCollection')} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Frequency of Issue</InputLabel>
            <Select value={garbData.frequencyOfIssue} label="Frequency of Issue" onChange={updGarb('frequencyOfIssue')}>
              {['First time', 'Recurring — weekly', 'Recurring — daily', 'Ongoing for months']
                .map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Approximate Volume</InputLabel>
            <Select value={garbData.approxVolume} label="Approximate Volume" onChange={updGarb('approxVolume')}>
              {['Small pile', '2–3 bags worth', 'Large pile', 'Very large — vehicle needed', 'Mixed waste heap']
                .map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Type of Waste</InputLabel>
            <Select
              multiple value={garbData.typeOfWaste}
              label="Type of Waste"
              onChange={e => setGarbData(p => ({ ...p, typeOfWaste: e.target.value }))}
              renderValue={(selected) => selected.join(', ')}
            >
              {['Kitchen/Food waste', 'Construction debris', 'Medical/Bio waste',
                'Plastic/Non-biodegradable', 'Mixed', 'Electronic/E-waste', 'Hazardous/Chemical']
                .map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Does the Issue Pose Health Risk?</InputLabel>
            <Select value={garbData.healthRisk} label="Does the Issue Pose Health Risk?" onChange={updGarb('healthRisk')}>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Description" value={garbData.description} onChange={updGarb('description')} multiline rows={3} />
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Photo of Garbage Issue *" name="garbage_photo" required
            hint="Clear photo showing the garbage problem"
            docs={garbDocs} onFileChange={handleGarbDoc} onRemove={removeGarbDoc}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DocUpload
            label="Additional Photo" name="garbage_photo2"
            hint="Another angle or wider view"
            docs={garbDocs} onFileChange={handleGarbDoc} onRemove={removeGarbDoc}
          />
        </Grid>
      </Grid>
    );
    return null;
  };

  /* Tab 1: Bulk Waste Pickup */
  const renderBulkStep = () => {
    if (bulkSubmitted)
      return <SuccessScreen refNo={bulkRef} message="You will be contacted within 48 hours for scheduling and fee payment." />;

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name *" value={bulkData.fullName} onChange={updBulk('fullName')} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile *" value={bulkData.mobile} onChange={updBulk('mobile')} inputProps={{ maxLength: 10 }} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={bulkData.email} onChange={updBulk('email')} type="email" /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Aadhaar Number" value={bulkData.aadhaar} onChange={updBulk('aadhaar')} inputProps={{ maxLength: 12 }} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Premises Address *" value={bulkData.premisesAddress} onChange={updBulk('premisesAddress')} multiline rows={2} /></Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={bulkData.ward} onChange={updBulk('ward')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Contact at Premises (Alt. Mobile)" value={bulkData.altMobile} onChange={updBulk('altMobile')} inputProps={{ maxLength: 10 }} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Waste Type *</InputLabel>
            <Select value={bulkData.wasteType} label="Waste Type *" onChange={updBulk('wasteType')}>
              {['Construction/Demolition Debris', 'Electronic Waste', 'Bulky Furniture',
                'Garden Waste/Branches', 'Industrial Scrap', 'Bio-medical (authorised only)',
                'Large Plastic', 'Other']
                .map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Approximate Quantity *</InputLabel>
            <Select value={bulkData.approxQuantity} label="Approximate Quantity *" onChange={updBulk('approxQuantity')}>
              {['<500 kg', '500 kg – 1 ton', '1–3 tons', '3–10 tons', '>10 tons']
                .map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Preferred Pickup Date *" type="date" value={bulkData.preferredDate} onChange={updBulk('preferredDate')} InputLabelProps={{ shrink: true }} inputProps={{ min: getTodayPlus(2) }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Preferred Time</InputLabel>
            <Select value={bulkData.preferredTime} label="Preferred Time" onChange={updBulk('preferredTime')}>
              <MenuItem value="Morning8-12">Morning 8–12</MenuItem>
              <MenuItem value="Afternoon12-4">Afternoon 12–4</MenuItem>
              <MenuItem value="Evening4-7">Evening 4–7</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Vehicle Type Required</InputLabel>
            <Select value={bulkData.vehicleType} label="Vehicle Type Required" onChange={updBulk('vehicleType')}>
              {['Small Vehicle — up to 2 ton', 'Medium Tipper — 5 ton', 'Large Truck — 10+ ton',
                'Chhota Hathi type — narrow lanes', 'Any available']
                .map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Road/Lane Width at Premises</InputLabel>
            <Select value={bulkData.laneWidth} label="Road/Lane Width at Premises" onChange={updBulk('laneWidth')}>
              <MenuItem value="Narrow">Narrow lane — &lt;8 ft</MenuItem>
              <MenuItem value="Medium">Medium — 8–15 ft</MenuItem>
              <MenuItem value="Wide">Wide road — 15+ ft</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Commercial Establishment?</InputLabel>
            <Select value={bulkData.isCommercial} label="Commercial Establishment?" onChange={updBulk('isCommercial')}>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {bulkData.isCommercial === 'Yes' && (
          <Grid item xs={12}>
            <Alert severity="warning">
              Commercial establishments are subject to additional bulk waste pickup charges as per municipal tariff.
            </Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <TextField fullWidth label="Any Special Instructions" value={bulkData.specialInstructions} onChange={updBulk('specialInstructions')} multiline rows={2} />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            Bulk waste pickup fee applies. You will be contacted within 48 hours for scheduling and fee payment.
          </Alert>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Pickup Request Summary</Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={1}>
            {[
              ['Name',            bulkData.fullName],
              ['Mobile',          bulkData.mobile],
              ['Address',         bulkData.premisesAddress],
              ['Ward',            bulkData.ward],
              ['Waste Type',      bulkData.wasteType],
              ['Quantity',        bulkData.approxQuantity],
              ['Preferred Date',  bulkData.preferredDate],
              ['Preferred Time',  bulkData.preferredTime],
              ['Vehicle Type',    bulkData.vehicleType],
              ['Lane Width',      bulkData.laneWidth],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <Grid item xs={5} sm={4}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                </Grid>
                <Grid item xs={7} sm={8}>
                  <Typography variant="body2">{value || '—'}</Typography>
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
        </Paper>
        <FormControlLabel
          control={
            <Switch
              checked={bulkDeclaration}
              onChange={e => setBulkDeclaration(e.target.checked)}
              color="primary"
            />
          }
          label="I confirm the waste is as described and I will be available on the pickup date. I understand that fee payment is required before or at the time of pickup."
        />
      </Box>
    );
    return null;
  };

  /* Tab 2: Pay Solid Waste Charges — no stepper */
  const renderSwPayment = () => {
    if (swPaid) return (
      <Box textAlign="center" py={5}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Payment Successful!</Typography>
        <Chip label={`Receipt No: ${swReceiptNo}`} color="success" sx={{ fontSize: 15, py: 2.5, px: 1, mb: 2 }} />
        <Typography color="text.secondary" mt={1}>
          SMS confirmation will be sent to your registered mobile number.
        </Typography>
      </Box>
    );

    return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth label="Consumer / Property Number *"
            value={swConsumerNo} onChange={e => setSwConsumerNo(e.target.value)}
            placeholder="SWC-WARD05-XXXX"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth variant="contained" onClick={handleFetchSwBill} disabled={swFetching}
            sx={{ height: 56, bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
          >
            {swFetching ? <CircularProgress size={22} color="inherit" /> : 'Fetch Bill'}
          </Button>
        </Grid>

        {swBillData && (
          <>
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2.5, bgcolor: '#efebe9', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Bill Details</Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1}>
                  {[
                    ['Consumer No.',   swBillData.consumerNo],
                    ['Name',           swBillData.name],
                    ['Ward',           swBillData.ward],
                    ['Property Type',  swBillData.propertyType],
                    ['Annual Charges', `₹${swBillData.annualCharges}`],
                    ['Pending From',   swBillData.pendingFrom],
                  ].map(([label, value]) => (
                    <React.Fragment key={label}>
                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
                        <Typography variant="body2" fontWeight={500}>{value}</Typography>
                      </Grid>
                    </React.Fragment>
                  ))}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1" color="error.main" fontWeight={700}>
                      Total Due: ₹{swBillData.totalDue}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select value={swPayMethod} label="Payment Method" onChange={e => setSwPayMethod(e.target.value)}>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="NetBanking">Net Banking</MenuItem>
                  <MenuItem value="Card">Debit / Credit Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                fullWidth variant="contained" onClick={handlePayNow} disabled={swPaying}
                sx={{ height: 56, bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
              >
                {swPaying ? <CircularProgress size={22} color="inherit" /> : `Pay ₹${swBillData.totalDue} Now`}
              </Button>
            </Grid>
          </>
        )}
      </Grid>
    );
  };

  /* Tab 3: Sanitation Services Request */
  const renderSaniStep = () => {
    if (saniSubmitted)
      return <SuccessScreen refNo={saniRef} message="Sanitation worker/team will be assigned within 2 working days." />;

    if (activeStep === 0) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name *" value={saniData.fullName} onChange={updSani('fullName')} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile *" value={saniData.mobile} onChange={updSani('mobile')} inputProps={{ maxLength: 10 }} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={saniData.email} onChange={updSani('email')} type="email" /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Aadhaar Number" value={saniData.aadhaar} onChange={updSani('aadhaar')} inputProps={{ maxLength: 12 }} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="Address *" value={saniData.address} onChange={updSani('address')} multiline rows={2} /></Grid>
        <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Ward *" value={saniData.ward} onChange={updSani('ward')} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Request Type *</InputLabel>
            <Select value={saniData.requestType} label="Request Type *" onChange={updSani('requestType')}>
              {['Storm Drain Desilting', 'Manhole Cleaning', 'Public Toilet Cleaning',
                'Fogging/Disinfection', 'Street Sweeping Service', 'Septic Tank Emptying',
                'Biodigester Maintenance', 'Other']
                .map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Premises Type *</InputLabel>
            <Select value={saniData.premisesType} label="Premises Type *" onChange={updSani('premisesType')}>
              {['Residential Colony', 'Housing Society', 'School/College', 'Hospital/Clinic',
                'Market/Commercial Area', 'Industrial Unit', 'Public Space/Park', 'Other']
                .map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Area / Location Description *" value={saniData.locationDescription} onChange={updSani('locationDescription')} multiline rows={2} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Service Frequency Required *</InputLabel>
            <Select value={saniData.serviceFrequency} label="Service Frequency Required *" onChange={updSani('serviceFrequency')}>
              {['One-time', 'Weekly', 'Fortnightly', 'Monthly', 'As required']
                .map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Urgency</InputLabel>
            <Select value={saniData.urgency} label="Urgency" onChange={updSani('urgency')}>
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="Urgent">Urgent</MenuItem>
              <MenuItem value="Emergency">Emergency</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Number of Labourers Required</InputLabel>
            <Select value={saniData.numLabourers} label="Number of Labourers Required" onChange={updSani('numLabourers')}>
              {['1', '2', '3–5', '5–10', 'As assessed by department']
                .map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Equipment Needed</InputLabel>
            <Select value={saniData.equipmentNeeded} label="Equipment Needed" onChange={updSani('equipmentNeeded')}>
              {['Manual only', 'Machine-assisted', 'High pressure jet cleaner',
                'Suction tanker', 'Heavy machinery', 'As assessed']
                .map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Additional Notes" value={saniData.additionalNotes} onChange={updSani('additionalNotes')} multiline rows={2} />
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <Alert severity="info">
            Please review your details and click Submit to register the sanitation service request.
            Emergency requests are given priority within 24 hours.
          </Alert>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={1}>
              {[
                ['Name',               saniData.fullName],
                ['Mobile',             saniData.mobile],
                ['Ward',               saniData.ward],
                ['Request Type',       saniData.requestType],
                ['Premises Type',      saniData.premisesType],
                ['Frequency',          saniData.serviceFrequency],
                ['Urgency',            saniData.urgency],
                ['Equipment Needed',   saniData.equipmentNeeded],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <Grid item xs={5} sm={4}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                  </Grid>
                  <Grid item xs={7} sm={8}>
                    <Typography variant="body2">{value || '—'}</Typography>
                  </Grid>
                </React.Fragment>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
    return null;
  };

  /* ── Derived state ─────────────────────────────────────────────── */
  const getSteps = () => {
    if (activeTab === 0) return GARB_STEPS;
    if (activeTab === 1) return BULK_STEPS;
    if (activeTab === 3) return SANI_STEPS;
    return [];
  };
  const steps      = getSteps();
  const hasStepper = steps.length > 0;
  const isLastStep = activeStep === steps.length - 1;
  const submitting =
    activeTab === 0 ? garbSubmitting :
    activeTab === 1 ? bulkSubmitting : saniSubmitting;
  const isSubmitted =
    activeTab === 0 ? garbSubmitted :
    activeTab === 1 ? bulkSubmitted :
    activeTab === 3 ? saniSubmitted : false;

  /* ── Render ────────────────────────────────────────────────────── */
  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    handleSubmit(email);
  };

  return (
    <Box>
      <DialogTitle sx={{ bgcolor: HEADER_COLOR, color: '#fff', py: 2 }}>
        <Typography variant="h6" fontWeight={700}>Municipal Sanitation &amp; Waste Management</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Lodge garbage complaints, schedule bulk pickup, pay solid waste charges, or request sanitation services
        </Typography>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Garbage Complaint" />
          <Tab label="Bulk Waste Pickup" />
          <Tab label="Pay SW Charges" />
          <Tab label="Sanitation Services" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3, minHeight: 440 }}>
        {hasStepper && !isSubmitted && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}

        {activeTab === 0 && renderGarbStep()}
        {activeTab === 1 && renderBulkStep()}
        {activeTab === 2 && renderSwPayment()}
        {activeTab === 3 && renderSaniStep()}
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
              onClick={() => setShowOtpDialog(true)} variant="contained"
              disabled={submitting || (activeTab === 1 && !bulkDeclaration)}
              sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit'}
            </Button>
          )}
        </DialogActions>
      )}
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={activeTab === 0 ? garbData.email || '' : activeTab === 1 ? bulkData.email || '' : activeTab === 3 ? saniData.email || '' : ''}
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

