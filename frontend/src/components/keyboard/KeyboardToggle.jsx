import React from 'react';
import { useVirtualKeyboard } from './VirtualKeyboardContext';
import './KeyboardToggle.css';

/**
 * KeyboardToggle - Small toggle button to enable/disable virtual keyboard
 * Positioned at top right corner
 */
const KeyboardToggle = () => {
  const { isEnabled, toggleEnabled } = useVirtualKeyboard();

  return (
    <button
      className={`keyboard-toggle-btn ${isEnabled ? 'enabled' : 'disabled'}`}
      onClick={toggleEnabled}
      title={isEnabled ? 'Disable virtual keyboard' : 'Enable virtual keyboard'}
      aria-label={isEnabled ? 'Disable virtual keyboard' : 'Enable virtual keyboard'}
      type="button"
      data-no-translate="true"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor"
      >
        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
      </svg>
      {!isEnabled && (
        <span className="toggle-off-line"></span>
      )}
      <span className="keyboard-toggle-label">
        {isEnabled ? 'Keyboard On' : 'Keyboard Off'}
      </span>
    </button>
  );
};

export default KeyboardToggle;
