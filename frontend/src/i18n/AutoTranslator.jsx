import React, { useEffect, useRef, useContext } from 'react';
import { TranslationContext } from './TranslationContext';
import { translate, getCachedTranslation } from './translationService';

/**
 * AutoTranslator - Translates ALL text in the entire document
 * Including MUI Dialogs, Menus, Popovers (which render in portals)
 */
export function AutoTranslator({ children }) {
  const context = useContext(TranslationContext);
  const { language, isEnglish, version } = context || {};
  const originalTextsRef = useRef(new Map());
  const originalAttrsRef = useRef(new Map());
  const processingRef = useRef(false);
  const queueRef = useRef(new Set());
  const timerRef = useRef(null);

  // Tags to skip completely
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'PATH', 'CIRCLE', 'RECT',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR'
  ]);

  // Input elements - translate labels/placeholders but not values
  const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

  // Attributes to translate
  const TRANSLATE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-placeholder'];

  /**
   * Check if text should be translated
   */
  function isTranslatable(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim();
    if (!t || t.length < 2) return false;
    // Skip if only numbers, symbols, or whitespace
    if (/^[\d\s\-_.,;:!?@#$%^&*()+=<>{}[\]|\\/"'`~€₹$£¥°•·×÷±≤≥≠∞√]+$/.test(t)) return false;
    // Skip URLs and emails
    if (/^(https?:\/\/|www\.|[^\s]+@[^\s]+\.[^\s]+)/.test(t)) return false;
    return true;
  }

  /**
   * Check if node should be processed
   */
  function shouldProcess(node) {
    if (!node) return false;

    // Skip detached nodes
    if (!document.body.contains(node)) return false;

    // For text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent) return false;
      if (SKIP_TAGS.has(parent.tagName)) return false;
      if (parent.isContentEditable) return false;
      if (parent.closest('[data-no-translate]')) return false;
      if (parent.closest('.notranslate')) return false;
      // Skip input values but allow labels
      if (INPUT_TAGS.has(parent.tagName)) return false;
      return true;
    }

    // For elements
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (SKIP_TAGS.has(node.tagName)) return false;
      if (node.closest('[data-no-translate]')) return false;
      if (node.closest('.notranslate')) return false;
      return true;
    }

    return false;
  }

  /**
   * Get unique key for a node
   */
  function getNodeKey(node) {
    if (!node._translateKey) {
      node._translateKey = `node_${Math.random().toString(36).substr(2, 9)}`;
    }
    return node._translateKey;
  }

  /**
   * Translate a single text node
   */
  async function translateTextNode(node) {
    if (!shouldProcess(node) || node.nodeType !== Node.TEXT_NODE) return;

    const key = getNodeKey(node);

    // Store original text
    if (!originalTextsRef.current.has(key)) {
      originalTextsRef.current.set(key, node.textContent);
    }

    const originalText = originalTextsRef.current.get(key);
    if (!isTranslatable(originalText)) return;

    // If English, restore original
    if (isEnglish) {
      if (node.textContent !== originalText) {
        node.textContent = originalText;
      }
      return;
    }

    const trimmed = originalText.trim();

    // Try cache first for instant update
    const cached = getCachedTranslation(trimmed, language);
    if (cached) {
      const newText = originalText.replace(trimmed, cached);
      if (node.textContent !== newText && document.body.contains(node)) {
        node.textContent = newText;
      }
      return;
    }

    // Translate async
    try {
      const translated = await translate(trimmed, language);
      if (translated && document.body.contains(node)) {
        const newText = originalText.replace(trimmed, translated);
        if (node.textContent !== newText) {
          node.textContent = newText;
        }
      }
    } catch (e) {
      // Keep original on error
    }
  }

  /**
   * Translate element attributes
   */
  async function translateElementAttrs(element) {
    if (!shouldProcess(element) || element.nodeType !== Node.ELEMENT_NODE) return;

    for (const attr of TRANSLATE_ATTRS) {
      const value = element.getAttribute(attr);
      if (!value || !isTranslatable(value)) continue;

      const key = `${getNodeKey(element)}_${attr}`;

      // Store original
      if (!originalAttrsRef.current.has(key)) {
        originalAttrsRef.current.set(key, value);
      }

      const original = originalAttrsRef.current.get(key);

      // If English, restore
      if (isEnglish) {
        if (element.getAttribute(attr) !== original) {
          element.setAttribute(attr, original);
        }
        continue;
      }

      // Try cache
      const cached = getCachedTranslation(original, language);
      if (cached) {
        if (element.getAttribute(attr) !== cached) {
          element.setAttribute(attr, cached);
        }
        continue;
      }

      // Translate async
      try {
        const translated = await translate(original, language);
        if (translated && document.body.contains(element)) {
          element.setAttribute(attr, translated);
        }
      } catch (e) {
        // Keep original
      }
    }
  }

  /**
   * Process an element and all its descendants
   */
  async function processElement(root) {
    if (!root || !document.body.contains(root)) return;

    const promises = [];

    // If root is an element, process its attributes
    if (root.nodeType === Node.ELEMENT_NODE) {
      promises.push(translateElementAttrs(root));
    }

    // Get all text nodes using TreeWalker (fast)
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (SKIP_TAGS.has(node.tagName)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            if (!shouldProcess(node)) return NodeFilter.FILTER_REJECT;
            if (!isTranslatable(node.textContent)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    // Process all nodes
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        promises.push(translateTextNode(node));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        promises.push(translateElementAttrs(node));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Process queued nodes
   */
  async function processQueue() {
    if (processingRef.current || queueRef.current.size === 0) return;

    processingRef.current = true;
    const nodes = Array.from(queueRef.current);
    queueRef.current.clear();

    try {
      // Process in parallel
      await Promise.all(nodes.map(processElement));
    } finally {
      processingRef.current = false;

      // Continue if more nodes were added
      if (queueRef.current.size > 0) {
        timerRef.current = requestAnimationFrame(processQueue);
      }
    }
  }

  /**
   * Queue a node for translation
   */
  function queueNode(node) {
    if (!node) return;
    queueRef.current.add(node);

    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    timerRef.current = requestAnimationFrame(processQueue);
  }

  /**
   * Main effect - observe entire document.body
   */
  useEffect(() => {
    // Translate entire document body
    queueNode(document.body);

    // Create observer for the entire document
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Handle added nodes (new content, dialogs, etc.)
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            queueNode(node);
          }
        }

        // Handle text changes
        if (mutation.type === 'characterData' && mutation.target) {
          const parent = mutation.target.parentElement;
          if (parent) queueNode(parent);
        }

        // Handle attribute changes (for dynamic placeholders, etc.)
        if (mutation.type === 'attributes' && mutation.target) {
          if (TRANSLATE_ATTRS.includes(mutation.attributeName)) {
            queueNode(mutation.target);
          }
        }
      }
    });

    // Observe the entire document body including portals (dialogs, menus)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATE_ATTRS,
    });

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [language, isEnglish, version]);

  /**
   * Re-translate when language changes
   */
  useEffect(() => {
    if (language) {
      // Clear originals cache to force re-evaluation
      // Then re-translate everything
      queueNode(document.body);
    }
  }, [language, version]);

  return <>{children}</>;
}

export default AutoTranslator;
