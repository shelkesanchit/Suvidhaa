/**
 * Keyboard layouts for English, Marathi, and Marathi Phonetic
 * Version 2.0 - Complete rewrite for phonetic conversion
 */

// English QWERTY layout
export const englishLayout = {
  default: [
    '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
    '{tab} q w e r t y u i o p [ ] \\',
    '{lock} a s d f g h j k l ; \' {enter}',
    '{shift} z x c v b n m , . / {shift}',
    '{done} {space}'
  ],
  shift: [
    '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
    '{tab} Q W E R T Y U I O P { } |',
    '{lock} A S D F G H J K L : " {enter}',
    '{shift} Z X C V B N M < > ? {shift}',
    '{done} {space}'
  ]
};

// Marathi Devanagari layout
export const marathiLayout = {
  default: [
    '` १ २ ३ ४ ५ ६ ७ ८ ९ ० - ृ {bksp}',
    '{tab} ौ ै ा ी ू ब ह ग द ज ड ़ ॉ',
    '{lock} ो े ् ि ु प र क त च ट {enter}',
    '{shift} ं म न व ल स य श ष . {shift}',
    '{done} {space}'
  ],
  shift: [
    '~ ऍ ॅ ्र र् ज्ञ त्र क्ष श्र ( ) ः ऋ {bksp}',
    '{tab} औ ऐ आ ई ऊ भ ङ घ ध झ ढ ञ ऑ',
    '{lock} ओ ए अ इ उ फ ऱ ख थ छ ठ {enter}',
    '{shift} ँ ण ऩ ऴ ळ श ् क़ । {shift}',
    '{done} {space}'
  ]
};

// Marathi Phonetic layout (uses English keyboard but converts to Marathi)
export const marathiPhoneticLayout = {
  default: [
    '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
    '{tab} q w e r t y u i o p [ ] \\',
    '{lock} a s d f g h j k l ; \' {enter}',
    '{shift} z x c v b n m , . / {shift}',
    '{done} {space}'
  ],
  shift: [
    '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
    '{tab} Q W E R T Y U I O P { } |',
    '{lock} A S D F G H J K L : " {enter}',
    '{shift} Z X C V B N M < > ? {shift}',
    '{done} {space}'
  ]
};

// ============================================
// PHONETIC CONVERSION SYSTEM v2.0
// Completely rewritten for proper conjunct handling
// ============================================

// Halant (virama) - joins consonants
const HALANT = '्';

// All consonant patterns sorted by length (longest first for greedy matching)
const CONSONANT_PATTERNS = [
  // 4-char patterns
  { pattern: 'shri', devanagari: 'श्री', isConjunct: true },
  // 3-char patterns
  { pattern: 'ksh', devanagari: 'क्ष', isConjunct: true },
  { pattern: 'gny', devanagari: 'ज्ञ', isConjunct: true },
  { pattern: 'dny', devanagari: 'ज्ञ', isConjunct: true },
  { pattern: 'shr', devanagari: 'श्र', isConjunct: true },
  { pattern: 'chh', devanagari: 'छ', isConjunct: false },
  // 2-char patterns
  { pattern: 'kh', devanagari: 'ख', isConjunct: false },
  { pattern: 'gh', devanagari: 'घ', isConjunct: false },
  { pattern: 'ng', devanagari: 'ङ', isConjunct: false },
  { pattern: 'ch', devanagari: 'च', isConjunct: false },
  { pattern: 'jh', devanagari: 'झ', isConjunct: false },
  { pattern: 'ny', devanagari: 'ञ', isConjunct: false },
  { pattern: 'th', devanagari: 'थ', isConjunct: false },
  { pattern: 'dh', devanagari: 'ध', isConjunct: false },
  { pattern: 'ph', devanagari: 'फ', isConjunct: false },
  { pattern: 'bh', devanagari: 'भ', isConjunct: false },
  { pattern: 'sh', devanagari: 'श', isConjunct: false },
  { pattern: 'Th', devanagari: 'ठ', isConjunct: false },
  { pattern: 'Dh', devanagari: 'ढ', isConjunct: false },
  { pattern: 'Sh', devanagari: 'ष', isConjunct: false },
  { pattern: 'tr', devanagari: 'त्र', isConjunct: true },
  { pattern: 'gy', devanagari: 'ज्ञ', isConjunct: true },
  { pattern: 'gn', devanagari: 'ज्ञ', isConjunct: true },
  // 1-char patterns
  { pattern: 'k', devanagari: 'क', isConjunct: false },
  { pattern: 'g', devanagari: 'ग', isConjunct: false },
  { pattern: 'c', devanagari: 'च', isConjunct: false },
  { pattern: 'j', devanagari: 'ज', isConjunct: false },
  { pattern: 'T', devanagari: 'ट', isConjunct: false },
  { pattern: 'D', devanagari: 'ड', isConjunct: false },
  { pattern: 'N', devanagari: 'ण', isConjunct: false },
  { pattern: 't', devanagari: 'त', isConjunct: false },
  { pattern: 'd', devanagari: 'द', isConjunct: false },
  { pattern: 'n', devanagari: 'न', isConjunct: false },
  { pattern: 'p', devanagari: 'प', isConjunct: false },
  { pattern: 'f', devanagari: 'फ', isConjunct: false },
  { pattern: 'b', devanagari: 'ब', isConjunct: false },
  { pattern: 'm', devanagari: 'म', isConjunct: false },
  { pattern: 'y', devanagari: 'य', isConjunct: false },
  { pattern: 'r', devanagari: 'र', isConjunct: false },
  { pattern: 'l', devanagari: 'ल', isConjunct: false },
  { pattern: 'L', devanagari: 'ळ', isConjunct: false },
  { pattern: 'v', devanagari: 'व', isConjunct: false },
  { pattern: 'w', devanagari: 'व', isConjunct: false },
  { pattern: 's', devanagari: 'स', isConjunct: false },
  { pattern: 'h', devanagari: 'ह', isConjunct: false },
  { pattern: 'q', devanagari: 'क़', isConjunct: false },
  { pattern: 'x', devanagari: 'क्ष', isConjunct: true },
  { pattern: 'z', devanagari: 'ज़', isConjunct: false },
];

// Vowel patterns (independent and matra forms)
const VOWEL_PATTERNS = [
  // 2-char patterns first
  { pattern: 'aa', independent: 'आ', matra: 'ा' },
  { pattern: 'ee', independent: 'ई', matra: 'ी' },
  { pattern: 'ii', independent: 'ई', matra: 'ी' },
  { pattern: 'oo', independent: 'ऊ', matra: 'ू' },
  { pattern: 'uu', independent: 'ऊ', matra: 'ू' },
  { pattern: 'ai', independent: 'ऐ', matra: 'ै' },
  { pattern: 'au', independent: 'औ', matra: 'ौ' },
  { pattern: 'ou', independent: 'औ', matra: 'ौ' },
  { pattern: 'ri', independent: 'ऋ', matra: 'ृ' },
  { pattern: 'ru', independent: 'ऋ', matra: 'ृ' },
  // 1-char patterns - capital letters for long vowels
  { pattern: 'A', independent: 'आ', matra: 'ा' },
  { pattern: 'I', independent: 'ई', matra: 'ी' },
  { pattern: 'U', independent: 'ऊ', matra: 'ू' },
  { pattern: 'E', independent: 'ऐ', matra: 'ै' },
  { pattern: 'O', independent: 'औ', matra: 'ौ' },
  // 1-char patterns - lower case for short vowels
  { pattern: 'a', independent: 'अ', matra: '' }, // Inherent vowel - no matra
  { pattern: 'i', independent: 'इ', matra: 'ि' },
  { pattern: 'u', independent: 'उ', matra: 'ु' },
  { pattern: 'e', independent: 'ए', matra: 'े' },
  { pattern: 'o', independent: 'ओ', matra: 'ो' },
];

// Special characters and modifiers
const SPECIAL_PATTERNS = [
  { pattern: '.m', devanagari: 'ं' },  // Anusvara
  { pattern: '.n', devanagari: 'ं' },  // Anusvara
  { pattern: 'M', devanagari: 'ं' },   // Anusvara
  { pattern: '.h', devanagari: 'ः' },  // Visarga
  { pattern: 'H', devanagari: 'ः' },   // Visarga
  { pattern: '..', devanagari: '॥' },  // Double danda
  { pattern: '.', devanagari: '।' },   // Danda (period)
];

// Numbers
const NUMBER_MAP = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
};

/**
 * Check if a character is a consonant starter
 */
function isConsonantChar(char) {
  const consonantStarters = 'kgcjTDNtdnpfbmyrlLvwshqxzKGCJPBMYRSHQXZ';
  return consonantStarters.includes(char);
}

/**
 * Check if a character is a vowel starter
 */
function isVowelChar(char) {
  return 'aeiouAEIOU'.includes(char);
}

/**
 * Try to match a consonant pattern at position
 */
function matchConsonant(input, pos) {
  const remaining = input.slice(pos);
  for (const cons of CONSONANT_PATTERNS) {
    if (remaining.startsWith(cons.pattern)) {
      return cons;
    }
  }
  return null;
}

/**
 * Try to match a vowel pattern at position
 */
function matchVowel(input, pos) {
  const remaining = input.slice(pos);
  for (const vowel of VOWEL_PATTERNS) {
    if (remaining.startsWith(vowel.pattern)) {
      return vowel;
    }
  }
  return null;
}

/**
 * Try to match a special pattern at position
 */
function matchSpecial(input, pos) {
  const remaining = input.slice(pos);
  for (const special of SPECIAL_PATTERNS) {
    if (remaining.startsWith(special.pattern)) {
      return special;
    }
  }
  return null;
}

/**
 * Convert English text to Marathi using phonetic rules
 * This is the main conversion function - completely rewritten
 *
 * Example: "swadesh" → "स्वदेश"
 * - s → स (consonant)
 * - w → ् + व (halant + consonant, because previous was consonant)
 * - a → (inherent vowel, adds nothing after consonant)
 * - d → द (consonant, no halant because 'a' vowel ended the cluster)
 * - e → े (matra attached to द)
 * - sh → श (consonant)
 * Final: स्वदेश
 */
export function convertToMarathi(input) {
  if (!input || typeof input !== 'string') return '';

  let result = '';
  let i = 0;
  let lastWasConsonant = false;

  while (i < input.length) {
    const char = input[i];

    // Try to match special patterns first (like .m, .h, ..)
    const special = matchSpecial(input, i);
    if (special) {
      result += special.devanagari;
      i += special.pattern.length;
      lastWasConsonant = false;
      continue;
    }

    // Try to match consonant patterns
    const consonant = matchConsonant(input, i);
    if (consonant) {
      // If last was also a consonant, add halant to create conjunct
      if (lastWasConsonant) {
        result += HALANT;
      }
      result += consonant.devanagari;
      i += consonant.pattern.length;
      lastWasConsonant = !consonant.isConjunct; // Conjuncts already include halant
      continue;
    }

    // Try to match vowel patterns
    const vowel = matchVowel(input, i);
    if (vowel) {
      if (lastWasConsonant) {
        // After consonant, add matra (dependent vowel form)
        result += vowel.matra;
      } else {
        // At start or after vowel, add independent vowel
        result += vowel.independent;
      }
      i += vowel.pattern.length;
      lastWasConsonant = false;
      continue;
    }

    // Check for numbers
    if (NUMBER_MAP[char]) {
      result += NUMBER_MAP[char];
      i++;
      lastWasConsonant = false;
      continue;
    }

    // Space and common punctuation
    if (char === ' ' || char === ',' || char === '?' || char === '!' ||
        char === '\n' || char === '\t' || char === '-' || char === ':' ||
        char === ';' || char === '"' || char === "'" || char === '(' ||
        char === ')' || char === '[' || char === ']') {
      result += char;
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Unknown character - keep as is
    result += char;
    lastWasConsonant = false;
    i++;
  }

  return result;
}

// ============================================
// EXPORTS
// ============================================

export const layoutNames = {
  english: 'EN',
  marathi: 'मराठी',
  phonetic: 'Phonetic'
};

// Button display - hint on spacebar
export const buttonDisplay = {
  '{bksp}': '⌫',
  '{enter}': '↵',
  '{shift}': '⇧',
  '{lock}': '⇪',
  '{tab}': '→|',
  '{space}': 'hold for language',
  '{done}': 'done'
};

export const getLayout = (language) => {
  switch (language) {
    case 'marathi':
      return marathiLayout;
    case 'phonetic':
      return marathiPhoneticLayout;
    case 'english':
    default:
      return englishLayout;
  }
};

// Legacy exports for backward compatibility
export const phoneticMapping = {
  'a': 'अ', 'aa': 'आ', 'A': 'आ', 'i': 'इ', 'ee': 'ई', 'I': 'ई', 'ii': 'ई',
  'u': 'उ', 'oo': 'ऊ', 'U': 'ऊ', 'uu': 'ऊ', 'e': 'ए', 'ai': 'ऐ', 'E': 'ऐ',
  'o': 'ओ', 'au': 'औ', 'O': 'औ', 'ou': 'औ', 'ri': 'ऋ', 'ru': 'ऋ',
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'L': 'ळ', 'v': 'व', 'w': 'व',
  'sh': 'श', 'Sh': 'ष', 's': 'स', 'h': 'ह',
  'ksh': 'क्ष', 'x': 'क्ष', 'tr': 'त्र', 'gy': 'ज्ञ', 'gn': 'ज्ञ', 'shr': 'श्र',
  ' ': ' '
};

export const matraMapping = {
  'a': '', 'aa': 'ा', 'A': 'ा', 'i': 'ि', 'ee': 'ी', 'I': 'ी', 'ii': 'ी',
  'u': 'ु', 'oo': 'ू', 'U': 'ू', 'uu': 'ू', 'e': 'े', 'ai': 'ै', 'E': 'ै',
  'o': 'ो', 'au': 'ौ', 'O': 'ौ', 'ou': 'ौ', 'ri': 'ृ', 'ru': 'ृ'
};
