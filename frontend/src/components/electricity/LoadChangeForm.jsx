import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CheckCircle as SuccessIcon, CloudUpload, Print as PrintIcon } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EmailOtpVerification from './EmailOtpVerification';
import ApplicationReceipt from './ApplicationReceipt';
import QrUploadButton from './QrUploadButton';

const steps = ['Consumer Details', 'Load Change Details', 'Documents & Declaration', 'Review & Submit'];

const loadChangeReasons = [
  { value: 'additional_load', label: 'Additional Load Required' },
  { value: 'business_expansion', label: 'Business/Commercial Expansion' },
  { value: 'new_equipment', label: 'New Equipment/Machinery Installation' },
  { value: 'hvac_installation', label: 'Air Conditioning Installation' },
  { value: 'reduced_requirement', label: 'Reduced Load Requirement' },
  { value: 'seasonal_requirement', label: 'Seasonal Load Change' },
  { value: 'phase_conversion', label: 'Single to Three Phase Conversion' },
  { value: 'other', label: 'Other Reason' },
];

const loadCategories = [
  { value: 'LT-I(A)', label: 'LT-I(A) - Domestic (Single Phase)', maxLoad: 10 },
  { value: 'LT-I(B)', label: 'LT-I(B) - Domestic (Three Phase)', maxLoad: 50 },
  { value: 'LT-II', label: 'LT-II - Commercial', maxLoad: 100 },
  { value: 'LT-III', label: 'LT-III - Industrial', maxLoad: 500 },
  { value: 'HT-I', label: 'HT-I - High Tension Industrial', maxLoad: 1000 },
  { value: 'HT-II', label: 'HT-II - High Tension Commercial', maxLoad: 1000 },
];

const LoadChangeForm = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({
    electricity_bill: null,
    load_calculation: null,
    building_plan: null,
    undertaking: null,
  });

  const [formData, setFormData] = useState({
    // Consumer Information
    consumer_number: '',
    consumer_name: '',
    email: '',
    mobile: '',
    alternate_mobile: '',
    
    // Address
    installation_address: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    
    // Current Connection Details
    current_category: '',
    current_sanctioned_load: '',
    current_connected_load: '',
    current_contract_demand: '',
    supply_type: '',
    meter_number: '',
    
    // New Load Details
    change_type: 'increase', // increase or decrease
    new_category: '',
    new_sanctioned_load: '',
    additional_load: '',
    reason_for_change: '',
    detailed_reason: '',
    
    // New Equipment Details (if increasing)
    new_equipment_details: '',
    equipment_load: '',
    installation_date: '',
    
    // Phase Conversion
    phase_change_required: 'no',
    from_phase: '1',
    to_phase: '1',
    
    // Declaration
    agree_to_terms: false,
    declaration_name: '',
    declaration_date: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
    
    // Auto-calculate additional load
    if (name === 'new_sanctioned_load' || name === 'current_sanctioned_load') {
      const current = name === 'current_sanctioned_load' ? parseFloat(value) || 0 : parseFloat(formData.current_sanctioned_load) || 0;
      const newLoad = name === 'new_sanctioned_load' ? parseFloat(value) || 0 : parseFloat(formData.new_sanctioned_load) || 0;
      const additional = newLoad - current;
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        additional_load: additional.toFixed(2),
        change_type: additional > 0 ? 'increase' : 'decrease'
      }));
    }
  };

  const handleFileChange = (docType) => async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should not exceed 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: {
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
    // Validation for step 0
    if (activeStep === 0) {
      if (!formData.consumer_number || !formData.consumer_name || !formData.mobile || !formData.installation_address) {
        toast.error('Please fill all required consumer details');
        return;
      }
      if (formData.mobile.length !== 10) {
        toast.error('Mobile number must be 10 digits');
        return;
      }
    }
    
    // Validation for step 1
    if (activeStep === 1) {
      if (!formData.current_sanctioned_load || !formData.new_sanctioned_load || !formData.reason_for_change) {
        toast.error('Please fill all required load change details');
        return;
      }
      const current = parseFloat(formData.current_sanctioned_load);
      const newLoad = parseFloat(formData.new_sanctioned_load);
      if (newLoad === current) {
        toast.error('New load must be different from current load');
        return;
      }
    }
    
    // Validation for step 2
    if (activeStep === 2) {
      if (!uploadedDocs.electricity_bill) {
        toast.error('Please upload latest electricity bill');
        return;
      }
      if (formData.change_type === 'increase' && !uploadedDocs.load_calculation) {
        toast.error('Please upload load calculation for load increase');
        return;
      }
      if (!formData.agree_to_terms) {
        toast.error('Please accept the terms and declaration');
        return;
      }
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleOtpVerified = (email) => {
    setShowOtpDialog(false);
    handleSubmit(email);
  };

  const handleSubmit = async (email) => {
    setLoading(true);
    try {
      // Prepare documents array
      const documentsArray = Object.entries(uploadedDocs)
        .filter(([_, doc]) => doc !== null)
        .map(([type, doc]) => ({
          ...doc,
          documentType: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          uploadedAt: new Date().toISOString(),
        }));

      const response = await api.post('/electricity/applications/submit', {
        application_type: 'change_of_load',
        application_data: formData,
        documents: documentsArray,
      });

      const appNum = response.data.application_number;
      const ts = new Date().toISOString();
      setApplicationNumber(appNum);
      setSuccess(true);
      setVerifiedEmail(email);
      setSubmittedAt(ts);
      setShowReceipt(true);
      toast.success('Load change request submitted successfully!');
      api.post('/electricity/otp/send-receipt', {
        email,
        application_number: appNum,
        application_type: 'change_of_load',
        application_data: formData,
        submitted_at: ts,
      }).catch(console.warn);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Consumer Information
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please provide your existing consumer details as per electricity bill
              </Alert>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Consumer Number *"
                name="consumer_number"
                value={formData.consumer_number}
                onChange={handleChange}
                placeholder="EC2026XXXXXX"
                required
                helperText="Enter your consumer number from electricity bill"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Consumer Name (as per bill) *"
                name="consumer_name"
                value={formData.consumer_name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
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

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Alternate Mobile"
                name="alternate_mobile"
                value={formData.alternate_mobile}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Installation Address
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Installation Address *"
                name="installation_address"
                value={formData.installation_address}
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
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City *"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="District"
                name="district"
                value={formData.district}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
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

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Current Connection Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Current Category"
                name="current_category"
                value={formData.current_category}
                onChange={handleChange}
              >
                {loadCategories.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Meter Number"
                name="meter_number"
                value={formData.meter_number}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Current Supply Type"
                name="supply_type"
                value={formData.supply_type}
                onChange={handleChange}
              >
                <MenuItem value="single_phase">Single Phase</MenuItem>
                <MenuItem value="three_phase">Three Phase</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Connected Load (kW)"
                name="current_connected_load"
                type="number"
                value={formData.current_connected_load}
                onChange={handleChange}
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Load Change Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Sanctioned Load (kW) *"
                name="current_sanctioned_load"
                type="number"
                value={formData.current_sanctioned_load}
                onChange={handleChange}
                inputProps={{ step: '0.01', min: '0' }}
                required
                helperText="As mentioned in your electricity bill"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="New Sanctioned Load Required (kW) *"
                name="new_sanctioned_load"
                type="number"
                value={formData.new_sanctioned_load}
                onChange={handleChange}
                inputProps={{ step: '0.01', min: '0' }}
                required
              />
            </Grid>

            {formData.current_sanctioned_load && formData.new_sanctioned_load && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: formData.change_type === 'increase' ? 'success.lighter' : 'warning.lighter' }}>
                  <Typography variant="body2" fontWeight={600}>
                    Change Type: {formData.change_type === 'increase' ? 'Load Increase' : 'Load Decrease'}
                  </Typography>
                  <Typography variant="body2">
                    {formData.change_type === 'increase' ? 'Additional' : 'Reduction'} Load: {Math.abs(parseFloat(formData.additional_load) || 0).toFixed(2)} kW
                  </Typography>
                  <Typography variant="body2">
                    New Total Load: {formData.new_sanctioned_load} kW
                  </Typography>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Reason for Load Change *"
                name="reason_for_change"
                value={formData.reason_for_change}
                onChange={handleChange}
                required
              >
                {loadChangeReasons.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Detailed Reason *"
                name="detailed_reason"
                value={formData.detailed_reason}
                onChange={handleChange}
                placeholder="Please provide detailed explanation for load change request..."
                required
              />
            </Grid>

            {formData.change_type === 'increase' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    New Equipment/Load Details
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="New Equipment Details"
                    name="new_equipment_details"
                    value={formData.new_equipment_details}
                    onChange={handleChange}
                    placeholder="List all new equipment/appliances with their power ratings..."
                    helperText="e.g., Air Conditioner (2 Ton - 2.5 kW), Welding Machine (5 kW), etc."
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Total Equipment Load (kW)"
                    name="equipment_load"
                    type="number"
                    value={formData.equipment_load}
                    onChange={handleChange}
                    inputProps={{ step: '0.01', min: '0' }}
                    helperText="Sum of all new equipment loads"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expected Installation Date"
                    name="installation_date"
                    type="date"
                    value={formData.installation_date}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Phase Conversion (if required)
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl>
                <FormLabel>Do you need phase conversion?</FormLabel>
                <RadioGroup
                  row
                  name="phase_change_required"
                  value={formData.phase_change_required}
                  onChange={handleChange}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.phase_change_required === 'yes' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="From Phase"
                    name="from_phase"
                    value={formData.from_phase}
                    onChange={handleChange}
                  >
                    <MenuItem value="1">Single Phase</MenuItem>
                    <MenuItem value="3">Three Phase</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="To Phase"
                    name="to_phase"
                    value={formData.to_phase}
                    onChange={handleChange}
                  >
                    <MenuItem value="1">Single Phase</MenuItem>
                    <MenuItem value="3">Three Phase</MenuItem>
                  </TextField>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="New Category (if changing)"
                name="new_category"
                value={formData.new_category}
                onChange={handleChange}
                helperText="Leave unchanged if staying in same category"
              >
                {loadCategories.map((option) => (
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
              <Typography variant="h6" gutterBottom color="primary">
                Required Documents
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please upload clear copies of all required documents (PDF/JPG/PNG, Max 5MB each)
              </Alert>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                1. Latest Electricity Bill * (Last 3 months)
              </Typography>
              <Button
                variant={uploadedDocs.electricity_bill ? 'contained' : 'outlined'}
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {uploadedDocs.electricity_bill ? `✓ ${uploadedDocs.electricity_bill.name}` : 'Upload Electricity Bill'}
                <input
                  type="file"
                  hidden
                  accept="image/*,application/pdf"
                  onChange={handleFileChange('electricity_bill')}
                />
              </Button>
              <QrUploadButton
                docKey="electricity_bill"
                docLabel="Electricity Bill"
                onFileReceived={(f) => setUploadedDocs(prev => ({ ...prev, electricity_bill: f }))}
              />
            </Grid>

            {formData.change_type === 'increase' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  2. Load Calculation Sheet * (For load increase)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Detailed calculation showing all equipment/appliances with their power ratings
                </Typography>
                <Button
                  variant={uploadedDocs.load_calculation ? 'contained' : 'outlined'}
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {uploadedDocs.load_calculation ? `✓ ${uploadedDocs.load_calculation.name}` : 'Upload Load Calculation'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={handleFileChange('load_calculation')}
                  />
                </Button>
                <QrUploadButton
                  docKey="load_calculation"
                  docLabel="Load Calculation Sheet"
                  onFileReceived={(f) => setUploadedDocs(prev => ({ ...prev, load_calculation: f }))}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                3. Building Plan / Layout (if structural changes)
              </Typography>
              <Button
                variant={uploadedDocs.building_plan ? 'contained' : 'outlined'}
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {uploadedDocs.building_plan ? `✓ ${uploadedDocs.building_plan.name}` : 'Upload Building Plan (Optional)'}
                <input
                  type="file"
                  hidden
                  accept="image/*,application/pdf"
                  onChange={handleFileChange('building_plan')}
                />
              </Button>
              <QrUploadButton
                docKey="building_plan"
                docLabel="Building Plan"
                onFileReceived={(f) => setUploadedDocs(prev => ({ ...prev, building_plan: f }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                4. Undertaking/Declaration Document
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Self-declaration about accuracy of information provided
              </Typography>
              <Button
                variant={uploadedDocs.undertaking ? 'contained' : 'outlined'}
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {uploadedDocs.undertaking ? `✓ ${uploadedDocs.undertaking.name}` : 'Upload Undertaking (Optional)'}
                <input
                  type="file"
                  hidden
                  accept="image/*,application/pdf"
                  onChange={handleFileChange('undertaking')}
                />
              </Button>
              <QrUploadButton
                docKey="undertaking"
                docLabel="Undertaking / Declaration"
                onFileReceived={(f) => setUploadedDocs(prev => ({ ...prev, undertaking: f }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                Declaration
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
                <Typography variant="body2" paragraph>
                  I hereby declare that:
                </Typography>
                <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                  • All information provided in this application is true and correct to the best of my knowledge
                  <br />
                  • I understand that providing false information may lead to rejection of application
                  <br />
                  • I will comply with all electrical safety regulations and wiring standards
                  <br />
                  • I will pay all applicable charges as per tariff rates
                  <br />
                  • I authorize the electricity board to inspect the premises before load change
                </Typography>

                <FormControlLabel
                  control={
                    <input
                      type="checkbox"
                      name="agree_to_terms"
                      checked={formData.agree_to_terms}
                      onChange={handleChange}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600} sx={{ ml: 1 }}>
                      I accept the above declaration and terms *
                    </Typography>
                  }
                  sx={{ mt: 2 }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Applicant Name"
                name="declaration_name"
                value={formData.declaration_name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date"
                name="declaration_date"
                type="date"
                value={formData.declaration_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Review Your Application
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please review all details carefully before final submission
            </Alert>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Consumer Details
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={5}><Typography variant="body2">Consumer Number:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.consumer_number}</Typography></Grid>
                
                <Grid item xs={5}><Typography variant="body2">Name:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.consumer_name}</Typography></Grid>
                
                <Grid item xs={5}><Typography variant="body2">Mobile:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.mobile}</Typography></Grid>
                
                <Grid item xs={5}><Typography variant="body2">Address:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.installation_address}, {formData.city}</Typography></Grid>
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Load Change Information
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={5}><Typography variant="body2">Current Load:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.current_sanctioned_load} kW</Typography></Grid>
                
                <Grid item xs={5}><Typography variant="body2">New Load:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.new_sanctioned_load} kW</Typography></Grid>
                
                <Grid item xs={5}><Typography variant="body2">Change Type:</Typography></Grid>
                <Grid item xs={7}>
                  <Chip 
                    label={formData.change_type === 'increase' ? 'LOAD INCREASE' : 'LOAD DECREASE'}
                    color={formData.change_type === 'increase' ? 'success' : 'warning'}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={5}><Typography variant="body2">Additional Load:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{Math.abs(parseFloat(formData.additional_load) || 0).toFixed(2)} kW</Typography></Grid>
                
                <Grid item xs={5}><Typography variant="body2">Reason:</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2">{loadChangeReasons.find(r => r.value === formData.reason_for_change)?.label}</Typography></Grid>
                
                {formData.phase_change_required === 'yes' && (
                  <>
                    <Grid item xs={5}><Typography variant="body2">Phase Change:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{formData.from_phase} Phase → {formData.to_phase} Phase</Typography></Grid>
                  </>
                )}
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Uploaded Documents
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(uploadedDocs).map(([key, doc]) => doc && (
                  <Grid item xs={12} key={key}>
                    <Typography variant="body2">
                      ✓ {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: <strong>{doc.name}</strong>
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Alert severity="success">
              Your application is ready for submission. You will receive a confirmation SMS/Email with application number.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Application Submitted Successfully!
        </Typography>
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'success.lighter', my: 3, maxWidth: 500, mx: 'auto' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your Application Number
          </Typography>
          <Typography variant="h4" color="primary" fontWeight={700}>
            {applicationNumber}
          </Typography>
        </Paper>
        <Alert severity="info" sx={{ mb: 3, maxWidth: 600, mx: 'auto', textAlign: 'left' }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            What happens next?
          </Typography>
          <Typography variant="body2" component="div">
            • Confirmation SMS/Email will be sent to your registered mobile/email<br />
            • Site inspection will be scheduled within 3-5 working days<br />
            • Estimated approval time: 7-10 working days<br />
            • You will be notified about the inspection date and final approval<br />
            • Payment details will be shared after approval
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          <strong>Note:</strong> Keep your application number safe for future reference and tracking
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Estimated Processing Time: 10-15 working days
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
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
          applicationType="change_of_load"
          formData={formData}
          email={verifiedEmail}
          submittedAt={submittedAt}
        />
      </Box>
    );
  }

  return (
    <Box>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={() => setShowOtpDialog(true)} 
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        )}
      </DialogActions>
      <EmailOtpVerification
        open={showOtpDialog}
        onClose={() => setShowOtpDialog(false)}
        onVerified={handleOtpVerified}
        initialEmail={formData.email || ''}
      />
    </Box>
  );
};

export default LoadChangeForm;
