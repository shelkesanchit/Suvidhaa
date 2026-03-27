import React, { useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, Button, Tabs, Tab, Stepper, Step, StepLabel,
  Alert, Chip, CircularProgress, Paper, Divider, Typography, DialogContent,
  DialogActions, Switch, FormControlLabel,
} from '@mui/material';
import DocUpload from './DocUpload';
import { validateFile } from './formUtils';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const HEADER_COLOR = '#6a1b9a';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const TAB_STEPS = [
  ['Owner & Property', 'Construction Details', 'Professional Info', 'Documents', 'Review'],
  ['Building Plan Details', 'Commencement Declaration'],
  ['Project Details', 'Completion Details', 'Documents'],
];

const MunicipalBuildingPermitForm = ({ onClose }) => {
  const [tab, setTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [trackData, setTrackData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [feePaid, setFeePaid] = useState(false);
  const [feeRef, setFeeRef] = useState('');

  const [formData, setFormData] = useState({
    // Tab 0 — Building Plan Approval
    bp_owner_name: '', bp_mobile: '', bp_email: '', bp_aadhaar: '', bp_pan: '',
    bp_father_name: '', bp_dob: '', bp_gender: '',
    bp_owner_address: '', bp_ward: '',
    bp_plot_address: '', bp_plot_number: '', bp_cts_number: '', bp_pincode: '',
    bp_zone_type: '', bp_ownership_type: '',
    bp_construction_type: '', bp_plot_area: '',
    bp_setback_front: '', bp_setback_rear: '', bp_setback_left: '', bp_setback_right: '',
    bp_floors: '', bp_basement: 'No', bp_basement_area: '',
    bp_gf_area: '', bp_total_area: '',
    bp_permissible_fsi: '', bp_proposed_fsi: '',
    bp_purpose: '', bp_height: '',
    bp_parking_2w: '', bp_parking_4w: '',
    bp_rainwater: 'No', bp_solar: 'No',
    bp_est_cost: '', bp_start_date: '',
    bp_architect_name: '', bp_architect_reg: '', bp_architect_mobile: '', bp_architect_email: '',
    bp_struct_eng_name: '', bp_struct_eng_reg: '', bp_struct_eng_mobile: '',
    bp_geo_report: 'No', bp_soil_type: '',
    bp_contractor_name: '', bp_contractor_license: '',
    bp_litigation: 'No', bp_neighbors_notified: 'No',
    bp_declaration: false,
    // Tab 1 — Construction Commencement Notice
    cc_plan_number: '', cc_owner_name: '', cc_mobile: '', cc_email: '',
    cc_property_address: '', cc_ward: '', cc_approved_bua: '', cc_start_date: '',
    cc_contractor_name: '', cc_contractor_mobile: '', cc_contractor_license: '',
    cc_foreman_name: '', cc_supervisor_mobile: '',
    cc_dec1: false, cc_dec2: false, cc_dec3: false, cc_comments: '',
    // Tab 2 — Occupancy Certificate
    oc_plan_number: '', oc_commencement_cert: '', oc_owner_name: '', oc_mobile: '', oc_email: '',
    oc_property_address: '', oc_ward: '', oc_plot_number: '', oc_cts_no: '',
    oc_completion_date: '', oc_duration: '', oc_occupancy_type: '',
    oc_bua_variation: 'No', oc_deviations: '',
    oc_services_connected: 'No', oc_fire_safety: 'No',
    oc_lifts: 'NA', oc_parking: 'No', oc_rainwater: 'NA',
    oc_ext_dev_charges: 'No',
    // Tab 3 — Track Application
    track_number: '',
    // Tab 4 — Pay Permit Fee
    fee_app_number: '', fee_payment_method: 'upi',
  });

  const [docs, setDocs] = useState({});
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [receiptAppType, setReceiptAppType] = useState('');
  const [receiptFormData, setReceiptFormData] = useState({});
  const [receiptAppNum, setReceiptAppNum] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSwitch = (name) => {
    setFormData(p => ({ ...p, [name]: !p[name] }));
  };

  const handleMobile = (name, value) => {
    setFormData(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 10) }));
  };

  const handleAadhaar = (name, value) => {
    setFormData(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 12) }));
  };

  const onDocChange = (name, file) => {
    if (!file) return;
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setDocs(p => ({ ...p, [name]: file }));
    toast.success(file.name + ' selected');
  };

  const onDocRemove = (name) => setDocs(p => { const n = { ...p }; delete n[name]; return n; });

  const handleTabChange = (_, v) => { setTab(v); setActiveStep(0); };

  const validateStep = () => {
    const d = formData;
    if (tab === 0) {
      if (activeStep === 0) {
        if (!d.bp_owner_name) return 'Owner / Applicant Full Name is required';
        if (!d.bp_mobile || d.bp_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.bp_email) return 'Email is required';
        if (!d.bp_aadhaar || d.bp_aadhaar.length !== 12) return 'Valid 12-digit Aadhaar required';
        if (!d.bp_father_name) return 'Father/Husband Name is required';
        if (!d.bp_dob) return 'Date of Birth is required';
        if (!d.bp_owner_address) return 'Owner Address is required';
        if (!d.bp_ward) return 'Ward is required';
        if (!d.bp_plot_address) return 'Plot / Property Address is required';
        if (!d.bp_plot_number) return 'Plot Number / Survey Number is required';
      }
      if (activeStep === 1) {
        if (!d.bp_construction_type) return 'Type of Proposed Construction is required';
        if (!d.bp_plot_area) return 'Plot Area is required';
        if (!d.bp_setback_front) return 'Front Setback is required';
        if (!d.bp_setback_rear) return 'Rear Setback is required';
        if (!d.bp_setback_left) return 'Left Setback is required';
        if (!d.bp_setback_right) return 'Right Setback is required';
        if (!d.bp_floors) return 'Number of Floors is required';
        if (!d.bp_gf_area) return 'Ground Floor Built-up Area is required';
        if (!d.bp_total_area) return 'Total Proposed Built-up Area is required';
        if (!d.bp_proposed_fsi) return 'Proposed FSI / FAR is required';
        if (!d.bp_purpose) return 'Construction Purpose is required';
        if (!d.bp_height) return 'Proposed Height is required';
        if (!d.bp_parking_2w) return 'Parking spaces (2-Wheeler) is required';
        if (!d.bp_parking_4w) return 'Parking spaces (4-Wheeler) is required';
      }
      if (activeStep === 2) {
        if (!d.bp_architect_name) return 'Architect / Town Planner Name is required';
        if (!d.bp_architect_reg) return 'Architect Registration Number is required';
        if (!d.bp_architect_mobile) return 'Architect Mobile is required';
        if (!d.bp_architect_email) return 'Architect Email is required';
        if (!d.bp_struct_eng_name) return 'Structural Engineer Name is required';
        if (!d.bp_struct_eng_reg) return 'Structural Engineer Registration is required';
      }
      if (activeStep === 3) {
        if (!docs.bp_title_doc) return 'Property Ownership/Title Document is required';
        if (!docs.bp_city_survey) return 'City Survey/7-12 Extract is required';
        if (!docs.bp_site_plan) return 'Site Location Plan is required';
        if (!docs.bp_arch_gf) return 'Architectural Plans — Ground Floor is required';
        if (!docs.bp_arch_upper) return 'Architectural Plans — Upper Floors are required';
        if (!docs.bp_section_elev) return 'Section and Elevation Drawings are required';
        if (!docs.bp_structural_calc) return 'Structural Calculations Report is required';
        if (!docs.bp_arch_cert) return 'Architect Registration Certificate is required';
      }
      if (activeStep === 4) {
        if (!d.bp_declaration) return 'Please confirm the declaration to proceed';
      }
    }
    if (tab === 1) {
      if (activeStep === 0) {
        if (!d.cc_plan_number) return 'Building Plan Approval Number is required';
        if (!d.cc_owner_name) return 'Owner Name is required';
        if (!d.cc_mobile || d.cc_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.cc_property_address) return 'Property Address is required';
        if (!d.cc_ward) return 'Ward is required';
        if (!d.cc_start_date) return 'Proposed Start Date is required';
        if (!d.cc_contractor_name) return 'Contractor Name is required';
        if (!d.cc_contractor_mobile) return 'Contractor Mobile is required';
        if (!d.cc_contractor_license) return 'Contractor License/Registration No is required';
      }
      if (activeStep === 1) {
        if (!d.cc_dec1) return 'Please confirm: Construction will strictly follow approved plans';
        if (!d.cc_dec2) return 'Please confirm: Approved plan copy will be kept at site';
        if (!d.cc_dec3) return 'Please confirm: Safety measures will be implemented';
      }
    }
    if (tab === 2) {
      if (activeStep === 0) {
        if (!d.oc_plan_number) return 'Approved Plan Number is required';
        if (!d.oc_owner_name) return 'Owner Name is required';
        if (!d.oc_mobile || d.oc_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.oc_property_address) return 'Property Address is required';
        if (!d.oc_ward) return 'Ward is required';
        if (!d.oc_plot_number) return 'Plot Number is required';
      }
      if (activeStep === 1) {
        if (!d.oc_completion_date) return 'Date of Construction Completion is required';
        if (!d.oc_occupancy_type) return 'Occupancy Type is required';
      }
      if (activeStep === 2) {
        if (!docs.oc_approved_plan) return 'Approved Building Plan Copy is required';
        if (!docs.oc_completion_cert) return 'Completion Certificate from Architect is required';
        if (!docs.oc_structural_report) return 'Structural Completion Report is required';
        if (!docs.oc_fire_noc) return 'NOC from Fire Department is required';
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setActiveStep(s => s + 1);
  };

  const handleBack = () => setActiveStep(s => s - 1);

  const isLastStep = () => activeStep === TAB_STEPS[tab].length - 1;

  const getAppType = () => {
    const types = ['building_plan_approval', 'construction_commencement_notice', 'occupancy_certificate'];
    return types[tab];
  };

  const handleSubmit = async (email) => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: getAppType(),
        application_data: formData,
      });
      const appNum = res.data?.data?.application_number || 'MBP' + Date.now();
      setRefNumber(appNum);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType(getAppType());
      setReceiptFormData({ ...formData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: getAppType(),
        application_data: { ...formData },
        submitted_at: ts,
      }).catch(console.warn);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTrack = () => {
    if (!formData.track_number) return toast.error('Enter Application / Plan Number');
    setTrackData({
      planNo: formData.track_number,
      owner: 'Rajesh Kumar',
      status: 'Under Technical Scrutiny',
      stage: 'Under Technical Scrutiny',
      officer: 'Er. Mahesh Patil (Town Planning)',
      comments: 'FSI calculations and setback measurements are under verification.',
      nextAction: 'Submit revised drawings with updated setbacks as per DCR norms',
      expectedDate: '15 Apr 2025',
    });
  };

  const fetchFee = () => {
    if (!formData.fee_app_number) return toast.error('Enter Application Number');
    setFeeData({
      appNo: formData.fee_app_number,
      appType: 'Building Plan Approval',
      approvedBua: '320 sq.m',
      baseFee: 12000,
      scrutinyFee: 3000,
      infraCharges: 5000,
      total: 20000,
    });
  };

  const handlePayFee = () => {
    if (!feeData) return toast.error('Fetch fee details first');
    setFeeRef('FEE' + Date.now());
    setFeePaid(true);
    toast.success('Payment successful!');
  };

  if (submitted) return (
    <Box>
      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" color="success.main" gutterBottom>Application Submitted!</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>Your reference number is</Typography>
        <Chip label={refNumber} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1.1rem', py: 2, px: 3, mb: 3 }} />
        <Alert severity="info" sx={{ textAlign: 'left' }}>
          {tab === 0 && 'Building Plan Approval application received. Technical scrutiny will commence within 5 working days. Average processing time is 30 working days for standard plans and 60 days for large projects.'}
          {tab === 1 && 'Construction Commencement Notice submitted. You may begin construction as per approved plans. Keep a copy of this notice and approved plans on-site at all times.'}
          {tab === 2 && 'Occupancy Certificate application submitted. Site inspection will be conducted within 10 working days. All services must be operational for the final inspection.'}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} fullWidth sx={{ bgcolor: HEADER_COLOR }}>Close</Button>
      </DialogActions>
    </Box>
  );

  // ─── Tab 0: Building Plan Approval ───────────────────────────────────────────
  const renderBPStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Owner / Applicant Full Name" name="bp_owner_name" value={formData.bp_owner_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Mobile" name="bp_mobile" value={formData.bp_mobile} onChange={e => handleMobile('bp_mobile', e.target.value)} inputProps={{ maxLength: 10 }} helperText="10-digit mobile number" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Email" name="bp_email" value={formData.bp_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Aadhaar Number (12 digits)" name="bp_aadhaar" value={formData.bp_aadhaar} onChange={e => handleAadhaar('bp_aadhaar', e.target.value)} inputProps={{ maxLength: 12 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="PAN Card" name="bp_pan" value={formData.bp_pan} onChange={handleChange} inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Father / Husband Name" name="bp_father_name" value={formData.bp_father_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Date of Birth" name="bp_dob" value={formData.bp_dob} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Gender" name="bp_gender" value={formData.bp_gender} onChange={handleChange}>
            {['Male', 'Female', 'Transgender', 'Prefer not to say'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Ward" name="bp_ward" value={formData.bp_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Owner Address" name="bp_owner_address" value={formData.bp_owner_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Plot / Property Details</Typography></Divider>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Plot / Property Address" name="bp_plot_address" value={formData.bp_plot_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Plot Number / Survey Number" name="bp_plot_number" value={formData.bp_plot_number} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="CTS Number (if applicable)" name="bp_cts_number" value={formData.bp_cts_number} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Pincode" name="bp_pincode" value={formData.bp_pincode} onChange={handleChange} inputProps={{ maxLength: 6 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Zone Type" name="bp_zone_type" value={formData.bp_zone_type} onChange={handleChange}>
            {['Residential', 'Commercial/Retail', 'Industrial', 'Mixed Use', 'Public/Semi-public', 'Green/Open', 'Special Planning Area'].map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Ownership Type" name="bp_ownership_type" value={formData.bp_ownership_type} onChange={handleChange}>
            {['Freehold', 'Leasehold — remaining years', 'Government allotted', 'Cooperative Society'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Type of Proposed Construction" name="bp_construction_type" value={formData.bp_construction_type} onChange={handleChange}>
            {['New construction', 'Addition to existing', 'Vertical extension — adding floor', 'Horizontal extension', 'Amalgamation of plots', 'Sub-division of plot', 'Reconstruction after demolition', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Plot Area (sq.m)" name="bp_plot_area" value={formData.bp_plot_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Setbacks (m)</Typography>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Front Setback (m)" name="bp_setback_front" value={formData.bp_setback_front} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Rear Setback (m)" name="bp_setback_rear" value={formData.bp_setback_rear} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Left Side Setback (m)" name="bp_setback_left" value={formData.bp_setback_left} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Right Side Setback (m)" name="bp_setback_right" value={formData.bp_setback_right} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Number of Floors (Ground + Upper)" name="bp_floors" value={formData.bp_floors} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Basement Proposed?" name="bp_basement" value={formData.bp_basement} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.bp_basement === 'Yes' && (
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Basement Area (sq.m)" name="bp_basement_area" value={formData.bp_basement_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
          </Grid>
        )}
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Ground Floor Built-up Area (sq.m)" name="bp_gf_area" value={formData.bp_gf_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Total Proposed Built-up Area (sq.m)" name="bp_total_area" value={formData.bp_total_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="Permissible FSI / FAR (as per DP)" name="bp_permissible_fsi" value={formData.bp_permissible_fsi} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.01 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Proposed FSI / FAR" name="bp_proposed_fsi" value={formData.bp_proposed_fsi} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.01 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Construction Purpose" name="bp_purpose" value={formData.bp_purpose} onChange={handleChange}>
            {['Residential — single family', 'Residential — multi-family', 'Commercial office', 'Commercial retail', 'Commercial multiplex', 'Mixed residential+commercial', 'Industrial', 'Institutional — school/hospital', 'Other'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Proposed Height (m)" name="bp_height" value={formData.bp_height} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Parking — 2 Wheeler" name="bp_parking_2w" value={formData.bp_parking_2w} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Parking — 4 Wheeler" name="bp_parking_4w" value={formData.bp_parking_4w} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Rainwater Harvesting Required?" name="bp_rainwater" value={formData.bp_rainwater} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Solar Rooftop Planned?" name="bp_solar" value={formData.bp_solar} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Estimated Construction Cost (₹)" name="bp_est_cost" value={formData.bp_est_cost} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Expected Start Date" name="bp_start_date" value={formData.bp_start_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Architect / Town Planner Details</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Architect / Town Planner Name" name="bp_architect_name" value={formData.bp_architect_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Architect Registration Number (CoA)" name="bp_architect_reg" value={formData.bp_architect_reg} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Architect Mobile" name="bp_architect_mobile" value={formData.bp_architect_mobile} onChange={e => handleMobile('bp_architect_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Architect Email" name="bp_architect_email" value={formData.bp_architect_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Structural Engineer Details</Typography></Divider>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Structural Engineer Name" name="bp_struct_eng_name" value={formData.bp_struct_eng_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Structural Engineer Registration" name="bp_struct_eng_reg" value={formData.bp_struct_eng_reg} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Structural Engineer Mobile" name="bp_struct_eng_mobile" value={formData.bp_struct_eng_mobile} onChange={e => handleMobile('bp_struct_eng_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Geotechnical Report Available?" name="bp_geo_report" value={formData.bp_geo_report} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Soil Type at Site" name="bp_soil_type" value={formData.bp_soil_type} onChange={handleChange}>
            {['Hard rock', 'Sandy', 'Alluvial/Loam', 'Black cotton soil', 'Fill/Made-up land', 'Not assessed'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Contractor Details (Optional)</Typography></Divider>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Building Contractor Name" name="bp_contractor_name" value={formData.bp_contractor_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Contractor License No" name="bp_contractor_license" value={formData.bp_contractor_license} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Any Dispute / Litigation on Property?" name="bp_litigation" value={formData.bp_litigation} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Adjacent Property Owners Notified?" name="bp_neighbors_notified" value={formData.bp_neighbors_notified} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    );

    if (activeStep === 3) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Upload Required Documents (Max 5 MB each)</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Property Ownership / Title Document" name="bp_title_doc" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Index II / Last Registration" name="bp_index2" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="City Survey / 7-12 Extract" name="bp_city_survey" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Site Location Plan" name="bp_site_plan" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Showing plot in context of surrounding roads" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Architectural Plans — Ground Floor" name="bp_arch_gf" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Architectural Plans — Upper Floors" name="bp_arch_upper" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Section and Elevation Drawings" name="bp_section_elev" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Structural Calculations Report" name="bp_structural_calc" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Architect Registration Certificate" name="bp_arch_cert" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="NOC from Adjacent Landowners" name="bp_neighbor_noc" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="For constructions near plot boundaries" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Soil Test / Geotechnical Report" name="bp_soil_report" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Fire NOC" name="bp_fire_noc" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for buildings above 4 floors" />
        </Grid>
      </Grid>
    );

    if (activeStep === 4) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Application Summary</Typography>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f5ff' }}>
            <Grid container spacing={1}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Owner Name</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.bp_owner_name || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Plot Number</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.bp_plot_number || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Construction Type</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.bp_construction_type || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Number of Floors</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.bp_floors || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Total Built-up Area (sq.m)</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.bp_total_area || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Architect</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.bp_architect_name || '—'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff8e1', borderColor: 'warning.light' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Declaration:</strong> I hereby declare that construction will strictly adhere to approved plans and all applicable building bylaws and development control regulations. I also confirm that all information provided above is accurate and complete to the best of my knowledge.
            </Typography>
            <FormControlLabel
              control={<Switch checked={formData.bp_declaration} onChange={() => handleSwitch('bp_declaration')} color="primary" />}
              label={<Typography variant="body2" fontWeight={600}>I confirm the above declaration and agree to comply with all regulations</Typography>}
            />
          </Paper>
        </Grid>
        {!formData.bp_declaration && (
          <Grid item xs={12}>
            <Alert severity="warning">You must confirm the declaration to submit the application.</Alert>
          </Grid>
        )}
      </Grid>
    );
    return null;
  };

  // ─── Tab 1: Construction Commencement Notice ───────────────────────────────────
  const renderCCStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Building Plan Approval Number" name="cc_plan_number" value={formData.cc_plan_number} onChange={handleChange} placeholder="e.g., BPA/2024/00123" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Owner Name" name="cc_owner_name" value={formData.cc_owner_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Mobile" name="cc_mobile" value={formData.cc_mobile} onChange={e => handleMobile('cc_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Email" name="cc_email" value={formData.cc_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={2} label="Property Address" name="cc_property_address" value={formData.cc_property_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Ward" name="cc_ward" value={formData.cc_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Approved Built-up Area (sq.m)" name="cc_approved_bua" value={formData.cc_approved_bua} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Proposed Start Date" name="cc_start_date" value={formData.cc_start_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Contractor Details</Typography></Divider>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Contractor Name" name="cc_contractor_name" value={formData.cc_contractor_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Contractor Mobile" name="cc_contractor_mobile" value={formData.cc_contractor_mobile} onChange={e => handleMobile('cc_contractor_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Contractor License / Registration No" name="cc_contractor_license" value={formData.cc_contractor_license} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Foreman Name (Senior Supervisor on Site)" name="cc_foreman_name" value={formData.cc_foreman_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Site Supervisor Mobile" name="cc_supervisor_mobile" value={formData.cc_supervisor_mobile} onChange={e => handleMobile('cc_supervisor_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Commencement Declaration</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>Please confirm all three declarations before submitting the commencement notice.</Alert>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: formData.cc_dec1 ? '#e8f5e9' : '#fafafa', borderColor: formData.cc_dec1 ? 'success.main' : 'grey.300' }}>
            <FormControlLabel
              control={<Switch checked={formData.cc_dec1} onChange={() => handleSwitch('cc_dec1')} color="success" />}
              label={<Typography variant="body2">Construction will be carried out strictly as per approved plans and building bylaws. No deviations will be made without prior written approval from the municipal authority.</Typography>}
            />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: formData.cc_dec2 ? '#e8f5e9' : '#fafafa', borderColor: formData.cc_dec2 ? 'success.main' : 'grey.300' }}>
            <FormControlLabel
              control={<Switch checked={formData.cc_dec2} onChange={() => handleSwitch('cc_dec2')} color="success" />}
              label={<Typography variant="body2">A copy of the approved plans and permit documents will be maintained at the construction site at all times and will be made available for inspection by authorized officers.</Typography>}
            />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: formData.cc_dec3 ? '#e8f5e9' : '#fafafa', borderColor: formData.cc_dec3 ? 'success.main' : 'grey.300' }}>
            <FormControlLabel
              control={<Switch checked={formData.cc_dec3} onChange={() => handleSwitch('cc_dec3')} color="success" />}
              label={<Typography variant="body2">Adequate safety measures will be implemented for the protection of workers, pedestrians, and surrounding properties throughout the construction period.</Typography>}
            />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={3} label="Additional Comments (Optional)" name="cc_comments" value={formData.cc_comments} onChange={handleChange} placeholder="Any additional information or special circumstances..." />
        </Grid>
      </Grid>
    );
    return null;
  };

  // ─── Tab 2: Occupancy Certificate ─────────────────────────────────────────────
  const renderOCStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Approved Plan Number" name="oc_plan_number" value={formData.oc_plan_number} onChange={handleChange} placeholder="e.g., BPA/2022/00456" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Commencement Certificate Number" name="oc_commencement_cert" value={formData.oc_commencement_cert} onChange={handleChange} placeholder="e.g., CCN/2022/00789" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Owner Name" name="oc_owner_name" value={formData.oc_owner_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Mobile" name="oc_mobile" value={formData.oc_mobile} onChange={e => handleMobile('oc_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Email" name="oc_email" value={formData.oc_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Ward" name="oc_ward" value={formData.oc_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Property Address" name="oc_property_address" value={formData.oc_property_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Plot Number" name="oc_plot_number" value={formData.oc_plot_number} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="CTS No" name="oc_cts_no" value={formData.oc_cts_no} onChange={handleChange} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Date of Construction Completion" name="oc_completion_date" value={formData.oc_completion_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Total Construction Duration (months)" name="oc_duration" value={formData.oc_duration} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required select label="Occupancy Type" name="oc_occupancy_type" value={formData.oc_occupancy_type} onChange={handleChange}>
            {['Residential only', 'Commercial only', 'Mixed residential+commercial', 'Industrial', 'Institutional', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="As-built BUA vs Approved BUA — Any Variations?" name="oc_bua_variation" value={formData.oc_bua_variation} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.oc_bua_variation === 'Yes' && (
          <Grid item xs={12}>
            <TextField fullWidth required multiline rows={2} label="Describe Deviations" name="oc_deviations" value={formData.oc_deviations} onChange={handleChange} placeholder="Describe all variations from the approved plan..." />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="All Services (Water/Drainage/Electricity) Connected?" name="oc_services_connected" value={formData.oc_services_connected} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Fire Safety Measures Installed?" name="oc_fire_safety" value={formData.oc_fire_safety} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Lifts Installed and Cleared?" name="oc_lifts" value={formData.oc_lifts} onChange={handleChange}>
            {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Parking Spaces as Approved?" name="oc_parking" value={formData.oc_parking} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Rainwater Harvesting Installed?" name="oc_rainwater" value={formData.oc_rainwater} onChange={handleChange}>
            {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="External Development Charges Paid?" name="oc_ext_dev_charges" value={formData.oc_ext_dev_charges} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Upload Required Documents (Max 5 MB each)</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Approved Building Plan Copy" name="oc_approved_plan" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Completion Certificate from Architect" name="oc_completion_cert" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Structural Completion Report" name="oc_structural_report" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="NOC from Fire Department" name="oc_fire_noc" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Electrical Completion Certificate" name="oc_electrical_cert" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Plumbing / Drainage Completion Certificate" name="oc_plumbing_cert" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Tax / Lease Clearance" name="oc_tax_clearance" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
      </Grid>
    );
    return null;
  };

  // ─── Tab 3: Track Application ──────────────────────────────────────────────────
  const renderTrackTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Average processing time is 30 working days for standard plans, 60 days for large projects.
      </Alert>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <TextField fullWidth label="Application / Plan Number" name="track_number" value={formData.track_number} onChange={handleChange} placeholder="e.g., BPA/2024/00123" />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button fullWidth variant="contained" onClick={fetchTrack} sx={{ bgcolor: HEADER_COLOR, py: 1.8 }}>
            Track Application
          </Button>
        </Grid>
      </Grid>
      {trackData && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: '#faf5ff' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Plan Number</Typography>
              <Typography variant="body1" fontWeight={600}>{trackData.planNo}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Owner</Typography>
              <Typography variant="body1" fontWeight={600}>{trackData.owner}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={trackData.status} color="warning" size="small" />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Stage</Typography>
              <Typography variant="body2">{trackData.stage}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Assigned Officer</Typography>
              <Typography variant="body2">{trackData.officer}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Scrutiny Comments</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{trackData.comments}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Next Action Required</Typography>
              <Typography variant="body2" color="error.main" fontWeight={600} sx={{ mt: 0.5 }}>{trackData.nextAction}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Expected Completion Date</Typography>
              <Typography variant="body2" fontWeight={600}>{trackData.expectedDate}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );

  // ─── Tab 4: Pay Permit Fee ─────────────────────────────────────────────────────
  const renderFeeTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Fee is non-refundable. Receipt and approved plan copy will be provided after payment.
      </Alert>
      {feePaid ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="success.main" gutterBottom>Payment Successful!</Typography>
          <Chip label={feeRef} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1rem', py: 1.5, px: 2, mb: 2 }} />
          <Alert severity="success">Payment received. Receipt and approved plan copy will be emailed within 1 working day.</Alert>
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField fullWidth label="Application Number" name="fee_app_number" value={formData.fee_app_number} onChange={handleChange} placeholder="e.g., BPA/2024/00123" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="outlined" onClick={fetchFee} sx={{ borderColor: HEADER_COLOR, color: HEADER_COLOR, py: 1.8 }}>
              Fetch Fee Details
            </Button>
          </Grid>
          {feeData && (
            <>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#faf5ff' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Application Type</Typography>
                      <Typography variant="body2" fontWeight={600}>{feeData.appType}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Approved BUA</Typography>
                      <Typography variant="body2" fontWeight={600}>{feeData.approvedBua}</Typography>
                    </Grid>
                    <Grid item xs={12}><Divider /></Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Base Fee</Typography>
                      <Typography variant="body2">₹ {feeData.baseFee.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Scrutiny Fee</Typography>
                      <Typography variant="body2">₹ {feeData.scrutinyFee.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Infrastructure Charges</Typography>
                      <Typography variant="body2">₹ {feeData.infraCharges.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12}><Divider /></Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" fontWeight={700} color="primary">Total Fee: ₹ {feeData.total.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth select label="Payment Method" name="fee_payment_method" value={formData.fee_payment_method} onChange={handleChange}>
                  {[['upi', 'UPI (Google Pay, PhonePe, Paytm)'], ['net_banking', 'Net Banking'], ['dd_challan', 'DD / Challan']].map(([val, label]) => <MenuItem key={val} value={val}>{label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth variant="contained" onClick={handlePayFee} sx={{ bgcolor: HEADER_COLOR, py: 1.5 }}>
                  Pay ₹ {feeData.total.toLocaleString()}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      )}
    </Box>
  );

  const renderStepContent = () => {
    if (tab === 0) return renderBPStep();
    if (tab === 1) return renderCCStep();
    if (tab === 2) return renderOCStep();
    return null;
  };

  const isStepperTab = tab < 3;

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    handleSubmit(email);
  };

  return (
    <Box>
      <DialogContent>
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tab label="Building Plan Approval" />
          <Tab label="Commencement Notice" />
          <Tab label="Occupancy Certificate" />
          <Tab label="Track Application" />
          <Tab label="Pay Permit Fee" />
        </Tabs>

        {isStepperTab && (
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {TAB_STEPS[tab].map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {tab === 0 && <TabPanel value={tab} index={0}>{renderBPStep()}</TabPanel>}
        {tab === 1 && <TabPanel value={tab} index={1}>{renderCCStep()}</TabPanel>}
        {tab === 2 && <TabPanel value={tab} index={2}>{renderOCStep()}</TabPanel>}
        {tab === 3 && <TabPanel value={tab} index={3}>{renderTrackTab()}</TabPanel>}
        {tab === 4 && <TabPanel value={tab} index={4}>{renderFeeTab()}</TabPanel>}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {isStepperTab && (
          <>
            {activeStep > 0 && (
              <Button onClick={handleBack} variant="outlined" sx={{ borderColor: HEADER_COLOR, color: HEADER_COLOR }}>Back</Button>
            )}
            {isLastStep() ? (
              <Button variant="contained" onClick={() => setShowOtpDialog(true)} disabled={submitting} sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: '#4a148c' } }}>
                {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext} sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: '#4a148c' } }}>
                Next
              </Button>
            )}
          </>
        )}
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={tab === 0 ? formData.bp_email || '' : tab === 1 ? formData.cc_email || '' : formData.oc_email || ''}
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
};

export default MunicipalBuildingPermitForm;

