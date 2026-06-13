console.log('🔄 LOADING: platform-adapters.js - START');

/**
 * Platform Adapters Module
 *
 * Provides platform-specific DOM selectors and utilities for anchor creation
 * and jump-to functionality. Each adapter implements a common interface.
 *
 * Interface:
 * - matchesUrl(url): boolean - Check if this adapter handles the given URL
 * - getMessageElements(): NodeList - Get all message container elements
 * - getMessageText(element): string - Extract text content from a message element
 * - getStableMessageSelector(element): string - Generate a stable CSS selector for an element
 * - getMessageIndex(element): number - Get the index of a message in the conversation
 */

// ============================================================================
// DOM Selector Constants - Centralized for easy updates
// ============================================================================

const CHATGPT_SELECTORS = {
  // Message containers
  messageContainers: [
    '[data-message-author-role]',                    // Primary message container
    'div[data-testid^="conversation-turn-"]',        // Turn-based messages
    '.agent-turn',                                   // Agent responses
    '.user-turn'                                     // User messages
  ],
  // Conversation wrapper
  conversationWrapper: [
    'main [class*="react-scroll-to-bottom"]',
    'main div[class*="overflow-y-auto"]',
    '[data-testid="conversation-panel"]'
  ],
  // Message content selectors
  messageContent: [
    '.markdown',
    '[data-message-content]',
    '.prose'
  ]
};

const CLAUDE_SELECTORS = {
  messageContainers: [
    '.font-claude-response',              // Claude's actual response class (NEW!)
    '[class*="standard-markdown"]',       // Markdown container (NEW!)
    '[data-testid*="message"]',
    'div[class*="Message"]',
    '.font-claude-message',
    '[class*="prose"]'
  ],
  conversationWrapper: [
    'main',
    '[class*="conversation"]',
    '[data-testid="conversation"]'
  ],
  messageContent: [
    '.prose',
    '[class*="markdown"]',
    'p'
  ]
};

const PERPLEXITY_SELECTORS = {
  messageContainers: [
    '[class*="prose"]',
    '[class*="answer"]',
    '[class*="response"]'
  ],
  conversationWrapper: [
    'main',
    '[class*="thread"]'
  ],
  messageContent: [
    '.prose',
    'p'
  ]
};

const GEMINI_SELECTORS = {
  messageContainers: [
    'message-content',
    '[class*="model-response"]',
    '[class*="user-query"]'
  ],
  conversationWrapper: [
    'main',
    '[class*="conversation"]'
  ],
  messageContent: [
    'p',
    '.markdown-content'
  ]
};

const GROK_SELECTORS = {
  // Grok.com selectors
  messageContainers: [
    'div.message-bubble',                        // Primary message bubble (grok.com)
    'div[class*="message-bubble"]',              // Variations with modifiers (grok.com)
    'div.relative.flex > div.w-full',            // Message structure (grok.com)
    '[data-testid*="message"]',                  // Testid-based
    'div[class*="prose"]',                       // Markdown content
    'article',                                   // Semantic message container
    'div[role="article"]'                        // ARIA role
  ],
  // X.com Grok selectors (Twitter/X DOM structure)
  xcomMessageContainers: [
    'div[data-testid="cellInnerDiv"]',           // X.com message cells
    'article[role="article"]',                   // X.com article wrapper
    'div[data-testid^="conversation-"]',         // X.com conversation elements
    '[class*="css-"][class*="r-"]'               // X.com CSS-in-JS pattern (last resort)
  ],
  conversationWrapper: [
    'main',
    'div[class*="chat"]',
    'div[class*="conversation"]',
    'div[class*="thread"]',
    '[role="log"]',
    'div[class*="scroll"]',
    '[data-testid="primaryColumn"]'              // X.com main column
  ],
  messageContent: [
    '.prose',
    'div[class*="markdown"]',
    'div[class*="prose"]',
    'div[data-testid="tweetText"]',              // X.com tweet text
    'span[class*="css-"]',                       // X.com text spans
    'p'
  ],
  // Elements to EXCLUDE from search
  excludeSelectors: [
    '#threadcub-side-panel',
    '.threadcub-floating-button',
    '[class*="threadcub"]',
    '.anchor-item',
    '.tag-item',
    '[data-testid="sidebarColumn"]',             // X.com sidebar
    '[data-testid="navigationBar"]',             // X.com navigation
    'header',                                    // Page headers
    'nav'                                        // Navigation elements
  ]
};

const DEEPSEEK_SELECTORS = {
  messageContainers: [
    '[class*="ChatMessage"]',
    '[class*="ds-message"]',
    'div[class*="message-content"]',
    '[data-role="user"]',
    '[data-role="assistant"]'
  ],
  conversationWrapper: [
    'main',
    '[class*="chat-container"]',
    '[class*="conversation"]'
  ],
  messageContent: [
    '.markdown',
    '[class*="prose"]',
    'p'
  ]
};

console.log('✓ CHECKPOINT 1: All selector constants defined');

// ============================================================================
// Base Adapter Class
// ============================================================================

class BasePlatformAdapter {
  constructor(name, selectors) {
    this.name = name;
    this.selectors = selectors;
  }

  /**
   * Check if this adapter handles the given URL
   * @param {string} url - The URL to check
   * @returns {boolean}
   */
  matchesUrl(url) {
    throw new Error('matchesUrl must be implemented by subclass');
  }

  /**
   * Get all message container elements in the conversation
   * @returns {Element[]}
   */
  getMessageElements() {
    const elements = [];
    for (const selector of this.selectors.messageContainers) {
      try {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          elements.push(...found);
          break; // Use first working selector
        }
      } catch (e) {
        console.log(`Selector ${selector} failed:`, e);
      }
    }
    return elements;
  }

  /**
   * Get the conversation wrapper element
   * @returns {Element|null}
   */
  getConversationWrapper() {
    for (const selector of this.selectors.conversationWrapper) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    return document.body;
  }

  /**
   * Extract text content from a message element
   * @param {Element} element - The message container element
   * @returns {string}
   */
  getMessageText(element) {
    if (!element) return '';

    // Try to get content from content-specific selectors first
    for (const selector of this.selectors.messageContent) {
      try {
        const contentEl = element.querySelector(selector);
        if (contentEl) {
          return this.normalizeWhitespace(contentEl.textContent || '');
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback to full element text
    return this.normalizeWhitespace(element.textContent || '');
  }

  /**
   * Generate a stable CSS selector for an element
   * @param {Element} element - The element to generate a selector for
   * @returns {string}
   */
  getStableMessageSelector(element) {
    if (!element) return '';

    // Try data attributes first (most stable)
    if (element.dataset.messageAuthorRole) {
      const role = element.dataset.messageAuthorRole;
      const index = this.getMessageIndex(element);
      return `[data-message-author-role="${role}"]:nth-of-type(${index + 1})`;
    }

    if (element.dataset.testid) {
      return `[data-testid="${element.dataset.testid}"]`;
    }

    // Try ID
    if (element.id) {
      return `#${element.id}`;
    }

    // Generate path-based selector
    return this.generatePathSelector(element);
  }

  /**
   * Get the index of a message in the conversation
   * @param {Element} element - The message element
   * @returns {number}
   */
  getMessageIndex(element) {
    const messages = this.getMessageElements();
    return Array.from(messages).indexOf(element);
  }

  /**
   * Find the message container for a given text node or element
   * @param {Node} node - The node to find the container for
   * @returns {Element|null}
   */
  findMessageContainer(node) {
    let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    while (current && current !== document.body) {
      // Check if current matches any message selector
      for (const selector of this.selectors.messageContainers) {
        try {
          if (current.matches && current.matches(selector)) {
            return current;
          }
        } catch (e) {
          continue;
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Generate a path-based CSS selector
   * @param {Element} element
   * @returns {string}
   */
  generatePathSelector(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c =>
          c && !c.includes('hover') && !c.includes('active') && c.length < 30
        );
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }

      // Add nth-child for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(el =>
          el.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Normalize whitespace in text
   * @param {string} text
   * @returns {string}
   */
  normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
  }
}

// ============================================================================
// ChatGPT Adapter
// ============================================================================

class ChatGPTAdapter extends BasePlatformAdapter {
  constructor() {
    super('ChatGPT', CHATGPT_SELECTORS);
  }

  matchesUrl(url) {
    return url.includes('chat.openai.com') || url.includes('chatgpt.com');
  }

  getMessageElements() {
    // ChatGPT has a specific structure with data-message-author-role
    let elements = document.querySelectorAll('[data-message-author-role]');
    if (elements.length > 0) return Array.from(elements);

    // Fallback to turn-based structure
    elements = document.querySelectorAll('div[data-testid^="conversation-turn-"]');
    if (elements.length > 0) return Array.from(elements);

    // Generic fallback
    return super.getMessageElements();
  }

  getStableMessageSelector(element) {
    // ChatGPT specific: use data-message-id if available
    if (element.dataset.messageId) {
      return `[data-message-id="${element.dataset.messageId}"]`;
    }

    // Use conversation turn testid
    if (element.dataset.testid && element.dataset.testid.startsWith('conversation-turn-')) {
      return `[data-testid="${element.dataset.testid}"]`;
    }

    return super.getStableMessageSelector(element);
  }
}

// ============================================================================
// Claude Adapter
// ============================================================================

class ClaudeAdapter extends BasePlatformAdapter {
  constructor() {
    super('Claude', CLAUDE_SELECTORS);
  }

  matchesUrl(url) {
    return url.includes('claude.ai');
  }
}

// ============================================================================
// Perplexity Adapter
// ============================================================================

class PerplexityAdapter extends BasePlatformAdapter {
  constructor() {
    super('Perplexity', PERPLEXITY_SELECTORS);
  }

  matchesUrl(url) {
    return url.includes('perplexity.ai');
  }
}

// ============================================================================
// Gemini Adapter
// ============================================================================

class GeminiAdapter extends BasePlatformAdapter {
  constructor() {
    super('Gemini', GEMINI_SELECTORS);
  }

  matchesUrl(url) {
    return url.includes('gemini.google.com');
  }
}

// ============================================================================
// Grok Adapter
// ============================================================================

class GrokAdapter extends BasePlatformAdapter {
  constructor() {
    super('Grok', GROK_SELECTORS);
  }

  matchesUrl(url) {
    return url.includes('grok.x.ai') || url.includes('grok.com') ||
           (url.includes('x.com') && url.includes('/i/grok'));
  }

  /**
   * Check if we're on X.com or Grok.com
   * @returns {boolean} true if on x.com
   */
  isXcomGrok() {
    return window.location.hostname.includes('x.com');
  }

  /**
   * Extract conversation ID from Grok URL
   * Patterns:
   * - https://x.com/i/grok?conversation={ID} (query parameter)
   * - https://x.com/i/grok/{conversation-id} (path - future?)
   * - https://grok.com/ (no ID - use fallback)
   * @param {string} url - The URL to extract from
   * @returns {string|null} - The conversation ID or null
   */
  getConversationId(url = window.location.href) {
  // X.com Grok pattern: query parameter
  if (url.includes('x.com')) {
    // First try query parameter (current X.com format)
    const urlObj = new URL(url);
    const conversationParam = urlObj.searchParams.get('conversation');
    if (conversationParam) {
      return conversationParam;
    }
    
    // Fallback: path-based (in case they change URL structure)
    const xPattern = /\/i\/grok\/([a-zA-Z0-9_-]+)/;
    const match = url.match(xPattern);
    return match ? match[1] : null;
  }
  
  // grok.com pattern: /c/{conversation-id}
  const grokPattern = /\/c\/([a-zA-Z0-9_-]+)/;
  const match = url.match(grokPattern);
  return match ? match[1] : null;
}

  /**
   * Check if two URLs are the same conversation
   * @param {string} url1 
   * @param {string} url2 
   * @returns {boolean}
   */
  isSameConversation(url1, url2) {
    const id1 = this.getConversationId(url1);
    const id2 = this.getConversationId(url2);
    
    // If both have IDs, compare them
    if (id1 && id2) {
      return id1 === id2;
    }
    
    // Otherwise use URL comparison
    return url1 === url2;
  }

  /**
   * Get the conversation wrapper - Grok uses a specific scrollable container
   * @returns {Element|null}
   */
  getConversationWrapper() {
    // X.com uses primaryColumn
    if (this.isXcomGrok()) {
      const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
      if (primaryColumn) return primaryColumn;
      
      // Fallback: find scrollable main area
      const scrollable = document.querySelector('main [style*="overflow"]');
      if (scrollable) return scrollable;
    }
    
    // Grok.com: try to find Grok's main scrollable container
    const scrollableMain = document.querySelector('main div[class*="overflow-y-auto"]');
    if (scrollableMain) return scrollableMain;

    const scrollable = document.querySelector('main div[class*="scroll"]');
    if (scrollable) return scrollable;

    // Fallback to main or body
    return document.querySelector('main') || document.body;
  }

  /**
   * Check if element should be excluded from search
   * @param {Element} element
   * @returns {boolean}
   */
  shouldExcludeElement(element) {
    if (!element) return true;
    
    // Check if element or any parent matches exclude selectors
    let current = element;
    let depth = 0;
    while (current && current !== document.body && depth < 10) {
      // Check against exclude selectors
      for (const selector of this.selectors.excludeSelectors || []) {
        try {
          if (current.matches && current.matches(selector)) {
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Check for threadcub classes
      if (current.id && current.id.includes('threadcub')) return true;
      if (current.className && typeof current.className === 'string') {
        if (current.className.includes('threadcub')) return true;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return false;
  }

  /**
   * Check if element is a valid message container
   * More sophisticated filtering for X.com
   * @param {Element} element
   * @returns {boolean}
   */
  isValidMessageContainer(element) {
    if (!element) return false;
    if (this.shouldExcludeElement(element)) return false;
    
    // Must have some text content
    const text = element.textContent?.trim() || '';
    if (text.length < 10) return false; // Too short to be a real message
    
    // X.com specific: must be in main content area
    if (this.isXcomGrok()) {
      const inSidebar = element.closest('[data-testid="sidebarColumn"]');
      const inNav = element.closest('nav');
      const inHeader = element.closest('header');
      if (inSidebar || inNav || inHeader) return false;
    }
    
    return true;
  }

  /**
   * Get message elements - handles both grok.com and x.com
   * Excludes ThreadCub UI elements
   * @returns {Element[]}
   */
  getMessageElements() {
    let elements = [];
    
    // Strategy depends on which site we're on
    if (this.isXcomGrok()) {
      console.log('Using X.com Grok selectors');
      
      // Try X.com specific selectors first
      const xcomSelectors = this.selectors.xcomMessageContainers || [];
      for (const selector of xcomSelectors) {
        try {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            console.log(`X.com selector '${selector}' found ${found.length} elements`);
            elements = Array.from(found);
            break;
          }
        } catch (e) {
          console.log(`X.com selector '${selector}' failed:`, e);
        }
      }
      
      // If no X.com selectors worked, try to find messages by content structure
      if (elements.length === 0) {
        console.log('X.com selectors failed, using content-based search');
        // Find all divs with substantial text content in main area
        const main = document.querySelector('main') || document.body;
        const allDivs = main.querySelectorAll('div');
        elements = Array.from(allDivs).filter(div => {
          const text = div.textContent?.trim() || '';
          // Look for divs with 50+ chars of text
          return text.length > 50 && 
                 !this.shouldExcludeElement(div) &&
                 // Not too large (probably a container)
                 text.length < 10000;
        });
        console.log(`Content-based search found ${elements.length} candidate elements`);
      }
      
    } else {
      console.log('Using Grok.com selectors');
      
      // Grok.com: try message-bubble class (most specific)
      elements = document.querySelectorAll('div.message-bubble');
      if (elements.length > 0) {
        elements = Array.from(elements);
      } else {
        // Try class*="message-bubble"
        elements = document.querySelectorAll('div[class*="message-bubble"]');
        if (elements.length > 0) {
          elements = Array.from(elements);
        } else {
          // Fallback to base implementation
          elements = super.getMessageElements();
        }
      }
    }
    
    // Filter with validation
    const filtered = elements.filter(el => this.isValidMessageContainer(el));
    console.log(`Filtered from ${elements.length} to ${filtered.length} valid messages`);
    
    return filtered;
  }
}

// ============================================================================
// DeepSeek Adapter
// ============================================================================

class DeepSeekAdapter extends BasePlatformAdapter {
  constructor() {
    super('DeepSeek', DEEPSEEK_SELECTORS);
  }

  matchesUrl(url) {
    return url.includes('chat.deepseek.com') || url.includes('deepseek.com/chat');
  }

  /**
   * Extract conversation ID from DeepSeek URL
   * Pattern: https://chat.deepseek.com/a/chat/s/{UUID}
   * @param {string} url - The URL to extract from
   * @returns {string|null} - The conversation UUID or null
   */
  getConversationId(url = window.location.href) {
    // DeepSeek URL pattern: /chat/s/{UUID}
    const pattern = /\/chat\/s\/([a-f0-9-]{36})/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Check if two URLs are the same conversation
   * @param {string} url1 
   * @param {string} url2 
   * @returns {boolean}
   */
  isSameConversation(url1, url2) {
    const id1 = this.getConversationId(url1);
    const id2 = this.getConversationId(url2);
    return id1 && id2 && id1 === id2;
  }
}

console.log('✓ CHECKPOINT 2: All adapter classes defined');

// ============================================================================
// Platform Adapter Manager
// ============================================================================

const PlatformAdapters = {
  adapters: [
    new ChatGPTAdapter(),
    new ClaudeAdapter(),
    new PerplexityAdapter(),
    new GeminiAdapter(),
    new GrokAdapter(),
    new DeepSeekAdapter()
  ],

  /**
   * Get the appropriate adapter for the current URL
   * @param {string} url - Optional URL, defaults to current location
   * @returns {BasePlatformAdapter|null}
   */
  getAdapter(url = window.location.href) {
    for (const adapter of this.adapters) {
      if (adapter.matchesUrl(url)) {
        return adapter;
      }
    }
    return null;
  },

  /**
   * Get adapter by platform name
   * @param {string} platform - Platform name (chatgpt, claude, etc.)
   * @returns {BasePlatformAdapter|null}
   */
  getAdapterByName(platform) {
    const name = platform.toLowerCase();
    return this.adapters.find(a => a.name.toLowerCase() === name) || null;
  },

  /**
   * Check if current URL is a supported platform
   * @returns {boolean}
   */
  isSupported() {
    return this.getAdapter() !== null;
  }
};

console.log('✓ CHECKPOINT 3: PlatformAdapters object created');

// Export to global scope
window.PlatformAdapters = PlatformAdapters;
window.CHATGPT_SELECTORS = CHATGPT_SELECTORS;
window.CLAUDE_SELECTORS = CLAUDE_SELECTORS;
window.DEEPSEEK_SELECTORS = DEEPSEEK_SELECTORS;

console.log('✅ SUCCESS: Platform adapters loaded! Current adapter:', PlatformAdapters.getAdapter()?.name || 'none');