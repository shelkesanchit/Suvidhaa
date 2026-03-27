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

const HEADER_COLOR = '#c2185b';
const HOVER_COLOR  = '#880e4f';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

const MARRIAGE_STEPS = [
  'Groom Details',
  'Bride Details',
  'Marriage Details',
  'Witnesses',
  'Documents & Review',
];
const CORR_STEPS = ['Certificate Details', 'Correction Info', 'Documents'];

const RELIGION_OPTIONS   = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const EDUCATION_OPTIONS  = [
  'No formal education', 'Primary', 'Secondary', 'Higher Secondary',
  'Graduate', 'Postgraduate', 'Professional degree', 'Other',
];
const OCCUPATION_OPTIONS = [
  'Government employee', 'Private employee', 'Self-employed', 'Farmer', 'Student', 'Unemployed', 'Other',
];
const WITNESS_RELATION_OPTIONS = [
  'Friend of bride', 'Friend of groom', 'Relative of bride', 'Relative of groom',
  'Colleague', 'Neighbour', 'Other',
];

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const SectionHeading = ({ children }) => (
  <Grid item xs={12}>
    <Box sx={{ mt: 1.5, mb: 0.5 }}>
      <Typography
        variant="caption" fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 1, color: HEADER_COLOR }}
      >
        {children}
      </Typography>
      <Divider />
    </Box>
  </Grid>
);

const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const btnSx = { bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR }, color: '#fff', px: 3 };

const initialGroom = {
  name: '', fatherName: '', motherName: '', dob: '', placeOfBirth: '',
  nationality: 'Indian', religion: '', education: '', occupation: '',
  aadhaar: '', pan: '', voterId: '', mobile: '', email: '',
  maritalStatusBefore: '',
  prevSpouseName: '', prevDeathDate: '', prevDivorceDate: '', prevDivorceDecreeNo: '',
  address: '', ward: '', pincode: '',
};

const initialBride = {
  name: '', fatherName: '', motherName: '', dob: '', placeOfBirth: '',
  nationality: 'Indian', religion: '', education: '', occupation: '',
  aadhaar: '', pan: '', voterId: '', mobile: '', email: '',
  maritalStatusBefore: '',
  prevSpouseName: '', prevDeathDate: '', prevDivorceDate: '', prevDivorceDecreeNo: '',
  address: '', ward: '', pincode: '',
};

const initialWitness = {
  name: '', fatherName: '', aadhaar: '', mobile: '', email: '',
  relation: '', address: '', ward: '',
};

export default function MunicipalMarriageRegForm({ onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  // Tab 0 – Marriage Application
  const [marriageStep, setMarriageStep] = useState(0);
  const [marriageSubmitting, setMarriageSubmitting] = useState(false);
  const [marriageSubmitted, setMarriageSubmitted] = useState(false);
  const [marriageRefNumber, setMarriageRefNumber] = useState('');

  // Tab 1 – Download
  const [downloadRegNo, setDownloadRegNo] = useState('');
  const [downloadResult, setDownloadResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Tab 2 – Correction
  const [corrStep, setCorrStep] = useState(0);
  const [corrSubmitting, setCorrSubmitting] = useState(false);
  const [corrSubmitted, setCorrSubmitted] = useState(false);
  const [corrRefNumber, setCorrRefNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [receiptAppType, setReceiptAppType] = useState('');
  const [receiptFormData, setReceiptFormData] = useState({});
  const [receiptAppNum, setReceiptAppNum] = useState('');

  // ── Tab 0 form state ──
  const [groom, setGroom] = useState(initialGroom);
  const [bride, setBride] = useState(initialBride);
  const [marriage, setMarriage] = useState({
    dateOfMarriage: '', timeOfMarriage: '', venue: '', venueAddress: '',
    city: '', state: '', district: '',
    venueType: '', actUnder: '',
    priestName: '', priestRegId: '', ceremonyConductedBy: '', numInvitees: '',
  });
  const [witness1, setWitness1] = useState(initialWitness);
  const [witness2, setWitness2] = useState(initialWitness);

  const [marriageDocs, setMarriageDocs] = useState({
    groom_age_proof: null,
    bride_age_proof: null,
    groom_address_proof: null,
    bride_address_proof: null,
    groom_photo: null,
    bride_photo: null,
    wedding_photo: null,
    wedding_invitation: null,
    witness1_id: null,
    witness2_id: null,
    prev_spouse_death_cert: null,
    divorce_decree: null,
  });

  const [declarations, setDeclarations] = useState({
    eligibilityConfirmed: false,
    detailsCorrect: false,
  });

  // ── Tab 2 form state ──
  const [corr, setCorr] = useState({
    regNumber: '', dateOfMarriage: '', groomNameOnCert: '', brideNameOnCert: '',
    applicantName: '', applicantMobile: '', applicantAadhaar: '',
    applicantRelation: '',
    fieldToCorrect: '', incorrectValue: '', correctValue: '', reason: '',
  });

  const [corrDocs, setCorrDocs] = useState({
    original_certificate: null,
    supporting_proof: null,
    affidavit: null,
  });

  // ── handleTabChange ──
  const handleTabChange = (_, newVal) => {
    setActiveTab(newVal);
    setMarriageStep(0);
    setMarriageSubmitted(false);
    setMarriageSubmitting(false);
    setCorrStep(0);
    setCorrSubmitted(false);
    setCorrSubmitting(false);
    setDownloadResult(null);
  };

  // ── Groom helpers ──
  const grChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'mobile') val = val.replace(/\D/g, '').slice(0, 10);
    if (field === 'aadhaar') val = val.replace(/\D/g, '').slice(0, 12);
    if (field === 'pan') val = val.toUpperCase().slice(0, 10);
    setGroom(p => ({ ...p, [field]: val }));
  };

  // ── Bride helpers ──
  const brChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'mobile') val = val.replace(/\D/g, '').slice(0, 10);
    if (field === 'aadhaar') val = val.replace(/\D/g, '').slice(0, 12);
    if (field === 'pan') val = val.toUpperCase().slice(0, 10);
    setBride(p => ({ ...p, [field]: val }));
  };

  // ── Marriage helpers ──
  const mChange = (field) => (e) => setMarriage(p => ({ ...p, [field]: e.target.value }));

  // ── Witness helpers ──
  const w1Change = (field) => (e) => {
    let val = e.target.value;
    if (field === 'mobile') val = val.replace(/\D/g, '').slice(0, 10);
    if (field === 'aadhaar') val = val.replace(/\D/g, '').slice(0, 12);
    setWitness1(p => ({ ...p, [field]: val }));
  };
  const w2Change = (field) => (e) => {
    let val = e.target.value;
    if (field === 'mobile') val = val.replace(/\D/g, '').slice(0, 10);
    if (field === 'aadhaar') val = val.replace(/\D/g, '').slice(0, 12);
    setWitness2(p => ({ ...p, [field]: val }));
  };

  // ── Doc helpers ──
  const mDocChange = (name, file) => {
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setMarriageDocs(p => ({ ...p, [name]: file }));
    toast.success(`${name.replace(/_/g, ' ')} uploaded successfully`);
  };
  const mDocRemove = (name) => setMarriageDocs(p => ({ ...p, [name]: null }));

  // ── Validation ──
  const validateMarriageStep = () => {
    if (marriageStep === 0) {
      const g = groom;
      if (!g.name.trim()) { toast.error("Groom's Full Name is required"); return false; }
      if (!g.fatherName.trim()) { toast.error("Groom's Father's Name is required"); return false; }
      if (!g.dob) { toast.error("Groom's Date of Birth is required"); return false; }
      const age = calcAge(g.dob);
      if (age !== null && age < 21) { toast.error('Groom must be at least 21 years old'); return false; }
      if (!g.placeOfBirth.trim()) { toast.error("Groom's Place of Birth is required"); return false; }
      if (!g.religion) { toast.error("Groom's Religion is required"); return false; }
      if (!g.occupation) { toast.error("Groom's Occupation is required"); return false; }
      if (!g.aadhaar || g.aadhaar.length < 12) { toast.error("Groom's valid 12-digit Aadhaar is required"); return false; }
      if (!g.mobile || g.mobile.length < 10) { toast.error("Groom's valid Mobile is required"); return false; }
      if (!g.maritalStatusBefore) { toast.error("Groom's Marital Status Before is required"); return false; }
      if (!g.address.trim()) { toast.error("Groom's Permanent Address is required"); return false; }
      if (!g.ward) { toast.error("Groom's Ward is required"); return false; }
      if (!g.pincode.trim()) { toast.error("Groom's Pincode is required"); return false; }
    }
    if (marriageStep === 1) {
      const b = bride;
      if (!b.name.trim()) { toast.error("Bride's Full Name is required"); return false; }
      if (!b.fatherName.trim()) { toast.error("Bride's Father's Name is required"); return false; }
      if (!b.dob) { toast.error("Bride's Date of Birth is required"); return false; }
      const age = calcAge(b.dob);
      if (age !== null && age < 18) { toast.error('Bride must be at least 18 years old'); return false; }
      if (!b.placeOfBirth.trim()) { toast.error("Bride's Place of Birth is required"); return false; }
      if (!b.religion) { toast.error("Bride's Religion is required"); return false; }
      if (!b.occupation) { toast.error("Bride's Occupation is required"); return false; }
      if (!b.aadhaar || b.aadhaar.length < 12) { toast.error("Bride's valid 12-digit Aadhaar is required"); return false; }
      if (!b.mobile || b.mobile.length < 10) { toast.error("Bride's valid Mobile is required"); return false; }
      if (!b.maritalStatusBefore) { toast.error("Bride's Marital Status Before is required"); return false; }
      if (!b.address.trim()) { toast.error("Bride's Permanent Address is required"); return false; }
      if (!b.ward) { toast.error("Bride's Ward is required"); return false; }
      if (!b.pincode.trim()) { toast.error("Bride's Pincode is required"); return false; }
    }
    if (marriageStep === 2) {
      const m = marriage;
      if (!m.dateOfMarriage) { toast.error('Date of Marriage is required'); return false; }
      if (!m.venue.trim()) { toast.error('Venue / Place of Marriage is required'); return false; }
      if (!m.venueAddress.trim()) { toast.error('Address of Marriage Venue is required'); return false; }
      if (!m.city.trim()) { toast.error('City of Marriage is required'); return false; }
      if (!m.state.trim()) { toast.error('State of Marriage is required'); return false; }
      if (!m.venueType) { toast.error('Venue Type is required'); return false; }
      if (!m.actUnder) { toast.error('Act under which registering is required'); return false; }
    }
    if (marriageStep === 3) {
      const w1 = witness1; const w2 = witness2;
      if (!w1.name.trim()) { toast.error('Witness 1 Full Name is required'); return false; }
      if (!w1.fatherName.trim()) { toast.error("Witness 1 Father's Name is required"); return false; }
      if (!w1.aadhaar || w1.aadhaar.length < 12) { toast.error('Witness 1 valid 12-digit Aadhaar is required'); return false; }
      if (!w1.mobile || w1.mobile.length < 10) { toast.error('Witness 1 valid Mobile is required'); return false; }
      if (!w1.address.trim()) { toast.error('Witness 1 Address is required'); return false; }
      if (!w1.ward) { toast.error('Witness 1 Ward is required'); return false; }
      if (!w2.name.trim()) { toast.error('Witness 2 Full Name is required'); return false; }
      if (!w2.fatherName.trim()) { toast.error("Witness 2 Father's Name is required"); return false; }
      if (!w2.aadhaar || w2.aadhaar.length < 12) { toast.error('Witness 2 valid 12-digit Aadhaar is required'); return false; }
      if (!w2.mobile || w2.mobile.length < 10) { toast.error('Witness 2 valid Mobile is required'); return false; }
      if (!w2.address.trim()) { toast.error('Witness 2 Address is required'); return false; }
      if (!w2.ward) { toast.error('Witness 2 Ward is required'); return false; }
    }
    if (marriageStep === 4) {
      if (!marriageDocs.groom_age_proof) { toast.error("Groom's Age Proof is required"); return false; }
      if (!marriageDocs.bride_age_proof) { toast.error("Bride's Age Proof is required"); return false; }
      if (!marriageDocs.groom_address_proof) { toast.error("Groom's Address Proof is required"); return false; }
      if (!marriageDocs.bride_address_proof) { toast.error("Bride's Address Proof is required"); return false; }
      if (!marriageDocs.groom_photo) { toast.error("Groom's 2 Passport Photos upload is required"); return false; }
      if (!marriageDocs.bride_photo) { toast.error("Bride's 2 Passport Photos upload is required"); return false; }
      if (!marriageDocs.wedding_photo) { toast.error('Wedding Ceremony Photo is required'); return false; }
      if (!marriageDocs.witness1_id) { toast.error('Witness 1 Identity Proof is required'); return false; }
      if (!marriageDocs.witness2_id) { toast.error('Witness 2 Identity Proof is required'); return false; }
      if (!declarations.eligibilityConfirmed) { toast.error('Please confirm eligibility to marry under the applicable Act'); return false; }
      if (!declarations.detailsCorrect) { toast.error('Please confirm all dates, names, and details are true and accurate'); return false; }
    }
    return true;
  };

  const handleMarriageNext = () => { if (validateMarriageStep()) setMarriageStep(s => s + 1); };
  const handleMarriageBack = () => setMarriageStep(s => s - 1);

  const handleMarriageSubmit = async (email) => {
    if (!validateMarriageStep()) return;
    setMarriageSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'marriage_registration',
        application_data: { groom, bride, marriage, witness1, witness2 },
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MMR-${Date.now()}`;
      setMarriageRefNumber(appNum);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('marriage_registration');
      setReceiptFormData({ groom, bride, marriage, witness1, witness2 });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Application submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'marriage_registration',
        application_data: { groom, bride, marriage, witness1, witness2 },
        submitted_at: ts,
      }).catch(console.warn);
      setMarriageSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setMarriageSubmitting(false);
    }
  };

  // ── Download helpers ──
  const handleDownload = async () => {
    if (!downloadRegNo.trim()) { toast.error('Marriage Registration Number is required'); return; }
    setDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setDownloadResult({
        groomName: 'Rajesh Kumar Sharma',
        brideName: 'Priya Anil Desai',
        dateOfMarriage: '14 February 2025',
        place: 'Mangal Karyalay, Ward 3',
        regDate: '20 February 2025',
        certNo: downloadRegNo,
        issuedBy: 'Municipal Corporation — Marriage Registrar',
      });
    } catch {
      toast.error('Could not fetch marriage certificate details');
    } finally {
      setDownloading(false);
    }
  };

  // ── Correction helpers ──
  const cChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'applicantMobile') val = val.replace(/\D/g, '').slice(0, 10);
    if (field === 'applicantAadhaar') val = val.replace(/\D/g, '').slice(0, 12);
    setCorr(p => ({ ...p, [field]: val }));
  };

  const cDocChange = (name, file) => {
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setCorrDocs(p => ({ ...p, [name]: file }));
    toast.success(`${name.replace(/_/g, ' ')} uploaded successfully`);
  };
  const cDocRemove = (name) => setCorrDocs(p => ({ ...p, [name]: null }));

  const validateCorrStep = () => {
    if (corrStep === 0) {
      if (!corr.regNumber.trim()) { toast.error('Marriage Registration Number is required'); return false; }
      if (!corr.dateOfMarriage) { toast.error('Date of Marriage is required'); return false; }
      if (!corr.groomNameOnCert.trim()) { toast.error("Groom's Name as on Certificate is required"); return false; }
      if (!corr.brideNameOnCert.trim()) { toast.error("Bride's Name as on Certificate is required"); return false; }
      if (!corr.applicantName.trim()) { toast.error('Applicant Name is required'); return false; }
      if (!corr.applicantMobile || corr.applicantMobile.length < 10) { toast.error('Valid Applicant Mobile is required'); return false; }
      if (!corr.applicantAadhaar || corr.applicantAadhaar.length < 12) { toast.error('Valid 12-digit Applicant Aadhaar is required'); return false; }
      if (!corr.applicantRelation) { toast.error("Applicant's Relation is required"); return false; }
    }
    if (corrStep === 1) {
      if (!corr.fieldToCorrect) { toast.error('Field to be corrected is required'); return false; }
      if (!corr.incorrectValue.trim()) { toast.error('Incorrect value on certificate is required'); return false; }
      if (!corr.correctValue.trim()) { toast.error('Correct value requested is required'); return false; }
      if (!corr.reason) { toast.error('Reason for correction is required'); return false; }
    }
    if (corrStep === 2) {
      if (!corrDocs.original_certificate) { toast.error('Original Marriage Certificate is required'); return false; }
      if (!corrDocs.supporting_proof) { toast.error('Supporting proof for correction is required'); return false; }
    }
    return true;
  };

  const handleCorrNext = () => { if (validateCorrStep()) setCorrStep(s => s + 1); };
  const handleCorrBack = () => setCorrStep(s => s - 1);

  const handleCorrSubmit = async (email) => {
    if (!validateCorrStep()) return;
    setCorrSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'cert_correction',
        application_data: { ...corr },
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MMRC-${Date.now()}`;
      setCorrRefNumber(appNum);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('cert_correction');
      setReceiptFormData({ ...corr });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Correction request submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'cert_correction',
        application_data: { ...corr },
        submitted_at: ts,
      }).catch(console.warn);
      setCorrSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setCorrSubmitting(false);
    }
  };

  // ════════════════════════════════════════════
  // STEP RENDERS — MARRIAGE REGISTRATION
  // ════════════════════════════════════════════

  const renderPersonBlock = (label, data, onChange, minAge, maritalOptions) => (
    <Grid container spacing={2}>
      <SectionHeading>{label} — Personal Information</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label={`${label}'s Full Name (as per Aadhaar) *`}
          value={data.name} onChange={onChange('name')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Father's Full Name *"
          value={data.fatherName} onChange={onChange('fatherName')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Mother's Full Name *"
          value={data.motherName} onChange={onChange('motherName')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label={`Date of Birth * (min ${minAge} yrs)`} type="date"
          InputLabelProps={{ shrink: true }} value={data.dob} onChange={onChange('dob')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Place of Birth *"
          value={data.placeOfBirth} onChange={onChange('placeOfBirth')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Nationality *"
          value={data.nationality} onChange={onChange('nationality')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Religion *</InputLabel>
          <Select value={data.religion} label="Religion *" onChange={onChange('religion')}>
            {RELIGION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Education</InputLabel>
          <Select value={data.education} label="Education" onChange={onChange('education')}>
            {EDUCATION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Occupation *</InputLabel>
          <Select value={data.occupation} label="Occupation *" onChange={onChange('occupation')}>
            {OCCUPATION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <SectionHeading>{label} — Identity</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Aadhaar *" value={data.aadhaar}
          onChange={onChange('aadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${data.aadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="PAN Card" value={data.pan} onChange={onChange('pan')} inputProps={{ maxLength: 10 }} helperText={`${data.pan.length}/10`} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Voter ID" value={data.voterId} onChange={onChange('voterId')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Mobile *" value={data.mobile}
          onChange={onChange('mobile')} inputProps={{ maxLength: 10 }}
          helperText={`${data.mobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Email" type="email" value={data.email} onChange={onChange('email')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Marital Status Before *</InputLabel>
          <Select value={data.maritalStatusBefore} label="Marital Status Before *" onChange={onChange('maritalStatusBefore')}>
            {maritalOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {(data.maritalStatusBefore === 'Widower' || data.maritalStatusBefore === 'Widow') && (
        <>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Previous Spouse's Name"
              value={data.prevSpouseName} onChange={onChange('prevSpouseName')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Date of Death of Previous Spouse" type="date"
              InputLabelProps={{ shrink: true }} value={data.prevDeathDate} onChange={onChange('prevDeathDate')}
            />
          </Grid>
        </>
      )}
      {data.maritalStatusBefore === 'Divorced' && (
        <>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Date of Divorce" type="date"
              InputLabelProps={{ shrink: true }} value={data.prevDivorceDate} onChange={onChange('prevDivorceDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Court / Divorce Decree No"
              value={data.prevDivorceDecreeNo} onChange={onChange('prevDivorceDecreeNo')}
            />
          </Grid>
        </>
      )}
      <SectionHeading>{label} — Permanent Address</SectionHeading>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Permanent Address *"
          value={data.address} onChange={onChange('address')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Ward *" value={data.ward} onChange={onChange('ward')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Pincode *" value={data.pincode}
          onChange={onChange('pincode')} inputProps={{ maxLength: 6 }}
        />
      </Grid>
    </Grid>
  );

  const renderWitnessBlock = (label, data, onChange) => (
    <Grid container spacing={2} sx={{ mb: 1 }}>
      <SectionHeading>{label}</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Full Name *" value={data.name} onChange={onChange('name')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Father's Name *" value={data.fatherName} onChange={onChange('fatherName')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Aadhaar *" value={data.aadhaar}
          onChange={onChange('aadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${data.aadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Mobile *" value={data.mobile}
          onChange={onChange('mobile')} inputProps={{ maxLength: 10 }}
          helperText={`${data.mobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Email" type="email" value={data.email} onChange={onChange('email')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Relationship to Couple</InputLabel>
          <Select value={data.relation} label="Relationship to Couple" onChange={onChange('relation')}>
            {WITNESS_RELATION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Ward *" value={data.ward} onChange={onChange('ward')} />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Address *"
          value={data.address} onChange={onChange('address')}
        />
      </Grid>
    </Grid>
  );

  const renderMarriageStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Marriage Date &amp; Venue</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Date of Marriage *" type="date"
          InputLabelProps={{ shrink: true }} value={marriage.dateOfMarriage} onChange={mChange('dateOfMarriage')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Time of Marriage" type="time"
          InputLabelProps={{ shrink: true }} value={marriage.timeOfMarriage} onChange={mChange('timeOfMarriage')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Venue / Place of Marriage *"
          value={marriage.venue} onChange={mChange('venue')}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Address of Marriage Venue *"
          value={marriage.venueAddress} onChange={mChange('venueAddress')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="City of Marriage *" value={marriage.city} onChange={mChange('city')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="State of Marriage *" value={marriage.state} onChange={mChange('state')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="District of Marriage *" value={marriage.district} onChange={mChange('district')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Venue Type *</InputLabel>
          <Select value={marriage.venueType} label="Venue Type *" onChange={mChange('venueType')}>
            {[
              'Home/residence',
              'Hindu temple/mandir',
              'Muslim nikah venue/masjid',
              'Church',
              'Gurudwara',
              'Arya Samaj mandir (section 9 spl)',
              'Court marriage — civil',
              'Marriage hall/banquet',
              'Hotel/resort',
              'Open ground',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Act Under Which Registering *</InputLabel>
          <Select value={marriage.actUnder} label="Act Under Which Registering *" onChange={mChange('actUnder')}>
            {[
              'Hindu Marriage Act 1955',
              'Special Marriage Act 1954',
              'Muslim Personal Law (Shariat) Application Act',
              'Indian Christian Marriage Act',
              'Parsi Marriage and Divorce Act',
              'Arya Samaj — under HMA',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <SectionHeading>Ceremony Details</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Priest / Kazi / Celebrant Name"
          value={marriage.priestName} onChange={mChange('priestName')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Priest Registration / ID (if applicable)"
          value={marriage.priestRegId} onChange={mChange('priestRegId')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Marriage Conducted By</InputLabel>
          <Select value={marriage.ceremonyConductedBy} label="Marriage Conducted By" onChange={mChange('ceremonyConductedBy')}>
            {['Religious ceremony', 'Civil ceremony', 'Court marriage', 'Simple ceremony', 'Other'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Approximate Number of Invitees" type="number"
          value={marriage.numInvitees} onChange={mChange('numInvitees')} inputProps={{ min: 0 }}
        />
      </Grid>
    </Grid>
  );

  const renderMarriageStep4 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fce4ec' }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Application Summary</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Groom:</b> {groom.name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Bride:</b> {bride.name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Date of Marriage:</b> {marriage.dateOfMarriage}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Venue:</b> {marriage.venue}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Act:</b> {marriage.actUnder}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      <SectionHeading>Document Upload</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Groom's Age Proof (Aadhaar/DOB cert)" name="groom_age_proof" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Bride's Age Proof (Aadhaar/DOB cert)" name="bride_age_proof" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Groom's Address Proof" name="groom_address_proof" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Bride's Address Proof" name="bride_address_proof" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Groom's 2 Passport Photos" name="groom_photo" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
          accept=".jpg,.jpeg,.png"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Bride's 2 Passport Photos" name="bride_photo" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
          accept=".jpg,.jpeg,.png"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Wedding Ceremony Photo (showing couple)" name="wedding_photo" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
          accept=".jpg,.jpeg,.png"
          hint="Group photo from wedding"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Wedding Invitation Card" name="wedding_invitation"
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
          hint="Shows date and venue of wedding"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Witness 1 Identity Proof" name="witness1_id" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Witness 2 Identity Proof" name="witness2_id" required
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Death Certificate of Previous Spouse" name="prev_spouse_death_cert"
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
          hint="Required if Widower/Widow"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Divorce Decree" name="divorce_decree"
          docs={marriageDocs} onFileChange={mDocChange} onRemove={mDocRemove}
          hint="Required if Divorced"
        />
      </Grid>
      <SectionHeading>Declaration</SectionHeading>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={declarations.eligibilityConfirmed}
              onChange={e => setDeclarations(p => ({ ...p, eligibilityConfirmed: e.target.checked }))}
              color="primary"
            />
          }
          label="We certify that we are eligible to marry under the applicable Act"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={declarations.detailsCorrect}
              onChange={e => setDeclarations(p => ({ ...p, detailsCorrect: e.target.checked }))}
              color="primary"
            />
          }
          label="We confirm all dates, names, and details provided are true and accurate"
        />
      </Grid>
    </Grid>
  );

  // ════════════════════════════════════════════
  // STEP RENDERS — CORRECTION
  // ════════════════════════════════════════════

  const renderCorrStep0 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Certificate Identification</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Marriage Registration Number *"
          value={corr.regNumber} onChange={cChange('regNumber')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Date of Marriage *" type="date"
          InputLabelProps={{ shrink: true }} value={corr.dateOfMarriage} onChange={cChange('dateOfMarriage')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Applicant's Relation *</InputLabel>
          <Select value={corr.applicantRelation} label="Applicant's Relation *" onChange={cChange('applicantRelation')}>
            {['Groom', 'Bride', 'Legal representative', 'Other'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Groom's Name as on Certificate *"
          value={corr.groomNameOnCert} onChange={cChange('groomNameOnCert')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Bride's Name as on Certificate *"
          value={corr.brideNameOnCert} onChange={cChange('brideNameOnCert')}
        />
      </Grid>
      <SectionHeading>Applicant Details</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Applicant Name *" value={corr.applicantName} onChange={cChange('applicantName')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Applicant Mobile *" value={corr.applicantMobile}
          onChange={cChange('applicantMobile')} inputProps={{ maxLength: 10 }}
          helperText={`${corr.applicantMobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Applicant Aadhaar *" value={corr.applicantAadhaar}
          onChange={cChange('applicantAadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${corr.applicantAadhaar.length}/12`}
        />
      </Grid>
    </Grid>
  );

  const renderCorrStep1 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Correction Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Field to be Corrected *</InputLabel>
          <Select value={corr.fieldToCorrect} label="Field to be Corrected *" onChange={cChange('fieldToCorrect')}>
            {[
              'Groom\'s name',
              'Bride\'s name',
              'Father\'s name of groom',
              'Father\'s name of bride',
              'Date of marriage',
              'Place of marriage',
              'Aadhaar number',
              'Address',
              'Act under which registered',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Reason for Correction *</InputLabel>
          <Select value={corr.reason} label="Reason for Correction *" onChange={cChange('reason')}>
            {[
              'Spelling error',
              'Wrong date entered',
              'Name mismatch with Aadhaar',
              'Transliteration error',
              'Official error in entry',
              'Name change by gazette',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Incorrect Value on Certificate *"
          value={corr.incorrectValue} onChange={cChange('incorrectValue')}
          helperText="Copy exactly as it appears on the certificate"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Correct Value Requested *"
          value={corr.correctValue} onChange={cChange('correctValue')}
          helperText="How it should read after correction"
        />
      </Grid>
    </Grid>
  );

  const renderCorrStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Document Upload</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Original Marriage Certificate" name="original_certificate" required
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Supporting Proof for Correction" name="supporting_proof" required
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
          hint="Aadhaar / marriage invitation / court order showing correct info"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Affidavit from Notary" name="affidavit"
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
          hint="For major name/date corrections"
        />
      </Grid>
    </Grid>
  );

  // ════════════════════════════════════════════
  // OTP HANDLER
  // ════════════════════════════════════════════

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    if (activeTab === 0) handleMarriageSubmit(email);
    else if (activeTab === 2) handleCorrSubmit(email);
  };

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  return (
    <Box>
      <Box sx={{ bgcolor: HEADER_COLOR, color: '#fff', px: 3, py: 2 }}>
        <Typography variant="h6" fontWeight={700}>Marriage Registration Services</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Register marriage, download certificate, or request corrections
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab} onChange={handleTabChange}
          variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#fdf0f5' }}
        >
          <Tab label="Apply for Marriage Registration" />
          <Tab label="Download / Reprint Certificate" />
          <Tab label="Correction Request" />
        </Tabs>

        {/* ══════════════════════════════════ TAB 0: Marriage Registration ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3, py: 1 }}>
            {marriageSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Marriage Registration Application Submitted!</Typography>
                <Chip
                  label={`Reference: ${marriageRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Your marriage registration application has been received. Both parties will be called for
                  document verification and signature at the registrar's office. The marriage certificate will be
                  issued upon successful verification, typically within 15–30 days.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <>
                <Stepper activeStep={marriageStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                  {MARRIAGE_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                </Stepper>
                {marriageStep === 0 && renderPersonBlock(
                  'Groom', groom, grChange, 21,
                  ['Bachelor — never married', 'Widower', 'Divorced']
                )}
                {marriageStep === 1 && renderPersonBlock(
                  'Bride', bride, brChange, 18,
                  ['Single — never married', 'Widow', 'Divorced']
                )}
                {marriageStep === 2 && renderMarriageStep2()}
                {marriageStep === 3 && (
                  <>
                    {renderWitnessBlock('Witness 1', witness1, w1Change)}
                    <Divider sx={{ my: 2 }} />
                    {renderWitnessBlock('Witness 2', witness2, w2Change)}
                  </>
                )}
                {marriageStep === 4 && renderMarriageStep4()}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
                  <Button variant="outlined" onClick={marriageStep === 0 ? onClose : handleMarriageBack}>
                    {marriageStep === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  {marriageStep < MARRIAGE_STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleMarriageNext} sx={btnSx}>Next</Button>
                  ) : (
                    <Button
                      variant="contained" onClick={() => setShowOtpDialog(true)}
                      disabled={marriageSubmitting} sx={btnSx}
                    >
                      {marriageSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 1: Download / Reprint ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3, py: 2 }}>
            <Grid container spacing={2}>
              <SectionHeading>Certificate Lookup</SectionHeading>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth label="Marriage Registration Number *"
                  value={downloadRegNo}
                  onChange={e => { setDownloadRegNo(e.target.value); setDownloadResult(null); }}
                />
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="contained" fullWidth onClick={handleDownload}
                  disabled={downloading} sx={{ ...btnSx, height: 56 }}
                >
                  {downloading ? <CircularProgress size={20} color="inherit" /> : 'Search / Download'}
                </Button>
              </Grid>

              {downloadResult && (
                <>
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#fce4ec' }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Marriage Certificate Details
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Groom Name:</b> {downloadResult.groomName}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Bride Name:</b> {downloadResult.brideName}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Date of Marriage:</b> {downloadResult.dateOfMarriage}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Place:</b> {downloadResult.place}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Registration Date:</b> {downloadResult.regDate}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Certificate No:</b> {downloadResult.certNo}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2"><b>Issued By:</b> {downloadResult.issuedBy}</Typography>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={() => toast.success('Marriage certificate PDF download initiated')}
                          sx={btnSx}
                        >
                          Download PDF
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Marriage certificates are legally valid documents. Digital copies have QR verification.
                      Certified copies are available at the municipal office records room during working hours.
                    </Alert>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 2: Correction Request ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3, py: 1 }}>
            {corrSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Correction Request Submitted!</Typography>
                <Chip
                  label={`Reference: ${corrRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Your correction request has been submitted to the marriage registrar. Documents will be verified
                  and the corrected certificate will be issued within 15–30 working days. Both parties may be
                  required to be present for certain corrections.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <>
                <Stepper activeStep={corrStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                  {CORR_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                </Stepper>
                {corrStep === 0 && renderCorrStep0()}
                {corrStep === 1 && renderCorrStep1()}
                {corrStep === 2 && renderCorrStep2()}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
                  <Button variant="outlined" onClick={corrStep === 0 ? onClose : handleCorrBack}>
                    {corrStep === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  {corrStep < CORR_STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleCorrNext} sx={btnSx}>Next</Button>
                  ) : (
                    <Button
                      variant="contained" onClick={() => setShowOtpDialog(true)}
                      disabled={corrSubmitting} sx={btnSx}
                    >
                      {corrSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Correction Request'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={activeTab === 0 ? groom.email || '' : ''}
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

