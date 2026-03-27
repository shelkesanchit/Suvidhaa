/**
 * Comprehensive Voice Commands
 *
 * Extended voice command system supporting all 36+ services across departments.
 * Provides unified command matching and help generation.
 */

import {
  ALL_COMMANDS,
  NAVIGATION_COMMANDS,
  SERVICE_COMMANDS,
  UI_ACTION_COMMANDS,
  matchCommand,
  getVoiceCommandHelp,
} from './voiceCommands';

/**
 * All comprehensive voice commands
 */
export const COMPREHENSIVE_VOICE_COMMANDS = ALL_COMMANDS;

/**
 * Find a matching command from the comprehensive command list
 *
 * @param {string} text - The recognized speech text
 * @param {string} language - Current UI language (en, hi, mr)
 * @returns {Object|null} - Matched command with action details or null
 */
export function findComprehensiveCommand(text, language = 'en') {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const match = matchCommand(text, language);

  if (!match) {
    return null;
  }

  // Transform the matched command to comprehensive format
  const command = {
    id: match.id,
    action: transformAction(match.action),
    feedback: match.feedback,
    score: match.score || 0,
    matchedKeyword: match.matchedKeyword,
    matchedLanguage: match.matchedLanguage,
  };

  // Add route for navigation commands
  if (match.route) {
    command.route = match.route;
  }

  // Add service details for service commands
  if (match.department) {
    command.department = match.department;
  }
  if (match.serviceId) {
    command.serviceId = match.serviceId;
    command.service = match.serviceId;
  }

  return command;
}

/**
 * Transform action types to match VoiceCommandButton expectations
 */
function transformAction(action) {
  const actionMap = {
    navigate: 'navigate',
    openService: 'service',
    goBack: 'back',
    submit: 'submit',
    closeDialog: 'close',
    scrollDown: 'scrollDown',
    scrollUp: 'scrollUp',
    showHelp: 'help',
  };

  return actionMap[action] || action;
}

/**
 * Get comprehensive help content for the help dialog
 *
 * @param {string} language - Language code (en, hi, mr)
 * @returns {Object} - Help content with title, sections, and total count
 */
export function getComprehensiveHelp(language = 'en') {
  const baseHelp = getVoiceCommandHelp(language);

  const titles = {
    en: 'Voice Commands Help',
    hi: 'वॉइस कमांड मदद',
    mr: 'व्हॉइस कमांड मदत',
  };

  const totals = {
    en: `Total ${ALL_COMMANDS.length} commands available across all departments`,
    hi: `सभी विभागों में कुल ${ALL_COMMANDS.length} कमांड उपलब्ध`,
    mr: `सर्व विभागांमध्ये एकूण ${ALL_COMMANDS.length} कमांड उपलब्ध`,
  };

  return {
    title: titles[language] || titles.en,
    total: totals[language] || totals.en,
    sections: baseHelp.sections.map((section) => ({
      title: section.title,
      items: section.commands,
    })),
  };
}

export default {
  COMPREHENSIVE_VOICE_COMMANDS,
  findComprehensiveCommand,
  getComprehensiveHelp,
};
