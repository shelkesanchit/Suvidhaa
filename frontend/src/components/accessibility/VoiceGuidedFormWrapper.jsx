/**
 * Voice Guided Form Wrapper
 * HOC/Wrapper component that adds voice guidance to existing forms
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, Button, LinearProgress, Alert } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAccessibilityModeContext, FLOW_STATES } from './AccessibilityModeContext';
import { mapUDIDToFormData, getFieldMapping } from './udidService';

/**
 * Field configuration for voice guidance
 * @typedef {Object} FieldConfig
 * @property {string} name - Field name (matches form state key)
 * @property {Object} label - Localized labels { en: string, hi: string, mr: string }
 * @property {'text'|'phone'|'email'|'select'|'radio'|'date'|'textarea'|'number'|'aadhaar'|'pincode'} type - Field type
 * @property {boolean} required - Whether field is mandatory
 * @property {Array} options - Options for select/radio fields [{ value, label }]
 * @property {Function} validation - Validation function (value) => errorMessage | null
 * @property {string} autoFillKey - Key to map from UDID data
 */

/**
 * Voice Guided Form Wrapper Component
 * @param {Object} props
 * @param {FieldConfig[]} props.formFields - Array of field configurations
 * @param {string} props.formType - Form type for auto-fill mapping
 * @param {Object} props.initialData - Initial form data
 * @param {Function} props.onFieldChange - Callback when field value changes (fieldName, value) => void
 * @param {Function} props.onSubmit - Callback when form is ready to submit (formData) => Promise
 * @param {React.ReactNode} props.children - The actual form to render alongside
 */
export function VoiceGuidedFormWrapper({
  formFields,
  formType,
  initialData = {},
  onFieldChange,
  onSubmit,
  children
}) {
  const {
    isAccessibilityMode,
    currentFlow,
    udidData,
    formData: contextFormData,
    setFormData: setContextFormData,
    currentFieldIndex,
    registerFormFields,
    announceCurrentField,
    isListening,
    isSpeaking,
    language
  } = useAccessibilityModeContext();

  const [localFormData, setLocalFormData] = useState(initialData);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form with auto-fill data
  useEffect(() => {
    if (isAccessibilityMode && udidData && !isInitialized) {
      const mapping = getFieldMapping(formType || 'municipal_general');
      const autoFillData = mapUDIDToFormData(udidData, mapping);

      // Merge with initial data
      const mergedData = { ...initialData, ...autoFillData };
      setLocalFormData(mergedData);
      setContextFormData(mergedData);
      setIsInitialized(true);

      // Register fields for voice navigation
      registerFormFields(formFields);
    }
  }, [isAccessibilityMode, udidData, formFields, formType, initialData, isInitialized]);

  // Sync context form data changes
  useEffect(() => {
    if (isAccessibilityMode && contextFormData) {
      setLocalFormData(prev => ({ ...prev, ...contextFormData }));

      // Notify parent of changes
      Object.entries(contextFormData).forEach(([key, value]) => {
        if (onFieldChange) {
          onFieldChange(key, value);
        }
      });
    }
  }, [contextFormData, isAccessibilityMode, onFieldChange]);

  // Handle form submission
  useEffect(() => {
    if (currentFlow === FLOW_STATES.SUBMITTED && onSubmit) {
      onSubmit(localFormData);
    }
  }, [currentFlow, onSubmit, localFormData]);

  // Get current field info
  const currentField = formFields[currentFieldIndex];
  const currentValue = localFormData[currentField?.name];
  const progress = ((currentFieldIndex + 1) / formFields.length) * 100;

  // Manual navigation handlers
  const handleNext = useCallback(() => {
    if (currentFieldIndex < formFields.length - 1) {
      announceCurrentField(currentFieldIndex + 1, formFields);
    }
  }, [currentFieldIndex, formFields, announceCurrentField]);

  const handlePrevious = useCallback(() => {
    if (currentFieldIndex > 0) {
      announceCurrentField(currentFieldIndex - 1, formFields);
    }
  }, [currentFieldIndex, formFields, announceCurrentField]);

  const handleRepeat = useCallback(() => {
    announceCurrentField(currentFieldIndex, formFields);
  }, [currentFieldIndex, formFields, announceCurrentField]);

  // Don't render if not in accessibility mode
  if (!isAccessibilityMode) {
    return children || null;
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Voice Guidance Panel */}
      <Paper
        elevation={4}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#1a237e',
          color: '#ffffff',
          p: 2,
          mb: 3,
          borderRadius: 2
        }}
      >
        {/* Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Field {currentFieldIndex + 1} of {formFields.length}
            </Typography>
            <Typography variant="body2">
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4caf50',
                borderRadius: 4
              }
            }}
          />
        </Box>

        {/* Current Field Info */}
        {currentField && (
          <Box
            sx={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 2,
              p: 2,
              mb: 2
            }}
          >
            <Typography variant="h6" gutterBottom>
              {currentField.label?.[language] || currentField.label?.en || currentField.name}
              {currentField.required && <span style={{ color: '#ff5722' }}> *</span>}
            </Typography>

            {currentValue ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                <Typography variant="body1">
                  Current value: <strong>{currentValue}</strong>
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {currentField.required ? 'Required - please provide a value' : 'Optional - say "skip" to continue'}
              </Typography>
            )}
          </Box>
        )}

        {/* Status Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {isListening && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#4caf50' }}>
              <MicIcon sx={{ animation: 'pulse 1s infinite' }} />
              <Typography>Listening...</Typography>
            </Box>
          )}
          {isSpeaking && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#2196f3' }}>
              <VolumeUpIcon sx={{ animation: 'pulse 1s infinite' }} />
              <Typography>Speaking...</Typography>
            </Box>
          )}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<NavigateBeforeIcon />}
            onClick={handlePrevious}
            disabled={currentFieldIndex === 0}
            sx={{
              color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRepeat}
            sx={{
              color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Repeat
          </Button>
          <Button
            variant="outlined"
            endIcon={<NavigateNextIcon />}
            onClick={handleNext}
            disabled={currentFieldIndex >= formFields.length - 1}
            sx={{
              color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Next
          </Button>
        </Box>

        {/* Voice Commands Reminder */}
        <Alert
          severity="info"
          sx={{
            mt: 2,
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            color: '#ffffff',
            '& .MuiAlert-icon': { color: '#2196f3' }
          }}
        >
          <Typography variant="caption">
            Voice commands: "Next" | "Back" | "Repeat" | "Change" | "Skip" (optional fields)
          </Typography>
        </Alert>
      </Paper>

      {/* Auto-filled Data Summary */}
      {udidData && (
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircleIcon sx={{ color: '#4caf50' }} />
            <Typography variant="subtitle2" sx={{ color: '#4caf50' }}>
              Profile Auto-Filled
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Name: {udidData.full_name} | Mobile: {udidData.mobile} | UDID: {udidData.udid_number}
          </Typography>
        </Paper>
      )}

      {/* Original Form Content */}
      <Box sx={{ position: 'relative' }}>
        {children}
      </Box>
    </Box>
  );
}

/**
 * Helper to create field configuration from form structure
 */
export function createFieldConfig(fields) {
  return fields.map(field => ({
    name: field.name,
    label: typeof field.label === 'string'
      ? { en: field.label, hi: field.label, mr: field.label }
      : field.label,
    type: field.type || 'text',
    required: field.required || false,
    options: field.options || [],
    validation: field.validation || null,
    autoFillKey: field.autoFillKey || field.name
  }));
}

export default VoiceGuidedFormWrapper;
