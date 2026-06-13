console.log('Loading: anchor-system.js');

/**
 * ThreadCub Anchor System
 *
 * Implements robust TextQuote-style anchoring for jump-to functionality.
 * Anchors are saved items that include:
 * - exact: The selected text
 * - prefix: ~60 chars before selection within message container
 * - suffix: ~60 chars after selection
 * - messageSelector: CSS selector for the message container
 * - messageIndex: Fallback index of the message
 */

const ANCHOR_CONFIG = {
  PREFIX_LENGTH: 60,
  SUFFIX_LENGTH: 60,
  MIN_EXACT_LENGTH: 3,
  MATCH_THRESHOLD: 0.7, // 70% similarity required for fuzzy match
  FLASH_DURATION: 2000  // Duration of flash highlight in ms
};

class AnchorSystem {
  constructor() {
    this.adapter = null;
  }

  // ---------------------------------------------------------------------------
  // 📊 GA: Analytics helper — routes events through background.js
  // Search '📊 GA:' in this file to find all tracked interactions
  // ---------------------------------------------------------------------------
  _trackEvent(eventType, data) {
    try {
      chrome.runtime.sendMessage({ action: 'trackEvent', eventType, data });
    } catch (e) {
      console.warn('Anchor system: could not send analytics event:', e.message);
    }
  }

  /**
   * Initialize the anchor system
   */
  init() {
    this.adapter = window.PlatformAdapters?.getAdapter() || null;
    console.log('Anchor system initialized with adapter:', this.adapter?.name || 'none');
  }

  /**
   * Create an anchor from the current text selection
   * @param {Selection} selection - The browser selection object
   * @returns {Object|null} - The anchor object or null if creation failed
   */
  createAnchorFromSelection(selection) {
    if (!selection || selection.isCollapsed) {
      console.log('No valid selection for anchor creation');
      return null;
    }

    const range = selection.getRangeAt(0);
    const exact = range.toString().trim();

    if (exact.length < ANCHOR_CONFIG.MIN_EXACT_LENGTH) {
      console.log('Selection too short for anchor');
      return null;
    }

    // Ensure we have an adapter
    if (!this.adapter) {
      this.adapter = window.PlatformAdapters?.getAdapter() || null;
    }
    console.log('🔍 DEBUG: Adapter available:', this.adapter?.name || 'none');

    // Find the message container
    const messageContainer = this.adapter
      ? this.adapter.findMessageContainer(range.startContainer)
      : this.findGenericContainer(range.startContainer);
    
    console.log('🔍 DEBUG: Message container found:', messageContainer);
    console.log('🔍 DEBUG: Container tag:', messageContainer?.tagName);
    console.log('🔍 DEBUG: Container classes:', messageContainer?.className);

    // Capture context
    const { prefix, suffix } = this.captureContext(range, messageContainer);

    // Generate selectors and index
    const messageSelector = this.adapter
      ? this.adapter.getStableMessageSelector(messageContainer)
      : this.generateGenericSelector(messageContainer);

    const messageIndex = this.adapter
      ? this.adapter.getMessageIndex(messageContainer)
      : -1;

    const anchor = {
      exact,
      prefix,
      suffix,
      messageSelector,
      messageIndex,
      url: window.location.href,
      platform: this.adapter?.name || 'unknown'
    };

    console.log('Anchor created:', anchor);

    // 📊 GA: anchor created — tracks platform
    this._trackEvent('anchor_created', { platform: anchor.platform || 'unknown' });

    return anchor;
  }

  /**
   * Capture prefix and suffix context around the selection
   * @param {Range} range - The selection range
   * @param {Element} container - The message container
   * @returns {{prefix: string, suffix: string}}
   */
  captureContext(range, container) {
    let prefix = '';
    let suffix = '';

    console.log('🔍 DEBUG captureContext: Container is:', container);
    console.log('🔍 DEBUG captureContext: Container type:', container?.nodeType);
    console.log('🔍 DEBUG captureContext: Range:', range.toString());

    try {
      // Helper function to find first/last text node
      const getFirstTextNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        return walker.nextNode();
      };

      const getLastTextNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let lastNode = null;
        let current = walker.nextNode();
        while (current) {
          lastNode = current;
          current = walker.nextNode();
        }
        return lastNode;
      };

      // Get text before the selection within the container
      const firstTextNode = getFirstTextNode(container);
      console.log('🔍 DEBUG: First text node:', firstTextNode);
      if (firstTextNode) {
        const beforeRange = document.createRange();
        beforeRange.setStart(firstTextNode, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const beforeText = beforeRange.toString();
        prefix = this.normalizeWhitespace(beforeText).slice(-ANCHOR_CONFIG.PREFIX_LENGTH);
        console.log('🔍 DEBUG: Prefix captured:', prefix.substring(0, 20) + '...');
      } else {
        console.log('⚠️ DEBUG: No first text node found!');
      }

      // Get text after the selection within the container
      const lastTextNode = getLastTextNode(container);
      console.log('🔍 DEBUG: Last text node:', lastTextNode);
      if (lastTextNode) {
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEnd(lastTextNode, lastTextNode.length);
        const afterText = afterRange.toString();
        suffix = this.normalizeWhitespace(afterText).slice(0, ANCHOR_CONFIG.SUFFIX_LENGTH);
        console.log('🔍 DEBUG: Suffix captured:', suffix.substring(0, 20) + '...');
      } else {
        console.log('⚠️ DEBUG: No last text node found!');
      }

    } catch (error) {
      console.log('❌ Error capturing context:', error);

      // Fallback: use the container's text content
      try {
        const containerText = container?.textContent || '';
        const exact = range.toString().trim();
        const exactIndex = containerText.indexOf(exact);

        if (exactIndex !== -1) {
          prefix = this.normalizeWhitespace(containerText.slice(0, exactIndex)).slice(-ANCHOR_CONFIG.PREFIX_LENGTH);
          suffix = this.normalizeWhitespace(containerText.slice(exactIndex + exact.length)).slice(0, ANCHOR_CONFIG.SUFFIX_LENGTH);
          console.log('✅ DEBUG: Fallback context captured - prefix:', prefix.substring(0, 20));
        }
      } catch (e) {
        console.log('❌ Fallback context capture failed:', e);
      }
    }

    console.log('🔍 DEBUG: Final context - prefix:', prefix.substring(0, 20), 'suffix:', suffix.substring(0, 20));
    return { prefix, suffix };
  }

  /**
   * Jump to an anchor location
   * @param {Object} anchor - The anchor object
   * @returns {Promise<{success: boolean, method: string, approximate: boolean}>}
   */
  async jumpToAnchor(anchor) {
    console.log('Jumping to anchor:', anchor);

    // Ensure we have an adapter
    if (!this.adapter) {
      this.adapter = window.PlatformAdapters?.getAdapter() || null;
    }

    // Strategy A: Use messageSelector (fast path)
    let result = await this.jumpViaSelector(anchor);
    if (result.success) {
      // 📊 GA: anchor jump succeeded — method = selector
      this._trackEvent('anchor_jump_attempted', { success: true, method: result.method });
      return result;
    }

    // Strategy B: Search all message containers
    result = await this.jumpViaMessageSearch(anchor);
    if (result.success) {
      // 📊 GA: anchor jump succeeded — method = message-search
      this._trackEvent('anchor_jump_attempted', { success: true, method: result.method });
      return result;
    }

    // Strategy C: Full DOM text search (walks all text nodes)
    result = await this.jumpViaFullTextSearch(anchor);
    if (result.success) {
      // 📊 GA: anchor jump succeeded — method = full-text-search
      this._trackEvent('anchor_jump_attempted', { success: true, method: result.method });
      return result;
    }

    // Strategy D: Fallback to messageIndex
    result = await this.jumpViaMessageIndex(anchor);
    if (result.success) {
      // 📊 GA: anchor jump succeeded — method = index
      this._trackEvent('anchor_jump_attempted', { success: true, method: result.method });
      return result;
    }

    // Strategy E: Failure
    console.log('All anchor resolution strategies failed');
    // 📊 GA: anchor jump failed — all strategies exhausted
    this._trackEvent('anchor_jump_attempted', { success: false, method: 'none' });
    return { success: false, method: 'none', approximate: false };
  }

  /**
   * Check if element is part of ThreadCub's UI (should be excluded)
   * @param {Element} element
   * @returns {boolean}
   */
  isThreadCubElement(element) {
    if (!element) return false;
    
    let current = element;
    let depth = 0;
    
    while (current && current !== document.body && depth < 10) {
      // Check ID
      if (current.id && current.id.includes('threadcub')) return true;
      
      // Check classes
      if (current.className && typeof current.className === 'string') {
        if (current.className.includes('threadcub')) return true;
        if (current.className.includes('anchor-item')) return true;
        if (current.className.includes('tag-item')) return true;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return false;
  }

  /**
   * Strategy C: Full DOM text search (walks all text nodes)
   */
  async jumpViaFullTextSearch(anchor) {
    console.log('Attempting full DOM text search for:', anchor.exact);

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and hidden elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip ThreadCub UI elements
          if (this.isThreadCubElement(parent)) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode;
    while ((textNode = walker.nextNode())) {
      const nodeText = textNode.textContent;
      const exactIndex = nodeText.indexOf(anchor.exact);

      if (exactIndex !== -1) {
        try {
          const range = document.createRange();
          range.setStart(textNode, exactIndex);
          range.setEnd(textNode, exactIndex + anchor.exact.length);

          const element = textNode.parentElement;
          
          // Double-check this isn't a ThreadCub element
          if (this.isThreadCubElement(element)) {
            console.log('Skipping ThreadCub UI element in full text search');
            continue;
          }
          
          this.scrollToElement(element);
          this.flashElement(element);
          return { success: true, method: 'full-text-search', approximate: false };
        } catch (e) {
          console.log('Error creating range in full text search:', e);
        }
      }
    }

    return { success: false, method: 'full-text-search', approximate: false };
  }

  /**
   * Strategy A: Jump using the stored selector
   */
  async jumpViaSelector(anchor) {
    if (!anchor.messageSelector) {
      return { success: false, method: 'selector', approximate: false };
    }

    try {
      const element = document.querySelector(anchor.messageSelector);
      if (!element) {
        console.log('Selector did not resolve:', anchor.messageSelector);
        return { success: false, method: 'selector', approximate: false };
      }

      // Search for exact text within this element
      const match = this.findBestMatch(element, anchor);
      if (match) {
        this.scrollAndFlash(match.range, match.element);
        return { success: true, method: 'selector', approximate: false };
      }

      // Element exists but text not found exactly - scroll to element anyway
      this.scrollToElement(element);
      this.flashElement(element);
      return { success: true, method: 'selector', approximate: true };

    } catch (error) {
      console.log('Selector strategy failed:', error);
      return { success: false, method: 'selector', approximate: false };
    }
  }

  /**
   * Strategy B: Search all message containers
   */
  async jumpViaMessageSearch(anchor) {
    // Try adapter-based search first
    let messages = this.adapter
      ? this.adapter.getMessageElements()
      : [];

    // If adapter returns nothing, use broad DOM search
    if (!messages || messages.length === 0) {
      console.log('Adapter returned no messages, using broad DOM search');
      messages = document.querySelectorAll('div[class*="message"], div[class*="prose"], div[class*="markdown"], article, [data-message], [data-testid*="conversation"]');
    }

    // Final fallback: search all text-containing divs
    if (!messages || messages.length === 0) {
      console.log('Broad search returned nothing, using all divs');
      messages = document.querySelectorAll('div, p, article');
    }

    // Filter out ThreadCub UI elements
    messages = Array.from(messages).filter(msg => !this.isThreadCubElement(msg));
    
    if (messages.length === 0) {
      console.log('All messages filtered out as ThreadCub elements');
      return { success: false, method: 'message-search', approximate: false };
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const message of messages) {
      const messageText = this.normalizeWhitespace(message.textContent || '');

      // Check if exact text appears in this message
      if (!messageText.includes(anchor.exact)) continue;

      // Score based on prefix/suffix overlap
      const score = this.scoreMatch(message, anchor);
      if (score > bestScore && score >= ANCHOR_CONFIG.MATCH_THRESHOLD) {
        bestScore = score;
        bestMatch = message;
      }
    }

    // If no good match found with scoring, try simple text search
    if (!bestMatch) {
      for (const message of messages) {
        const messageText = message.textContent || '';
        if (messageText.includes(anchor.exact)) {
          bestMatch = message;
          break;
        }
      }
    }

    if (bestMatch) {
      const match = this.findBestMatch(bestMatch, anchor);
      if (match) {
        this.scrollAndFlash(match.range, match.element);
        return { success: true, method: 'message-search', approximate: false };
      }

      // Fallback: scroll to the best matching message
      this.scrollToElement(bestMatch);
      this.flashElement(bestMatch);
      return { success: true, method: 'message-search', approximate: true };
    }

    return { success: false, method: 'message-search', approximate: false };
  }

  /**
   * Strategy C: Jump using message index
   */
  async jumpViaMessageIndex(anchor) {
    if (anchor.messageIndex < 0) {
      return { success: false, method: 'index', approximate: false };
    }

    const messages = this.adapter
      ? this.adapter.getMessageElements()
      : [];

    if (anchor.messageIndex >= messages.length) {
      return { success: false, method: 'index', approximate: false };
    }

    const message = messages[anchor.messageIndex];
    if (message) {
      this.scrollToElement(message);
      this.flashElement(message);
      this.showApproximateHint();
      return { success: true, method: 'index', approximate: true };
    }

    return { success: false, method: 'index', approximate: false };
  }

  /**
   * Find the best matching text range within an element
   */
  findBestMatch(element, anchor) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    // First pass: look for exact match
    let textNode;
    while ((textNode = walker.nextNode())) {
      const nodeText = textNode.textContent;
      const exactIndex = nodeText.indexOf(anchor.exact);

      if (exactIndex !== -1) {
        // Validate with prefix/suffix if available
        const score = this.scoreNodeMatch(textNode, exactIndex, anchor);
        if (score >= ANCHOR_CONFIG.MATCH_THRESHOLD) {
          try {
            const range = document.createRange();
            range.setStart(textNode, exactIndex);
            range.setEnd(textNode, exactIndex + anchor.exact.length);
            return { range, element: textNode.parentElement, score };
          } catch (e) {
            console.log('Error creating range:', e);
          }
        }
      }
    }

    // Second pass: try normalized matching
    const normalizedExact = this.normalizeWhitespace(anchor.exact);
    walker.currentNode = element;

    while ((textNode = walker.nextNode())) {
      const normalizedNode = this.normalizeWhitespace(textNode.textContent);
      const exactIndex = normalizedNode.indexOf(normalizedExact);

      if (exactIndex !== -1) {
        try {
          // Find approximate position in original text
          const originalText = textNode.textContent;
          let charCount = 0;
          let startIndex = 0;

          for (let i = 0; i < originalText.length && charCount < exactIndex; i++) {
            if (!/\s/.test(originalText[i]) || (i > 0 && !/\s/.test(originalText[i-1]))) {
              charCount++;
            }
            startIndex = i + 1;
          }

          const range = document.createRange();
          range.setStart(textNode, Math.min(startIndex, originalText.length));
          range.setEnd(textNode, Math.min(startIndex + anchor.exact.length, originalText.length));
          return { range, element: textNode.parentElement, score: 0.8 };
        } catch (e) {
          console.log('Error creating normalized range:', e);
        }
      }
    }

    return null;
  }

  /**
   * Score a message element based on how well it matches the anchor context
   */
  scoreMatch(message, anchor) {
    const messageText = this.normalizeWhitespace(message.textContent || '');
    const exactIndex = messageText.indexOf(anchor.exact);

    if (exactIndex === -1) return 0;

    let score = 0.5; // Base score for containing exact text

    // Check prefix match
    if (anchor.prefix) {
      const beforeText = messageText.slice(0, exactIndex);
      const prefixMatch = this.calculateOverlap(beforeText, anchor.prefix);
      score += prefixMatch * 0.25;
    }

    // Check suffix match
    if (anchor.suffix) {
      const afterText = messageText.slice(exactIndex + anchor.exact.length);
      const suffixMatch = this.calculateOverlap(afterText, anchor.suffix);
      score += suffixMatch * 0.25;
    }

    return score;
  }

  /**
   * Score a specific text node match based on surrounding context
   */
  scoreNodeMatch(textNode, exactIndex, anchor) {
    const nodeText = textNode.textContent;
    let score = 0.5;

    // Check prefix
    if (anchor.prefix) {
      const beforeText = nodeText.slice(0, exactIndex);
      // Also check parent/previous siblings
      let fullBefore = beforeText;
      try {
        const parent = textNode.parentElement;
        if (parent) {
          const parentText = this.getTextBeforeNode(parent, textNode);
          fullBefore = parentText + beforeText;
        }
      } catch (e) {}
      const prefixMatch = this.calculateOverlap(fullBefore, anchor.prefix);
      score += prefixMatch * 0.25;
    }

    // Check suffix
    if (anchor.suffix) {
      const afterText = nodeText.slice(exactIndex + anchor.exact.length);
      const suffixMatch = this.calculateOverlap(afterText, anchor.suffix);
      score += suffixMatch * 0.25;
    }

    return score;
  }

  /**
   * Calculate overlap between two strings
   */
  calculateOverlap(text, context) {
    if (!text || !context) return 0;

    const normalizedText = this.normalizeWhitespace(text);
    const normalizedContext = this.normalizeWhitespace(context);

    // Check if context is contained in text
    if (normalizedText.includes(normalizedContext)) return 1;
    if (normalizedContext.includes(normalizedText)) return 0.8;

    // Calculate character overlap
    let matches = 0;
    const shorter = normalizedContext.length < normalizedText.length ? normalizedContext : normalizedText;
    const longer = shorter === normalizedContext ? normalizedText : normalizedContext;

    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter.slice(i, i + 3))) {
        matches += 3;
        i += 2;
      }
    }

    return Math.min(1, matches / shorter.length);
  }

  /**
   * Scroll to an element and flash highlight a range
   */
  scrollAndFlash(range, element) {
    // Scroll the element into view
    this.scrollToElement(element || range.startContainer.parentElement);

    // Flash highlight the range
    this.flashRange(range);
  }

  /**
   * Scroll an element into view
   * Improved to handle custom scroll containers
   */
  scrollToElement(element) {
    if (!element) return;

    console.log('Scrolling to element:', element.tagName, element.className);

    // Strategy 1: Try standard scrollIntoView first
    try {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      
      // Give it a moment to scroll
      setTimeout(() => {
        // Verify scroll happened by checking if element is in viewport
        const rect = element.getBoundingClientRect();
        const inViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );
        
        if (!inViewport) {
          console.log('Element not in viewport after scroll, trying scroll container method');
          this.scrollViaContainer(element);
        }
      }, 500);
      
    } catch (error) {
      console.log('scrollIntoView failed, trying container method:', error);
      this.scrollViaContainer(element);
    }
  }

  /**
   * Scroll by finding and scrolling the parent container
   */
  scrollViaContainer(element) {
    if (!element) return;

    // Find the scrollable parent
    let scrollParent = element.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const style = window.getComputedStyle(scrollParent);
      const isScrollable = 
        style.overflow === 'auto' ||
        style.overflow === 'scroll' ||
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll';

      if (isScrollable && scrollParent.scrollHeight > scrollParent.clientHeight) {
        console.log('Found scroll container:', scrollParent.tagName, scrollParent.className);
        
        // Calculate scroll position to center the element
        const containerRect = scrollParent.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollOffset = elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
        
        scrollParent.scrollBy({
          top: scrollOffset,
          behavior: 'smooth'
        });
        return;
      }
      
      scrollParent = scrollParent.parentElement;
    }

    // If no scrollable parent found, try adapter's conversation wrapper
    if (this.adapter) {
      const wrapper = this.adapter.getConversationWrapper();
      if (wrapper && wrapper !== document.body) {
        console.log('Using adapter conversation wrapper for scroll');
        const wrapperRect = wrapper.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollOffset = elementRect.top - wrapperRect.top - (wrapperRect.height / 2) + (elementRect.height / 2);
        
        wrapper.scrollBy({
          top: scrollOffset,
          behavior: 'smooth'
        });
      }
    }
  }

  /**
   * Flash highlight a range
   */
  flashRange(range) {
    if (!range) return;

    try {
      // Clone range to avoid modifying original
      const workingRange = range.cloneRange();
      
      // Use extractContents + insertNode method (works with mixed formatting)
      // This is more reliable than surroundContents which fails when range partially contains elements
      const contents = workingRange.extractContents();
      const highlight = document.createElement('span');
      highlight.className = 'threadcub-anchor-flash';
      highlight.appendChild(contents);
      workingRange.insertNode(highlight);

      // Remove after flash duration
      setTimeout(() => {
        const parent = highlight.parentNode;
        if (parent) {
          while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
          }
          parent.removeChild(highlight);
        }
      }, ANCHOR_CONFIG.FLASH_DURATION);
    } catch (error) {
      // If even extractContents fails, fallback to element flash
      console.log('Could not flash range, falling back to element flash:', error);
      const element = range.startContainer.parentElement;
      if (element) {
        this.flashElement(element);
      }
    }
  }

  /**
   * Flash highlight an element
   */
  flashElement(element) {
    if (!element) return;

    element.classList.add('threadcub-anchor-flash');
    setTimeout(() => {
      element.classList.remove('threadcub-anchor-flash');
    }, ANCHOR_CONFIG.FLASH_DURATION);
  }

  /**
   * Show a hint that the match is approximate
   */
  showApproximateHint() {
    const hint = document.createElement('div');
    hint.className = 'threadcub-approximate-hint';
    hint.textContent = 'Approximate match - original text may have changed';

    document.body.appendChild(hint);

    setTimeout(() => {
      hint.classList.add('threadcub-hint-fade');
      setTimeout(() => hint.remove(), 500);
    }, 3000);
  }

  /**
   * Normalize whitespace in text
   */
  normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Get text before a specific node within parent
   */
  getTextBeforeNode(parent, targetNode) {
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
    let text = '';
    let node;

    while ((node = walker.nextNode())) {
      if (node === targetNode) break;
      text += node.textContent;
    }

    return text;
  }

  /**
   * Find generic container for non-supported platforms
   */
  findGenericContainer(node) {
    let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    let depth = 0;

    while (current && current !== document.body && depth < 10) {
      // Look for common message container patterns
      const classes = current.className || '';
      const id = current.id || '';

      if (classes.includes('message') || classes.includes('content') ||
          id.includes('message') || current.tagName === 'ARTICLE') {
        return current;
      }

      current = current.parentElement;
      depth++;
    }

    return node.parentElement;
  }

  /**
   * Generate a generic CSS selector
   */
  generateGenericSelector(element) {
    if (!element) return '';

    if (element.id) {
      return `#${element.id}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 4) {
      let selector = current.tagName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ')
          .filter(c => c && c.length < 30 && !c.includes(':'))
          .slice(0, 2);
        if (classes.length) {
          selector += '.' + classes.join('.');
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}

// Create global instance
const anchorSystem = new AnchorSystem();

// Export to global scope
window.AnchorSystem = AnchorSystem;
window.anchorSystem = anchorSystem;
window.ANCHOR_CONFIG = ANCHOR_CONFIG;

console.log('Anchor system loaded');