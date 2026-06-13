// =============================================================================
// ThreadCub Conversation Extractor
// Handles extraction of conversation data from various AI platforms
// =============================================================================

const ConversationExtractor = {

  // =============================================================================
  // MAIN WRAPPER METHOD
  // Routes to platform-specific extraction based on current URL
  // =============================================================================

  async extractConversation() {
    console.log('🐻 ThreadCub: Extracting conversation data...');

    let conversationData;
    const hostname = window.location.hostname;

    if (hostname.includes('claude.ai')) {
      conversationData = await this.extractClaudeConversation();
    } else if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      conversationData = this.extractChatGPTConversation();
    } else if (hostname.includes('gemini.google.com')) {
      conversationData = this.extractGeminiConversation();
    } else if (hostname.includes('grok.x.ai') || hostname.includes('grok.com') || (hostname.includes('x.com') && window.location.pathname.includes('/i/grok'))) {
      conversationData = this.extractGrokConversation();
    } else if (hostname.includes('chat.deepseek.com')) {
      conversationData = this.extractDeepSeekConversation();
    } else if (hostname.includes('perplexity.ai')) {
      conversationData = this.extractPerplexityConversation();
    } else if (hostname.includes('copilot.microsoft.com')) {
      conversationData = this.extractCopilotConversation();
    } else {
      conversationData = this.extractGenericConversation();
    }

    return conversationData;
  },

  // =============================================================================
  // CLAUDE EXTRACTION
  // =============================================================================

  async extractClaudeConversation() {
    console.log('🐻 ThreadCub: Extracting Claude.ai conversation...');

    const title = this.extractClaudeTitle();
    const messages = [];
    let messageIndex = 0;

    // User turns:      mb-1 mt-6 group
    // Role is determined by the turn container class, not child elements.
    const turns = document.querySelectorAll(
      '[class*="mb-1"][class*="mt-6"][class*="group"], [class*="group relative"][class*="pb-3"]'
    );
    console.log(`🐻 ThreadCub: Found ${turns.length} Claude turns`);

    turns.forEach((turn, index) => {
      try {
        const children = Array.from(turn.children);

        // Role is determined by the turn container class itself:
        // mb-1 mt-6 in the class = user turn; pb-3 = assistant turn
        const turnClass = typeof turn.className === 'string' ? turn.className : '';
        const isUser = turnClass.includes('mt-6');
        const role = isUser ? 'user' : 'assistant';

        // Collect text from substantive children — skip empty strings and timestamps like "09:20"
        // For assistant turns: Claude's tool-use/thinking summaries live in row-start-1 inside
        // a grid grid-rows-[auto_auto] wrapper. The actual response text is in row-start-2.
        // We extract row-start-2 if present, otherwise fall back to the full child text.
        const parts = children
          .map(child => {
            if (!isUser) {
              // Look for the row-start-2 element (actual response content)
              const responseRow = child.querySelector('[class*="row-start-2"]');
              if (responseRow) return responseRow.innerText?.trim() || '';
            }
            return child.innerText?.trim() || '';
          })
          .filter(text => text.length > 10);

        const text = parts.join('\n\n').trim();

        if (text.length > 0) {
          messages.push({
            id: messageIndex++,
            role: role,
            content: text,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log(`🐻 ThreadCub: Error extracting Claude turn ${index}:`, error);
      }
    });

    console.log(`🐻 ThreadCub: ✅ Claude extraction complete: ${messages.length} messages`);
    if (messages.length === 0 && window.AnalyticsService) {
      window.AnalyticsService.trackError('extraction_failure', 'claude.ai');
    }

    const result = {
      title: title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      source_created_at: this.extractClaudeConversationDate(),
      platform: 'claude.ai',
      total_messages: messages.length,
      messages: messages
    };
    if (messages.length > 0 && window.AnalyticsService) {
      window.AnalyticsService.trackConversationExtracted(result);
    }
    return result;
  },

  extractClaudeTitle() {
    console.log('🐻 ThreadCub: Extracting Claude conversation title...');

    // Method 1: Extract from document.title (format: "Title - Claude" or "Title | Claude")
    const pageTitle = document.title
      .replace(/\s*[-–|]\s*Claude\s*$/i, '')
      .trim();

    if (pageTitle && pageTitle.toLowerCase() !== 'claude' && pageTitle.length > 0) {
      console.log('🐻 ThreadCub: Title from document.title:', pageTitle);
      return pageTitle;
    }

    // Method 2: Try sidebar - find the link matching current conversation URL
    const chatPath = window.location.pathname;
    if (chatPath.includes('/chat/')) {
      // Try exact path match in sidebar
      const sidebarLink = document.querySelector(`nav a[href="${chatPath}"], a[href="${chatPath}"]`);
      if (sidebarLink) {
        const linkText = sidebarLink.textContent?.trim();
        if (linkText && linkText.length > 0) {
          console.log('🐻 ThreadCub: Title from sidebar link:', linkText);
          return linkText;
        }
      }

      // Try matching by chat ID in any sidebar link
      const chatId = chatPath.split('/chat/')[1]?.split('/')[0]?.split('?')[0];
      if (chatId) {
        const matchingLink = document.querySelector(`a[href*="${chatId}"]`);
        if (matchingLink) {
          const linkText = matchingLink.textContent?.trim();
          if (linkText && linkText.length > 0) {
            console.log('🐻 ThreadCub: Title from chat ID match:', linkText);
            return linkText;
          }
        }
      }
    }

    // Method 3: Fallback
    console.log('🐻 ThreadCub: Using fallback title');
    return 'Untitled Conversation';
  },

  extractClaudeConversationDate() {
    try {
      const chatPath = window.location.pathname;
      if (!chatPath.includes('/chat/')) return null;

      const chatId = chatPath.split('/chat/')[1]?.split('/')[0]?.split('?')[0];
      console.log('🐻 ThreadCub: Date extraction — chatPath:', chatPath, 'chatId:', chatId);

      const nav = document.querySelector('nav') || document.body;

      // Claude removes the href from the active conversation item (you're already on it),
      // so we can't find it by URL. Try multiple strategies in order.
      let sidebarLink =
        // 1. Any element with the chat ID in an attribute (works when not active)
        (chatId ? nav.querySelector(`[href*="${chatId}"]`) : null) ||
        (chatId ? nav.querySelector(`[data-id*="${chatId}"]`) : null) ||
        // 2. aria-current / aria-selected
        nav.querySelector('[aria-current="page"]') ||
        nav.querySelector('[aria-selected="true"]');

      // 3. Title-text match — find nav leaf whose text matches the page title
      //    (most reliable: active item will always show the conversation title)
      if (!sidebarLink) {
        const pageTitle = document.title.replace(/\s*[-–|]\s*Claude\s*$/i, '').trim();
        if (pageTitle && pageTitle.toLowerCase() !== 'claude' && pageTitle.toLowerCase() !== 'new conversation') {
          const titleLower = pageTitle.toLowerCase();
          for (const el of nav.querySelectorAll('*')) {
            if (el.children.length > 0) continue;
            const t = (el.innerText || el.textContent || '').trim();
            if (t.length < 3 || t.length > 120) continue;
            const tLower = t.toLowerCase();
            const checkLen = Math.min(tLower.length, 30);
            if (titleLower.startsWith(tLower.substring(0, checkLen)) || tLower === titleLower) {
              sidebarLink = el;
              break;
            }
          }
        }
      }

      // 4. role="button" in nav, but skip heading elements (those are section collapse toggles)
      if (!sidebarLink) {
        const headingTags = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
        const roleButtons = Array.from(nav.querySelectorAll('[role="button"]'));
        sidebarLink = roleButtons.find(el => !headingTags.has(el.tagName)) || null;
      }

      // 5. Class-based fallback
      if (!sidebarLink) {
        sidebarLink = nav.querySelector('[class*="selected"]') || nav.querySelector('[class*="active"]');
      }

      if (!sidebarLink) {
        console.log('🐻 ThreadCub: No sidebar element found for date extraction');
        return null;
      }
      console.log('🐻 ThreadCub: Found sidebar element:', sidebarLink.tagName, sidebarLink.getAttribute('role'), sidebarLink.innerText?.substring(0, 40));

      // Walk every element in the nav, find ones that look like date headings
      // and come BEFORE our link in document order — take the last (closest) one
      let lastHeadingText = null;
      const allNavEls = nav.querySelectorAll('*');

      for (const el of allNavEls) {
        // Only look at elements with no child elements (leaf nodes)
        if (el.children.length !== 0) continue;

        const raw = (el.innerText || el.textContent || '').trim();
        // Date headings are short — skip anything too long or too short
        if (!raw || raw.length < 2 || raw.length > 40) continue;

        if (!this._isClaudeDateHeading(raw)) continue;

        // Check this heading comes BEFORE the sidebar link in document order
        const pos = el.compareDocumentPosition(sidebarLink);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
          lastHeadingText = raw;
        }
      }

      if (!lastHeadingText) {
        console.log('🐻 ThreadCub: No date heading found before sidebar link');
        return null;
      }

      const parsed = this._parseClaudeDateHeading(lastHeadingText);
      if (parsed) {
        console.log('🐻 ThreadCub: Claude conversation date from heading "' + lastHeadingText + '":', parsed);
      }
      return parsed;
    } catch (e) {
      console.log('🐻 ThreadCub: Could not extract Claude conversation date:', e);
      return null;
    }
  },

  _isClaudeDateHeading(text) {
    const t = text.trim().toLowerCase();
    if (['today', 'yesterday', 'previous 7 days', 'last 7 days', 'previous 30 days', 'last 30 days', 'last week', 'this month'].includes(t)) return true;
    if (/^(january|february|march|april|may|june|july|august|september|october|november|december)(\s+\d{4})?$/i.test(t)) return true;
    if (/^\d{4}$/.test(t)) return true;
    return false;
  },

  _parseClaudeDateHeading(heading) {
    const now = new Date();
    const t = heading.trim().toLowerCase();

    if (t === 'today') {
      const d = new Date(now); d.setHours(12, 0, 0, 0); return d.toISOString();
    }
    if (t === 'yesterday') {
      const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); return d.toISOString();
    }
    if (['previous 7 days', 'last 7 days', 'last week'].includes(t)) {
      const d = new Date(now); d.setDate(d.getDate() - 4); d.setHours(12, 0, 0, 0); return d.toISOString();
    }
    if (['previous 30 days', 'last 30 days', 'this month'].includes(t)) {
      const d = new Date(now); d.setDate(d.getDate() - 15); d.setHours(12, 0, 0, 0); return d.toISOString();
    }
    const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthYearMatch = t.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?$/);
    if (monthYearMatch) {
      const month = MONTHS.indexOf(monthYearMatch[1]);
      const year = monthYearMatch[2] ? parseInt(monthYearMatch[2]) : now.getFullYear();
      return new Date(year, month, 15, 12, 0, 0).toISOString();
    }
    const yearMatch = t.match(/^(\d{4})$/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1]), 5, 15, 12, 0, 0).toISOString();
    }
    return null;
  },

  simpleCleanContent(text) {
    return text
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(Copy|Copy code|Share|Regenerate)$/gm, '')
      .trim();
  },

  // =============================================================================
  // CHATGPT EXTRACTION
  // =============================================================================

  extractChatGPTConversation() {
    console.log('🤖 ThreadCub: Extracting ChatGPT conversation...');

    const messages = [];
    let messageIndex = 0;

    // Primary strategy: use data-message-author-role attribute (most reliable)
    const roleElements = document.querySelectorAll('[data-message-author-role]');
    console.log(`🤖 ThreadCub: Found ${roleElements.length} elements with data-message-author-role`);

    if (roleElements.length > 0) {
      roleElements.forEach((element, index) => {
        try {
          const text = element.innerText?.trim();
          if (text && text.length > 10) {
            const role = element.getAttribute('data-message-author-role');
            messages.push({
              id: messageIndex++,
              role: (role === 'assistant') ? 'assistant' : 'user',
              content: text,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.log(`🤖 ThreadCub: Error extracting message ${index}:`, error);
        }
      });
    } else {
      // Fallback: use conversation-turn elements and look for role attribute inside
      const turnElements = document.querySelectorAll('[data-testid^="conversation-turn"]');
      console.log(`🤖 ThreadCub: Falling back to conversation-turn elements: ${turnElements.length}`);

      turnElements.forEach((turnElement, index) => {
        try {
          const text = turnElement.innerText?.trim();
          if (text && text.length > 10) {
            // Look for data-message-author-role on a child element
            const roleEl = turnElement.querySelector('[data-message-author-role]');
            const role = roleEl ? roleEl.getAttribute('data-message-author-role') : null;

            messages.push({
              id: messageIndex++,
              role: (role === 'assistant') ? 'assistant' : (role === 'user') ? 'user' : (index % 2 === 0 ? 'user' : 'assistant'),
              content: text,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.log(`🤖 ThreadCub: Error extracting turn ${index}:`, error);
        }
      });
    }

    const conversationData = {
      title: document.title.replace(' - ChatGPT', '') || 'ChatGPT Conversation',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'ChatGPT',
      total_messages: messages.length,
      messages: messages
    };

    console.log(`🤖 ThreadCub: ✅ ChatGPT extraction complete: ${messages.length} messages`);
    if (messages.length === 0 && window.AnalyticsService) {
      window.AnalyticsService.trackError('extraction_failure', 'chatgpt');
    }
    if (messages.length > 0 && window.AnalyticsService) {
      window.AnalyticsService.trackConversationExtracted(conversationData);
    }
    return conversationData;
  },

  // =============================================================================
  // GEMINI EXTRACTION
  // =============================================================================

  extractGeminiConversation() {
    console.log('🟣 ThreadCub: Extracting Gemini conversation...');

    const messages = [];
    let messageIndex = 0;

    const messageElements = document.querySelectorAll('.conversation-container message-content, [data-test-id*="message"], .model-response-text, .user-query');

    console.log(`🟣 ThreadCub: Found ${messageElements.length} potential Gemini message elements`);

    messageElements.forEach((element, index) => {
      try {
        const text = element.innerText?.trim();
        if (text && text.length > 10) {
          const isUser = element.classList.contains('user-query') ||
                        element.querySelector('.user-query') !== null;

          const role = isUser ? 'user' : 'assistant';

          messages.push({
            id: messageIndex++,
            role: role,
            content: text,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log(`🟣 ThreadCub: Error extracting Gemini message ${index}:`, error);
      }
    });

    const conversationData = {
      title: document.title || 'Gemini Conversation',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'Gemini',
      total_messages: messages.length,
      messages: messages
    };

    console.log(`🟣 ThreadCub: ✅ Gemini extraction complete: ${messages.length} messages`);
    if (messages.length === 0 && window.AnalyticsService) {
      window.AnalyticsService.trackError('extraction_failure', 'gemini');
    }
    if (messages.length > 0 && window.AnalyticsService) {
      window.AnalyticsService.trackConversationExtracted(conversationData);
    }
    return conversationData;
  },

  // =============================================================================
  // COPILOT EXTRACTION
  // =============================================================================

  extractCopilotConversation() {
  console.log('🔵 ThreadCub: Extracting Copilot conversation...');

  const messages = [];
  let messageIndex = 0;

  // Select all user and assistant turns in DOM order
  const allTurns = document.querySelectorAll('[class*="group/user-message"], [class*="group/ai-message"]');

  console.log(`🔵 ThreadCub: Found ${allTurns.length} Copilot turns`);

  allTurns.forEach((element, index) => {
    try {
      const isUser = element.className.includes('group/user-message');
      const role = isUser ? 'user' : 'assistant';

      const text = element.innerText?.trim()
        .replace(/^You said\s*/i, '')
        .replace(/^Copilot said\s*/i, '')
        .trim();

      if (text && text.length > 2) {
        messages.push({
          id: messageIndex++,
          role: role,
          content: text,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log(`🔵 ThreadCub: Error extracting Copilot turn ${index}:`, error);
    }
  });

  // Remove consecutive duplicate messages caused by nested element matching
  const deduped = messages.filter((msg, i) => {
    if (i === 0) return true;
    return msg.content !== messages[i - 1].content;
  });

  // Re-index after deduplication
  deduped.forEach((msg, i) => { msg.id = i; });

  // Title from first user message
  const firstUserMsg = deduped.find(m => m.role === 'user')?.content;
  const title = firstUserMsg && firstUserMsg.length > 3
    ? (firstUserMsg.length > 80 ? firstUserMsg.substring(0, 77) + '...' : firstUserMsg)
    : (document.title || 'Copilot Conversation');

  const conversationData = {
    title: title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    platform: 'copilot',
    total_messages: deduped.length,
    messages: deduped
  };

  console.log(`🔵 ThreadCub: ✅ Copilot extraction complete: ${deduped.length} messages`);
  if (deduped.length === 0 && window.AnalyticsService) {
    window.AnalyticsService.trackError('extraction_failure', 'copilot');
  }
  if (deduped.length > 0 && window.AnalyticsService) {
    window.AnalyticsService.trackConversationExtracted(conversationData);
  }
  return conversationData;
},

  // =============================================================================
  // GROK EXTRACTION
  // Uses aria-label="Grok" to identify assistant messages
  // =============================================================================

  extractGrokConversation() {
  console.log('🤖 ThreadCub: Starting Grok extraction (aria-label based)...');

  const hostname = window.location.hostname;
  let platform = 'x';
  if (hostname.includes('grok.com') || hostname.includes('grok.x.ai')) {
    platform = 'Grok';
  }
  console.log(`🤖 ThreadCub: Grok platform resolved as: ${platform} (hostname: ${hostname})`);

  try {
    const extractedMessages = this.grokAriaLabelExtraction();

    // Extract title, passing messages so x.com can use first user message
    const title = this.extractGrokTitle(extractedMessages);

    const grokResult = {
      title: title,
      url: window.location.href,
      platform: platform,
      messages: extractedMessages,
      total_messages: extractedMessages.length,
      extraction_method: 'grok_aria_label_extraction'
    };

    console.log(`🤖 ThreadCub: ✅ Grok extraction complete: ${extractedMessages.length} messages`);
    if (extractedMessages.length === 0 && window.AnalyticsService) {
      window.AnalyticsService.trackError('extraction_failure', 'grok');
    }
    if (extractedMessages.length > 0 && window.AnalyticsService) {
      window.AnalyticsService.trackConversationExtracted(grokResult);
    }
    return grokResult;

  } catch (error) {
    console.error('🤖 ThreadCub: Grok extraction failed:', error);

    const fallbackMessages = this.grokSpanFallbackExtraction();
    const title = this.extractGrokTitle(fallbackMessages);

    return {
      title: title,
      url: window.location.href,
      platform: platform,
      messages: fallbackMessages,
      total_messages: fallbackMessages?.length || 0,
      extraction_method: 'grok_span_fallback_extraction',
    };
  }
},

  /**
   * Extract conversation title for Grok.
   * Tries multiple DOM strategies since document.title is usually just "Grok" or "Grok / X".
   */
  extractGrokTitle(messages = []) {
  console.log('🤖 ThreadCub: Extracting Grok conversation title...');

  // Strategy 0: Match current URL's conversation ID to a sidebar link
  try {
    const currentUrl = window.location.href;
    let conversationId = null;

    // grok.com: /c/{id}
    const grokMatch = currentUrl.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (grokMatch) conversationId = grokMatch[1];

    // x.com: ?conversation={id}
    if (!conversationId) {
      const urlObj = new URL(currentUrl);
      conversationId = urlObj.searchParams.get('conversation');
    }

    if (conversationId) {
      const matchingLink = document.querySelector(`a[href*="${conversationId}"]`);
      if (matchingLink) {
        const text = matchingLink.textContent?.trim();
        if (text && text.length > 3 && text.length < 200 &&
            !['Grok', 'Grok / X', 'X', 'Home', 'Explore', 'New Chat'].includes(text)) {
          console.log('🤖 ThreadCub: Title from URL-matched sidebar link:', text);
          return text;
        }
      }
    }
  } catch (e) {
    console.log('🤖 ThreadCub: Strategy 0 failed:', e.message);
  }

  // Strategy 1: Look for a conversation title heading in the chat area
  // Skip entirely on x.com - title is not in the DOM when sidebar is closed
  if (!window.location.hostname.includes('x.com')) {
    const headingSelectors = [
      'h1', 'h2',
      '[class*="title"]',
      '[class*="heading"]',
      '[data-testid*="title"]'
    ];

    for (const selector of headingSelectors) {
      try {
        const headings = document.querySelectorAll(selector);
        for (const heading of headings) {
          const text = heading.textContent?.trim();
          if (text && text.length > 3 && text.length < 200 &&
              !['Grok', 'Grok / X', 'X', 'Home', 'Explore', 'Messages', 'Settings'].includes(text) &&
              !heading.closest('nav') && !heading.closest('header') &&
              !heading.closest('[data-testid="sidebarColumn"]') &&
              !heading.closest('#threadcub-side-panel') &&
              !heading.closest('[class*="threadcub"]')) {
            console.log('🤖 ThreadCub: Title from heading element:', text);
            return text;
          }
        }
      } catch (e) {
        // continue to next selector
      }
    }
  }

  // Strategy 2: Look for the active/selected conversation in the sidebar
  // Skip on x.com - sidebar is a closed drawer, links not in DOM
  if (!window.location.hostname.includes('x.com')) {
    const sidebarSelectors = [
      'nav a[aria-current="page"]',
      'nav a[class*="active"]',
      'nav [class*="selected"]',
      'aside a[aria-current="page"]',
      'aside a[class*="active"]',
      '[class*="sidebar"] a[aria-current="page"]',
      '[class*="sidebar"] [class*="active"]'
    ];

    for (const selector of sidebarSelectors) {
      try {
        const active = document.querySelector(selector);
        if (active) {
          const text = active.textContent?.trim();
          if (text && text.length > 3 && text.length < 200 &&
              !['Grok', 'Home', 'Explore'].includes(text)) {
            console.log('🤖 ThreadCub: Title from sidebar active item:', text);
            return text;
          }
        }
      } catch (e) {
        // continue
      }
    }
  }

  // Strategy 3: Try document.title with Grok/X suffixes stripped
  const pageTitle = document.title
    .replace(/\s*[-–|\/]\s*Grok\s*/gi, '')
    .replace(/\s*[-–|\/]\s*X\s*/gi, '')
    .replace(/^Grok\s*[-–|\/]?\s*/i, '')
    .replace(/^X\s*[-–|\/]?\s*/i, '')
    .trim();

  if (pageTitle && pageTitle.length > 3 &&
      !['Grok', 'X', 'Grok / X'].includes(pageTitle)) {
    console.log('🤖 ThreadCub: Title from document.title:', pageTitle);
    return pageTitle;
  }

  // Strategy 4: Use first user message from already-extracted messages array
  try {
    const firstUserMsg = messages.find(m => m.role === 'user')?.content;
    if (firstUserMsg && firstUserMsg.length > 3) {
      const truncated = firstUserMsg.length > 80
        ? firstUserMsg.substring(0, 77) + '...'
        : firstUserMsg;
      console.log('🤖 ThreadCub: Title from first extracted user message:', truncated);
      return truncated;
    }
  } catch (e) {
    console.log('🤖 ThreadCub: Strategy 4 failed:', e.message);
  }

  console.log('🤖 ThreadCub: Using fallback Grok title');
  return 'Grok Conversation';
},

  /**
   * Get the first user message text from the Grok page for title fallback.
   * User bubbles are identified by the bg-surface-l1 class.
   */
  getFirstGrokUserMessage() {
    const allBubbles = Array.from(document.querySelectorAll('[class*="message-bubble"]'));
    const topLevel = allBubbles.filter(el => !el.parentElement?.closest('[class*="message-bubble"]'));
    for (const bubble of topLevel) {
      const cls = typeof bubble.className === 'string' ? bubble.className : '';
      if (cls.includes('bg-surface-l1')) {
        const text = bubble.innerText?.trim() || '';
        if (text.length > 10) return text;
      }
    }
    return null;
  },

  // Grok extraction using message-bubble class to identify and distinguish messages.
  // Role detection: user bubbles have bg-surface-l1 class; assistant bubbles do not.
  // On x.com/i/grok the DOM differs from grok.com — this method tries multiple strategies.
  grokAriaLabelExtraction() {
    const isXCom = window.location.hostname.includes('x.com');
    console.log(`🤖 ThreadCub: Using Grok message-bubble class extraction (platform: ${isXCom ? 'x.com' : 'grok.com'})...`);

    // ── Strategy A: message-bubble classes (works on grok.com) ──
    const allBubbles = Array.from(document.querySelectorAll('[class*="message-bubble"]'));
    const topLevelBubbles = allBubbles.filter(el =>
      !el.parentElement?.closest('[class*="message-bubble"]')
    );
    console.log(`🤖 ThreadCub: Found ${allBubbles.length} total, ${topLevelBubbles.length} top-level message bubbles`);

    if (topLevelBubbles.length > 0) {
      return this._extractFromBubbles(topLevelBubbles, 'grok_bubble_class');
    }

    // ── Strategy B: x.com/i/grok — conversation turn containers ──
    // X.com wraps each turn in a div with data-index or uses r-* Tailwind classes.
    // User messages sit inside a container with a distinct background; assistant messages are full-width.
    if (isXCom) {
      console.log('🤖 ThreadCub: Trying x.com Grok turn-based extraction...');

      // Try data-testid="tweetText" style containers used in X.com React app
      const xSelectors = [
        '[data-testid="messageEntry"]',
        '[data-testid="grok-message"]',
        '[class*="GrokMessage"]',
        '[class*="grok-message"]',
        // X.com uses CSS-in-JS with r- prefixed classes; look for conversation containers
        'div[class*="r-"][class*="r-1niwhzg"]', // common X.com message wrapper pattern
      ];

      for (const selector of xSelectors) {
        try {
          const els = Array.from(document.querySelectorAll(selector));
          if (els.length > 0) {
            console.log(`🤖 ThreadCub: x.com strategy found ${els.length} elements with selector: ${selector}`);
            return this._extractFromBubbles(els, `grok_xcom_${selector}`);
          }
        } catch (e) { /* try next */ }
      }

      // Strategy B2: Walk the DOM looking for alternating user/assistant pattern.
      // On x.com, user messages are in a visually distinct bubble (right-aligned or background).
      // We look for the main conversation scroll container and pull direct children.
      console.log('🤖 ThreadCub: Trying x.com Grok scroll-container extraction...');
      const scrollContainerSelectors = [
        '[data-testid="grokConversation"]',
        '[aria-label="Conversation"]',
        '[class*="conversation"]',
        'main section',
        'main > div > div > div',
      ];

      for (const sel of scrollContainerSelectors) {
        try {
          const container = document.querySelector(sel);
          if (!container) continue;
          const children = Array.from(container.children).filter(el => {
            const text = el.innerText?.trim() || '';
            return text.length > 10 && !el.id?.includes('threadcub') &&
              !(typeof el.className === 'string' && el.className.includes('threadcub'));
          });
          if (children.length >= 2) {
            console.log(`🤖 ThreadCub: x.com container found ${children.length} children with: ${sel}`);
            return this._extractFromBubbles(children, `grok_xcom_container`);
          }
        } catch (e) { /* try next */ }
      }

      // Strategy B3: Last resort — grab all text blocks in main that look like messages
      console.log('🤖 ThreadCub: Trying x.com Grok text-block extraction...');
      return this._grokXComTextExtraction();
    }

    console.log('🤖 ThreadCub: No Grok message containers found');
    return [];
  },

  // Shared bubble → messages converter used by all Grok strategies
  _extractFromBubbles(bubbles, method) {
    const messages = [];
    let messageIndex = 0;
    const processedTexts = new Set();

    bubbles.forEach((bubble) => {
      if (bubble.id?.includes('threadcub')) return;
      if (typeof bubble.className === 'string' && bubble.className.includes('threadcub')) return;

      const text = bubble.innerText?.trim() || '';
      if (text.length < 10 || processedTexts.has(text)) return;
      if (['Copy', 'Share', 'Grok', 'More', 'New Chat'].includes(text)) return;

      processedTexts.add(text);

      const cls = typeof bubble.className === 'string' ? bubble.className : '';
      // grok.com: user = bg-surface-l1; x.com: user messages tend to be right-aligned
      // or have a distinct background class. We check multiple signals.
      const isUser = cls.includes('bg-surface-l1') ||
        cls.includes('r-1kb76zh') || // x.com right-align class
        bubble.getAttribute('data-role') === 'user';

      messages.push({
        id: messageIndex++,
        role: isUser ? 'user' : 'assistant',
        content: this.simpleCleanContent(text),
        timestamp: new Date().toISOString(),
        extractionMethod: method
      });
    });

    console.log(`🤖 ThreadCub: Grok extraction found: ${messages.length} messages (method: ${method})`);
    return messages;
  },

  // x.com last-resort: find the main content area and extract all text blocks
  _grokXComTextExtraction() {
    console.log('🤖 ThreadCub: x.com last-resort text extraction...');
    const messages = [];
    let messageIndex = 0;
    const processedTexts = new Set();

    // Get all substantial text nodes in main, skipping nav/header/footer
    const main = document.querySelector('main') || document.body;
    const allDivs = Array.from(main.querySelectorAll('div, article, section'));

    // Only pick leaf-like nodes (no substantial div children) with enough text
    const leafNodes = allDivs.filter(el => {
      if (el.closest('nav') || el.closest('header') || el.closest('footer')) return false;
      if (el.id?.includes('threadcub')) return false;
      if (typeof el.className === 'string' && el.className.includes('threadcub')) return false;
      const text = el.innerText?.trim() || '';
      if (text.length < 20) return false;
      // Leaf-ish: fewer than 3 child divs with their own text
      const childDivsWithText = Array.from(el.children).filter(c =>
        (c.tagName === 'DIV' || c.tagName === 'ARTICLE') && (c.innerText?.trim()?.length || 0) > 20
      );
      return childDivsWithText.length < 2;
    });

    // Deduplicate and assign alternating roles as a best-effort
    leafNodes.forEach((el, idx) => {
      const text = el.innerText?.trim() || '';
      if (processedTexts.has(text)) return;
      processedTexts.add(text);
      messages.push({
        id: messageIndex++,
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: this.simpleCleanContent(text),
        timestamp: new Date().toISOString(),
        extractionMethod: 'grok_xcom_lastresort'
      });
    });

    console.log(`🤖 ThreadCub: x.com last-resort found: ${messages.length} messages`);
    return messages;
  },

  // Grok fallback extraction — same class-based approach, broader selector
  grokSpanFallbackExtraction() {
    console.log('🤖 ThreadCub: Using Grok fallback extraction...');
    // Delegate to the primary method — same logic works as fallback
    return this.grokAriaLabelExtraction();
  },

  // =============================================================================
  // DEEPSEEK EXTRACTION
  // =============================================================================

  extractDeepSeekConversation() {
    console.log('🔵 ThreadCub: Extracting DeepSeek conversation...');

    const messages = [];
    let messageIndex = 0;

    // TODO: Update after inspecting DeepSeek's actual DOM structure
    // Get page title for conversation title
    const title = document.title || 'DeepSeek Conversation';

    // TODO: Inspect DeepSeek's DOM to find the correct selectors for:
    // - Message container elements
    // - User message elements (role detection)
    // - Assistant message elements (role detection)
    // - Message content extraction
    // - Code blocks, images, and other special content

    // PLACEHOLDER: Try generic message selectors
    console.log('⚠️ ThreadCub: Using placeholder DeepSeek extraction - needs manual selector configuration');

    const messageSelectors = [
      '[data-testid*="message"]',
      '[data-role="user"]',
      '[data-role="assistant"]',
      'div[class*="message"]',
      'div[class*="conversation"]',
      'div[class*="chat"]'
    ];

    let messageElements = [];
    for (const selector of messageSelectors) {
      messageElements = document.querySelectorAll(selector);
      if (messageElements.length > 0) {
        console.log(`🔵 ThreadCub: Found ${messageElements.length} potential messages with selector: ${selector}`);
        break;
      }
    }

    if (messageElements.length > 0) {
      messageElements.forEach((element, index) => {
        const text = element.textContent?.trim() || '';
        if (text && text.length > 10) {
          // TODO: Improve role detection based on actual DeepSeek DOM structure
          // Check for role attributes first, fallback to alternating pattern
          const dataRole = element.getAttribute('data-role');
          const role = dataRole || (index % 2 === 0 ? 'user' : 'assistant');

          messages.push({
            id: messageIndex++,
            role: role,
            content: text.replace(/^(Copy|Share|Regenerate|Retry)$/gm, '').trim(),
            timestamp: new Date().toISOString(),
            extractionMethod: 'deepseek_placeholder',
            needsManualConfiguration: true
          });
        }
      });
    }

    const conversationData = {
      title: title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'DeepSeek',
      total_messages: messages.length,
      messages: messages,
      extraction_method: 'deepseek_placeholder',
      warning: 'This extraction uses placeholder selectors and needs manual configuration after inspecting DeepSeek DOM'
    };

    console.log(`🔵 ThreadCub: ⚠️ DeepSeek extraction complete (placeholder): ${messages.length} messages`);
    if (messages.length === 0 && window.AnalyticsService) {
      window.AnalyticsService.trackError('extraction_failure', 'deepseek');
    }
    if (messages.length > 0 && window.AnalyticsService) {
      window.AnalyticsService.trackConversationExtracted(conversationData);
    }
    console.log('⚠️ TODO: Update extractDeepSeekConversation() with actual DeepSeek DOM selectors');

    return conversationData;
  },

  // =============================================================================
  // PERPLEXITY EXTRACTION
  // User messages: h1[class*="group/query"] > span.select-text
  // Assistant messages: div[id^="markdown-content"] > div.prose
  // =============================================================================

  extractPerplexityConversation() {
    console.log('🔮 ThreadCub: Starting Perplexity extraction...');

    // Extract title from page title or first user query
    const rawTitle = document.title
  .replace(' - Perplexity', '')
  .replace(' | Perplexity', '')
  .trim();

// Strip markdown link syntax e.g. [text](url) → text
const title = (rawTitle
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
  .replace(/https?:\/\/\S+/g, '')            // remove bare URLs
  .trim()
  .substring(0, 80)
  || 'Perplexity Conversation');

    try {
      const extractedMessages = this.perplexityDOMExtraction();

      const conversationData = {
        title: title,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        platform: 'Perplexity',
        total_messages: extractedMessages.length,
        messages: extractedMessages,
        extraction_method: 'perplexity_dom_extraction'
      };

      console.log(`🔮 ThreadCub: ✅ Perplexity extraction complete: ${extractedMessages.length} messages`);
      if (extractedMessages.length === 0 && window.AnalyticsService) {
        window.AnalyticsService.trackError('extraction_failure', 'perplexity');
      }
      if (extractedMessages.length > 0 && window.AnalyticsService) {
        window.AnalyticsService.trackConversationExtracted(conversationData);
      }

      return conversationData;

    } catch (error) {
      console.error('🔮 ThreadCub: Perplexity extraction failed:', error);

      // Fallback extraction
      const fallbackMessages = this.perplexityFallbackExtraction();

      return {
        title: title,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        platform: 'Perplexity',
        total_messages: fallbackMessages.length,
        messages: fallbackMessages,
        extraction_method: 'perplexity_fallback_extraction',
        error: error.message
      };
    }
  },

  // Perplexity DOM extraction using specific selectors
  perplexityDOMExtraction() {
    console.log('🔮 ThreadCub: Using Perplexity DOM extraction...');

    const messages = [];
    let messageIndex = 0;

    // Find all user messages: h1[class*="group/query"]
    const userMessageContainers = document.querySelectorAll('h1[class*="group/query"]');
    console.log(`🔮 ThreadCub: Found ${userMessageContainers.length} user message containers`);

    // Find all assistant messages: div[id^="markdown-content"]
    const assistantMessageContainers = document.querySelectorAll('div[id^="markdown-content"]');
    console.log(`🔮 ThreadCub: Found ${assistantMessageContainers.length} assistant message containers`);

    // Build a combined list with DOM positions for proper ordering
    const allMessages = [];

    // Process user messages
    userMessageContainers.forEach((container) => {
      // Extract text from span.select-text inside the container
      const textSpan = container.querySelector('span.select-text');
      const text = textSpan ? textSpan.textContent?.trim() : container.textContent?.trim();

      if (text && text.length > 0) {
        allMessages.push({
          element: container,
          role: 'user',
          content: text,
          position: this.getElementPosition(container)
        });
      }
    });

    // Process assistant messages
    assistantMessageContainers.forEach((container) => {
      // Extract text from div.prose inside the container
      const proseDiv = container.querySelector('div.prose');
      const text = proseDiv ? proseDiv.textContent?.trim() : container.textContent?.trim();

      if (text && text.length > 0) {
        allMessages.push({
          element: container,
          role: 'assistant',
          content: this.cleanPerplexityContent(text),
          position: this.getElementPosition(container)
        });
      }
    });

    // Sort by DOM position to maintain conversation order
    allMessages.sort((a, b) => a.position - b.position);

    // Merge consecutive assistant messages into one.
    // Perplexity splits a single response across multiple div[id^="markdown-content"]
    // elements (e.g. one per source/section block). After sorting by DOM position,
    // any run of consecutive assistant entries belongs to the same response turn.
    const merged = [];
    allMessages.forEach((msg) => {
      const prev = merged[merged.length - 1];
      if (prev && prev.role === 'assistant' && msg.role === 'assistant') {
        // Append to the previous assistant turn rather than creating a new one
        prev.content += '\n\n' + msg.content;
      } else {
        merged.push({ role: msg.role, content: msg.content });
      }
    });

    // Convert to final message format
    merged.forEach((msg) => {
      messages.push({
        id: messageIndex++,
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString(),
        extractionMethod: 'perplexity_dom'
      });
    });

    console.log(`🔮 ThreadCub: Perplexity DOM extraction found: ${messages.length} messages (merged from ${allMessages.length} raw elements)`);
    return messages;
  },

  // Helper: Get element's position in document for sorting
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  },

  // Helper: Clean Perplexity content
  cleanPerplexityContent(text) {
    return text
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(Copy|Share|Sources|Related)$/gm, '')
      .trim();
  },

  // Perplexity fallback extraction
  perplexityFallbackExtraction() {
    console.log('🔮 ThreadCub: Using Perplexity fallback extraction...');

    const messages = [];
    let messageIndex = 0;

    try {
      // Try alternative selectors
      const allProseElements = document.querySelectorAll('div.prose, [class*="prose"]');
      console.log(`🔮 ThreadCub: Found ${allProseElements.length} prose elements`);

      const processedTexts = new Set();

      allProseElements.forEach((element, index) => {
        const text = element.textContent?.trim();
        if (text && text.length > 20 && !processedTexts.has(text)) {
          processedTexts.add(text);

          // Alternating pattern as fallback
          const role = index % 2 === 0 ? 'user' : 'assistant';

          messages.push({
            id: messageIndex++,
            role: role,
            content: this.cleanPerplexityContent(text),
            timestamp: new Date().toISOString(),
            extractionMethod: 'perplexity_fallback'
          });
        }
      });

    } catch (error) {
      console.error('🔮 ThreadCub: Perplexity fallback extraction error:', error);
    }

    console.log(`🔮 ThreadCub: Perplexity fallback extraction found: ${messages.length} messages`);
    return messages;
  },

  // =============================================================================
  // GENERIC EXTRACTION
  // =============================================================================

  extractGenericConversation() {
    console.log('🐻 ThreadCub: Attempting generic conversation extraction...');

    const messages = [];
    let messageIndex = 0;

    const title = document.title || 'AI Conversation';

    // Generic approach - look for text blocks that might be messages
    const textElements = document.querySelectorAll('p, div[class*="message"], .prose, [role="group"], div[class*="text"], div[class*="content"]');

    const validMessages = [];

    textElements.forEach(element => {
      try {
        const text = element.innerText?.trim();
        if (text &&
            text.length > 20 &&
            text.length < 5000 &&
            !text.includes('button') &&
            !text.includes('click') &&
            !text.includes('menu') &&
            !element.querySelector('button') &&
            !element.querySelector('input')) {
          validMessages.push({
            element: element,
            text: text,
            length: text.length
          });
        }
      } catch (error) {
        console.log('🐻 ThreadCub: Error in generic extraction:', error);
      }
    });

    // Sort by text length and take the most substantial messages
    validMessages.sort((a, b) => b.length - a.length);
    const topMessages = validMessages.slice(0, Math.min(50, validMessages.length));

    topMessages.forEach((item, index) => {
      messages.push({
        id: messageIndex++,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: item.text,
        timestamp: new Date().toISOString()
      });
    });

    const conversationData = {
      title: title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'Generic',
      total_messages: messages.length,
      messages: messages
    };

    console.log(`🐻 ThreadCub: ✅ Extracted ${messages.length} messages generically`);
    return conversationData;
  },

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  generateQuickSummary(messages) {
    if (!messages || messages.length === 0) return 'Empty conversation';

    const userMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'human');
    if (userMessages.length === 0) return 'No user messages found';

    const lastUserMessage = userMessages[userMessages.length - 1];
    const firstUserMessage = userMessages[0];

    if (userMessages.length === 1) {
      return `Previous conversation about: "${firstUserMessage.content.substring(0, 100)}..."`;
    }

    return `Previous conversation: Started with "${firstUserMessage.content.substring(0, 60)}..." and most recently discussed "${lastUserMessage.content.substring(0, 60)}..."`;
  },

  // ===== FIXED METHOD - Added Grok and DeepSeek support =====
  getTargetPlatformFromCurrentUrl() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
      return 'claude';
    } else if (hostname.includes('gemini.google.com')) {
      return 'gemini';
    } else if (hostname.includes('grok.x.ai') || hostname.includes('grok.com') || 
               (hostname.includes('x.com') && pathname.includes('/i/grok'))) {
      return 'grok';
    } else if (hostname.includes('chat.deepseek.com')) {
      return 'deepseek';
    } else if (hostname.includes('perplexity.ai')) {
      return 'perplexity';
    }
    return 'unknown';
  },

  generateContinuationPrompt(summary, shareUrl, platform, conversationData) {
    console.log('🐻 ThreadCub: Generating continuation prompt for platform:', platform);

    // URL-based prompt for platforms with web_fetch capability (Claude, Grok)
    const totalMessages = conversationData?.total_messages || conversationData?.messages?.length || 0;
    const needsPagination = totalMessages > 50;
    const pageCount = needsPagination ? Math.ceil(totalMessages / 30) : 1;
    const pageUrls = needsPagination
      ? Array.from({ length: pageCount }, (_, i) => `Page ${i + 1}: ${shareUrl}?page=${i + 1}&limit=30`).join('\n')
      : '';
    const urlBasedPrompt = needsPagination
      ? `I'd like to continue our previous conversation. The complete context is available at: ${shareUrl}\n\nThis conversation has ${totalMessages} messages which is too large to fetch in one go. Please fetch each page sequentially using your web_fetch tool:\n${pageUrls}\n\nOnce you have all pages, confirm you have the full context and are ready to continue from where we left off.`
      : `I'd like to continue our previous conversation. The complete context is available at: ${shareUrl}\n\nPlease attempt to fetch this URL using your web_fetch tool to access the conversation history. The URL returns a JSON response with the full conversation.\n\nIf you're able to retrieve it, let me know you're ready to continue from where we left off. If you cannot access it for any reason, please let me know and I'll share the conversation content directly.`;

    // GROK - URL-based (confirmed working with web_fetch)
    if (platform && platform.toLowerCase().includes('grok')) {
      console.log('🤖 ThreadCub: Generated Grok URL-based prompt:', urlBasedPrompt.length, 'characters');
      return urlBasedPrompt;
    }

    // CHATGPT/GEMINI/DEEPSEEK/PERPLEXITY - File/text-based prompts (no URL fetch capability)
    // Perplexity has web SEARCH but NOT web FETCH - it cannot retrieve URLs directly
    else if (platform && (platform.toLowerCase().includes('chatgpt') ||
                           platform.toLowerCase().includes('gemini') ||
                           platform.toLowerCase().includes('deepseek') ||
                           platform.toLowerCase().includes('perplexity'))) {
      const prompt = `I'd like to continue our previous conversation. I have our complete conversation history that I'll share now.

Please read through the conversation and provide your assessment of:
- What we were working on
- The current status/progress
- Any next steps or tasks mentioned

Once you've reviewed it, let me know you're ready to continue from where we left off.`;

      console.log('🐻 ThreadCub: Generated text-based continuation prompt:', prompt.length, 'characters');
      return prompt;
    }

    // CLAUDE (default) - URL-based prompt
    else {
      console.log('🐻 ThreadCub: Generated Claude URL-based prompt:', urlBasedPrompt.length, 'characters');
      return urlBasedPrompt;
    }
  }

};

// Export to global window object
window.ConversationExtractor = ConversationExtractor;
console.log('🔌 ThreadCub: ConversationExtractor module loaded');