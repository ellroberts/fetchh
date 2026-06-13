// === SECTION 4A-4E: Floating Button Integration with Modular Architecture ===

// The ThreadCubFloatingButton class is now loaded from src/core/floating-button.js
// This section provides the conversation functionality that the floating button needs

// === DOWNLOAD FUNCTIONS ===

function createDownloadFromData(conversationData) {
  try {
    const tagsData = {
      title: conversationData.title || 'ThreadCub Conversation',
      url: conversationData.url || window.location.href,
      platform: conversationData.platform || 'Unknown',
      exportDate: new Date().toISOString(),
      totalMessages: conversationData.messages ? conversationData.messages.length : 0,
      messages: conversationData.messages || []
    };
    
    const filename = window.Utilities.generateSmartFilename(conversationData);
    
    const blob = new Blob([JSON.stringify(tagsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Add tagging below this line

    // 🐻 Track JSON export
    chrome.runtime.sendMessage({
      action: 'trackEvent',
      eventType: 'conversation_exported',
      data: {
        format: 'json',
        conversation: {
          tags: conversationData.tags || [],
          anchors: conversationData.anchors || [],
          messages: conversationData.messages || [],
          platform: conversationData.platform || 'unknown'
        }
      }
    });
    
    console.log('🐻 ThreadCub: JSON download completed with filename:', filename);
  } catch (error) {
    console.error('🐻 ThreadCub: Error in createDownloadFromData:', error);
    throw error;
  }
}


// === SECTION 4A-4E: Floating Button Integration with Modular Architecture ===

function enhanceFloatingButtonWithConversationFeatures() {
  if (window.threadcubButton && typeof window.threadcubButton === 'object') {
    console.log('🐻 ThreadCub: Enhancing modular floating button with conversation features...');
    
    // Override with DIRECT API CALLS + AuthService token
    window.threadcubButton.saveAndOpenConversation = async function(source = 'floating') {
      console.log('🐻 ThreadCub: saveAndOpenConversation called from:', source);

      // ===== GET USER AUTH TOKEN VIA AuthService =====
      console.log('🔐 Getting user auth token via AuthService...');
      let userAuthToken = null;

      try {
        if (window.AuthService) {
          userAuthToken = await window.AuthService.getToken();
          console.log('🔐 Auth token from AuthService:', !!userAuthToken);
        }
        // Fallback to old method if AuthService token not available
        if (!userAuthToken) {
          const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
          if (response && response.success) {
            userAuthToken = response.authToken;
            console.log('🔐 Auth token retrieved from ThreadCub tab (fallback):', !!userAuthToken);
          }
        }
      } catch (error) {
        console.log('🔐 Auth token retrieval failed:', error);
      }

      const now = Date.now();
      if (this.isExporting || (now - this.lastExportTime) < 2000) {
        console.log('🐻 ThreadCub: Export already in progress');
        return;
      }
      
      this.isExporting = true;
      this.lastExportTime = now;
      
      try {
        console.log('🐻 ThreadCub: Extracting conversation data...');
        
        // Extract conversation using centralized module
        conversationData = await window.ConversationExtractor.extractConversation();
                
        if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
          console.error('🐻 ThreadCub: No conversation data found');
          this.showErrorToast('No conversation found to save');
          this.isExporting = false;
          return;
        }
        
        console.log(`🐻 ThreadCub: Successfully extracted ${conversationData.messages.length} messages`);
        
        this.lastConversationData = conversationData;

        // Get session ID for anonymous conversation tracking
        const sessionId = await window.StorageService.getOrCreateSessionId();
        
        // FIXED: Use DIRECT fetch() call to API (same as working main branch) + AUTH TOKEN
        const apiData = {
            conversationData: conversationData,
            source: conversationData.platform?.toLowerCase() || 'unknown',
            title: conversationData.title || 'Untitled Conversation',
            userAuthToken: userAuthToken,
            session_id: sessionId,
            capture_method: 'save',
            parent_conversation_id: null
        };
        
        console.log('🐻 ThreadCub: Making DIRECT API call to ThreadCub...');
        
        try {
          // API call via ApiService
          const data = await window.ApiService.saveConversation(apiData);
          
          // Generate continuation prompt with real API data
          const summary = data.summary || window.ConversationExtractor.generateQuickSummary(conversationData.messages);
          const shareUrl = data.shareableUrl || `https://threadcub.com/api/share/${data.conversationId}`;

          const minimalPrompt = window.ConversationExtractor.generateContinuationPrompt(summary, shareUrl, conversationData.platform, conversationData);
          
          const targetPlatform = window.PlatformDetector.detectPlatform();
          
          if (targetPlatform === 'chatgpt') {
            console.log('🤖 ThreadCub: Routing to ChatGPT flow (with file download)');
            this.handleChatGPTFlow(minimalPrompt, shareUrl, conversationData);
          } else if (targetPlatform === 'claude') {
            console.log('🤖 ThreadCub: Routing to Claude flow (no file download)');
            this.handleClaudeFlow(minimalPrompt, shareUrl, conversationData);
          } else if (targetPlatform === 'gemini') {
            console.log('🤖 ThreadCub: Routing to Gemini flow (with file download)');
            this.handleGeminiFlow(minimalPrompt, shareUrl, conversationData);
          } else if (targetPlatform === 'grok') {
            console.log('🤖 ThreadCub: Routing to Grok flow (with file download)');
            this.handleGrokFlow(minimalPrompt, shareUrl, conversationData);
          } else if (targetPlatform === 'deepseek') {
            console.log('🔵 ThreadCub: Routing to DeepSeek flow (with file download)');
            this.handleDeepSeekFlow(minimalPrompt, shareUrl, conversationData);
          } else if (targetPlatform === 'perplexity') {
            console.log('🔮 ThreadCub: Routing to Perplexity flow (URL-based)');
            this.handlePerplexityFlow(minimalPrompt, shareUrl, conversationData);
          } else {
            console.log('🤖 ThreadCub: Unknown platform, defaulting to ChatGPT flow');
            this.handleChatGPTFlow(minimalPrompt, shareUrl, conversationData);
          }

          this.setBearExpression('happy');
          setTimeout(() => {
            if (this.currentBearState !== 'default') {
              this.setBearExpression('default');
            }
          }, 2000);

          this.isExporting = false;
          
        } catch (apiError) {
          console.error('🐻 ThreadCub: Direct API call failed:', apiError);
          console.log('🐻 ThreadCub: Falling back to direct continuation without API save...');
          
          // FALLBACK: Skip API save and go straight to continuation
          this.handleDirectContinuation(conversationData);
          this.isExporting = false;
          return;
        }

      } catch (error) {
        console.error('🐻 ThreadCub: Export error:', error);
        this.showErrorToast('Export failed: ' + error.message);
        this.isExporting = false;
      }
    };
    
    // UNCHANGED: Download function is fine as-is
    window.threadcubButton.downloadConversationJSON = async function() {
      console.log('🐻 ThreadCub: Starting JSON download...');
      
      try {
        console.log('🐻 ThreadCub: Extracting conversation data for download...');
        
        // Extract conversation using centralized module
        conversationData = await window.ConversationExtractor.extractConversation();
        const platform = window.PlatformDetector.detectPlatform();

        if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
          console.error('🐻 ThreadCub: No conversation data found');

          const fallbackData = {
            title: document.title || 'AI Conversation',
            url: window.location.href,
            platform: window.PlatformDetector.getPlatformName(platform),
            exportDate: new Date().toISOString(),
            totalMessages: 0,
            messages: [],
            note: 'No conversation messages could be extracted from this page'
          };
          
          createDownloadFromData(fallbackData);
          this.showSuccessToast('Downloaded basic page info');
          return;
        }
        
        console.log(`🐻 ThreadCub: Successfully extracted ${conversationData.messages.length} messages for download`);
        
        createDownloadFromData(conversationData);
        this.showSuccessToast('Conversation downloaded successfully!');
        
      } catch (error) {
        console.error('🐻 ThreadCub: Download error:', error);
        
        const emergencyData = {
          title: 'ThreadCub Emergency Download',
          url: window.location.href,
          platform: 'Unknown',
          exportDate: new Date().toISOString(),
          totalMessages: 0,
          messages: [],
          error: error.message,
          note: 'An error occurred during conversation extraction'
        };
        
        createDownloadFromData(emergencyData);
        this.showErrorToast('Download completed with errors');
      }
    };
    
    console.log('🐻 ThreadCub: ✅ Floating button enhanced with DIRECT API calls + AuthService token');
  }
}

window.addEventListener('message', (event) => {
  // Handle continuation data from dashboard
  if (event.data.type === 'THREADCUB_DASHBOARD_MESSAGE' && event.data.action === 'storeContinuationData') {
    console.log('🔗 Content script received dashboard message:', event.data.data)

    // Send to background script using chrome.runtime
    chrome.runtime.sendMessage({
      action: 'storeContinuationData',
      ...event.data.data
    }, (response) => {
      console.log('📤 Background script response:', response)
    })
  }

  // Handle auth callback token from threadcub.com callback page
  if (event.data.type === 'THREADCUB_AUTH_CALLBACK' && event.data.token) {
    console.log('🔐 Content script received auth callback token');
    console.log('🔐 Content script received encryptionKey:', !!event.data.encryptionKey);

    chrome.runtime.sendMessage({
      action: 'storeAuthToken',
      token: event.data.token,
      encryptionKey: event.data.encryptionKey || null
    }, (response) => {
      console.log('🔐 Auth token stored via background:', response);
    });
  }
})

// === END SECTION 4A-4E ===

// Export download manager functions to window for global access
window.DownloadManager = {
  createDownloadFromData,
  enhanceFloatingButtonWithConversationFeatures
};

console.log('🐻 ThreadCub: Download manager module loaded');