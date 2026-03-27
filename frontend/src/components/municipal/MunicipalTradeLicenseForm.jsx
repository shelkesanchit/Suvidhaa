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

const HEADER_COLOR = '#e65100';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const TAB_STEPS = [
  ['Business Info', 'Owner / Proprietor', 'Premises Details', 'Compliance', 'Documents & Review'],
];

const MunicipalTradeLicenseForm = ({ onClose }) => {
  const [tab, setTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refNumber, setRefNumber] = useState('');

  // Tab 1 — Renew
  const [renewData, setRenewData] = useState(null);
  const [renewPaid, setRenewPaid] = useState(false);
  const [renewRef, setRenewRef] = useState('');

  // Tab 2 — Pay Fee
  const [payFeeData, setPayFeeData] = useState(null);
  const [payFeePaid, setPayFeePaid] = useState(false);
  const [payFeeRef, setPayFeeRef] = useState('');

  // Tab 3 — Download
  const [certData, setCertData] = useState(null);

  const [formData, setFormData] = useState({
    // Tab 0 — New Trade License Step 0: Business Info
    tl_business_name: '', tl_brand_name: '', tl_business_type: '', tl_sub_category: '',
    tl_start_date: '', tl_currently_operating: 'Yes',
    tl_employees_full: '', tl_employees_part: '',
    tl_annual_turnover: '', tl_gst_registered: 'No', tl_gst_no: '',
    tl_msme_registered: 'No', tl_udyam_no: '', tl_fssai_no: '',
    tl_hours_from: '', tl_hours_to: '',
    tl_business_address: '', tl_ward: '', tl_pincode: '',
    // Step 1: Owner / Proprietor
    tl_legal_entity: '', tl_proprietor_name: '', tl_father_name: '',
    tl_dob: '', tl_gender: '', tl_mobile: '', tl_alt_mobile: '', tl_email: '',
    tl_aadhaar: '', tl_pan: '', tl_voter_id: '',
    tl_res_address: '', tl_res_ward: '',
    tl_partner2_name: '', tl_partner2_mobile: '', tl_partner2_aadhaar: '',
    tl_company_cin: '', tl_company_director: '',
    // Step 2: Premises
    tl_premises_ownership: '', tl_landlord_name: '', tl_monthly_rent: '',
    tl_lease_date: '', tl_lease_expiry: '',
    tl_premises_area: '', tl_storage_area: '', tl_customer_area: '',
    tl_floors_used: '', tl_basement_used: 'No',
    tl_building_approved: 'Yes', tl_oc_available: 'No',
    tl_shared_premises: 'No', tl_parking: 'No',
    // Step 3: Compliance
    tl_shop_est_reg: 'No', tl_shop_reg_no: '',
    tl_prof_tax: 'No', tl_pt_no: '',
    tl_pf_reg: 'No', tl_pf_no: '',
    tl_esic_reg: 'No', tl_esic_no: '',
    tl_labour_license: 'No',
    tl_fire_noc: 'No', tl_fire_noc_no: '',
    tl_health_license: 'NA', tl_env_clearance: 'NA',
    tl_explosive_storage: 'No', tl_pollution_cert: 'NA',
    tl_compliance_declaration: false,
    // Tab 1 — Renew
    renew_license_no: '', renew_payment_method: 'upi',
    // Tab 2 — Pay Fee
    pay_license_no: '', pay_payment_method: 'upi',
    // Tab 3 — Download
    dl_license_no: '',
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
        if (!d.tl_business_name) return 'Business / Trade Name is required';
        if (!d.tl_business_type) return 'Type of Business is required';
        if (!d.tl_start_date) return 'Business Start Date is required';
        if (!d.tl_employees_full) return 'Number of Full-time Employees is required';
        if (!d.tl_business_address) return 'Business Address is required';
        if (!d.tl_ward) return 'Ward is required';
        if (!d.tl_pincode) return 'Pincode is required';
        if (d.tl_gst_registered === 'Yes' && !d.tl_gst_no) return 'GST Number is required if GST Registered';
        if (d.tl_msme_registered === 'Yes' && !d.tl_udyam_no) return 'Udyam Registration No is required if MSME Registered';
      }
      if (activeStep === 1) {
        if (!d.tl_legal_entity) return 'Legal Entity Type is required';
        if (!d.tl_proprietor_name) return 'Full Name of Proprietor / Managing Partner / Director is required';
        if (!d.tl_father_name) return 'Father/Husband Name is required';
        if (!d.tl_dob) return 'Date of Birth is required';
        if (!d.tl_mobile || d.tl_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.tl_email) return 'Email is required';
        if (!d.tl_aadhaar || d.tl_aadhaar.length !== 12) return 'Valid 12-digit Aadhaar required';
        if (!d.tl_pan) return 'PAN Card is required';
        if (!d.tl_res_address) return 'Permanent Residential Address is required';
      }
      if (activeStep === 2) {
        if (!d.tl_premises_ownership) return 'Premises Ownership is required';
        if (!d.tl_premises_area) return 'Total Premises Area is required';
        if (d.tl_premises_ownership === 'Rented/Leased' && !d.tl_landlord_name) return 'Landlord Name is required for rented/leased premises';
        if (d.tl_premises_ownership === 'Rented/Leased' && !d.tl_lease_expiry) return 'Lease Expiry Date is required';
      }
      if (activeStep === 3) {
        if (!d.tl_compliance_declaration) return 'Please confirm the compliance declaration to proceed';
      }
      if (activeStep === 4) {
        if (!docs.tl_id_proof) return 'Owner / Proprietor ID Proof (Aadhaar) is required';
        if (!docs.tl_pan_copy) return 'PAN Card Copy is required';
        if (!docs.tl_owner_photo) return 'Passport-size Photo of Owner is required';
        if (!docs.tl_premises_proof) return 'Shop/Premises Rent Agreement or Ownership Proof is required';
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

  const isLastStep = () => activeStep === TAB_STEPS[0].length - 1;

  const handleSubmit = async (email) => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
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
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'new_trade_license',
        application_data: formData,
        documents: docsArray,
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MTL${Date.now()}`;
      const ts = new Date().toISOString();
      setReceiptAppNum(appNum);
      setReceiptAppType('trade_license_new');
      setReceiptFormData({ ...formData });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Application submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'new_trade_license',
        application_data: { ...formData },
        submitted_at: ts,
      }).catch(console.warn);
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchRenewDetails = () => {
    if (!formData.renew_license_no) return toast.error('Enter existing license number');
    setRenewData({
      licenseNo: formData.renew_license_no,
      businessName: 'Sharma General Store',
      owner: 'Rakesh Sharma',
      ward: 'Ward 3',
      validTill: '31 Mar 2025',
      renewalFee: 1800,
    });
  };

  const handleRenew = async () => {
    if (!renewData) return toast.error('Fetch license details first');
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'trade_license_renewal',
        application_data: {
          license_no: renewData.licenseNo,
          business_name: renewData.businessName,
          owner_name: renewData.owner,
          ward: renewData.ward,
          valid_till: renewData.validTill,
          renewal_fee: renewData.renewalFee,
          payment_method: formData.renew_payment_method,
        },
      });
      const ref = res.data?.data?.application_number || 'RNW' + Date.now();
      setRenewRef(ref);
      setRenewPaid(true);
      toast.success('Renewal application submitted successfully!');
    } catch (err) {
      console.error('Renewal error:', err);
      toast.error('Renewal submission failed');
    }
  };

  const fetchPayFeeDetails = () => {
    if (!formData.pay_license_no) return toast.error('Enter license number');
    setPayFeeData({
      licenseNo: formData.pay_license_no,
      baseFee: 1500,
      lateFee: 300,
      total: 1800,
      isLate: true,
    });
  };

  const handlePayFee = () => {
    if (!payFeeData) return toast.error('Fetch fee details first');
    const ref = 'PAY' + Date.now();
    setPayFeeRef(ref);
    setPayFeePaid(true);
    toast.success('Payment successful!');
  };

  const fetchCertificate = () => {
    if (!formData.dl_license_no) return toast.error('Enter license number');
    setCertData({
      licenseNo: formData.dl_license_no,
      businessName: 'Sharma General Store',
      owner: 'Rakesh Sharma',
      address: 'Shop 12, Market Road, Ward 3',
      issuedDate: '01 Apr 2024',
      validUntil: '31 Mar 2025',
      category: 'Wholesale/Retail trade',
    });
  };

  if (submitted) return (
    <Box>
      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" color="success.main" gutterBottom>Application Submitted!</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>Your reference number is</Typography>
        <Chip label={refNumber} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1.1rem', py: 2, px: 3, mb: 3 }} />
        <Alert severity="info" sx={{ textAlign: 'left' }}>
          Your New Trade License application has been received. Premises inspection may be conducted within 7–10 working days. License will be issued within 15 working days after successful inspection and fee payment.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} fullWidth sx={{ bgcolor: HEADER_COLOR }}>Close</Button>
      </DialogActions>
    </Box>
  );

  // ─── Tab 0 Step 0: Business Info ───────────────────────────────────────────────
  const renderStep0 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required label="Business / Trade Name (as it will appear on license)" name="tl_business_name" value={formData.tl_business_name} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Brand / Trade Name (if different from registered name)" name="tl_brand_name" value={formData.tl_brand_name} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required select label="Type of Business" name="tl_business_type" value={formData.tl_business_type} onChange={handleChange}>
          {['Manufacturing', 'Wholesale/Retail trade', 'Service industry', 'Restaurant/Food', 'Hotel/Lodge', 'Petrol pump', 'Liquor vend — special license', 'Medical/Pharmacy', 'Education', 'Transport operator', 'Construction/Contractor', 'IT/Finance', 'Freelancer', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Sub-category" name="tl_sub_category" value={formData.tl_sub_category} onChange={handleChange} placeholder="e.g., Clothing retail, Software development" />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="Business Start Date" name="tl_start_date" value={formData.tl_start_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Business Currently Operating?" name="tl_currently_operating" value={formData.tl_currently_operating} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="Number of Employees (Full-time)" name="tl_employees_full" value={formData.tl_employees_full} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Number of Employees (Part-time)" name="tl_employees_part" value={formData.tl_employees_part} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Annual Turnover (₹)" name="tl_annual_turnover" value={formData.tl_annual_turnover} onChange={handleChange}>
          {['<10L', '10–50L', '50L–2Cr', '2–10Cr', '>10Cr'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="GST Registered?" name="tl_gst_registered" value={formData.tl_gst_registered} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_gst_registered === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="GST Number" name="tl_gst_no" value={formData.tl_gst_no} onChange={handleChange} inputProps={{ maxLength: 15, style: { textTransform: 'uppercase' } }} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="MSME Registered?" name="tl_msme_registered" value={formData.tl_msme_registered} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_msme_registered === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Udyam Registration No" name="tl_udyam_no" value={formData.tl_udyam_no} onChange={handleChange} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="FSSAI License No (if food-related)" name="tl_fssai_no" value={formData.tl_fssai_no} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField fullWidth label="Operating Hours From" name="tl_hours_from" value={formData.tl_hours_from} onChange={handleChange} type="time" InputLabelProps={{ shrink: true }} />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField fullWidth label="Operating Hours To" name="tl_hours_to" value={formData.tl_hours_to} onChange={handleChange} type="time" InputLabelProps={{ shrink: true }} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth required multiline rows={2} label="Business Address (Full)" name="tl_business_address" value={formData.tl_business_address} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required label="Ward" name="tl_ward" value={formData.tl_ward} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required label="Pincode" name="tl_pincode" value={formData.tl_pincode} onChange={handleChange} inputProps={{ maxLength: 6 }} />
      </Grid>
    </Grid>
  );

  // ─── Tab 0 Step 1: Owner / Proprietor ─────────────────────────────────────────
  const renderStep1 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required select label="Legal Entity Type" name="tl_legal_entity" value={formData.tl_legal_entity} onChange={handleChange}>
          {['Sole Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company', 'Public Limited Company', 'HUF', 'Trust/Society', 'Government/PSU', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required label="Full Name of Proprietor / Managing Partner / Director" name="tl_proprietor_name" value={formData.tl_proprietor_name} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required label="Father / Husband Name" name="tl_father_name" value={formData.tl_father_name} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField fullWidth required label="Date of Birth" name="tl_dob" value={formData.tl_dob} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField fullWidth select label="Gender" name="tl_gender" value={formData.tl_gender} onChange={handleChange}>
          {['Male', 'Female', 'Transgender', 'Prefer not to say'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="Mobile" name="tl_mobile" value={formData.tl_mobile} onChange={e => handleMobile('tl_mobile', e.target.value)} inputProps={{ maxLength: 10 }} helperText="10-digit mobile number" />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Alternate Mobile" name="tl_alt_mobile" value={formData.tl_alt_mobile} onChange={e => handleMobile('tl_alt_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="Email" name="tl_email" value={formData.tl_email} onChange={handleChange} type="email" />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="Aadhaar (12 digits)" name="tl_aadhaar" value={formData.tl_aadhaar} onChange={e => handleAadhaar('tl_aadhaar', e.target.value)} inputProps={{ maxLength: 12 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="PAN Card (Business or Individual)" name="tl_pan" value={formData.tl_pan} onChange={handleChange} inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Voter ID" name="tl_voter_id" value={formData.tl_voter_id} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={8}>
        <TextField fullWidth required multiline rows={2} label="Permanent Residential Address" name="tl_res_address" value={formData.tl_res_address} onChange={handleChange} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Ward of Residence" name="tl_res_ward" value={formData.tl_res_ward} onChange={handleChange} />
      </Grid>
      {(formData.tl_legal_entity === 'Partnership Firm') && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Partner 2 Details</Typography></Divider>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Partner 2 Name" name="tl_partner2_name" value={formData.tl_partner2_name} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Partner 2 Mobile" name="tl_partner2_mobile" value={formData.tl_partner2_mobile} onChange={e => handleMobile('tl_partner2_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Partner 2 Aadhaar" name="tl_partner2_aadhaar" value={formData.tl_partner2_aadhaar} onChange={e => handleAadhaar('tl_partner2_aadhaar', e.target.value)} inputProps={{ maxLength: 12 }} />
          </Grid>
        </>
      )}
      {(['Private Limited Company', 'Public Limited Company', 'LLP'].includes(formData.tl_legal_entity)) && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Company Details</Typography></Divider>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Company Registration No (CIN)" name="tl_company_cin" value={formData.tl_company_cin} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Registered Director Name" name="tl_company_director" value={formData.tl_company_director} onChange={handleChange} />
          </Grid>
        </>
      )}
    </Grid>
  );

  // ─── Tab 0 Step 2: Premises Details ───────────────────────────────────────────
  const renderStep2 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField fullWidth required select label="Premises Ownership" name="tl_premises_ownership" value={formData.tl_premises_ownership} onChange={handleChange}>
          {['Owned by appl.', 'Rented/Leased', 'Government allotted', 'Licensee', 'Company-owned'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_premises_ownership === 'Rented/Leased' && (
        <>
          <Grid item xs={12} md={6}>
            <TextField fullWidth required label="Landlord Name" name="tl_landlord_name" value={formData.tl_landlord_name} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Monthly Rent (₹)" name="tl_monthly_rent" value={formData.tl_monthly_rent} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Lease Agreement Date" name="tl_lease_date" value={formData.tl_lease_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth required label="Lease Expiry Date" name="tl_lease_expiry" value={formData.tl_lease_expiry} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
        </>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth required label="Total Premises Area (sq.ft)" name="tl_premises_area" value={formData.tl_premises_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Storage Area (sq.ft)" name="tl_storage_area" value={formData.tl_storage_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Customer / Sales Area (sq.ft)" name="tl_customer_area" value={formData.tl_customer_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Number of Floors Used for Business" name="tl_floors_used" value={formData.tl_floors_used} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Basement Used for Business?" name="tl_basement_used" value={formData.tl_basement_used} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Is Building Construction Legally Approved?" name="tl_building_approved" value={formData.tl_building_approved} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Building Completion / OC Available?" name="tl_oc_available" value={formData.tl_oc_available} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Shared Premises with Another Business?" name="tl_shared_premises" value={formData.tl_shared_premises} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Parking Available at Premises?" name="tl_parking" value={formData.tl_parking} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
    </Grid>
  );

  // ─── Tab 0 Step 3: Compliance ──────────────────────────────────────────────────
  const renderStep3 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Shop & Establishment Act Registration?" name="tl_shop_est_reg" value={formData.tl_shop_est_reg} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_shop_est_reg === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Shop & Establishment Reg No" name="tl_shop_reg_no" value={formData.tl_shop_reg_no} onChange={handleChange} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Professional Tax Enrolled?" name="tl_prof_tax" value={formData.tl_prof_tax} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_prof_tax === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="PT Enrolment No" name="tl_pt_no" value={formData.tl_pt_no} onChange={handleChange} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="PF Registration Required? (>20 employees)" name="tl_pf_reg" value={formData.tl_pf_reg} onChange={handleChange}>
          {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_pf_reg === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="PF Registration No" name="tl_pf_no" value={formData.tl_pf_no} onChange={handleChange} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="ESIC Registration? (>10 employees)" name="tl_esic_reg" value={formData.tl_esic_reg} onChange={handleChange}>
          {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_esic_reg === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="ESIC Registration No" name="tl_esic_no" value={formData.tl_esic_no} onChange={handleChange} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Labour License Required? (Migrant/Contract Workers)" name="tl_labour_license" value={formData.tl_labour_license} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Fire Safety NOC Required?" name="tl_fire_noc" value={formData.tl_fire_noc} onChange={handleChange}>
          {['Yes', 'No', 'Applied'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_fire_noc === 'Yes' && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Fire Safety NOC No" name="tl_fire_noc_no" value={formData.tl_fire_noc_no} onChange={handleChange} />
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Health / Hygiene License (Food / Health Establishments)" name="tl_health_license" value={formData.tl_health_license} onChange={handleChange}>
          {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Environmental Clearance Needed?" name="tl_env_clearance" value={formData.tl_env_clearance} onChange={handleChange}>
          {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Explosive / Petroleum Storage?" name="tl_explosive_storage" value={formData.tl_explosive_storage} onChange={handleChange}>
          {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      {formData.tl_explosive_storage === 'Yes' && (
        <Grid item xs={12}>
          <Alert severity="warning">Explosive/Petroleum storage requires a separate license from the Petroleum & Explosives Safety Organisation (PESO). Please apply separately.</Alert>
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField fullWidth select label="Pollution Certificate" name="tl_pollution_cert" value={formData.tl_pollution_cert} onChange={handleChange}>
          {['Yes', 'No', 'NA'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: formData.tl_compliance_declaration ? '#e8f5e9' : '#fafafa', borderColor: formData.tl_compliance_declaration ? 'success.main' : 'grey.300', mt: 1 }}>
          <FormControlLabel
            control={<Switch checked={formData.tl_compliance_declaration} onChange={() => handleSwitch('tl_compliance_declaration')} color="success" />}
            label={<Typography variant="body2">I confirm that the business complies with all applicable laws and regulations, and that all information provided in this application is accurate and complete to the best of my knowledge.</Typography>}
          />
        </Paper>
      </Grid>
    </Grid>
  );

  // ─── Tab 0 Step 4: Documents & Review ─────────────────────────────────────────
  const renderStep4 = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Application Summary</Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Business Name</Typography>
              <Typography variant="body2" fontWeight={600}>{formData.tl_business_name || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Type of Business</Typography>
              <Typography variant="body2" fontWeight={600}>{formData.tl_business_type || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Owner / Proprietor</Typography>
              <Typography variant="body2" fontWeight={600}>{formData.tl_proprietor_name || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Business Address</Typography>
              <Typography variant="body2" fontWeight={600}>{formData.tl_business_address ? formData.tl_business_address.slice(0, 60) + (formData.tl_business_address.length > 60 ? '...' : '') : '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">GST No</Typography>
              <Typography variant="body2" fontWeight={600}>{formData.tl_gst_no || 'Not registered'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">PAN Card</Typography>
              <Typography variant="body2" fontWeight={600}>{formData.tl_pan || '—'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Upload Required Documents (Max 5 MB each)</Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="Owner / Proprietor ID Proof (Aadhaar)" name="tl_id_proof" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="PAN Card Copy" name="tl_pan_copy" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="Passport-size Photo of Owner" name="tl_owner_photo" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} accept=".jpg,.jpeg,.png" hint="Recent colour photograph, white background" />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="Shop / Premises Rent Agreement or Ownership Proof" name="tl_premises_proof" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="Partnership Deed" name="tl_partnership_deed" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for partnership firms" />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="Certificate of Incorporation / CIN" name="tl_cin_cert" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for companies" />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="GST Registration Certificate" name="tl_gst_cert" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="If GST registered" />
      </Grid>
      <Grid item xs={12} md={6}>
        <DocUpload label="NOC from Property Owner" name="tl_property_noc" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="If premises is rented" />
      </Grid>
    </Grid>
  );

  // ─── Tab 1: Renew Trade License ────────────────────────────────────────────────
  const renderRenewTab = () => (
    <Box>
      <Alert severity="warning" sx={{ mb: 2 }}>
        License renewal must be done before expiry to avoid late fee penalty of 2% per month.
      </Alert>
      {renewPaid ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="success.main" gutterBottom>Renewal Successful!</Typography>
          <Chip label={renewRef} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1rem', py: 1.5, px: 2, mb: 2 }} />
          <Alert severity="success">Trade License renewed successfully. Updated certificate will be emailed within 2 working days.</Alert>
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField fullWidth required label="Existing License Number" name="renew_license_no" value={formData.renew_license_no} onChange={handleChange} placeholder="e.g., TL/2023/00456" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="outlined" onClick={fetchRenewDetails} sx={{ borderColor: HEADER_COLOR, color: HEADER_COLOR, py: 1.8 }}>
              Fetch Details
            </Button>
          </Grid>
          {renewData && (
            <>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff3e0' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Business Name</Typography>
                      <Typography variant="body2" fontWeight={600}>{renewData.businessName}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Owner</Typography>
                      <Typography variant="body2" fontWeight={600}>{renewData.owner}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Ward</Typography>
                      <Typography variant="body2" fontWeight={600}>{renewData.ward}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">License Valid Till</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">{renewData.validTill}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Renewal Fee</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">₹ {renewData.renewalFee.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth select label="Payment Method" name="renew_payment_method" value={formData.renew_payment_method} onChange={handleChange}>
                  {[['upi', 'UPI (Google Pay, PhonePe, Paytm)'], ['net_banking', 'Net Banking'], ['card', 'Debit / Credit Card']].map(([val, label]) => <MenuItem key={val} value={val}>{label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth variant="contained" onClick={handleRenew} sx={{ bgcolor: HEADER_COLOR, py: 1.5 }}>
                  Renew License — Pay ₹ {renewData.renewalFee.toLocaleString()}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      )}
    </Box>
  );

  // ─── Tab 2: Pay Renewal Fee ────────────────────────────────────────────────────
  const renderPayFeeTab = () => (
    <Box>
      {payFeePaid ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="success.main" gutterBottom>Payment Successful!</Typography>
          <Chip label={payFeeRef} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1rem', py: 1.5, px: 2, mb: 2 }} />
          <Alert severity="success">Payment received. Updated license certificate will be emailed within 1 working day.</Alert>
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField fullWidth required label="License Number" name="pay_license_no" value={formData.pay_license_no} onChange={handleChange} placeholder="e.g., TL/2023/00456" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="outlined" onClick={fetchPayFeeDetails} sx={{ borderColor: HEADER_COLOR, color: HEADER_COLOR, py: 1.8 }}>
              Fetch Fee
            </Button>
          </Grid>
          {payFeeData && (
            <>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff3e0' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Base Fee</Typography>
                      <Typography variant="body2">₹ {payFeeData.baseFee.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Late Fee {payFeeData.isLate ? '(applicable)' : '(none)'}</Typography>
                      <Typography variant="body2" color={payFeeData.lateFee > 0 ? 'error.main' : 'text.primary'}>₹ {payFeeData.lateFee.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">Total Payable</Typography>
                      <Typography variant="body1" fontWeight={700} color="primary">₹ {payFeeData.total.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth select label="Payment Method" name="pay_payment_method" value={formData.pay_payment_method} onChange={handleChange}>
                  {[['upi', 'UPI (Google Pay, PhonePe, Paytm)'], ['net_banking', 'Net Banking'], ['card', 'Debit / Credit Card']].map(([val, label]) => <MenuItem key={val} value={val}>{label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth variant="contained" onClick={handlePayFee} sx={{ bgcolor: HEADER_COLOR, py: 1.5 }}>
                  Pay ₹ {payFeeData.total.toLocaleString()}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      )}
    </Box>
  );

  // ─── Tab 3: Download / Print Certificate ──────────────────────────────────────
  const renderDownloadTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Keep your license displayed at your business premises at all times as required by law.
      </Alert>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <TextField fullWidth label="License Number" name="dl_license_no" value={formData.dl_license_no} onChange={handleChange} placeholder="e.g., TL/2023/00456" />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button fullWidth variant="contained" onClick={fetchCertificate} sx={{ bgcolor: HEADER_COLOR, py: 1.8 }}>
            Search
          </Button>
        </Grid>
      </Grid>
      {certData && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: '#fff3e0' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">License Number</Typography>
              <Typography variant="body1" fontWeight={700}>{certData.licenseNo}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Business Name</Typography>
              <Typography variant="body1" fontWeight={600}>{certData.businessName}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Owner</Typography>
              <Typography variant="body2">{certData.owner}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Address</Typography>
              <Typography variant="body2">{certData.address}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Issued Date</Typography>
              <Typography variant="body2" fontWeight={600}>{certData.issuedDate}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Valid Until</Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">{certData.validUntil}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">License Category</Typography>
              <Typography variant="body2" fontWeight={600}>{certData.category}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" sx={{ bgcolor: HEADER_COLOR }} onClick={() => toast.success('License certificate PDF downloaded!')}>
                Download PDF Certificate
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );

  const renderStepContent = () => {
    if (tab !== 0) return null;
    if (activeStep === 0) return renderStep0();
    if (activeStep === 1) return renderStep1();
    if (activeStep === 2) return renderStep2();
    if (activeStep === 3) return renderStep3();
    if (activeStep === 4) return renderStep4();
    return null;
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    handleSubmit(email);
  };

  return (
    <Box>
      <DialogContent>
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tab label="New Trade License" />
          <Tab label="Renew License" />
          <Tab label="Pay Renewal Fee" />
          <Tab label="Download / Print" />
        </Tabs>

        {tab === 0 && (
          <>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
              {TAB_STEPS[0].map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {renderStepContent()}
          </>
        )}

        {tab === 1 && <TabPanel value={tab} index={1}>{renderRenewTab()}</TabPanel>}
        {tab === 2 && <TabPanel value={tab} index={2}>{renderPayFeeTab()}</TabPanel>}
        {tab === 3 && <TabPanel value={tab} index={3}>{renderDownloadTab()}</TabPanel>}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {tab === 0 && (
          <>
            {activeStep > 0 && (
              <Button onClick={handleBack} variant="outlined" sx={{ borderColor: HEADER_COLOR, color: HEADER_COLOR }}>Back</Button>
            )}
            {isLastStep() ? (
              <Button variant="contained" onClick={() => setShowOtpDialog(true)} disabled={submitting} sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: '#bf360c' } }}>
                {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext} sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: '#bf360c' } }}>
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
        initialEmail={formData.tl_email || ''}
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

export default MunicipalTradeLicenseForm;

