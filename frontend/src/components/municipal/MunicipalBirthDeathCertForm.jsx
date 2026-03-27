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

const HEADER_COLOR = '#2e7d32';
const HOVER_COLOR = '#1b5e20';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

const BIRTH_STEPS = ['Event Details', 'Child & Parents Info', 'Informant Details', 'Documents'];
const DEATH_STEPS = ['Deceased Details', 'Death Event', 'Informant Details', 'Documents'];
const CORR_STEPS  = ['Certificate Details', 'Correction Request', 'Documents'];

const RELIGION_OPTIONS  = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const EDUCATION_OPTIONS = [
  'No formal education', 'Primary/Secondary', 'HSC', 'Graduate', 'Postgraduate', 'Other',
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

const getDaysDiff = (fromDateStr) => {
  if (!fromDateStr) return 0;
  const from = new Date(fromDateStr);
  const today = new Date();
  return Math.floor((today - from) / (1000 * 60 * 60 * 24));
};

const btnSx = { bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR }, color: '#fff', px: 3 };

export default function MunicipalBirthDeathCertForm({ onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  // Tab 0 – Birth Certificate
  const [birthStep, setBirthStep] = useState(0);
  const [birthSubmitting, setBirthSubmitting] = useState(false);
  const [birthSubmitted, setBirthSubmitted] = useState(false);
  const [birthRefNumber, setBirthRefNumber] = useState('');

  // Tab 1 – Death Certificate
  const [deathStep, setDeathStep] = useState(0);
  const [deathSubmitting, setDeathSubmitting] = useState(false);
  const [deathSubmitted, setDeathSubmitted] = useState(false);
  const [deathRefNumber, setDeathRefNumber] = useState('');

  // Tab 2 – Download
  const [downloadType, setDownloadType] = useState('');
  const [downloadRegNo, setDownloadRegNo] = useState('');
  const [downloadResult, setDownloadResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Tab 3 – Correction
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

  // ── Tab 0: Birth form state ──
  const [birth, setBirth] = useState({
    dob: '', timeOfBirth: '', sexOfChild: '', birthType: '',
    placeOfBirth: '', hospitalName: '', ward: '', village: '', taluka: '',
    district: '', state: '', wasRegistered: '', hospitalRegNo: '',
    childName: '',
    fatherName: '', fatherDob: '', fatherAadhaar: '', fatherMobile: '',
    fatherOccupation: '', fatherReligion: '', fatherEducation: '',
    motherName: '', motherDob: '', motherAadhaar: '', motherMobile: '',
    motherOccupation: '', motherReligion: '', motherEducation: '',
    previousChildren: '', motherHealthStatus: '',
    parentsAddress: '', parentsWard: '', parentsPincode: '',
    informantName: '', informantRelation: '', informantMobile: '',
    informantEmail: '', informantAadhaar: '', informantAddress: '',
    reasonForApplying: '', lateRegistrationReason: '',
    preferredLanguage: '', copiesRequired: '',
  });

  const [birthDocs, setBirthDocs] = useState({
    hospital_discharge: null,
    mothers_id: null,
    fathers_id: null,
    marriage_certificate: null,
    address_proof: null,
    late_affidavit: null,
    supporting_birth_proof: null,
  });

  // ── Tab 1: Death form state ──
  const [death, setDeath] = useState({
    deceasedName: '', deceasedDob: '', ageAtDeath: '', sex: '',
    religion: '', maritalStatus: '', deceasedAadhaar: '', deceasedVoterId: '',
    deceasedOccupation: '', nationality: '',
    dateOfDeath: '', timeOfDeath: '', causeOfDeath: '', specificDisease: '',
    placeOfDeathType: '', hospitalName: '', hospitalRegNo: '',
    deathWard: '', deathAddress: '', postMortem: '', postMortemRef: '',
    cremationStatus: '', cremationLocation: '',
    informantName: '', informantRelation: '', informantMobile: '',
    informantEmail: '', informantAadhaar: '', informantAddress: '',
    lateRegistrationReason: '', preferredLanguage: '', copiesNeeded: '',
  });

  const [deathDocs, setDeathDocs] = useState({
    medical_certificate: null,
    informant_id: null,
    deceased_id: null,
    cremation_certificate: null,
    police_report: null,
    hospital_summary: null,
  });

  // ── Tab 3: Correction form state ──
  const [corr, setCorr] = useState({
    certType: '', regNumber: '', dateOnCert: '', nameOnCert: '',
    applicantName: '', applicantMobile: '', applicantEmail: '', applicantAadhaar: '',
    relationToHolder: '',
    fieldToCorrect: '', incorrectValue: '', correctValue: '',
    reasonForCorrection: '', supportingProofType: '',
  });

  const [corrDocs, setCorrDocs] = useState({
    original_certificate: null,
    proof_for_correction: null,
    affidavit: null,
    court_order: null,
  });

  // ── handleTabChange ──
  const handleTabChange = (_, newVal) => {
    setActiveTab(newVal);
    setBirthStep(0);   setBirthSubmitted(false);   setBirthSubmitting(false);
    setDeathStep(0);   setDeathSubmitted(false);   setDeathSubmitting(false);
    setCorrStep(0);    setCorrSubmitted(false);    setCorrSubmitting(false);
    setDownloadResult(null);
  };

  // ── Birth helpers ──
  const bChange = (field) => (e) => {
    let val = e.target.value;
    if (['fatherMobile', 'motherMobile', 'informantMobile'].includes(field))
      val = val.replace(/\D/g, '').slice(0, 10);
    if (['fatherAadhaar', 'motherAadhaar', 'informantAadhaar'].includes(field))
      val = val.replace(/\D/g, '').slice(0, 12);
    setBirth(p => ({ ...p, [field]: val }));
  };

  const bDocChange = (name, file) => {
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setBirthDocs(p => ({ ...p, [name]: file }));
    toast.success(`${name.replace(/_/g, ' ')} uploaded successfully`);
  };
  const bDocRemove = (name) => setBirthDocs(p => ({ ...p, [name]: null }));

  const isLateRegistration = () => {
    const r = birth.reasonForApplying;
    return r === '21 days–1 year — delayed' || r === 'More than 1 year — late registration with affidavit';
  };
  const isVeryLate = () => birth.reasonForApplying === 'More than 1 year — late registration with affidavit';

  const validateBirthStep = () => {
    const b = birth;
    if (birthStep === 0) {
      if (!b.dob) { toast.error('Date of Birth is required'); return false; }
      if (!b.timeOfBirth) { toast.error('Time of Birth is required'); return false; }
      if (!b.sexOfChild) { toast.error('Sex of Child is required'); return false; }
      if (!b.birthType) { toast.error('Birth Type is required'); return false; }
      if (!b.placeOfBirth) { toast.error('Place of Birth is required'); return false; }
      if (!b.ward) { toast.error('Ward is required'); return false; }
      if (!b.district) { toast.error('District is required'); return false; }
    }
    if (birthStep === 1) {
      if (!b.fatherName.trim()) { toast.error("Father's Full Name is required"); return false; }
      if (!b.fatherDob) { toast.error("Father's Date of Birth is required"); return false; }
      if (!b.fatherAadhaar || b.fatherAadhaar.length < 12) { toast.error("Father's valid 12-digit Aadhaar is required"); return false; }
      if (!b.fatherMobile || b.fatherMobile.length < 10) { toast.error("Father's valid Mobile is required"); return false; }
      if (!b.motherName.trim()) { toast.error("Mother's Full Name is required"); return false; }
      if (!b.motherDob) { toast.error("Mother's Date of Birth is required"); return false; }
      if (!b.motherAadhaar || b.motherAadhaar.length < 12) { toast.error("Mother's valid 12-digit Aadhaar is required"); return false; }
      if (!b.motherMobile || b.motherMobile.length < 10) { toast.error("Mother's valid Mobile is required"); return false; }
      if (!b.parentsAddress.trim()) { toast.error("Parents' Permanent Address is required"); return false; }
      if (!b.parentsWard) { toast.error("Parents' Ward is required"); return false; }
    }
    if (birthStep === 2) {
      if (!b.informantName.trim()) { toast.error("Informant's Full Name is required"); return false; }
      if (!b.informantRelation) { toast.error("Informant's Relation to Child is required"); return false; }
      if (!b.informantMobile || b.informantMobile.length < 10) { toast.error("Informant's valid Mobile is required"); return false; }
      if (!b.informantAadhaar || b.informantAadhaar.length < 12) { toast.error("Informant's valid 12-digit Aadhaar is required"); return false; }
      if (!b.informantAddress.trim()) { toast.error("Informant's Address is required"); return false; }
    }
    if (birthStep === 3) {
      if (!birthDocs.hospital_discharge) { toast.error('Hospital Discharge Summary / Birth Record is required'); return false; }
      if (!birthDocs.mothers_id) { toast.error("Mother's Aadhaar / Identity Proof is required"); return false; }
      if (!birthDocs.fathers_id) { toast.error("Father's Aadhaar / Identity Proof is required"); return false; }
      if (isVeryLate() && !birthDocs.late_affidavit) { toast.error('Affidavit from Notary is required for late registration'); return false; }
    }
    return true;
  };

  const handleBirthNext = () => { if (validateBirthStep()) setBirthStep(s => s + 1); };
  const handleBirthBack = () => setBirthStep(s => s - 1);

  const handleBirthSubmit = async (email) => {
    if (!validateBirthStep()) return;
    setBirthSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'birth_certificate',
        application_data: { ...birth },
      });
      const appNum = res.data?.reference_number || `MBC-${Date.now()}`;
      const ts = new Date().toISOString();
      setBirthRefNumber(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('birth_certificate');
      setReceiptFormData({ ...birth });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'birth_certificate',
        application_data: { ...birth },
        submitted_at: ts,
      }).catch(console.warn);
    } catch {
      const appNum = `MBC-${Date.now()}`;
      const ts = new Date().toISOString();
      setBirthRefNumber(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('birth_certificate');
      setReceiptFormData({ ...birth });
      setSubmittedAt(ts);
      setShowReceipt(true);
    } finally {
      setBirthSubmitting(false);
    }
  };

  // ── Death helpers ──
  const dChange = (field) => (e) => {
    let val = e.target.value;
    if (['informantMobile'].includes(field)) val = val.replace(/\D/g, '').slice(0, 10);
    if (['informantAadhaar', 'deceasedAadhaar'].includes(field)) val = val.replace(/\D/g, '').slice(0, 12);
    setDeath(p => ({ ...p, [field]: val }));
  };

  const dDocChange = (name, file) => {
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setDeathDocs(p => ({ ...p, [name]: file }));
    toast.success(`${name.replace(/_/g, ' ')} uploaded successfully`);
  };
  const dDocRemove = (name) => setDeathDocs(p => ({ ...p, [name]: null }));

  const validateDeathStep = () => {
    const d = death;
    if (deathStep === 0) {
      if (!d.deceasedName.trim()) { toast.error('Full Name of Deceased is required'); return false; }
      if (!d.ageAtDeath) { toast.error('Age at Death is required'); return false; }
      if (!d.sex) { toast.error('Sex is required'); return false; }
      if (!d.religion) { toast.error('Religion is required'); return false; }
      if (!d.maritalStatus) { toast.error('Marital Status at Death is required'); return false; }
    }
    if (deathStep === 1) {
      if (!d.dateOfDeath) { toast.error('Date of Death is required'); return false; }
      if (!d.timeOfDeath) { toast.error('Time of Death is required'); return false; }
      if (!d.causeOfDeath) { toast.error('Cause of Death is required'); return false; }
      if (!d.placeOfDeathType) { toast.error('Place of Death type is required'); return false; }
      if (!d.hospitalName.trim()) { toast.error('Name of Hospital / Place is required'); return false; }
      if (!d.deathWard) { toast.error('Ward where death occurred is required'); return false; }
      if (!d.deathAddress.trim()) { toast.error('Full address of place of death is required'); return false; }
    }
    if (deathStep === 2) {
      if (!d.informantName.trim()) { toast.error("Informant's Full Name is required"); return false; }
      if (!d.informantRelation) { toast.error("Informant's Relation to Deceased is required"); return false; }
      if (!d.informantMobile || d.informantMobile.length < 10) { toast.error("Informant's valid Mobile is required"); return false; }
      if (!d.informantAadhaar || d.informantAadhaar.length < 12) { toast.error("Informant's valid 12-digit Aadhaar is required"); return false; }
      if (!d.informantAddress.trim()) { toast.error("Informant's Address is required"); return false; }
    }
    if (deathStep === 3) {
      if (!deathDocs.medical_certificate) { toast.error('Medical Certificate of Cause of Death (Form 4) is required'); return false; }
      if (!deathDocs.informant_id) { toast.error("Informant's Aadhaar / ID Proof is required"); return false; }
      if (!deathDocs.cremation_certificate) { toast.error('Cremation / Burial Certificate is required'); return false; }
    }
    return true;
  };

  const handleDeathNext = () => { if (validateDeathStep()) setDeathStep(s => s + 1); };
  const handleDeathBack = () => setDeathStep(s => s - 1);

  const handleDeathSubmit = async (email) => {
    if (!validateDeathStep()) return;
    setDeathSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'death_certificate',
        application_data: { ...death },
      });
      const appNum = res.data?.reference_number || `MDC-${Date.now()}`;
      const ts = new Date().toISOString();
      setDeathRefNumber(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('death_certificate');
      setReceiptFormData({ ...death });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'death_certificate',
        application_data: { ...death },
        submitted_at: ts,
      }).catch(console.warn);
    } catch {
      const appNum = `MDC-${Date.now()}`;
      const ts = new Date().toISOString();
      setDeathRefNumber(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('death_certificate');
      setReceiptFormData({ ...death });
      setSubmittedAt(ts);
      setShowReceipt(true);
    } finally {
      setDeathSubmitting(false);
    }
  };

  // ── Download helpers ──
  const handleDownload = async () => {
    if (!downloadType) { toast.error('Please select Certificate Type'); return; }
    if (!downloadRegNo.trim()) { toast.error('Registration Number is required'); return; }
    setDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setDownloadResult({
        name: downloadType === 'Birth Certificate' ? 'Arjun Ramesh Patil' : 'Smt. Savitabai Patil',
        date: downloadType === 'Birth Certificate' ? '12 June 2019' : '05 November 2024',
        regNo: downloadRegNo,
        issuedBy: 'Municipal Corporation, Ward Office',
        dateOfIssue: 'Today',
        certType: downloadType,
      });
    } catch {
      toast.error('Could not fetch certificate details');
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
    const c = corr;
    if (corrStep === 0) {
      if (!c.certType) { toast.error('Certificate Type is required'); return false; }
      if (!c.regNumber.trim()) { toast.error('Registration Number is required'); return false; }
      if (!c.dateOnCert) { toast.error('Date on Certificate is required'); return false; }
      if (!c.nameOnCert.trim()) { toast.error('Name as on Certificate is required'); return false; }
      if (!c.applicantName.trim()) { toast.error('Applicant Name is required'); return false; }
      if (!c.applicantMobile || c.applicantMobile.length < 10) { toast.error('Valid Applicant Mobile is required'); return false; }
      if (!c.applicantAadhaar || c.applicantAadhaar.length < 12) { toast.error('Valid 12-digit Applicant Aadhaar is required'); return false; }
    }
    if (corrStep === 1) {
      if (!c.fieldToCorrect) { toast.error('Field to be corrected is required'); return false; }
      if (!c.incorrectValue.trim()) { toast.error('Incorrect value on certificate is required'); return false; }
      if (!c.correctValue.trim()) { toast.error('Correct value requested is required'); return false; }
      if (!c.reasonForCorrection) { toast.error('Reason for correction is required'); return false; }
    }
    if (corrStep === 2) {
      if (!corrDocs.original_certificate) { toast.error('Original Certificate Copy is required'); return false; }
      if (!corrDocs.proof_for_correction) { toast.error('Proof supporting correct information is required'); return false; }
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
      const appNum = res.data?.reference_number || `MBDC-${Date.now()}`;
      const ts = new Date().toISOString();
      setCorrRefNumber(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('cert_correction');
      setReceiptFormData({ ...corr });
      setSubmittedAt(ts);
      setShowReceipt(true);
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'cert_correction',
        application_data: { ...corr },
        submitted_at: ts,
      }).catch(console.warn);
    } catch {
      const appNum = `MBDC-${Date.now()}`;
      const ts = new Date().toISOString();
      setCorrRefNumber(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('cert_correction');
      setReceiptFormData({ ...corr });
      setSubmittedAt(ts);
      setShowReceipt(true);
    } finally {
      setCorrSubmitting(false);
    }
  };

  // ════════════════════════════════════════════
  // TAB 0 STEP RENDERS — BIRTH CERTIFICATE
  // ════════════════════════════════════════════

  const renderBirthStep0 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Birth Event Details</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Date of Birth *" type="date"
          InputLabelProps={{ shrink: true }} value={birth.dob} onChange={bChange('dob')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Time of Birth *" type="time"
          InputLabelProps={{ shrink: true }} value={birth.timeOfBirth} onChange={bChange('timeOfBirth')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Sex of Child *</InputLabel>
          <Select value={birth.sexOfChild} label="Sex of Child *" onChange={bChange('sexOfChild')}>
            {['Male', 'Female', 'Transgender/Intersex', 'Not yet determined'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Birth Type *</InputLabel>
          <Select value={birth.birthType} label="Birth Type *" onChange={bChange('birthType')}>
            {[
              'Single birth', 'Twin — 1st', 'Twin — 2nd',
              'Triplet — 1st', 'Triplet — 2nd', 'Triplet — 3rd',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Place of Birth *</InputLabel>
          <Select value={birth.placeOfBirth} label="Place of Birth *" onChange={bChange('placeOfBirth')}>
            {[
              'Government hospital',
              'Private hospital/nursing home',
              'Home — assisted by doctor/nurse',
              'Home — unassisted',
              'Transit/road',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {(birth.placeOfBirth === 'Government hospital' || birth.placeOfBirth === 'Private hospital/nursing home') && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Hospital / Institution Name *"
            value={birth.hospitalName} onChange={bChange('hospitalName')}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Ward" value={birth.ward} onChange={bChange('ward')} />
      </Grid>
      <SectionHeading>Location Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Village / Town of Birth *"
          value={birth.village} onChange={bChange('village')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Taluka / Tehsil" value={birth.taluka} onChange={bChange('taluka')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="District *" value={birth.district} onChange={bChange('district')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="State *" value={birth.state} onChange={bChange('state')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Was Birth Registered at Hospital?</InputLabel>
          <Select value={birth.wasRegistered} label="Was Birth Registered at Hospital?" onChange={bChange('wasRegistered')}>
            {[
              'Yes — within 21 days',
              'Yes — late registration',
              'No — home birth',
              'No — unregistered',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Hospital Registration Number (if already registered)"
          value={birth.hospitalRegNo} onChange={bChange('hospitalRegNo')}
        />
      </Grid>
    </Grid>
  );

  const renderBirthStep1 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Child's Name</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Name of Child"
          value={birth.childName} onChange={bChange('childName')}
          helperText="Leave blank if not yet named — can be updated later"
        />
      </Grid>
      <SectionHeading>Father's Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Father's Full Name (as per Aadhaar) *"
          value={birth.fatherName} onChange={bChange('fatherName')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Father's Date of Birth *" type="date"
          InputLabelProps={{ shrink: true }} value={birth.fatherDob} onChange={bChange('fatherDob')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Father's Aadhaar *" value={birth.fatherAadhaar}
          onChange={bChange('fatherAadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${birth.fatherAadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Father's Mobile *" value={birth.fatherMobile}
          onChange={bChange('fatherMobile')} inputProps={{ maxLength: 10 }}
          helperText={`${birth.fatherMobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Father's Occupation" value={birth.fatherOccupation} onChange={bChange('fatherOccupation')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Father's Religion</InputLabel>
          <Select value={birth.fatherReligion} label="Father's Religion" onChange={bChange('fatherReligion')}>
            {RELIGION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Father's Education</InputLabel>
          <Select value={birth.fatherEducation} label="Father's Education" onChange={bChange('fatherEducation')}>
            {EDUCATION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <SectionHeading>Mother's Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Mother's Full Name (as per Aadhaar) *"
          value={birth.motherName} onChange={bChange('motherName')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Mother's Date of Birth *" type="date"
          InputLabelProps={{ shrink: true }} value={birth.motherDob} onChange={bChange('motherDob')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Mother's Aadhaar *" value={birth.motherAadhaar}
          onChange={bChange('motherAadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${birth.motherAadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Mother's Mobile *" value={birth.motherMobile}
          onChange={bChange('motherMobile')} inputProps={{ maxLength: 10 }}
          helperText={`${birth.motherMobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Mother's Occupation" value={birth.motherOccupation} onChange={bChange('motherOccupation')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Mother's Religion</InputLabel>
          <Select value={birth.motherReligion} label="Mother's Religion" onChange={bChange('motherReligion')}>
            {RELIGION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Mother's Education</InputLabel>
          <Select value={birth.motherEducation} label="Mother's Education" onChange={bChange('motherEducation')}>
            {EDUCATION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Number of Previous Children" type="number"
          value={birth.previousChildren} onChange={bChange('previousChildren')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Mother's Health Status Post-Delivery</InputLabel>
          <Select value={birth.motherHealthStatus} label="Mother's Health Status Post-Delivery" onChange={bChange('motherHealthStatus')}>
            {['Normal', 'Under observation', 'Hospitalized', 'Opt-out / Prefer not to say'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <SectionHeading>Parents' Permanent Address</SectionHeading>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Parents' Permanent Address *"
          value={birth.parentsAddress} onChange={bChange('parentsAddress')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Parents' Ward *" value={birth.parentsWard} onChange={bChange('parentsWard')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Parents' Pincode" value={birth.parentsPincode}
          onChange={bChange('parentsPincode')} inputProps={{ maxLength: 6 }}
        />
      </Grid>
    </Grid>
  );

  const renderBirthStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Informant Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Informant's Full Name *"
          value={birth.informantName} onChange={bChange('informantName')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Relation to Child *</InputLabel>
          <Select value={birth.informantRelation} label="Relation to Child *" onChange={bChange('informantRelation')}>
            {['Father', 'Mother', 'Grandfather', 'Grandmother', 'Hospital authority', 'Legal guardian', 'Other'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Informant's Mobile *" value={birth.informantMobile}
          onChange={bChange('informantMobile')} inputProps={{ maxLength: 10 }}
          helperText={`${birth.informantMobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Informant's Email" type="email"
          value={birth.informantEmail} onChange={bChange('informantEmail')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Informant's Aadhaar *" value={birth.informantAadhaar}
          onChange={bChange('informantAadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${birth.informantAadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Informant's Address *"
          value={birth.informantAddress} onChange={bChange('informantAddress')}
        />
      </Grid>
      <SectionHeading>Registration Timing &amp; Preferences</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Reason for Applying Now</InputLabel>
          <Select value={birth.reasonForApplying} label="Reason for Applying Now" onChange={bChange('reasonForApplying')}>
            {[
              'Within 21 days — normal',
              '21 days–1 year — delayed',
              'More than 1 year — late registration with affidavit',
              'Correction in existing certificate',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {isLateRegistration() && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth multiline rows={2} label="Reason for Delay"
            value={birth.lateRegistrationReason} onChange={bChange('lateRegistrationReason')}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Preferred Language for Certificate</InputLabel>
          <Select value={birth.preferredLanguage} label="Preferred Language for Certificate" onChange={bChange('preferredLanguage')}>
            {['English', 'Marathi', 'Hindi'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Number of Copies Required</InputLabel>
          <Select value={birth.copiesRequired} label="Number of Copies Required" onChange={bChange('copiesRequired')}>
            {['1', '2', '3', '5'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderBirthStep3 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Alert severity="info">
          Birth registration within 21 days is FREE. After 21 days, late fees apply (₹5 – ₹100 depending on delay
          period). Registration after 1 year requires Magistrate permission.
        </Alert>
      </Grid>
      <SectionHeading>Document Upload</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Hospital Discharge Summary / Birth Record" name="hospital_discharge" required
          docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Mother's Aadhaar / Identity Proof" name="mothers_id" required
          docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Father's Aadhaar / Identity Proof" name="fathers_id" required
          docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Parents' Marriage Certificate" name="marriage_certificate"
          docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
          hint="Required for married parents record"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Parents' Address Proof" name="address_proof"
          docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
          hint="Utility bill, property tax receipt"
        />
      </Grid>
      {isVeryLate() && (
        <>
          <Grid item xs={12} sm={6}>
            <DocUpload
              label="Affidavit from Notary" name="late_affidavit" required
              docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
              hint="On ₹100 stamp paper"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DocUpload
              label="School Certificate / Baptism / Immunization Card" name="supporting_birth_proof"
              docs={birthDocs} onFileChange={bDocChange} onRemove={bDocRemove}
              hint="Supporting proof of birth event"
            />
          </Grid>
        </>
      )}
    </Grid>
  );

  // ════════════════════════════════════════════
  // TAB 1 STEP RENDERS — DEATH CERTIFICATE
  // ════════════════════════════════════════════

  const renderDeathStep0 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Deceased Personal Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Full Name of Deceased *"
          value={death.deceasedName} onChange={dChange('deceasedName')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Date of Birth (approx if unknown)" type="date"
          InputLabelProps={{ shrink: true }} value={death.deceasedDob} onChange={dChange('deceasedDob')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Age at Death *" type="number"
          value={death.ageAtDeath} onChange={dChange('ageAtDeath')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Sex *</InputLabel>
          <Select value={death.sex} label="Sex *" onChange={dChange('sex')}>
            {['Male', 'Female', 'Transgender', 'Unknown/Unidentified'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Religion *</InputLabel>
          <Select value={death.religion} label="Religion *" onChange={dChange('religion')}>
            {RELIGION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Marital Status at Death *</InputLabel>
          <Select value={death.maritalStatus} label="Marital Status at Death *" onChange={dChange('maritalStatus')}>
            {['Unmarried', 'Married', 'Widowed', 'Divorced', 'Unknown'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Aadhaar of Deceased (if known)" value={death.deceasedAadhaar}
          onChange={dChange('deceasedAadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${death.deceasedAadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Voter ID of Deceased (if known)" value={death.deceasedVoterId} onChange={dChange('deceasedVoterId')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Occupation of Deceased" value={death.deceasedOccupation} onChange={dChange('deceasedOccupation')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Nationality" value={death.nationality} onChange={dChange('nationality')} />
      </Grid>
    </Grid>
  );

  const renderDeathStep1 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Death Event Information</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Date of Death *" type="date"
          InputLabelProps={{ shrink: true }} value={death.dateOfDeath} onChange={dChange('dateOfDeath')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Time of Death *" type="time"
          InputLabelProps={{ shrink: true }} value={death.timeOfDeath} onChange={dChange('timeOfDeath')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Cause of Death *</InputLabel>
          <Select value={death.causeOfDeath} label="Cause of Death *" onChange={dChange('causeOfDeath')}>
            {[
              'Natural causes / old age',
              'Illness / disease — specify below',
              'Accident — road',
              'Accident — fall',
              'Accident — fire/burn',
              'Drowning',
              'Homicide (requires police report)',
              'Suicide (requires police report)',
              'Stillbirth',
              'Unknown / under investigation',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {death.causeOfDeath === 'Illness / disease — specify below' && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Specific Disease / Illness"
            value={death.specificDisease} onChange={dChange('specificDisease')}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Place of Death Type *</InputLabel>
          <Select value={death.placeOfDeathType} label="Place of Death Type *" onChange={dChange('placeOfDeathType')}>
            {[
              'Government hospital',
              'Private hospital/nursing home',
              'Home',
              'Public place/road',
              'On way to hospital',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Name of Hospital / Place *"
          value={death.hospitalName} onChange={dChange('hospitalName')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Hospital Registration / Admission No"
          value={death.hospitalRegNo} onChange={dChange('hospitalRegNo')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Ward Where Death Occurred *" value={death.deathWard} onChange={dChange('deathWard')} />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Full Address of Place of Death *"
          value={death.deathAddress} onChange={dChange('deathAddress')}
        />
      </Grid>
      <SectionHeading>Post-Mortem &amp; Cremation</SectionHeading>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Was Post-Mortem Conducted?</InputLabel>
          <Select value={death.postMortem} label="Was Post-Mortem Conducted?" onChange={dChange('postMortem')}>
            {['Yes', 'No', 'Not required'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {death.postMortem === 'Yes' && (
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth label="Post-mortem Ref / Hospital Form 4 No"
            value={death.postMortemRef} onChange={dChange('postMortemRef')}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Cremation/Burial Completed?</InputLabel>
          <Select value={death.cremationStatus} label="Cremation/Burial Completed?" onChange={dChange('cremationStatus')}>
            {['Yes — location below', 'In progress', 'No'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Cremation/Burial Ground Name and Location"
          value={death.cremationLocation} onChange={dChange('cremationLocation')}
        />
      </Grid>
    </Grid>
  );

  const renderDeathStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Informant Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Informant's Full Name *"
          value={death.informantName} onChange={dChange('informantName')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Relation to Deceased *</InputLabel>
          <Select value={death.informantRelation} label="Relation to Deceased *" onChange={dChange('informantRelation')}>
            {[
              'Spouse', 'Son/Daughter', 'Father/Mother', 'Sibling',
              'Other relative', 'Landlord', 'Hospital authority (MBBS doctor)', 'Legal heir', 'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Informant's Mobile *" value={death.informantMobile}
          onChange={dChange('informantMobile')} inputProps={{ maxLength: 10 }}
          helperText={`${death.informantMobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Informant's Email" type="email"
          value={death.informantEmail} onChange={dChange('informantEmail')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Informant's Aadhaar *" value={death.informantAadhaar}
          onChange={dChange('informantAadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${death.informantAadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Informant's Address *"
          value={death.informantAddress} onChange={dChange('informantAddress')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Reason for Late Registration (if applicable, >21 days)"
          value={death.lateRegistrationReason} onChange={dChange('lateRegistrationReason')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <FormControl fullWidth>
          <InputLabel>Preferred Language</InputLabel>
          <Select value={death.preferredLanguage} label="Preferred Language" onChange={dChange('preferredLanguage')}>
            {['English', 'Marathi', 'Hindi'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={3}>
        <FormControl fullWidth>
          <InputLabel>Copies Needed</InputLabel>
          <Select value={death.copiesNeeded} label="Copies Needed" onChange={dChange('copiesNeeded')}>
            {['1', '2', '3', '5'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderDeathStep3 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Alert severity="warning">
          For unnatural deaths (accident, suicide, homicide) — police FIR and panchnama are MANDATORY for
          registration. Report to the nearest police station first before submitting this application.
        </Alert>
      </Grid>
      <SectionHeading>Document Upload</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Medical Certificate of Cause of Death (Form 4 / Form 4A)" name="medical_certificate" required
          docs={deathDocs} onFileChange={dDocChange} onRemove={dDocRemove}
          hint="From attending MBBS doctor or hospital"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Informant's Aadhaar / ID Proof" name="informant_id" required
          docs={deathDocs} onFileChange={dDocChange} onRemove={dDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Deceased's Aadhaar / Voter ID" name="deceased_id"
          docs={deathDocs} onFileChange={dDocChange} onRemove={dDocRemove}
          hint="If available"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Cremation / Burial Certificate" name="cremation_certificate" required
          docs={deathDocs} onFileChange={dDocChange} onRemove={dDocRemove}
          hint="Issued by crematorium / graveyard authority"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Police Inquest Report" name="police_report"
          docs={deathDocs} onFileChange={dDocChange} onRemove={dDocRemove}
          hint="Required for accidents, suicide, homicide"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Hospital Discharge or Death Summary" name="hospital_summary"
          docs={deathDocs} onFileChange={dDocChange} onRemove={dDocRemove}
        />
      </Grid>
    </Grid>
  );

  // ════════════════════════════════════════════
  // TAB 3 STEP RENDERS — CORRECTION REQUEST
  // ════════════════════════════════════════════

  const renderCorrStep0 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Certificate Identification</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Certificate Type *</InputLabel>
          <Select value={corr.certType} label="Certificate Type *" onChange={cChange('certType')}>
            {['Birth Certificate', 'Death Certificate'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Registration Number *"
          value={corr.regNumber} onChange={cChange('regNumber')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Date on Certificate *" type="date"
          InputLabelProps={{ shrink: true }} value={corr.dateOnCert} onChange={cChange('dateOnCert')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Name as on Certificate *"
          value={corr.nameOnCert} onChange={cChange('nameOnCert')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Relation to Certificate Holder</InputLabel>
          <Select value={corr.relationToHolder} label="Relation to Certificate Holder" onChange={cChange('relationToHolder')}>
            {['Self', 'Father', 'Mother', 'Spouse', 'Child', 'Legal guardian', 'Sibling', 'Other'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <SectionHeading>Applicant Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Applicant Name *" value={corr.applicantName} onChange={cChange('applicantName')} />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Applicant Mobile *" value={corr.applicantMobile}
          onChange={cChange('applicantMobile')} inputProps={{ maxLength: 10 }}
          helperText={`${corr.applicantMobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Applicant Email" type="email"
          value={corr.applicantEmail} onChange={cChange('applicantEmail')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
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
              'Name of child/deceased',
              'Father\'s name',
              'Mother\'s name',
              'Date of birth/death',
              'Sex/gender',
              'Place of birth/death',
              'Hospital name',
              'Address',
              'Spelling error in any field',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Reason for Correction *</InputLabel>
          <Select value={corr.reasonForCorrection} label="Reason for Correction *" onChange={cChange('reasonForCorrection')}>
            {[
              'Spelling mistake at time of entry',
              'Wrong data entered by registrar',
              'Name change by court/gazette',
              'Date error — hospital document vs registered',
              'Transliteration error (English to regional)',
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
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Supporting Proof Available</InputLabel>
          <Select value={corr.supportingProofType} label="Supporting Proof Available" onChange={cChange('supportingProofType')}>
            {[
              'Aadhaar with correct name',
              'School certificate',
              'Court order / gazette',
              'Birth/marriage certificate',
              'Hospital records',
              'Multiple documents',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderCorrStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Document Upload</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Original Certificate Copy" name="original_certificate" required
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
          hint="Current certificate with the error"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Proof Supporting Correct Information" name="proof_for_correction" required
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
          hint="Aadhaar/school certificate showing correct data"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Affidavit on Stamp Paper" name="affidavit"
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
          hint="For name changes or major corrections"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Court Order / Gazette Notification" name="court_order"
          docs={corrDocs} onFileChange={cDocChange} onRemove={cDocRemove}
          hint="Required for legal name changes"
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
    if (activeTab === 0) handleBirthSubmit(email);
    else if (activeTab === 1) handleDeathSubmit(email);
    else if (activeTab === 3) handleCorrSubmit(email);
  };

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  return (
    <Box>
      <Box sx={{ bgcolor: HEADER_COLOR, color: '#fff', px: 3, py: 2 }}>
        <Typography variant="h6" fontWeight={700}>Birth &amp; Death Certificate Services</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Apply, download, or request corrections for birth and death certificates
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab} onChange={handleTabChange}
          variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f1f8f1' }}
        >
          <Tab label="Apply — Birth Certificate" />
          <Tab label="Apply — Death Certificate" />
          <Tab label="Download / Reprint" />
          <Tab label="Correction Request" />
        </Tabs>

        {/* ══════════════════════════════════ TAB 0: Birth Certificate ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3, py: 1 }}>
            {birthSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Birth Certificate Application Submitted!</Typography>
                <Chip
                  label={`Reference: ${birthRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Your birth registration application has been received. The certificate will be issued within 7
                  working days for normal registrations. For late registrations, processing may take up to 30 days.
                  Please quote your reference number for status enquiries.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <>
                <Stepper activeStep={birthStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                  {BIRTH_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                </Stepper>
                {birthStep === 0 && renderBirthStep0()}
                {birthStep === 1 && renderBirthStep1()}
                {birthStep === 2 && renderBirthStep2()}
                {birthStep === 3 && renderBirthStep3()}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
                  <Button variant="outlined" onClick={birthStep === 0 ? onClose : handleBirthBack}>
                    {birthStep === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  {birthStep < BIRTH_STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleBirthNext} sx={btnSx}>Next</Button>
                  ) : (
                    <Button
                      variant="contained" onClick={() => setShowOtpDialog(true)}
                      disabled={birthSubmitting} sx={btnSx}
                    >
                      {birthSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 1: Death Certificate ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3, py: 1 }}>
            {deathSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Death Certificate Application Submitted!</Typography>
                <Chip
                  label={`Reference: ${deathRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Your death registration application has been received. The death certificate will be issued within
                  7–15 working days. For unnatural deaths, processing depends on police investigation completion.
                  Please quote your reference number for all follow-ups.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <>
                <Stepper activeStep={deathStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                  {DEATH_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                </Stepper>
                {deathStep === 0 && renderDeathStep0()}
                {deathStep === 1 && renderDeathStep1()}
                {deathStep === 2 && renderDeathStep2()}
                {deathStep === 3 && renderDeathStep3()}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
                  <Button variant="outlined" onClick={deathStep === 0 ? onClose : handleDeathBack}>
                    {deathStep === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  {deathStep < DEATH_STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleDeathNext} sx={btnSx}>Next</Button>
                  ) : (
                    <Button
                      variant="contained" onClick={() => setShowOtpDialog(true)}
                      disabled={deathSubmitting} sx={btnSx}
                    >
                      {deathSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 2: Download / Reprint ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3, py: 2 }}>
            <Grid container spacing={2}>
              <SectionHeading>Certificate Lookup</SectionHeading>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Certificate Type *</InputLabel>
                  <Select
                    value={downloadType} label="Certificate Type *"
                    onChange={e => { setDownloadType(e.target.value); setDownloadResult(null); }}
                  >
                    {['Birth Certificate', 'Death Certificate'].map(o => (
                      <MenuItem key={o} value={o}>{o}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth label="Registration Number *"
                  value={downloadRegNo}
                  onChange={e => { setDownloadRegNo(e.target.value); setDownloadResult(null); }}
                />
              </Grid>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
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
                    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#e8f5e9' }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Certificate Details
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <b>{downloadResult.certType === 'Birth Certificate' ? 'Name:' : 'Deceased Name:'}</b> {downloadResult.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <b>{downloadResult.certType === 'Birth Certificate' ? 'Date of Birth:' : 'Date of Death:'}</b> {downloadResult.date}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Registration No:</b> {downloadResult.regNo}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Issued By:</b> {downloadResult.issuedBy}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Date of Issue:</b> {downloadResult.dateOfIssue}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2"><b>Certificate Type:</b> {downloadResult.certType}</Typography>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained" onClick={() => toast.success('Certificate PDF download initiated')}
                          sx={btnSx}
                        >
                          Download PDF
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Digital certificates downloaded here are valid with QR code verification. Physical copies
                      can be collected from the record room at the municipal office during working hours.
                    </Alert>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 3: Correction Request ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={3}>
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
                  Your correction request has been submitted for review. The registrar will verify documents
                  and process the correction within 15–30 working days. You will be notified by SMS/email.
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
        initialEmail={activeTab === 0 ? birth.informantEmail || '' : activeTab === 1 ? death.informantEmail || '' : corr.applicantEmail || ''}
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

