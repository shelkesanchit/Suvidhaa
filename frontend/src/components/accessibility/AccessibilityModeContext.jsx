/**
 * Accessibility Mode Context
 * Global state provider for accessibility mode features
 * Integrates with VoiceInputContext for STT and uses TTS for voice output
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVoiceInputContext } from '../voice/VoiceInputContext';
import ttsService from './ttsService';
import {
  DEPARTMENT_MENU,
  TIMEOUT_CONFIG,
  matchCommand,
  matchDepartment,
  extractNumber,
  getMessage
} from './accessibilityCommands';
import { verifyUDID } from './udidService';

// Flow states
export const FLOW_STATES = {
  IDLE: 'idle',
  WELCOME: 'welcome',
  UDID_INPUT: 'udid_input',
  DEPARTMENT_SELECT: 'department_select',
  SERVICE_SELECT: 'service_select',
  FORM_FILLING: 'form_filling',
  CONFIRMATION: 'confirmation',
  SUBMITTED: 'submitted'
};

// Create context
const AccessibilityModeContext = createContext(null);

/**
 * Accessibility Mode Provider Component
 */
export function AccessibilityModeProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Get voice input context for STT
  const voiceInput = useVoiceInputContext();

  // Core state
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const [currentFlow, setCurrentFlow] = useState(FLOW_STATES.IDLE);
  const [language, setLanguage] = useState('en');

  // UDID state
  const [udidData, setUdidData] = useState(null);
  const [isVerifyingUdid, setIsVerifyingUdid] = useState(false);

  // Navigation state
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [currentService, setCurrentService] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);

  // Form state
  const [currentFormStep, setCurrentFormStep] = useState(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');

  // Refs for callbacks
  const voiceCallbackRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  // Set up TTS callbacks
  useEffect(() => {
    ttsService.onSpeakStart = () => {
      console.log('[A11y] TTS started speaking');
      setIsSpeaking(true);
      // Stop voice recognition while speaking to prevent feedback
      if (voiceInput && voiceInput.isListening) {
        voiceInput.stopListening();
      }
    };
    ttsService.onSpeakEnd = () => {
      console.log('[A11y] TTS finished speaking');
      setIsSpeaking(false);
    };

    return () => {
      ttsService.onSpeakStart = null;
      ttsService.onSpeakEnd = null;
    };
  }, [voiceInput]);

  // Update TTS language when language changes
  useEffect(() => {
    ttsService.setLanguage(language);
  }, [language]);

  /**
   * Speak text using TTS - always returns a promise
   */
  const speak = useCallback((text, priority = 'normal') => {
    if (!text) return Promise.resolve();

    console.log('[A11y] Speaking:', text.substring(0, 50) + '...');
    setLastPrompt(text);

    // Always use speak() which returns a promise and speaks immediately
    return ttsService.speak(text).catch(err => {
      console.error('[A11y] TTS Error:', err);
    });
  }, []);

  /**
   * Start listening for voice input using VoiceInputContext
   */
  const startListening = useCallback((callback) => {
    if (!voiceInput || !voiceInput.isSupported) {
      console.warn('[A11y] Voice input not supported');
      return;
    }

    console.log('[A11y] Starting to listen...');
    setIsListening(true);
    voiceCallbackRef.current = callback;

    // Use VoiceInputContext's startListening
    voiceInput.startListening((transcript) => {
      console.log('[A11y] Got transcript:', transcript);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setIsListening(false);
      retryCountRef.current = 0;

      // Process the voice input
      const command = matchCommand(transcript, language);
      console.log('[A11y] Matched command:', command);

      // Check for global commands
      if (command === 'DISABLE_ACCESSIBILITY') {
        disableAccessibilityMode();
        return;
      }

      if (command === 'REPEAT') {
        repeatLast();
        return;
      }

      if (command === 'HELP') {
        speak(getMessage('helpMessage', language));
        return;
      }

      // Call the callback with the transcript
      if (voiceCallbackRef.current) {
        const cb = voiceCallbackRef.current;
        voiceCallbackRef.current = null;
        cb(transcript, command);
      }
    });

    // Set up timeout for no response - but don't timeout too quickly
    timeoutRef.current = setTimeout(() => {
      console.log('[A11y] Timeout - no response after 30 seconds');
      if (voiceInput.isListening) {
        voiceInput.stopListening();
      }
      setIsListening(false);

      retryCountRef.current++;
      if (retryCountRef.current >= TIMEOUT_CONFIG.retryCount) {
        // After many retries, offer help and then listen again
        speak(getMessage('helpMessage', language)).then(() => {
          setTimeout(() => {
            if (voiceCallbackRef.current || callback) {
              console.log('[A11y] Continuing to listen after help...');
              startListening(callback);
            }
          }, 1000);
        });
        retryCountRef.current = 0;
      } else {
        // Still retry - speak and then listen again
        speak(getMessage('noResponse', language)).then(() => {
          setTimeout(() => {
            if (isAccessibilityMode && currentFlow !== FLOW_STATES.IDLE) {
              console.log('[A11y] Continuing to listen after no response...');
              startListening(callback);
            }
          }, 1000);
        });
      }
    }, TIMEOUT_CONFIG.voiceInput);
  }, [voiceInput, language, speak, isAccessibilityMode, currentFlow]);

  /**
   * Speak and then listen for a response
   */
  const speakAndListen = useCallback((text, callback, timeout = TIMEOUT_CONFIG.voiceInput) => {
    console.log('[A11y] Speak and listen:', text.substring(0, 50) + '...');
    setLastPrompt(text);

    // Speak first, then start listening after speech completes
    speak(text).then(() => {
      // Wait for speech to fully complete before listening - LONGER delay
      setTimeout(() => {
        console.log('[A11y] Now starting to listen for response...');
        startListening(callback);
      }, 1500); // Increased from 1000ms to 1500ms
    });
  }, [speak, startListening]);

  /**
   * Stop speaking and clear queue
   */
  const stopSpeaking = useCallback(() => {
    ttsService.stop();
    setIsSpeaking(false);
  }, []);

  /**
   * Repeat the last prompt
   */
  const repeatLast = useCallback(() => {
    if (lastPrompt) {
      speak(lastPrompt);
    }
  }, [lastPrompt, speak]);

  /**
   * Enable accessibility mode
   */
  const enableAccessibilityMode = useCallback(async () => {
    console.log('[A11y] Enabling accessibility mode');

    // STEP 1: Enable audio context with user gesture
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (window.AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('[A11y] Audio context resumed');
        }
        console.log('[A11y] Audio context state:', audioContext.state);
      }
    } catch (e) {
      console.warn('[A11y] Audio context error:', e);
    }

    // STEP 2: FORCE load voices and wait
    console.log('[A11y] Force loading voices...');
    window.speechSynthesis.cancel();

    // Get voices multiple times to ensure loading
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Wait for voices to load
      await new Promise(resolve => {
        let attempts = 0;
        const checkVoices = () => {
          voices = window.speechSynthesis.getVoices();
          attempts++;
          if (voices.length > 0 || attempts > 10) {
            resolve();
          } else {
            setTimeout(checkVoices, 200);
          }
        };
        checkVoices();
      });
    }

    console.log('[A11y] Voices available:', voices.length);
    if (voices.length > 0) {
      console.log('[A11y] Sample voices:', voices.slice(0, 3).map(v => v.name));
    }

    // STEP 3: IMMEDIATE LOUD TEST
    console.log('[A11y] IMMEDIATE LOUD VOICE TEST...');
    const testSynthesis = window.speechSynthesis;
    testSynthesis.cancel();

    // Find BEST local English voice
    let testVoice = voices.find(v =>
      v.lang.startsWith('en') &&
      v.localService &&
      !v.name.includes('Online')
    );
    if (!testVoice) {
      testVoice = voices.find(v => v.lang.startsWith('en'));
    }
    if (!testVoice) {
      testVoice = voices[0];
    }

    console.log('[A11y] Using LOUD test voice:', testVoice?.name);

    if (testVoice) {
      const loudTest = new SpeechSynthesisUtterance('HELLO! ACCESSIBILITY MODE STARTING!');
      loudTest.voice = testVoice;
      loudTest.volume = 1.0;
      loudTest.rate = 1.0;
      loudTest.pitch = 1.0;
      loudTest.lang = testVoice.lang;

      console.log('[A11y] LOUD TEST CONFIG:', {
        text: loudTest.text,
        volume: loudTest.volume,
        voice: loudTest.voice.name,
        lang: loudTest.lang
      });

      // Speak LOUD test and wait
      const testPromise = new Promise((resolve) => {
        let resolved = false;

        loudTest.onstart = () => {
          console.log('[A11y] 🔊 LOUD TEST - Speech STARTED!');
        };

        loudTest.onend = () => {
          console.log('[A11y] ✅ LOUD TEST - Speech COMPLETED!');
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        loudTest.onerror = (e) => {
          console.error('[A11y] ❌ LOUD TEST ERROR:', e.error);
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        // Backup timeout
        setTimeout(() => {
          if (!resolved) {
            console.log('[A11y] ⏰ LOUD TEST - Timeout after 5 seconds');
            resolved = true;
            resolve();
          }
        }, 5000);

        testSynthesis.speak(loudTest);
      });

      await testPromise;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Extra wait
    }

    // STEP 4: Enable TTS service and continue with normal flow
    ttsService.enable(); // Enable TTS service now
    setIsAccessibilityMode(true);
    setCurrentFlow(FLOW_STATES.WELCOME);

    // Ensure TTS service is ready
    await ttsService.waitForVoices(2000);

    // STEP 5: Welcome message with backup
    console.log('[A11y] Speaking welcome message...');
    try {
      await speak(getMessage('welcome', language));
      console.log('[A11y] Welcome message completed');
    } catch (e) {
      console.error('[A11y] Welcome failed, using backup:', e);
      // Backup direct speech
      const backupMsg = new SpeechSynthesisUtterance(getMessage('welcome', language));
      if (testVoice) backupMsg.voice = testVoice;
      backupMsg.volume = 1.0;
      testSynthesis.speak(backupMsg);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // STEP 6: Ask for UDID
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCurrentFlow(FLOW_STATES.UDID_INPUT);
    speakAndListen(getMessage('askUdid', language), handleUdidInput);

  }, [language, speak, speakAndListen]);

  /**
   * Disable accessibility mode
   */
  const disableAccessibilityMode = useCallback(() => {
    console.log('[A11y] Disabling accessibility mode');

    // STEP 1: IMMEDIATELY disable TTS service so NOTHING can speak anymore
    // This prevents any new speech from starting (UDID prompts, etc.)
    console.log('[A11y] IMMEDIATELY disabling TTS service to block all future speech');
    ttsService.disable();

    // STEP 2: Stop everything immediately
    ttsService.stop();

    // Stop any ongoing listening
    if (voiceInput && voiceInput.isListening) {
      voiceInput.stopListening();
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clear callback
    voiceCallbackRef.current = null;

    // Reset all state
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentFlow(FLOW_STATES.IDLE);
    setUdidData(null);
    setCurrentDepartment(null);
    setCurrentService(null);
    setFormFields([]);
    setFormData({});
    setCurrentFormStep(0);
    setCurrentFieldIndex(0);
    setLastPrompt('');

    // STEP 3: Speak ONLY the exit message using force: true (bypasses disabled check)
    // This is the ONLY thing allowed to speak after disabling
    ttsService.speak(getMessage('exitMode', language), { force: true }).then(() => {
      console.log('[A11y] Exit message completed, TTS already disabled');
      setIsAccessibilityMode(false);
    }).catch(() => {
      console.log('[A11y] Exit message failed, TTS already disabled');
      setIsAccessibilityMode(false);
    });
  }, [language, voiceInput]);

  /**
   * Handle UDID input
   */
  const handleUdidInput = useCallback(async (transcript, command) => {
    console.log('[A11y] UDID input:', transcript, 'command:', command);

    // Check for skip command
    if (command === 'SKIP' || transcript.toLowerCase().includes('skip')) {
      setCurrentFlow(FLOW_STATES.DEPARTMENT_SELECT);
      speakAndListen(
        DEPARTMENT_MENU.prompt[language] || DEPARTMENT_MENU.prompt.en,
        handleDepartmentSelect
      );
      return;
    }

    // Convert spoken numbers to digits
    const numberWords = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'to': '2', 'too': '2', 'for': '4', 'won': '1', 'ate': '8',
      'oh': '0', 'o': '0'
    };

    let processed = transcript.toLowerCase();

    // Replace number words with digits
    for (const [word, digit] of Object.entries(numberWords)) {
      processed = processed.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    }

    // Extract UDID - handle "BLIND" spoken as "blind"
    const cleaned = processed.replace(/\s+/g, '').toUpperCase();

    // Look for patterns like BLIND12345 or just numbers
    let possibleUdid = '';

    // Check if it contains "BLIND"
    if (cleaned.includes('BLIND')) {
      // Extract BLIND followed by numbers
      const match = cleaned.match(/BLIND\d+/);
      possibleUdid = match ? match[0] : '';
    } else {
      // Try to extract any alphanumeric pattern
      const match = cleaned.match(/[A-Z]*\d+/);
      possibleUdid = match ? match[0] : cleaned.replace(/[^A-Z0-9]/g, '');
    }

    // If just numbers, prepend BLIND for demo IDs
    if (possibleUdid && /^\d+$/.test(possibleUdid) && possibleUdid.length >= 5) {
      possibleUdid = 'BLIND' + possibleUdid;
    }

    console.log('[A11y] Processed UDID:', possibleUdid, 'from:', transcript);

    if (!possibleUdid || possibleUdid.length < 5) {
      // Give user another chance with helpful message
      const helpMsg = language === 'en'
        ? 'I did not catch that. Please say your UDID clearly, like BLIND one two three four five. Or say skip to continue without ID.'
        : 'मैं समझ नहीं पाया। कृपया अपना यूडीआईडी स्पष्ट रूप से बोलें। या स्किप बोलें।';
      speak(helpMsg).then(() => {
        setTimeout(() => {
          speakAndListen(getMessage('askUdid', language), handleUdidInput);
        }, 500);
      });
      return;
    }

    setIsVerifyingUdid(true);

    try {
      const result = await verifyUDID(possibleUdid);
      console.log('[A11y] UDID verification result:', result);
      setIsVerifyingUdid(false);

      if (result.success && result.data) {
        setUdidData(result.data);

        // Announce success
        const msg = possibleUdid.includes('BLIND')
          ? getMessage('sampleProfile', language)
          : getMessage('udidVerified', language);

        await speak(msg);

        // Announce name
        const nameMsg = language === 'en'
          ? `Your name is ${result.data.full_name}.`
          : `आपका नाम ${result.data.full_name} है।`;
        await speak(nameMsg);

        // Move to department selection
        setTimeout(() => {
          setCurrentFlow(FLOW_STATES.DEPARTMENT_SELECT);
          speakAndListen(
            DEPARTMENT_MENU.prompt[language] || DEPARTMENT_MENU.prompt.en,
            handleDepartmentSelect
          );
        }, 1000);
      } else {
        speak(getMessage('udidNotFound', language)).then(() => {
          speakAndListen(getMessage('askUdid', language), handleUdidInput);
        });
      }
    } catch (error) {
      console.error('[A11y] UDID verification error:', error);
      setIsVerifyingUdid(false);
      speak(getMessage('networkError', language)).then(() => {
        speakAndListen(getMessage('askUdid', language), handleUdidInput);
      });
    }
  }, [language, speak, speakAndListen]);

  /**
   * Navigate to a department with proper speech handling
   * Waits for speech to complete before navigating
   */
  const navigateWithSpeech = useCallback((dept) => {
    console.log('[A11y] Navigating to:', dept.route);

    const navMsg = language === 'en'
      ? `Taking you to ${dept.names.en} services. Please wait.`
      : `${dept.names[language] || dept.names.en} सेवाओं पर ले जाया जा रहा है। कृपया प्रतीक्षा करें।`;

    // Speak navigation message, then navigate after it completes
    speak(navMsg).then(() => {
      // Small delay after speech before navigating
      setTimeout(() => {
        navigate(dept.route);
      }, 500);
    }).catch(() => {
      // Navigate even if speech fails
      navigate(dept.route);
    });
  }, [language, navigate, speak]);

  /**
   * Handle department selection
   */
  const handleDepartmentSelect = useCallback((transcript, command) => {
    console.log('[A11y] Department select:', transcript, 'command:', command);

    // Check for number selection
    const number = extractNumber(transcript, language);
    if (number && number <= DEPARTMENT_MENU.options.length) {
      const dept = DEPARTMENT_MENU.options[number - 1];
      selectDepartment(dept);
      return;
    }

    // Check for department name
    const dept = matchDepartment(transcript, language);
    if (dept) {
      selectDepartment(dept);
      return;
    }

    // Check command-based selection (SELECT_1, SELECT_2, etc.)
    if (command && command.startsWith('SELECT_')) {
      const num = parseInt(command.replace('SELECT_', ''));
      if (num > 0 && num <= DEPARTMENT_MENU.options.length) {
        const dept = DEPARTMENT_MENU.options[num - 1];
        selectDepartment(dept);
        return;
      }
    }

    // Didn't understand
    speak(getMessage('unclearVoice', language)).then(() => {
      speakAndListen(
        DEPARTMENT_MENU.prompt[language] || DEPARTMENT_MENU.prompt.en,
        handleDepartmentSelect
      );
    });
  }, [language, speak, speakAndListen]);

  /**
   * Select a department and navigate
   */
  const selectDepartment = useCallback((dept) => {
    console.log('[A11y] Selected department:', dept);
    setCurrentDepartment(dept);
    setCurrentFlow(FLOW_STATES.SERVICE_SELECT);

    const confirmMsg = language === 'en'
      ? `You selected ${dept.names.en}. ${getMessage('confirmYes', language)}`
      : `आपने ${dept.names[language] || dept.names.en} चुना है। ${getMessage('confirmYes', language)}`;

    speakAndListen(confirmMsg, (transcript, command) => {
      const lowerTranscript = transcript.toLowerCase();

      if (command === 'YES' || lowerTranscript.includes('yes') || lowerTranscript.includes('हां') || lowerTranscript.includes('हाँ')) {
        // Navigate with speech - stop listening, speak, then navigate
        navigateWithSpeech(dept);
      } else if (command === 'NO' || command === 'CHANGE' || lowerTranscript.includes('no') || lowerTranscript.includes('नहीं')) {
        setCurrentDepartment(null);
        setCurrentFlow(FLOW_STATES.DEPARTMENT_SELECT);
        speakAndListen(
          DEPARTMENT_MENU.prompt[language] || DEPARTMENT_MENU.prompt.en,
          handleDepartmentSelect
        );
      } else {
        // Assume yes if unclear
        navigateWithSpeech(dept);
      }
    });
  }, [language, navigateWithSpeech, speakAndListen, handleDepartmentSelect]);

  /**
   * Register available services for current page
   */
  const registerServices = useCallback((services) => {
    console.log('[A11y] Registering services:', services.length);

    setAvailableServices(services);

    if (isAccessibilityMode && currentFlow === FLOW_STATES.SERVICE_SELECT) {
      // Wait longer for navigation speech to complete
      setTimeout(() => {
        // Build announcement
        const serviceList = services.map((s, i) => `${i + 1} for ${s.name}`).join(', ');
        const announcement = language === 'en'
          ? `Available services: Say ${serviceList}.`
          : `उपलब्ध सेवाएं: ${serviceList} बोलें।`;

        speakAndListen(announcement, (transcript, command) => {
          handleServiceSelect(transcript, command, services);
        });
      }, 1500); // Increased from 500ms to 1500ms
    }
  }, [isAccessibilityMode, currentFlow, language, speakAndListen]);

  /**
   * Handle service selection
   */
  const handleServiceSelect = useCallback((transcript, command, services = availableServices) => {
    console.log('[A11y] Service select:', transcript, 'from', services.length, 'services');

    const number = extractNumber(transcript, language);
    if (number && number <= services.length) {
      const service = services[number - 1];
      selectService(service, services);
      return;
    }

    // Check command-based selection
    if (command && command.startsWith('SELECT_')) {
      const num = parseInt(command.replace('SELECT_', ''));
      if (num > 0 && num <= services.length) {
        const service = services[num - 1];
        selectService(service, services);
        return;
      }
    }

    // Try matching service name
    const lowerTranscript = transcript.toLowerCase();
    const matched = services.find(s =>
      lowerTranscript.includes(s.name.toLowerCase()) ||
      (s.keywords && s.keywords.some(k => lowerTranscript.includes(k.toLowerCase())))
    );

    if (matched) {
      selectService(matched, services);
      return;
    }

    // Didn't understand
    speak(getMessage('unclearVoice', language)).then(() => {
      registerServices(services);
    });
  }, [availableServices, language, speak, registerServices]);

  /**
   * Select a service
   */
  const selectService = useCallback((service, services = availableServices) => {
    console.log('[A11y] Selected service:', service);
    setCurrentService(service);

    const confirmMsg = language === 'en'
      ? `You selected ${service.name}. ${getMessage('confirmYes', language)}`
      : `आपने ${service.name} चुना है। ${getMessage('confirmYes', language)}`;

    speakAndListen(confirmMsg, (transcript, command) => {
      const lowerTranscript = transcript.toLowerCase();

      if (command === 'YES' || lowerTranscript.includes('yes') || lowerTranscript.includes('हां')) {
        setCurrentFlow(FLOW_STATES.FORM_FILLING);
        if (service.onSelect) {
          service.onSelect();
        }
      } else if (command === 'NO' || command === 'CHANGE') {
        setCurrentService(null);
        registerServices(services);
      } else {
        // Assume yes
        setCurrentFlow(FLOW_STATES.FORM_FILLING);
        if (service.onSelect) {
          service.onSelect();
        }
      }
    });
  }, [availableServices, language, speakAndListen, registerServices]);

  /**
   * Register form fields for voice-guided filling
   */
  const registerFormFields = useCallback((fields) => {
    console.log('[A11y] Registering form fields:', fields.length);
    setFormFields(fields);
    setCurrentFieldIndex(0);

    // Auto-fill from UDID data
    if (udidData) {
      const autoFilled = {};
      fields.forEach(field => {
        if (field.autoFillKey) {
          if (field.autoFillKey.includes('.')) {
            const keys = field.autoFillKey.split('.');
            let value = udidData;
            for (const key of keys) {
              value = value?.[key];
            }
            if (value) autoFilled[field.name] = value;
          } else if (udidData[field.autoFillKey]) {
            autoFilled[field.name] = udidData[field.autoFillKey];
          }
        }
      });
      setFormData(prev => ({ ...prev, ...autoFilled }));
    }

    if (isAccessibilityMode) {
      announceCurrentField(0, fields);
    }
  }, [udidData, isAccessibilityMode]);

  /**
   * Announce current form field
   */
  const announceCurrentField = useCallback((index, fields = formFields) => {
    if (index < 0 || index >= fields.length) {
      setCurrentFlow(FLOW_STATES.CONFIRMATION);
      speakAndListen(getMessage('formComplete', language), handleFormConfirmation);
      return;
    }

    const field = fields[index];
    const currentValue = formData[field.name];

    let announcement;
    if (currentValue) {
      announcement = language === 'en'
        ? `Your ${field.label?.en || field.name} is ${currentValue}. Say next to continue or change to edit.`
        : `आपका ${field.label?.hi || field.name} ${currentValue} है। आगे बढ़ने के लिए नेक्स्ट बोलें।`;
    } else if (field.required) {
      announcement = language === 'en'
        ? `Please say your ${field.label?.en || field.name}.`
        : `कृपया अपना ${field.label?.hi || field.name} बताएं।`;
    } else {
      announcement = language === 'en'
        ? `${field.label?.en || field.name} is optional. Say skip to continue.`
        : `${field.label?.hi || field.name} वैकल्पिक है। स्किप बोलें।`;
    }

    setCurrentFieldIndex(index);
    speakAndListen(announcement, (transcript, command) =>
      handleFieldInput(transcript, command, field, index, fields)
    );
  }, [formFields, formData, language, speakAndListen]);

  /**
   * Handle field input
   */
  const handleFieldInput = useCallback((transcript, command, field, index, fields = formFields) => {
    if (command === 'NEXT') {
      announceCurrentField(index + 1, fields);
      return;
    }

    if (command === 'BACK') {
      announceCurrentField(Math.max(0, index - 1), fields);
      return;
    }

    if (command === 'SKIP') {
      if (!field.required) {
        announceCurrentField(index + 1, fields);
      } else {
        speak(language === 'en' ? 'This field is required.' : 'यह फ़ील्ड आवश्यक है।').then(() => {
          announceCurrentField(index, fields);
        });
      }
      return;
    }

    if (command === 'CHANGE') {
      setFormData(prev => ({ ...prev, [field.name]: '' }));
      const prompt = language === 'en'
        ? `Please say your ${field.label?.en || field.name}.`
        : `कृपया अपना ${field.label?.hi || field.name} बताएं।`;
      speakAndListen(prompt, (t, c) => handleFieldInput(t, c, field, index, fields));
      return;
    }

    // Process input value
    let value = transcript.trim();

    if (field.type === 'phone' || field.type === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (field.type === 'aadhaar') {
      value = value.replace(/\D/g, '').slice(0, 12);
    } else if (field.type === 'pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    if (field.validation) {
      const error = field.validation(value);
      if (error) {
        speak(error).then(() => announceCurrentField(index, fields));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [field.name]: value }));

    const confirmMsg = language === 'en'
      ? `Got it. ${field.label?.en || field.name} is ${value}.`
      : `ठीक है। ${field.label?.hi || field.name} ${value} है।`;

    speak(confirmMsg).then(() => {
      setTimeout(() => announceCurrentField(index + 1, fields), 500);
    });
  }, [formFields, language, speak, speakAndListen, announceCurrentField]);

  /**
   * Handle form confirmation
   */
  const handleFormConfirmation = useCallback((transcript, command) => {
    const lowerTranscript = transcript.toLowerCase();

    if (command === 'YES' || command === 'SUBMIT' || lowerTranscript.includes('yes') || lowerTranscript.includes('हां')) {
      setCurrentFlow(FLOW_STATES.SUBMITTED);
      return true;
    }

    if (command === 'NO' || command === 'CHANGE' || command === 'BACK') {
      setCurrentFlow(FLOW_STATES.FORM_FILLING);
      announceCurrentField(0);
      return false;
    }

    speak(getMessage('unclearVoice', language)).then(() => {
      speakAndListen(getMessage('formComplete', language), handleFormConfirmation);
    });
    return null;
  }, [language, speak, speakAndListen, announceCurrentField]);

  /**
   * Announce submission success
   */
  const announceSubmissionSuccess = useCallback((applicationNumber) => {
    const msg = language === 'en'
      ? `${getMessage('formSubmitted', language)} Your application number is ${applicationNumber}.`
      : `${getMessage('formSubmitted', language)} आपका आवेदन नंबर ${applicationNumber} है।`;
    speak(msg);
  }, [language, speak]);

  /**
   * Announce error
   */
  const announceError = useCallback((error) => {
    speak(error);
  }, [speak]);

  /**
   * Process voice input externally
   */
  const processVoiceInput = useCallback((transcript) => {
    if (voiceCallbackRef.current) {
      const command = matchCommand(transcript, language);
      const cb = voiceCallbackRef.current;
      voiceCallbackRef.current = null;
      cb(transcript, command);
    }
  }, [language]);

  // Context value
  const contextValue = {
    // State
    isAccessibilityMode,
    currentFlow,
    language,
    udidData,
    isVerifyingUdid,
    currentDepartment,
    currentService,
    availableServices,
    currentFormStep,
    currentFieldIndex,
    formFields,
    formData,
    isListening,
    isSpeaking,
    lastPrompt,

    // Actions
    enableAccessibilityMode,
    disableAccessibilityMode,
    setLanguage,
    speak,
    speakAndListen,
    stopSpeaking,
    repeatLast,
    processVoiceInput,
    registerServices,
    registerFormFields,
    setFormData,
    announceCurrentField,
    announceSubmissionSuccess,
    announceError,

    // Flow setters
    setCurrentFlow,
    setCurrentFormStep,
    setCurrentFieldIndex
  };

  return (
    <AccessibilityModeContext.Provider value={contextValue}>
      {children}
    </AccessibilityModeContext.Provider>
  );
}

/**
 * Hook to access accessibility mode context
 */
export function useAccessibilityModeContext() {
  const context = useContext(AccessibilityModeContext);
  if (!context) {
    throw new Error('useAccessibilityModeContext must be used within AccessibilityModeProvider');
  }
  return context;
}

export default AccessibilityModeContext;
