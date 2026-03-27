/**
 * Voice Commands Test Script
 *
 * Simple test to verify voice commands are working properly
 * Run this in browser console to test command matching
 */

// Test the command matching function
import { matchCommand, getCommandFeedback } from './voiceCommands.js';

// Test cases for different types of commands
const testCases = [
  // Navigation commands
  { text: 'open water', expected: 'water navigation' },
  { text: 'go to electricity', expected: 'electricity navigation' },
  { text: 'home', expected: 'home navigation' },
  { text: 'गैस खोलो', expected: 'gas navigation (Hindi)' },
  { text: 'वीज उघडा', expected: 'electricity navigation (Marathi)' },

  // Service commands
  { text: 'pay water bill', expected: 'water billing service' },
  { text: 'new connection', expected: 'new connection service' },
  { text: 'file complaint', expected: 'complaint service' },
  { text: 'नया कनेक्शन', expected: 'new connection (Hindi)' },

  // Action commands
  { text: 'go back', expected: 'back action' },
  { text: 'close', expected: 'close action' },
  { text: 'help', expected: 'help action' },
  { text: 'scroll down', expected: 'scroll action' },
];

// Function to test voice command matching
function testVoiceCommands() {
  console.log('🎤 Testing Voice Command Matching...\n');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: "${testCase.text}"`);

    const matchedCommand = matchCommand(testCase.text, 'en');

    if (matchedCommand) {
      const feedback = getCommandFeedback(matchedCommand, 'en');
      console.log(`  ✅ Matched: ${matchedCommand.id} (${matchedCommand.action})`);
      console.log(`  📝 Feedback: ${feedback}`);
      console.log(`  🎯 Score: ${matchedCommand.score}`);
      passed++;
    } else {
      console.log(`  ❌ No match found for "${testCase.text}"`);
      failed++;
    }
    console.log('');
  });

  console.log(`📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All voice commands are working correctly!');
  } else {
    console.log('⚠️  Some voice commands need attention.');
  }
}

// Export for use
window.testVoiceCommands = testVoiceCommands;

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('Voice Commands Test Script Loaded');
  console.log('Run testVoiceCommands() to test command matching');
}