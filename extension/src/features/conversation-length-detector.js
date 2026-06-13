// ============================================================================
// CONVERSATION LENGTH DETECTOR
// Monitors conversation length and shows prompt to continue or download
// ============================================================================

class ConversationLengthDetector {
  constructor() {
    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    this.CONFIG = {
      EXCHANGE_THRESHOLD: 5,  // Show prompt after 5 user-assistant pairs (10 messages)
      CHECK_INTERVAL_MS: 2000, // Check every 2 seconds
      PROMPT_DISPLAY_DURATION_MS: 0, // 0 = persistent until user interacts
      STORAGE_KEY_PREFIX: 'threadcub_length_detector_',
      ANALYTICS_ENABLED: true,
    };

    // ============================================================================
    // STATE
    // ============================================================================
    this._platform = null;
    this._messageCount = 0;
    this._promptShown = false;
    this._checkInterval = null;
    this._selectors = null;
    this._initialized = false;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    this._detectPlatform();
    this._initializeSelectors();
    this._injectStyles();
    this._startMonitoring();
    this._initialized = true;

    console.log('[ConversationLengthDetector] Initialized for platform:', this._platform);
  }

  // ============================================================================
  // PLATFORM DETECTION
  // ============================================================================

  _detectPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('claude.ai')) {
      this._platform = 'claude';
    } else if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      this._platform = 'chatgpt';
    } else if (hostname.includes('gemini.google.com')) {
      this._platform = 'gemini';
    } else if (hostname.includes('chat.deepseek.com')) {
      this._platform = 'deepseek';
    } else if (hostname.includes('grok.x.ai') || hostname.includes('grok.com') || 
               (hostname.includes('x.com') && pathname.includes('/i/grok'))) {
      this._platform = 'grok';
    } else if (hostname.includes('perplexity.ai')) {
      this._platform = 'perplexity';
    } else if (hostname.includes('copilot.microsoft.com')) {
      this._platform = 'copilot';
    } else {
      this._platform = 'unknown';
    }
  }

  _initializeSelectors() {
    const selectorMap = {
      claude: {
        messageContainer: 'div[class*="font-claude-message"]',
        userMessage: 'div[data-is-streaming="false"][data-test-render-count]',
        assistantMessage: 'div[data-is-streaming="false"][data-test-render-count]',
      },
      chatgpt: {
        messageContainer: 'div[data-message-author-role]',
        userMessage: 'div[data-message-author-role="user"]',
        assistantMessage: 'div[data-message-author-role="assistant"]',
      },
      gemini: {
        messageContainer: 'message-content',
        userMessage: 'message-content[class*="user"]',
        assistantMessage: 'message-content[class*="model"]',
      },
      deepseek: {
        messageContainer: '[class*="ChatMessage"], [class*="ds-message"], div[class*="message-content"]',
        userMessage: '[data-role="user"]',
        assistantMessage: '[data-role="assistant"]',
      },
      grok: {
        messageContainer: 'div.message-bubble, div[class*="message-bubble"], article, div[role="article"], div[data-testid="cellInnerDiv"]',
        userMessage: 'div.message-bubble, article',
        assistantMessage: 'div.message-bubble, article',
      },
      perplexity: {
        messageContainer: 'div[class*="MessageContainer"], div[class*="prose"]',
        userMessage: 'div[class*="MessageContainer"]',
        assistantMessage: 'div[class*="MessageContainer"]',
      },
      copilot: {
        messageContainer: 'div[class*="turn"], cib-message',
        userMessage: 'div[class*="turn"][data-author="user"], cib-message[source="user"]',
        assistantMessage: 'div[class*="turn"][data-author="bot"], cib-message[source="bot"]',
      },
    };

    this._selectors = selectorMap[this._platform] || selectorMap.claude;
  }

  // ============================================================================
  // MESSAGE COUNTING
  // ============================================================================

  _countMessages() {
    const messages = document.querySelectorAll(this._selectors.messageContainer);
    return messages.length;
  }

  _getExchangeCount() {
    // An exchange is a user message + assistant response
    // So we divide total messages by 2
    return Math.floor(this._messageCount / 2);
  }

  // ============================================================================
  // MONITORING
  // ============================================================================

  _startMonitoring() {
    this._checkInterval = setInterval(() => {
      this._checkConversationLength();
    }, this.CONFIG.CHECK_INTERVAL_MS);

    // Also check immediately
    this._checkConversationLength();
  }

  _stopMonitoring() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  }

  _checkConversationLength() {
    // Update message count
    this._messageCount = this._countMessages();
    const exchangeCount = this._getExchangeCount();

    // Check if we should show the prompt
    if (
      exchangeCount >= this.CONFIG.EXCHANGE_THRESHOLD &&
      !this._promptShown &&
      !this._hasBeenDismissed()
    ) {
      this._showPrompt();
    }
  }

  // ============================================================================
  // STORAGE (for dismissal state)
  // ============================================================================

  _getStorageKey() {
    // Use conversation ID or URL to track dismissal per conversation
    const conversationId = this._getConversationId();
    return `${this.CONFIG.STORAGE_KEY_PREFIX}dismissed_${conversationId}`;
  }

  _getConversationId() {
    // Extract conversation ID from URL
    const url = window.location.href;
    const match = url.match(/\/chat\/([a-f0-9-]+)/);
    return match ? match[1] : 'unknown';
  }

  _hasBeenDismissed() {
    try {
      const key = this._getStorageKey();
      const dismissed = localStorage.getItem(key);
      return dismissed === 'true';
    } catch (error) {
      console.error('[ConversationLengthDetector] Error checking dismissal:', error);
      return false;
    }
  }

  _saveDismissalState() {
    try {
      const key = this._getStorageKey();
      localStorage.setItem(key, 'true');
    } catch (error) {
      console.error('[ConversationLengthDetector] Error saving dismissal:', error);
    }
  }

  // ============================================================================
  // PROMPT UI
  // ============================================================================

  _showPrompt() {
    console.log('[ConversationLengthDetector] Showing prompt');
    
    this._promptShown = true;
    
    // Track analytics
    this._trackEvent('length_prompt_shown', {
      platform: this._platform,
      messageCount: this._messageCount,
      exchangeCount: this._getExchangeCount(),
    });

    // Create and inject the prompt
    this._injectPrompt();

    // Auto-hide after duration if configured
    if (this.CONFIG.PROMPT_DISPLAY_DURATION_MS > 0) {
      setTimeout(() => {
        this._removePrompt();
      }, this.CONFIG.PROMPT_DISPLAY_DURATION_MS);
    }
  }

  _injectPrompt() {
    // Remove any existing prompt
    this._removePrompt();

    // Create prompt element
    const prompt = this._createPromptElement();
    
    // Inject into page
    document.body.appendChild(prompt);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      prompt.classList.add('threadcub-length-prompt-visible');
    });
  }

  _createPromptElement() {
    const prompt = document.createElement('div');
    prompt.className = 'threadcub-length-prompt';
    prompt.setAttribute('data-threadcub-element', 'true');
    
    prompt.innerHTML = `
      <div class="threadcub-length-prompt-content">
        <div class="threadcub-length-prompt-header">
          <svg class="threadcub-length-prompt-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H9v-2h2v2zm0-4H9V6h2v5z" fill="currentColor"/>
          </svg>
          <span class="threadcub-length-prompt-title">Long conversation detected</span>
          <button class="threadcub-length-prompt-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <p class="threadcub-length-prompt-message">
          This conversation is getting long. You may be approaching message limits.
        </p>
        <div class="threadcub-length-prompt-actions">
          <button class="threadcub-length-prompt-action threadcub-length-prompt-action-primary">
            Continue Chat
          </button>
          <button class="threadcub-length-prompt-action threadcub-length-prompt-action-secondary">
            Download
          </button>
        </div>
      </div>
    `;

    // Attach event listeners
    this._attachEventListeners(prompt);

    return prompt;
  }

  _attachEventListeners(prompt) {
    // Close button
    const closeBtn = prompt.querySelector('.threadcub-length-prompt-close');
    closeBtn.addEventListener('click', () => this._handleClose());

    // Continue Chat button
    const continueBtn = prompt.querySelector('.threadcub-length-prompt-action-primary');
    continueBtn.addEventListener('click', () => this._handleContinueClick());

    // Download button
    const downloadBtn = prompt.querySelector('.threadcub-length-prompt-action-secondary');
    downloadBtn.addEventListener('click', () => this._handleDownloadClick());
  }

  _removePrompt() {
    const prompt = document.querySelector('.threadcub-length-prompt');
    if (prompt) {
      prompt.classList.remove('threadcub-length-prompt-visible');
      setTimeout(() => prompt.remove(), 300); // Match animation duration
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  _handleClose() {
    console.log('[ConversationLengthDetector] Close button clicked');
    
    this._trackEvent('length_prompt_closed', {
      platform: this._platform,
      messageCount: this._messageCount,
    });

    this._removePrompt();
    this._saveDismissalState();
  }

  async _handleContinueClick() {
    console.log('[ConversationLengthDetector] Continue button clicked');
    
    this._trackEvent('length_prompt_continue_clicked', {
      platform: this._platform,
      messageCount: this._messageCount,
    });

    // Remove the prompt
    this._removePrompt();
    this._saveDismissalState();

    // Use the EXACT same logic as floating button's saveAndOpenConversation
    console.log('🐻 ThreadCub: Starting conversation save and open from: modal');

    // Get user auth token
    let userAuthToken = null;
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
      if (response && response.success) {
        userAuthToken = response.authToken;
        console.log('🔧 Auth token retrieved:', !!userAuthToken);
      }
    } catch (error) {
      console.log('🔧 Background script communication failed:', error);
    }

    try {
      // Extract conversation data
      const conversationData = await window.ConversationExtractor.extractConversation();
      
      // Use PlatformDetector.detectPlatform() - same as floating button!
      const targetPlatform = window.PlatformDetector.detectPlatform();
      console.log('🔍 Target platform:', targetPlatform);

      if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
        console.error('🐻 No conversation data found');
        this._showErrorMessage('No conversation found to continue');
        return;
      }

      console.log(`🐻 Extracted ${conversationData.messages.length} messages`);

      // Get session ID
      const sessionId = await window.StorageService.getOrCreateSessionId();
      
      const apiData = {
        conversationData: conversationData,
        source: conversationData.platform?.toLowerCase() || 'unknown',
        title: conversationData.title || 'Untitled Conversation',
        userAuthToken: userAuthToken,
        sessionId: sessionId
      };

      // Save to API
      try {
        const data = await window.ApiService.saveConversation(apiData);
        
        const summary = data.summary || window.ConversationExtractor.generateQuickSummary(conversationData.messages);
        const shareUrl = data.shareableUrl || `https://threadcub.com/api/share/${data.conversationId}`;
        
        const minimalPrompt = window.ConversationExtractor.generateContinuationPrompt(summary, shareUrl, conversationData.platform, conversationData);

        // Route to platform-specific handler (same as floating button)
        if (targetPlatform === 'chatgpt') {
          this._handleChatGPTFlow(minimalPrompt, shareUrl, conversationData);
        } else if (targetPlatform === 'claude') {
          this._handleClaudeFlow(minimalPrompt, shareUrl, conversationData);
        } else if (targetPlatform === 'gemini') {
          this._handleGeminiFlow(minimalPrompt, shareUrl, conversationData);
        } else if (targetPlatform === 'grok') {
          this._handleGrokFlow(minimalPrompt, shareUrl, conversationData);
        } else if (targetPlatform === 'deepseek') {
          this._handleDeepSeekFlow(minimalPrompt, shareUrl, conversationData);
        } else if (targetPlatform === 'perplexity') {
          this._handlePerplexityFlow(minimalPrompt, shareUrl, conversationData);
        } else if (targetPlatform === 'copilot') {
          this._handleCopilotFlow(minimalPrompt, shareUrl, conversationData);
        } else {
          // Default to ChatGPT if platform not recognized
          this._handleChatGPTFlow(minimalPrompt, shareUrl, conversationData);
        }

      } catch (apiError) {
        console.error('🐻 API call failed:', apiError);
        this._showErrorMessage('Could not save to ThreadCub. Please try the ThreadCub button instead.');
      }

    } catch (error) {
      console.error('🐻 Export error:', error);
      this._showErrorMessage('An error occurred: ' + error.message);
    }
  }

  // Platform-specific handlers (copied from floating button)
  _handleClaudeFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'claude',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      claudeFlow: true
    };

    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('✅ Claude continuation data stored');
        window.open('https://claude.ai/new', '_blank');
      })
      .catch(() => {
        window.StorageService.handleClaudeFlowFallback(continuationData);
      });
  }

  _handleChatGPTFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'chatgpt',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      chatGPTFlow: true
    };

    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('✅ ChatGPT continuation data stored');
        window.open('https://chatgpt.com/', '_blank');
      })
      .catch(() => {
        this._handleChatGPTFlowFallback(continuationData);
      });
  }

  _handleGeminiFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'gemini',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      geminiFlow: true
    };

    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('✅ Gemini continuation data stored');
        window.open('https://gemini.google.com/app', '_blank');
      })
      .catch(() => {
        this._handleGeminiFlowFallback(continuationData);
      });
  }

  _handleGrokFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'grok',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      grokFlow: true
    };

    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('✅ Grok continuation data stored');
        window.open(this._getGrokNewChatUrl(), '_blank');
      })
      .catch(() => {
        this._handleGrokFlowFallback(continuationData);
      });
  }

  _handleDeepSeekFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'deepseek',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      deepseekFlow: true
    };

    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('✅ DeepSeek continuation data stored');
        window.open('https://chat.deepseek.com/', '_blank');
      })
      .catch(() => {
        this._handleDeepSeekFlowFallback(continuationData);
      });
  }

  _handlePerplexityFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'perplexity',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      perplexityFlow: true
    };

    this._handlePerplexityFlowFallback(continuationData);
  }

  _handleCopilotFlow(continuationPrompt, shareUrl, conversationData) {
    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'copilot',
      timestamp: Date.now(),
      messages: conversationData.messages,
      totalMessages: conversationData.total_messages || conversationData.messages.length,
      title: conversationData.title,
      copilotFlow: true
    };

    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('✅ Copilot continuation data stored');
        window.open('https://copilot.microsoft.com/', '_blank');
      })
      .catch(() => {
        this._handleCopilotFlowFallback(continuationData);
      });
  }

  // Fallback handlers
  _handleChatGPTFlowFallback(continuationData) {
    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      window.open('https://chatgpt.com/', '_blank');
    } catch (error) {
      console.error('Failed to store continuation data:', error);
    }
  }

  _handleGeminiFlowFallback(continuationData) {
    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      window.open('https://gemini.google.com/app', '_blank');
    } catch (error) {
      console.error('Failed to store continuation data:', error);
    }
  }

  _handleGrokFlowFallback(continuationData) {
    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      window.open(this._getGrokNewChatUrl(), '_blank');
    } catch (error) {
      console.error('Failed to store continuation data:', error);
    }
  }

  _getGrokNewChatUrl() {
    const hostname = window.location.hostname;
    if (hostname.includes('grok.com')) return 'https://grok.com/';
    if (hostname.includes('grok.x.ai')) return 'https://grok.x.ai/';
    return 'https://x.com/i/grok';
  }

  _handleDeepSeekFlowFallback(continuationData) {
    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      window.open('https://chat.deepseek.com/', '_blank');
    } catch (error) {
      console.error('Failed to store continuation data:', error);
    }
  }

  _handlePerplexityFlowFallback(continuationData) {
    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      window.open('https://www.perplexity.ai/', '_blank');
    } catch (error) {
      console.error('Failed to store continuation data:', error);
    }
  }

  _handleCopilotFlowFallback(continuationData) {
    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      window.open('https://copilot.microsoft.com/', '_blank');
    } catch (error) {
      console.error('Failed to store continuation data:', error);
    }
  }

  _showErrorMessage(message) {
    // Create a simple toast notification for errors
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #ef4444;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      font-size: 14px;
      max-width: 320px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async _handleDownloadClick() {
    console.log('[ConversationLengthDetector] Download button clicked');
    
    // Track the event
    this._trackEvent('length_prompt_download_clicked', {
      platform: this._platform,
      messageCount: this._messageCount,
    });

    // Remove the prompt
    this._removePrompt();
    this._saveDismissalState();

    try {
      // Extract conversation data directly using ConversationExtractor
      console.log('[ConversationLengthDetector] Extracting conversation data...');
      
      if (!window.ConversationExtractor) {
        console.error('[ConversationLengthDetector] ConversationExtractor not available');
        this._showErrorMessage('Download system not ready. Please try again.');
        return;
      }
      
      const conversationData = await window.ConversationExtractor.extractConversation();
      
      if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
        console.error('[ConversationLengthDetector] No conversation data found');
        this._showErrorMessage('No conversation found to download.');
        return;
      }
      
      console.log(`[ConversationLengthDetector] Successfully extracted ${conversationData.messages.length} messages`);
      
      // Use the DownloadManager's createDownloadFromData function
      if (window.DownloadManager && window.DownloadManager.createDownloadFromData) {
        console.log('[ConversationLengthDetector] Triggering download via DownloadManager...');
        window.DownloadManager.createDownloadFromData(conversationData);
        console.log('[ConversationLengthDetector] Download completed successfully');
      } else {
        console.error('[ConversationLengthDetector] DownloadManager not available');
        this._showErrorMessage('Download system not ready. Please try again.');
      }
      
    } catch (error) {
      console.error('[ConversationLengthDetector] Download error:', error);
      this._showErrorMessage('Download failed: ' + error.message);
    }
  }

  _showErrorMessage(message) {
    // Simple error notification
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 24px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  _trackEvent(eventName, properties = {}) {
    if (!this.CONFIG.ANALYTICS_ENABLED) return;

    try {
      // Send to background script for analytics
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'trackEvent',
          event: eventName,
          properties: {
            ...properties,
            timestamp: new Date().toISOString(),
          },
        }, (response) => {
          // Handle response silently - don't throw on errors
          if (chrome.runtime.lastError) {
            console.log('[ConversationLengthDetector] Analytics tracking failed (extension context may be invalidated)');
          }
        });
      }
    } catch (error) {
      // Silently handle analytics errors - they shouldn't break functionality
      console.log('[ConversationLengthDetector] Analytics error (non-critical):', error.message);
    }
  }

  // ============================================================================
  // STYLES
  // ============================================================================

  _injectStyles() {
    // Check if styles already injected
    if (document.getElementById('threadcub-length-detector-styles')) return;

    const style = document.createElement('style');
    style.id = 'threadcub-length-detector-styles';
    style.textContent = `
      .threadcub-length-prompt {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        max-width: 400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }

      .threadcub-length-prompt-visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .threadcub-length-prompt-content {
        padding: 20px;
      }

      .threadcub-length-prompt-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .threadcub-length-prompt-icon {
        color: #f59e0b;
        flex-shrink: 0;
      }

      .threadcub-length-prompt-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        flex: 1;
      }

      .threadcub-length-prompt-close {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .threadcub-length-prompt-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .threadcub-length-prompt-message {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
        margin: 0 0 16px 0;
      }

      .threadcub-length-prompt-actions {
        display: flex;
        gap: 8px;
      }

      .threadcub-length-prompt-action {
        flex: 1;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      .threadcub-length-prompt-action-primary {
        background: #2563eb;
        color: white;
      }

      .threadcub-length-prompt-action-primary:hover {
        background: #1d4ed8;
      }

      .threadcub-length-prompt-action-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .threadcub-length-prompt-action-secondary:hover {
        background: #e5e7eb;
      }
    `;

    document.head.appendChild(style);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy() {
    this._stopMonitoring();
    this._removePrompt();
    
    const styles = document.getElementById('threadcub-length-detector-styles');
    if (styles) styles.remove();
    
    console.log('[ConversationLengthDetector] Destroyed');
  }

  // ============================================================================
  // STATIC INIT METHOD (for app-initializer.js)
  // ============================================================================

  static init() {
    console.log('[ConversationLengthDetector] Static init() called');
    
    if (window.conversationLengthDetector) {
      console.log('[ConversationLengthDetector] Instance already exists');
      return window.conversationLengthDetector;
    }
    
    window.conversationLengthDetector = new ConversationLengthDetector();
    return window.conversationLengthDetector;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Export the class to window for app-initializer to use
window.ConversationLengthDetector = ConversationLengthDetector;
console.log('[ConversationLengthDetector] Class exported to window');

// ============================================================================
// TESTING HELPERS (bypasses context isolation for console testing)
// ============================================================================

/**
 * These event listeners allow testing from the browser console despite
 * Chrome extension context isolation. The content script and page console
 * run in different JavaScript contexts, so we use custom events as a bridge.
 * 
 * USAGE FROM CONSOLE:
 * 
 * 1. Check if detector is running:
 *    document.dispatchEvent(new CustomEvent('threadcub-check-detector'));
 * 
 * 2. Show current status (platform, message count, etc):
 *    document.dispatchEvent(new CustomEvent('threadcub-detector-status'));
 * 
 * 3. Manually trigger the prompt (for testing):
 *    document.dispatchEvent(new CustomEvent('threadcub-trigger-prompt'));
 */

// Test Helper 1: Check if detector exists and is initialized
document.addEventListener('threadcub-check-detector', () => {
  console.log('=== CONVERSATION LENGTH DETECTOR CHECK ===');
  console.log('Class exists:', !!window.ConversationLengthDetector);
  console.log('Instance exists:', !!window.conversationLengthDetector);
  
  if (window.conversationLengthDetector) {
    console.log('✅ Detector is running!');
    console.log('Platform:', window.conversationLengthDetector._platform);
    console.log('Initialized:', window.conversationLengthDetector._initialized);
  } else {
    console.log('❌ Detector instance not found');
  }
});

// Test Helper 2: Show detailed status
document.addEventListener('threadcub-detector-status', () => {
  if (!window.conversationLengthDetector) {
    console.log('❌ Detector not initialized');
    return;
  }
  
  const detector = window.conversationLengthDetector;
  console.log('=== DETECTOR STATUS ===');
  console.log('Platform:', detector._platform);
  console.log('Initialized:', detector._initialized);
  console.log('Monitoring active:', !!detector._checkInterval);
  console.log('Current message count:', detector._messageCount);
  console.log('Exchange count:', detector._getExchangeCount());
  console.log('Prompt shown:', detector._promptShown);
  console.log('Threshold (exchanges):', detector.CONFIG.EXCHANGE_THRESHOLD);
  console.log('Check interval (ms):', detector.CONFIG.CHECK_INTERVAL_MS);
  console.log('Conversation ID:', detector._getConversationId());
  console.log('Dismissed:', detector._hasBeenDismissed());
});

// Test Helper 3: Manually trigger the prompt (bypass message count check)
document.addEventListener('threadcub-trigger-prompt', () => {
  if (!window.conversationLengthDetector) {
    console.log('❌ Detector not initialized');
    return;
  }
  
  console.log('🧪 Manually triggering length prompt...');
  window.conversationLengthDetector._showPrompt();
  console.log('✅ Prompt should now be visible!');
});

console.log('[ConversationLengthDetector] Test helpers registered. Use these commands:');
console.log('  document.dispatchEvent(new CustomEvent("threadcub-check-detector"));');
console.log('  document.dispatchEvent(new CustomEvent("threadcub-detector-status"));');
console.log('  document.dispatchEvent(new CustomEvent("threadcub-trigger-prompt"));');