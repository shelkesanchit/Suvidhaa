import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const VirtualKeyboardContext = createContext(null);

/**
 * VirtualKeyboardProvider - Manages keyboard visibility and active input
 * Provides a global context for the virtual keyboard functionality
 */
export const VirtualKeyboardProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true); // Keyboard enabled by default
  const [language, setLanguage] = useState('english'); // 'english' | 'marathi' | 'phonetic'
  const activeInputRef = useRef(null);
  const keyboardRef = useRef(null);

  // Show the keyboard (only if enabled)
  const showKeyboard = useCallback(() => {
    if (isEnabled) {
      setIsVisible(true);
    }
  }, [isEnabled]);

  // Hide the keyboard
  const hideKeyboard = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Toggle keyboard enabled/disabled
  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => {
      if (prev) {
        // If turning off, also hide keyboard
        setIsVisible(false);
      }
      return !prev;
    });
  }, []);

  // Set the active input element
  const setActiveInput = useCallback((inputElement) => {
    activeInputRef.current = inputElement;
  }, []);

  // Get the currently active input
  const getActiveInput = useCallback(() => {
    return activeInputRef.current;
  }, []);

  // Cycle through languages
  const cycleLanguage = useCallback(() => {
    setLanguage((prev) => {
      if (prev === 'english') return 'marathi';
      if (prev === 'marathi') return 'phonetic';
      return 'english';
    });
  }, []);

  // Set keyboard reference
  const setKeyboardRef = useCallback((ref) => {
    keyboardRef.current = ref;
  }, []);

  // Get keyboard reference
  const getKeyboardRef = useCallback(() => {
    return keyboardRef.current;
  }, []);

  const value = {
    isVisible,
    isEnabled,
    language,
    showKeyboard,
    hideKeyboard,
    toggleEnabled,
    setActiveInput,
    getActiveInput,
    setLanguage,
    cycleLanguage,
    setKeyboardRef,
    getKeyboardRef
  };

  return (
    <VirtualKeyboardContext.Provider value={value}>
      {children}
    </VirtualKeyboardContext.Provider>
  );
};

/**
 * useVirtualKeyboard - Hook to access keyboard context
 */
export const useVirtualKeyboard = () => {
  const context = useContext(VirtualKeyboardContext);
  if (!context) {
    throw new Error('useVirtualKeyboard must be used within a VirtualKeyboardProvider');
  }
  return context;
};

export default VirtualKeyboardContext;
