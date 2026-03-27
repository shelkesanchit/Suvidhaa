/**
 * useVoiceInput Hook
 *
 * Custom hook for integrating voice input with form inputs.
 * Works with both regular inputs and react-hook-form controlled inputs.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useVoiceInputContext } from './VoiceInputContext';

/**
 * Hook for connecting voice input to a specific input field
 *
 * @param {Object} options - Configuration options
 * @param {string} options.inputId - Unique identifier for the input field
 * @param {Function} options.onResult - Callback when voice input is received
 * @param {boolean} options.append - If true, append voice text to existing value
 * @param {Function} options.setValue - react-hook-form setValue function (optional)
 * @param {string} options.fieldName - Field name for react-hook-form (optional)
 * @param {React.RefObject} options.inputRef - Ref to the input element (optional)
 */
export function useVoiceInput(options = {}) {
  const {
    inputId,
    onResult,
    append = false,
    setValue, // react-hook-form setValue
    fieldName, // react-hook-form field name
    inputRef,
  } = options;

  const context = useVoiceInputContext();
  const {
    status,
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    activeInputId,
    startListening,
    stopListening,
    toggleListening,
  } = context;

  const isActiveInput = activeInputId === inputId;
  const inputElementRef = useRef(null);

  // Set input ref
  useEffect(() => {
    if (inputRef?.current) {
      inputElementRef.current = inputRef.current;
    }
  }, [inputRef]);

  /**
   * Handle voice result
   */
  const handleVoiceResult = useCallback((text) => {
    if (!text) return;

    // If custom callback provided, use it
    if (onResult) {
      onResult(text);
      return;
    }

    // If using react-hook-form
    if (setValue && fieldName) {
      if (append) {
        // Get current value (need to access it through the input)
        const currentValue = inputElementRef.current?.value || '';
        const newValue = currentValue ? `${currentValue} ${text}` : text;
        setValue(fieldName, newValue, { shouldValidate: true, shouldDirty: true });
      } else {
        setValue(fieldName, text, { shouldValidate: true, shouldDirty: true });
      }
      return;
    }

    // If using ref to input element
    if (inputElementRef.current) {
      const input = inputElementRef.current;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (append) {
        const currentValue = input.value || '';
        const newValue = currentValue ? `${currentValue} ${text}` : text;

        if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(input, newValue);
        } else if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, newValue);
        }
      } else {
        if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(input, text);
        } else if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, text);
        }
      }

      // Trigger input event for React to pick up the change
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);

      // Also trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);

      // Focus the input
      input.focus();
    }
  }, [onResult, setValue, fieldName, append]);

  /**
   * Start voice input for this field
   */
  const startVoiceInput = useCallback(() => {
    return startListening(handleVoiceResult, inputId);
  }, [startListening, handleVoiceResult, inputId]);

  /**
   * Stop voice input
   */
  const stopVoiceInput = useCallback(() => {
    stopListening();
  }, [stopListening]);

  /**
   * Toggle voice input for this field
   */
  const toggleVoiceInput = useCallback(() => {
    return toggleListening(handleVoiceResult, inputId);
  }, [toggleListening, handleVoiceResult, inputId]);

  /**
   * Set the input element ref
   */
  const setInputRef = useCallback((element) => {
    inputElementRef.current = element;
  }, []);

  return {
    // State
    isSupported,
    isListening: isActiveInput && isListening,
    status: isActiveInput ? status : 'idle',
    transcript: isActiveInput ? transcript : '',
    interimTranscript: isActiveInput ? interimTranscript : '',
    error: isActiveInput ? error : null,
    isActiveInput,

    // Actions
    startVoiceInput,
    stopVoiceInput,
    toggleVoiceInput,
    setInputRef,

    // Full context (for advanced use)
    context,
  };
}

/**
 * Hook for global voice input listener
 * Automatically attaches voice input capability to all focused inputs
 */
export function useGlobalVoiceListener() {
  const context = useVoiceInputContext();
  const { startListening, stopListening, isListening } = context;
  const currentInputRef = useRef(null);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      ) {
        // Check if input is a text-type input (not checkbox, radio, etc.)
        if (
          target.tagName === 'TEXTAREA' ||
          ['text', 'search', 'email', 'tel', 'url', 'password', 'number'].includes(target.type)
        ) {
          currentInputRef.current = target;
        }
      }
    };

    const handleFocusOut = () => {
      // Small delay to allow voice button clicks
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'BUTTON') {
          currentInputRef.current = null;
        }
      }, 100);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  /**
   * Get the currently focused input
   */
  const getCurrentInput = useCallback(() => {
    return currentInputRef.current;
  }, []);

  /**
   * Start voice input for the currently focused input
   */
  const startGlobalVoiceInput = useCallback(() => {
    const input = currentInputRef.current;
    if (!input) return false;

    const handleResult = (text) => {
      if (!text || !input) return;

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      const currentValue = input.value || '';
      const newValue = currentValue ? `${currentValue} ${text}` : text;

      if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(input, newValue);
      } else if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, newValue);
      }

      // Trigger events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    };

    return startListening(handleResult, input.id || 'global-input');
  }, [startListening]);

  return {
    getCurrentInput,
    startGlobalVoiceInput,
    stopListening,
    isListening,
    context,
  };
}

export default useVoiceInput;
