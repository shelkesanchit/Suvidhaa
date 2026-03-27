/**
 * VoiceInputButton Component
 *
 * A small, inline microphone button that can be placed next to input fields.
 * For use with individual form inputs.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { useVoiceInput } from './useVoiceInput';
import './VoiceInput.css';

/**
 * VoiceInputButton - Inline microphone button for input fields
 *
 * @param {Object} props
 * @param {string} props.inputId - Unique identifier for the associated input
 * @param {Function} props.onResult - Callback when voice input is received
 * @param {Function} props.setValue - react-hook-form setValue (optional)
 * @param {string} props.fieldName - react-hook-form field name (optional)
 * @param {React.RefObject} props.inputRef - Ref to the input element (optional)
 * @param {boolean} props.append - If true, append voice text to existing value
 * @param {string} props.size - Button size: 'small', 'medium', 'large'
 * @param {string} props.variant - Button variant: 'default', 'outlined', 'contained'
 * @param {boolean} props.showStatus - Show listening status text
 * @param {Object} props.sx - Additional MUI sx styles
 */
export function VoiceInputButton({
  inputId,
  onResult,
  setValue,
  fieldName,
  inputRef,
  append = true,
  size = 'medium',
  variant = 'default',
  showStatus = false,
  disabled = false,
  sx = {},
}) {
  const {
    isSupported,
    isListening,
    status,
    interimTranscript,
    error,
    toggleVoiceInput,
    setInputRef,
  } = useVoiceInput({
    inputId,
    onResult,
    setValue,
    fieldName,
    inputRef,
    append,
  });

  // Set the input ref on mount
  useEffect(() => {
    if (inputRef?.current) {
      setInputRef(inputRef.current);
    }
  }, [inputRef, setInputRef]);

  /**
   * Handle button click
   */
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVoiceInput();
  }, [toggleVoiceInput]);

  // Size configurations
  const sizes = {
    small: { button: 28, icon: 16 },
    medium: { button: 36, icon: 20 },
    large: { button: 48, icon: 28 },
  };

  const sizeConfig = sizes[size] || sizes.medium;

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          border: '2px solid',
          borderColor: isListening ? 'error.main' : 'primary.main',
          backgroundColor: 'transparent',
          color: isListening ? 'error.main' : 'primary.main',
          '&:hover': {
            backgroundColor: isListening ? 'error.light' : 'primary.light',
            color: 'white',
          },
        };
      case 'contained':
        return {
          backgroundColor: isListening ? 'error.main' : 'primary.main',
          color: 'white',
          '&:hover': {
            backgroundColor: isListening ? 'error.dark' : 'primary.dark',
          },
        };
      default:
        return {
          backgroundColor: isListening ? 'error.light' : 'grey.100',
          color: isListening ? 'error.main' : 'primary.main',
          '&:hover': {
            backgroundColor: isListening ? 'error.main' : 'primary.light',
            color: 'white',
          },
        };
    }
  };

  const isProcessing = status === 'processing';

  return (
    <Box
      className="voice-input-button-container"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
    >
      <Tooltip
        title={
          disabled
            ? 'Voice input disabled'
            : isListening
              ? 'Stop listening'
              : 'Start voice input'
        }
      >
        <span>
          <IconButton
            onClick={handleClick}
            disabled={disabled || isProcessing}
            className={`voice-input-inline-button ${isListening ? 'listening' : ''}`}
            sx={{
              width: sizeConfig.button,
              height: sizeConfig.button,
              transition: 'all 0.2s ease',
              ...getVariantStyles(),
              ...sx,
            }}
          >
            {isProcessing ? (
              <CircularProgress size={sizeConfig.icon * 0.8} color="inherit" />
            ) : isListening ? (
              <StopIcon sx={{ fontSize: sizeConfig.icon }} />
            ) : (
              <MicIcon sx={{ fontSize: sizeConfig.icon }} />
            )}
          </IconButton>
        </span>
      </Tooltip>

      {/* Optional status indicator */}
      {showStatus && (isListening || error) && (
        <Typography
          variant="caption"
          className={`voice-status-text ${error ? 'error' : ''}`}
          sx={{
            color: error ? 'error.main' : 'primary.main',
            fontSize: '0.65rem',
            fontWeight: 500,
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {error ? 'Error' : interimTranscript || 'Listening...'}
        </Typography>
      )}
    </Box>
  );
}

/**
 * VoiceInputAdornment - For use as InputAdornment in MUI TextField
 */
export function VoiceInputAdornment(props) {
  return (
    <VoiceInputButton
      size="small"
      variant="default"
      {...props}
      sx={{
        marginRight: -1,
        ...props.sx,
      }}
    />
  );
}

/**
 * withVoiceInput - HOC to wrap input components with voice input capability
 */
export function withVoiceInput(WrappedComponent) {
  return function VoiceEnabledInput(props) {
    const {
      voiceInputProps = {},
      InputProps = {},
      ...rest
    } = props;

    const inputRef = useRef(null);

    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <WrappedComponent
          {...rest}
          inputRef={inputRef}
          InputProps={{
            ...InputProps,
          }}
        />
        <VoiceInputButton
          inputRef={inputRef}
          inputId={rest.name || rest.id}
          {...voiceInputProps}
        />
      </Box>
    );
  };
}

export default VoiceInputButton;
