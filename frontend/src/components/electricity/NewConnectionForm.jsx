import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
} from '@mui/material';
import { CheckCircle as SuccessIcon, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import DocUpload from '../municipal/DocUpload';

const OFFLINE_QUEUE_KEY = 'electricity_new_connection_offline_queue_v1';

const readOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeOfflineQueue = (queue) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const makeOfflineReferenceNumber = () => `OFF-APP-${Date.now()}`;

const steps = ['Applicant Details', 'Premises Information', 'Connection Details', 'Documents', 'Review & Submit'];

const categories = [
  { value: 'LT-I(A)', label: 'LT-I(A) - Domestic (Single Phase)', type: 'domestic' },
  { value: 'LT-I(B)', label: 'LT-I(B) - Domestic (Three Phase)', type: 'domestic' },
  { value: 'LT-II', label: 'LT-II - Commercial', type: 'commercial' },
  { value: 'LT-III', label: 'LT-III - Industrial', type: 'industrial' },
  { value: 'LT-IV', label: 'LT-IV - Agricultural', type: 'agricultural' },
  { value: 'LT-V', label: 'LT-V - Street Lighting', type: 'street_lighting' },
  { value: 'HT-I', label: 'HT-I - High Tension Industrial', type: 'industrial' },
  { value: 'HT-II', label: 'HT-II - High Tension Commercial', type: 'commercial' },
];

const loadTypes = [
  { value: 'single_phase', label: 'Single Phase (Up to 10 KW)' },
  { value: 'three_phase', label: 'Three Phase (Above 10 KW)' },
];

const commonLoads = [
  { value: '1', label: '1 KW' },
  { value: '2', label: '2 KW' },
  { value: '3', label: '3 KW' },
  { value: '5', label: '5 KW' },
  { value: '7.5', label: '7.5 KW' },
  { value: '10', label: '10 KW' },
  { value: '15', label: '15 KW' },
  { value: '20', label: '20 KW' },
  { value: '25', label: '25 KW' },
  { value: '50', label: '50 KW' },
  { value: '100', label: '100 KW' },
  { value: 'custom', label: 'Custom Load' },
];

const ownershipTypes = [
  { value: 'owned', label: 'Self Owned' },
  { value: 'rented', label: 'Rented' },
  { value: 'leased', label: 'Leased' },
  { value: 'government', label: 'Government Property' },
];

const identityProofs = [
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
];

const states = [
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Haryana', label: 'Haryana' },
];

const districtsMap = {
  'Maharashtra': ['Pune', 'Mumbai', 'Mumbai Suburban', 'Thane', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Satara', 'Sangli', 'Ratnagiri', 'Ahmednagar', 'Jalgaon', 'Dhule', 'Nanded', 'Latur', 'Osmanabad', 'Beed', 'Parbhani', 'Hingoli', 'Akola', 'Amravati', 'Yavatmal', 'Buldhana', 'Washim', 'Wardha', 'Chandrapur', 'Gadchiroli', 'Bhandara', 'Gondia', 'Raigad', 'Sindhudurg', 'Palghar'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Kutch', 'Mehsana', 'Anand', 'Bharuch'],
  'Karnataka': ['Bangalore Urban', 'Bangalore Rural', 'Mysore', 'Belgaum', 'Hubli-Dharwad', 'Mangalore', 'Gulbarga', 'Bellary', 'Shimoga', 'Tumkur', 'Davangere'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bharatpur', 'Sikar', 'Pali'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Rewa', 'Satna', 'Dewas', 'Ratlam'],
  'Goa': ['North Goa', 'South Goa'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Anantapur'],
  'Telangana': ['Hyderabad', 'Rangareddy', 'Medchal', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Mahbubnagar'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thanjavur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad', 'Malappuram'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Ghaziabad', 'Noida', 'Bareilly', 'Aligarh'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'West Bengal': ['Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Nadia', 'Burdwan', 'Siliguri'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Begusarai', 'Bihar Sharif'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat'],
};

const purposeOptions = [
  { value: 'residential', label: 'Residential / House' },
  { value: 'flat', label: 'Flat / Apartment' },
  { value: 'shop', label: 'Shop / Showroom' },
  { value: 'office', label: 'Office / Commercial Space' },
  { value: 'restaurant', label: 'Restaurant / Hotel' },
  { value: 'hospital', label: 'Hospital / Clinic / Nursing Home' },
  { value: 'school', label: 'School / College / Educational Institute' },
  { value: 'factory', label: 'Factory / Manufacturing Unit' },
  { value: 'warehouse', label: 'Warehouse / Godown' },
  { value: 'workshop', label: 'Workshop / Garage' },
  { value: 'agriculture', label: 'Agriculture / Irrigation Pump' },
  { value: 'poultry', label: 'Poultry Farm' },
  { value: 'dairy', label: 'Dairy Farm' },
  { value: 'cold_storage', label: 'Cold Storage' },
  { value: 'petrol_pump', label: 'Petrol Pump' },
  { value: 'temple', label: 'Temple / Religious Place' },
  { value: 'community_hall', label: 'Community Hall / Marriage Hall' },
  { value: 'other', label: 'Other' },
];



const builtUpAreaOptions = [
  { value: '500', label: 'Up to 500 Sq.Ft' },
  { value: '1000', label: '500 - 1000 Sq.Ft' },
  { value: '2000', label: '1000 - 2000 Sq.Ft' },
  { value: '3000', label: '2000 - 3000 Sq.Ft' },
  { value: '5000', label: '3000 - 5000 Sq.Ft' },
  { value: '10000', label: '5000 - 10000 Sq.Ft' },
  { value: '20000', label: '10000 - 20000 Sq.Ft' },
  { value: 'above', label: 'Above 20000 Sq.Ft' },
];

// Dynamic document requirements based on category type
const documentRequirements = {
  domestic: [
    { key: 'id_proof', label: 'Identity Proof', description: 'Aadhar Card / PAN Card / Voter ID / Passport', required: true },
    { key: 'address_proof', label: 'Address Proof', description: 'Electricity Bill / Gas Bill / Bank Statement / Rent Agreement', required: true },
    { key: 'ownership_proof', label: 'Property Ownership Proof', description: 'Property Tax Receipt / Sale Deed / Registry / Allotment Letter', required: true },
    { key: 'noc', label: 'No Objection Certificate', description: 'NOC from Owner (for rented/leased property)', required: false },
    { key: 'photo', label: 'Passport Size Photo', description: 'Recent passport size photograph', required: true },
  ],
  commercial: [
    { key: 'id_proof', label: 'Identity Proof', description: 'Aadhar Card / PAN Card of Proprietor/Director', required: true },
    { key: 'address_proof', label: 'Address Proof', description: 'Utility Bill / Bank Statement', required: true },
    { key: 'ownership_proof', label: 'Property Ownership Proof', description: 'Property Tax Receipt / Sale Deed / Lease Agreement', required: true },
    { key: 'shop_registration', label: 'Shop Registration / Trade License', description: 'Shop & Establishment Certificate / Trade License from Municipal Corporation', required: true },
    { key: 'gst_certificate', label: 'GST Registration Certificate', description: 'GST Certificate (if applicable)', required: false },
    { key: 'partnership_deed', label: 'Partnership Deed / MOA', description: 'For Partnership Firm or Company', required: false },
    { key: 'photo', label: 'Passport Size Photo', description: 'Photo of Proprietor/Partner/Director', required: true },
  ],
  industrial: [
    { key: 'id_proof', label: 'Identity Proof', description: 'Aadhar Card / PAN Card of Proprietor/Director', required: true },
    { key: 'address_proof', label: 'Address Proof', description: 'Utility Bill / Bank Statement', required: true },
    { key: 'ownership_proof', label: 'Property/Land Ownership Proof', description: 'Property Document / Lease Agreement / Allotment Letter', required: true },
    { key: 'factory_license', label: 'Factory License', description: 'License under Factories Act / MSME Registration / Udyam Certificate', required: true },
    { key: 'pollution_noc', label: 'Pollution Control NOC', description: 'NOC from State Pollution Control Board', required: true },
    { key: 'gst_certificate', label: 'GST Registration Certificate', description: 'GST Certificate', required: true },
    { key: 'load_schedule', label: 'Load Schedule / Equipment List', description: 'Detailed list of electrical equipment with load in KW', required: true },
    { key: 'electrical_layout', label: 'Electrical Layout Plan', description: 'Single Line Diagram approved by Licensed Electrical Contractor', required: true },
    { key: 'moa', label: 'MOA / Partnership Deed', description: 'For Company or Partnership Firm', required: false },
  ],
  agricultural: [
    { key: 'id_proof', label: 'Identity Proof', description: 'Aadhar Card / Voter ID / PAN Card of Farmer', required: true },
    { key: 'seven_twelve', label: '7/12 Extract (Saat Baara)', description: 'Latest 7/12 Extract from Talathi Office', required: true },
    { key: 'eight_a', label: '8-A Extract', description: 'Khata Extract showing land ownership', required: true },
    { key: 'crop_declaration', label: 'Crop Pattern Declaration', description: 'Declaration of crops to be irrigated', required: true },
    { key: 'pump_details', label: 'Pump Set Details', description: 'Make, HP, and specifications of pump', required: true },
    { key: 'well_certificate', label: 'Well Completion Certificate', description: 'Certificate from Agriculture Department', required: false },
    { key: 'photo', label: 'Passport Size Photo', description: 'Recent passport size photograph', required: true },
  ],
  street_lighting: [
    { key: 'authorization', label: 'Municipal Authorization Letter', description: 'Authorization from Municipal Corporation / Gram Panchayat', required: true },
    { key: 'area_map', label: 'Area Map with Light Points', description: 'Map showing location of light points', required: true },
    { key: 'load_calculation', label: 'Load Calculation Sheet', description: 'Details of wattage and number of lights', required: true },
    { key: 'resolution', label: 'Resolution / Board Decision', description: 'Copy of resolution approving the connection', required: true },
    { key: 'authorized_signatory', label: 'Authorized Signatory ID', description: 'ID proof of authorized signatory', required: true },
  ],
};

const NewConnectionForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [customLoad, setCustomLoad] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const isSyncingOfflineRef = useRef(false);
  const [formData, setFormData] = useState({
    // Applicant Details
    full_name: '',
    father_husband_name: '',
    date_of_birth: '',
    gender: 'male',
    identity_type: 'aadhar',
    identity_number: '',
    pan_number: '',
    email: '',
    mobile: '',
    alternate_mobile: '',

    // Premises Information
    premises_address: '',
    landmark: '',
    district: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    ownership_type: 'owned',
    plot_number: '',
    khata_number: '',

    // Connection Details
    category: 'LT-I(A)',
    load_type: 'single_phase',
    required_load: '2',
    purpose: 'residential',
    existing_consumer_number: '',

    // Supply Details
    supply_voltage: '230V',
    phases: '1',
    connected_load: '',
    number_of_floors: '1',
    built_up_area: '1000',
  });

  // Get category type for dynamic documents
  const getCategoryType = () => {
    const category = categories.find(c => c.value === formData.category);
    return category?.type || 'domestic';
  };

  // Get required documents based on category
  const requiredDocuments = useMemo(() => {
    return documentRequirements[getCategoryType()] || documentRequirements.domestic;
  }, [formData.category]);

  // Get districts based on selected state
  const districts = useMemo(() => {
    return districtsMap[formData.state] || [];
  }, [formData.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-update supply voltage and phases based on load type
    if (name === 'load_type') {
      if (value === 'single_phase') {
        setFormData(prev => ({ ...prev, load_type: value, supply_voltage: '230V', phases: '1' }));
      } else {
        setFormData(prev => ({ ...prev, load_type: value, supply_voltage: '415V', phases: '3' }));
      }
    }

    // Handle load selection
    if (name === 'required_load') {
      if (value === 'custom') {
        setCustomLoad(true);
        setFormData(prev => ({ ...prev, required_load: '' }));
      } else {
        setCustomLoad(false);
      }
    }

    // Reset district when state changes
    if (name === 'state') {
      setFormData(prev => ({ ...prev, state: value, district: '' }));
    }

    // Reset uploaded docs when category changes
    if (name === 'category') {
      setUploadedDocs({});
    }
  };

  const handleFileChange = (docKey) => async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should not exceed 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocs(prev => ({
        ...prev,
        [docKey]: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result.split(',')[1],
        }
      }));
      toast.success(`${file.name} uploaded successfully`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    handleSubmit(email);
  };

  const processOfflineQueue = async () => {
    if (isSyncingOfflineRef.current || !navigator.onLine) return;

    const queue = readOfflineQueue();
    if (!queue.length) return;

    isSyncingOfflineRef.current = true;
    let syncedCount = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        const response = await api.post('/electricity/applications/submit', item.payload);
        const appNum = response?.data?.application_number;

        if (appNum && item.email) {
          api.post('/electricity/otp/send-receipt', {
            email: item.email,
            application_number: appNum,
            application_type: 'new_connection',
            application_data: item.payload.application_data,
            submitted_at: item.submittedAt || new Date().toISOString(),
          }).catch(console.warn);
        }

        syncedCount += 1;
      } catch (err) {
        // Keep failed entries for next retry.
        remaining.push(item);
      }
    }

    writeOfflineQueue(remaining);
    isSyncingOfflineRef.current = false;

    if (syncedCount > 0) {
      toast.success(`${syncedCount} offline application(s) synced successfully`);
    }
  };

  useEffect(() => {
    const onOnline = () => {
      processOfflineQueue();
    };

    window.addEventListener('online', onOnline);
    processOfflineQueue();

    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const handleSubmit = async (email) => {
    const payload = {
      application_type: 'new_connection',
      application_data: formData,
      documents: Object.entries(uploadedDocs)
        .filter(([_, doc]) => doc !== null)
        .map(([type, doc]) => ({
          ...doc,
          documentType: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          uploadedAt: new Date().toISOString(),
        })),
    };

    try {
      const response = await api.post('/electricity/applications/submit', payload);

      const appNum = response?.data?.application_number
        || response?.data?.reference_number
        || makeOfflineReferenceNumber();
      const queuedOffline = Boolean(response?.data?.offline_queued);
      const ts = new Date().toISOString();
      setApplicationNumber(appNum);
      setSubmitted(true);
      setIsOfflineQueued(queuedOffline);
      setVerifiedEmail(email);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success(queuedOffline ? 'Application saved offline with reference number.' : 'Application submitted successfully!');

      if (!queuedOffline) {
        api.post('/electricity/otp/send-receipt', {
          email,
          application_number: appNum,
          application_type: 'new_connection',
          application_data: formData,
          submitted_at: ts,
        }).catch(console.warn);
      }
    } catch (error) {
      if (!error.response || !navigator.onLine) {
        try {
          const ts = new Date().toISOString();
          const offlineRef = makeOfflineReferenceNumber();
          const queue = readOfflineQueue();
          queue.push({
            id: `offline-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            email,
            submittedAt: ts,
            referenceNumber: offlineRef,
            payload,
          });
          writeOfflineQueue(queue);

          setSubmitted(true);
          setIsOfflineQueued(true);
          setVerifiedEmail(email);
          setSubmittedAt(ts);
          setApplicationNumber(offlineRef);
          setShowReceipt(true);
          toast.success('No internet. Application saved locally with reference number and printable receipt.');
          return;
        } catch {
          toast.error('No internet and local save failed. Please try again.');
          return;
        }
      }

      console.error('Submission error:', error);
      let errorMessage = 'Failed to submit application';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle express-validator errors
        errorMessage = error.response.data.errors
          .map(e => `${e.path}: ${e.msg}`)
          .join(', ');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">Applicant Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name *"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Father's/Husband's Name *"
                name="father_husband_name"
                value={formData.father_husband_name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Date of Birth *"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Gender *</FormLabel>
                <RadioGroup
                  row
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <FormControlLabel value="male" control={<Radio />} label="Male" />
                  <FormControlLabel value="female" control={<Radio />} label="Female" />
                  <FormControlLabel value="other" control={<Radio />} label="Other" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Identity Proof Type *"
                name="identity_type"
                value={formData.identity_type}
                onChange={handleChange}
                required
              >
                {identityProofs.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Identity Proof Number *"
                name="identity_number"
                value={formData.identity_number}
                onChange={handleChange}
                inputProps={{ maxLength: 16 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PAN Number"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
                helperText="Required for load above 5 KW"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email Address *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mobile Number *"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Alternate Mobile Number"
                name="alternate_mobile"
                value={formData.alternate_mobile}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">Premises Details</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Premises Address *"
                name="premises_address"
                value={formData.premises_address}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="House/Flat No., Building Name, Street, Area"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Plot/House/Flat Number *"
                name="plot_number"
                value={formData.plot_number}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="Near landmark"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="State *"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
              >
                {states.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="District *"
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
                disabled={!formData.state}
              >
                {districts.map((district) => (
                  <MenuItem key={district} value={district}>
                    {district}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City/Village *"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Pincode *"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                inputProps={{ maxLength: 6 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Khata/Survey Number"
                name="khata_number"
                value={formData.khata_number}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Ownership Type *"
                name="ownership_type"
                value={formData.ownership_type}
                onChange={handleChange}
                required
              >
                {ownershipTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Built-up Area *"
                name="built_up_area"
                value={formData.built_up_area}
                onChange={handleChange}
                required
              >
                {builtUpAreaOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">Connection Requirements</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Connection Category *"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                helperText="Select based on your usage type"
              >
                {categories.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Purpose of Connection *"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                required
              >
                {purposeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Load Type *"
                name="load_type"
                value={formData.load_type}
                onChange={handleChange}
                required
              >
                {loadTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              {!customLoad ? (
                <TextField
                  fullWidth
                  select
                  label="Required Load (KW) *"
                  name="required_load"
                  value={formData.required_load}
                  onChange={handleChange}
                  required
                >
                  {commonLoads.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth
                  label="Enter Custom Load (KW) *"
                  name="required_load"
                  type="number"
                  value={formData.required_load}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                  required
                  helperText={
                    <Button size="small" onClick={() => setCustomLoad(false)}>
                      Select from preset values
                    </Button>
                  }
                />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supply Voltage"
                name="supply_voltage"
                value={formData.supply_voltage}
                InputProps={{ readOnly: true }}
                helperText="Auto-selected based on load type"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Number of Phases"
                name="phases"
                value={formData.phases === '1' ? 'Single Phase' : 'Three Phase'}
                InputProps={{ readOnly: true }}
                helperText="Auto-selected based on load type"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Existing Consumer Number (if any)"
                name="existing_consumer_number"
                value={formData.existing_consumer_number}
                onChange={handleChange}
                helperText="For additional connection or load enhancement"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Category Selected:</strong> {categories.find(c => c.value === formData.category)?.label}
                  <br />
                  <strong>Document Requirements:</strong> Documents will be shown in the next step based on your selected category.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Required Documents for {categories.find(c => c.value === formData.category)?.label}
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Please upload scanned copies or clear photos (PDF/JPG/PNG, Max 5MB each).
                <Chip label={getCategoryType().toUpperCase()} color="primary" size="small" sx={{ ml: 1 }} />
              </Alert>
            </Grid>

            {requiredDocuments.map((doc, index) => (
              <Grid item xs={12} key={doc.key}>
                <Box sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: uploadedDocs[doc.key] ? 'success.main' : 'divider',
                  borderRadius: 2,
                  bgcolor: uploadedDocs[doc.key] ? 'success.50' : 'background.paper'
                }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    {index + 1}. {doc.label} {doc.required && <span style={{ color: 'red' }}>*</span>}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {doc.description}
                  </Typography>
                  <DocUpload
                    label={`${index + 1}. ${doc.label}`}
                    name={doc.key}
                    required={doc.required}
                    docs={uploadedDocs}
                    onFileChange={(name, file) => {
                      if (!file) return;
                      if (file instanceof File) {
                        handleFileChange(name)({ target: { files: [file] } });
                      } else {
                        setUploadedDocs(prev => ({ ...prev, [name]: file }));
                        toast.success(`${file.name || 'File'} uploaded`);
                      }
                    }}
                    onRemove={(name) => setUploadedDocs(prev => {
                      const next = { ...prev };
                      delete next[name];
                      return next;
                    })}
                    accept="image/*,application/pdf"
                    hint={doc.description}
                    enableQr
                    qrLabel={doc.label}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">Review Your Application</Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Please verify all details carefully before submitting. Incorrect information may lead to rejection.
            </Alert>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Applicant Details</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}><Typography variant="body2">Name:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.full_name}</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Father's/Husband's Name:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.father_husband_name}</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Identity Proof:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.identity_type.toUpperCase()} - {formData.identity_number}</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Mobile:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.mobile}</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Email:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.email}</Typography></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Premises Information</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={12}><Typography variant="body2" fontWeight={600}>{formData.premises_address}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2">Plot: {formData.plot_number}, {formData.city}, {formData.district}, {formData.state} - {formData.pincode}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">Ownership:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.ownership_type.toUpperCase()}</Typography></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Connection Details</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}><Typography variant="body2">Category:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{categories.find(c => c.value === formData.category)?.label}</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Purpose:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{purposeOptions.find(p => p.value === formData.purpose)?.label}</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Required Load:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.required_load} KW</Typography></Grid>

              <Grid item xs={6}><Typography variant="body2">Supply:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" fontWeight={600}>{formData.supply_voltage}, {formData.phases} Phase</Typography></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Documents Uploaded</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {Object.keys(uploadedDocs).map(key => (
                <Chip
                  key={key}
                  label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  color="success"
                  size="small"
                  icon={<SuccessIcon />}
                />
              ))}
              {Object.keys(uploadedDocs).length === 0 && (
                <Typography variant="body2" color="error">No documents uploaded</Typography>
              )}
            </Box>

            <Alert severity="success" sx={{ mt: 3 }}>
              Application Fee: ₹ {formData.load_type === 'single_phase' ? '100' : '500'} (To be paid at service center)
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          {isOfflineQueued ? 'Application Saved Offline' : 'Application Submitted Successfully!'}
        </Typography>
        <Typography variant="h6" color="primary" gutterBottom sx={{ my: 3 }}>
          {`Application Number: ${applicationNumber}`}
        </Typography>
        <Typography color="text.secondary" paragraph>
          {isOfflineQueued
            ? 'Your application is saved on this device and will be uploaded automatically when internet is available.'
            : 'Your new connection application has been received and will be processed within 7-15 working days.'}
        </Typography>
        <Alert severity={isOfflineQueued ? 'warning' : 'info'} sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
          <Typography variant="body2" gutterBottom>
            <strong>{isOfflineQueued ? 'Sync Steps:' : 'Next Steps:'}</strong>
          </Typography>
          <Typography variant="body2">
            {isOfflineQueued ? (
              <>
                1. Keep internet enabled on this device<br />
                2. The app will auto-upload this saved application<br />
                3. You will receive receipt email after successful sync<br />
                4. Local copy is deleted automatically after successful cloud upload
              </>
            ) : (
              <>
                1. Site inspection will be conducted within 3 working days<br />
                2. You will receive a demand note with estimated charges<br />
                3. Connection will be provided after payment and approval<br />
                4. Track your application using the application number
              </>
            )}
          </Typography>
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setShowReceipt(true)}>
            Print Receipt
          </Button>
          <Button variant="contained" onClick={onClose} size="large">
            Close
          </Button>
        </Box>
        <ApplicationReceipt
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          applicationNumber={applicationNumber}
          applicationType="new_connection"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box>
      <DialogTitle
        sx={{
          px: 3,
          py: 2,
          bgcolor: '#eaf2ff',
          borderBottom: '1px solid #cfe0ff',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, color: '#0f4aa6' }}>
            New Electricity Connection Application
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, color: '#2a436f', fontWeight: 500 }}>
            Fill all required fields marked with *
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 0.5 }} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400, pt: 1 }}>
          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={() => setShowOtpDialog(true)} size="large">
            Submit Application
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        )}
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.email || ''}
        initialMobile={formData.mobile || ''}
      />
    </Box>
  );
};

export default NewConnectionForm;
