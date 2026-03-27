/**
 * Virtual Keyboard Component Exports
 *
 * A kiosk-style on-screen keyboard with multi-language support (EN, Marathi, Phonetic)
 *
 * Usage:
 * 1. Wrap your app with VirtualKeyboardProvider
 * 2. Add VirtualKeyboard component at the root level
 * 3. Add KeyboardGlobalListener anywhere inside the provider
 *
 * Example:
 * ```jsx
 * import { VirtualKeyboardProvider, VirtualKeyboard, KeyboardGlobalListener } from './components/keyboard';
 *
 * function App() {
 *   return (
 *     <VirtualKeyboardProvider>
 *       <KeyboardGlobalListener />
 *       <YourAppContent />
 *       <VirtualKeyboard />
 *     </VirtualKeyboardProvider>
 *   );
 * }
 * ```
 */

export { VirtualKeyboardProvider, useVirtualKeyboard } from './VirtualKeyboardContext';
export { default as VirtualKeyboard } from './VirtualKeyboard';
export { default as KeyboardToggle } from './KeyboardToggle';
export { useKeyboardInput, useGlobalKeyboardListener } from './useKeyboardInput';
export { getLayout, layoutNames, buttonDisplay, phoneticMapping } from './layouts';

// Convenience component that wraps the global listener hook
import React from 'react';
import { useGlobalKeyboardListener } from './useKeyboardInput';

export const KeyboardGlobalListener = () => {
  useGlobalKeyboardListener();
  return null;
};

export default VirtualKeyboard;
