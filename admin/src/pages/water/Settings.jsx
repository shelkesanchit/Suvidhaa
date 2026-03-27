import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Save,
  Refresh,
  Settings as SettingsIcon,
  Security,
  Notifications,
  Receipt,
  WaterDrop,
} from '@mui/icons-material';
import api from "../../utils/water/api";
import toast from 'react-hot-toast';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState({
    // General Settings
    department_name: '',
    department_address: '',
    contact_phone: '',
    contact_email: '',
    office_hours: '',
    
    // Billing Settings
    billing_cycle: 'monthly',
    bill_due_days: 0,
    late_payment_penalty: 0,
    minimum_bill_amount: 0,
    round_off_amount: false,
    
    // Connection Settings
    new_connection_fee: 0,
    security_deposit_domestic: 0,
    security_deposit_commercial: 0,
    security_deposit_industrial: 0,
    reconnection_fee: 0,
    
    // Notification Settings
    sms_notifications: false,
    email_notifications: false,
    bill_reminder_days: 0,
    payment_confirmation_sms: false,
    complaint_status_sms: false,
    
    // System Settings
    auto_disconnect_days: 0,
    max_pending_bills: 0,
    enable_online_payment: false,
    enable_mobile_app: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/water/admin/settings');
      if (response.data.data) {
        setSettings(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Using default settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/water/admin/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={600} color="primary.dark" sx={{ mb: 0.5 }}>
            System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure water department system settings
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchSettings} size="small">
            Reset
          </Button>
          <Button 
            variant="contained" 
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} 
            onClick={handleSaveSettings}
            disabled={saving}
            size="small"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Changes to settings will take effect immediately after saving.
      </Alert>

      <Card>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)} 
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Billing" icon={<Receipt />} iconPosition="start" />
          <Tab label="Connection" icon={<WaterDrop />} iconPosition="start" />
          <Tab label="Notifications" icon={<Notifications />} iconPosition="start" />
          <Tab label="System" icon={<Security />} iconPosition="start" />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General Settings */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Department Information</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department Name"
                  value={settings.department_name}
                  onChange={(e) => handleChange('department_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={settings.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Department Address"
                  value={settings.department_address}
                  onChange={(e) => handleChange('department_address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Office Hours"
                  value={settings.office_hours}
                  onChange={(e) => handleChange('office_hours', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Billing Settings */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Billing Configuration</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Billing Cycle"
                  value={settings.billing_cycle}
                  onChange={(e) => handleChange('billing_cycle', e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="bimonthly">Bi-Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bill Due Days"
                  value={settings.bill_due_days}
                  onChange={(e) => handleChange('bill_due_days', parseInt(e.target.value))}
                  helperText="Number of days after bill generation"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Late Payment Penalty"
                  value={settings.late_payment_penalty}
                  onChange={(e) => handleChange('late_payment_penalty', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Bill Amount"
                  value={settings.minimum_bill_amount}
                  onChange={(e) => handleChange('minimum_bill_amount', parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.round_off_amount}
                      onChange={(e) => handleChange('round_off_amount', e.target.checked)}
                    />
                  }
                  label="Round off bill amount to nearest rupee"
                />
              </Grid>
            </Grid>
          )}

          {/* Connection Settings */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Connection Fees</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="New Connection Fee"
                  value={settings.new_connection_fee}
                  onChange={(e) => handleChange('new_connection_fee', parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Reconnection Fee"
                  value={settings.reconnection_fee}
                  onChange={(e) => handleChange('reconnection_fee', parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                  Security Deposits
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Domestic"
                  value={settings.security_deposit_domestic}
                  onChange={(e) => handleChange('security_deposit_domestic', parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Commercial"
                  value={settings.security_deposit_commercial}
                  onChange={(e) => handleChange('security_deposit_commercial', parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Industrial"
                  value={settings.security_deposit_industrial}
                  onChange={(e) => handleChange('security_deposit_industrial', parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          )}

          {/* Notification Settings */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.sms_notifications}
                        onChange={(e) => handleChange('sms_notifications', e.target.checked)}
                      />
                    }
                    label="Enable SMS Notifications"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Send SMS alerts to consumers
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.email_notifications}
                        onChange={(e) => handleChange('email_notifications', e.target.checked)}
                      />
                    }
                    label="Enable Email Notifications"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Send email alerts to consumers
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bill Reminder Days Before Due"
                  value={settings.bill_reminder_days}
                  onChange={(e) => handleChange('bill_reminder_days', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Notification Triggers</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.payment_confirmation_sms}
                      onChange={(e) => handleChange('payment_confirmation_sms', e.target.checked)}
                    />
                  }
                  label="Payment Confirmation SMS"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.complaint_status_sms}
                      onChange={(e) => handleChange('complaint_status_sms', e.target.checked)}
                    />
                  }
                  label="Complaint Status Update SMS"
                />
              </Grid>
            </Grid>
          )}

          {/* System Settings */}
          {tabValue === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>System Configuration</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Auto Disconnect After (Days)"
                  value={settings.auto_disconnect_days}
                  onChange={(e) => handleChange('auto_disconnect_days', parseInt(e.target.value))}
                  helperText="Days of non-payment before auto-disconnect"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Pending Bills"
                  value={settings.max_pending_bills}
                  onChange={(e) => handleChange('max_pending_bills', parseInt(e.target.value))}
                  helperText="Maximum unpaid bills before action"
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Feature Toggles</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enable_online_payment}
                        onChange={(e) => handleChange('enable_online_payment', e.target.checked)}
                      />
                    }
                    label="Enable Online Payment"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Allow consumers to pay bills online
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enable_mobile_app}
                        onChange={(e) => handleChange('enable_mobile_app', e.target.checked)}
                      />
                    }
                    label="Enable Mobile App Features"
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Allow mobile app access for consumers
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
