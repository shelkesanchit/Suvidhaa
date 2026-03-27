import { useEffect, useCallback, useRef } from 'react';
import { useVirtualKeyboard } from './VirtualKeyboardContext';

/**
 * useKeyboardInput - Hook to connect an input to the virtual keyboard
 */
export const useKeyboardInput = (inputRef) => {
  const { showKeyboard, setActiveInput, getKeyboardRef, isEnabled } = useVirtualKeyboard();

  const handleFocus = useCallback((e) => {
    // Don't do anything if keyboard is disabled
    if (!isEnabled) return;

    const input = e.target;
    setActiveInput(input);
    showKeyboard();

    const keyboard = getKeyboardRef();
    if (keyboard) {
      keyboard.setInput(input.value || '');
    }

    setTimeout(() => {
      scrollInputAboveKeyboard(input);
    }, 250);
  }, [setActiveInput, showKeyboard, getKeyboardRef, isEnabled]);

  return {
    onFocus: handleFocus,
    ref: inputRef,
    readOnly: false
  };
};

// Helper function to smoothly scroll input above keyboard
const scrollInputAboveKeyboard = (input) => {
  if (!input) return;

  const keyboardHeight = 320;
  const inputRect = input.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  // Calculate visible area above keyboard
  const visibleAreaBottom = viewportHeight - keyboardHeight - 40;

  // Check if input is behind keyboard
  if (inputRect.bottom > visibleAreaBottom || inputRect.top < 0) {
    // Find the scrollable container
    const dialogContent = input.closest('.MuiDialogContent-root');
    const dialog = input.closest('.MuiDialog-paper');
    const kioskContent = input.closest('.kiosk-content');
    const mainContent = input.closest('main');
    const container = input.closest('.MuiContainer-root');

    // Calculate how much to scroll to center the input in visible area
    const targetY = (visibleAreaBottom - 100) / 2;
    const scrollAmount = inputRect.top - targetY;

    // Smooth scroll options
    const scrollOptions = {
      top: scrollAmount,
      behavior: 'smooth'
    };

    if (dialogContent) {
      dialogContent.scrollBy(scrollOptions);
    } else if (dialog) {
      dialog.scrollBy(scrollOptions);
    } else if (kioskContent) {
      kioskContent.scrollBy(scrollOptions);
    } else if (mainContent) {
      mainContent.scrollBy(scrollOptions);
    } else if (container) {
      container.scrollBy(scrollOptions);
    } else {
      window.scrollBy(scrollOptions);
    }

    // Double-check after animation completes
    setTimeout(() => {
      const newRect = input.getBoundingClientRect();
      if (newRect.bottom > visibleAreaBottom) {
        const additionalScroll = newRect.bottom - visibleAreaBottom + 20;
        if (dialogContent) {
          dialogContent.scrollBy({ top: additionalScroll, behavior: 'smooth' });
        } else if (dialog) {
          dialog.scrollBy({ top: additionalScroll, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: additionalScroll, behavior: 'smooth' });
        }
      }
    }, 350);
  }
};

/**
 * useGlobalKeyboardListener - Hook that automatically attaches keyboard to all inputs
 * Only works when keyboard is ENABLED via the toggle
 */
export const useGlobalKeyboardListener = () => {
  const {
    isVisible,
    isEnabled,
    showKeyboard,
    hideKeyboard,
    setActiveInput,
    getActiveInput,
    getKeyboardRef
  } = useVirtualKeyboard();

  const keyboardContainerRef = useRef(null);

  // Handle focus on any input/textarea
  const handleFocusIn = useCallback((e) => {
    // IMPORTANT: Don't do anything if keyboard is disabled
    if (!isEnabled) return;

    const target = e.target;

    // Check if target is an input or textarea
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Skip special input types
      const skipTypes = ['checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'hidden', 'range', 'color', 'date', 'datetime-local', 'time', 'month', 'week'];
      if (target.type && skipTypes.includes(target.type)) {
        return;
      }

      // Skip if input has data attribute to disable keyboard
      if (target.dataset.noKeyboard === 'true') {
        return;
      }

      setActiveInput(target);
      showKeyboard();

      // Sync keyboard with current input value
      const keyboard = getKeyboardRef();
      if (keyboard) {
        keyboard.setInput(target.value || '');
      }

      // Smooth scroll input into view after keyboard animation
      setTimeout(() => {
        scrollInputAboveKeyboard(target);
      }, 300);
    }
  }, [isEnabled, setActiveInput, showKeyboard, getKeyboardRef]);

  // Handle click outside to close keyboard
  const handleClickOutside = useCallback((e) => {
    // Don't do anything if keyboard not visible or disabled
    if (!isVisible || !isEnabled) return;

    const target = e.target;

    // Check if click is on an input (allow switching between inputs)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Check if click is inside the keyboard
    const keyboardWrapper = document.querySelector('.virtual-keyboard-wrapper');
    if (keyboardWrapper && keyboardWrapper.contains(target)) {
      // Refocus the active input to keep it active
      const activeInput = getActiveInput();
      if (activeInput) {
        setTimeout(() => {
          activeInput.focus();
        }, 10);
      }
      return;
    }

    // Close keyboard
    hideKeyboard();
  }, [isVisible, isEnabled, hideKeyboard, getActiveInput]);

  // Setup global event listeners
  useEffect(() => {
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [handleFocusIn, handleClickOutside]);

  return { keyboardContainerRef };
};

export default useKeyboardInput;
