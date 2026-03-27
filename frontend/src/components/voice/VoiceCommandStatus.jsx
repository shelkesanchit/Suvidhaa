/**
 * VoiceCommandStatus Component
 *
 * Debug component to show voice command status and help troubleshoot issues.
 * Add this temporarily to help debug voice command problems.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import {
  Mic as MicIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { matchCommand, getCommandFeedback, ALL_COMMANDS } from './voiceCommands';

export function VoiceCommandStatus() {
  const [testResults, setTestResults] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  // Test basic commands
  const runTests = () => {
    const testCommands = [
      'water',
      'open electricity',
      'home',
      'help',
      'go back',
      'new connection',
      'pay bill',
    ];

    const results = testCommands.map(text => {
      const matched = matchCommand(text, 'en');
      return {
        text,
        matched: !!matched,
        commandId: matched?.id,
        action: matched?.action,
        score: matched?.score,
        feedback: matched ? getCommandFeedback(matched, 'en') : 'No match',
      };
    });

    setTestResults(results);
  };

  useEffect(() => {
    // Auto-run tests on mount
    runTests();
  }, []);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
        }}
        variant="outlined"
        size="small"
      >
        Voice Debug
      </Button>
    );
  }

  const passedTests = testResults.filter(r => r.matched).length;
  const totalTests = testResults.length;

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 350,
        maxHeight: 400,
        overflow: 'auto',
        p: 2,
        zIndex: 9999,
        border: '2px solid',
        borderColor: passedTests === totalTests ? 'success.main' : 'warning.main',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Voice Commands Debug</Typography>
        <Button
          onClick={() => setIsVisible(false)}
          size="small"
          color="secondary"
        >
          Close
        </Button>
      </Box>

      <Alert
        severity={passedTests === totalTests ? 'success' : 'warning'}
        sx={{ mb: 2 }}
      >
        {passedTests === totalTests
          ? '🎉 All commands working!'
          : `⚠️ ${passedTests}/${totalTests} commands working`
        }
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Total Commands Loaded: {ALL_COMMANDS?.length || 0}
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Speech API: {typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) ? '✅ Supported' : '❌ Not Supported'}
        </Typography>
      </Box>

      <Button
        onClick={runTests}
        startIcon={<MicIcon />}
        variant="outlined"
        size="small"
        sx={{ mb: 2 }}
        fullWidth
      >
        Re-test Commands
      </Button>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Command Tests:
        </Typography>
        {testResults.map((result, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.5,
              borderBottom: index < testResults.length - 1 ? '1px solid #eee' : 'none',
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
              "{result.text}"
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {result.matched ? (
                <>
                  <Chip
                    icon={<CheckIcon />}
                    label={result.commandId}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(result.score)}
                  </Typography>
                </>
              ) : (
                <Chip
                  icon={<ErrorIcon />}
                  label="No match"
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {passedTests < totalTests && (
        <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
          <Typography variant="caption">
            💡 If commands aren't working:
            <br />1. Check microphone permissions
            <br />2. Try Chrome/Edge browser
            <br />3. Speak clearly: "water", "electricity"
            <br />4. Check console for errors (F12)
          </Typography>
        </Alert>
      )}
    </Paper>
  );
}

export default VoiceCommandStatus;