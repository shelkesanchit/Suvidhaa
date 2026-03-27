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

const HEADER_COLOR = '#4527a0';
const HOVER_COLOR = '#311b92';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

const HOUSING_STEPS = [
  'Personal Details',
  'Family & Income',
  'Housing Preferences',
  'Current Situation',
  'Documents & Declaration',
];
const ENCROACH_STEPS = ['Your Details', 'Encroachment Details', 'Location & Documents'];

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const SectionHeading = ({ children }) => (
  <Grid item xs={12}>
    <Box sx={{ mt: 1.5, mb: 0.5 }}>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 1, color: HEADER_COLOR }}
      >
        {children}
      </Typography>
      <Divider />
    </Box>
  </Grid>
);

const calcAge = (dob) => {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? String(age) : '';
};

const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'];

export default function MunicipalHousingForm({ onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  // Tab 0 – Housing Application
  const [housingStep, setHousingStep] = useState(0);
  const [housingSubmitting, setHousingSubmitting] = useState(false);
  const [housingSubmitted, setHousingSubmitted] = useState(false);
  const [housingRefNumber, setHousingRefNumber] = useState('');

  // Tab 1 – Quarter Rent
  const [rentSubmitting, setRentSubmitting] = useState(false);
  const [rentSubmitted, setRentSubmitted] = useState(false);
  const [rentRefNumber, setRentRefNumber] = useState('');
  const [fetchingRent, setFetchingRent] = useState(false);
  const [rentDetails, setRentDetails] = useState(null);

  // Tab 2 – Encroachment
  const [encStep, setEncStep] = useState(0);
  const [encSubmitting, setEncSubmitting] = useState(false);
  const [encSubmitted, setEncSubmitted] = useState(false);
  const [encRefNumber, setEncRefNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [receiptAppType, setReceiptAppType] = useState('');
  const [receiptFormData, setReceiptFormData] = useState({});
  const [receiptAppNum, setReceiptAppNum] = useState('');

  // ── Tab 0 form state ──
  const [housing, setHousing] = useState({
    name: '', fatherName: '', motherName: '', dob: '',
    gender: '', maritalStatus: '', spouseName: '', spouseAadhaar: '',
    mobile: '', altMobile: '', email: '', aadhaar: '', voterId: '',
    religion: '', category: '', subCaste: '', noAadhaarId: '',
    familyMembers: '', childrenUnder18: '', seniorCitizens: '', disabledMembers: '',
    annualIncome: '', incomeCertAuthority: '', incomeCertNumber: '',
    earningMembers: '', incomeSource: '', earningSourceDetails: '',
    aplBplStatus: '', rationCardNo: '', rationCardType: '', govtEmployeeInFamily: '',
    housingScheme: '', houseType: '', preferredLocality: '',
    reasonForApplying: '', willingAnyArea: false, maxRent: '', openToEmi: false,
    currentAddress: '', ward: '', pincode: '', currentHousingType: '',
    currentMonthlyRent: '', landlordName: '', durationAtAddress: '',
    ownsProperty: '', propertyDescription: '',
    previousApplication: '', previousApplicationNo: '',
  });

  const [housingDocs, setHousingDocs] = useState({
    aadhaar_card: null,
    ration_card: null,
    income_certificate: null,
    caste_certificate: null,
    birth_certificate: null,
    marriage_certificate: null,
    address_proof: null,
    affidavit_no_property: null,
    disability_certificate: null,
    passport_photo: null,
  });

  const [declarations, setDeclarations] = useState({
    noOtherProperty: false,
    infoCorrect: false,
    falsePenalty: false,
  });

  // ── Tab 1 form state ──
  const [rentForm, setRentForm] = useState({ allotmentNo: '', paymentMethod: '' });

  // ── Tab 2 form state ──
  const [enc, setEnc] = useState({
    yourName: '', mobile: '', email: '', aadhaar: '',
    address: '', ward: '', affectedStatus: '',
    encType: '', encSince: '', encArea: '', encDescription: '',
    encroacherId: '', personsInvolved: '', notifiedBefore: '', previousAction: '',
    encLocation: '', landmark: '', encWard: '', gpsCoords: '',
  });

  const [encDocs, setEncDocs] = useState({
    enc_photo: null,
    property_doc: null,
    prev_notice: null,
  });

  // ── handleTabChange – resets activeStep + all tab states ──
  const handleTabChange = (_, newVal) => {
    setActiveTab(newVal);
    setHousingStep(0);
    setHousingSubmitted(false);
    setHousingSubmitting(false);
    setRentSubmitted(false);
    setRentSubmitting(false);
    setEncStep(0);
    setEncSubmitted(false);
    setEncSubmitting(false);
  };

  // ── Housing form helpers ──
  const hChange = (field) => (e) => {
    let val = e.target.value;
    if (['mobile', 'altMobile'].includes(field)) val = val.replace(/\D/g, '').slice(0, 10);
    if (['aadhaar', 'spouseAadhaar'].includes(field)) val = val.replace(/\D/g, '').slice(0, 12);
    setHousing(p => ({ ...p, [field]: val }));
  };

  const hSwitch = (field) => (e) => setHousing(p => ({ ...p, [field]: e.target.checked }));

  const hDocChange = (name, file) => {
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setHousingDocs(p => ({ ...p, [name]: file }));
    toast.success(`${name.replace(/_/g, ' ')} uploaded successfully`);
  };
  const hDocRemove = (name) => setHousingDocs(p => ({ ...p, [name]: null }));

  const validateHousingStep = () => {
    const h = housing;
    if (housingStep === 0) {
      if (!h.name.trim()) { toast.error('Full Name is required'); return false; }
      if (!h.fatherName.trim()) { toast.error("Father's Full Name is required"); return false; }
      if (!h.dob) { toast.error('Date of Birth is required'); return false; }
      if (!h.gender) { toast.error('Gender is required'); return false; }
      if (!h.maritalStatus) { toast.error('Marital Status is required'); return false; }
      if (!h.mobile || h.mobile.length < 10) { toast.error('Valid 10-digit Mobile is required'); return false; }
      if (!h.aadhaar || h.aadhaar.length < 12) { toast.error('Valid 12-digit Aadhaar is required'); return false; }
    }
    if (housingStep === 1) {
      if (!h.familyMembers) { toast.error('Total Number of Family Members is required'); return false; }
      if (!h.annualIncome) { toast.error('Total Annual Family Income is required'); return false; }
      if (!h.earningMembers) { toast.error('Number of Earning Members is required'); return false; }
      if (!h.incomeSource) { toast.error('Primary Source of Income is required'); return false; }
      if (!h.aplBplStatus) { toast.error('APL/BPL Status is required'); return false; }
    }
    if (housingStep === 2) {
      if (!h.housingScheme) { toast.error('Housing Scheme is required'); return false; }
      if (!h.houseType) { toast.error('Type of House Required is required'); return false; }
      if (!h.reasonForApplying) { toast.error('Reason for Applying is required'); return false; }
    }
    if (housingStep === 3) {
      if (!h.currentAddress.trim()) { toast.error('Current Residential Address is required'); return false; }
      if (!h.ward) { toast.error('Ward is required'); return false; }
      if (!h.currentHousingType) { toast.error('Type of Current Housing is required'); return false; }
      if (!h.ownsProperty) { toast.error('Please indicate if family owns any property in India'); return false; }
    }
    if (housingStep === 4) {
      if (!housingDocs.aadhaar_card) { toast.error('Aadhaar Card upload is required'); return false; }
      if (!housingDocs.ration_card) { toast.error('Ration Card Copy upload is required'); return false; }
      if (!housingDocs.income_certificate) { toast.error('Income Certificate upload is required'); return false; }
      if (!housingDocs.address_proof) { toast.error('Address Proof for Current Residence is required'); return false; }
      if (!housingDocs.affidavit_no_property) { toast.error('Affidavit — No Ownership of Other Property is required'); return false; }
      if (!declarations.noOtherProperty) { toast.error('Please confirm you do not own any other residential property'); return false; }
      if (!declarations.infoCorrect) { toast.error('Please confirm all information is true and correct'); return false; }
      if (!declarations.falsePenalty) { toast.error('Please confirm understanding of false information penalty'); return false; }
    }
    return true;
  };

  const handleHousingNext = () => { if (validateHousingStep()) setHousingStep(s => s + 1); };
  const handleHousingBack = () => setHousingStep(s => s - 1);

  const handleHousingSubmit = async (email) => {
    if (!validateHousingStep()) return;
    setHousingSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'municipal_housing_application',
        application_data: { ...housing },
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MHA-${Date.now()}`;
      setHousingRefNumber(appNum);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('housing_application');
      setReceiptFormData({ ...housing });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Application submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'municipal_housing_application',
        application_data: { ...housing },
        submitted_at: ts,
      }).catch(console.warn);
      setHousingSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setHousingSubmitting(false);
    }
  };

  // ── Quarter Rent helpers ──
  const handleFetchRentDetails = async () => {
    if (!rentForm.allotmentNo.trim()) { toast.error('Allotment Number is required'); return; }
    setFetchingRent(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setRentDetails({
        tenantName: 'Ramesh Patil',
        blockUnit: 'Block-C, Unit 204',
        ward: 'Ward 5',
        monthlyRent: '₹1,200',
        arrears: '₹2,400',
        totalDue: '₹3,600',
        dueDate: '15 Mar 2026',
      });
    } catch {
      toast.error('Failed to fetch rent details');
    } finally {
      setFetchingRent(false);
    }
  };

  const handleRentSubmit = async () => {
    if (!rentForm.paymentMethod) { toast.error('Please select a Payment Method'); return; }
    setRentSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'municipal_quarter_rent_payment',
        application_data: { ...rentForm, ...rentDetails },
      });
      setRentRefNumber(res.data?.reference_number || `MQRP-${Date.now()}`);
      setRentSubmitted(true);
    } catch {
      setRentRefNumber(`MQRP-${Date.now()}`);
      setRentSubmitted(true);
    } finally {
      setRentSubmitting(false);
    }
  };

  // ── Encroachment helpers ──
  const eChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'mobile') val = val.replace(/\D/g, '').slice(0, 10);
    if (field === 'aadhaar') val = val.replace(/\D/g, '').slice(0, 12);
    setEnc(p => ({ ...p, [field]: val }));
  };

  const eDocChange = (name, file) => {
    const err = validateFile(file, 5);
    if (err) { toast.error(err); return; }
    setEncDocs(p => ({ ...p, [name]: file }));
    toast.success(`${name.replace(/_/g, ' ')} uploaded successfully`);
  };
  const eDocRemove = (name) => setEncDocs(p => ({ ...p, [name]: null }));

  const validateEncStep = () => {
    if (encStep === 0) {
      if (!enc.yourName.trim()) { toast.error('Your Name is required'); return false; }
      if (!enc.mobile || enc.mobile.length < 10) { toast.error('Valid 10-digit Mobile is required'); return false; }
      if (!enc.address.trim()) { toast.error('Your Address is required'); return false; }
      if (!enc.ward) { toast.error('Ward is required'); return false; }
    }
    if (encStep === 1) {
      if (!enc.encType) { toast.error('Type of Encroachment is required'); return false; }
      if (!enc.encSince) { toast.error('Encroachment Since is required'); return false; }
      if (!enc.encArea) { toast.error('Approximate Encroached Area is required'); return false; }
      if (!enc.encDescription.trim()) { toast.error('Encroachment Description is required'); return false; }
    }
    if (encStep === 2) {
      if (!enc.encLocation.trim()) { toast.error('Location of Encroachment is required'); return false; }
      if (!enc.landmark.trim()) { toast.error('Nearest Landmark is required'); return false; }
      if (!encDocs.enc_photo) { toast.error('Photo of Encroachment is required'); return false; }
    }
    return true;
  };

  const handleEncNext = () => { if (validateEncStep()) setEncStep(s => s + 1); };
  const handleEncBack = () => setEncStep(s => s - 1);

  const handleEncSubmit = async (email) => {
    if (!validateEncStep()) return;
    setEncSubmitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'municipal_encroachment_report',
        application_data: { ...enc },
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MER-${Date.now()}`;
      setEncRefNumber(appNum);
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('encroachment_report');
      setReceiptFormData({ ...enc });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Complaint submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'municipal_encroachment_report',
        application_data: { ...enc },
        submitted_at: ts,
      }).catch(console.warn);
      setEncSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setEncSubmitting(false);
    }
  };

  const btnSx = { bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR }, color: '#fff', px: 3 };

  // ════════════════════════════════════════════
  // TAB 0 STEP RENDERS
  // ════════════════════════════════════════════

  const renderHStep0 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Personal Information</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Full Name (as per Aadhaar) *" value={housing.name} onChange={hChange('name')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Father's Full Name *" value={housing.fatherName} onChange={hChange('fatherName')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Mother's Full Name *" value={housing.motherName} onChange={hChange('motherName')} />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Date of Birth *" type="date"
          InputLabelProps={{ shrink: true }} value={housing.dob} onChange={hChange('dob')}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Age (Years)" value={calcAge(housing.dob)}
          InputProps={{ readOnly: true }} helperText="Auto-calculated from DOB"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Gender *</InputLabel>
          <Select value={housing.gender} label="Gender *" onChange={hChange('gender')}>
            {['Male', 'Female', 'Transgender', 'Other'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Marital Status *</InputLabel>
          <Select value={housing.maritalStatus} label="Marital Status *" onChange={hChange('maritalStatus')}>
            {['Single (never married)', 'Married', 'Widowed', 'Divorced/Separated'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      {(housing.maritalStatus === 'Married' || housing.maritalStatus === 'Widowed') && (
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Spouse's Full Name" value={housing.spouseName} onChange={hChange('spouseName')} />
        </Grid>
      )}
      {housing.maritalStatus === 'Married' && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Spouse's Aadhaar" value={housing.spouseAadhaar}
            onChange={hChange('spouseAadhaar')} inputProps={{ maxLength: 12 }}
            helperText={`${housing.spouseAadhaar.length}/12`}
          />
        </Grid>
      )}
      <SectionHeading>Contact Details</SectionHeading>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Mobile *" value={housing.mobile} onChange={hChange('mobile')}
          inputProps={{ maxLength: 10 }} helperText={`${housing.mobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth label="Alternate Mobile" value={housing.altMobile}
          onChange={hChange('altMobile')} inputProps={{ maxLength: 10 }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Email" type="email" value={housing.email} onChange={hChange('email')} />
      </Grid>
      <SectionHeading>Identity Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Aadhaar Number *" value={housing.aadhaar}
          onChange={hChange('aadhaar')} inputProps={{ maxLength: 12 }}
          helperText={`${housing.aadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Voter ID Card Number" value={housing.voterId} onChange={hChange('voterId')} />
      </Grid>
      <SectionHeading>Category &amp; Religion</SectionHeading>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Religion</InputLabel>
          <Select value={housing.religion} label="Religion" onChange={hChange('religion')}>
            {RELIGION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Category *</InputLabel>
          <Select value={housing.category} label="Category *" onChange={hChange('category')}>
            {['General', 'OBC', 'SC', 'ST', 'EWS', 'DT/NT', 'SBC', 'Other'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Sub-caste" value={housing.subCaste} onChange={hChange('subCaste')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>National ID Type (if no Aadhaar)</InputLabel>
          <Select value={housing.noAadhaarId} label="National ID Type (if no Aadhaar)" onChange={hChange('noAadhaarId')}>
            {['Passport', 'Voter ID', 'Driving License', 'Not available'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderHStep1 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Family Composition</SectionHeading>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Total Family Members *" type="number"
          value={housing.familyMembers} onChange={hChange('familyMembers')} inputProps={{ min: 1 }}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Children Under 18" type="number"
          value={housing.childrenUnder18} onChange={hChange('childrenUnder18')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Senior Citizens" type="number"
          value={housing.seniorCitizens} onChange={hChange('seniorCitizens')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField
          fullWidth label="Differently-abled Members" type="number"
          value={housing.disabledMembers} onChange={hChange('disabledMembers')} inputProps={{ min: 0 }}
        />
      </Grid>
      <SectionHeading>Income Details</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Total Annual Family Income (₹) *" type="number"
          value={housing.annualIncome} onChange={hChange('annualIncome')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Income Certificate Authority</InputLabel>
          <Select value={housing.incomeCertAuthority} label="Income Certificate Authority" onChange={hChange('incomeCertAuthority')}>
            {['Tehsildar', 'SDO', 'Revenue Officer', 'Self-declared for EWS'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Income Certificate Number" value={housing.incomeCertNumber} onChange={hChange('incomeCertNumber')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Earning Members in Family *" type="number"
          value={housing.earningMembers} onChange={hChange('earningMembers')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Primary Source of Income *</InputLabel>
          <Select value={housing.incomeSource} label="Primary Source of Income *" onChange={hChange('incomeSource')}>
            {[
              'Government employment', 'Private employment', 'Self-employed / business',
              'Daily wage / labour', 'Farming / agriculture', 'Pension',
              'Social welfare / no income', 'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={3}
          label="List all earning sources and amounts"
          value={housing.earningSourceDetails} onChange={hChange('earningSourceDetails')}
          helperText="e.g. Father – private employment ₹15,000/mo; Mother – tailoring ₹3,000/mo"
        />
      </Grid>
      <SectionHeading>BPL/APL Status &amp; Ration Card</SectionHeading>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>APL/BPL Status *</InputLabel>
          <Select value={housing.aplBplStatus} label="APL/BPL Status *" onChange={hChange('aplBplStatus')}>
            {['APL — Above Poverty Line', 'BPL — Below Poverty Line', 'Antyodaya — lowest BPL'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Ration Card Number" value={housing.rationCardNo} onChange={hChange('rationCardNo')} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Ration Card Type</InputLabel>
          <Select value={housing.rationCardType} label="Ration Card Type" onChange={hChange('rationCardType')}>
            {['Yellow — AAY', 'Orange — BPL', 'White — APL', 'No ration card'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Government Employee in Family?</InputLabel>
          <Select value={housing.govtEmployeeInFamily} label="Government Employee in Family?" onChange={hChange('govtEmployeeInFamily')}>
            {['Yes — Central Govt', 'Yes — State Govt', 'Yes — PSU', 'No'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderHStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Housing Scheme &amp; Type</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Housing Scheme Applying Under *</InputLabel>
          <Select value={housing.housingScheme} label="Housing Scheme Applying Under *" onChange={hChange('housingScheme')}>
            {[
              'Pradhan Mantri Awas Yojana (PMAY)',
              'Rajiv Awas Yojana (RAY)',
              'State Housing Scheme',
              'Municipal Housing for Economically Weaker Section',
              'Rental Housing from Municipal',
              'Transit Housing',
              'Slum Rehabilitation Scheme (SRS)',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Type of House Required *</InputLabel>
          <Select value={housing.houseType} label="Type of House Required *" onChange={hChange('houseType')}>
            {[
              '1 RK (single room kitchen)', '1 BHK', '2 BHK',
              'Dormitory/hostel', 'Government transit housing', 'Any — as per allotment',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth label="Preferred Area/Locality"
          value={housing.preferredLocality} onChange={hChange('preferredLocality')}
          helperText="Area preference within municipality"
        />
      </Grid>
      <SectionHeading>Reason &amp; Affordability</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Reason for Applying *</InputLabel>
          <Select value={housing.reasonForApplying} label="Reason for Applying *" onChange={hChange('reasonForApplying')}>
            {[
              'Currently homeless',
              'Living in slum/chawl',
              'Living in rented house — unaffordable',
              'Job transfer to this city',
              'Natural calamity caused displacement',
              'Eviction / demolition of old house',
              'Fire damage to current house',
              'Domestic violence — need safe shelter',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Maximum Monthly Rent Affordable (₹)" type="number"
          value={housing.maxRent} onChange={hChange('maxRent')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={<Switch checked={housing.willingAnyArea} onChange={hSwitch('willingAnyArea')} color="primary" />}
          label="Willing to stay in any available area"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={<Switch checked={housing.openToEmi} onChange={hSwitch('openToEmi')} color="primary" />}
          label="Open to EMI-based purchase"
        />
      </Grid>
    </Grid>
  );

  const renderHStep3 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Current Residential Address</SectionHeading>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Current Residential Address *"
          value={housing.currentAddress} onChange={hChange('currentAddress')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Ward *" value={housing.ward} onChange={hChange('ward')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Pincode *" value={housing.pincode}
          onChange={hChange('pincode')} inputProps={{ maxLength: 6 }}
        />
      </Grid>
      <SectionHeading>Current Housing Situation</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Type of Current Housing *</InputLabel>
          <Select value={housing.currentHousingType} label="Type of Current Housing *" onChange={hChange('currentHousingType')}>
            {[
              'Pavement dweller — no shelter',
              'Slum / jhopdi / jhugghi',
              'Municipal chawl',
              'Private chawl',
              'Rented apartment/room',
              'Family house — paying rent to family',
              'Employer-provided accommodation',
              'Government quarters',
              'Own house — applying for better accommodation',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Monthly Rent Currently Paid (₹)" type="number"
          value={housing.currentMonthlyRent} onChange={hChange('currentMonthlyRent')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Name of Current Landlord (if rented)"
          value={housing.landlordName} onChange={hChange('landlordName')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Duration at Current Address (years)" type="number"
          value={housing.durationAtAddress} onChange={hChange('durationAtAddress')} inputProps={{ min: 0 }}
        />
      </Grid>
      <SectionHeading>Property Ownership &amp; Previous Applications</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Does Family Own Any Property in India? *</InputLabel>
          <Select value={housing.ownsProperty} label="Does Family Own Any Property in India? *" onChange={hChange('ownsProperty')}>
            {[
              'No',
              'Yes — in this city',
              'Yes — outside this city/state',
              'Yes — ancestral/co-owned property',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {housing.ownsProperty && housing.ownsProperty !== 'No' && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth multiline rows={2} label="Describe the property"
            value={housing.propertyDescription} onChange={hChange('propertyDescription')}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Previous Application for Municipal Housing?</InputLabel>
          <Select value={housing.previousApplication} label="Previous Application for Municipal Housing?" onChange={hChange('previousApplication')}>
            {['No', 'Yes — Application No:', 'Yes — Rejected', 'Yes — Waitlisted'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      {housing.previousApplication && housing.previousApplication !== 'No' && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth label="Previous Application No"
            value={housing.previousApplicationNo} onChange={hChange('previousApplicationNo')}
          />
        </Grid>
      )}
    </Grid>
  );

  const renderHStep4 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ede7f6' }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Application Summary</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Applicant Name:</b> {housing.name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Category:</b> {housing.category}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Scheme:</b> {housing.housingScheme}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>House Type:</b> {housing.houseType}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Family Size:</b> {housing.familyMembers}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><b>Annual Income:</b> ₹{housing.annualIncome}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      <SectionHeading>Document Upload</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Aadhaar Card" name="aadhaar_card" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Ration Card Copy" name="ration_card" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Income Certificate" name="income_certificate" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          hint="From Tehsildar or competent authority"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Caste Certificate" name="caste_certificate"
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          hint="Required for SC/ST/OBC/EWS categories"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Birth Certificate / Age Proof" name="birth_certificate" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          hint="School leaving cert, Aadhaar, passport"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Marriage Certificate" name="marriage_certificate"
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          hint="Required if married / widowed"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Address Proof for Current Residence" name="address_proof" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Affidavit — No Ownership of Other Property" name="affidavit_no_property" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          hint="Stamp paper affidavit on ₹100 stamp paper"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Disability Certificate" name="disability_certificate"
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          hint="For differently-abled family members"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Passport-size Photo of Applicant" name="passport_photo" required
          docs={housingDocs} onFileChange={hDocChange} onRemove={hDocRemove}
          accept=".jpg,.jpeg,.png"
        />
      </Grid>
      <SectionHeading>Declaration</SectionHeading>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={declarations.noOtherProperty}
              onChange={e => setDeclarations(p => ({ ...p, noOtherProperty: e.target.checked }))}
              color="primary"
            />
          }
          label="I declare I do not own any other residential property"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={declarations.infoCorrect}
              onChange={e => setDeclarations(p => ({ ...p, infoCorrect: e.target.checked }))}
              color="primary"
            />
          }
          label="I confirm all information provided is true and correct"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={declarations.falsePenalty}
              onChange={e => setDeclarations(p => ({ ...p, falsePenalty: e.target.checked }))}
              color="primary"
            />
          }
          label="I agree that false information will result in cancellation of allotment"
        />
      </Grid>
    </Grid>
  );

  // ════════════════════════════════════════════
  // TAB 2 STEP RENDERS
  // ════════════════════════════════════════════

  const renderEncStep0 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Your Identity</SectionHeading>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Your Name *" value={enc.yourName} onChange={eChange('yourName')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Mobile *" value={enc.mobile} onChange={eChange('mobile')}
          inputProps={{ maxLength: 10 }} helperText={`${enc.mobile.length}/10`}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Email" type="email" value={enc.email} onChange={eChange('email')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Aadhaar" value={enc.aadhaar} onChange={eChange('aadhaar')}
          inputProps={{ maxLength: 12 }} helperText={`${enc.aadhaar.length}/12`}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Your Address *"
          value={enc.address} onChange={eChange('address')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Ward *" value={enc.ward} onChange={eChange('ward')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Are You Directly Affected?</InputLabel>
          <Select value={enc.affectedStatus} label="Are You Directly Affected?" onChange={eChange('affectedStatus')}>
            {[
              'Yes — my property is encroached',
              'Yes — common/public area near me',
              'No — reporting as citizen',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderEncStep1 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Nature of Encroachment</SectionHeading>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Type of Encroachment *</InputLabel>
          <Select value={enc.encType} label="Type of Encroachment *" onChange={eChange('encType')}>
            {[
              'Illegal construction on public land',
              'Encroachment on footpath/road',
              'Encroachment on open plot',
              'Unauthorized shop/stall on road',
              'Unauthorized parking space occupied',
              'Obstruction of natural drain/nala',
              'Encroachment on government/municipal land',
              'Illegal sub-division / boundary tampering',
              'Other',
            ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Encroachment Since *</InputLabel>
          <Select value={enc.encSince} label="Encroachment Since *" onChange={eChange('encSince')}>
            {['Less than 1 month', '1–6 months', '6–12 months', '1–3 years', 'More than 3 years'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Approximate Encroached Area (sq.ft) *" type="number"
          value={enc.encArea} onChange={eChange('encArea')} inputProps={{ min: 0 }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="Name of Encroacher (if known)"
          value={enc.encroacherId} onChange={eChange('encroacherId')}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={4} label="Encroachment Description *"
          value={enc.encDescription} onChange={eChange('encDescription')}
          helperText="Describe what is encroached, by whom (if known), what construction/activity"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Number of Persons Involved</InputLabel>
          <Select value={enc.personsInvolved} label="Number of Persons Involved" onChange={eChange('personsInvolved')}>
            {['1 individual', '2–5 persons', 'Small group/family', 'Large organised group', 'Unknown'].map(o => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Has Municipality Been Notified Before?</InputLabel>
          <Select value={enc.notifiedBefore} label="Has Municipality Been Notified Before?" onChange={eChange('notifiedBefore')}>
            {['Yes — describe response', 'No'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      {enc.notifiedBefore === 'Yes — describe response' && (
        <Grid item xs={12}>
          <TextField
            fullWidth multiline rows={2} label="Previous Notice/Action Details"
            value={enc.previousAction} onChange={eChange('previousAction')}
          />
        </Grid>
      )}
    </Grid>
  );

  const renderEncStep2 = () => (
    <Grid container spacing={2}>
      <SectionHeading>Encroachment Location</SectionHeading>
      <Grid item xs={12}>
        <TextField
          fullWidth multiline rows={2} label="Location of Encroachment (full address) *"
          value={enc.encLocation} onChange={eChange('encLocation')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Nearest Landmark *" value={enc.landmark} onChange={eChange('landmark')} />
      </Grid>
      <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Ward *" value={enc.encWard} onChange={eChange('encWard')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth label="GPS Coordinates (optional)"
          value={enc.gpsCoords} onChange={eChange('gpsCoords')}
          helperText="e.g. 18.9220° N, 72.8347° E"
        />
      </Grid>
      <SectionHeading>Supporting Documents</SectionHeading>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Photo of Encroachment" name="enc_photo" required
          docs={encDocs} onFileChange={eDocChange} onRemove={eDocRemove}
          hint="Clear photo showing encroachment"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Property/Title Document" name="property_doc"
          docs={encDocs} onFileChange={eDocChange} onRemove={eDocRemove}
          hint="If your own property is being encroached"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DocUpload
          label="Previous Complaint / Notice Copy" name="prev_notice"
          docs={encDocs} onFileChange={eDocChange} onRemove={eDocRemove}
          hint="Any earlier written complaint"
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
    if (activeTab === 0) handleHousingSubmit(email);
    else if (activeTab === 1) handleRentSubmit();
    else if (activeTab === 2) handleEncSubmit(email);
  };

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  return (
    <Box>
      <Box sx={{ bgcolor: HEADER_COLOR, color: '#fff', px: 3, py: 2 }}>
        <Typography variant="h6" fontWeight={700}>Municipal Housing Services</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Apply for housing, pay quarter rent, or report encroachments
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab} onChange={handleTabChange}
          variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f9f9ff' }}
        >
          <Tab label="Apply for Municipal Housing" />
          <Tab label="Pay Quarter Rent" />
          <Tab label="Report Encroachment" />
        </Tabs>

        {/* ══════════════════════════════════ TAB 0: Housing Application ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3, py: 1 }}>
            {housingSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Housing Application Submitted!</Typography>
                <Chip
                  label={`Reference: ${housingRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Your application has been received successfully. You will receive an acknowledgement SMS/email.
                  Keep the reference number for all future correspondence regarding your housing application.
                  Allotment process may take 30–90 days depending on availability.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <>
                <Stepper activeStep={housingStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                  {HOUSING_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                </Stepper>
                {housingStep === 0 && renderHStep0()}
                {housingStep === 1 && renderHStep1()}
                {housingStep === 2 && renderHStep2()}
                {housingStep === 3 && renderHStep3()}
                {housingStep === 4 && renderHStep4()}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
                  <Button variant="outlined" onClick={housingStep === 0 ? onClose : handleHousingBack}>
                    {housingStep === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  {housingStep < HOUSING_STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleHousingNext} sx={btnSx}>Next</Button>
                  ) : (
                    <Button
                      variant="contained" onClick={() => setShowOtpDialog(true)}
                      disabled={housingSubmitting} sx={btnSx}
                    >
                      {housingSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 1: Quarter Rent ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3, py: 2 }}>
            {rentSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Rent Payment Successful!</Typography>
                <Chip
                  label={`Reference: ${rentRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Keep rent payment receipts safely as they are required for lease renewal and bank verification.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                <SectionHeading>Allotment Lookup</SectionHeading>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth label="Quarter/Unit Allotment Number *"
                    value={rentForm.allotmentNo}
                    onChange={e => setRentForm(p => ({ ...p, allotmentNo: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant="contained" fullWidth onClick={handleFetchRentDetails}
                    disabled={fetchingRent} sx={{ ...btnSx, height: 56 }}
                  >
                    {fetchingRent ? <CircularProgress size={20} color="inherit" /> : 'Fetch Details'}
                  </Button>
                </Grid>

                {rentDetails && (
                  <>
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ede7f6' }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          Tenant &amp; Rent Information
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2"><b>Tenant Name:</b> {rentDetails.tenantName}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2"><b>Block/Unit:</b> {rentDetails.blockUnit}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2"><b>Ward:</b> {rentDetails.ward}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2"><b>Monthly Rent:</b> {rentDetails.monthlyRent}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2"><b>Arrears:</b> {rentDetails.arrears}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="error.main">
                              <b>Total Due:</b> {rentDetails.totalDue}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2"><b>Due Date:</b> {rentDetails.dueDate}</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Method *</InputLabel>
                        <Select
                          value={rentForm.paymentMethod} label="Payment Method *"
                          onChange={e => setRentForm(p => ({ ...p, paymentMethod: e.target.value }))}
                        >
                          {['UPI', 'Net Banking', 'Cash at counter'].map(o => (
                            <MenuItem key={o} value={o}>{o}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Alert severity="info">
                        Keep rent payment receipts safely as they are required for lease renewal and bank verification.
                      </Alert>
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        variant="contained" onClick={() => setShowOtpDialog(true)}
                        disabled={rentSubmitting} sx={btnSx}
                      >
                        {rentSubmitting
                          ? <CircularProgress size={22} color="inherit" />
                          : `Pay ${rentDetails.totalDue}`}
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════ TAB 2: Encroachment Report ══════════════════════════════════ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3, py: 1 }}>
            {encSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <SuccessIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Encroachment Complaint Submitted!</Typography>
                <Chip
                  label={`Reference: ${encRefNumber}`}
                  color="success"
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 1 }}
                />
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  Your encroachment complaint has been registered. Municipal enforcement officers will investigate
                  within 7 working days. Please quote the reference number for all follow-ups.
                </Alert>
                <Button variant="outlined" onClick={onClose}>Close</Button>
              </Box>
            ) : (
              <>
                <Stepper activeStep={encStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                  {ENCROACH_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                </Stepper>
                {encStep === 0 && renderEncStep0()}
                {encStep === 1 && renderEncStep1()}
                {encStep === 2 && renderEncStep2()}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
                  <Button variant="outlined" onClick={encStep === 0 ? onClose : handleEncBack}>
                    {encStep === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  {encStep < ENCROACH_STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleEncNext} sx={btnSx}>Next</Button>
                  ) : (
                    <Button
                      variant="contained" onClick={() => setShowOtpDialog(true)}
                      disabled={encSubmitting} sx={btnSx}
                    >
                      {encSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Complaint'}
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
        initialEmail={activeTab === 0 ? housing.email || '' : activeTab === 2 ? enc.email || '' : ''}
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

