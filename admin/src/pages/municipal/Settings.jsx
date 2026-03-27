import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import api from '../../utils/municipal/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/municipal/admin/settings');
      const data = response.data.data || [];
      setSettings(data);
      // Populate editValues
      const vals = {};
      data.forEach(s => { vals[s.setting_key] = s.setting_value; });
      setEditValues(vals);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    try {
      setSaving(prev => ({ ...prev, [key]: true }));
      await api.patch(`/municipal/admin/settings/${key}`, {
        setting_value: editValues[key],
      });
      toast.success(`Setting "${key}" updated`);
      // Update the settings array
      setSettings(prev =>
        prev.map(s => s.setting_key === key ? { ...s, setting_value: editValues[key] } : s)
      );
    } catch (error) {
      toast.error(`Failed to update "${key}"`);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  // Group settings by category prefix
  const groupedSettings = settings.reduce((groups, setting) => {
    const prefix = setting.setting_key.split('_')[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(setting);
    return groups;
  }, {});

  const getCategoryLabel = (prefix) => {
    const labels = {
      fees: 'Fee Settings',
      sla: 'SLA & Timelines',
      rate: 'Rates',
      max: 'Limits',
      min: 'Minimums',
      enable: 'Feature Flags',
      allow: 'Permissions',
    };
    return labels[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1) + ' Settings';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        System Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure municipal system parameters and fees
      </Typography>

      {settings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No settings found</Typography>
        </Paper>
      ) : (
        Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <Paper key={category} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} color="#2e7d32" gutterBottom>
              {getCategoryLabel(category)}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {categorySettings.map((setting) => (
                <Grid item xs={12} md={6} key={setting.setting_key}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {setting.setting_key.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                    {setting.description && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {setting.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editValues[setting.setting_key] || ''}
                        onChange={(e) =>
                          setEditValues(prev => ({ ...prev, [setting.setting_key]: e.target.value }))
                        }
                      />
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Save />}
                        onClick={() => handleSave(setting.setting_key)}
                        disabled={saving[setting.setting_key]}
                        sx={{ whiteSpace: 'nowrap', bgcolor: '#2e7d32', minWidth: 80 }}
                      >
                        {saving[setting.setting_key] ? '...' : 'Save'}
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))
      )}
    </Box>
  );
};

export default Settings;
