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

const HEADER_COLOR = '#00695c';
const WARDS = Array.from({ length: 10 }, (_, i) => 'Ward ' + (i + 1));

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const TAB_STEPS = [
  ['Applicant Details', 'Establishment Details', 'Premises Inspection Info', 'Documents'],
  ['Business & Owner', 'Premises Details', 'Safety & Compliance', 'Documents'],
  ['Your Details & Location', 'Request Details'],
  ['Project Applicant', 'Project Details', 'Environmental Impact', 'Compliance Info', 'Documents'],
];

const MunicipalHealthEnvForm = ({ onClose }) => {
  const [tab, setTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refNumber, setRefNumber] = useState('');

  const [formData, setFormData] = useState({
    // Tab 0 — Health / Hygiene License
    hl_name: '', hl_mobile: '', hl_email: '', hl_aadhaar: '', hl_pan: '',
    hl_father_name: '', hl_dob: '', hl_gender: '', hl_address: '', hl_ward: '',
    hl_license_type: '', hl_existing_license: '',
    hl_business_name: '', hl_trade_name: '', hl_establishment_type: '',
    hl_business_address: '', hl_biz_ward: '', hl_year_started: '',
    hl_num_employees: '', hl_daily_customers: '', hl_hours_from: '', hl_hours_to: '',
    hl_involves_food: 'No', hl_involves_animal: 'No',
    hl_premises_area: '', hl_kitchen_area: '', hl_seating_capacity: '',
    hl_water_source: '', hl_waste_disposal: '', hl_staff_washrooms: '',
    hl_customer_washrooms: '', hl_drainage_connected: 'No', hl_ventilation: '',
    hl_health_cert: 'No', hl_pest_control: 'No', hl_pest_last_date: '',
    hl_violation_notices: 'No',
    // Tab 1 — Food Establishment License
    fe_establishment_name: '', fe_establishment_type: '', fe_legal_entity: '',
    fe_proprietor_name: '', fe_proprietor_mobile: '', fe_proprietor_email: '',
    fe_proprietor_aadhaar: '', fe_fssai_no: '', fe_gst_no: '',
    fe_address: '', fe_ward: '', fe_pincode: '', fe_year_established: '',
    fe_floor_area: '', fe_seating_indoor: '', fe_seating_outdoor: '',
    fe_kitchen_area: '', fe_storage_area: '', fe_num_floors: '',
    fe_lift: 'No', fe_parking: 'No',
    fe_water_source: '', fe_cold_storage: 'No', fe_cold_storage_capacity: '',
    fe_fuel_type: '',
    fe_fire_noc: '', fe_fire_noc_number: '', fe_building_noc: 'No',
    fe_wastewater_drain: 'No', fe_solid_waste: '',
    fe_pest_control: 'No', fe_food_handler_cert: 'No', fe_cctv: 'No',
    fe_menu_languages: '', fe_alcohol_served: 'No', fe_liquor_license_no: '',
    fe_outdoor_seating: 'No', fe_home_delivery: 'No', fe_aggregator: '',
    // Tab 2 — Fogging / Vector Control
    fv_name: '', fv_mobile: '', fv_email: '', fv_aadhaar: '',
    fv_address: '', fv_ward: '', fv_contact_person: '',
    fv_request_type: '', fv_premises_type: '', fv_area: '',
    fv_infestation_level: '', fv_reason: '', fv_preferred_dates: '',
    fv_vehicle_accessible: 'Yes', fv_special_precautions: '', fv_additional_details: '',
    // Tab 3 — Environmental Clearance
    ec_org_name: '', ec_applicant_type: '', ec_contact_person: '',
    ec_designation: '', ec_email: '', ec_mobile: '',
    ec_address: '', ec_gst_cin: '', ec_aadhaar_director: '',
    ec_project_name: '', ec_project_type: '', ec_project_location: '',
    ec_ward: '', ec_project_area: '', ec_project_cost: '',
    ec_start_date: '', ec_completion_date: '', ec_eia_category: '',
    ec_crz: 'No', ec_eco_sensitive: 'No',
    ec_water_req: '', ec_water_source: '', ec_wastewater_gen: '',
    ec_stp_etp: 'No', ec_air_emissions: 'No', ec_air_emissions_desc: '',
    ec_noise_levels: '', ec_solid_waste: '', ec_waste_disposal: '',
    ec_green_area: '', ec_rainwater: 'No', ec_solar: 'No', ec_water_body_impact: '',
    ec_spcb_status: '', ec_prev_violation: 'No', ec_agri_forest_land: 'No',
    ec_displacement: 'No', ec_rr_plan: 'No',
    ec_public_consultation: 'No', ec_consultation_date: '',
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
        if (!d.hl_name) return 'Full Name is required';
        if (!d.hl_mobile || d.hl_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.hl_email) return 'Email is required';
        if (!d.hl_aadhaar || d.hl_aadhaar.length !== 12) return 'Valid 12-digit Aadhaar required';
        if (!d.hl_father_name) return 'Father/Husband Name is required';
        if (!d.hl_dob) return 'Date of Birth is required';
        if (!d.hl_address) return 'Permanent Address is required';
        if (!d.hl_ward) return 'Ward is required';
        if (!d.hl_license_type) return 'Please select New License or Renewal';
      }
      if (activeStep === 1) {
        if (!d.hl_business_name) return 'Business/Establishment Name is required';
        if (!d.hl_establishment_type) return 'Type of Establishment is required';
        if (!d.hl_business_address) return 'Business Address is required';
        if (!d.hl_biz_ward) return 'Ward is required';
        if (!d.hl_year_started) return 'Year Establishment Started is required';
        if (!d.hl_num_employees) return 'Number of Employees is required';
      }
      if (activeStep === 2) {
        if (!d.hl_premises_area) return 'Total Area of Premises is required';
      }
      if (activeStep === 3) {
        if (!docs.hl_shop_reg) return 'Shop/Establishment Registration Certificate is required';
        if (!docs.hl_id_proof) return 'Proprietor ID Proof (Aadhaar) is required';
        if (!docs.hl_property_proof) return 'Property Ownership / Rent Agreement is required';
      }
    }
    if (tab === 1) {
      if (activeStep === 0) {
        if (!d.fe_establishment_name) return 'Establishment Name is required';
        if (!d.fe_establishment_type) return 'Type of Establishment is required';
        if (!d.fe_proprietor_name) return 'Proprietor / Director Name is required';
        if (!d.fe_proprietor_mobile || d.fe_proprietor_mobile.length !== 10) return 'Valid 10-digit Proprietor Mobile required';
        if (!d.fe_proprietor_email) return 'Proprietor Email is required';
        if (!d.fe_proprietor_aadhaar || d.fe_proprietor_aadhaar.length !== 12) return 'Valid 12-digit Proprietor Aadhaar required';
        if (!d.fe_fssai_no) return 'FSSAI Registration/License No is required';
        if (!d.fe_address) return 'Establishment Address is required';
        if (!d.fe_ward) return 'Ward is required';
        if (!d.fe_year_established) return 'Year of Establishment is required';
      }
      if (activeStep === 1) {
        if (!d.fe_floor_area) return 'Total Floor Area is required';
        if (!d.fe_seating_indoor) return 'Indoor Seating Capacity is required';
        if (!d.fe_kitchen_area) return 'Kitchen Area is required';
      }
      if (activeStep === 3) {
        if (!docs.fe_fssai_cert) return 'FSSAI Registration Certificate is required';
        if (!docs.fe_shop_reg) return 'Shop/Establishment Registration is required';
        if (!docs.fe_id_proof) return 'Proprietor Aadhaar document is required';
        if (!docs.fe_property_proof) return 'Property Ownership Proof / Rent Agreement is required';
      }
    }
    if (tab === 2) {
      if (activeStep === 0) {
        if (!d.fv_name) return 'Full Name is required';
        if (!d.fv_mobile || d.fv_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.fv_address) return 'Complete Address (where fogging is needed) is required';
        if (!d.fv_ward) return 'Ward is required';
      }
      if (activeStep === 1) {
        if (!d.fv_request_type) return 'Request Type is required';
        if (!d.fv_premises_type) return 'Premises Type is required';
        if (!d.fv_reason) return 'Reason for Request is required';
      }
    }
    if (tab === 3) {
      if (activeStep === 0) {
        if (!d.ec_org_name) return 'Organisation / Applicant Name is required';
        if (!d.ec_contact_person) return 'Contact Person Name is required';
        if (!d.ec_designation) return 'Designation is required';
        if (!d.ec_email) return 'Email is required';
        if (!d.ec_mobile || d.ec_mobile.length !== 10) return 'Valid 10-digit mobile required';
        if (!d.ec_address) return 'Organisation Registered Address is required';
      }
      if (activeStep === 1) {
        if (!d.ec_project_name) return 'Project Name is required';
        if (!d.ec_project_type) return 'Project Type is required';
        if (!d.ec_project_location) return 'Project Location is required';
        if (!d.ec_ward) return 'Ward is required';
        if (!d.ec_project_area) return 'Project Area is required';
        if (!d.ec_project_cost) return 'Project Cost is required';
        if (!d.ec_start_date) return 'Proposed Start Date is required';
        if (!d.ec_completion_date) return 'Estimated Completion Date is required';
      }
      if (activeStep === 2) {
        if (!d.ec_water_req) return 'Water Requirement (KLD) is required';
        if (!d.ec_waste_disposal) return 'Waste Disposal Arrangement is required';
        if (!d.ec_green_area) return 'Green Area / Plantation Proposed is required';
      }
      if (activeStep === 4) {
        if (!docs.ec_project_plan) return 'Project Plan / Site Layout is required';
        if (!docs.ec_land_docs) return 'Land Ownership / Lease Documents are required';
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
    const types = ['health_hygiene_license', 'food_establishment_license', 'fogging_vector_control', 'environmental_clearance'];
    return types[tab];
  };

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
      const appType = getAppType();
      const emailMap = [formData.hl_email, formData.fe_proprietor_email, formData.fv_email, formData.ec_email];
      const emailVal = email || emailMap[tab] || '';
      const res = await api.post('/municipal/applications/submit', {
        application_type: appType,
        application_data: formData,
        documents: docsArray,
      });
      const appNum = res.data?.data?.application_number || res.data?.reference_number || `MHE${Date.now()}`;
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
      setRefNumber('MHE' + Date.now());
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    }
  };

  if (submitted) return (
    <Box>
      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" color="success.main" gutterBottom>Application Submitted!</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>Your reference number is</Typography>
        <Chip label={refNumber} sx={{ bgcolor: HEADER_COLOR, color: 'white', fontSize: '1.1rem', py: 2, px: 3, mb: 3 }} />
        <Alert severity="info" sx={{ textAlign: 'left' }}>
          {tab === 0 && 'Your Health/Hygiene License application has been received. Premises inspection will be scheduled within 7 working days. License is issued after a successful inspection.'}
          {tab === 1 && 'Food Establishment License application submitted. A health inspector will visit your premises within 10 working days. Keep all documents ready for inspection.'}
          {tab === 2 && 'Fogging/Vector Control request registered successfully. The schedule will be confirmed within 5–7 working days. For dengue/malaria emergency, call Health Control Room: 1800-XXX-XXXX.'}
          {tab === 3 && 'Environmental Clearance application submitted. A technical review will commence within 15 working days. You will be notified at each stage of the review process.'}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} fullWidth sx={{ bgcolor: HEADER_COLOR }}>Close</Button>
      </DialogActions>
    </Box>
  );

  // ─── Tab 0: Health / Hygiene License ─────────────────────────────────────────
  const renderHLStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Full Name / Proprietor Name" name="hl_name" value={formData.hl_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Mobile" name="hl_mobile" value={formData.hl_mobile} onChange={e => handleMobile('hl_mobile', e.target.value)} inputProps={{ maxLength: 10 }} helperText="10-digit mobile number" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Email" name="hl_email" value={formData.hl_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Aadhaar Number (12 digits)" name="hl_aadhaar" value={formData.hl_aadhaar} onChange={e => handleAadhaar('hl_aadhaar', e.target.value)} inputProps={{ maxLength: 12 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="PAN Card" name="hl_pan" value={formData.hl_pan} onChange={handleChange} inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Father / Husband Name" name="hl_father_name" value={formData.hl_father_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Date of Birth" name="hl_dob" value={formData.hl_dob} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Gender" name="hl_gender" value={formData.hl_gender} onChange={handleChange}>
            {['Male', 'Female', 'Transgender', 'Prefer not to say'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Ward" name="hl_ward" value={formData.hl_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Permanent Address" name="hl_address" value={formData.hl_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Applying for New License or Renewal?" name="hl_license_type" value={formData.hl_license_type} onChange={handleChange}>
            {['New License', 'Renewal'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.hl_license_type === 'Renewal' && (
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Existing License Number" name="hl_existing_license" value={formData.hl_existing_license} onChange={handleChange} placeholder="Enter previous license number" />
          </Grid>
        )}
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Business / Establishment Name" name="hl_business_name" value={formData.hl_business_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Trade Name (if different)" name="hl_trade_name" value={formData.hl_trade_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Type of Establishment" name="hl_establishment_type" value={formData.hl_establishment_type} onChange={handleChange}>
            {['Eating house/Restaurant', 'Hotel/Lodge', 'Dhaba/Food stall', 'Dairy/Milk Distribution', 'Slaughterhouse', 'Meat shop/Fish market', 'Bakery/Confectionery', 'Water supply/Bottling', 'Hair salon/Barber', 'Laundry/Dhobi', 'Swimming pool/Gym', 'Dental clinic/Nursing home', 'Veterinary clinic', 'Any other food/health business'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Ward (Business Location)" name="hl_biz_ward" value={formData.hl_biz_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Business Address" name="hl_business_address" value={formData.hl_business_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Year Establishment Started" name="hl_year_started" value={formData.hl_year_started} onChange={handleChange} type="number" inputProps={{ min: 1900, max: new Date().getFullYear() }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Number of Employees" name="hl_num_employees" value={formData.hl_num_employees} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Daily Customers Served (approx.)" name="hl_daily_customers" value={formData.hl_daily_customers} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="Working Hours From" name="hl_hours_from" value={formData.hl_hours_from} onChange={handleChange} type="time" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="Working Hours To" name="hl_hours_to" value={formData.hl_hours_to} onChange={handleChange} type="time" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Food Preparation Involved?" name="hl_involves_food" value={formData.hl_involves_food} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Animal Products Involved?" name="hl_involves_animal" value={formData.hl_involves_animal} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>Premises Information</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Total Area of Premises (sq.ft)" name="hl_premises_area" value={formData.hl_premises_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Kitchen / Preparation Area (sq.ft)" name="hl_kitchen_area" value={formData.hl_kitchen_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Seating Capacity (if applicable)" name="hl_seating_capacity" value={formData.hl_seating_capacity} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Source of Water Supply" name="hl_water_source" value={formData.hl_water_source} onChange={handleChange}>
            {['Municipal', 'Borewell', 'Both'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Waste Disposal Method" name="hl_waste_disposal" value={formData.hl_waste_disposal} onChange={handleChange}>
            {['Municipal collection', 'Own disposal', 'Contract'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Number of Washrooms (Staff)" name="hl_staff_washrooms" value={formData.hl_staff_washrooms} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Number of Washrooms (Customers)" name="hl_customer_washrooms" value={formData.hl_customer_washrooms} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Drainage Connected to Municipal System?" name="hl_drainage_connected" value={formData.hl_drainage_connected} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Ventilation Type" name="hl_ventilation" value={formData.hl_ventilation} onChange={handleChange}>
            {['Natural', 'Mechanical', 'AC'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Health Certificate for Staff Obtained?" name="hl_health_cert" value={formData.hl_health_cert} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Pest Control Done Regularly?" name="hl_pest_control" value={formData.hl_pest_control} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.hl_pest_control === 'Yes' && (
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Last Pest Control Date" name="hl_pest_last_date" value={formData.hl_pest_last_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Any Violation Notices in Past?" name="hl_violation_notices" value={formData.hl_violation_notices} onChange={handleChange}>
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
          <DocUpload label="Shop / Establishment Registration Certificate" name="hl_shop_reg" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Previous Health License" name="hl_prev_license" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for renewal" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Proprietor ID Proof (Aadhaar)" name="hl_id_proof" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Property Ownership / Rent Agreement" name="hl_property_proof" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="FSSAI License" name="hl_fssai" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for food establishments" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Staff Medical Fitness Certificates" name="hl_staff_medical" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="From registered MBBS doctor" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Water Quality Test Report" name="hl_water_report" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="If using borewell water" />
        </Grid>
      </Grid>
    );
    return null;
  };

  // ─── Tab 1: Food Establishment License ────────────────────────────────────────
  const renderFEStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Establishment Name" name="fe_establishment_name" value={formData.fe_establishment_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Type of Establishment" name="fe_establishment_type" value={formData.fe_establishment_type} onChange={handleChange}>
            {['Full service restaurant', 'Fast food outlet', 'Food court stall', 'Cloud kitchen', 'Bakery', 'Catering service', 'Tea/Coffee shop', 'Mess/Tiffin service', 'Canteen', 'Street food cart', 'Food truck', 'Ice cream parlour', 'Bar/Liquor restaurant', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Legal Entity Type" name="fe_legal_entity" value={formData.fe_legal_entity} onChange={handleChange}>
            {['Sole proprietor', 'Partnership', 'LLP', 'Private limited company', 'NGO/Trust', 'Cooperation'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Proprietor / Director Name" name="fe_proprietor_name" value={formData.fe_proprietor_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Proprietor Mobile" name="fe_proprietor_mobile" value={formData.fe_proprietor_mobile} onChange={e => handleMobile('fe_proprietor_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Proprietor Email" name="fe_proprietor_email" value={formData.fe_proprietor_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Proprietor Aadhaar (12 digits)" name="fe_proprietor_aadhaar" value={formData.fe_proprietor_aadhaar} onChange={e => handleAadhaar('fe_proprietor_aadhaar', e.target.value)} inputProps={{ maxLength: 12 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="FSSAI Registration / License No" name="fe_fssai_no" value={formData.fe_fssai_no} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="GST Number (if applicable)" name="fe_gst_no" value={formData.fe_gst_no} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Pincode" name="fe_pincode" value={formData.fe_pincode} onChange={handleChange} inputProps={{ maxLength: 6 }} />
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField fullWidth required multiline rows={2} label="Establishment Address" name="fe_address" value={formData.fe_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField fullWidth required label="Ward" name="fe_ward" value={formData.fe_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField fullWidth required label="Year of Establishment" name="fe_year_established" value={formData.fe_year_established} onChange={handleChange} type="number" inputProps={{ min: 1900, max: new Date().getFullYear() }} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Total Floor Area (sq.ft)" name="fe_floor_area" value={formData.fe_floor_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Seating Capacity (Indoor)" name="fe_seating_indoor" value={formData.fe_seating_indoor} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Seating Capacity (Outdoor / Open)" name="fe_seating_outdoor" value={formData.fe_seating_outdoor} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Kitchen Area (sq.ft)" name="fe_kitchen_area" value={formData.fe_kitchen_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Storage Area (sq.ft)" name="fe_storage_area" value={formData.fe_storage_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Number of Floors" name="fe_num_floors" value={formData.fe_num_floors} onChange={handleChange} type="number" inputProps={{ min: 1 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Lift Available?" name="fe_lift" value={formData.fe_lift} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Parking Facility?" name="fe_parking" value={formData.fe_parking} onChange={handleChange}>
            {['Yes', 'No', 'Valet'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Water Source" name="fe_water_source" value={formData.fe_water_source} onChange={handleChange}>
            {['Municipal supply', 'Borewell', 'RO', 'Packaged'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth select label="Cold Storage?" name="fe_cold_storage" value={formData.fe_cold_storage} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.fe_cold_storage === 'Yes' && (
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Cold Storage Capacity" name="fe_cold_storage_capacity" value={formData.fe_cold_storage_capacity} onChange={handleChange} placeholder="e.g., 200 kg / 10 cu.ft" />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Fuel Type Used in Kitchen" name="fe_fuel_type" value={formData.fe_fuel_type} onChange={handleChange}>
            {['LPG', 'PNG', 'Electric', 'Biomass', 'Other'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Fire NOC Obtained?" name="fe_fire_noc" value={formData.fe_fire_noc} onChange={handleChange}>
            {['Yes', 'No', 'Applied for'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.fe_fire_noc === 'Yes' && (
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Fire NOC Number" name="fe_fire_noc_number" value={formData.fe_fire_noc_number} onChange={handleChange} />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Building NOC from Municipal?" name="fe_building_noc" value={formData.fe_building_noc} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Wastewater Connected to Municipal Drain?" name="fe_wastewater_drain" value={formData.fe_wastewater_drain} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Solid Waste Management" name="fe_solid_waste" value={formData.fe_solid_waste} onChange={handleChange}>
            {['Municipal pickup', 'Self arrangement'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Pest Control Service Contract?" name="fe_pest_control" value={formData.fe_pest_control} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Food Handler Health Certificates?" name="fe_food_handler_cert" value={formData.fe_food_handler_cert} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="CCTV Installed?" name="fe_cctv" value={formData.fe_cctv} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Menu Languages Offered" name="fe_menu_languages" value={formData.fe_menu_languages} onChange={handleChange} placeholder="e.g., Hindi, English, Regional" />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Will Alcohol be Served?" name="fe_alcohol_served" value={formData.fe_alcohol_served} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.fe_alcohol_served === 'Yes' && (
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Liquor License No" name="fe_liquor_license_no" value={formData.fe_liquor_license_no} onChange={handleChange} />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Outdoor / Sidewalk Seating?" name="fe_outdoor_seating" value={formData.fe_outdoor_seating} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.fe_outdoor_seating === 'Yes' && (
          <Grid item xs={12}>
            <Alert severity="warning">Outdoor/sidewalk seating requires a separate NOC from the municipal authority. Please apply for it separately.</Alert>
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Home Delivery Service?" name="fe_home_delivery" value={formData.fe_home_delivery} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Aggregator Tie-up (Zomato / Swiggy etc.)" name="fe_aggregator" value={formData.fe_aggregator} onChange={handleChange} placeholder="e.g., Zomato, Swiggy, Both, None" />
        </Grid>
      </Grid>
    );

    if (activeStep === 3) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Upload Required Documents (Max 5 MB each)</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="FSSAI Registration Certificate" name="fe_fssai_cert" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Shop / Establishment Registration" name="fe_shop_reg" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Proprietor Aadhaar" name="fe_id_proof" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Property Ownership Proof / Rent Agreement" name="fe_property_proof" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Fire Safety NOC" name="fe_fire_noc_doc" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Building Completion / Occupancy Certificate" name="fe_building_cert" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Health Certificate of Food Handlers" name="fe_food_handler_cert_doc" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Water Quality Test Report" name="fe_water_report" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
      </Grid>
    );
    return null;
  };

  // ─── Tab 2: Fogging / Vector Control ──────────────────────────────────────────
  const renderFVStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Full Name" name="fv_name" value={formData.fv_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Mobile" name="fv_mobile" value={formData.fv_mobile} onChange={e => handleMobile('fv_mobile', e.target.value)} inputProps={{ maxLength: 10 }} helperText="10-digit mobile number" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Email" name="fv_email" value={formData.fv_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Aadhaar" name="fv_aadhaar" value={formData.fv_aadhaar} onChange={e => handleAadhaar('fv_aadhaar', e.target.value)} inputProps={{ maxLength: 12 }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Complete Address (where fogging is needed)" name="fv_address" value={formData.fv_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Ward" name="fv_ward" value={formData.fv_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Contact Person at Premises (if institutional)" name="fv_contact_person" value={formData.fv_contact_person} onChange={handleChange} placeholder="Name of contact at location" />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Request Type" name="fv_request_type" value={formData.fv_request_type} onChange={handleChange}>
            {['Mosquito fogging', 'Larvicidal treatment', 'Fly control', 'Rat eradication', 'Cockroach treatment', 'Bedbug treatment', 'Termite treatment', 'General vector control'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Premises Type" name="fv_premises_type" value={formData.fv_premises_type} onChange={handleChange}>
            {['Residential area', 'Housing society', 'School/College', 'Hospital/clinic', 'Market/Commercial', 'Religious place', 'Factory/Industry', 'Construction site', 'Open ground/park'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Approximate Area for Fogging (sq.ft or describe)" name="fv_area" value={formData.fv_area} onChange={handleChange} placeholder="e.g., 5000 sq.ft or entire block" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Infestation Level" name="fv_infestation_level" value={formData.fv_infestation_level} onChange={handleChange}>
            {['Mild — occasional sightings', 'Moderate — frequent', 'Severe — major infestation', 'Very severe — emergency'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Reason for Request" name="fv_reason" value={formData.fv_reason} onChange={handleChange}>
            {['Stagnant water nearby', 'Disease outbreak nearby', 'Malaria/Dengue cases in area', 'Rodent damage', 'Filth accumulation', 'Complaint from society/colony', 'Pre-monsoon prevention', 'Post-flood', 'Other'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Preferred Date Range for Fogging Work" name="fv_preferred_dates" value={formData.fv_preferred_dates} onChange={handleChange} placeholder="e.g., 20 Mar – 25 Mar 2025" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Is the Area Accessible with Vehicle?" name="fv_vehicle_accessible" value={formData.fv_vehicle_accessible} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Special Precautions Needed?" name="fv_special_precautions" value={formData.fv_special_precautions} onChange={handleChange} placeholder="e.g., children, pregnant women, pets present" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={3} label="Additional Details" name="fv_additional_details" value={formData.fv_additional_details} onChange={handleChange} placeholder="Any other relevant information about the infestation or area..." />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            Fogging request will be scheduled within 5–7 working days. For dengue/malaria emergency, call Health Control Room: 1800-XXX-XXXX.
          </Alert>
        </Grid>
      </Grid>
    );
    return null;
  };

  // ─── Tab 3: Environmental Clearance ───────────────────────────────────────────
  const renderECStep = () => {
    if (activeStep === 0) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Organisation / Applicant Name" name="ec_org_name" value={formData.ec_org_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Type of Applicant" name="ec_applicant_type" value={formData.ec_applicant_type} onChange={handleChange}>
            {['Industry/Factory', 'Developer/Builder', 'Mining', 'Public utility', 'Government project', 'Hotel/Resort', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Contact Person Name" name="ec_contact_person" value={formData.ec_contact_person} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Designation" name="ec_designation" value={formData.ec_designation} onChange={handleChange} placeholder="e.g., Managing Director, Project Manager" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Email" name="ec_email" value={formData.ec_email} onChange={handleChange} type="email" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Mobile" name="ec_mobile" value={formData.ec_mobile} onChange={e => handleMobile('ec_mobile', e.target.value)} inputProps={{ maxLength: 10 }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Organisation Registered Address" name="ec_address" value={formData.ec_address} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="GST Number / CIN" name="ec_gst_cin" value={formData.ec_gst_cin} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Aadhaar / Director ID" name="ec_aadhaar_director" value={formData.ec_aadhaar_director} onChange={handleChange} />
        </Grid>
      </Grid>
    );

    if (activeStep === 1) return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="Project Name" name="ec_project_name" value={formData.ec_project_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required select label="Project Type" name="ec_project_type" value={formData.ec_project_type} onChange={handleChange}>
            {['Industrial construction', 'Residential project >20000 sq.m', 'Commercial project', 'Mining/Quarrying', 'River/coastal project', 'Infrastructure/Road', 'Hotel >100 rooms', 'Thermal/Chemical plant', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth required multiline rows={2} label="Project Location" name="ec_project_location" value={formData.ec_project_location} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Ward" name="ec_ward" value={formData.ec_ward} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Project Area (sq.m / acres)" name="ec_project_area" value={formData.ec_project_area} onChange={handleChange} placeholder="e.g., 5000 sq.m" />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Project Cost (₹ Crores)" name="ec_project_cost" value={formData.ec_project_cost} onChange={handleChange} type="number" inputProps={{ min: 0, step: 0.01 }} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth required label="Proposed Start Date" name="ec_start_date" value={formData.ec_start_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Estimated Completion Date" name="ec_completion_date" value={formData.ec_completion_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="EIA Category" name="ec_eia_category" value={formData.ec_eia_category} onChange={handleChange}>
            {['Category A — Central clearance req.', 'Category B1', 'Category B2', 'Not required — <5000 sq.m commercial'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField fullWidth select label="Within CRZ?" name="ec_crz" value={formData.ec_crz} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField fullWidth select label="Near Eco-sensitive Zone?" name="ec_eco_sensitive" value={formData.ec_eco_sensitive} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>
    );

    if (activeStep === 2) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Environmental Impact Assessment</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Water Requirement (KLD)" name="ec_water_req" value={formData.ec_water_req} onChange={handleChange} type="number" inputProps={{ min: 0 }} helperText="Kiloliters per day" />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Water Source" name="ec_water_source" value={formData.ec_water_source} onChange={handleChange}>
            {['Municipal', 'Borewell', 'River', 'Recycled'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Daily Wastewater Generation (KLD)" name="ec_wastewater_gen" value={formData.ec_wastewater_gen} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="STP / ETP Proposed?" name="ec_stp_etp" value={formData.ec_stp_etp} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Air Emissions Expected?" name="ec_air_emissions" value={formData.ec_air_emissions} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.ec_air_emissions === 'Yes' && (
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Describe Air Emissions" name="ec_air_emissions_desc" value={formData.ec_air_emissions_desc} onChange={handleChange} placeholder="Type, quantity, source..." />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Noise Levels Expected (dB during construction)" name="ec_noise_levels" value={formData.ec_noise_levels} onChange={handleChange} placeholder="e.g., 75 dB" />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Solid Waste Generation (kg/day)" name="ec_solid_waste" value={formData.ec_solid_waste} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Waste Disposal Arrangement" name="ec_waste_disposal" value={formData.ec_waste_disposal} onChange={handleChange} placeholder="e.g., Municipal contractor, STP on-site" />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth required label="Green Area / Plantation Proposed (sq.m)" name="ec_green_area" value={formData.ec_green_area} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Rainwater Harvesting Proposed?" name="ec_rainwater" value={formData.ec_rainwater} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth select label="Solar / Renewable Energy Component?" name="ec_solar" value={formData.ec_solar} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={2} label="Impact on Nearby Water Bodies / Vegetation?" name="ec_water_body_impact" value={formData.ec_water_body_impact} onChange={handleChange} placeholder="Describe potential impact or state 'None'" />
        </Grid>
      </Grid>
    );

    if (activeStep === 3) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Compliance Information</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="TNPCB / SPCB Consent Status" name="ec_spcb_status" value={formData.ec_spcb_status} onChange={handleChange}>
            {['Obtained', 'Applied for', 'Not applicable', 'Will apply'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Previous Environmental Violation / Notice?" name="ec_prev_violation" value={formData.ec_prev_violation} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Site on Agricultural / Forest Land?" name="ec_agri_forest_land" value={formData.ec_agri_forest_land} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Displacement of Population?" name="ec_displacement" value={formData.ec_displacement} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.ec_displacement === 'Yes' && (
          <Grid item xs={12} md={6}>
            <TextField fullWidth select label="R&R (Rehabilitation) Plan Prepared?" name="ec_rr_plan" value={formData.ec_rr_plan} onChange={handleChange}>
              {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Public Consultation Held?" name="ec_public_consultation" value={formData.ec_public_consultation} onChange={handleChange}>
            {['Yes', 'No'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Grid>
        {formData.ec_public_consultation === 'Yes' && (
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Public Consultation Date" name="ec_consultation_date" value={formData.ec_consultation_date} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
        )}
      </Grid>
    );

    if (activeStep === 4) return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>Upload Required Documents (Max 5 MB each)</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Project Plan / Site Layout" name="ec_project_plan" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Showing plot, access roads, and surrounding context" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Environmental Impact Assessment Report" name="ec_eia_report" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for Category A & B1 projects" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Consent to Establish from SPCB" name="ec_spcb_consent" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Land Ownership / Lease Documents" name="ec_land_docs" required docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Structural Stability Certificate" name="ec_structural_cert" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="Hydrogeological Report" name="ec_hydro_report" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="Required for borewell/groundwater projects" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DocUpload label="NOC from Forest Department" name="ec_forest_noc" docs={docs} onFileChange={onDocChange} onRemove={onDocRemove} hint="If project is near or within forest area" />
        </Grid>
      </Grid>
    );
    return null;
  };

  const renderStepContent = () => {
    if (tab === 0) return renderHLStep();
    if (tab === 1) return renderFEStep();
    if (tab === 2) return renderFVStep();
    if (tab === 3) return renderECStep();
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
          <Tab label="Health / Hygiene License" />
          <Tab label="Food Establishment License" />
          <Tab label="Fogging / Vector Control" />
          <Tab label="Environmental Clearance" />
        </Tabs>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {TAB_STEPS[tab].map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} variant="outlined" sx={{ borderColor: HEADER_COLOR, color: HEADER_COLOR }}>Back</Button>
        )}
        {isLastStep() ? (
          <Button variant="contained" onClick={() => setShowOtpDialog(true)} disabled={submitting} sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: '#004d40' } }}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext} sx={{ bgcolor: HEADER_COLOR, '&:hover': { bgcolor: '#004d40' } }}>
            Next
          </Button>
        )}
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={tab === 0 ? formData.hl_email || '' : tab === 1 ? formData.fe_proprietor_email || '' : tab === 2 ? formData.fv_email || '' : formData.ec_email || ''}
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

export default MunicipalHealthEnvForm;

