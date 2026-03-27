/**
 * Accessibility Module Exports
 * Central export file for all accessibility components and utilities
 */

// Context and Provider
export {
  AccessibilityModeProvider,
  useAccessibilityModeContext,
  FLOW_STATES
} from './AccessibilityModeContext';

// TTS Service
export { default as ttsService, TTSService } from './ttsService';

// Voice Commands
export {
  ACCESSIBILITY_COMMANDS,
  DEPARTMENT_MENU,
  TTS_MESSAGES,
  TIMEOUT_CONFIG,
  matchCommand,
  matchDepartment,
  extractNumber,
  getMessage
} from './accessibilityCommands';

// UDID Service
export {
  verifyUDID,
  getDemoData,
  isDemoUDID,
  mapUDIDToFormData,
  getFieldMapping,
  FIELD_MAPPINGS
} from './udidService';

// UI Components
export {
  AccessibilityModeToggle,
  AccessibilityModeButton
} from './AccessibilityModeToggle';

export {
  AccessibilityOverlay,
  AccessibilityStatusBadge
} from './AccessibilityOverlay';

export {
  VoiceGuidedFormWrapper,
  createFieldConfig
} from './VoiceGuidedFormWrapper';

// Hooks
export {
  useAccessibilityMode,
  useAccessibilityServicePage,
  useAccessibilityForm
} from './useAccessibilityMode';
