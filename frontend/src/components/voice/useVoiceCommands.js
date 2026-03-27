/**
 * useVoiceCommands Hook
 *
 * Custom hook for processing voice commands and executing actions.
 * Works independently of the speech-to-text functionality.
 */

import { useCallback, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { matchCommand, getCommandFeedback, getVoiceCommandHelp } from './voiceCommands';
import { TranslationContext } from '../../i18n/TranslationContext';

/**
 * Voice command result states
 */
export const COMMAND_RESULT = {
  SUCCESS: 'success',
  NOT_RECOGNIZED: 'not_recognized',
  ERROR: 'error',
};

/**
 * Hook for processing and executing voice commands
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onCommandExecuted - Callback when a command is executed
 * @param {Function} options.onServiceOpen - Callback to open a service dialog (receives department, serviceId)
 * @param {Function} options.onShowHelp - Callback to show help
 */
export function useVoiceCommands(options = {}) {
  const {
    onCommandExecuted,
    onServiceOpen,
    onShowHelp,
  } = options;

  const navigate = useNavigate();
  const location = useLocation();
  const translationContext = useContext(TranslationContext);
  const currentLanguage = translationContext?.language || 'en';

  const [lastCommand, setLastCommand] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [feedback, setFeedback] = useState('');

  /**
   * Execute a matched command
   */
  const executeCommand = useCallback(async (command) => {
    console.log('[executeCommand] Starting execution for:', command);

    if (!command) {
      console.log('[executeCommand] No command provided');
      return false;
    }

    try {
      console.log('[executeCommand] Command action:', command.action);

      switch (command.action) {
        case 'navigate':
          // Navigate to the specified route
          if (command.route) {
            console.log('[executeCommand] Navigating to:', command.route);
            navigate(command.route);
            return true;
          }
          break;

        case 'openService':
          // Open a specific service within a department
          if (command.department && command.serviceId) {
            // Navigate to the department page with service parameter
            const departmentRoute = `/${command.department}?service=${command.serviceId}`;
            console.log('[executeCommand] Opening service:', departmentRoute);
            navigate(departmentRoute);
            return true;
          }
          break;

        case 'goBack':
          // Go back in history or navigate to home
          console.log('[executeCommand] Going back');
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
          return true;

        case 'submit':
          // Find and click the submit button
          console.log('[executeCommand] Looking for submit button');
          const submitButton = document.querySelector(
            'button[type="submit"], button.submit-button, button:contains("Submit")'
          ) || document.querySelector(
            'button[class*="submit"], button[class*="Submit"]'
          );
          if (submitButton) {
            console.log('[executeCommand] Clicking submit button');
            submitButton.click();
            return true;
          }
          // Try to find any primary button
          const primaryButton = document.querySelector(
            '.MuiButton-containedPrimary'
          );
          if (primaryButton) {
            console.log('[executeCommand] Clicking primary button');
            primaryButton.click();
            return true;
          }
          console.log('[executeCommand] No submit button found');
          return false;

        case 'closeDialog':
          // Find and click the close button
          console.log('[executeCommand] Closing dialog');
          const closeButton = document.querySelector(
            'button[aria-label="close"], .MuiDialog-root button.MuiIconButton-root, button[class*="close"]'
          );
          if (closeButton) {
            closeButton.click();
            return true;
          }
          // Try pressing Escape
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
          return true;

        case 'scrollDown':
          // Scroll down the page or dialog content
          console.log('[executeCommand] Scrolling down');
          const scrollContainer = document.querySelector('.MuiDialog-paper') ||
            document.querySelector('.kiosk-form-shell') ||
            window;
          if (scrollContainer === window) {
            window.scrollBy({ top: 300, behavior: 'smooth' });
          } else {
            scrollContainer.scrollBy({ top: 300, behavior: 'smooth' });
          }
          return true;

        case 'scrollUp':
          // Scroll up the page or dialog content
          console.log('[executeCommand] Scrolling up');
          const scrollContainerUp = document.querySelector('.MuiDialog-paper') ||
            document.querySelector('.kiosk-form-shell') ||
            window;
          if (scrollContainerUp === window) {
            window.scrollBy({ top: -300, behavior: 'smooth' });
          } else {
            scrollContainerUp.scrollBy({ top: -300, behavior: 'smooth' });
          }
          return true;

        case 'showHelp':
          // Show help dialog
          console.log('[executeCommand] Showing help');
          if (onShowHelp) {
            onShowHelp(getVoiceCommandHelp(currentLanguage));
            return true;
          }
          break;

        default:
          console.warn('[executeCommand] Unknown command action:', command.action);
          return false;
      }
    } catch (error) {
      console.error('[executeCommand] Error executing voice command:', error);
      return false;
    }

    console.log('[executeCommand] Command not executed');
    return false;
  }, [navigate, location, currentLanguage, onServiceOpen, onShowHelp]);

  /**
   * Process voice input text and execute matching command
   *
   * @param {string} text - The recognized speech text
   * @returns {Object} - Result object with status, command, and feedback
   */
  const processVoiceCommand = useCallback((text) => {
    console.log('[processVoiceCommand] Processing text:', text);
    console.log('[processVoiceCommand] Current language:', currentLanguage);

    if (!text || typeof text !== 'string') {
      console.log('[processVoiceCommand] Invalid text input');
      setLastResult(COMMAND_RESULT.NOT_RECOGNIZED);
      setFeedback('');
      return { status: COMMAND_RESULT.NOT_RECOGNIZED, command: null, feedback: '' };
    }

    // Try to match a command
    const matchedCommand = matchCommand(text, currentLanguage);
    console.log('[processVoiceCommand] Matched command:', matchedCommand);

    if (matchedCommand) {
      // Get feedback message
      const feedbackMsg = getCommandFeedback(matchedCommand, currentLanguage);
      console.log('[processVoiceCommand] Feedback:', feedbackMsg);
      setFeedback(feedbackMsg);
      setLastCommand(matchedCommand);

      // Execute the command
      console.log('[processVoiceCommand] Executing command...');
      const success = executeCommand(matchedCommand);
      console.log('[processVoiceCommand] Execution success:', success);

      if (success) {
        setLastResult(COMMAND_RESULT.SUCCESS);

        // Call callback if provided
        if (onCommandExecuted) {
          onCommandExecuted(matchedCommand, text);
        }

        return {
          status: COMMAND_RESULT.SUCCESS,
          command: matchedCommand,
          feedback: feedbackMsg,
          recognizedText: text,
        };
      } else {
        setLastResult(COMMAND_RESULT.ERROR);
        return {
          status: COMMAND_RESULT.ERROR,
          command: matchedCommand,
          feedback: 'Command could not be executed',
          recognizedText: text,
        };
      }
    } else {
      // No command matched
      console.log('[processVoiceCommand] No command matched for text:', text);
      setLastResult(COMMAND_RESULT.NOT_RECOGNIZED);
      setLastCommand(null);

      const notRecognizedMsg = {
        en: 'Command not recognized, please try again',
        hi: 'कमांड पहचाना नहीं गया, कृपया फिर से प्रयास करें',
        mr: 'कमांड ओळखले नाही, कृपया पुन्हा प्रयत्न करा',
      };

      setFeedback(notRecognizedMsg[currentLanguage] || notRecognizedMsg.en);

      return {
        status: COMMAND_RESULT.NOT_RECOGNIZED,
        command: null,
        feedback: notRecognizedMsg[currentLanguage] || notRecognizedMsg.en,
        recognizedText: text,
      };
    }
  }, [currentLanguage, executeCommand, onCommandExecuted]);

  /**
   * Get help information for voice commands
   */
  const getHelp = useCallback(() => {
    return getVoiceCommandHelp(currentLanguage);
  }, [currentLanguage]);

  /**
   * Clear the feedback message
   */
  const clearFeedback = useCallback(() => {
    setFeedback('');
    setLastResult(null);
  }, []);

  return {
    // Process function
    processVoiceCommand,

    // State
    lastCommand,
    lastResult,
    feedback,
    currentLanguage,

    // Helpers
    getHelp,
    clearFeedback,

    // Constants
    COMMAND_RESULT,
  };
}

export default useVoiceCommands;
