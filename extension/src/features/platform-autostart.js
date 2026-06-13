// === SECTION 3A: Platform Auto-start Functions ===

// ===== Generate intelligent conversation summary =====
function generateConversationSummary(fullPrompt) {
  try {
    // Extract all messages for analysis
    const messageMatches = fullPrompt.match(/\*\*You:\*\*[^*]+|\*\*Assistant:\*\*[^*]+/g);
    
    if (!messageMatches || messageMatches.length === 0) {
      return '📋 No conversation content available for summary.';
    }
    
    return `📋 Previous conversation with ${messageMatches.length} messages ready to continue.`;
    
  } catch (error) {
    console.log('🐻 ThreadCub: Error generating summary:', error);
    return '📋 Conversation summary unavailable - full context will be provided when continuing.';
  }
}

// ===== Attempt to auto-start the chat =====
function attemptAutoStart() {
  const platform = window.PlatformDetector.detectPlatform();
  console.log('🐻 ThreadCub: Attempting auto-start for platform:', platform);

  // Wait a moment for the input to be filled
  setTimeout(() => {
    // Platform-specific auto-start attempts
    if (platform === window.PlatformDetector.PLATFORMS.CLAUDE || platform === 'claude.ai') {
      attemptClaudeAutoStart();
    } else if (platform === window.PlatformDetector.PLATFORMS.CHATGPT || platform === 'chatgpt') {
      attemptChatGPTAutoStart();
    } else if (platform === window.PlatformDetector.PLATFORMS.GEMINI || platform === 'gemini') {
      attemptGeminiAutoStart();
    } else if (platform === window.PlatformDetector.PLATFORMS.GROK || platform === 'grok') {
      attemptGrokAutoStart();
    } else if (platform === window.PlatformDetector.PLATFORMS.DEEPSEEK || platform === 'deepseek') {
      attemptDeepSeekAutoStart();
    } else if (platform === window.PlatformDetector.PLATFORMS.PERPLEXITY || platform === 'perplexity') {
      attemptPerplexityAutoStart();
    }
  }, 1000);
}

let _claudeAutoStartFired = false;
// ===== Claude.ai auto-start =====
function attemptClaudeAutoStart() {
  if (_claudeAutoStartFired) { console.log('🔧 Auto-start already fired, skipping duplicate'); return; }
  _claudeAutoStartFired = true;
  console.log('🔧 Waiting for Claude.ai to be ready before clicking send...');
  let attempts = 0;
  const maxAttempts = 40;
  const interval = setInterval(() => {
    attempts++;
    try {
      const sendSelectors = [
        'button[data-testid="send-button"]',
        'button[aria-label*="Send"]',
        'button[type="submit"]'
      ];
      for (const selector of sendSelectors) {
        const sendButton = document.querySelector(selector);
        if (sendButton && !sendButton.disabled) {
          clearInterval(interval);
          console.log('🐻 ThreadCub: Found Claude send button, clicking...');
          setTimeout(() => sendButton.click(), 1500);
          return;
        }
      }
      console.log('🔧 Send button not ready yet, attempt ' + attempts + '/' + maxAttempts);
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('🔧 Give up waiting — user can send manually');
      }
    } catch (error) {
      clearInterval(interval);
      console.log('🐻 ThreadCub: Claude auto-start failed:', error);
    }
  }, 250);
}

// ===== ChatGPT auto-start =====
function attemptChatGPTAutoStart() {
  try {
    // Look for ChatGPT's send button
    const sendSelectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[type="submit"]'
    ];
    
    for (const selector of sendSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && !sendButton.disabled) {
        console.log('🐻 ThreadCub: Found ChatGPT send button, clicking...');
        sendButton.click();
        return;
      }
    }
    
  } catch (error) {
    console.log('🐻 ThreadCub: ChatGPT auto-start failed:', error);
  }
}

// ===== Gemini auto-start =====
function attemptGeminiAutoStart() {
  try {
    // Look for Gemini's send button
    const sendSelectors = [
      'button[aria-label*="Send"]',
      'button[type="submit"]'
    ];

    for (const selector of sendSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && !sendButton.disabled) {
        console.log('🐻 ThreadCub: Found Gemini send button, clicking...');
        sendButton.click();
        return;
      }
    }

  } catch (error) {
    console.log('🐻 ThreadCub: Gemini auto-start failed:', error);
  }
}

// ===== Grok auto-start =====
// Grok supports web_fetch just like Claude! Auto-submit to let it work.
function attemptGrokAutoStart() {
  console.log('🤖 ThreadCub: Attempting Grok auto-start with retry logic...');

  // Grok-specific send button selectors - PRIMARY: "Grok something" aria-label
  const sendSelectors = [
    // PRIMARY: Grok's actual send button uses this aria-label
    'button[aria-label="Grok something"]',
    'button[aria-label*="Grok something"]',
    'button[aria-label*="Grok"]',
    // FALLBACK: Generic send button selectors
    'button[aria-label="Send message"]',
    'button[aria-label="Send"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[data-testid="send-button"]',
    'button[data-testid*="send"]',
    'button[type="submit"]',
    'button[class*="send"]',
    'button[class*="Send"]'
  ];

  let attempts = 0;
  const maxAttempts = 5;
  const retryDelay = 500;

  function tryFindAndClick() {
    attempts++;
    console.log(`🤖 ThreadCub: Grok send button attempt ${attempts}/${maxAttempts}`);

    // Try selectors in order (primary first)
    for (const selector of sendSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const button = element.tagName === 'BUTTON' ? element : element.closest('button');
          if (button && !button.disabled && button.offsetHeight > 0) {
            const ariaLabel = button.getAttribute('aria-label');
            console.log(`🤖 ThreadCub: Found Grok send button with aria-label: "${ariaLabel}"`);
            button.focus();
            button.click();
            console.log('✅ ThreadCub: Grok send button clicked!');
            return true;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Alternative: Search all buttons for Grok-related or send-like characteristics
    const allButtons = document.querySelectorAll('button');
    for (const button of allButtons) {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const isGrokButton = ariaLabel.toLowerCase().includes('grok');
      const isSendButton = ariaLabel.toLowerCase().includes('send');

      if ((isGrokButton || isSendButton) && !button.disabled && button.offsetHeight > 0) {
        console.log(`🤖 ThreadCub: Found button via fallback: "${ariaLabel}"`);
        button.focus();
        button.click();
        return true;
      }
    }

    // Retry if not found
    if (attempts < maxAttempts) {
      console.log(`🔄 ThreadCub: Retrying in ${retryDelay}ms...`);
      setTimeout(tryFindAndClick, retryDelay);
      return false;
    }

    console.log('❌ ThreadCub: Could not find Grok send button after all attempts');
    return false;
  }

  tryFindAndClick();
}

// ===== DeepSeek auto-start =====
// DeepSeek now uses direct JSON embedding, so no need for Search button - just auto-submit!
function attemptDeepSeekAutoStart() {
  console.log('🔵 ThreadCub: Attempting DeepSeek auto-start (direct JSON, no Search button needed)');

  try {
    // Find and click the Send button (JSON is already embedded in prompt)
    const sendSelectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Submit"]',
      'button[type="submit"]',
      'button[class*="send"]',
      'button[class*="submit"]'
    ];

    for (const selector of sendSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && !sendButton.disabled) {
        console.log('🔵 ThreadCub: Found DeepSeek send button, auto-submitting...');
        sendButton.click();
        return true;
      }
    }

    console.warn('⚠️ ThreadCub: Could not find DeepSeek send button');
    return false;

  } catch (error) {
    console.log('🔵 ThreadCub: DeepSeek auto-start failed:', error);
    return false;
  }
}

// ===== Perplexity auto-start =====
// NOTE: Perplexity is a file-based platform (like ChatGPT/Gemini/DeepSeek)
// It does NOT auto-start - user needs to manually upload the JSON file
function attemptPerplexityAutoStart() {
  console.log('🔮 ThreadCub: Perplexity uses file upload method');
  console.log('🔮 Skipping auto-start - user will manually upload JSON and send');
  // No action needed - the continuation system handles filling the input field with instructions
}

// ===== Fill input field with prompt =====
function fillInputFieldWithPrompt(prompt) {
  const platform = window.PlatformDetector.detectPlatform();
  console.log('🐻 ThreadCub: Filling input field with continuation prompt for:', platform);

  // Get platform-specific selectors from centralized module
  const platformSelectors = window.PlatformDetector.getInputSelectors(platform);
  console.log('🔍 Platform detected:', platform, 'Using selectors:', platformSelectors);
  console.log('🔍 About to loop through selectors. Count:', platformSelectors.length);

  // Find input field
  let inputField = null;
  for (const selector of platformSelectors) {
    const elements = document.querySelectorAll(selector);
    console.log('🔍 Checked selector:', selector, 'Found elements:', elements.length);
    for (const element of elements) {
      if (element.offsetHeight > 0 && !element.disabled) {
        inputField = element;
        break;
      }
    }
    if (inputField) break;
  }

  if (inputField) {
    console.log('🔍 Found input field:', inputField.tagName, 'contentEditable:', inputField.contentEditable);
    
    inputField.focus();
    inputField.click(); // Some platforms need click too

    // Fill based on input type
    if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
      inputField.value = prompt;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Filled TEXTAREA/INPUT');
      return true;
    } else if (inputField.contentEditable === 'true') {
      // For Claude's Lexical editor — must use execCommand only, never innerHTML/textContent
      console.log('🔧 Filling contenteditable div for Claude/Lexical...');
      inputField.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, prompt);
      inputField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      console.log('✅ Filled contenteditable with execCommand method');
      console.log('✅ ThreadCub: Input field populated successfully');
      return true;
    }

    console.log('✅ ThreadCub: Input field populated successfully');
    return true;
  } else {
    console.log('❌ ThreadCub: Could not find input field');
    return false;
  }
}

// ===== Show continuation success message =====
function showContinuationSuccess() {
  // Use centralized toast system
  ThreadCubFloatingButton.showGlobalSuccessToast();
}

// ===== Show download success message =====
function showDownloadSuccessMessage() {
  // Use centralized toast system
  ThreadCubFloatingButton.showGlobalSuccessToast();
}

// ===== Platform detection helper function (now using centralized module) =====
// Removed - now using window.PlatformDetector.detectPlatform()

// === END SECTION 3A ===

// Export platform autostart functions to window for global access
window.PlatformAutostart = {
  generateConversationSummary,
  attemptAutoStart,
  attemptClaudeAutoStart,
  attemptChatGPTAutoStart,
  attemptGeminiAutoStart,
  attemptGrokAutoStart,
  attemptDeepSeekAutoStart,
  attemptPerplexityAutoStart,
  fillInputFieldWithPrompt,
  showContinuationSuccess,
  showDownloadSuccessMessage
};

console.log('🐻 ThreadCub: Platform autostart module loaded');