// === SECTION 0: Analytics & Auth Integration ===

// Import CryptoJS, analytics service, auth service, and crypto service
importScripts('vendor/crypto-js.min.js');
importScripts('src/services/analytics.js');
importScripts('src/services/auth-service.js');
importScripts('src/services/crypto-service.js');

// Track installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🐻 Background: Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    console.log('🐻 Background: First install - opening welcome page');
    // Track installation
    self.Analytics.trackInstall();
    
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  } else if (details.reason === 'update') {
    console.log('🐻 Background: Extension updated from', details.previousVersion);
    // Track update
    self.Analytics.trackUpdate(details.previousVersion);
  }
});

// === SECTION 1: Core Message Handler ===

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🐻 Background: Received message:', request.action);

  switch (request.action) {
    case 'download':
      handleDownload(request, sendResponse);
      return true;
    
    case 'retryPendingQueue':
      flushPendingQueue()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getPendingCount':
      chrome.storage.local.get(TC_PENDING_KEY).then(stored => {
        const queue = stored[TC_PENDING_KEY] || [];
        sendResponse({ success: true, count: queue.length });
      });
      return true;

    case 'saveConversation':
      handleSaveConversation(request.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'openAndInject':
      handleOpenAndInject(request.url, request.prompt)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'storeContinuationData':
      handleStoreContinuationData(request, sender, sendResponse);
      return false;
    
    case 'getContinuationData':
      handleGetContinuationData(sender, sendResponse);
      return true;
    
    case 'getAuthToken':
      handleGetAuthToken(sendResponse);
      return true;

    case 'storeAuthToken':
      handleStoreAuthToken(request, sendResponse);
      return true;

    case 'getStoredAuthToken':
      handleGetStoredAuthToken(sendResponse);
      return true;

    case 'validateAuthToken':
      handleValidateAuthToken(sendResponse);
      return true;

    case 'authLogout':
      handleAuthLogout(sendResponse);
      return true;

    case 'clearLocalConversations':
      handleClearLocalConversations(sendResponse);
      return true;

    case 'getConversationCount':
      handleGetConversationCount(sendResponse);
      return true;

    case 'trackEvent':
      handleTrackEvent(request, sendResponse);
      return false;
    
    case 'exportComplete':
      console.log('🐻 Background: Export completed notification received');
      break;
    
    case 'buttonStatusChanged':
      console.log('🐻 Background: Button status changed:', request.visible);
      break;
    
    default:
      console.log('🐻 Background: Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// === SECTION 1.5: Analytics Event Handler ===

function handleTrackEvent(request, sendResponse) {
  try {
    const { eventType, data } = request;
    
    console.log('🐻 Background: Tracking event:', eventType);
    
    switch (eventType) {
      case 'tag_created':
        self.Analytics.trackTagCreated(data);
        break;
      
      case 'anchor_created':
        self.Analytics.trackAnchorCreated(data);
        break;
      
      case 'conversation_exported':
        self.Analytics.trackExport(data.format, data.conversation);
        break;
      
      case 'side_panel_opened':
        self.Analytics.trackSidePanelOpened(data.platform);
        break;
      
      case 'platform_detected':
        self.Analytics.trackPlatformDetected(data.platform);
        break;
      
      case 'conversation_extracted':
        self.Analytics.trackConversationExtracted(data);
        break;
      
      case 'floating_button_clicked':
        // 📊 GA: floating button clicked — action = save | continue | download | tag
        self.Analytics.trackFloatingButtonClicked(data.platform);
        break;
      
      case 'continuation_started':
        // 📊 GA: continuation started (legacy event)
        self.Analytics.trackContinuationStarted(data.platform);
        break;

      case 'save_success':
        // 📊 GA: save succeeded — conversation saved to ThreadCub
        console.log('📊 Analytics: Save success', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('save_success', data);
        break;

      case 'save_failed':
        // 📊 GA: save failed — reason = no_conversation_data | no_messages | api_error | unexpected_error
        console.log('📊 Analytics: Save failed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('save_failed', data);
        break;

      case 'continue_success':
        // 📊 GA: continue succeeded — platform = chatgpt | claude | gemini | grok | deepseek | perplexity
        console.log('📊 Analytics: Continue success', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('continue_success', data);
        break;

      case 'continue_failed':
        // 📊 GA: continue failed — reason = no_conversation_data | no_messages | api_error_fallback | unexpected_error
        console.log('📊 Analytics: Continue failed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('continue_failed', data);
        break;

      case 'popup_opened':
        // 📊 GA: popup opened — auth_state = authenticated | unauthenticated
        console.log('📊 Analytics: Popup opened', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_opened', data);
        break;

      case 'popup_login_clicked':
        // 📊 GA: login button clicked from popup (unauthenticated view)
        console.log('📊 Analytics: Popup login clicked');
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_login_clicked', data);
        break;

      case 'popup_logout_clicked':
        // 📊 GA: logout button clicked from popup (authenticated view)
        console.log('📊 Analytics: Popup logout clicked');
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_logout_clicked', data);
        break;

      case 'popup_dashboard_opened':
        // 📊 GA: dashboard opened from popup
        console.log('📊 Analytics: Popup dashboard opened');
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_dashboard_opened', data);
        break;

      case 'popup_discord_clicked':
        // 📊 GA: discord link clicked from popup — auth_state = authenticated | unauthenticated
        console.log('📊 Analytics: Popup discord clicked', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_discord_clicked', data);
        break;

      case 'popup_onboarding_triggered':
        // 📊 GA: quick tips / onboarding triggered from popup — auth_state = authenticated | unauthenticated
        console.log('📊 Analytics: Popup onboarding triggered', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_onboarding_triggered', data);
        break;

      case 'popup_floating_toggle':
        // 📊 GA: floating button toggled from popup — new_state = hidden | visible
        console.log('📊 Analytics: Popup floating toggle', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('popup_floating_toggle', data);
        break;

      case 'onboarding_started':
        // 📊 GA: onboarding tour started
        console.log('📊 Analytics: Onboarding started');
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('onboarding_started', data);
        break;

      case 'onboarding_step_viewed':
        // 📊 GA: onboarding step viewed — step = 0-3, step_name = intro | bear_menu | pin_toolbar | pawmarks
        console.log('📊 Analytics: Onboarding step viewed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('onboarding_step_viewed', data);
        break;

      case 'onboarding_completed':
        // 📊 GA: onboarding completed — user finished all 4 steps
        console.log('📊 Analytics: Onboarding completed');
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('onboarding_completed', data);
        break;

      case 'onboarding_dismissed':
        // 📊 GA: onboarding dismissed — dismissed_at_step shows where they dropped off
        console.log('📊 Analytics: Onboarding dismissed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('onboarding_dismissed', data);
        break;

      case 'tagging_panel_opened':
        // 📊 GA: tagging (pawmarks) side panel opened
        console.log('📊 Analytics: Tagging panel opened', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('tagging_panel_opened', data);
        break;

      case 'tagging_panel_closed':
        // 📊 GA: tagging (pawmarks) side panel closed
        console.log('📊 Analytics: Tagging panel closed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('tagging_panel_closed', data);
        break;

      case 'tagging_tag_created':
        // 📊 GA: tag created — category and total tag count
        console.log('📊 Analytics: Tag created', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('tagging_tag_created', data);
        break;

      case 'tagging_tag_removed':
        // 📊 GA: tag removed — remaining tag count
        console.log('📊 Analytics: Tag removed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('tagging_tag_removed', data);
        break;

      case 'anchor_created':
        // 📊 GA: anchor created — platform tracked
        console.log('📊 Analytics: Anchor created', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('anchor_created', data);
        break;

      case 'anchor_jump_attempted':
        // 📊 GA: anchor jump attempted — success = true | false, method = selector | message-search | full-text-search | index | none
        console.log('📊 Analytics: Anchor jump attempted', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('anchor_jump_attempted', data);
        break;

      case 'side_panel_tab_switched':
        // 📊 GA: side panel tab switched — tab = tags | anchors
        console.log('📊 Analytics: Side panel tab switched', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('side_panel_tab_switched', data);
        break;

      case 'side_panel_priority_filter_changed':
        // 📊 GA: side panel priority filter changed — filter = all | high | medium | low
        console.log('📊 Analytics: Side panel priority filter changed', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('side_panel_priority_filter_changed', data);
        break;

      case 'side_panel_tag_copied':
        // 📊 GA: tag text copied from side panel
        console.log('📊 Analytics: Side panel tag copied', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('side_panel_tag_copied', data);
        break;

      case 'side_panel_tag_jumped':
        // 📊 GA: tag jump-to clicked from side panel
        console.log('📊 Analytics: Side panel tag jumped', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('side_panel_tag_jumped', data);
        break;

      case 'side_panel_anchor_jumped':
        // 📊 GA: anchor jump-to clicked from side panel
        console.log('📊 Analytics: Side panel anchor jumped', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('side_panel_anchor_jumped', data);
        break;

      case 'side_panel_anchor_deleted':
        // 📊 GA: anchor deleted from side panel
        console.log('📊 Analytics: Side panel anchor deleted', data);
        if (self.Analytics.trackEvent) self.Analytics.trackEvent('side_panel_anchor_deleted', data);
        break;
      
      case 'length_prompt_shown':
        // Track when the 10+ message modal is shown
        console.log('📊 Analytics: Length prompt shown', data);
        if (self.Analytics.trackEvent) {
          self.Analytics.trackEvent('length_prompt_shown', data);
        }
        break;
      
      case 'length_prompt_download_clicked':
        // Track when user clicks Download in the modal
        console.log('📊 Analytics: Length prompt download clicked', data);
        if (self.Analytics.trackEvent) {
          self.Analytics.trackEvent('length_prompt_download_clicked', data);
        }
        break;
      
      case 'length_prompt_continue_clicked':
        // Track when user clicks Continue Chat in the modal
        console.log('📊 Analytics: Length prompt continue clicked', data);
        if (self.Analytics.trackEvent) {
          self.Analytics.trackEvent('length_prompt_continue_clicked', data);
        }
        break;
      
      case 'length_prompt_dismissed':
        // Track when user dismisses the modal
        console.log('📊 Analytics: Length prompt dismissed', data);
        if (self.Analytics.trackEvent) {
          self.Analytics.trackEvent('length_prompt_dismissed', data);
        }
        break;
      
      case 'error':
        self.Analytics.trackError(data.errorType, data.errorMessage);
        break;
      
      default:
        console.log('🐻 Background: Unknown tracking event:', eventType);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('🐻 Background: Error tracking event:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// === SECTION 2: Download Handler ===

function handleDownload(request, sendResponse) {
  console.log('🐻 Background: Starting download process');
  console.log('🐻 Background: Data received:', request.data);
  console.log('🐻 Background: Filename:', request.filename);

  try {
    // Validate the data
    if (!request.data) {
      console.error('🐻 Background: No data provided for download');
      setTimeout(() => sendResponse({ success: false, error: 'No data provided' }), 0);
      return;
    }

    if (!request.filename) {
      console.error('🐻 Background: No filename provided for download');
      setTimeout(() => sendResponse({ success: false, error: 'No filename provided' }), 0);
      return;
    }

    // Create the JSON string
    const jsonString = JSON.stringify(request.data, null, 2);
    console.log('🐻 Background: JSON string length:', jsonString.length);

    // Convert to base64 data URL
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    const dataUrl = `data:application/json;charset=utf-8;base64,${base64Data}`;
    console.log('🐻 Background: Created data URL, length:', dataUrl.length);

    // Start the download
    chrome.downloads.download({
      url: dataUrl,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('🐻 Background: Download failed:', chrome.runtime.lastError);
        setTimeout(() => sendResponse({ success: false, error: chrome.runtime.lastError.message }), 0);
      } else {
        console.log('🐻 Background: Download started with ID:', downloadId);
        setTimeout(() => sendResponse({ success: true, downloadId: downloadId }), 0);
      }
    });

  } catch (error) {
    console.error('🐻 Background: Error during download:', error);
    setTimeout(() => sendResponse({ success: false, error: error.message }), 0);
  }
}

// === SECTION 3: API Handler ===

// ⚠️ CHANGE BACK TO PRODUCTION BEFORE RELOADING EXTENSION FOR NORMAL USE
// Local dev toggle — set BG_IS_LOCAL_DEV = false for production
const BG_IS_LOCAL_DEV = false;
const BG_API_BASE = BG_IS_LOCAL_DEV
  ? 'http://localhost:3000/api'
  : 'https://threadcub.com/api';

console.log(`🐻 Background: BG_API_BASE = ${BG_API_BASE} (BG_IS_LOCAL_DEV=${BG_IS_LOCAL_DEV})`);

// Temp flag: set to false to skip encryption entirely (for quick testing)
const BG_USE_ENCRYPTION = true;

async function handleSaveConversation(data) {
  try {
    console.log('🐻 Background.handleSaveConversation: data keys:', Object.keys(data));
    console.log('🐻 Background.handleSaveConversation: API URL:', `${BG_API_BASE}/conversations/save`);

    // Get auth token from storage for Bearer auth
    const authToken = await self.AuthService.getToken();
    console.log('🐻 Background: Auth token available:', !!authToken);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log('🐻 Background: Added Authorization header');
    }

    let didAttemptEncrypted = false;

    // -----------------------------------------------------------------
    // Step 1: Try sending encrypted payload (if encryption is enabled)
    // Backend expects: { encrypted_payload: "base64...", title?, source? }
    // -----------------------------------------------------------------
    if (BG_USE_ENCRYPTION) {
      try {
        const CryptoJSLib = (typeof CryptoJS !== 'undefined') ? CryptoJS :
                            (typeof self !== 'undefined' && self.CryptoJS) ? self.CryptoJS : null;

        if (CryptoJSLib && CryptoJSLib.AES) {
          console.log('🔒 Background.handleSaveConversation: Encrypting payload before send...');

          // Get per-user encryption key — no fallback (hardcoded key removed).
          // If no key is available, skip encryption and fall through to plaintext send.
          let secretKey = null;
          try {
            if (self.AuthService) {
              secretKey = await self.AuthService.getEncryptionKey();
              if (secretKey) {
                console.log('🔒 Background: Using per-user encryption key');
              } else {
                console.log('🔒 Background: No per-user key — skipping encryption, sending plaintext');
              }
            }
          } catch (keyError) {
            console.warn('🔒 Background: Error fetching per-user key — skipping encryption:', keyError.message);
          }

          if (secretKey) {
            const conversationData = data.conversationData || data;
            const encryptedBase64 = CryptoJSLib.AES.encrypt(
              JSON.stringify(conversationData),
              secretKey
            ).toString();

            // Match backend schema: source (not platform), title, encrypted_payload
            const encryptedPayload = {
              encrypted_payload: encryptedBase64,
              source: data.source || data.conversationData?.platform?.toLowerCase() || 'unknown',
              title: data.title || data.conversationData?.title || 'Untitled',
              session_id: data.sessionId || null
            };
            console.log('🔒 Background.handleSaveConversation: session_id included:', !!encryptedPayload.session_id);

            console.log('🔒 Background.handleSaveConversation: Sending encrypted:', JSON.stringify({
              encrypted_payload: encryptedBase64.substring(0, 60) + '...[' + encryptedBase64.length + ' chars total]',
              source: encryptedPayload.source,
              title: encryptedPayload.title
            }));

            didAttemptEncrypted = true;
            const encResponse = await fetch(`${BG_API_BASE}/conversations/save`, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(encryptedPayload)
            });

            console.log('🔒 Background.handleSaveConversation: Encrypted POST status:', encResponse.status);

            if (encResponse.status === 401) {
              console.log('🐻 Background: Auth token expired, clearing...');
              await self.AuthService.clearToken();
              throw new Error('Authentication expired. Please log in again.');
            }

            if (encResponse.ok) {
              const result = await encResponse.json();
              console.log('✅ Background: Encrypted API call successful:', result);
              return result;
            }

            const errBody = await encResponse.text();
            console.warn(
              `🔒 Background.handleSaveConversation: Encrypted send failed (status ${encResponse.status}) — falling back.`,
              '\n  Response body:', errBody
            );
            // Fall through to unencrypted send below
          } // end if (secretKey)
        } else {
          console.warn('🔒 Background.handleSaveConversation: CryptoJS not available, skipping encryption');
        }
      } catch (encryptError) {
        if (encryptError.message.includes('Authentication expired')) {
          throw encryptError;
        }
        console.warn('🔒 Background.handleSaveConversation: Encryption/send error, falling back:', encryptError.message);
      }
    } else {
      console.log('🔒 Background.handleSaveConversation: BG_USE_ENCRYPTION=false, sending unencrypted');
    }

    // -----------------------------------------------------------------
    // Step 2: Send original unencrypted payload (primary path or fallback)
    // Server expects: { conversationData: { messages, title?, source? }, title?, source? }
    // -----------------------------------------------------------------
    if (didAttemptEncrypted) {
      console.log('🔒 Background.handleSaveConversation: Retrying with original unencrypted payload...');
    }

    const convData = data.conversationData || data;
    const source = data.source || convData.source || convData.platform?.toLowerCase() || 'unknown';
    const title  = data.title  || convData.title  || 'Untitled';

    const unencryptedPayload = {
      conversationData: {
        messages: convData.messages || [],
        title: title,
        source: source
      },
      title: title,
      source: source,
      session_id: data.sessionId || null,
      capture_method: data.capture_method || 'save',
      parent_conversation_id: data.parent_conversation_id || null
    };
    console.log('🔍 Background.handleSaveConversation: session_id in unencrypted payload:', !!unencryptedPayload.session_id);

    console.log('🔍 Background.handleSaveConversation: Unencrypted payload:', JSON.stringify(unencryptedPayload, null, 2));

    const response = await fetch(`${BG_API_BASE}/conversations/save`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(unencryptedPayload)
    });

    console.log('🔍 Background.handleSaveConversation: Unencrypted POST status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🐻 Background.handleSaveConversation: Unencrypted send also failed!',
                     'Status:', response.status, '| Body:', errorText);

      if (response.status === 401) {
        console.log('🐻 Background: Auth token expired, clearing...');
        await self.AuthService.clearToken();
        throw new Error('Authentication expired. Please log in again.');
      }

      if (response.status === 405) {
        const allowedMethods = response.headers.get('Allow');
        console.error('🐻 Background: Allowed methods:', allowedMethods);
        throw new Error(`Method not allowed. Allowed methods: ${allowedMethods || 'unknown'}`);
      }

      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Background: API call successful (unencrypted fallback):', result);

    return result;

  } catch (error) {
    console.error('🐻 Background: Error in handleSaveConversation:', error);

    // Don't queue auth errors — user needs to log in again
    if (!error.message.includes('Authentication expired')) {
      await queueFailedSave(data);
    }

    throw error;
  }
}

// === SECTION 3b: Offline Queue & Retry Logic ===

const TC_PENDING_KEY = 'tc_pending_saves';
const TC_QUEUE_MAX   = 10;

/**
 * Store a failed save payload in the offline queue.
 * Caps at TC_QUEUE_MAX items (oldest dropped first).
 */
async function queueFailedSave(data) {
  try {
    const stored = await chrome.storage.local.get(TC_PENDING_KEY);
    const queue  = stored[TC_PENDING_KEY] || [];

    queue.push({ data, queuedAt: Date.now(), attempts: 1 });

    // Drop oldest if over cap
    while (queue.length > TC_QUEUE_MAX) queue.shift();

    await chrome.storage.local.set({ [TC_PENDING_KEY]: queue });
    console.log(`🔄 Background: Queued failed save. Queue length: ${queue.length}`);

    // Notify any open content scripts so they can show the badge
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'pendingSavesUpdated',
          count: queue.length
        }).catch(() => {}); // tabs without content script will reject — that's fine
      });
    });
  } catch (e) {
    console.warn('🔄 Background: Could not queue save:', e.message);
  }
}

/**
 * Attempt to flush all queued saves.
 * Removes items that succeed; leaves items that fail again.
 */
async function flushPendingQueue() {
  try {
    const stored = await chrome.storage.local.get(TC_PENDING_KEY);
    const queue  = stored[TC_PENDING_KEY] || [];

    if (queue.length === 0) return;

    console.log(`🔄 Background: Flushing ${queue.length} pending save(s)...`);

    const remaining = [];

    for (const item of queue) {
      try {
        await handleSaveConversation(item.data);
        console.log('🔄 Background: Queued save succeeded ✅');
      } catch (err) {
        item.attempts = (item.attempts || 1) + 1;
        console.warn(`🔄 Background: Queued save still failing (attempt ${item.attempts}):`, err.message);
        remaining.push(item);
      }
    }

    await chrome.storage.local.set({ [TC_PENDING_KEY]: remaining });
    console.log(`🔄 Background: Queue flush done. ${remaining.length} item(s) still pending.`);

    // Notify content scripts of updated count
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'pendingSavesUpdated',
          count: remaining.length
        }).catch(() => {});
      });
    });
  } catch (e) {
    console.warn('🔄 Background: Error flushing queue:', e.message);
  }
}

// Flush queue on browser/extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Background: onStartup — checking for pending saves...');
  flushPendingQueue();
});

// === SECTION 4: Cross-Tab Continuation System ===

function handleStoreContinuationData(request, sender, sendResponse) {
  console.log('🔄 Background: Storing continuation data for cross-tab communication');
  
  // FIXED: Use the same key name that content.js expects
  chrome.storage.local.set({
    threadcubContinuationData: {
      prompt: request.prompt,
      shareUrl: request.shareUrl,
      platform: request.platform,
      timestamp: Date.now(),
      sourceTabId: sender.tab.id,
      messages: request.messages || [],
      totalMessages: request.totalMessages || request.messages?.length || 0
    }
  });
  
  sendResponse({ success: true });
}

function handleGetContinuationData(sender, sendResponse) {
  console.log('🔄 Background: Getting continuation data for new tab');
  
  // FIXED: Use the same key name that content.js expects
  chrome.storage.local.get(['threadcubContinuationData'], (result) => {
    const data = result.threadcubContinuationData;
    
    // Check if data exists, is recent (within 5 minutes), and from different tab
    if (data && 
        Date.now() - data.timestamp < 300000 && 
        data.sourceTabId !== sender.tab.id) {
      
      console.log('🔄 Background: Found valid continuation data, sending to tab');
      // Clear the data after retrieving it (one-time use)
      chrome.storage.local.remove(['threadcubContinuationData']);
      sendResponse({ data });
    } else {
      console.log('🔄 Background: No valid continuation data found');
      sendResponse({ data: null });
    }
  });
}

// Handler for initiating conversation continuation from the length detector modal
// === SECTION 5: Tab Management & Prompt Injection ===

// Platform configurations for prompt injection
const PLATFORM_INJECTORS = {
  'chat.openai.com': {
    name: 'ChatGPT',
    selectors: ['textarea[data-testid="prompt-textarea"]', '#prompt-textarea', 'textarea']
  },
  'chatgpt.com': {
    name: 'ChatGPT', 
    selectors: ['textarea[data-testid="prompt-textarea"]', '#prompt-textarea', 'textarea']
  },
  'claude.ai': {
    name: 'Claude',
    selectors: ['textarea[data-testid="chat-input"]', 'div[contenteditable="true"]']
  },
  'gemini.google.com': {
    name: 'Gemini',
    selectors: ['rich-textarea[data-test-id="input-field"] div[contenteditable="true"]', 'textarea']
  },
  'copilot.microsoft.com': {
    name: 'Copilot',
    selectors: ['textarea[data-testid="chat-input"]', 'textarea']
  }
};

async function handleOpenAndInject(url, prompt) {
  try {
    console.log(`🔄 Background: Opening new tab: ${url}`);
    
    // Create new tab
    const tab = await chrome.tabs.create({ url, active: false });
    console.log(`🔄 Background: Created tab ${tab.id}`);
    
    // Wait for tab to be ready
    await waitForTabReady(tab.id);
    console.log('🔄 Background: Tab ready, attempting injection');
    
    // Get platform-specific selectors
    const domain = new URL(url).hostname;
    const platformConfig = PLATFORM_INJECTORS[domain];
    
    if (!platformConfig) {
      throw new Error(`Platform ${domain} not supported for injection`);
    }
    
    // Inject the prompt
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectPromptFunction,
      args: [prompt, platformConfig.selectors]
    });
    
    if (results && results[0] && results[0].result.success) {
      console.log('🔄 Background: Prompt injection successful, activating tab');
      await chrome.tabs.update(tab.id, { active: true });
      return { success: true, tabId: tab.id };
    } else {
      throw new Error(results[0].result.error || 'Injection failed');
    }
    
  } catch (error) {
    console.error('🔄 Background: Error in handleOpenAndInject:', error);
    return { success: false, error: error.message };
  }
}

async function waitForTabReady(tabId, maxWaitTime = 8000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      throw new Error('Tab no longer exists');
    }
  }
  
  throw new Error('Timeout waiting for tab');
}

function injectPromptFunction(prompt, selectors) {
  return new Promise((resolve) => {
    console.log('🔄 Injecting prompt into page');
    
    let attempts = 0;
    const maxAttempts = 15;
    
    function tryInject() {
      attempts++;
      
      let inputField = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const style = window.getComputedStyle(element);
          if (style.display !== 'none' && element.offsetHeight > 0) {
            inputField = element;
            break;
          }
        }
        if (inputField) break;
      }
      
      if (inputField) {
        console.log('🔄 Found input field, injecting prompt');
        
        inputField.focus();
        
        if (inputField.tagName === 'TEXTAREA') {
          inputField.value = prompt;
          inputField.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (inputField.contentEditable === 'true') {
          inputField.textContent = prompt;
          inputField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        resolve({ success: true });
        
      } else if (attempts < maxAttempts) {
        setTimeout(tryInject, 400);
      } else {
        console.log('🔄 Could not find input field');
        resolve({ success: false, error: 'Input field not found' });
      }
    }
    
    tryInject();
  });
}

// === SECTION 6: Extension Lifecycle (MOVED TO TOP FOR ANALYTICS) ===
// This section was moved to SECTION 0 for analytics integration

chrome.runtime.onStartup.addListener(() => {
  console.log('🐻 Background: Extension started');
  // Queue flush is also triggered by the onStartup listener in Section 3b
});

console.log('🐻 ThreadCub background script loaded and ready');

// === SECTION 7: Auth Token Handler (FIXED - Proper Cookie Parsing) ===

async function handleGetAuthToken(sendResponse) {
  console.log('🔧 Background: Getting auth token...');

  try {
    // Primary: use AuthService (reads from chrome.storage.local — always available in service worker)
    if (self.AuthService) {
      const token = await self.AuthService.getToken();
      if (token) {
        console.log('🔧 Background: ✅ Auth token found via AuthService');
        sendResponse({ success: true, authToken: token });
        return;
      }
    }

    console.log('🔧 Background: No token in AuthService, falling back to ThreadCub tab...');

    // Fallback: scrape from ThreadCub tab localStorage
    const tabs = await chrome.tabs.query({ url: "*://threadcub.com/*" });

    if (tabs.length === 0) {
      console.log('🔧 Background: No ThreadCub tab found');
      sendResponse({ success: false, error: 'Not logged in. Open ThreadCub and log in.' });
      return;
    }

    console.log('🔧 Background: Found ThreadCub tab, extracting auth token from localStorage...');

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: extractSupabaseAuthToken
    });

    if (results?.[0]?.result?.success && results[0].result.authToken) {
      console.log('🔧 Background: ✅ Auth token extracted from tab');
      sendResponse({ success: true, authToken: results[0].result.authToken });
    } else {
      console.log('🔧 Background: ❌ Failed to extract auth token:', results?.[0]?.result?.error);
      sendResponse({ success: false, error: results?.[0]?.result?.error || 'No auth token found' });
    }

  } catch (error) {
    console.error('🔧 Background: Error in handleGetAuthToken:', error);
    sendResponse({ success: false, error: `Error extracting auth token: ${error.message}` });
  }
}

// This function runs in the context of the ThreadCub dashboard tab
function extractSupabaseAuthToken() {
  try {
    console.log('🔧 Dashboard: Extracting Supabase auth token...');
    
    // Method 1: Try to get session from Supabase client directly
    if (typeof window !== 'undefined') {
      // Check if Supabase client is available globally
      if (window.supabase && window.supabase.auth) {
        try {
          // Try to get the current session
          window.supabase.auth.getSession().then(({ data, error }) => {
            if (data.session && data.session.access_token) {
              console.log('🔧 Dashboard: Found token via Supabase client');
              return { success: true, authToken: data.session.access_token };
            }
          });
        } catch (e) {
          console.log('🔧 Dashboard: Supabase client method failed:', e);
        }
      }
    }
    
    // Method 2: Search localStorage for Supabase auth data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Look for Supabase auth keys (common patterns)
      if (key && (key.includes('supabase.auth.token') || key.startsWith('sb-') || key.includes('-auth-token'))) {
        console.log('🔧 Dashboard: Found potential auth key:', key);
        
        try {
          const authData = localStorage.getItem(key);
          if (authData) {
            // Try to parse as JSON
            const parsed = JSON.parse(authData);
            
            // Check for access_token in various formats
            if (parsed.access_token) {
              console.log('🔧 Dashboard: Found access_token in localStorage');
              return { success: true, authToken: parsed.access_token };
            }
            
            // Check if it's an array with access token as first element
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
              console.log('🔧 Dashboard: Found token in array format');
              return { success: true, authToken: parsed[0] };
            }
            
            // Check for nested session data
            if (parsed.session && parsed.session.access_token) {
              console.log('🔧 Dashboard: Found token in session object');
              return { success: true, authToken: parsed.session.access_token };
            }
          }
        } catch (parseError) {
          console.log('🔧 Dashboard: Failed to parse auth data for key:', key, parseError);
          continue;
        }
      }
    }
    
    // Method 3: Try common Supabase localStorage key patterns
    const commonKeys = [
      'supabase.auth.token',
      'sb-localhost-auth-token',
      'sb-threadcub-auth-token',
      'sb-auth-token'
    ];
    
    for (const key of commonKeys) {
      const authData = localStorage.getItem(key);
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.access_token) {
            console.log('🔧 Dashboard: Found token with common key pattern:', key);
            return { success: true, authToken: parsed.access_token };
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    console.log('🔧 Dashboard: No auth token found in localStorage');
    return { success: false, error: 'No auth token found - make sure you are logged in to ThreadCub' };

  } catch (error) {
    console.error('🔧 Dashboard: Error extracting auth token:', error);
    return { success: false, error: `Error: ${error.message}` };
  }
}

// === SECTION 8: Extension Auth Token Handlers ===

async function handleStoreAuthToken(request, sendResponse) {
  console.log('🔐 Background: Storing auth token from callback...');
  try {
    const { token, encryptionKey } = request;
    if (!token) {
      sendResponse({ success: false, error: 'No token provided' });
      return;
    }

    await self.AuthService.storeToken(token);

    // If encryptionKey was passed directly in the request, store it immediately
    if (encryptionKey) {
      console.log('🔐 Background: Storing per-user encryption key from auth callback...');
      await self.AuthService.storeEncryptionKey(encryptionKey);
    }

    // Validate the token and store user data
    const userData = await self.AuthService.validateToken(token);
    if (userData) {
      await self.AuthService.storeUser(userData);
      console.log('🔐 Background: Token stored and validated, user:', userData.email || userData.user?.email);

      // Store per-user encryption key from validation response (if present and not already stored)
      const userEncKey = userData.encryptionKey || userData.user?.encryptionKey;
      if (userEncKey && !encryptionKey) {
        console.log('🔐 Background: Storing per-user encryption key from validation response...');
        await self.AuthService.storeEncryptionKey(userEncKey);
      }
    }

    sendResponse({ success: true, user: userData });

    // Close the login tab if it was opened by the extension
    chrome.storage.local.get('threadcub_login_tab_id', (result) => {
      if (result.threadcub_login_tab_id) {
        chrome.tabs.remove(result.threadcub_login_tab_id);
        chrome.storage.local.remove('threadcub_login_tab_id');
        console.log('🔐 Background: Closed login tab after successful auth');
      }
    });
  } catch (error) {
    console.error('🔐 Background: Error storing auth token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetStoredAuthToken(sendResponse) {
  console.log('🔐 Background: Getting stored auth token...');
  try {
    const token = await self.AuthService.getToken();
    const user = await self.AuthService.getUser();
    sendResponse({ success: true, token, user });
  } catch (error) {
    console.error('🔐 Background: Error getting stored token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleValidateAuthToken(sendResponse) {
  console.log('🔐 Background: Validating stored auth token...');
  try {
    const result = await self.AuthService.getValidatedAuth();
    sendResponse({ success: true, ...result });
  } catch (error) {
    console.error('🔐 Background: Error validating token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleClearLocalConversations(sendResponse) {
  console.log('🐻 Background: Clearing local conversation data...');
  try {
    await chrome.storage.local.remove([
      'threadcubSessionId',       // session token used to match claimable conversations
      'threadcubContinuationData', // cross-tab continuation state
      TC_PENDING_KEY,              // offline queue of unsaved conversations
    ]);
    sendResponse({ success: true });
  } catch (error) {
    console.error('🐻 Background: Error clearing local conversations:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleAuthLogout(sendResponse) {
  console.log('🔐 Background: Logging out...');
  try {
    await self.AuthService.logout();
    sendResponse({ success: true });
  } catch (error) {
    console.error('🔐 Background: Error during logout:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetConversationCount(sendResponse) {
  try {
    const token = await self.AuthService.getToken();
    if (!token) {
      sendResponse({ success: false, count: 0 });
      return;
    }
    const response = await fetch(`${BG_API_BASE}/conversations/count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      sendResponse({ success: true, count: data.count ?? 0 });
    } else {
      sendResponse({ success: false, count: 0 });
    }
  } catch (error) {
    console.error('🐻 Background: Error fetching conversation count:', error);
    sendResponse({ success: false, count: 0 });
  }
}

// === SECTION 9: External Message Listener for Auth Callback ===
// Listen for messages from the auth callback page (threadcub.com/auth/extension-callback)

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('🔐 Background: Received external message from:', sender.url);
  console.log('🔐 Background: External message action:', request.action);

  if (request.action === 'storeAuthToken' && request.token) {
    console.log('🔐 Background: Auth callback received with token');

    handleStoreAuthToken({ token: request.token, encryptionKey: request.encryptionKey }, sendResponse);
    return true;
  }

  sendResponse({ success: false, error: 'Unknown external action' });
});

// Also listen for internal messages from content scripts on threadcub.com
// that relay the auth token from the callback page
console.log('🔐 ThreadCub: Auth handlers registered in background script');