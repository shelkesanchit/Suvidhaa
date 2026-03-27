/**
 * Translation Service - Ultra-fast dynamic translations
 * Optimized for forms, dialogs, and all UI content
 */

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
];

// Cache
const CACHE_KEY = 'suvidha_translations_v3';
let cache = new Map();
let pendingRequests = new Map(); // Prevent duplicate requests

// Load cache
(function loadCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (data) cache = new Map(Object.entries(JSON.parse(data)));
  } catch (e) { /* ignore */ }
})();

// Save cache (debounced)
let saveTimer = null;
function saveCache() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      // Limit cache size
      if (cache.size > 10000) {
        const entries = Array.from(cache.entries()).slice(-8000);
        cache = new Map(entries);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
    } catch (e) { /* ignore */ }
  }, 1000);
}

/**
 * Cache key
 */
function cacheKey(text, lang) {
  return `${lang}:${text}`;
}

/**
 * Get from cache
 */
export function getCachedTranslation(text, lang) {
  if (!text || lang === 'en') return text;
  return cache.get(cacheKey(text.trim(), lang));
}

/**
 * Set cache
 */
function setCache(text, translation, lang) {
  cache.set(cacheKey(text.trim(), lang), translation);
  saveCache();
}

/**
 * Batch queue for efficient API calls
 */
let batchQueue = [];
let batchTimer = null;
const BATCH_DELAY = 20; // 20ms - very fast
const MAX_BATCH = 100;

/**
 * Google Translate API - fast and reliable
 */
async function googleTranslate(texts, lang) {
  if (!texts.length) return [];

  const results = new Array(texts.length).fill(null);

  // Process in chunks of 10 for parallel requests
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    chunks.push(texts.slice(i, i + chunkSize));
  }

  await Promise.all(chunks.map(async (chunk, chunkIndex) => {
    try {
      // Combine texts with separator
      const combined = chunk.join('\n§§§\n');
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(combined)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      let translated = '';
      if (data?.[0]) {
        translated = data[0].map(x => x[0]).join('');
      }

      // Split back
      const parts = translated.split(/\n?§§§\n?/);

      chunk.forEach((text, i) => {
        const globalIndex = chunkIndex * chunkSize + i;
        results[globalIndex] = parts[i]?.trim() || text;
      });
    } catch (e) {
      // On error, keep original texts
      chunk.forEach((text, i) => {
        const globalIndex = chunkIndex * chunkSize + i;
        if (results[globalIndex] === null) {
          results[globalIndex] = text;
        }
      });
    }
  }));

  return results;
}

/**
 * Process batch queue
 */
async function processBatch() {
  if (!batchQueue.length) return;

  const batch = batchQueue.splice(0, MAX_BATCH);

  // Group by language
  const byLang = new Map();
  batch.forEach(item => {
    if (!byLang.has(item.lang)) byLang.set(item.lang, []);
    byLang.get(item.lang).push(item);
  });

  // Process each language
  for (const [lang, items] of byLang) {
    // Separate cached and uncached
    const uncached = [];
    const uncachedItems = [];

    items.forEach(item => {
      const cached = getCachedTranslation(item.text, lang);
      if (cached) {
        item.resolve(cached);
        pendingRequests.delete(`${lang}:${item.text}`);
      } else {
        uncached.push(item.text);
        uncachedItems.push(item);
      }
    });

    if (uncached.length === 0) continue;

    // Translate uncached
    try {
      const translations = await googleTranslate(uncached, lang);

      uncachedItems.forEach((item, i) => {
        const translation = translations[i] || item.text;
        setCache(item.text, translation, lang);
        item.resolve(translation);
        pendingRequests.delete(`${lang}:${item.text}`);
      });
    } catch (e) {
      // Resolve with original on error
      uncachedItems.forEach(item => {
        item.resolve(item.text);
        pendingRequests.delete(`${lang}:${item.text}`);
      });
    }
  }

  // Process remaining
  if (batchQueue.length > 0) {
    processBatch();
  }
}

/**
 * Translate text - returns Promise
 */
export function translate(text, lang) {
  return new Promise(resolve => {
    if (!text || typeof text !== 'string' || lang === 'en') {
      resolve(text);
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      resolve(text);
      return;
    }

    // Check cache
    const cached = getCachedTranslation(trimmed, lang);
    if (cached) {
      resolve(cached);
      return;
    }

    // Check if already pending
    const pendingKey = `${lang}:${trimmed}`;
    if (pendingRequests.has(pendingKey)) {
      // Wait for existing request
      pendingRequests.get(pendingKey).then(resolve);
      return;
    }

    // Create promise and add to pending
    const promise = new Promise(res => {
      batchQueue.push({ text: trimmed, lang, resolve: res });

      // Schedule batch
      clearTimeout(batchTimer);
      batchTimer = setTimeout(processBatch, BATCH_DELAY);
    });

    pendingRequests.set(pendingKey, promise);
    promise.then(resolve);
  });
}

/**
 * Translate multiple texts
 */
export function translateBatch(texts, lang) {
  if (!texts?.length || lang === 'en') return Promise.resolve(texts);
  return Promise.all(texts.map(t => translate(t, lang)));
}

/**
 * Sync translate (cache only)
 */
export function translateSync(text, lang) {
  if (!text || lang === 'en') return text;
  return getCachedTranslation(text, lang) || text;
}

/**
 * Clear cache
 */
export function clearCache() {
  cache.clear();
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get language by code
 */
export function getLanguageByCode(code) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

/**
 * Preload common UI strings for instant translation
 */
export async function preloadCommonStrings(lang) {
  if (lang === 'en') return;

  const strings = [
    // Common UI
    'Submit', 'Cancel', 'Back', 'Next', 'Close', 'Save', 'Delete', 'Edit',
    'View', 'Search', 'Clear', 'Reset', 'Confirm', 'OK', 'Yes', 'No',
    // Status
    'Loading...', 'Please wait...', 'Success', 'Error', 'Warning',
    'Pending', 'Approved', 'Rejected', 'Processing', 'Completed', 'Failed',
    // Forms
    'Name', 'Full Name', 'First Name', 'Last Name', 'Email', 'Email Address',
    'Phone', 'Phone Number', 'Mobile Number', 'Address', 'City', 'State',
    'PIN Code', 'Date', 'Time', 'Select', 'Choose', 'Enter', 'Type here',
    'Required', 'Optional', 'Invalid', 'Valid', 'Please enter', 'Please select',
    // Form actions
    'Submit Application', 'Track Application', 'Pay Bill', 'Register Complaint',
    'Upload Document', 'Download', 'Print', 'Preview',
    // Services
    'Electricity', 'Gas', 'Water', 'Municipal', 'Services', 'Utility',
    'New Connection', 'Bill Payment', 'Complaints', 'Tracking',
    // Electricity specific
    'Electricity Services', 'Billing & Payments', 'New Connections',
    'Connection Management', 'Complaints & Support', 'Value Added Services',
    'Consumer Number', 'Meter Number', 'Bill Amount', 'Due Date',
    'Connection Type', 'Domestic', 'Commercial', 'Industrial', 'Agricultural',
    // Gas specific
    'Gas Services', 'Gas Connection', 'Cylinder Booking', 'LPG', 'PNG',
    'Gas Distribution', 'Regulator', 'Safety Check',
    // Water specific
    'Water Services', 'Water Connection', 'Water Supply', 'Tanker Services',
    'Water Bill', 'Meter Reading', 'Leakage Complaint',
    // Municipal specific
    'Municipal Services', 'Property Tax', 'Trade License', 'Birth Certificate',
    'Death Certificate', 'Marriage Registration', 'Building Permission',
    'Grievance', 'Sanitation', 'Roads', 'Housing',
    // Landing page
    'SUVIDHA', 'Smart Urban Virtual Interactive Digital Helpdesk Assistant',
    'Self-Service Kiosk System', 'Select Service',
    'Touch any card to get started', 'All rights reserved',
    'Electricity Utility Offices', 'New connections, bill payments, complaints, and more',
    'Gas Distribution Offices', 'Gas connections, cylinder bookings, and services',
    'Water Supply Services', 'Water connections, bill payments, tanker booking, complaints',
    'Municipal Corporations', 'Property tax, trade license, civic services, and more',
    // Form fields common
    'Applicant Name', 'Father Name', 'Mother Name', 'Date of Birth', 'Gender',
    'Male', 'Female', 'Other', 'Occupation', 'Annual Income', 'ID Proof',
    'Aadhaar Number', 'PAN Number', 'Voter ID', 'Driving License', 'Passport',
    'Permanent Address', 'Current Address', 'Same as Permanent Address',
    'Landmark', 'District', 'Taluka', 'Village', 'Ward', 'Zone',
    // Document upload
    'Upload', 'Browse', 'Choose File', 'No file chosen', 'Drag and drop',
    'Supported formats', 'Maximum file size', 'Document Type',
    // Payment
    'Amount', 'Total Amount', 'Payment Method', 'Cash', 'Card', 'UPI', 'Net Banking',
    'Transaction ID', 'Receipt', 'Invoice',
    // Stepper
    'Step', 'Personal Details', 'Address Details', 'Document Upload', 'Review',
    'Payment', 'Confirmation', 'Previous', 'Complete',
    // Messages
    'Application submitted successfully', 'Error occurred', 'Please try again',
    'Are you sure?', 'This action cannot be undone',
    // Table headers
    'Sr. No.', 'Application No.', 'Status', 'Date', 'Action', 'Details',
  ];

  await translateBatch(strings, lang);
}

export default {
  translate,
  translateBatch,
  translateSync,
  getCachedTranslation,
  clearCache,
  getLanguageByCode,
  preloadCommonStrings,
  SUPPORTED_LANGUAGES,
};
