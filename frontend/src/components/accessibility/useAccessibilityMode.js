/**
 * useAccessibilityMode Hook
 * Simplified hook for components to interact with accessibility mode
 */
import { useCallback, useEffect } from 'react';
import { useAccessibilityModeContext, FLOW_STATES } from './AccessibilityModeContext';
import { mapUDIDToFormData, getFieldMapping } from './udidService';

/**
 * Hook for components to integrate with accessibility mode
 * @param {Object} options
 * @param {string} options.formType - Form type for field mapping (e.g., 'water_new_connection')
 * @param {Array} options.services - Available services for this page
 * @returns {Object} - Accessibility mode utilities
 */
export function useAccessibilityMode(options = {}) {
  const context = useAccessibilityModeContext();
  const { formType, services } = options;

  // Register services when provided
  useEffect(() => {
    if (services && services.length > 0 && context.isAccessibilityMode) {
      context.registerServices(services);
    }
  }, [services, context.isAccessibilityMode]);

  /**
   * Get auto-fill data for form based on UDID verification
   */
  const getAutoFillData = useCallback(() => {
    if (!context.udidData || !formType) return {};

    const mapping = getFieldMapping(formType);
    return mapUDIDToFormData(context.udidData, mapping);
  }, [context.udidData, formType]);

  /**
   * Announce a message via TTS
   */
  const announce = useCallback((message, priority = 'normal') => {
    if (context.isAccessibilityMode) {
      context.speak(message, priority);
    }
  }, [context.isAccessibilityMode, context.speak]);

  /**
   * Announce an error
   */
  const announceError = useCallback((error) => {
    if (context.isAccessibilityMode) {
      context.announceError(error);
    }
  }, [context.isAccessibilityMode, context.announceError]);

  /**
   * Announce successful submission
   */
  const announceSuccess = useCallback((applicationNumber) => {
    if (context.isAccessibilityMode) {
      context.announceSubmissionSuccess(applicationNumber);
    }
  }, [context.isAccessibilityMode, context.announceSubmissionSuccess]);

  /**
   * Check if a field should be announced (when moving to it)
   */
  const shouldAnnounceField = useCallback((fieldName) => {
    if (!context.isAccessibilityMode) return false;
    if (context.currentFlow !== FLOW_STATES.FORM_FILLING) return false;
    return true;
  }, [context.isAccessibilityMode, context.currentFlow]);

  /**
   * Register form fields for voice-guided filling
   */
  const registerFields = useCallback((fields) => {
    if (context.isAccessibilityMode) {
      context.registerFormFields(fields);
    }
  }, [context.isAccessibilityMode, context.registerFormFields]);

  /**
   * Check if in accessibility mode
   */
  const isActive = context.isAccessibilityMode;

  /**
   * Check if currently listening for voice input
   */
  const isListening = context.isListening;

  /**
   * Check if currently speaking
   */
  const isSpeaking = context.isSpeaking;

  /**
   * Get user's verified data
   */
  const userData = context.udidData;

  /**
   * Get current flow state
   */
  const flowState = context.currentFlow;

  /**
   * Get form data from accessibility mode
   */
  const formData = context.formData;

  /**
   * Update form data
   */
  const updateFormData = context.setFormData;

  return {
    // State
    isActive,
    isListening,
    isSpeaking,
    userData,
    flowState,
    formData,

    // Actions
    announce,
    announceError,
    announceSuccess,
    registerFields,
    updateFormData,
    getAutoFillData,
    shouldAnnounceField,

    // Full context (for advanced use)
    context
  };
}

/**
 * Hook specifically for service pages (Electricity, Water, etc.)
 * @param {Object} options
 * @param {string} options.departmentId - Department identifier
 * @param {Array} options.services - Available services
 */
export function useAccessibilityServicePage({ departmentId, services }) {
  const {
    isActive,
    context
  } = useAccessibilityMode();

  // Register services when page loads and accessibility mode is active
  useEffect(() => {
    if (isActive && services && services.length > 0) {
      // Format services for accessibility
      const formattedServices = services.map((service, index) => ({
        number: index + 1,
        id: service.id,
        name: service.name || service.title,
        keywords: service.keywords || [service.name?.toLowerCase()],
        onSelect: service.onSelect || service.onClick
      }));

      // Add delay after navigation to ensure page is fully loaded
      // and previous speech/recognition has stopped
      const timer = setTimeout(() => {
        console.log('[A11y] Service page loaded, registering services:', departmentId);
        context.registerServices(formattedServices);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isActive, services, context, departmentId]);

  return {
    isActive,
    isListening: context.isListening,
    isSpeaking: context.isSpeaking,
    selectedService: context.currentService
  };
}

/**
 * Hook for form components to integrate with voice-guided filling
 */
export function useAccessibilityForm({ formType, fields, onSubmit }) {
  const {
    isActive,
    userData,
    formData,
    updateFormData,
    registerFields,
    announceSuccess,
    announceError,
    getAutoFillData,
    context
  } = useAccessibilityMode({ formType });

  // Register fields when form loads
  useEffect(() => {
    if (isActive && fields && fields.length > 0) {
      registerFields(fields);
    }
  }, [isActive, fields, registerFields]);

  // Get auto-fill data
  const autoFillData = getAutoFillData();

  // Handle form submission from accessibility mode
  useEffect(() => {
    if (context.currentFlow === FLOW_STATES.SUBMITTED && onSubmit) {
      // Merge form data with auto-fill data
      const finalData = { ...autoFillData, ...formData };
      onSubmit(finalData)
        .then((result) => {
          if (result?.applicationNumber) {
            announceSuccess(result.applicationNumber);
          }
        })
        .catch((error) => {
          announceError(error.message || 'Submission failed');
        });
    }
  }, [context.currentFlow, onSubmit, autoFillData, formData, announceSuccess, announceError]);

  return {
    isActive,
    userData,
    formData: { ...autoFillData, ...formData },
    updateFormData,
    isFormReady: context.currentFlow === FLOW_STATES.CONFIRMATION
  };
}

export default useAccessibilityMode;
