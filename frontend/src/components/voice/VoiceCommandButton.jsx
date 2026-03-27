/**
 * VoiceCommandButton Component
 *
 * Simple, reliable voice command system for kiosk navigation.
 * Supports English, Hindi, and Marathi commands.
 */

import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  RecordVoiceOver as CommandIcon,
  Stop as StopIcon,
  HelpOutline as HelpIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { TranslationContext } from '../../i18n/TranslationContext';
import {
  findComprehensiveCommand,
  getComprehensiveHelp,
  COMPREHENSIVE_VOICE_COMMANDS
} from './comprehensiveVoiceCommands';

/**
 * Main VoiceCommandButton Component
 */
export function VoiceCommandButton({ position = 'bottom-left' }) {
  const navigate = useNavigate();
  const translationContext = useContext(TranslationContext);
  const lang = translationContext?.language || 'en';

  // State
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('info');
  const [showFeedback, setShowFeedback] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Position styles
  const positionStyle = {
    'bottom-left': { bottom: 100, left: 16 },
    'bottom-right': { bottom: 100, right: 16 },
    'top-left': { top: 100, left: 16 },
    'top-right': { top: 100, right: 16 },
  }[position] || { bottom: 100, left: 16 };

  /**
   * Execute a command - Enhanced for comprehensive command system
   */
  const executeCommand = useCallback((command) => {
    console.log('[VoiceCommand] Executing comprehensive command:', command);

    const feedbackText = command.feedback[lang] || command.feedback.en;

    switch (command.action) {
      case 'navigate':
        setFeedback(feedbackText);
        setFeedbackType('success');
        setTimeout(() => navigate(command.route), 500);
        return true;

      case 'service':
        // Enhanced service handling with department and serviceId
        const targetDept = command.department || 'water'; // default fallback
        const serviceParam = command.serviceId || command.service;

        setFeedback(feedbackText);
        setFeedbackType('success');
        setTimeout(() => navigate(`/${targetDept}?service=${serviceParam}`), 500);
        return true;

      case 'back':
        setFeedback(feedbackText);
        setFeedbackType('success');
        setTimeout(() => navigate(-1), 500);
        return true;

      case 'help':
        setFeedback(feedbackText);
        setFeedbackType('success');
        setTimeout(() => setHelpOpen(true), 300);
        return true;

      case 'close':
        setFeedback(feedbackText);
        setFeedbackType('success');
        // Try to close any open dialog
        const closeBtn = document.querySelector('[aria-label="close"]') ||
          document.querySelector('.MuiDialog-root .MuiIconButton-root');
        if (closeBtn) {
          setTimeout(() => closeBtn.click(), 300);
        }
        return true;

      case 'submit':
        setFeedback(feedbackText);
        setFeedbackType('success');
        // Try to find and click submit button
        const submitBtn = document.querySelector('button[type="submit"]') ||
          document.querySelector('button:contains("Submit")') ||
          document.querySelector('.MuiButton-root:contains("Submit")');
        if (submitBtn) {
          setTimeout(() => submitBtn.click(), 300);
        }
        return true;

      case 'scrollDown':
        setFeedback(feedbackText);
        setFeedbackType('success');
        setTimeout(() => window.scrollBy(0, 300), 300);
        return true;

      case 'scrollUp':
        setFeedback(feedbackText);
        setFeedbackType('success');
        setTimeout(() => window.scrollBy(0, -300), 300);
        return true;

      case 'clearForm':
        setFeedback(feedbackText);
        setFeedbackType('success');
        // Try to find and click form reset button
        const resetBtn = document.querySelector('button[type="reset"]') ||
          document.querySelector('button:contains("Clear")') ||
          document.querySelector('button:contains("Reset")');
        if (resetBtn) {
          setTimeout(() => resetBtn.click(), 300);
        }
        return true;

      case 'fillField':
        setFeedback(feedbackText);
        setFeedbackType('info');
        // For form filling, we'd need to implement field focus logic
        // This is a placeholder for now
        console.log('[VoiceCommand] Form filling not yet implemented for field:', command.fieldType);
        setTimeout(() => {
          setFeedback(`Form filling for ${command.fieldType} - speak the value to fill`);
          setFeedbackType('info');
        }, 1000);
        return true;

      default:
        console.warn('[VoiceCommand] Unknown action:', command.action);
        return false;
    }
  }, [navigate, lang]);

  /**
   * Process recognized speech - Enhanced with comprehensive commands
   */
  const processResult = useCallback((text) => {
    console.log('[VoiceCommand] Processing result for 36+ services:', text);

    if (!text) {
      setFeedback('No speech detected');
      setFeedbackType('error');
      return;
    }

    // Show what was heard
    setFeedback(`"${text}"`);
    setFeedbackType('info');

    // Find and execute command using comprehensive system
    setTimeout(() => {
      const command = findComprehensiveCommand(text);

      if (command) {
        console.log('[VoiceCommand] ✅ Found comprehensive command:', command.id, 'Score:', command.score);
        executeCommand(command);
      } else {
        setFeedback(lang === 'hi' ? 'समझ नहीं आया, फिर से बोलें' :
          lang === 'mr' ? 'समजले नाही, पुन्हा बोला' :
            'Command not recognized. Try "Help" to see available commands.');
        setFeedbackType('error');
      }

      // Hide feedback after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    }, 800);
  }, [executeCommand, lang]);

  /**
   * Initialize speech recognition
   */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VoiceCommand] Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set language based on UI language
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';

    recognition.onstart = () => {
      console.log('[VoiceCommand] Started listening');
      setIsListening(true);
      setShowFeedback(true);
      setFeedbackType('info');
      setFeedback(lang === 'hi' ? 'सुन रहे हैं...' : lang === 'mr' ? 'ऐकत आहे...' : 'Listening...');
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      // Show interim results
      if (interimText && !finalText) {
        setFeedback(`"${interimText}"...`);
      }

      // Process final result
      if (finalText) {
        console.log('[VoiceCommand] Final result:', finalText);
        setIsListening(false);
        processResult(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('[VoiceCommand] Error:', event.error);
      setIsListening(false);

      if (event.error === 'no-speech') {
        setFeedback(lang === 'hi' ? 'कोई आवाज़ नहीं सुनी' : lang === 'mr' ? 'आवाज ऐकला नाही' : 'No speech detected');
      } else if (event.error === 'not-allowed') {
        setFeedback(lang === 'hi' ? 'माइक्रोफोन की अनुमति दें' : lang === 'mr' ? 'मायक्रोफोन परवानगी द्या' : 'Please allow microphone access');
      } else {
        setFeedback(lang === 'hi' ? 'त्रुटि हुई' : lang === 'mr' ? 'त्रुटी आली' : 'Error occurred');
      }
      setFeedbackType('error');

      timeoutRef.current = setTimeout(() => setShowFeedback(false), 3000);
    };

    recognition.onend = () => {
      console.log('[VoiceCommand] Recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) { }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lang, processResult]);

  /**
   * Handle button click - start/stop listening
   */
  const handleClick = useCallback(() => {
    if (!recognitionRef.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isListening) {
      console.log('[VoiceCommand] Stopping...');
      recognitionRef.current.stop();
      setIsListening(false);
      setShowFeedback(false);
    } else {
      console.log('[VoiceCommand] Starting...');
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already running, stop and restart
        recognitionRef.current.stop();
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch (e2) { }
        }, 100);
      }
    }
  }, [isListening]);

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!isSupported) {
    return null;
  }

  const helpContent = getComprehensiveHelp(lang);

  return (
    <>
      {/* Main floating button container */}
      <Box
        sx={{
          position: 'fixed',
          ...positionStyle,
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Feedback bubble */}
        {showFeedback && (
          <Paper
            elevation={6}
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 3,
              backgroundColor:
                feedbackType === 'success' ? '#4caf50' :
                  feedbackType === 'error' ? '#f44336' : '#1976d2',
              color: 'white',
              minWidth: 180,
              maxWidth: 280,
              textAlign: 'center',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {feedbackType === 'success' && <SuccessIcon fontSize="small" />}
            {feedbackType === 'error' && <ErrorIcon fontSize="small" />}
            {isListening && <CircularProgress size={18} sx={{ color: 'white' }} />}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {feedback}
            </Typography>
          </Paper>
        )}

        {/* Buttons row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Help button */}
          <Tooltip title="Help">
            <IconButton
              onClick={() => setHelpOpen(true)}
              sx={{
                width: 40,
                height: 40,
                backgroundColor: 'white',
                boxShadow: 2,
                '&:hover': { backgroundColor: '#f5f5f5' },
              }}
            >
              <HelpIcon sx={{ color: '#666' }} />
            </IconButton>
          </Tooltip>

          {/* Main voice button */}
          <Tooltip title={isListening ? 'Stop' : 'Voice Command'}>
            <IconButton
              onClick={handleClick}
              sx={{
                width: 64,
                height: 64,
                backgroundColor: isListening ? '#ff9800' : '#f57c00',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                '&:hover': {
                  backgroundColor: isListening ? '#f57c00' : '#ef6c00',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s',
                animation: isListening ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(255, 152, 0, 0.7)' },
                  '70%': { boxShadow: '0 0 0 20px rgba(255, 152, 0, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(255, 152, 0, 0)' },
                },
              }}
            >
              {isListening ? <StopIcon sx={{ fontSize: 32 }} /> : <CommandIcon sx={{ fontSize: 32 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Label */}
        <Typography
          variant="caption"
          sx={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            fontWeight: 600,
            fontSize: '0.7rem',
            color: '#666',
            boxShadow: 1,
          }}
        >
          {isListening
            ? (lang === 'hi' ? 'रुकने के लिए टैप करें' : lang === 'mr' ? 'थांबण्यासाठी टॅप करा' : 'Tap to stop')
            : (lang === 'hi' ? 'वॉइस कमांड' : lang === 'mr' ? 'व्हॉइस कमांड' : 'Voice Command')}
        </Typography>
      </Box>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CommandIcon />
            {helpContent.title}
          </Box>
          <IconButton onClick={() => setHelpOpen(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Show comprehensive statistics */}
          <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1, fontWeight: 600 }}>
            📊 {helpContent.total}
          </Typography>

          {helpContent.sections.map((section, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                {section.title}
              </Typography>
              <List dense disablePadding>
                {section.items.map((item, j) => (
                  <ListItem key={j} sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={item}
                      primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
              {i < helpContent.sections.length - 1 && <Divider sx={{ mt: 1 }} />}
            </Box>
          ))}

          {/* Instructions */}
          <Box sx={{ mt: 3, p: 1.5, bgcolor: '#f3e5f5', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
              💡 <strong>{lang === 'hi' ? 'उपयोग टिप्स:' : lang === 'mr' ? 'वापराच्या टिप्स:' : 'Usage Tips:'}</strong><br/>
              {lang === 'hi'
                ? '• स्पष्ट रूप से बोलें\n• "मदद" बोलकर यह मेनू दिखाएं\n• कोई भी सेवा नाम बोलें'
                : lang === 'mr'
                ? '• स्पष्टपणे बोला\n• "मदत" म्हणून हा मेनू दाखवा\n• कोणतेही सेवा नाव बोला'
                : '• Speak clearly and wait for "Listening..."\n• Say "Help" to show this menu anytime\n• Say any service name from above lists'
              }
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VoiceCommandButton;
