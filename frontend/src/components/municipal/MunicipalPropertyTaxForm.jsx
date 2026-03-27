import React, { useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, Button, Tabs, Tab,
  Stepper, Step, StepLabel, Alert, Chip, CircularProgress,
  Paper, Divider, Typography, DialogContent, DialogActions,
  Switch, FormControlLabel, Select, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { CheckCircle as SuccessIcon, Download as DownloadIcon } from '@mui/icons-material';
import DocUpload from './DocUpload';
import { validateFile } from './formUtils';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';

const HEADER_COLOR = '#1565c0';
const HOVER_COLOR  = '#0d47a1';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

const SELF_ASSESS_STEPS = ['Owner Details', 'Property Details', 'Building Details', 'Documents & Review'];
const REVISION_STEPS    = ['Applicant & Property', 'Revision Request', 'Documents'];
const MUTATION_STEPS    = ['Previous Owner', 'New Owner', 'Transfer Details', 'Documents'];

const PROPERTY_TYPES = [
  'Independent house — bungalow', 'Row house/tenement', 'Flat/apartment in society',
  'Commercial shop on ground floor', 'Office space', 'Warehouse/godown', 'Industrial shed',
  'Petrol pump', 'Hospital/nursing home', 'Hotel', 'Mixed residential+commercial',
  'Agricultural (not taxable)', 'Government/public',
];

// Load Razorpay script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

function SectionHeading({ children }) {
  return (
    <Grid item xs={12}>
      <Typography
        variant="subtitle1"
        fontWeight={700}
        sx={{ mt: 1.5, mb: 0.5, color: HEADER_COLOR, borderBottom: `2px solid ${HEADER_COLOR}`, pb: 0.5 }}
      >
        {children}
      </Typography>
    </Grid>
  );
}

function SuccessView({ refNumber, message, onClose }) {
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" color="success.main" gutterBottom fontWeight={700}>
        Application Submitted Successfully!
      </Typography>
      <Chip
        label={refNumber}
        sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1.1rem', py: 2.5, px: 3, mb: 3 }}
      />
      <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>{message}</Alert>
      <Button
        variant="contained"
        onClick={onClose}
        sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR }, px: 5 }}
      >
        Close
      </Button>
    </Box>
  );
}

function makeDocHandlers(setDocs) {
  return {
    onFileChange: (name, file) => {
      if (!file) return;
      const err = validateFile(file, 5);
      if (err) { toast.error(err); return; }
      setDocs(p => ({ ...p, [name]: file }));
      toast.success(file.name + ' selected');
    },
    onRemove: (name) => setDocs(p => { const n = { ...p }; delete n[name]; return n; }),
  };
}

export default function MunicipalPropertyTaxForm({ onClose }) {
  /* ─── Tab / Step ──────────────────────────────────────────────────────────── */
  const [tab, setTab]               = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  /* ─── Tab 0 — Pay Property Tax ──────────────────────────────────────────── */
  const [billData, setBillData]     = useState(null);
  const [t0, setT0]                 = useState({ property_id: '', payment_method: '', email: '' });
  const [t0Submitting, setT0Submitting] = useState(false);
  const [t0Submitted, setT0Submitted]   = useState(false);
  const [t0Ref, setT0Ref]               = useState('');
  const [paymentStep, setPaymentStep]   = useState('bill'); // 'bill' | 'otp' | 'success'
  const [paymentOtp, setPaymentOtp]     = useState('');
  const [receiptData, setReceiptData]   = useState(null);

  /* ─── Tab 1 — Self-Assessment ────────────────────────────────────────────── */
  const [t1, setT1] = useState({
    // Step 0 – Owner Details
    owner_name: '', father_name: '', dob: '', gender: '',
    mobile: '', alt_mobile: '', email: '', aadhaar: '', pan: '',
    joint_ownership: 'No — sole owner', co_owner_name: '', co_owner_aadhaar: '',
    residential_address: '', owner_ward: '', owner_pincode: '',
    // Step 1 – Property Details
    property_address: '', property_ward: '', property_pincode: '',
    plot_number: '', cts_hissa: '', zone_type: '', property_type: '',
    total_plot_area: '', plot_area_shared: 'No', ownership_type: '',
    // Step 2 – Building Details
    year_construction: '', floors: '', gf_bua: '', total_bua: '',
    current_usage: '', monthly_rent: '',
    occ_cert: 'No', muni_approved: 'No', lift: 'No',
    parking_2w: '', parking_4w: '', building_violations: 'No',
  });
  const [t1Docs, setT1Docs]               = useState({});
  const [t1Declaration, setT1Declaration] = useState(false);
  const [t1Submitting, setT1Submitting]   = useState(false);
  const [t1Submitted, setT1Submitted]     = useState(false);
  const [t1Ref, setT1Ref]                 = useState('');

  /* ─── Tab 2 — Assessment Revision ───────────────────────────────────────── */
  const [t2, setT2] = useState({
    property_id: '', owner_name: '', mobile: '', email: '', aadhaar: '',
    existing_value: '', last_assessment_year: '', property_type: '',
    ward: '', property_address: '', revision_reason: '',
    revised_amount: '', justification: '', evidence_type: '',
    date_of_change: '', application_submitted_to: '',
  });
  const [t2Docs, setT2Docs]             = useState({});
  const [t2Submitting, setT2Submitting] = useState(false);
  const [t2Submitted, setT2Submitted]   = useState(false);
  const [t2Ref, setT2Ref]               = useState('');

  /* ─── Tab 3 — Property Mutation ─────────────────────────────────────────── */
  const [t3, setT3] = useState({
    // Step 0 – Previous Owner
    prev_owner_name: '', prev_mobile: '', prev_aadhaar: '', prev_pan: '',
    property_id: '', prev_ward: '', property_address: '',
    // Step 1 – New Owner
    new_owner_name: '', new_father_name: '', new_dob: '', new_gender: '',
    new_mobile: '', new_alt_mobile: '', new_email: '',
    new_aadhaar: '', new_pan: '', new_address: '', new_ward: '',
    // Step 2 – Transfer Details
    transfer_type: '', transfer_date: '', sale_deed_reg_no: '',
    registrar_office: '', sale_consideration: '', stamp_duty: '',
    market_value: '', property_disputes: 'No', tax_arrear_cleared: '',
  });
  const [t3Docs, setT3Docs]             = useState({});
  const [t3Submitting, setT3Submitting] = useState(false);
  const [t3Submitted, setT3Submitted]   = useState(false);
  const [t3Ref, setT3Ref]               = useState('');

  /* ─── Tab 4 — View Tax Receipts ─────────────────────────────────────────── */
  const [receipts, setReceipts]         = useState(null);
  const [t4PropertyId, setT4PropertyId] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [receiptAppType, setReceiptAppType] = useState('');
  const [receiptFormData, setReceiptFormData] = useState({});
  const [receiptAppNum, setReceiptAppNum] = useState('');

  /* ─── Doc handlers ───────────────────────────────────────────────────────── */
  const t1DocH = makeDocHandlers(setT1Docs);
  const t2DocH = makeDocHandlers(setT2Docs);
  const t3DocH = makeDocHandlers(setT3Docs);

  /* ─── Tab change ─────────────────────────────────────────────────────────── */
  const handleTabChange = (_, v) => {
    setTab(v);
    setActiveStep(0);
    setT0Submitted(false);
    setT1Submitted(false);
    setT2Submitted(false);
    setT3Submitted(false);
    setBillData(null);
    setReceipts(null);
  };

  /* ─── Field change helpers ───────────────────────────────────────────────── */
  const handleT1 = (e) => {
    const { name, value } = e.target;
    if (['mobile', 'alt_mobile'].includes(name))
      return setT1(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 10) }));
    if (['aadhaar', 'co_owner_aadhaar'].includes(name))
      return setT1(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 12) }));
    if (name === 'pan')
      return setT1(p => ({ ...p, pan: value.toUpperCase().slice(0, 10) }));
    setT1(p => ({ ...p, [name]: value }));
  };

  const handleT2 = (e) => {
    const { name, value } = e.target;
    if (name === 'mobile')
      return setT2(p => ({ ...p, mobile: value.replace(/\D/g, '').slice(0, 10) }));
    if (name === 'aadhaar')
      return setT2(p => ({ ...p, aadhaar: value.replace(/\D/g, '').slice(0, 12) }));
    setT2(p => ({ ...p, [name]: value }));
  };

  const handleT3 = (e) => {
    const { name, value } = e.target;
    if (['prev_mobile', 'new_mobile', 'new_alt_mobile'].includes(name))
      return setT3(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 10) }));
    if (['prev_aadhaar', 'new_aadhaar'].includes(name))
      return setT3(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 12) }));
    if (['prev_pan', 'new_pan'].includes(name))
      return setT3(p => ({ ...p, [name]: value.toUpperCase().slice(0, 10) }));
    setT3(p => ({ ...p, [name]: value }));
  };

  /* ─── Stepper navigation ─────────────────────────────────────────────────── */
  const handleNext = () => {
    /* --- Tab 1: Self-Assessment --- */
    if (tab === 1) {
      if (activeStep === 0) {
        if (!t1.owner_name)                     return toast.error('Owner Full Name is required');
        if (!t1.father_name)                    return toast.error('Father/Husband Name is required');
        if (!t1.dob)                            return toast.error('Date of Birth is required');
        if (t1.mobile.length < 10)              return toast.error('Mobile must be 10 digits');
        if (!t1.email)                          return toast.error('Email is required');
        if (t1.aadhaar.length < 12)             return toast.error('Aadhaar must be 12 digits');
        if (!t1.pan || t1.pan.length < 10)      return toast.error('PAN Card is required (10 characters)');
        if (!t1.residential_address)            return toast.error('Residential Address is required');
        if (!t1.owner_ward)                     return toast.error('Owner Ward is required');
      }
      if (activeStep === 1) {
        if (!t1.property_address)  return toast.error('Property Address is required');
        if (!t1.property_ward)     return toast.error('Ward of Property is required');
        if (!t1.plot_number)       return toast.error('Plot / Survey Number is required');
        if (!t1.zone_type)         return toast.error('Zone Type is required');
        if (!t1.property_type)     return toast.error('Property Type is required');
        if (!t1.total_plot_area)   return toast.error('Total Plot Area is required');
        if (!t1.ownership_type)    return toast.error('Ownership Type is required');
      }
      if (activeStep === 2) {
        if (!t1.year_construction) return toast.error('Year of Construction is required');
        if (!t1.floors)            return toast.error('Number of Floors is required');
        if (!t1.gf_bua)            return toast.error('Ground Floor Built-up Area is required');
        if (!t1.total_bua)         return toast.error('Total Built-up Area is required');
        if (!t1Declaration)        return toast.error('Please accept the declaration before proceeding');
      }
    }
    /* --- Tab 2: Assessment Revision --- */
    if (tab === 2) {
      if (activeStep === 0) {
        if (!t2.property_id)            return toast.error('Property ID / Holding Number is required');
        if (!t2.owner_name)             return toast.error('Owner / Applicant Name is required');
        if (t2.mobile.length < 10)      return toast.error('Mobile must be 10 digits');
        if (!t2.existing_value)         return toast.error('Existing Assessed Value is required');
        if (!t2.last_assessment_year)   return toast.error('Year of Last Assessment is required');
        if (!t2.ward)                   return toast.error('Ward is required');
        if (!t2.property_address)       return toast.error('Property Address is required');
        if (!t2.revision_reason)        return toast.error('Reason for Revision Request is required');
      }
      if (activeStep === 1) {
        if (!t2.revised_amount)  return toast.error('Revised Assessment Amount is required');
        if (!t2.justification)   return toast.error('Detailed Justification is required');
        if (!t2.date_of_change)  return toast.error('Date of Change is required');
      }
    }
    /* --- Tab 3: Property Mutation --- */
    if (tab === 3) {
      if (activeStep === 0) {
        if (!t3.prev_owner_name)         return toast.error('Previous Owner Full Name is required');
        if (t3.prev_aadhaar.length < 12) return toast.error('Previous Owner Aadhaar must be 12 digits');
        if (!t3.property_id)             return toast.error('Property ID / Holding No is required');
        if (!t3.prev_ward)               return toast.error('Ward is required');
        if (!t3.property_address)        return toast.error('Property Address is required');
      }
      if (activeStep === 1) {
        if (!t3.new_owner_name)          return toast.error('New Owner Full Name is required');
        if (!t3.new_father_name)         return toast.error('Father/Husband Name is required');
        if (!t3.new_dob)                 return toast.error('Date of Birth is required');
        if (!t3.new_gender)              return toast.error('Gender is required');
        if (t3.new_mobile.length < 10)   return toast.error('Mobile must be 10 digits');
        if (!t3.new_email)               return toast.error('Email is required');
        if (t3.new_aadhaar.length < 12)  return toast.error('Aadhaar must be 12 digits');
        if (!t3.new_pan || t3.new_pan.length < 10) return toast.error('PAN is required (10 characters)');
        if (!t3.new_address)             return toast.error('New Owner Residential Address is required');
        if (!t3.new_ward)                return toast.error('Ward of New Owner is required');
      }
      if (activeStep === 2) {
        if (!t3.transfer_type)      return toast.error('Transfer Type is required');
        if (!t3.transfer_date)      return toast.error('Date of Transfer / Registration is required');
        if (!t3.sale_deed_reg_no)   return toast.error('Sale Deed / Registration No is required');
        if (!t3.registrar_office)   return toast.error('Registration Office / Sub-Registrar Name is required');
        if (!t3.stamp_duty)         return toast.error('Stamp Duty Paid amount is required');
      }
    }
    setActiveStep(s => s + 1);
  };

  const handleBack = () => setActiveStep(s => s - 1);

  /* ─── Submit: Tab 0 ──────────────────────────────────────────────────────── */
  const handleT0Submit = async (email) => {
    if (!billData) return toast.error('Please fetch the bill first');
    if (!t0.payment_method) return toast.error('Please select a Payment Method');
    if (!t0.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t0.email)) {
      return toast.error('Please enter a valid email address for payment');
    }

    // Only use Razorpay for online payment methods
    if (['UPI', 'Net Banking', 'Credit/Debit Card'].includes(t0.payment_method)) {
      await handleRazorpayPayment(email);
    } else {
      // For cash/counter payments, proceed directly
      await handleDirectPayment(email);
    }
  };

  const handleRazorpayPayment = async (email) => {
    setT0Submitting(true);
    try {
      // 1. Create Razorpay order
      const orderRes = await api.post('/municipal/payments/create-order', {
        amount: billData.totalDue,
        application_number: billData.property_id || t0.property_id,
        payer_name: billData.owner,
        mobile: billData.mobile || '9999999999',
        payment_type: 'property_tax',
      });

      if (!orderRes.data?.success) {
        toast.error(orderRes.data?.message || 'Could not create payment order');
        return;
      }

      const { order_id, amount, currency, razorpay_key } = orderRes.data.data;

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Check your internet connection.');
        return;
      }

      // 3. Open Razorpay checkout
      const options = {
        key: razorpay_key,
        amount,
        currency,
        order_id,
        name: 'Municipal Corporation',
        description: `Property Tax Payment — ${t0.property_id}`,
        prefill: {
          name: billData.owner,
          email: t0.email,
        },
        theme: { color: HEADER_COLOR },
        handler: async (response) => {
          // 4. Verify payment
          try {
            const verifyRes = await api.post('/municipal/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bill_number: billData.bill_number || '',
              amount: billData.totalDue,
              mobile: billData.mobile || '',
            });

            if (verifyRes.data?.success) {
              setPaymentStep('otp');
              toast.success('Payment successful! Check your email for OTP.');
            } else {
              toast.error(verifyRes.data?.message || 'Payment verification failed');
            }
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || 'Verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => toast('Payment cancelled.'),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed. Please try again.');
    } finally {
      setT0Submitting(false);
    }
  };

  const handleDirectPayment = async (email) => {
    setT0Submitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'property_tax_payment',
        application_data: { ...t0, bill: billData },
      });
      const appNum = res.data?.data?.application_number || 'PTX-' + Date.now();
      const ts = new Date().toISOString();
      setT0Ref(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('property_tax_payment');
      setReceiptFormData({ ...t0 });
      setSubmittedAt(ts);
      setShowReceipt(true);
      setPaymentStep('success');
      toast.success('Payment submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || t0.email || '',
        application_number: appNum,
        application_type: 'property_tax_payment',
        application_data: { ...t0 },
        submitted_at: ts,
      }).catch(console.warn);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setT0Submitting(false);
    }
  };

  const handleVerifyPaymentOtp = async () => {
    if (!paymentOtp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }
    setT0Submitting(true);
    try {
      const res = await api.post('/municipal/payments/verify-otp', {
        otp: paymentOtp.trim(),
        consumer_number: t0.property_id,
      });

      if (res.data?.success) {
        setReceiptData(res.data.data);
        setPaymentStep('success');
        setT0Submitted(true);
        toast.success('OTP verified! Payment complete.');
      } else {
        toast.error(res.data?.message || 'Invalid OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setT0Submitting(false);
    }
  };

  /* ─── Submit: Tab 1 ──────────────────────────────────────────────────────── */
  const handleT1Submit = async (email) => {
    if (!t1Docs.ownership_deed)  return toast.error('Property Ownership / Sale Deed is required');
    if (!t1Docs.owner_id_proof)  return toast.error('Owner Identity Proof (Aadhaar/PAN) is required');
    setT1Submitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'property_self_assessment',
        application_data: { ...t1 },
      });
      const appNum = res.data?.data?.application_number || 'PSA-' + Date.now();
      const ts = new Date().toISOString();
      setT1Ref(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('self_assessment');
      setReceiptFormData({ ...t1 });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Application submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'self_assessment',
        application_data: { ...t1 },
        submitted_at: ts,
      }).catch(console.warn);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setT1Submitting(false);
    }
  };

  /* ─── Submit: Tab 2 ──────────────────────────────────────────────────────── */
  const handleT2Submit = async (email) => {
    if (!t2Docs.old_assessment_order) return toast.error('Current/Old Assessment Order is required');
    if (!t2Docs.ownership_proof)      return toast.error('Property Ownership Proof is required');
    if (!t2Docs.supporting_doc)       return toast.error('Supporting document for revision reason is required');
    setT2Submitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'property_assessment_revision',
        application_data: { ...t2 },
      });
      const appNum = res.data?.data?.application_number || 'PAR-' + Date.now();
      const ts = new Date().toISOString();
      setT2Ref(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('tax_revision');
      setReceiptFormData({ ...t2 });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Revision request submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'tax_revision',
        application_data: { ...t2 },
        submitted_at: ts,
      }).catch(console.warn);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setT2Submitting(false);
    }
  };

  /* ─── Submit: Tab 3 ──────────────────────────────────────────────────────── */
  const handleT3Submit = async (email) => {
    if (!t3Docs.sale_deed)     return toast.error('Registered Sale Deed / Gift Deed / Will is required');
    if (!t3Docs.prev_owner_id) return toast.error('Previous Owner Identity Proof is required');
    if (!t3Docs.new_owner_id)  return toast.error('New Owner Identity Proof (Aadhaar) is required');
    setT3Submitting(true);
    try {
      const res = await api.post('/municipal/applications/submit', {
        application_type: 'property_mutation',
        application_data: { ...t3 },
      });
      const appNum = res.data?.data?.application_number || 'PMT-' + Date.now();
      const ts = new Date().toISOString();
      setT3Ref(appNum);
      setReceiptAppNum(appNum);
      setReceiptAppType('property_mutation');
      setReceiptFormData({ ...t3 });
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Mutation application submitted successfully!');
      api.post('/municipal/otp/send-receipt', {
        email: email || '',
        application_number: appNum,
        application_type: 'property_mutation',
        application_data: { ...t3 },
        submitted_at: ts,
      }).catch(console.warn);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setT3Submitting(false);
    }
  };

  /* ─── Mock fetch: bill ───────────────────────────────────────────────────── */
  const fetchBill = () => {
    if (!t0.property_id) return toast.error('Enter Property ID / Holding Number');
    setBillData({
      owner: 'Rajesh Kumar Verma', ward: 'Ward 5',
      propertyType: 'Residential — Independent House', builtUpArea: '135 sq.m',
      annualTax: 4850, penalty: 0, cess: 145, totalDue: 4995,
      dueDate: '31 Mar 2026',
    });
  };

  /* ─── Mock fetch: receipts ───────────────────────────────────────────────── */
  const fetchReceipts = () => {
    if (!t4PropertyId) return toast.error('Enter Property ID to search');
    setReceipts([
      { year: '2024-25', amount: 4850, date: '12 Apr 2024', receipt: 'PTX2024001' },
      { year: '2023-24', amount: 4500, date: '08 Mar 2024', receipt: 'PTX2023001' },
      { year: '2022-23', amount: 4200, date: '15 Feb 2023', receipt: 'PTX2022001' },
      { year: '2021-22', amount: 3900, date: '22 Apr 2022', receipt: 'PTX2021001' },
      { year: '2020-21', amount: 3650, date: '10 Mar 2021', receipt: 'PTX2020001' },
    ]);
  };

  /* ─── Derived ────────────────────────────────────────────────────────────── */
  const showJointFields   = t1.joint_ownership !== 'No — sole owner';
  const showMonthlyRent   = ['Tenant occupied — residential', 'Tenant occupied — commercial'].includes(t1.current_usage);

  /* ─── OTP Handler ────────────────────────────────────────────────────────── */
  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    setVerifiedEmail(email);
    if (tab === 0) handleT0Submit(email);
    else if (tab === 1) handleT1Submit(email);
    else if (tab === 2) handleT2Submit(email);
    else if (tab === 3) handleT3Submit(email);
  };

  /* ─────────────────────────────── RENDER ──────────────────────────────────── */
  return (
    <Box>
      <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
        >
          <Tab label="Pay Property Tax" />
          <Tab label="Self-Assessment" />
          <Tab label="Tax Revision" />
          <Tab label="Property Mutation" />
          <Tab label="View Tax Receipts" />
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════
            TAB 0 — Pay Property Tax  (no stepper)
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={0}>
          {paymentStep === 'success' && receiptData ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" color="success.main" gutterBottom fontWeight={700}>
                Payment Successful!
              </Typography>
              <Chip
                label={receiptData.receipt_number || t0Ref}
                sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1.1rem', py: 2.5, px: 3, mb: 3 }}
              />
              <Alert severity="info" sx={{ mb: 3 }}>
                Property tax payment confirmed. Receipt has been sent to your email.
              </Alert>
              <Button
                variant="contained"
                onClick={onClose}
                sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR }, px: 5 }}
              >
                Close
              </Button>
            </Box>
          ) : paymentStep === 'otp' ? (
            <Box sx={{ py: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>Payment Successful via Razorpay</Typography>
                <Typography variant="body2" color="textSecondary">
                  An OTP has been sent to <strong>{t0.email}</strong>
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                Enter the 6-digit OTP to confirm and complete your property tax payment.
              </Alert>

              <TextField
                fullWidth
                label="Enter OTP"
                value={paymentOtp}
                onChange={(e) => setPaymentOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                placeholder="6-digit OTP"
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleVerifyPaymentOtp}
                disabled={t0Submitting || paymentOtp.length !== 6}
                sx={{ py: 1.5 }}
              >
                {t0Submitting ? <CircularProgress size={24} /> : 'Verify OTP & Complete'}
              </Button>
            </Box>
          ) : t0Submitted ? (
            <SuccessView
              refNumber={t0Ref}
              message="Property tax paid online reflects in records within 24 hours. Keep payment receipt for future reference."
              onClose={onClose}
            />
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Property ID / Holding Number *"
                  value={t0.property_id}
                  onChange={e => setT0(p => ({ ...p, property_id: e.target.value }))}
                  placeholder="e.g. WARD05-2023-1234"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth variant="outlined"
                  sx={{ height: 56, borderColor: HEADER_COLOR, color: HEADER_COLOR }}
                  onClick={fetchBill}
                >
                  Fetch Bill
                </Button>
              </Grid>

              {billData && (
                <>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} color="primary" gutterBottom>
                        Property Tax Bill Details
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Grid container spacing={1}>
                        {[
                          ['Owner Name', billData.owner],
                          ['Ward', billData.ward],
                          ['Property Type', billData.propertyType],
                          ['Built-up Area', billData.builtUpArea],
                          ['Annual Tax', '₹' + billData.annualTax.toLocaleString()],
                          ['Penalty', '₹' + billData.penalty.toLocaleString()],
                          ['Cess', '₹' + billData.cess.toLocaleString()],
                          ['Total Due', '₹' + billData.totalDue.toLocaleString()],
                          ['Due Date', billData.dueDate],
                        ].map(([label, val]) => (
                          <Grid item xs={6} sm={4} key={label}>
                            <Typography variant="body2">{label}: <b>{val}</b></Typography>
                          </Grid>
                        ))}
                        <Grid item xs={12}>
                          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                            Total Payable: ₹{billData.totalDue.toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t0-pay-method-label">Payment Method *</InputLabel>
                      <Select
                        labelId="t0-pay-method-label"
                        value={t0.payment_method}
                        onChange={e => setT0(p => ({ ...p, payment_method: e.target.value }))}
                        label="Payment Method *"
                      >
                        {['UPI', 'Net Banking', 'Credit/Debit Card', 'Cash at Municipal Counter'].map(m => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email Address for OTP & Receipt *"
                      type="email"
                      value={t0.email}
                      onChange={e => setT0(p => ({ ...p, email: e.target.value }))}
                      placeholder="your@email.com"
                      helperText="Receipt will be sent to this email"
                    />
                  </Grid>

                  {['UPI', 'Net Banking', 'Credit/Debit Card'].includes(t0.payment_method) && (
                    <Grid item xs={12}>
                      <Alert severity="warning">
                        Demo mode — Razorpay will charge <strong>₹1</strong> (not the full bill amount)
                      </Alert>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Button
                      fullWidth variant="contained"
                      sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                      onClick={() => handleT0Submit(t0.email)}
                      disabled={t0Submitting || !t0.email}
                      startIcon={t0Submitting ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                      {t0Submitting ? 'Processing...' : 'Pay Now'}
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Alert severity="info">
                      Property tax paid online reflects in records within 24 hours. Keep payment receipt for future reference.
                    </Alert>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1 — Self-Assessment (New Property)  4-step stepper
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={1}>
          {t1Submitted ? (
            <SuccessView
              refNumber={t1Ref}
              message="Self-assessment registered. A municipal inspector will verify the property within 15 working days. You will be notified by SMS and email."
              onClose={onClose}
            />
          ) : (
            <>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                {SELF_ASSESS_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
              </Stepper>

              {/* ── Step 0: Owner Details ── */}
              {activeStep === 0 && (
                <Grid container spacing={2}>
                  <SectionHeading>Owner / Applicant Personal Details</SectionHeading>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Owner Full Name *" name="owner_name"
                      value={t1.owner_name} onChange={handleT1}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Father / Husband Name *" name="father_name"
                      value={t1.father_name} onChange={handleT1}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Date of Birth *" name="dob" type="date"
                      value={t1.dob} onChange={handleT1}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-gender-label">Gender</InputLabel>
                      <Select
                        labelId="t1-gender-label" name="gender"
                        value={t1.gender} onChange={handleT1} label="Gender"
                      >
                        {['Male', 'Female', 'Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Mobile *" name="mobile"
                      value={t1.mobile} onChange={handleT1}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Alternate Mobile" name="alt_mobile"
                      value={t1.alt_mobile} onChange={handleT1}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Email *" name="email" type="email"
                      value={t1.email} onChange={handleT1}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Aadhaar * (12 digits)" name="aadhaar"
                      value={t1.aadhaar} onChange={handleT1}
                      inputProps={{ maxLength: 12 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="PAN Card *" name="pan"
                      value={t1.pan} onChange={handleT1}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>

                  <SectionHeading>Ownership Type</SectionHeading>
                  <Grid item xs={12} md={8}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-joint-label">Is joint ownership?</InputLabel>
                      <Select
                        labelId="t1-joint-label" name="joint_ownership"
                        value={t1.joint_ownership} onChange={handleT1}
                        label="Is joint ownership?"
                      >
                        {[
                          'No — sole owner',
                          'Yes — joint with spouse',
                          'Yes — joint with family',
                          'Yes — partnership/company',
                        ].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  {showJointFields && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth label="Co-owner Name" name="co_owner_name"
                          value={t1.co_owner_name} onChange={handleT1}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth label="Co-owner Aadhaar (12 digits)" name="co_owner_aadhaar"
                          value={t1.co_owner_aadhaar} onChange={handleT1}
                          inputProps={{ maxLength: 12 }}
                        />
                      </Grid>
                    </>
                  )}

                  <SectionHeading>Owner's Residential Address</SectionHeading>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Owner / Applicant's Residential Address *" name="residential_address"
                      value={t1.residential_address} onChange={handleT1}
                      multiline rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                              <TextField fullWidth required label="Owner's Ward *" name="owner_ward" value={t1.owner_ward} onChange={handleT1} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Owner Pincode" name="owner_pincode"
                      value={t1.owner_pincode} onChange={handleT1}
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>
                </Grid>
              )}

              {/* ── Step 1: Property Details ── */}
              {activeStep === 1 && (
                <Grid container spacing={2}>
                  <SectionHeading>New Property Location Details</SectionHeading>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Property Address (where new property is) *" name="property_address"
                      value={t1.property_address} onChange={handleT1}
                      multiline rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                              <TextField fullWidth required label="Ward of Property *" name="property_ward" value={t1.property_ward} onChange={handleT1} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Property Pincode" name="property_pincode"
                      value={t1.property_pincode} onChange={handleT1}
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Plot / Survey Number *" name="plot_number"
                      value={t1.plot_number} onChange={handleT1}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="CTS / Hissa Number" name="cts_hissa"
                      value={t1.cts_hissa} onChange={handleT1}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-zone-label">Zone Type *</InputLabel>
                      <Select
                        labelId="t1-zone-label" name="zone_type"
                        value={t1.zone_type} onChange={handleT1} label="Zone Type *"
                      >
                        {[
                          'Residential', 'Commercial', 'Industrial',
                          'Mixed Use', 'Agricultural', 'Public/Semi-public',
                        ].map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-proptype-label">Property Type *</InputLabel>
                      <Select
                        labelId="t1-proptype-label" name="property_type"
                        value={t1.property_type} onChange={handleT1} label="Property Type *"
                      >
                        {PROPERTY_TYPES.map(pt => <MenuItem key={pt} value={pt}>{pt}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Total Plot Area (sq.m) *" name="total_plot_area"
                      type="number" value={t1.total_plot_area} onChange={handleT1}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-plotshared-label">Is total plot area shared with others?</InputLabel>
                      <Select
                        labelId="t1-plotshared-label" name="plot_area_shared"
                        value={t1.plot_area_shared} onChange={handleT1}
                        label="Is total plot area shared with others?"
                      >
                        <MenuItem value="No">No</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-own-type-label">Ownership Type *</InputLabel>
                      <Select
                        labelId="t1-own-type-label" name="ownership_type"
                        value={t1.ownership_type} onChange={handleT1} label="Ownership Type *"
                      >
                        {[
                          'Freehold', 'Leasehold', 'Government allotted',
                          'Society member', 'Joint co-ownership',
                        ].map(ot => <MenuItem key={ot} value={ot}>{ot}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              {/* ── Step 2: Building Details ── */}
              {activeStep === 2 && (
                <Grid container spacing={2}>
                  <SectionHeading>Construction & Usage Details</SectionHeading>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Year of Construction *" name="year_construction"
                      type="number" value={t1.year_construction} onChange={handleT1}
                      inputProps={{ min: 1900, max: new Date().getFullYear() }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Number of Floors (Ground + upper) *" name="floors"
                      type="number" value={t1.floors} onChange={handleT1}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Total Built-up Area — Ground Floor (sq.m) *" name="gf_bua"
                      type="number" value={t1.gf_bua} onChange={handleT1}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Total Built-up Area — All Floors combined (sq.m) *" name="total_bua"
                      type="number" value={t1.total_bua} onChange={handleT1}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <FormControl fullWidth>
                      <InputLabel id="t1-usage-label">Currently Used for</InputLabel>
                      <Select
                        labelId="t1-usage-label" name="current_usage"
                        value={t1.current_usage} onChange={handleT1} label="Currently Used for"
                      >
                        {[
                          'Owner occupied — residential',
                          'Tenant occupied — residential',
                          'Self-used — commercial',
                          'Tenant occupied — commercial',
                          'Mixed',
                          'Vacant/under construction',
                          'Part vacant',
                        ].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  {showMonthlyRent && (
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth label="Monthly Rent (₹)" name="monthly_rent"
                        type="number" value={t1.monthly_rent} onChange={handleT1}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  )}

                  <SectionHeading>Property Status & Amenities</SectionHeading>
                  {[
                    { label: 'Occupancy Certificate available?', name: 'occ_cert' },
                    { label: 'Is building construction approved by Municipal?', name: 'muni_approved' },
                    { label: 'Lift installed?', name: 'lift' },
                    { label: 'Any building violations pending?', name: 'building_violations' },
                  ].map(({ label, name }) => (
                    <Grid item xs={12} md={6} key={name}>
                      <FormControl fullWidth>
                        <InputLabel id={`t1-${name}-label`}>{label}</InputLabel>
                        <Select
                          labelId={`t1-${name}-label`} name={name}
                          value={t1[name]} onChange={handleT1} label={label}
                        >
                          <MenuItem value="Yes">Yes</MenuItem>
                          <MenuItem value="No">No</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  ))}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Number of parking spaces (2-wheeler)" name="parking_2w"
                      type="number" value={t1.parking_2w} onChange={handleT1}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Number of parking spaces (4-wheeler)" name="parking_4w"
                      type="number" value={t1.parking_4w} onChange={handleT1}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={t1Declaration}
                          onChange={e => setT1Declaration(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="I declare that the above information is true to the best of my knowledge. *"
                    />
                  </Grid>
                </Grid>
              )}

              {/* ── Step 3: Documents & Review ── */}
              {activeStep === 3 && (
                <Grid container spacing={2}>
                  <SectionHeading>Required Document Uploads</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Property Ownership / Sale Deed *" name="ownership_deed"
                      required docs={t1Docs} onFileChange={t1DocH.onFileChange} onRemove={t1DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Approved Building Plan" name="building_plan"
                      hint="Plan sanctioned by Municipal Authority"
                      docs={t1Docs} onFileChange={t1DocH.onFileChange} onRemove={t1DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Occupancy Certificate" name="occ_cert_doc"
                      hint="If available — post construction"
                      docs={t1Docs} onFileChange={t1DocH.onFileChange} onRemove={t1DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Index II / Latest Registration document" name="index_ii"
                      docs={t1Docs} onFileChange={t1DocH.onFileChange} onRemove={t1DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="7-12 Extract / City Survey Map" name="seven_twelve"
                      docs={t1Docs} onFileChange={t1DocH.onFileChange} onRemove={t1DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Owner Identity Proof (Aadhaar/PAN) *" name="owner_id_proof"
                      required docs={t1Docs} onFileChange={t1DocH.onFileChange} onRemove={t1DocH.onRemove}
                    />
                  </Grid>

                  <SectionHeading>Application Summary</SectionHeading>
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                      <Grid container spacing={1}>
                        {[
                          ['Owner Name', t1.owner_name],
                          ['Property Address', t1.property_address],
                          ['Property Type', t1.property_type],
                          ['Zone Type', t1.zone_type],
                          ['Total Built-up Area', t1.total_bua ? t1.total_bua + ' sq.m' : '—'],
                          ['Ownership Type', t1.ownership_type],
                        ].map(([label, val]) => (
                          <Grid item xs={12} sm={6} key={label}>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="body1" fontWeight={600}>{val || '—'}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              )}

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                  Back
                </Button>
                {activeStep < SELF_ASSESS_STEPS.length - 1 ? (
                  <Button
                    variant="contained" onClick={handleNext}
                    sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="contained" onClick={() => setShowOtpDialog(true)}
                    disabled={t1Submitting}
                    startIcon={t1Submitting ? <CircularProgress size={18} color="inherit" /> : null}
                    sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                  >
                    {t1Submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                )}
              </Box>
            </>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 2 — Tax Assessment / Revision  3-step stepper
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={2}>
          {t2Submitted ? (
            <SuccessView
              refNumber={t2Ref}
              message="Assessment revision request submitted. The Municipal Assessment Department will review your application and communicate the decision within 30 working days."
              onClose={onClose}
            />
          ) : (
            <>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                {REVISION_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
              </Stepper>

              {/* ── Step 0: Applicant & Property ── */}
              {activeStep === 0 && (
                <Grid container spacing={2}>
                  <SectionHeading>Property Identification</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Property ID / Holding Number *" name="property_id"
                      value={t2.property_id} onChange={handleT2}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Owner / Applicant Name *" name="owner_name"
                      value={t2.owner_name} onChange={handleT2}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Mobile *" name="mobile"
                      value={t2.mobile} onChange={handleT2}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Email" name="email" type="email"
                      value={t2.email} onChange={handleT2}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Aadhaar (12 digits)" name="aadhaar"
                      value={t2.aadhaar} onChange={handleT2}
                      inputProps={{ maxLength: 12 }}
                    />
                  </Grid>

                  <SectionHeading>Current Assessment Details</SectionHeading>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Existing Assessed Value (₹) *" name="existing_value"
                      type="number" value={t2.existing_value} onChange={handleT2}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Year of Last Assessment *" name="last_assessment_year"
                      type="number" value={t2.last_assessment_year} onChange={handleT2}
                      inputProps={{ min: 2000, max: 2026 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="t2-proptype-label">Property Type</InputLabel>
                      <Select
                        labelId="t2-proptype-label" name="property_type"
                        value={t2.property_type} onChange={handleT2} label="Property Type"
                      >
                        {PROPERTY_TYPES.map(pt => <MenuItem key={pt} value={pt}>{pt}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                              <TextField fullWidth required label="Ward *" name="ward" value={t2.ward} onChange={handleT2} />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth label="Property Address *" name="property_address"
                      value={t2.property_address} onChange={handleT2}
                      multiline rows={2}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="t2-reason-label">Reason for Revision Request *</InputLabel>
                      <Select
                        labelId="t2-reason-label" name="revision_reason"
                        value={t2.revision_reason} onChange={handleT2}
                        label="Reason for Revision Request *"
                      >
                        {[
                          'Property type changed',
                          'Partial demolition/reduction in area',
                          'Construction addition/improvement',
                          'Change in usage (res to commercial)',
                          'Error in original assessment',
                          'Merger or sub-division of plots',
                          'Market value change',
                          'Legal transfer/mutation',
                          'Other',
                        ].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              {/* ── Step 1: Revision Details ── */}
              {activeStep === 1 && (
                <Grid container spacing={2}>
                  <SectionHeading>Revision Request Details</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Revised Assessment Requested (₹) *" name="revised_amount"
                      type="number" value={t2.revised_amount} onChange={handleT2}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Date of Change *" name="date_of_change"
                      type="date" value={t2.date_of_change} onChange={handleT2}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Detailed Justification *" name="justification"
                      value={t2.justification} onChange={handleT2}
                      multiline rows={4}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t2-evidence-label">Supporting evidence available?</InputLabel>
                      <Select
                        labelId="t2-evidence-label" name="evidence_type"
                        value={t2.evidence_type} onChange={handleT2}
                        label="Supporting evidence available?"
                      >
                        {[
                          'Yes — construction plans',
                          'Yes — registered sale deed',
                          'Yes — surveyor report',
                          'Yes — court order',
                          'Multiple documents',
                        ].map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t2-submit-to-label">Application Submitted to</InputLabel>
                      <Select
                        labelId="t2-submit-to-label" name="application_submitted_to"
                        value={t2.application_submitted_to} onChange={handleT2}
                        label="Application Submitted to"
                      >
                        {[
                          'Municipal Assessment Dept',
                          'Online complaint',
                          'RTI follow-up',
                          'Court direction',
                        ].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              {/* ── Step 2: Documents ── */}
              {activeStep === 2 && (
                <Grid container spacing={2}>
                  <SectionHeading>Required Documents</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Current/Old Assessment Order *" name="old_assessment_order"
                      required docs={t2Docs} onFileChange={t2DocH.onFileChange} onRemove={t2DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Property Ownership Proof *" name="ownership_proof"
                      required docs={t2Docs} onFileChange={t2DocH.onFileChange} onRemove={t2DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Site Plan / Floor Plan" name="site_plan"
                      hint="Showing actual area as built"
                      docs={t2Docs} onFileChange={t2DocH.onFileChange} onRemove={t2DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Supporting document for revision reason *" name="supporting_doc"
                      required docs={t2Docs} onFileChange={t2DocH.onFileChange} onRemove={t2DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Court Order" name="court_order"
                      hint="If revision is under court directive"
                      docs={t2Docs} onFileChange={t2DocH.onFileChange} onRemove={t2DocH.onRemove}
                    />
                  </Grid>
                </Grid>
              )}

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">Back</Button>
                {activeStep < REVISION_STEPS.length - 1 ? (
                  <Button
                    variant="contained" onClick={handleNext}
                    sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="contained" onClick={() => setShowOtpDialog(true)}
                    disabled={t2Submitting}
                    startIcon={t2Submitting ? <CircularProgress size={18} color="inherit" /> : null}
                    sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                  >
                    {t2Submitting ? 'Submitting...' : 'Submit Revision Request'}
                  </Button>
                )}
              </Box>
            </>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 3 — Property Mutation  4-step stepper
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={3}>
          {t3Submitted ? (
            <SuccessView
              refNumber={t3Ref}
              message="Mutation application registered. Processing will be completed within 30 working days after document verification. You will be notified at each stage."
              onClose={onClose}
            />
          ) : (
            <>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                {MUTATION_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
              </Stepper>

              {/* ── Step 0: Previous Owner ── */}
              {activeStep === 0 && (
                <Grid container spacing={2}>
                  <SectionHeading>Previous Owner Details</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Previous Owner Full Name *" name="prev_owner_name"
                      value={t3.prev_owner_name} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Mobile" name="prev_mobile"
                      value={t3.prev_mobile} onChange={handleT3}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Aadhaar * (12 digits)" name="prev_aadhaar"
                      value={t3.prev_aadhaar} onChange={handleT3}
                      inputProps={{ maxLength: 12 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="PAN" name="prev_pan"
                      value={t3.prev_pan} onChange={handleT3}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Property ID / Holding No *" name="property_id"
                      value={t3.property_id} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                              <TextField fullWidth required label="Ward *" name="prev_ward" value={t3.prev_ward} onChange={handleT3} />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth label="Property Address *" name="property_address"
                      value={t3.property_address} onChange={handleT3}
                      multiline rows={2}
                    />
                  </Grid>
                </Grid>
              )}

              {/* ── Step 1: New Owner ── */}
              {activeStep === 1 && (
                <Grid container spacing={2}>
                  <SectionHeading>New Owner Personal Details</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="New Owner Full Name *" name="new_owner_name"
                      value={t3.new_owner_name} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Father / Husband Name *" name="new_father_name"
                      value={t3.new_father_name} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Date of Birth *" name="new_dob" type="date"
                      value={t3.new_dob} onChange={handleT3}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="t3-new-gender-label">Gender *</InputLabel>
                      <Select
                        labelId="t3-new-gender-label" name="new_gender"
                        value={t3.new_gender} onChange={handleT3} label="Gender *"
                      >
                        {['Male', 'Female', 'Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Mobile *" name="new_mobile"
                      value={t3.new_mobile} onChange={handleT3}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Alternate Mobile" name="new_alt_mobile"
                      value={t3.new_alt_mobile} onChange={handleT3}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Email *" name="new_email" type="email"
                      value={t3.new_email} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Aadhaar * (12 digits)" name="new_aadhaar"
                      value={t3.new_aadhaar} onChange={handleT3}
                      inputProps={{ maxLength: 12 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="PAN *" name="new_pan"
                      value={t3.new_pan} onChange={handleT3}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="New Owner Residential Address *" name="new_address"
                      value={t3.new_address} onChange={handleT3}
                      multiline rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                              <TextField fullWidth required label="Ward of New Owner *" name="new_ward" value={t3.new_ward} onChange={handleT3} />
                  </Grid>
                </Grid>
              )}

              {/* ── Step 2: Transfer Details ── */}
              {activeStep === 2 && (
                <Grid container spacing={2}>
                  <SectionHeading>Transfer / Sale Details</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t3-transfer-type-label">Transfer Type *</InputLabel>
                      <Select
                        labelId="t3-transfer-type-label" name="transfer_type"
                        value={t3.transfer_type} onChange={handleT3} label="Transfer Type *"
                      >
                        {[
                          'Sale and purchase', 'Gift deed',
                          'Inheritance — will', 'Inheritance — legal heir (no will)',
                          'Court decree', 'Partition',
                          'Power of attorney based', 'Government acquisition', 'Other',
                        ].map(tt => <MenuItem key={tt} value={tt}>{tt}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Date of Transfer / Registration *" name="transfer_date"
                      type="date" value={t3.transfer_date} onChange={handleT3}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Sale Deed / Gift Deed Registration No *" name="sale_deed_reg_no"
                      value={t3.sale_deed_reg_no} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Registration Office / Sub-Registrar Name *" name="registrar_office"
                      value={t3.registrar_office} onChange={handleT3}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Sale Consideration Amount (₹)" name="sale_consideration"
                      type="number" value={t3.sale_consideration} onChange={handleT3}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Stamp Duty Paid (₹) *" name="stamp_duty"
                      type="number" value={t3.stamp_duty} onChange={handleT3}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="Market Value at time of Transfer (₹)" name="market_value"
                      type="number" value={t3.market_value} onChange={handleT3}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t3-disputes-label">Any disputes on property?</InputLabel>
                      <Select
                        labelId="t3-disputes-label" name="property_disputes"
                        value={t3.property_disputes} onChange={handleT3}
                        label="Any disputes on property?"
                      >
                        {['No', 'Yes — court case', 'Yes — family dispute', 'Yes — government dispute'].map(d => (
                          <MenuItem key={d} value={d}>{d}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="t3-arrear-label">Is property tax arrear cleared?</InputLabel>
                      <Select
                        labelId="t3-arrear-label" name="tax_arrear_cleared"
                        value={t3.tax_arrear_cleared} onChange={handleT3}
                        label="Is property tax arrear cleared?"
                      >
                        {[
                          'Yes — Nil Due Certificate attached',
                          'No — will clear at mutation time',
                        ].map(ta => <MenuItem key={ta} value={ta}>{ta}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              {/* ── Step 3: Documents ── */}
              {activeStep === 3 && (
                <Grid container spacing={2}>
                  <SectionHeading>Required Documents</SectionHeading>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Registered Sale Deed / Gift Deed / Will *" name="sale_deed"
                      required docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Previous Owner Identity Proof *" name="prev_owner_id"
                      required docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="New Owner Identity Proof (Aadhaar) *" name="new_owner_id"
                      required docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Encumbrance Certificate" name="encumbrance_cert"
                      hint="From Sub-Registrar — shows no dues on property"
                      docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Nil Property Tax Due Certificate" name="nil_tax_cert"
                      hint="From Municipal Tax Dept"
                      docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Death Certificate of Previous Owner" name="death_cert"
                      hint="Required for inheritance cases"
                      docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Probate / Legal Heir Certificate" name="heir_cert"
                      hint="Required for inheritance without will"
                      docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DocUpload
                      label="Court Order" name="court_order"
                      hint="Required if transfer by court decree"
                      docs={t3Docs} onFileChange={t3DocH.onFileChange} onRemove={t3DocH.onRemove}
                    />
                  </Grid>
                </Grid>
              )}

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">Back</Button>
                {activeStep < MUTATION_STEPS.length - 1 ? (
                  <Button
                    variant="contained" onClick={handleNext}
                    sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="contained" onClick={() => setShowOtpDialog(true)}
                    disabled={t3Submitting}
                    startIcon={t3Submitting ? <CircularProgress size={18} color="inherit" /> : null}
                    sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: HOVER_COLOR } }}
                  >
                    {t3Submitting ? 'Submitting...' : 'Submit Mutation Request'}
                  </Button>
                )}
              </Box>
            </>
          )}
        </TabPanel>

        {/* ═══════════════════════════════════════════════════════════
            TAB 4 — View Tax Receipts  (no stepper)
        ════════════════════════════════════════════════════════════ */}
        <TabPanel value={tab} index={4}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Property ID"
                value={t4PropertyId}
                onChange={e => setT4PropertyId(e.target.value)}
                placeholder="e.g. WARD05-2023-1234"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth variant="outlined"
                sx={{ height: 56, borderColor: HEADER_COLOR, color: HEADER_COLOR }}
                onClick={fetchReceipts}
              >
                Search
              </Button>
            </Grid>

            {receipts && (
              <Grid item xs={12}>
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: HEADER_COLOR }}>
                      <TableRow>
                        {['Year', 'Amount Paid', 'Date Paid', 'Receipt No', 'Download'].map(h => (
                          <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receipts.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{r.year}</TableCell>
                          <TableCell>₹{r.amount.toLocaleString()}</TableCell>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>
                            <Chip label={r.receipt} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small" variant="outlined"
                              startIcon={<DownloadIcon />}
                              sx={{ textTransform: 'none' }}
                            >
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Tax records available from 2015 onwards. For older records, contact the Municipal Records Section.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={tab === 1 ? t1.email || '' : tab === 2 ? t2.email || '' : tab === 3 ? t3.new_email || '' : ''}
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

