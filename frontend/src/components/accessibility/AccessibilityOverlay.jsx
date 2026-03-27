/**
 * Accessibility Overlay
 * Full-screen overlay showing current accessibility mode state
 * Provides visual feedback for speaking/listening states
 */
import React from 'react';
import { Box, Typography, Paper, Fade, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import { useAccessibilityModeContext, FLOW_STATES } from './AccessibilityModeContext';

/**
 * Get state indicator configuration
 */
function getStateConfig(isListening, isSpeaking, currentFlow, isVerifyingUdid) {
  if (isVerifyingUdid) {
    return {
      icon: HourglassEmptyIcon,
      color: '#ff9800',
      text: 'Verifying ID...',
      animation: 'spin'
    };
  }

  if (isSpeaking) {
    return {
      icon: VolumeUpIcon,
      color: '#2196f3',
      text: 'Speaking...',
      animation: 'pulse'
    };
  }

  if (isListening) {
    return {
      icon: MicIcon,
      color: '#4caf50',
      text: 'Listening...',
      animation: 'pulse'
    };
  }

  if (currentFlow === FLOW_STATES.SUBMITTED) {
    return {
      icon: CheckCircleIcon,
      color: '#4caf50',
      text: 'Submitted',
      animation: 'none'
    };
  }

  return {
    icon: AccessibilityNewIcon,
    color: '#1976d2',
    text: 'Ready',
    animation: 'none'
  };
}

/**
 * Get flow stage description
 */
function getFlowDescription(flow) {
  const descriptions = {
    [FLOW_STATES.WELCOME]: 'Welcome to Accessibility Mode',
    [FLOW_STATES.UDID_INPUT]: 'Enter your UDID',
    [FLOW_STATES.DEPARTMENT_SELECT]: 'Select Department',
    [FLOW_STATES.SERVICE_SELECT]: 'Select Service',
    [FLOW_STATES.FORM_FILLING]: 'Filling Form',
    [FLOW_STATES.CONFIRMATION]: 'Confirm Submission',
    [FLOW_STATES.SUBMITTED]: 'Application Submitted'
  };
  return descriptions[flow] || 'Accessibility Mode Active';
}

/**
 * Accessibility Overlay Component
 */
export function AccessibilityOverlay() {
  const {
    isAccessibilityMode,
    currentFlow,
    isListening,
    isSpeaking,
    isVerifyingUdid,
    lastPrompt,
    currentDepartment,
    currentService,
    udidData
  } = useAccessibilityModeContext();

  // Don't render if accessibility mode is off
  if (!isAccessibilityMode) {
    return null;
  }

  const stateConfig = getStateConfig(isListening, isSpeaking, currentFlow, isVerifyingUdid);
  const StateIcon = stateConfig.icon;
  const flowDescription = getFlowDescription(currentFlow);

  return (
    <Fade in={isAccessibilityMode}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9998,
          display: 'flex',
          justifyContent: 'center',
          pt: 2,
          pointerEvents: 'none'
        }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Paper
          elevation={8}
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ffffff',
            borderRadius: 3,
            px: 4,
            py: 3,
            maxWidth: '90%',
            minWidth: 320,
            pointerEvents: 'auto'
          }}
        >
          {/* Status Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mb: 2
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: stateConfig.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 20px ${stateConfig.color}`,
                animation: stateConfig.animation === 'pulse'
                  ? 'statusPulse 1.5s infinite'
                  : stateConfig.animation === 'spin'
                    ? 'spin 2s linear infinite'
                    : 'none',
                '@keyframes statusPulse': {
                  '0%': { transform: 'scale(1)', boxShadow: `0 0 20px ${stateConfig.color}` },
                  '50%': { transform: 'scale(1.1)', boxShadow: `0 0 35px ${stateConfig.color}` },
                  '100%': { transform: 'scale(1)', boxShadow: `0 0 20px ${stateConfig.color}` }
                },
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            >
              <StateIcon sx={{ fontSize: 32, color: '#ffffff' }} />
            </Box>

            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: stateConfig.color,
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}
              >
                {stateConfig.text}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {flowDescription}
              </Typography>
            </Box>
          </Box>

          {/* Current Prompt */}
          {lastPrompt && (
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                p: 2,
                mb: 2,
                borderLeft: `4px solid ${stateConfig.color}`
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  lineHeight: 1.5
                }}
              >
                {lastPrompt}
              </Typography>
            </Box>
          )}

          {/* User Info (if verified) */}
          {udidData && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderRadius: 1,
                px: 2,
                py: 1,
                mb: 1
              }}
            >
              <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: '#4caf50' }}>
                Verified: {udidData.full_name}
              </Typography>
            </Box>
          )}

          {/* Current Selection Info */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {currentDepartment && (
              <Box
                sx={{
                  backgroundColor: 'rgba(33, 150, 243, 0.2)',
                  borderRadius: 1,
                  px: 2,
                  py: 0.5
                }}
              >
                <Typography variant="caption" sx={{ color: '#2196f3' }}>
                  Department: {currentDepartment.names?.en}
                </Typography>
              </Box>
            )}
            {currentService && (
              <Box
                sx={{
                  backgroundColor: 'rgba(156, 39, 176, 0.2)',
                  borderRadius: 1,
                  px: 2,
                  py: 0.5
                }}
              >
                <Typography variant="caption" sx={{ color: '#ce93d8' }}>
                  Service: {currentService.name}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Loading indicator */}
          {isVerifyingUdid && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} sx={{ color: '#ff9800' }} />
            </Box>
          )}

          {/* Voice Commands Help */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.6)',
                display: 'block',
                textAlign: 'center'
              }}
            >
              Say "Repeat" to hear again | "Help" for commands | "Exit Accessibility Mode" to exit
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
}

/**
 * Minimized status indicator for when overlay is not needed
 */
export function AccessibilityStatusBadge() {
  const { isAccessibilityMode, isListening, isSpeaking } = useAccessibilityModeContext();

  if (!isAccessibilityMode) return null;

  const stateConfig = getStateConfig(isListening, isSpeaking, FLOW_STATES.IDLE, false);
  const StateIcon = stateConfig.icon;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 9997,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 4,
        px: 2,
        py: 1
      }}
    >
      <StateIcon sx={{ color: stateConfig.color, fontSize: 20 }} />
      <Typography variant="caption" sx={{ color: '#ffffff' }}>
        {stateConfig.text}
      </Typography>
    </Box>
  );
}

export default AccessibilityOverlay;
