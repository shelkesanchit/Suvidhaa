import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Save,
  Settings as SettingsIcon,
  Notifications,
  Security,
  LocalFireDepartment,
} from '@mui/icons-material';
import api from "../../utils/gas/api";
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    department_name: 'Gas Distribution Department',
    department_email: 'gas@suvidha.gov.in',
    department_phone: '1906',
    office_address: 'Municipal Corporation Building, City Center',
    emergency_number: '1906',
    
    // Operations
    auto_assign_complaints: true,
    emergency_sms_alerts: true,
    email_notifications: true,
    auto_bill_generation: true,
    
    // Connection settings
    png_available: true,
    lpg_available: true,
    max_cylinder_per_booking: 2,
    express_delivery_charge: 50,
    
    // Billing
    bill_due_days: 15,
    late_payment_penalty: 2,
    min_recharge_amount: 100,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/gas/admin/settings');
      if (response.data.settings) {
        const settingsObj = {};
        response.data.settings.forEach(s => {
          settingsObj[s.setting_key] = s.setting_value === 'true' ? true : 
                                        s.setting_value === 'false' ? false : 
                                        s.setting_value;
        });
        setSettings(prev => ({ ...prev, ...settingsObj }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/gas/admin/settings', { settings });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          System Settings
        </Typography>
        <Button
          startIcon={<Save />}
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Department Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalFireDepartment color="primary" />
              <Typography variant="h6">Department Information</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department Name"
                  value={settings.department_name}
                  onChange={(e) => handleChange('department_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={settings.department_email}
                  onChange={(e) => handleChange('department_email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={settings.department_phone}
                  onChange={(e) => handleChange('department_phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Emergency Number"
                  value={settings.emergency_number}
                  onChange={(e) => handleChange('emergency_number', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Office Address"
                  value={settings.office_address}
                  onChange={(e) => handleChange('office_address', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Notifications color="primary" />
              <Typography variant="h6">Notifications & Alerts</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.email_notifications}
                  onChange={(e) => handleChange('email_notifications', e.target.checked)}
                />
              }
              label="Email Notifications"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mb: 2 }}>
              Send email notifications for new applications and complaints
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.emergency_sms_alerts}
                  onChange={(e) => handleChange('emergency_sms_alerts', e.target.checked)}
                />
              }
              label="Emergency SMS Alerts"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mb: 2 }}>
              Send SMS alerts for gas leak emergencies
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.auto_assign_complaints}
                  onChange={(e) => handleChange('auto_assign_complaints', e.target.checked)}
                />
              }
              label="Auto-assign Complaints"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
              Automatically assign complaints to available technicians
            </Typography>
          </Paper>
        </Grid>

        {/* Operations */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Operations</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.png_available}
                  onChange={(e) => handleChange('png_available', e.target.checked)}
                />
              }
              label="PNG Services Available"
            />
            <br />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.lpg_available}
                  onChange={(e) => handleChange('lpg_available', e.target.checked)}
                />
              }
              label="LPG Services Available"
            />
            <br />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.auto_bill_generation}
                  onChange={(e) => handleChange('auto_bill_generation', e.target.checked)}
                />
              }
              label="Auto Bill Generation"
            />

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Cylinders per Booking"
                  value={settings.max_cylinder_per_booking}
                  onChange={(e) => handleChange('max_cylinder_per_booking', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Express Delivery Charge (₹)"
                  value={settings.express_delivery_charge}
                  onChange={(e) => handleChange('express_delivery_charge', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Billing Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Security color="primary" />
              <Typography variant="h6">Billing & Payments</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bill Due Days"
                  value={settings.bill_due_days}
                  onChange={(e) => handleChange('bill_due_days', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Late Payment Penalty (%)"
                  value={settings.late_payment_penalty}
                  onChange={(e) => handleChange('late_payment_penalty', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Recharge Amount (₹)"
                  value={settings.min_recharge_amount}
                  onChange={(e) => handleChange('min_recharge_amount', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        Changes will take effect immediately after saving. Notify users if any critical settings are modified.
      </Alert>
    </Box>
  );
};

export default Settings;
