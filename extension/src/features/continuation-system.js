// === SECTION 2A: Streamlined Continuation System (NO MODAL) ===

// ===== STREAMLINED: Check for continuation data and auto-execute =====
function checkForContinuationData() {
  console.log('🐻 ThreadCub: Checking for continuation data using Chrome storage');
  
  let retryCount = 0;
  const maxRetries = 15; // Try up to 15 times
  const retryDelay = 300; // Every 300ms
  
  // Check if chrome storage is available
  if (typeof chrome !== 'undefined' && chrome.storage) {
    
    function attemptCheck() {
      retryCount++;
      console.log(`🐻 ThreadCub: Checking Chrome storage (attempt ${retryCount}/${maxRetries})...`);
      
      try {
        chrome.storage.local.get(['threadcubContinuationData'], (result) => {
          if (chrome.runtime.lastError) {
            console.log('🐻 ThreadCub: Chrome storage error:', chrome.runtime.lastError);
            if (retryCount < maxRetries) {
              console.log(`🐻 ThreadCub: Retrying in ${retryDelay}ms...`);
              setTimeout(attemptCheck, retryDelay);
            } else {
              console.log('🐻 ThreadCub: Max retries reached, falling back to localStorage...');
              checkLocalStorageFallback();
            }
            return;
          }
          
          const data = result.threadcubContinuationData;
          if (data) {
            console.log('🐻 ThreadCub: ✅ Found continuation data on attempt', retryCount);
            
            // Check if data is recent (less than 5 minutes old)
            const isRecent = (Date.now() - data.timestamp) < 5 * 60 * 1000;
            
            if (isRecent) {
              // NOTE: data is cleared inside executeStreamlinedContinuation
              // only after confirming we are on a safe page to fill
              
              // STREAMLINED: Execute continuation immediately (no modal)
              setTimeout(() => {
                executeStreamlinedContinuation(data.prompt, data.shareUrl, data);
              }, 200); // Minimal delay — page already loaded
            } else {
              console.log('🐻 ThreadCub: Continuation data too old, ignoring');
              chrome.storage.local.remove(['threadcubContinuationData']);
            }
          } else {
            // No data found yet
            if (retryCount < maxRetries) {
              console.log(`🐻 ThreadCub: No data yet, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
              setTimeout(attemptCheck, retryDelay);
            } else {
              console.log('🐻 ThreadCub: No continuation data found after', maxRetries, 'attempts');
              console.log('🐻 ThreadCub: Checking localStorage as fallback...');
              checkLocalStorageFallback();
            }
          }
        });
      } catch (error) {
        console.log('🐻 ThreadCub: Error checking continuation data:', error);
        if (retryCount < maxRetries) {
          console.log(`🐻 ThreadCub: Retrying in ${retryDelay}ms...`);
          setTimeout(attemptCheck, retryDelay);
        } else {
          console.log('🐻 ThreadCub: Falling back to localStorage...');
          checkLocalStorageFallback();
        }
      }
    }
    
    // Start checking with a small initial delay
    setTimeout(() => {
      console.log('🐻 ThreadCub: Starting continuation data check with retry logic...');
      attemptCheck();
    }, 500);
    
  } else {
    checkLocalStorageFallback();
  }

  // Extract the localStorage logic into a separate function
  function checkLocalStorageFallback() {
    try {
      const storedData = localStorage.getItem('threadcubContinuationData');
      if (storedData) {
        const data = JSON.parse(storedData);
        console.log('🐻 ThreadCub: Found continuation data in localStorage:', data);
        
        // Check if data is recent
        const isRecent = (Date.now() - data.timestamp) < 5 * 60 * 1000;
        
        if (isRecent) {
          // NOTE: data is cleared inside executeStreamlinedContinuation
          // only after confirming we are on a safe page to fill
          
          // STREAMLINED: Execute continuation immediately
          setTimeout(() => {
            executeStreamlinedContinuation(data.prompt, data.shareUrl, data);
          }, 800);
        } else {
          console.log('🐻 ThreadCub: Continuation data too old, clearing');
          localStorage.removeItem('threadcubContinuationData');
        }
      } else {
        console.log('🐻 ThreadCub: No continuation data found in localStorage');
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Error with localStorage:', error);
    }
  }
}

// ===== STREAMLINED: Execute continuation without modal =====
function executeStreamlinedContinuation(fullPrompt, shareUrl, continuationData) {
  console.log('🚀 ThreadCub: Executing streamlined continuation');

  // 📊 GA: continuation_started — fired when continuation data is found and execution begins
  safeTrackEvent('continuation_started', {
    platform: continuationData.platform || window.PlatformDetector?.detectPlatform() || 'unknown'
  });
  
  console.log('🚀 Platform:', continuationData.platform);
  console.log('🚀 ChatGPT Flow:', continuationData.chatGPTFlow);
  console.log('🚀 Gemini Flow:', continuationData.geminiFlow);
  console.log('🚀 Grok Flow:', continuationData.grokFlow);
  console.log('🚀 DeepSeek Flow:', continuationData.deepseekFlow);
  console.log('🚀 Perplexity Flow:', continuationData.perplexityFlow);
  
  const platform = window.PlatformDetector.detectPlatform();

  // Check if this is a file/text-based flow (user needs to review pasted content)
  // Perplexity: Included - works exactly like ChatGPT (auto-fill with file upload instructions)
  const isFileBased = continuationData.chatGPTFlow ||
                      continuationData.geminiFlow ||
                      continuationData.deepseekFlow ||
                      continuationData.perplexityFlow;

  // STEP 1: Auto-populate the input field with retry logic
  console.log('🔧 Auto-populating input field...');
  console.log('🔧 Is file-based:', isFileBased);

  // Grok (especially grok.com) is a SPA that may need time to render its input field
  const isGrok = continuationData.grokFlow ||
                 platform === window.PlatformDetector.PLATFORMS.GROK ||
                 platform === 'grok';

  // 📊 GA: continuation_executed — fired when continuation is about to fill the input field
  // Distinguishes between file-based (user uploads JSON) and URL-based (auto-fills and sends)
  safeTrackEvent('continuation_executed', {
    platform: continuationData.platform || platform || 'unknown',
    flow_type: isFileBased ? 'file_based' : isGrok ? 'grok_spa' : 'url_based'
  });

  if (isFileBased) {
    // File-based platforms (ChatGPT, Gemini, DeepSeek, Perplexity) need retry logic
    console.log('🔧 Using retry logic for file-based platform:', platform);
    fillInputFieldWithRetry(fullPrompt, 5, 500);
  } else if (isGrok) {
    // Grok: URL-based but needs retry since grok.com is a SPA with delayed input rendering
    console.log('🔧 Using retry logic for Grok (SPA input field):', platform);
    fillInputFieldWithRetry(fullPrompt, 10, 800);
  } else {
    // URL-based platforms (Claude) - ensure we are on a new/empty chat before filling
    const currentPath = window.location.pathname;
    const currentHost = window.location.hostname;
    const isClaudeExistingChat = currentHost.includes('claude.ai') && currentPath.startsWith('/chat/');
    if (isClaudeExistingChat) {
      // Claude has auto-redirected to an existing conversation — re-store data and navigate to /new
      console.log('🔧 Claude redirected to existing chat, re-storing data and navigating to /new...');
      chrome.storage.local.set({ threadcubContinuationData: { ...continuationData, timestamp: Date.now() } }, () => {
        console.log('🔧 Re-stored continuation data for next page load');
        window.location.href = 'https://claude.ai/new';
      });
      return;
    }
    // Safe to fill — clear the data now so it is only used once
    chrome.storage.local.remove(['threadcubContinuationData'], () => {
      console.log('🐻 ThreadCub: Cleared used continuation data');
    });
    // Use retry logic for Claude — Lexical editor may not be ready yet
    console.log('🔧 Using retry fill for Claude');
    fillInputFieldWithRetry(fullPrompt, 20, 500);
  }

  // Show subtle success notification
  showStreamlinedNotification(continuationData);

  // Auto-start ONLY for URL-based platforms (Claude, Grok)
  // File-based platforms (ChatGPT, Gemini, DeepSeek, Perplexity) - user reviews and uploads file
  if (!isFileBased) {
    // Grok (SPA) needs a longer delay to allow retry-based fill to complete
    const autoStartDelay = isGrok ? 10000 : 1500;
    setTimeout(() => {
      console.log('🔧 Auto-starting conversation for URL-based platform...');
      // 📊 GA: continuation_auto_started — fired when the send button is clicked automatically
      // Only fires for URL-based platforms (Claude, Grok) — file-based platforms skip this
      safeTrackEvent('continuation_auto_started', {
        platform: continuationData.platform || platform || 'unknown',
        is_grok: isGrok
      });
      attemptAutoStart(platform);
    }, autoStartDelay);
  } else {
    console.log('📁 File-based flow - skipping auto-start. User will review prompt and upload file.');
  }
}

// ===== STREAMLINED: Subtle success notification =====
function showStreamlinedNotification(continuationData) {
  const isChatGPTFlow = continuationData.chatGPTFlow === true;
  const isGeminiFlow = continuationData.geminiFlow === true;
  const isDeepSeekFlow = continuationData.deepseekFlow === true;
  const isPerplexityFlow = continuationData.perplexityFlow === true;
  const isFileBased = isChatGPTFlow || isGeminiFlow || isDeepSeekFlow || isPerplexityFlow;
  const messageCount = continuationData.totalMessages || 'multiple';
  
  // Create small, non-intrusive notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, ${isFileBased ? '#10a37f' : '#667eea'} 0%, ${isFileBased ? '#0d8f6f' : '#764ba2'} 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 10000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 320px;
  `;
  
  const title = continuationData.title || 'Previous Conversation';
  const platformName = continuationData.platform || 'AI Platform';
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="font-size: 18px;">${isFileBased ? '💬' : '🐻'}</div>
      <div>
        <div style="font-weight: 700; margin-bottom: 2px;">ThreadCub Continuation</div>
        <div style="font-size: 12px; opacity: 0.9;">${platformName} • ${messageCount} messages</div>
        ${isFileBased ? 
          '<div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">📁 File downloaded, upload when ready</div>' : 
          '<div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">✨ Conversation context loaded</div>'
        }
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out after 6 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 6000);
}

// ===== Fill input field with prompt =====
function fillInputFieldWithPrompt(prompt) {
  const platform = window.PlatformDetector.detectPlatform();
  console.log('🔧 fillInputFieldWithPrompt called for platform:', platform);
  console.log('🔧 Prompt length:', prompt.length);

  // Get platform-specific selectors with enhanced Perplexity support
  let platformSelectors = window.PlatformDetector.getInputSelectors(platform);
  
  // ADD PERPLEXITY-SPECIFIC SELECTORS (contenteditable div, NOT textarea!)
  if (platform === 'perplexity' || platform === window.PlatformDetector.PLATFORMS.PERPLEXITY) {
    console.log('🔮 Perplexity detected - using contenteditable div selectors');
    platformSelectors = [
      'div#ask-input',  // PRIMARY: Perplexity's actual input ID
      'div[role="textbox"][contenteditable="true"]',  // SECONDARY: Role-based
      'div[aria-placeholder*="Ask"][contenteditable="true"]',  // TERTIARY: Placeholder-based
      'div[data-lexical-editor="true"]',  // QUATERNARY: Lexical editor
      '[contenteditable="true"]',  // FALLBACK: Any contenteditable
      ...platformSelectors
    ];
  }

  console.log('🔧 Using selectors:', platformSelectors);

  // Find input field with enhanced visibility checks
  let inputField = null;
  for (let i = 0; i < platformSelectors.length; i++) {
    const selector = platformSelectors[i];
    console.log(`🔧 Trying selector ${i + 1}/${platformSelectors.length}: "${selector}"`);
    
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`🔧 Found ${elements.length} elements with selector "${selector}"`);
      
      for (let j = 0; j < elements.length; j++) {
        const element = elements[j];
        const isVisible = element.offsetHeight > 0 && element.offsetWidth > 0;
        const isDisabled = element.disabled;
        const isReadOnly = element.readOnly;
        
        console.log(`🔧 Element ${j + 1}: visible=${isVisible}, disabled=${isDisabled}, readonly=${isReadOnly}, tagName=${element.tagName}`);
        
        if (isVisible && !isDisabled && !isReadOnly) {
          inputField = element;
          console.log('✅ Found suitable input field!');
          break;
        }
      }
    } catch (error) {
      console.log(`⚠️ Error with selector "${selector}":`, error);
    }
    
    if (inputField) break;
  }

  if (inputField) {
    console.log('✅ Input field found:', {
      tagName: inputField.tagName,
      type: inputField.type,
      placeholder: inputField.placeholder,
      contentEditable: inputField.contentEditable,
      classList: Array.from(inputField.classList || [])
    });
    
    try {
      // Focus the field
      inputField.focus();
      console.log('🔧 Field focused');
      
      // Wait a moment for focus to take effect
      setTimeout(() => {
        // Fill based on input type
        if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
          console.log('🔧 Filling TEXTAREA/INPUT field');
          
          // Clear existing value
          inputField.value = '';
          
          // Set new value
          inputField.value = prompt;
          
          // Trigger events for React/Vue to detect changes
          inputField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          inputField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          inputField.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
          inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
          
          console.log('✅ TEXTAREA/INPUT filled successfully');
          console.log('🔧 Verify value length:', inputField.value.length);
          
        } else if (inputField.contentEditable === 'true') {
          console.log('🔧 Filling contenteditable field (Lexical/React editor) via execCommand');

          // Focus first
          inputField.focus();

          // Select all existing content and delete it
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);

          // Insert text through native editing pipeline — Lexical listens to this
          const inserted = document.execCommand('insertText', false, prompt);
          console.log('🔧 execCommand insertText result:', inserted);

          // Fallback: if execCommand returned false, try InputEvent approach
          if (!inserted) {
            console.log('🔧 execCommand failed, falling back to InputEvent');
            inputField.textContent = '';
            inputField.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: prompt }));
            inputField.textContent = prompt;
            inputField.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: prompt }));
          }

          console.log('✅ Contenteditable filled, textContent length:', inputField.textContent.length);
        }
        
      }, 100);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error filling input field:', error);
      return false;
    }
    
  } else {
    console.error('❌ Could not find input field for platform:', platform);
    console.log('❌ Tried selectors:', platformSelectors);
    console.log('❌ All textareas on page:', document.querySelectorAll('textarea').length);
    console.log('❌ All contenteditable:', document.querySelectorAll('[contenteditable="true"]').length);
    
    // Debug: Show what textareas exist
    const allTextareas = document.querySelectorAll('textarea');
    allTextareas.forEach((ta, i) => {
      console.log(`Textarea ${i + 1}:`, {
        placeholder: ta.placeholder,
        visible: ta.offsetHeight > 0,
        disabled: ta.disabled
      });
    });
    
    return false;
  }
}

// ===== Fill input with retry logic (for platforms with slow-loading inputs) =====
function fillInputFieldWithRetry(prompt, maxAttempts = 20, retryDelay = 1000) {
  const platform = window.PlatformDetector.detectPlatform();
  console.log('🔧 fillInputFieldWithRetry starting for:', platform);
  console.log('🔧 Max attempts:', maxAttempts, 'Retry delay:', retryDelay + 'ms');
  console.log('🔧 Prompt preview:', prompt.substring(0, 100) + '...');

  let attempts = 0;

  function tryFill() {
    attempts++;
    console.log(`\n🔧 ═══ ATTEMPT ${attempts}/${maxAttempts} ═══`);
    console.log(`🔧 Time elapsed: ${attempts * retryDelay / 1000} seconds`);

    const success = fillInputFieldWithPrompt(prompt);

    if (success) {
      console.log(`\n✅ 🎉 SUCCESS! Input field filled on attempt ${attempts}!`);
      console.log('✅ You can now upload the JSON file and send the message');
      return true;
    } else if (attempts < maxAttempts) {
      console.log(`\n⏱️ Not successful yet, retrying in ${retryDelay}ms...`);
      console.log(`⏱️ ${maxAttempts - attempts} attempts remaining`);
      setTimeout(tryFill, retryDelay);
    } else {
      console.error(`\n❌ FAILED to fill input after ${maxAttempts} attempts (${maxAttempts * retryDelay / 1000} seconds total)`);

      // 📊 GA: continuation_fill_failed — fired when input field could not be filled after all retries
      // Useful for identifying platforms where the selector logic is broken
      safeTrackEvent('continuation_fill_failed', {
        platform: platform || 'unknown',
        attempts_made: maxAttempts
      });

      console.log('💡 The JSON file has been downloaded. You can manually:');
      console.log('   1. Copy the prompt from the JSON file');
      console.log('   2. Paste it into the input field');
      console.log('   3. Upload the JSON file');
      console.log('   4. Send the message');
      return false;
    }
  }

  // Start with initial delay for page to fully load
  console.log('🔧 Waiting 2 seconds for page to load before starting retry logic...');
  setTimeout(() => {
    console.log('🔧 🚀 Starting retry logic now!');
    tryFill();
  }, 2000);
}

// ===== Auto-start conversation =====
function attemptAutoStart(platform) {
  console.log('🔧 Attempting auto-start for platform:', platform);

  if (platform === window.PlatformDetector.PLATFORMS.CLAUDE || platform === 'claude.ai') {
    attemptClaudeAutoStart();
  } else if (platform === window.PlatformDetector.PLATFORMS.CHATGPT || platform === 'chatgpt') {
    attemptChatGPTAutoStart();
  } else if (platform === window.PlatformDetector.PLATFORMS.GEMINI || platform === 'gemini') {
    attemptGeminiAutoStart();
  } else if (platform === window.PlatformDetector.PLATFORMS.GROK || platform === 'grok') {
    attemptGrokAutoStart();
  } else if (platform === window.PlatformDetector.PLATFORMS.PERPLEXITY || platform === 'perplexity') {
    attemptPerplexityAutoStart();
  }
}

function attemptClaudeAutoStart() {
  const sendSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]',
    'button:has(svg[data-testid="send-icon"])'
  ];
  let attempts = 0;
  const maxAttempts = 20;
  const interval = setInterval(() => {
    attempts++;
    try {
      for (const selector of sendSelectors) {
        const sendButton = document.querySelector(selector);
        if (sendButton && !sendButton.disabled) {
          console.log(`🔧 Found enabled Claude send button on attempt ${attempts}, clicking...`);
          clearInterval(interval);
          sendButton.click();
          return;
        }
      }
      console.log(`🔧 Send button not ready yet (attempt ${attempts}/${maxAttempts})`);
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('🔧 Give up waiting for send button — user can send manually');
      }
    } catch (error) {
      clearInterval(interval);
      console.log('🔧 Claude auto-start failed:', error);
    }
  }, 250);
}

function attemptChatGPTAutoStart() {
  try {
    const sendSelectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[type="submit"]'
    ];

    for (const selector of sendSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && !sendButton.disabled) {
        console.log('🔧 Found ChatGPT send button, clicking...');
        sendButton.click();
        return;
      }
    }

    console.log('🔧 No ChatGPT send button found or all disabled');

  } catch (error) {
    console.log('🔧 ChatGPT auto-start failed:', error);
  }
}

function attemptGeminiAutoStart() {
  try {
    const sendSelectors = [
      'button[aria-label*="Send"]',
      'button[type="submit"]'
    ];

    for (const selector of sendSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && !sendButton.disabled) {
        console.log('🔧 Found Gemini send button, clicking...');
        sendButton.click();
        return;
      }
    }

    console.log('🔧 No Gemini send button found or all disabled');

  } catch (error) {
    console.log('🔧 Gemini auto-start failed:', error);
  }
}

function attemptGrokAutoStart() {
  console.log('🤖 ThreadCub: Attempting Grok auto-start with retry logic...');

  const isGrokCom = window.location.hostname.includes('grok.com');
  console.log('🤖 ThreadCub: Is grok.com:', isGrokCom);

  // Grok-specific send button selectors
  // grok.com uses different button labels than x.com
  const sendSelectors = isGrokCom ? [
    'button[aria-label="Send message"]',
    'button[aria-label="Send"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[data-testid="send-button"]',
    'button[data-testid*="send"]',
    'button[type="submit"]',
    'button[class*="send"]',
    'button[class*="Send"]',
    // Fallback: find enabled button near textarea
    'form button:not([disabled])',
    'button:not([disabled])[class*="primary"]'
  ] : [
    'button[aria-label="Grok something"]',
    'button[aria-label*="Grok something"]',
    'button[aria-label*="Grok"]',
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

    for (const selector of sendSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const button = element.tagName === 'BUTTON' ? element : element.closest('button');
          if (button && !button.disabled && button.offsetHeight > 0) {
            const ariaLabel = button.getAttribute('aria-label');
            console.log(`🤖 Found Grok send button: "${ariaLabel}"`);
            button.focus();
            button.click();
            console.log('✅ Grok send button clicked!');
            return true;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Retry if not found
    if (attempts < maxAttempts) {
      setTimeout(tryFindAndClick, retryDelay);
      return false;
    }

    console.log('❌ Could not find Grok send button after all attempts');
    return false;
  }

  tryFindAndClick();
}

function attemptPerplexityAutoStart() {
  // Perplexity uses file upload - no auto-start needed
  console.log('🔮 Perplexity: Skipping auto-start - user uploads file manually');
}

// === END SECTION 2A ===

// Export functions to window
window.ContinuationSystem = {
  checkForContinuationData,
  executeStreamlinedContinuation,
  showStreamlinedNotification,
  fillInputFieldWithPrompt,
  fillInputFieldWithRetry,
  attemptAutoStart,
  attemptClaudeAutoStart,
  attemptChatGPTAutoStart,
  attemptGeminiAutoStart,
  attemptGrokAutoStart,
  attemptPerplexityAutoStart
};

console.log('🐻 ThreadCub: Continuation system module loaded');
// 📊 Safe GA tracking — swallows errors if service worker not yet awake
function safeTrackEvent(eventType, data) {
  try {
    chrome.runtime.sendMessage({ action: 'trackEvent', eventType, data }, () => {
      void chrome.runtime.lastError;
    });
  } catch (e) {}
}
