/**
 * VoiceInput Component
 *
 * A floating voice input button for kiosk accessibility.
 * Works with the currently focused input field.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  Fade,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Stop as StopIcon,
  Language as LanguageIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useVoiceInputContext, VOICE_STATUS } from './VoiceInputContext';
import './VoiceInput.css';

// Voice languages for the selector
const VOICE_LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'EN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: 'HI' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: 'MR' },
];

/**
 * VoiceInput - Floating voice input button
 */
export function VoiceInput({ position = 'bottom-left', showLanguageSelector = true }) {
  const {
    status,
    isSupported,
    isListening,
    isProcessing,
    interimTranscript,
    error,
    voiceLanguage,
    startListening,
    stopListening,
    changeVoiceLanguage,
    clearError,
  } = useVoiceInputContext();

  const [anchorEl, setAnchorEl] = useState(null);
  const currentInputRef = useRef(null);
  const langMenuOpen = Boolean(anchorEl);

  // Position styles
  const positions = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 'clamp(104px, 16vh, 170px)', right: 16 },
    'bottom-left': { bottom: 100, left: 16 },
    'bottom-right': { bottom: 100, right: 16 },
  };

  const isKioskTopRight = position === 'top-right';

  // Track focused input
  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      ) {
        if (
          target.tagName === 'TEXTAREA' ||
          ['text', 'search', 'email', 'tel', 'url', 'number'].includes(target.type)
        ) {
          currentInputRef.current = target;
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  /**
   * Handle voice result - insert into focused input
   */
  const handleVoiceResult = useCallback((text) => {
    const input = currentInputRef.current;
    if (!text || !input) return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    // Append to existing value
    const currentValue = input.value || '';
    const newValue = currentValue ? `${currentValue} ${text}` : text;

    if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(input, newValue);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, newValue);
    }

    // Trigger events for React
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  }, []);

  /**
   * Handle mic button click
   */
  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      if (!currentInputRef.current) {
        // Try to find an active input
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
        ) {
          currentInputRef.current = activeElement;
        }
      }
      startListening(handleVoiceResult, 'floating-voice-input');
    }
  }, [isListening, startListening, stopListening, handleVoiceResult]);

  /**
   * Handle language selector click
   */
  const handleLanguageClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  /**
   * Handle language selection
   */
  const handleLanguageSelect = (langCode) => {
    changeVoiceLanguage(langCode);
    setAnchorEl(null);
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  // Get current language details
  const currentLang = VOICE_LANGUAGE_OPTIONS.find(l => l.code === voiceLanguage) || VOICE_LANGUAGE_OPTIONS[0];

  return (
    <>
      <Box
        className="voice-input-container"
        sx={{
          position: 'fixed',
          ...positions[position],
          zIndex: 1302,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {/* Status indicator */}
        <Fade in={isListening || isProcessing || !!error}>
          <Paper
            className={`voice-status-indicator ${isListening ? 'listening' : ''} ${error ? 'error' : ''}`}
            elevation={4}
            sx={{
              px: 1,
              py: 0.6,
              borderRadius: 1.5,
              backgroundColor: error
                ? 'error.main'
                : isListening
                  ? 'primary.main'
                  : 'grey.800',
              color: 'white',
              minWidth: isKioskTopRight ? 166 : 120,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
              {error
                ? error
                : isProcessing
                  ? 'Processing...'
                  : isListening
                    ? interimTranscript || 'Listening...'
                    : ''}
            </Typography>
          </Paper>
        </Fade>

        {/* Main mic button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          {/* Language selector button */}
          {showLanguageSelector && (
            <Tooltip title="Change voice language">
              <Button
                onClick={handleLanguageClick}
                className="voice-lang-button"
                sx={{
                  minWidth: isKioskTopRight ? 84 : 38,
                  width: isKioskTopRight ? 84 : 38,
                  height: isKioskTopRight ? 84 : 44,
                  borderRadius: isKioskTopRight ? 3.5 : 2.5,
                  backgroundColor: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(25, 118, 210, 0.25)',
                  boxShadow: '0 6px 20px rgba(15, 23, 42, 0.16)',
                  '&:hover': {
                    backgroundColor: '#f2f7ff',
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                  {currentLang.flag}
                </Typography>
              </Button>
            </Tooltip>
          )}

          {/* Mic button */}
          <Tooltip title={isListening ? 'Stop listening' : 'Start voice input'}>
            <IconButton
              onClick={handleMicClick}
              className={`voice-mic-button ${isListening ? 'listening' : ''}`}
              disabled={isProcessing}
              sx={{
                width: isKioskTopRight ? 84 : 50,
                height: isKioskTopRight ? 84 : 44,
                borderRadius: isKioskTopRight ? 3.5 : 2.5,
                backgroundColor: isListening ? 'error.main' : 'primary.main',
                color: 'white',
                boxShadow: '0 6px 20px rgba(15, 23, 42, 0.24)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isListening ? 'error.dark' : 'primary.dark',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  backgroundColor: 'grey.400',
                  color: 'white',
                },
              }}
            >
              {isProcessing ? (
                <CircularProgress size={22} color="inherit" />
              ) : isListening ? (
                <StopIcon sx={{ fontSize: 24 }} />
              ) : (
                <MicIcon sx={{ fontSize: 24 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Helper text - hidden for cleaner top alignment */}
        {false && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              backgroundColor: 'rgba(255,255,255,0.9)',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              fontSize: '0.65rem',
            }}
          >
            {isListening ? 'Tap to stop' : 'Tap to speak'}
          </Typography>
        )}
      </Box>

      {/* Language selector menu */}
      <Menu
        anchorEl={anchorEl}
        open={langMenuOpen}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 1500 }}
        PaperProps={{
          elevation: 8,
          sx: { borderRadius: 2, minWidth: 160, zIndex: 1501 },
        }}
      >
        {VOICE_LANGUAGE_OPTIONS.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            selected={lang.code === voiceLanguage}
          >
            <ListItemText
              primary={lang.nativeName}
              secondary={lang.name !== lang.nativeName ? lang.name : null}
              primaryTypographyProps={{ fontWeight: lang.code === voiceLanguage ? 700 : 500 }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
            {lang.code === voiceLanguage && (
              <CheckIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default VoiceInput;
