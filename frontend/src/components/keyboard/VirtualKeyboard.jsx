import React, { useEffect, useRef, useCallback, useState } from 'react';
import Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';
import { useVirtualKeyboard } from './VirtualKeyboardContext';
import { getLayout, buttonDisplay, convertToMarathi } from './layouts';
import './VirtualKeyboard.css';

// Common word suggestions with Marathi translations
const suggestionData = {
  english: ['the', 'and', 'is', 'in', 'to', 'for', 'on', 'with', 'that', 'this', 'name', 'address', 'phone', 'email', 'number', 'please', 'thank', 'yes', 'no', 'help'],
  marathi: ['आहे', 'आणि', 'हे', 'या', 'ते', 'एक', 'नाव', 'पत्ता', 'फोन', 'नंबर', 'कृपया', 'धन्यवाद', 'होय', 'नाही', 'मदत', 'माहिती', 'अर्ज', 'सेवा', 'विभाग', 'तक्रार'],
  phonetic: [
    { en: 'naav', mr: 'नाव' },
    { en: 'patta', mr: 'पत्ता' },
    { en: 'phone', mr: 'फोने' },
    { en: 'nambar', mr: 'नंबर' },
    { en: 'kripaya', mr: 'कृपया' },
    { en: 'dhanyavaad', mr: 'धन्यवाद' },
    { en: 'hoy', mr: 'होय' },
    { en: 'naahi', mr: 'नाही' },
    { en: 'madad', mr: 'मदद' },
    { en: 'maahiti', mr: 'माहिती' },
    { en: 'arj', mr: 'अर्ज' },
    { en: 'seva', mr: 'सेवा' },
    { en: 'vibhaag', mr: 'विभाग' },
    { en: 'takraar', mr: 'तक्रार' },
    { en: 'gaav', mr: 'गाव' },
    { en: 'shahar', mr: 'शहर' },
    { en: 'paaNi', mr: 'पाणी' },
    { en: 'viij', mr: 'वीज' },
    { en: 'swadesh', mr: 'स्वदेश' },
    { en: 'ghar', mr: 'घर' }
  ]
};

const VirtualKeyboard = () => {
  const {
    isVisible,
    language,
    hideKeyboard,
    getActiveInput,
    setKeyboardRef,
    setLanguage
  } = useVirtualKeyboard();

  const keyboardContainerRef = useRef(null);
  const keyboardInstance = useRef(null);
  const [layoutName, setLayoutName] = useState('default');
  const [capsLock, setCapsLock] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const langMenuRef = useRef(null);

  const languageRef = useRef(language);
  const layoutNameRef = useRef(layoutName);
  const capsLockRef = useRef(capsLock);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { layoutNameRef.current = layoutName; }, [layoutName]);
  useEffect(() => { capsLockRef.current = capsLock; }, [capsLock]);

  // Manage body class for keyboard visibility
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('virtual-keyboard-open');
    } else {
      document.body.classList.remove('virtual-keyboard-open');
    }
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('virtual-keyboard-open');
    };
  }, [isVisible]);

  // Get suggestions based on input
  const getSuggestions = useCallback((input, lang) => {
    if (lang === 'english') {
      if (!input || input.length < 1) return suggestionData.english.slice(0, 6);
      const lastWord = input.split(/\s+/).pop().toLowerCase();
      if (!lastWord) return suggestionData.english.slice(0, 6);
      const filtered = suggestionData.english.filter(w => w.startsWith(lastWord)).slice(0, 6);
      return filtered.length > 0 ? filtered : suggestionData.english.slice(0, 6);
    }

    if (lang === 'marathi') {
      return suggestionData.marathi.slice(0, 6);
    }

    if (lang === 'phonetic') {
      if (!input || input.length < 1) {
        return suggestionData.phonetic.slice(0, 6).map(s => s.en);
      }
      const lastWord = input.split(/\s+/).pop().toLowerCase();
      if (!lastWord) return suggestionData.phonetic.slice(0, 6).map(s => s.en);
      const filtered = suggestionData.phonetic.filter(s => s.en.startsWith(lastWord)).slice(0, 6);
      return filtered.length > 0 ? filtered.map(s => s.en) : suggestionData.phonetic.slice(0, 6).map(s => s.en);
    }

    return [];
  }, []);

  useEffect(() => {
    setSuggestions(getSuggestions(currentInput, language));
  }, [currentInput, language, getSuggestions]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    const activeInput = getActiveInput();
    if (!activeInput || !keyboardInstance.current) return;

    const currentValue = keyboardInstance.current.getInput();
    const words = currentValue.split(/\s+/);
    words.pop();
    words.push(suggestion);
    const newValue = words.join(' ') + ' ';

    let processedValue = newValue;
    if (language === 'phonetic') {
      processedValue = convertToMarathi(newValue);
    }

    keyboardInstance.current.setInput(newValue);
    updateInputValue(activeInput, processedValue);
    setCurrentInput(newValue);
    activeInput.focus();
  }, [getActiveInput, language]);

  // Update input value
  const updateInputValue = useCallback((activeInput, value) => {
    if (!activeInput) return;
    const setter = activeInput.tagName === 'TEXTAREA'
      ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(activeInput, value);
    else activeInput.value = value;
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    activeInput.dispatchEvent(new Event('change', { bubbles: true }));
  }, []);

  // Scroll input into view
  const scrollInputIntoView = useCallback(() => {
    const activeInput = getActiveInput();
    if (!activeInput) return;
    setTimeout(() => {
      const keyboardHeight = 320;
      const inputRect = activeInput.getBoundingClientRect();
      const visibleAreaBottom = window.innerHeight - keyboardHeight - 30;
      if (inputRect.bottom > visibleAreaBottom) {
        const scrollAmount = inputRect.bottom - visibleAreaBottom + 50;
        const container = activeInput.closest('.MuiDialogContent-root') || activeInput.closest('.MuiDialog-paper') || activeInput.closest('.kiosk-content') || window;
        if (container === window) window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        else container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
    }, 150);
  }, [getActiveInput]);

  // Handle language selection
  const handleLanguageSelect = useCallback((lang) => {
    setLanguage(lang);
    setShowLangMenu(false);
    // Reset keyboard input when changing language
    if (keyboardInstance.current) {
      keyboardInstance.current.setInput('');
    }
    setCurrentInput('');
    const activeInput = getActiveInput();
    if (activeInput) {
      activeInput.value = '';
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
      activeInput.focus();
    }
  }, [setLanguage, getActiveInput]);

  // Close language menu
  useEffect(() => {
    if (!showLangMenu) return;
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showLangMenu]);

  // Initialize keyboard
  useEffect(() => {
    if (!isVisible || !keyboardContainerRef.current) return;

    if (keyboardInstance.current) {
      keyboardInstance.current.destroy();
      keyboardInstance.current = null;
    }

    const layout = getLayout(language);
    const display = { ...buttonDisplay };

    keyboardInstance.current = new Keyboard(keyboardContainerRef.current, {
      onChange: (input) => {
        const activeInput = getActiveInput();
        if (!activeInput) return;
        setCurrentInput(input);

        let processedInput = input;
        if (languageRef.current === 'phonetic') {
          // Use the improved phonetic conversion
          processedInput = convertToMarathi(input);
        }

        updateInputValue(activeInput, processedInput);
      },
      onKeyPress: (button) => {
        const activeInput = getActiveInput();

        if (button === '{space}') {
          if (isLongPress.current) {
            isLongPress.current = false;
            return;
          }
          return;
        }

        switch (button) {
          case '{done}':
            hideKeyboard();
            if (activeInput) activeInput.blur();
            return;
          case '{shift}':
            setLayoutName(prev => prev === 'default' ? 'shift' : 'default');
            return;
          case '{lock}':
            setCapsLock(prev => {
              setLayoutName(!prev ? 'shift' : 'default');
              return !prev;
            });
            return;
          case '{enter}':
            if (activeInput) {
              if (activeInput.tagName === 'TEXTAREA') {
                const currentValue = keyboardInstance.current.getInput();
                keyboardInstance.current.setInput(currentValue + '\n');
              } else {
                activeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
              }
            }
            return;
          case '{tab}':
            if (activeInput?.form) {
              const inputs = Array.from(activeInput.form.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'));
              const nextInput = inputs[inputs.indexOf(activeInput) + 1];
              if (nextInput) { nextInput.focus(); scrollInputIntoView(); }
            }
            return;
          default:
            if (layoutNameRef.current === 'shift' && !capsLockRef.current) setLayoutName('default');
        }
      },
      layout: layout,
      display: display,
      theme: 'hg-theme-default hg-layout-default',
      mergeDisplay: true,
      physicalKeyboardHighlight: false,
      buttonTheme: [
        { class: 'keyboard-key-special', buttons: '{bksp} {enter} {shift} {lock} {tab}' },
        { class: 'keyboard-key-done', buttons: '{done}' },
        { class: 'keyboard-key-space', buttons: '{space}' }
      ]
    });

    setKeyboardRef(keyboardInstance.current);
    setIsInitialized(true);

    const activeInput = getActiveInput();
    if (activeInput) {
      keyboardInstance.current.setInput(activeInput.value || '');
      setCurrentInput(activeInput.value || '');
      scrollInputIntoView();
    }

    // Setup long press for spacebar
    const container = keyboardContainerRef.current;

    const handlePressStart = (e) => {
      const target = e.target.closest('[data-skbtn="{space}"]');
      if (target) {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          setShowLangMenu(true);
        }, 600);
      }
    };

    const handlePressEnd = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    container.addEventListener('mousedown', handlePressStart);
    container.addEventListener('mouseup', handlePressEnd);
    container.addEventListener('mouseleave', handlePressEnd);
    container.addEventListener('touchstart', handlePressStart);
    container.addEventListener('touchend', handlePressEnd);

    return () => {
      container.removeEventListener('mousedown', handlePressStart);
      container.removeEventListener('mouseup', handlePressEnd);
      container.removeEventListener('mouseleave', handlePressEnd);
      container.removeEventListener('touchstart', handlePressStart);
      container.removeEventListener('touchend', handlePressEnd);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (keyboardInstance.current) {
        keyboardInstance.current.destroy();
        keyboardInstance.current = null;
      }
      setIsInitialized(false);
    };
  }, [isVisible]);

  // Update layout when language changes
  useEffect(() => {
    if (keyboardInstance.current && isInitialized) {
      keyboardInstance.current.setOptions({ layout: getLayout(language), display: { ...buttonDisplay } });
    }
  }, [language, isInitialized]);

  // Update shift layout
  useEffect(() => {
    if (keyboardInstance.current && isInitialized) {
      keyboardInstance.current.setOptions({ layoutName });
    }
  }, [layoutName, isInitialized]);

  // Get display text for suggestion based on language
  const getSuggestionDisplay = (suggestion) => {
    if (language === 'phonetic') {
      // Show both English and Marathi for phonetic
      const found = suggestionData.phonetic.find(s => s.en === suggestion);
      if (found) return `${found.en} (${found.mr})`;
      return suggestion;
    }
    return suggestion;
  };

  // Use CSS to hide/show - don't return null so hooks always run
  return (
    <div
      className={`virtual-keyboard-wrapper notranslate ${isVisible ? 'visible' : ''}`}
      style={{ display: isVisible ? 'block' : 'none' }}
      data-no-translate="true"
    >
      <div className="virtual-keyboard-container" data-no-translate="true">
        <div className="keyboard-suggestions" data-no-translate="true">
          <div className="suggestions-list">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(s)}
                type="button"
              >
                {getSuggestionDisplay(s)}
              </button>
            ))}
          </div>
          <div className="keyboard-lang-indicator" onClick={() => setShowLangMenu(true)}>
            {language === 'english' ? 'EN' : language === 'marathi' ? 'म' : 'A→म'}
          </div>
        </div>

        <div ref={keyboardContainerRef} className="virtual-keyboard notranslate" data-no-translate="true" />

        {showLangMenu && (
          <div className="lang-menu-overlay" data-no-translate="true">
            <div className="lang-menu notranslate" ref={langMenuRef} data-no-translate="true">
              <div className="lang-menu-title">Select Language</div>
              <button className={`lang-option ${language === 'english' ? 'active' : ''}`} onClick={() => handleLanguageSelect('english')}>
                <span className="lang-icon">EN</span>
                <span className="lang-name">English</span>
              </button>
              <button className={`lang-option ${language === 'marathi' ? 'active' : ''}`} onClick={() => handleLanguageSelect('marathi')}>
                <span className="lang-icon">म</span>
                <span className="lang-name">Marathi (Direct)</span>
              </button>
              <button className={`lang-option ${language === 'phonetic' ? 'active' : ''}`} onClick={() => handleLanguageSelect('phonetic')}>
                <span className="lang-icon">A→म</span>
                <span className="lang-name">Phonetic (Type English)</span>
                <span className="lang-desc">swadesh → स्वदेश</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualKeyboard;
