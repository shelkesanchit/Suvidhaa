/**
 * Text-to-Speech Service
 * Uses browser SpeechSynthesis API with queue management and multilingual support
 * Handles voice selection with fallbacks for reliability
 */

// Language to voice language code mapping
const LANGUAGE_VOICE_MAP = {
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
  hi: ['hi-IN', 'hi'],
  mr: ['mr-IN', 'hi-IN', 'hi'],
  ta: ['ta-IN', 'ta'],
  te: ['te-IN', 'te'],
  bn: ['bn-IN', 'bn'],
  gu: ['gu-IN', 'gu'],
  kn: ['kn-IN', 'kn'],
  ml: ['ml-IN', 'ml'],
  pa: ['pa-IN', 'pa'],
  ur: ['ur-IN', 'ur', 'hi-IN']
};

class TTSService {
  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.queue = [];
    this.speaking = false;
    this.paused = false;
    this.rate = 0.9;
    this.pitch = 1;
    this.volume = 1;
    this.currentLanguage = 'en';
    this.selectedVoice = null;
    this.fallbackVoices = [];
    this.lastSpoken = '';
    this.onSpeakStart = null;
    this.onSpeakEnd = null;
    this.currentUtterance = null;
    this.voicesLoaded = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.enabled = false; // TTS is disabled by default until accessibility mode is enabled

    if (this.synthesis) {
      this.loadVoices();
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = () => {
          console.log('[TTS] Voices changed event');
          this.loadVoices();
        };
      }
    } else {
      console.warn('[TTS] Speech synthesis not supported');
    }
  }

  /**
   * Load voices - prefer LOCAL voices over online ones (more reliable)
   */
  loadVoices() {
    if (!this.synthesis) return;

    const voices = this.synthesis.getVoices();
    console.log('[TTS] Total voices available:', voices.length);

    if (voices.length > 0) {
      this.voicesLoaded = true;
      this.selectVoiceForLanguage(this.currentLanguage);
    }
  }

  /**
   * Select voice - PREFER LOCAL voices (no "Online" in name)
   */
  selectVoiceForLanguage(lang) {
    if (!this.synthesis) return;

    const voices = this.synthesis.getVoices();
    const langCodes = LANGUAGE_VOICE_MAP[lang] || LANGUAGE_VOICE_MAP.en;

    // Separate local and online voices
    const localVoices = voices.filter(v => !v.name.includes('Online'));
    const onlineVoices = voices.filter(v => v.name.includes('Online'));

    console.log('[TTS] Local voices:', localVoices.length, 'Online voices:', onlineVoices.length);

    // Build fallback list - local first, then online
    this.fallbackVoices = [];

    // First, try to find LOCAL voices matching language
    for (const code of langCodes) {
      const localMatch = localVoices.find(v => v.lang.startsWith(code));
      if (localMatch) {
        this.fallbackVoices.push(localMatch);
      }
    }

    // Then add online voices as fallback
    for (const code of langCodes) {
      const onlineMatch = onlineVoices.find(v => v.lang.startsWith(code));
      if (onlineMatch && !this.fallbackVoices.includes(onlineMatch)) {
        this.fallbackVoices.push(onlineMatch);
      }
    }

    // Add any English voice as last resort
    const anyEnglishLocal = localVoices.find(v => v.lang.startsWith('en'));
    if (anyEnglishLocal && !this.fallbackVoices.includes(anyEnglishLocal)) {
      this.fallbackVoices.push(anyEnglishLocal);
    }

    // Add first available voice as absolute fallback
    if (localVoices.length > 0 && !this.fallbackVoices.includes(localVoices[0])) {
      this.fallbackVoices.push(localVoices[0]);
    }

    // Select the first (best) voice
    this.selectedVoice = this.fallbackVoices[0] || voices[0] || null;
    console.log('[TTS] Selected voice:', this.selectedVoice?.name, '| Fallbacks:', this.fallbackVoices.length);
  }

  /**
   * Get next fallback voice
   */
  getNextFallbackVoice() {
    if (this.retryCount < this.fallbackVoices.length) {
      return this.fallbackVoices[this.retryCount];
    }
    return null;
  }

  async waitForVoices(timeout = 3000) {
    if (this.voicesLoaded) return true;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkVoices = () => {
        const voices = this.synthesis?.getVoices() || [];
        if (voices.length > 0) {
          this.loadVoices();
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          console.warn('[TTS] Timeout waiting for voices');
          resolve(false);
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      checkVoices();
    });
  }

  getVoices() {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    this.selectVoiceForLanguage(lang);
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0, Math.min(2, pitch));
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isSupported() {
    return this.synthesis !== null;
  }

  isSpeaking() {
    return this.speaking;
  }

  isPaused() {
    return this.paused;
  }

  /**
   * Enable TTS service - call this when accessibility mode is enabled
   */
  enable() {
    console.log('[TTS] Service ENABLED');
    this.enabled = true;
  }

  /**
   * Disable TTS service - call this after exit message to completely stop all speech
   */
  disable() {
    console.log('[TTS] Service DISABLED - no more speech will be allowed');
    this.enabled = false;
    this.stop(); // Stop any ongoing speech
  }

  /**
   * Check if TTS service is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Main speak method with retry logic for failed voices
   * @param {string} text - Text to speak
   * @param {object} options - Options including force: true to bypass enabled check
   */
  speak(text, options = {}) {
    // If service is disabled and not forced, silently return
    if (!this.enabled && !options.force) {
      console.log('[TTS] Service disabled, ignoring speech request:', text.substring(0, 30));
      return Promise.resolve();
    }
    this.retryCount = 0;
    return this._speakWithRetry(text, options);
  }

  /**
   * Internal speak with retry on failure
   */
  _speakWithRetry(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      if (!this.synthesis) {
        console.error('[TTS] Speech synthesis not supported');
        resolve(); // Don't reject, just continue silently
        return;
      }

      // Wait for voices
      if (!this.voicesLoaded) {
        console.log('[TTS] Waiting for voices...');
        await this.waitForVoices();
      }

      // CRITICAL: Wait for any existing speech to finish
      // This prevents "canceled" errors
      if (this.speaking) {
        console.log('[TTS] Already speaking, waiting for completion...');
        let waitCount = 0;
        while (this.speaking && waitCount < 100) { // Max 10 seconds wait
          await new Promise(r => setTimeout(r, 100));
          waitCount++;
        }
        // Extra small delay after speech finishes
        await new Promise(r => setTimeout(r, 200));
      }

      // Get voice for this attempt
      const voiceToUse = this.retryCount > 0
        ? this.getNextFallbackVoice()
        : this.selectedVoice;

      if (!voiceToUse && this.retryCount > 0) {
        console.warn('[TTS] No more fallback voices, giving up');
        resolve();
        return;
      }

      console.log(`[TTS] Speaking (attempt ${this.retryCount + 1}):`, text.substring(0, 40) + '...', '| Voice:', voiceToUse?.name);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || this.rate;
      utterance.pitch = options.pitch || this.pitch;
      utterance.volume = options.volume || this.volume;

      if (voiceToUse) {
        utterance.voice = voiceToUse;
        utterance.lang = voiceToUse.lang;
      }

      // DEBUG: Log all utterance properties
      console.log('[TTS] Utterance config:', {
        text: text.substring(0, 50),
        volume: utterance.volume,
        rate: utterance.rate,
        pitch: utterance.pitch,
        voice: utterance.voice?.name,
        lang: utterance.lang
      });

      utterance.onstart = () => {
        console.log('[TTS] Speech started');
        this.speaking = true;
        if (this.onSpeakStart) this.onSpeakStart();
      };

      utterance.onend = () => {
        console.log('[TTS] Speech completed');
        this.speaking = false;
        this.currentUtterance = null;
        this.retryCount = 0;
        if (this.onSpeakEnd) this.onSpeakEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('[TTS] Speech error:', event.error, '| Voice:', voiceToUse?.name);
        this.speaking = false;
        this.currentUtterance = null;

        // Handle specific errors
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
          return;
        }

        // Try next fallback voice on synthesis-failed
        if (event.error === 'synthesis-failed' || event.error === 'network') {
          this.retryCount++;
          if (this.retryCount < this.maxRetries && this.fallbackVoices.length > this.retryCount) {
            console.log('[TTS] Trying fallback voice...');
            this._speakWithRetry(text, options).then(resolve).catch(reject);
            return;
          }
        }

        // Give up but don't block the app
        console.warn('[TTS] Speech failed, continuing without audio');
        if (this.onSpeakEnd) this.onSpeakEnd();
        resolve();
      };

      this.lastSpoken = text;
      this.currentUtterance = utterance;

      // CRITICAL: Force synthesis to be ready
      if (this.synthesis.paused) {
        this.synthesis.resume();
      }
      if (this.synthesis.pending) {
        this.synthesis.cancel();
      }

      // Immediately speak - no delay
      console.log('[TTS] *** CALLING synthesis.speak() NOW ***');
      this.synthesis.speak(utterance);
      console.log('[TTS] *** synthesis.speak() called, speaking:', this.synthesis.speaking, 'pending:', this.synthesis.pending);
    });
  }

  enqueue(text, priority = 'normal') {
    // If service is disabled, ignore enqueue requests
    if (!this.enabled) {
      console.log('[TTS] Service disabled, ignoring enqueue request');
      return;
    }

    const item = { text, priority, timestamp: Date.now() };

    if (priority === 'high') {
      const insertIndex = this.queue.findIndex(i => i.priority !== 'high');
      if (insertIndex === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIndex, 0, item);
      }
    } else {
      this.queue.push(item);
    }

    this.processQueue();
  }

  processQueue() {
    if (this.speaking || this.paused || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    this.speak(item.text).then(() => {
      setTimeout(() => this.processQueue(), 100);
    });
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.queue = [];
    this.speaking = false;
    this.paused = false;
    this.currentUtterance = null;
  }

  pause() {
    if (this.synthesis && this.speaking) {
      this.synthesis.pause();
      this.paused = true;
    }
  }

  resume() {
    if (this.synthesis && this.paused) {
      this.synthesis.resume();
      this.paused = false;
    }
  }

  clearQueue() {
    this.queue = [];
  }

  repeatLast() {
    if (this.lastSpoken) {
      return this.speak(this.lastSpoken);
    }
    return Promise.resolve();
  }

  getLastSpoken() {
    return this.lastSpoken;
  }

  speakAndThen(text, callback) {
    return this.speak(text).then(() => {
      if (callback) {
        setTimeout(callback, 300);
      }
    });
  }
}

const ttsService = new TTSService();

export default ttsService;
export { TTSService };
