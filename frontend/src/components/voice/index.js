/**
 * Voice Input Module Exports
 *
 * A kiosk-friendly voice input (speech-to-text) system with multi-language support.
 * Designed for accessibility, especially for handicapped or physically challenged users.
 *
 * Supported Languages:
 * - English (en-IN)
 * - Hindi (hi-IN)
 * - Marathi (uses hi-IN with phonetic processing)
 *
 * Features:
 * 1. Speech-to-Text: Fill form fields using voice input
 * 2. Voice Commands: Navigate and control the app using voice commands
 *
 * Usage:
 * 1. Wrap your app with VoiceInputProvider
 * 2. Add VoiceInput component for floating mic button (speech-to-text)
 * 3. Add VoiceCommandButton for voice commands (speech-to-action)
 * 4. Use VoiceInputButton for inline mic buttons near input fields
 * 5. Use useVoiceInput hook for custom implementations
 *
 * Example - Basic Setup:
 * ```jsx
 * import { VoiceInputProvider, VoiceInput, VoiceCommandButton } from './components/voice';
 *
 * function App() {
 *   return (
 *     <VoiceInputProvider>
 *       <YourAppContent />
 *       <VoiceInput position="top-right" />
 *       <VoiceCommandButton position="bottom-left" />
 *     </VoiceInputProvider>
 *   );
 * }
 * ```
 *
 * Example - With react-hook-form:
 * ```jsx
 * import { VoiceInputButton } from './components/voice';
 * import { useForm } from 'react-hook-form';
 *
 * function MyForm() {
 *   const { register, setValue } = useForm();
 *   const inputRef = useRef();
 *
 *   return (
 *     <Box sx={{ display: 'flex', gap: 1 }}>
 *       <TextField
 *         {...register('name')}
 *         inputRef={inputRef}
 *       />
 *       <VoiceInputButton
 *         inputId="name"
 *         inputRef={inputRef}
 *         setValue={setValue}
 *         fieldName="name"
 *       />
 *     </Box>
 *   );
 * }
 * ```
 *
 * Example - Custom callback:
 * ```jsx
 * import { VoiceInputButton } from './components/voice';
 *
 * function MyComponent() {
 *   const handleVoiceResult = (text) => {
 *     console.log('Voice input:', text);
 *   };
 *
 *   return (
 *     <VoiceInputButton
 *       inputId="custom"
 *       onResult={handleVoiceResult}
 *       size="large"
 *       variant="contained"
 *     />
 *   );
 * }
 * ```
 *
 * Available Voice Commands (English, Hindi, Marathi):
 * - Navigation: "Open electricity", "बिजली खोलो", "वीज उघडा"
 * - Services: "New connection", "नया कनेक्शन", "नवीन कनेक्शन"
 * - Actions: "Go back", "वापस", "मागे"
 * - Help: "Help", "मदद", "मदत"
 */

// Context and Provider
export {
  VoiceInputProvider,
  useVoiceInputContext,
  VOICE_STATUS,
} from './VoiceInputContext';

// Main floating voice input component (speech-to-text)
export { default as VoiceInput } from './VoiceInput';

// Voice command button (speech-to-action)
export { VoiceCommandButton } from './VoiceCommandButton';

// Inline voice input button for form fields
export {
  VoiceInputButton,
  VoiceInputAdornment,
  withVoiceInput,
} from './VoiceInputButton';

// Custom hooks
export {
  useVoiceInput,
  useGlobalVoiceListener,
} from './useVoiceInput';

// Voice commands hook
export {
  useVoiceCommands,
  COMMAND_RESULT,
} from './useVoiceCommands';

// Service auto-open hook (for service pages to support voice commands)
export { useServiceAutoOpen } from './useServiceAutoOpen';

// Voice command utilities
export {
  matchCommand,
  getCommandFeedback,
  getVoiceCommandHelp,
  NAVIGATION_COMMANDS,
  SERVICE_COMMANDS,
  UI_ACTION_COMMANDS,
  ALL_COMMANDS,
} from './voiceCommands';

// Default export
export { VoiceInput as default } from './VoiceInput';
