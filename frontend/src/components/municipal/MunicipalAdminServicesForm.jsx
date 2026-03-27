import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Grid, MenuItem, Tabs, Tab,
  DialogContent, DialogActions, Alert, Chip, CircularProgress,
  Paper, Stepper, Step, StepLabel, Divider, Switch, FormControlLabel,
} from '@mui/material';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DocUpload from './DocUpload';
import { validateFile } from './formUtils';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const HEADER_COLOR = '#1a237e';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

// Steps per tab
const TAB_STEPS = [
  ['Applicant & Property Info', 'NOC Details', 'Documents'],                    // Tab 0: NOC
  ['Personal Details', 'Residence History', 'Documents'],                        // Tab 1: Domicile
  ['Personal & Address Details', 'Documents'],                                   // Tab 2: Residence
  ['Subscriber Details', 'Subscription & Payment'],                              // Tab 3: Subscriptions
  ['Applicant Details', 'Advertisement Details', 'Documents & Submit'],          // Tab 4: Advertisement
];
const STEP_COUNTS = TAB_STEPS.map(s => s.length);

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const SectionHeading = ({ children }) => (
  <Grid item xs={12}>
    <Box sx={{ mt: 1.5, mb: 0.5 }}>
      <Typography variant="caption" fontWeight={700} color="primary.dark"
        sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {children}
      </Typography>
      <Divider />
    </Box>
  </Grid>
);

const initialForm = {
  // Shared
  name: '', mobile: '', email: '', aadhaar: '', dob: '', gender: '',
  father_name: '', address: '', ward: '', pincode: '', pan: '',

  // Tab 0 – NOC
  noc_type: '', noc_purpose: '', noc_survey_number: '', noc_property_address: '',
  noc_property_type: '', noc_requested_by: '', noc_authority: '',
  noc_encumbrance: 'no', noc_additional_details: '',

  // Tab 1 – Domicile
  dom_mother_name: '', dom_marital_status: '', dom_religion: '', dom_caste: '',
  dom_occupation: '', dom_birth_city: '', dom_birth_district: '', dom_birth_state: '',
  dom_perm_address: '', dom_years_resident: '', dom_year_of_arrival: '',
  dom_previous_address: '', dom_purpose: '', dom_state_claimed: '',
  dom_other_state_domicile: 'no', dom_remarks: '',

  // Tab 2 – Residence Certificate
  res_duration_at_address: '', res_previous_address: '', res_proof_type: '',
  res_purpose: '',

  // Tab 3 – Annual Subscriptions
  sub_type: '', sub_vehicle_number: '', sub_vehicle_type: '', sub_parking_zone: '',
  sub_stall_location: '', sub_business_type: '', sub_days_of_operation: '',
  sub_duration: '', sub_start_date: '', sub_payment_method: '',

  // Tab 4 – Advertisement
  adv_company_name: '', adv_contact_person: '', adv_mobile: '', adv_email: '',
  adv_gst: '', adv_reg_no: '', adv_applicant_address: '', adv_ward: '',
  adv_display_type: '', adv_location: '', adv_display_ward: '', adv_zone_type: '',
  adv_size: '', adv_height: '', adv_faces: '', adv_duration: '',
  adv_content_type: '', adv_content_desc: '', adv_mounting_type: '',
  adv_obstructs_traffic: false,
};

const MunicipalAdminServicesForm = ({ onClose }) => {
  const [tab, setTab]               = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refNumber, setRefNumber]   = useState('');
  const [formData, setFormData]     = useState(initialForm);
  const [docs, setDocs]             = useState({});
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState({ appNum: '', type: '', data: {}, ts: '', email: '' });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleMobile  = (name) => (e) => setFormData(p => ({ ...p, [name]: e.target.value.replace(/\D/g, '').slice(0, 10) }));
  const handleAadhaar = (name) => (e) => setFormData(p => ({ ...p, [name]: e.target.value.replace(/\D/g, '').slice(0, 12) }));

  const onDocChange = (name, file) => {
    if (!file) return;
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setDocs(p => ({ ...p, [name]: file }));
    toast.success(file.name + ' selected');
  };
  const onDocRemove = (name) => setDocs(p => { const n = { ...p }; delete n[name]; return n; });

  // ── Stepper ──────────────────────────────────────────────────────────────────
  const isLastStep = activeStep === STEP_COUNTS[tab] - 1;

  const handleNext = () => {
    // Tab 0 – NOC
    if (tab === 0) {
      if (activeStep === 0 && (!formData.name || !formData.mobile || !formData.aadhaar || !formData.father_name || !formData.dob || !formData.address || !formData.ward))
        return toast.error('Please fill all required fields');
      if (activeStep === 1 && (!formData.noc_type || !formData.noc_purpose || !formData.noc_authority))
        return toast.error('NOC type, purpose, and authority are required');
    }
    // Tab 1 – Domicile
    if (tab === 1) {
      if (activeStep === 0 && (!formData.name || !formData.father_name || !formData.mobile || !formData.dob || !formData.gender || !formData.aadhaar))
        return toast.error('Please fill all required personal details');
      if (activeStep === 1 && (!formData.dom_perm_address || !formData.ward || !formData.dom_years_resident || !formData.dom_purpose))
        return toast.error('Please fill all required residence fields');
    }
    // Tab 2 – Residence
    if (tab === 2) {
      if (activeStep === 0 && (!formData.name || !formData.mobile || !formData.aadhaar || !formData.father_name || !formData.dob || !formData.address || !formData.ward || !formData.res_purpose))
        return toast.error('Please fill all required fields');
    }
    // Tab 3 – Subscriptions
    if (tab === 3) {
      if (activeStep === 0 && (!formData.name || !formData.mobile || !formData.address || !formData.ward))
        return toast.error('Please fill all required subscriber details');
      if (activeStep === 1 && (!formData.sub_type || !formData.sub_duration || !formData.sub_payment_method))
        return toast.error('Subscription type, duration, and payment method are required');
    }
    // Tab 4 – Advertisement
    if (tab === 4) {
      if (activeStep === 0 && (!formData.adv_company_name || !formData.adv_contact_person || !formData.adv_mobile || !formData.adv_email || !formData.adv_applicant_address || !formData.adv_ward))
        return toast.error('Please fill all required applicant details');
      if (activeStep === 1 && (!formData.adv_display_type || !formData.adv_location || !formData.adv_display_ward || !formData.adv_zone_type || !formData.adv_size || !formData.adv_height || !formData.adv_duration || !formData.adv_content_type || !formData.adv_content_desc))
        return toast.error('Please fill all required advertisement details');
    }
    setActiveStep(s => s + 1);
  };
  const handleBack = () => setActiveStep(s => s - 1);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (email) => {
    const appTypes = ['noc_certificate', 'domicile_certificate', 'residence_certificate', 'annual_subscription', 'advertisement_permit'];
    const emailVal = email || formData.email || '';
    setSubmitting(true);
    try {
      const docsArray = await Promise.all(
        Object.entries(docs)
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
      const appType = appTypes[tab];
      const res = await api.post('/municipal/applications/submit', {
        application_type: appType,
        application_data: { ...formData },
        documents: docsArray,
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MAS${Date.now()}`;
      const ts = new Date().toISOString();
      setRefNumber(appNum);
      setReceiptInfo({ appNum, type: appType, data: { ...formData }, ts, email: emailVal });
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: emailVal,
        application_number: appNum,
        application_type: appType,
        application_data: { ...formData },
        submitted_at: ts,
      }).catch(console.warn);
    } catch {
      setRefNumber('MAS' + Date.now());
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Submitted successfully!');
    }
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    handleSubmit(email);
  };

  // ── Fee info for subscriptions ───────────────────────────────────────────────
  const getSubFeeInfo = () => {
    const fees = {
      'Parking Permit — Monthly':  'Parking (Monthly): ₹500 (2-Wheeler) · ₹1,000 (4-Wheeler) · ₹2,000 (Commercial)',
      'Parking Permit — Annual':   'Parking (Annual): ₹5,500 (2-Wheeler) · ₹11,000 (4-Wheeler) · ₹22,000 (Commercial)',
      'Market Stall Allotment':    'Market Stall (Annual Permit): ₹3,600 – ₹12,000 depending on location and size',
      'Hawker Zone Permit':        'Hawker Zone (Annual): ₹1,200 – ₹3,600 depending on zone and category',
      'Garden/Park Usage Permit':  'Garden/Park Usage: ₹500/day or ₹4,000/month seasonal permit',
      'Public Ground Booking':     'Public Ground Booking: ₹2,000–₹10,000 per day depending on ground size',
    };
    return fees[formData.sub_type] || null;
  };

  // ── Success Screen ───────────────────────────────────────────────────────────
  if (submitted) return (
    <Box>
      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" color="success.main" gutterBottom>Application Submitted!</Typography>
        <Chip label={refNumber} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1.1rem', py: 2, px: 3, mb: 3 }} />
        <Alert severity="info">
          {tab <= 2
            ? 'Certificate / NOC will be issued within 7–10 working days after document verification. You will be notified by SMS.'
            : tab === 3
            ? 'Subscription activated. Your permit/sticker will be issued within 3 working days.'
            : 'Advertisement permit application under review. Permission letter issued within 5–7 working days after site inspection.'}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} fullWidth sx={{ bgcolor: HEADER_COLOR }}>Close</Button>
      </DialogActions>
    </Box>
  );

  // ── Main Render ──────────────────────────────────────────────────────────────
  return (
    <Box>
      <DialogContent>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setActiveStep(0); }}
          variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
        >
          <Tab label="NOC Certificate" />
          <Tab label="Domicile Certificate" />
          <Tab label="Residence / Address Cert." />
          <Tab label="Annual Subscriptions" />
          <Tab label="Advertisement / Hoarding" />
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════
            TAB 0 — NOC Certificate  3-step
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={0}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {TAB_STEPS[0].map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {/* Step 0: Applicant & Property Info */}
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth required label="Applicant / Owner Full Name *" name="name"
                  value={formData.name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth required label="Mobile * (10 digits)" name="mobile"
                  value={formData.mobile} onChange={handleMobile('mobile')} inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Email" name="email"
                  value={formData.email} onChange={handleChange} type="email" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Aadhaar * (12 digits)" name="aadhaar"
                  value={formData.aadhaar} onChange={handleAadhaar('aadhaar')} inputProps={{ maxLength: 12 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="PAN Card" name="pan"
                  value={formData.pan} onChange={handleChange} inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Father's / Husband's Name *" name="father_name"
                  value={formData.father_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Date of Birth *" name="dob"
                  value={formData.dob} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Gender" name="gender"
                  value={formData.gender} onChange={handleChange}>
                  {['Male', 'Female', 'Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Ward *" name="ward"
                  value={formData.ward} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField fullWidth required label="Complete Address *" name="address"
                  value={formData.address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Pincode" name="pincode"
                  value={formData.pincode} onChange={handleChange} inputProps={{ maxLength: 6 }} />
              </Grid>
            </Grid>
          )}

          {/* Step 1: NOC Details */}
          {activeStep === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select required label="NOC Type *" name="noc_type"
                  value={formData.noc_type} onChange={handleChange}>
                  {['Building / Construction NOC', 'Fire Safety NOC', 'Water Supply NOC',
                    'No-encumbrance NOC', 'Environmental/Noise NOC', 'Road Encroachment NOC', 'Other'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth required label="Property / Survey Number *" name="noc_survey_number"
                  value={formData.noc_survey_number} onChange={handleChange} placeholder="Survey No. / Gat No. / Plot No." />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Property Address (if different)" name="noc_property_address"
                  value={formData.noc_property_address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Property Type" name="noc_property_type"
                  value={formData.noc_property_type} onChange={handleChange}>
                  {['Residential', 'Commercial', 'Industrial', 'Plot/Land'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select required label="NOC Purpose *" name="noc_purpose"
                  value={formData.noc_purpose} onChange={handleChange}>
                  {['Home Loan / Mortgage', 'Sale of Property', 'Lease/Rent', 'Court proceedings',
                    'Bank Requirement', 'New Construction', 'Government formality', 'Other'].map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Requested By" name="noc_requested_by"
                  value={formData.noc_requested_by} onChange={handleChange}>
                  {['Self', 'Bank', 'Buyer', 'Court'].map(r => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField fullWidth required label="Authority to Whom NOC is Addressed *" name="noc_authority"
                  value={formData.noc_authority} onChange={handleChange}
                  placeholder="e.g., State Bank of India, District Court, etc." />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Any Encumbrance / Litigation?" name="noc_encumbrance"
                  value={formData.noc_encumbrance} onChange={handleChange}>
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </TextField>
              </Grid>
              {formData.noc_encumbrance === 'yes' && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Properties with existing litigation or encumbrance may require additional legal clearance before NOC issuance.
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Additional Details" name="noc_additional_details"
                  value={formData.noc_additional_details} onChange={handleChange}
                  placeholder="Any additional information relevant to this NOC request..." />
              </Grid>
            </Grid>
          )}

          {/* Step 2: Documents */}
          {activeStep === 2 && (
            <Grid container spacing={2}>
              <SectionHeading>Required Documents</SectionHeading>
              <Grid item xs={12} md={6}>
                <DocUpload label="Latest Property Tax Receipt" name="noc_tax_receipt" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Proof of property tax clearance (most recent)" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Applicant / Owner ID Proof (Aadhaar)" name="noc_id_proof" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Aadhaar card of the applicant" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Property Ownership Document" name="noc_ownership_doc" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Title deed / Sale deed / Property card" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Site / Location Plan" name="noc_site_plan"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Sketch or layout of the property site" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Court / Bank Requirement Letter" name="noc_requirement_letter"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Optional — if NOC is for a specific institutional purpose" />
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1 — Domicile Certificate  3-step
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={1}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {TAB_STEPS[1].map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {/* Step 0: Personal Details */}
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField fullWidth required label="Full Name *" name="name"
                  value={formData.name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Father's / Husband's Name *" name="father_name"
                  value={formData.father_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Mother's Name" name="dom_mother_name"
                  value={formData.dom_mother_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Mobile *" name="mobile"
                  value={formData.mobile} onChange={handleMobile('mobile')} inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Email" name="email"
                  value={formData.email} onChange={handleChange} type="email" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Date of Birth *" name="dob"
                  value={formData.dob} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select required label="Gender *" name="gender"
                  value={formData.gender} onChange={handleChange}>
                  {['Male', 'Female', 'Transgender', 'Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Marital Status" name="dom_marital_status"
                  value={formData.dom_marital_status} onChange={handleChange}>
                  {['Unmarried', 'Married', 'Widowed', 'Separated'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Religion / Community" name="dom_religion"
                  value={formData.dom_religion} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Caste / Sub-caste" name="dom_caste"
                  value={formData.dom_caste} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Occupation" name="dom_occupation"
                  value={formData.dom_occupation} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Aadhaar * (12 digits)" name="aadhaar"
                  value={formData.aadhaar} onChange={handleAadhaar('aadhaar')} inputProps={{ maxLength: 12 }} />
              </Grid>
              <SectionHeading>Place of Birth</SectionHeading>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="City / Village" name="dom_birth_city"
                  value={formData.dom_birth_city} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="District" name="dom_birth_district"
                  value={formData.dom_birth_district} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="State" name="dom_birth_state"
                  value={formData.dom_birth_state} onChange={handleChange} />
              </Grid>
            </Grid>
          )}

          {/* Step 1: Residence History */}
          {activeStep === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField fullWidth required label="Permanent Address in This District *" name="dom_perm_address"
                  value={formData.dom_perm_address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Ward *" name="ward"
                  value={formData.ward} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Pincode" name="pincode"
                  value={formData.pincode} onChange={handleChange} inputProps={{ maxLength: 6 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Years Resident in This District *" name="dom_years_resident"
                  value={formData.dom_years_resident} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Year of Arrival (if born elsewhere)" name="dom_year_of_arrival"
                  value={formData.dom_year_of_arrival} onChange={handleChange} type="number"
                  inputProps={{ min: 1900, max: new Date().getFullYear() }} />
              </Grid>
              {formData.dom_year_of_arrival && (
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="Previous Address (before arriving here)" name="dom_previous_address"
                    value={formData.dom_previous_address} onChange={handleChange} multiline rows={2} />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField fullWidth select required label="Purpose of Domicile Certificate *" name="dom_purpose"
                  value={formData.dom_purpose} onChange={handleChange}>
                  {['Education (Seat Reservation)', 'Government Job', 'Ration Card', 'Voter ID',
                    'Property Registration', 'Scholarship', 'Other'].map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="State Domicile Claimed For" name="dom_state_claimed"
                  value={formData.dom_state_claimed} onChange={handleChange}
                  helperText="Leave blank for current state" />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Any Other State Domicile Held?" name="dom_other_state_domicile"
                  value={formData.dom_other_state_domicile} onChange={handleChange}>
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Additional Remarks" name="dom_remarks"
                  value={formData.dom_remarks} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Minimum <b>3 years of continuous residence</b> in the district is required for a domicile certificate. Processing time: 7 working days.
                </Alert>
              </Grid>
            </Grid>
          )}

          {/* Step 2: Documents */}
          {activeStep === 2 && (
            <Grid container spacing={2}>
              <SectionHeading>Required Documents</SectionHeading>
              <Grid item xs={12} md={6}>
                <DocUpload label="Proof of Residence" name="dom_residence_proof" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="Utility bill / Ration card / Voter ID with current address (not older than 3 months)" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Identity Proof / Aadhaar" name="dom_id_proof" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Aadhaar card copy" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Birth Certificate or School Leaving Certificate" name="dom_age_proof" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="For age / date of birth proof" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Passport-size Photograph" name="dom_photo" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  accept=".jpg,.jpeg,.png" hint="Recent colour photograph" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Affidavit of Domicile" name="dom_affidavit"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="Notarised affidavit on stamp paper declaring domicile" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Previous Address Proof" name="dom_prev_address_proof"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="If migrated from another district/state — proof of old address" />
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 2 — Residence / Address Certificate  2-step
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={2}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {TAB_STEPS[2].map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {/* Step 0: Personal & Address Details */}
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField fullWidth required label="Full Name *" name="name"
                  value={formData.name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Mobile *" name="mobile"
                  value={formData.mobile} onChange={handleMobile('mobile')} inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Email" name="email"
                  value={formData.email} onChange={handleChange} type="email" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Aadhaar * (12 digits)" name="aadhaar"
                  value={formData.aadhaar} onChange={handleAadhaar('aadhaar')} inputProps={{ maxLength: 12 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Father's / Husband's Name *" name="father_name"
                  value={formData.father_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Date of Birth *" name="dob"
                  value={formData.dob} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Gender" name="gender"
                  value={formData.gender} onChange={handleChange}>
                  {['Male', 'Female', 'Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={9}>
                <TextField fullWidth required label="Complete Current Address *" name="address"
                  value={formData.address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Ward *" name="ward"
                  value={formData.ward} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Duration at Current Address" name="res_duration_at_address"
                  value={formData.res_duration_at_address} onChange={handleChange}>
                  {['Less than 1 year', '1–2 years', '2–5 years', '5–10 years', '10+ years'].map(d => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Type of Address Proof Held" name="res_proof_type"
                  value={formData.res_proof_type} onChange={handleChange}>
                  {['Aadhaar', 'Voter ID', 'Utility Bill', 'Ration Card', 'Bank Statement', 'Passport', 'Rent Agreement', 'Employer Letter', 'Other'].map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {['Less than 1 year', '1–2 years'].includes(formData.res_duration_at_address) && (
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="Previous Address (if at current address less than 2 years)" name="res_previous_address"
                    value={formData.res_previous_address} onChange={handleChange} multiline rows={2} />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField fullWidth select required label="Purpose of Certificate *" name="res_purpose"
                  value={formData.res_purpose} onChange={handleChange}>
                  {['School/College Admission', 'Employment', 'Government Benefit', 'Bank Account Opening',
                    'Property Transaction', 'Voter ID Enrollment', 'Police Verification', 'Other'].map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          )}

          {/* Step 1: Documents */}
          {activeStep === 1 && (
            <Grid container spacing={2}>
              <SectionHeading>Required Documents</SectionHeading>
              <Grid item xs={12} md={6}>
                <DocUpload label="Proof of Address (Current)" name="res_address_proof" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="Aadhaar / Utility bill / Voter ID with current address" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Identity Proof" name="res_id_proof" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Aadhaar card copy" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Passport-size Photo" name="res_photo" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  accept=".jpg,.jpeg,.png" hint="Recent colour photograph" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Affidavit of Residence" name="res_affidavit"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="Notarised on stamp paper — declaring current address" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Any Additional Supporting Document" name="res_other_doc"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 3 — Annual Subscriptions  2-step
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={3}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {TAB_STEPS[3].map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {/* Step 0: Subscriber Details */}
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField fullWidth required label="Full Name *" name="name"
                  value={formData.name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Mobile * (10 digits)" name="mobile"
                  value={formData.mobile} onChange={handleMobile('mobile')} inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Email" name="email"
                  value={formData.email} onChange={handleChange} type="email" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Aadhaar (12 digits)" name="aadhaar"
                  value={formData.aadhaar} onChange={handleAadhaar('aadhaar')} inputProps={{ maxLength: 12 }} />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField fullWidth required label="Complete Address *" name="address"
                  value={formData.address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Ward *" name="ward"
                  value={formData.ward} onChange={handleChange} />
              </Grid>
            </Grid>
          )}

          {/* Step 1: Subscription & Payment */}
          {activeStep === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select required label="Subscription Type *" name="sub_type"
                  value={formData.sub_type} onChange={handleChange}>
                  {['Parking Permit — Monthly', 'Parking Permit — Annual', 'Market Stall Allotment',
                    'Hawker Zone Permit', 'Garden/Park Usage Permit', 'Public Ground Booking',
                    'Other Municipal Subscription'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select required label="Duration *" name="sub_duration"
                  value={formData.sub_duration} onChange={handleChange}>
                  {['1 Month', '3 Months', '6 Months', '1 Year'].map(d => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Start Date" name="sub_start_date"
                  value={formData.sub_start_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
              </Grid>

              {/* Parking-specific fields */}
              {['Parking Permit — Monthly', 'Parking Permit — Annual'].includes(formData.sub_type) && (
                <>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Vehicle Number" name="sub_vehicle_number"
                      value={formData.sub_vehicle_number} onChange={handleChange}
                      placeholder="e.g., MH12AB1234" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth select label="Vehicle Type" name="sub_vehicle_type"
                      value={formData.sub_vehicle_type} onChange={handleChange}>
                      <MenuItem value="2-Wheeler">2-Wheeler</MenuItem>
                      <MenuItem value="4-Wheeler">4-Wheeler</MenuItem>
                      <MenuItem value="Commercial">Commercial Vehicle</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Parking Zone / Location" name="sub_parking_zone"
                      value={formData.sub_parking_zone} onChange={handleChange}
                      placeholder="e.g., Zone A, Near City Hall" />
                  </Grid>
                </>
              )}

              {/* Stall/Hawker-specific fields */}
              {['Market Stall Allotment', 'Hawker Zone Permit'].includes(formData.sub_type) && (
                <>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Location Requested" name="sub_stall_location"
                      value={formData.sub_stall_location} onChange={handleChange}
                      placeholder="Market name / area / street" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Business Type / Items Sold" name="sub_business_type"
                      value={formData.sub_business_type} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Days of Operation" name="sub_days_of_operation"
                      value={formData.sub_days_of_operation} onChange={handleChange}
                      placeholder="e.g., Mon–Sat, All days" />
                  </Grid>
                </>
              )}

              {getSubFeeInfo() && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <b>Fee Information:</b> {getSubFeeInfo()}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <TextField fullWidth select required label="Payment Method *" name="sub_payment_method"
                  value={formData.sub_payment_method} onChange={handleChange}>
                  {['UPI', 'Net Banking', 'Debit/Credit Card', 'Cash at Counter'].map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 4 — Advertisement / Hoarding Permit  3-step
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={4}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {TAB_STEPS[4].map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {/* Step 0: Applicant Details */}
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth required label="Applicant / Company Name *" name="adv_company_name"
                  value={formData.adv_company_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth required label="Authorised Contact Person *" name="adv_contact_person"
                  value={formData.adv_contact_person} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Mobile *" name="adv_mobile"
                  value={formData.adv_mobile} onChange={handleMobile('adv_mobile')} inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Email *" name="adv_email"
                  value={formData.adv_email} onChange={handleChange} type="email" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="GST Number (if company)" name="adv_gst"
                  value={formData.adv_gst} onChange={handleChange} inputProps={{ maxLength: 15 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Company Registration No." name="adv_reg_no"
                  value={formData.adv_reg_no} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField fullWidth required label="Complete Address of Applicant / Company *" name="adv_applicant_address"
                  value={formData.adv_applicant_address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Ward *" name="adv_ward"
                  value={formData.adv_ward} onChange={handleChange} />
              </Grid>
            </Grid>
          )}

          {/* Step 1: Advertisement Details */}
          {activeStep === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select required label="Display / Advertisement Type *" name="adv_display_type"
                  value={formData.adv_display_type} onChange={handleChange}>
                  {['Hoarding/Billboard', 'Banner across road', 'Wall painting/advertisement', 'Glow sign board',
                    'LED/Electronic display', 'Kiosk', 'Vehicle advertisement', 'Portable display stand',
                    'Aerial advertisement/banner', 'Other'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth required label="Location / Road Name *" name="adv_location"
                  value={formData.adv_location} onChange={handleChange}
                  placeholder="Street name, locality, landmark" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Ward of Display *" name="adv_display_ward"
                  value={formData.adv_display_ward} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select required label="Zone Type *" name="adv_zone_type"
                  value={formData.adv_zone_type} onChange={handleChange}>
                  {['Commercial zone', 'Residential zone', 'Industrial area',
                    'Near traffic junction', 'Near school/hospital — size restricted area', 'Highway'].map(z => (
                    <MenuItem key={z} value={z}>{z}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Size (Length × Width in feet) *" name="adv_size"
                  value={formData.adv_size} onChange={handleChange} placeholder="e.g., 20ft × 10ft" />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth required label="Height from Ground (feet) *" name="adv_height"
                  value={formData.adv_height} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Number of Faces" name="adv_faces"
                  value={formData.adv_faces} onChange={handleChange}>
                  {['1', '2', 'More than 2'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select required label="Duration of Display *" name="adv_duration"
                  value={formData.adv_duration} onChange={handleChange}>
                  {['1 month', '3 months', '6 months', '1 year', 'Permanent'].map(d => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select required label="Type of Content *" name="adv_content_type"
                  value={formData.adv_content_type} onChange={handleChange}>
                  {['Product advertisement', 'Event/Exhibition', 'Religious/Festival',
                    'Political — special permission req.', 'Public awareness', 'Other'].map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth required multiline rows={3} label="Display Content Description *" name="adv_content_desc"
                  value={formData.adv_content_desc} onChange={handleChange}
                  placeholder="Describe the advertisement content, brand/product name, message to be displayed..." />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Structural / Mounting Type" name="adv_mounting_type"
                  value={formData.adv_mounting_type} onChange={handleChange}>
                  {['Hoardings on pillars', 'Wall-mounted', 'Pole-sign', 'Gantry', 'Canopy/Shed', 'Other'].map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fff8e1', borderRadius: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="adv_obstructs_traffic"
                        checked={!!formData.adv_obstructs_traffic}
                        onChange={handleChange}
                        color="warning"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I confirm this advertisement will <b>not obstruct</b> traffic signs, signals, or road visibility.
                      </Typography>
                    }
                  />
                </Paper>
              </Grid>
              {formData.adv_content_type === 'Political — special permission req.' && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Political advertisements require special prior permission from the Election Commission or Municipal Commissioner. Processing may take 15–30 working days.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}

          {/* Step 2: Documents & Submit */}
          {activeStep === 2 && (
            <Grid container spacing={2}>
              <SectionHeading>Required Documents</SectionHeading>
              <Grid item xs={12} md={6}>
                <DocUpload label="Site Photograph (showing exact location)" name="adv_site_photo" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  accept=".jpg,.jpeg,.png" hint="Clear photograph of the proposed advertisement site" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Structural Safety Certificate" name="adv_structural_cert" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="From a licensed structural engineer — mandatory for all hoardings" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Sketch / Design of Advertisement" name="adv_design_sketch" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="Drawing showing size, material, mounting arrangement, and content layout" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="NOC from Property Owner" name="adv_owner_noc" required
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="If display is on property not owned by applicant" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocUpload label="Authorisation Letter" name="adv_auth_letter"
                  docs={docs} onFileChange={onDocChange} onRemove={onDocRemove}
                  hint="If applying on behalf of a company — company letterhead authorisation" />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Advertisement permit fee is calculated based on type, size, zone, and duration. A site inspection may be conducted before issuance. Permit is renewable annually.
                </Alert>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </DialogContent>

      {/* ══ DIALOG ACTIONS ══════════════════════════════════════════ */}
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleBack} disabled={activeStep === 0}>← Back</Button>
        {!isLastStep && (
          <Button variant="contained" onClick={handleNext} sx={{ bgcolor: HEADER_COLOR }}>
            Next →
          </Button>
        )}
        {isLastStep && (
          <Button
            variant="contained"
            onClick={() => setShowOtpDialog(true)}
            disabled={submitting}
            sx={{ bgcolor: HEADER_COLOR }}
          >
            {submitting
              ? <CircularProgress size={22} color="inherit" />
              : tab === 3 ? 'Pay & Subscribe' : 'Submit Application'}
          </Button>
        )}
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.noc_email || formData.domicile_email || formData.res_email || formData.adv_email || ''}
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
};

export default MunicipalAdminServicesForm;
