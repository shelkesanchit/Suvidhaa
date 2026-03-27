/**
 * Accessibility Mode Toggle Button
 * Large, high-contrast button to enable/disable accessibility mode
 */
import React from 'react';
import { Box, Button, Typography, Tooltip, Fade } from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import CloseIcon from '@mui/icons-material/Close';
import { useAccessibilityModeContext } from './AccessibilityModeContext';

// Position styles
const POSITIONS = {
  'bottom-right': { bottom: 100, right: 20 },
  'bottom-left': { bottom: 100, left: 20 },
  'top-right': { top: 'clamp(280px, 52vh, 580px)', right: 16 },
  'top-left': { top: 100, left: 20 }
};

/**
 * Accessibility Mode Toggle Button Component
 * @param {Object} props
 * @param {'bottom-right'|'bottom-left'|'top-right'|'top-left'} props.position - Button position
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {'small'|'medium'|'large'} props.size - Button size
 */
export function AccessibilityModeToggle({
  position = 'bottom-right',
  showLabel = true,
  size = 'large'
}) {
  const { isAccessibilityMode, enableAccessibilityMode, disableAccessibilityMode } = useAccessibilityModeContext();

  const handleClick = () => {
    if (isAccessibilityMode) {
      disableAccessibilityMode();
    } else {
      enableAccessibilityMode();
    }
  };

  // Size configurations
  const sizeConfig = {
    small: { button: 56, icon: 28, fontSize: '0.75rem' },
    medium: { button: 72, icon: 36, fontSize: '0.875rem' },
    large: { button: 88, icon: 44, fontSize: '1rem' }
  };

  const config = sizeConfig[size] || sizeConfig.large;
  const positionStyle = POSITIONS[position] || POSITIONS['bottom-right'];
  const isTopRightStack = position === 'top-right';

  return (
    <Fade in={true}>
      <Box
        sx={{
          position: 'fixed',
          ...positionStyle,
          zIndex: 1302,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Tooltip
          title={isAccessibilityMode ? 'Exit Accessibility Mode' : 'Enable Accessibility Mode (For Blind Users)'}
          placement="left"
          arrow
        >
          <Button
            onClick={handleClick}
            aria-label={isAccessibilityMode ? 'Exit Accessibility Mode' : 'Enable Accessibility Mode for Blind Users'}
            aria-pressed={isAccessibilityMode}
            sx={{
              width: config.button,
              height: config.button,
              minWidth: config.button,
              ...(isTopRightStack
                ? { width: 'var(--kiosk-control-width)', height: 'var(--kiosk-control-height)', minWidth: 'var(--kiosk-control-width)' }
                : {}),
              borderRadius: isTopRightStack ? '14px' : '50%',
              backgroundColor: isAccessibilityMode ? '#ff5722' : '#1976d2',
              color: '#ffffff',
              boxShadow: isAccessibilityMode
                ? '0 0 20px rgba(255, 87, 34, 0.6)'
                : '0 4px 20px rgba(25, 118, 210, 0.4)',
              border: position === 'top-right' ? '1px solid rgba(255,255,255,0.55)' : '3px solid #ffffff',
              transition: 'all 0.3s ease',
              animation: isAccessibilityMode && position !== 'top-right' ? 'pulse 2s infinite' : 'none',
              '&:hover': {
                backgroundColor: isAccessibilityMode ? '#e64a19' : '#1565c0',
                transform: position === 'top-right' ? 'translateY(-1px)' : 'scale(1.1)',
                boxShadow: isAccessibilityMode
                  ? '0 0 30px rgba(255, 87, 34, 0.8)'
                  : '0 6px 25px rgba(25, 118, 210, 0.6)'
              },
              '&:focus': {
                outline: '4px solid #ffeb3b',
                outlineOffset: '4px'
              },
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 20px rgba(255, 87, 34, 0.6)' },
                '50%': { boxShadow: '0 0 35px rgba(255, 87, 34, 0.9)' },
                '100%': { boxShadow: '0 0 20px rgba(255, 87, 34, 0.6)' }
              }
            }}
          >
            {isAccessibilityMode ? (
              <CloseIcon sx={{ fontSize: isTopRightStack ? 30 : config.icon }} />
            ) : (
              <AccessibilityNewIcon sx={{ fontSize: isTopRightStack ? 30 : config.icon }} />
            )}
          </Button>
        </Tooltip>

        {showLabel && (
          <Typography
            variant="caption"
            sx={{
              backgroundColor: isAccessibilityMode ? '#ff5722' : 'rgba(0, 0, 0, 0.8)',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: config.fontSize,
              fontWeight: 600,
              textAlign: 'center',
              maxWidth: 120,
              lineHeight: 1.3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            {isAccessibilityMode ? 'Exit Mode' : 'Accessibility'}
          </Typography>
        )}
      </Box>
    </Fade>
  );
}

/**
 * Accessibility Mode Button for inline use in forms/pages
 * More compact version for embedding in UI
 */
export function AccessibilityModeButton({ variant = 'contained', fullWidth = false }) {
  const { isAccessibilityMode, enableAccessibilityMode, disableAccessibilityMode } = useAccessibilityModeContext();

  const handleClick = () => {
    if (isAccessibilityMode) {
      disableAccessibilityMode();
    } else {
      enableAccessibilityMode();
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      startIcon={isAccessibilityMode ? <CloseIcon /> : <AccessibilityNewIcon />}
      fullWidth={fullWidth}
      aria-label={isAccessibilityMode ? 'Exit Accessibility Mode' : 'Enable Accessibility Mode'}
      sx={{
        backgroundColor: isAccessibilityMode ? '#ff5722' : '#1976d2',
        color: '#ffffff',
        fontWeight: 600,
        py: 1.5,
        '&:hover': {
          backgroundColor: isAccessibilityMode ? '#e64a19' : '#1565c0'
        },
        '&:focus': {
          outline: '3px solid #ffeb3b',
          outlineOffset: '2px'
        }
      }}
    >
      {isAccessibilityMode ? 'Exit Accessibility Mode' : 'Accessibility Mode (For Blind Users)'}
    </Button>
  );
}

export default AccessibilityModeToggle;
