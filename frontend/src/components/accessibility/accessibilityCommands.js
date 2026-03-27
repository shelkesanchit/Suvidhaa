/**
 * Accessibility Voice Commands
 * Defines all voice commands for accessibility mode navigation
 */

// Voice command definitions with multilingual support
export const ACCESSIBILITY_COMMANDS = {
  // Mode Control
  activate: {
    keywords: {
      en: ['start accessibility mode', 'accessibility mode', 'blind mode', 'help me navigate', 'voice mode', 'enable accessibility'],
      hi: ['एक्सेसिबिलिटी मोड शुरू करो', 'अंधे के लिए मोड', 'मदद करो', 'वॉइस मोड'],
      mr: ['एक्सेसिबिलिटी मोड सुरू करा', 'अंधांसाठी मोड', 'व्हॉइस मोड']
    },
    action: 'ENABLE_ACCESSIBILITY'
  },
  deactivate: {
    keywords: {
      en: ['exit accessibility mode', 'stop accessibility', 'normal mode', 'disable accessibility', 'exit voice mode'],
      hi: ['एक्सेसिबिलिटी बंद करो', 'सामान्य मोड', 'वॉइस मोड बंद'],
      mr: ['एक्सेसिबिलिटी बंद करा', 'सामान्य मोड', 'व्हॉइस मोड बंद']
    },
    action: 'DISABLE_ACCESSIBILITY'
  },

  // Number-based Navigation
  selectOption1: {
    keywords: { en: ['one', '1', 'first', 'option one'], hi: ['एक', 'पहला'], mr: ['एक', 'पहिला'] },
    action: 'SELECT_1'
  },
  selectOption2: {
    keywords: { en: ['two', '2', 'second', 'option two'], hi: ['दो', 'दूसरा'], mr: ['दोन', 'दुसरा'] },
    action: 'SELECT_2'
  },
  selectOption3: {
    keywords: { en: ['three', '3', 'third', 'option three'], hi: ['तीन', 'तीसरा'], mr: ['तीन', 'तिसरा'] },
    action: 'SELECT_3'
  },
  selectOption4: {
    keywords: { en: ['four', '4', 'fourth', 'option four'], hi: ['चार', 'चौथा'], mr: ['चार', 'चौथा'] },
    action: 'SELECT_4'
  },
  selectOption5: {
    keywords: { en: ['five', '5', 'fifth', 'option five'], hi: ['पांच', 'पांचवा'], mr: ['पाच', 'पाचवा'] },
    action: 'SELECT_5'
  },

  // Form Navigation
  next: {
    keywords: { en: ['next', 'continue', 'proceed', 'go ahead'], hi: ['अगला', 'आगे', 'जारी रखें'], mr: ['पुढे', 'चालू ठेवा'] },
    action: 'NEXT'
  },
  back: {
    keywords: { en: ['back', 'previous', 'go back'], hi: ['वापस', 'पीछे'], mr: ['मागे', 'परत'] },
    action: 'BACK'
  },
  repeat: {
    keywords: { en: ['repeat', 'again', 'say again', 'what'], hi: ['दोहराओ', 'फिर से', 'क्या'], mr: ['परत सांगा', 'पुन्हा'] },
    action: 'REPEAT'
  },
  change: {
    keywords: { en: ['change', 'edit', 'modify', 'correct'], hi: ['बदलो', 'संशोधित करो', 'सुधारो'], mr: ['बदला', 'सुधारा'] },
    action: 'CHANGE'
  },
  cancel: {
    keywords: { en: ['cancel', 'stop', 'abort', 'quit'], hi: ['रद्द करो', 'बंद करो', 'छोड़ो'], mr: ['रद्द करा', 'थांबा'] },
    action: 'CANCEL'
  },
  skip: {
    keywords: { en: ['skip', 'pass', 'ignore'], hi: ['छोड़ो', 'स्किप'], mr: ['सोडा', 'स्किप'] },
    action: 'SKIP'
  },

  // Confirmations
  yes: {
    keywords: { en: ['yes', 'yeah', 'correct', 'right', 'confirm', 'ok', 'okay'], hi: ['हां', 'हाँ', 'सही', 'ठीक है'], mr: ['हो', 'होय', 'बरोबर', 'ठीक आहे'] },
    action: 'YES'
  },
  no: {
    keywords: { en: ['no', 'nope', 'wrong', 'incorrect'], hi: ['नहीं', 'गलत'], mr: ['नाही', 'चुकीचे'] },
    action: 'NO'
  },

  // Help
  help: {
    keywords: { en: ['help', 'help me', 'what can i say', 'commands'], hi: ['मदद', 'सहायता'], mr: ['मदत', 'मदत करा'] },
    action: 'HELP'
  },

  // Submit
  submit: {
    keywords: { en: ['submit', 'send', 'complete', 'finish', 'done'], hi: ['जमा करो', 'भेजो', 'पूरा करो'], mr: ['सबमिट करा', 'पाठवा', 'पूर्ण करा'] },
    action: 'SUBMIT'
  }
};

// Department selection menu
export const DEPARTMENT_MENU = {
  prompt: {
    en: 'Please choose a department. Say 1 for Electricity, Say 2 for Municipal Services, Say 3 for Water Department, Say 4 for Gas Services. Or say the department name.',
    hi: 'कृपया विभाग चुनें। बिजली के लिए 1 बोलें, नगरपालिका के लिए 2 बोलें, पानी के लिए 3 बोलें, गैस के लिए 4 बोलें।',
    mr: 'कृपया विभाग निवडा. वीजेसाठी 1 बोला, नगरपालिकेसाठी 2 बोला, पाण्यासाठी 3 बोला, गॅससाठी 4 बोला.'
  },
  options: [
    {
      number: 1,
      id: 'electricity',
      route: '/electricity',
      names: { en: 'Electricity', hi: 'बिजली', mr: 'वीज' },
      keywords: { en: ['electricity', 'electric', 'power', 'light'], hi: ['बिजली', 'विद्युत'], mr: ['वीज', 'विद्युत'] }
    },
    {
      number: 2,
      id: 'municipal',
      route: '/municipal',
      names: { en: 'Municipal Services', hi: 'नगरपालिका सेवाएं', mr: 'नगरपालिका सेवा' },
      keywords: { en: ['municipal', 'municipality', 'civic', 'city'], hi: ['नगरपालिका', 'नगर निगम'], mr: ['नगरपालिका', 'महानगरपालिका'] }
    },
    {
      number: 3,
      id: 'water',
      route: '/water',
      names: { en: 'Water Department', hi: 'जल विभाग', mr: 'पाणी विभाग' },
      keywords: { en: ['water', 'jal'], hi: ['पानी', 'जल'], mr: ['पाणी', 'जल'] }
    },
    {
      number: 4,
      id: 'gas',
      route: '/gas',
      names: { en: 'Gas Services', hi: 'गैस सेवाएं', mr: 'गॅस सेवा' },
      keywords: { en: ['gas', 'lpg', 'cylinder'], hi: ['गैस', 'एलपीजी', 'सिलेंडर'], mr: ['गॅस', 'एलपीजी', 'सिलिंडर'] }
    }
  ]
};

// TTS Messages
export const TTS_MESSAGES = {
  welcome: {
    en: 'Accessibility mode activated. You can now control the system using your voice.',
    hi: 'एक्सेसिबिलिटी मोड चालू हो गया। अब आप अपनी आवाज से सिस्टम को नियंत्रित कर सकते हैं।',
    mr: 'एक्सेसिबिलिटी मोड सुरू झाला. आता तुम्ही तुमच्या आवाजाने सिस्टम नियंत्रित करू शकता.'
  },
  askUdid: {
    en: 'Please provide your UDID number. You can also scan your QR code if available. Or say skip to continue without ID.',
    hi: 'कृपया अपना यूडीआईडी नंबर बताएं। आप क्यूआर कोड भी स्कैन कर सकते हैं। या स्किप बोलें।',
    mr: 'कृपया तुमचा यूडीआईडी नंबर सांगा. तुम्ही क्यूआर कोड स्कॅन करू शकता. किंवा स्किप बोला.'
  },
  udidVerified: {
    en: 'Your ID is verified. Fetching your details.',
    hi: 'आपकी आईडी सत्यापित हो गई। आपका विवरण लाया जा रहा है।',
    mr: 'तुमची आयडी सत्यापित झाली. तुमचा तपशील आणला जात आहे.'
  },
  udidNotFound: {
    en: 'Sorry, your ID was not found. Please check and try again, or say skip to continue without ID.',
    hi: 'माफ करें, आपकी आईडी नहीं मिली। कृपया जांचें और पुनः प्रयास करें, या स्किप बोलें।',
    mr: 'क्षमा करा, तुमची आयडी सापडली नाही. कृपया तपासा आणि पुन्हा प्रयत्न करा, किंवा स्किप बोला.'
  },
  sampleProfile: {
    en: 'Sample profile detected. All details will be filled automatically.',
    hi: 'नमूना प्रोफ़ाइल मिली। सभी विवरण स्वचालित रूप से भरे जाएंगे।',
    mr: 'नमुना प्रोफाइल सापडली. सर्व तपशील आपोआप भरले जातील.'
  },
  noResponse: {
    en: 'I did not hear anything. Please say your response, or say repeat to hear the question again.',
    hi: 'मुझे कुछ सुनाई नहीं दिया। कृपया अपना जवाब बोलें, या दोहराओ बोलें।',
    mr: 'मला काहीच ऐकू आले नाही. कृपया तुमचे उत्तर सांगा, किंवा परत सांगा बोला.'
  },
  unclearVoice: {
    en: 'Sorry, I could not understand that. Please speak clearly and try again.',
    hi: 'माफ करें, मैं समझ नहीं पाया। कृपया स्पष्ट रूप से बोलें।',
    mr: 'क्षमा करा, मला समजले नाही. कृपया स्पष्टपणे बोला.'
  },
  formComplete: {
    en: 'All required details are completed. Do you want to submit the form? Say yes to submit or no to review.',
    hi: 'सभी आवश्यक विवरण पूर्ण हो गए। क्या आप फॉर्म जमा करना चाहते हैं? जमा करने के लिए हां बोलें।',
    mr: 'सर्व आवश्यक तपशील पूर्ण झाले. तुम्हाला फॉर्म सबमिट करायचा आहे का? होय बोला.'
  },
  formSubmitted: {
    en: 'Your form has been submitted successfully.',
    hi: 'आपका फॉर्म सफलतापूर्वक जमा हो गया।',
    mr: 'तुमचा फॉर्म यशस्वीरित्या सबमिट झाला.'
  },
  exitMode: {
    en: 'Exiting accessibility mode. Thank you for using our service.',
    hi: 'एक्सेसिबिलिटी मोड से बाहर निकल रहे हैं। हमारी सेवा का उपयोग करने के लिए धन्यवाद।',
    mr: 'एक्सेसिबिलिटी मोडमधून बाहेर पडत आहे. आमच्या सेवेचा वापर केल्याबद्दल धन्यवाद.'
  },
  confirmYes: {
    en: 'Say yes to continue or no to change.',
    hi: 'जारी रखने के लिए हां बोलें या बदलने के लिए नहीं।',
    mr: 'चालू ठेवण्यासाठी होय बोला किंवा बदलण्यासाठी नाही.'
  },
  networkError: {
    en: 'Network error. Please check your connection and try again.',
    hi: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
    mr: 'नेटवर्क त्रुटी. कृपया तुमचे कनेक्शन तपासा.'
  },
  helpMessage: {
    en: 'You can say: Next to continue, Back to go back, Repeat to hear again, Change to edit, Cancel to stop, or say a number to select an option.',
    hi: 'आप बोल सकते हैं: आगे बढ़ने के लिए नेक्स्ट, वापस जाने के लिए बैक, फिर से सुनने के लिए रिपीट, बदलने के लिए चेंज।',
    mr: 'तुम्ही बोलू शकता: पुढे जाण्यासाठी नेक्स्ट, मागे जाण्यासाठी बॅक, पुन्हा ऐकण्यासाठी रिपीट, बदलण्यासाठी चेंज.'
  }
};

// Timeout configuration
export const TIMEOUT_CONFIG = {
  voiceInput: 30000,      // 30 seconds for voice input (increased for better detection)
  confirmation: 30000,    // 30 seconds for confirmation
  retryCount: 5,          // Max retries before offering help
  speechPause: 1000,      // 1 second pause after speech before listening
  listenDelay: 500        // Delay before starting to listen
};

/**
 * Match spoken text against command keywords
 * @param {string} transcript - The spoken text
 * @param {string} language - Current language code
 * @returns {string|null} - The matched action or null
 */
export function matchCommand(transcript, language = 'en') {
  const normalizedTranscript = transcript.toLowerCase().trim();

  for (const [_, command] of Object.entries(ACCESSIBILITY_COMMANDS)) {
    const keywords = command.keywords[language] || command.keywords.en || [];

    for (const keyword of keywords) {
      if (normalizedTranscript.includes(keyword.toLowerCase())) {
        return command.action;
      }
    }
  }

  return null;
}

/**
 * Match spoken text against department options
 * @param {string} transcript - The spoken text
 * @param {string} language - Current language code
 * @returns {object|null} - The matched department or null
 */
export function matchDepartment(transcript, language = 'en') {
  const normalizedTranscript = transcript.toLowerCase().trim();

  for (const dept of DEPARTMENT_MENU.options) {
    // Check number
    if (normalizedTranscript.includes(String(dept.number)) ||
        normalizedTranscript.includes(numberWords[dept.number]?.[language])) {
      return dept;
    }

    // Check keywords
    const keywords = dept.keywords[language] || dept.keywords.en || [];
    for (const keyword of keywords) {
      if (normalizedTranscript.includes(keyword.toLowerCase())) {
        return dept;
      }
    }
  }

  return null;
}

// Number words for matching
const numberWords = {
  1: { en: 'one', hi: 'एक', mr: 'एक' },
  2: { en: 'two', hi: 'दो', mr: 'दोन' },
  3: { en: 'three', hi: 'तीन', mr: 'तीन' },
  4: { en: 'four', hi: 'चार', mr: 'चार' },
  5: { en: 'five', hi: 'पांच', mr: 'पाच' }
};

/**
 * Extract number from transcript (1-5)
 * @param {string} transcript - The spoken text
 * @param {string} language - Current language code
 * @returns {number|null} - The extracted number or null
 */
export function extractNumber(transcript, language = 'en') {
  const normalizedTranscript = transcript.toLowerCase().trim();

  for (let i = 1; i <= 5; i++) {
    if (normalizedTranscript.includes(String(i))) {
      return i;
    }
    const word = numberWords[i]?.[language] || numberWords[i]?.en;
    if (word && normalizedTranscript.includes(word)) {
      return i;
    }
  }

  return null;
}

/**
 * Get localized message
 * @param {string} key - Message key from TTS_MESSAGES
 * @param {string} language - Language code
 * @returns {string} - Localized message
 */
export function getMessage(key, language = 'en') {
  const messages = TTS_MESSAGES[key];
  if (!messages) return '';
  return messages[language] || messages.en || '';
}
