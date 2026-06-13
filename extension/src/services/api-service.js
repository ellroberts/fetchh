// =============================================================================
// ThreadCub API Service
// Consolidates all API calls to ThreadCub backend
// All authenticated endpoints use Authorization: Bearer <token> headers
// =============================================================================

// ⚠️ CHANGE BACK TO PRODUCTION BEFORE RELOADING EXTENSION FOR NORMAL USE
// Local dev toggle — set IS_LOCAL_DEV = false for production
const IS_LOCAL_DEV = false;
const API_BASE = IS_LOCAL_DEV
  ? 'http://localhost:3000/api'
  : 'https://threadcub.com/api';
const SITE_BASE = IS_LOCAL_DEV
  ? 'http://localhost:3000'
  : 'https://threadcub.com';

// Temp flag: set to false to skip encryption entirely (for quick testing)
const USE_ENCRYPTION = true;

console.log(`🔌 ThreadCub ApiService: API_BASE = ${API_BASE} (IS_LOCAL_DEV=${IS_LOCAL_DEV})`);

// ---------------------------------------------------------------------------
// Helper: resolve CryptoService from any context (window, self, global)
// ---------------------------------------------------------------------------
function _getCryptoService() {
  if (typeof CryptoService !== 'undefined') return CryptoService;
  if (typeof window !== 'undefined' && window.CryptoService) return window.CryptoService;
  if (typeof self !== 'undefined' && self.CryptoService) return self.CryptoService;
  return null;
}

// ---------------------------------------------------------------------------
// Helper: resolve AuthService from any context (window or service worker self)
// ---------------------------------------------------------------------------
function _getAuthService() {
  if (typeof window !== 'undefined' && window.AuthService) return window.AuthService;
  if (typeof self !== 'undefined' && self.AuthService) return self.AuthService;
  return null;
}

const ApiService = {
  // Base URL for all API calls
  BASE_URL: SITE_BASE,

  // =============================================================================
  // HELPER: Build headers with optional Bearer auth
  // =============================================================================

  async _buildHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };

    // Get auth token from AuthService if available (background/service worker context)
    // Falls back to messaging the background when running in a content script context
    try {
      const AuthSvc = _getAuthService();
      if (AuthSvc) {
        const token = await AuthSvc.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('🔐 ApiService: Added Bearer auth header (AuthService)');
        }
      } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        // Content script context — AuthService not available in window scope,
        // so ask the background script for the stored token instead
        const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
        if (response?.token || response?.authToken) {
          headers['Authorization'] = `Bearer ${response.token || response.authToken}`;
          console.log('🔐 ApiService: Added Bearer auth header (via background message)');
        } else {
          console.log('🔐 ApiService: No token returned from background');
        }
      }
    } catch (error) {
      console.log('🔐 ApiService: Could not get auth token:', error.message);
    }

    return headers;
  },

  // =============================================================================
  // HELPER: Handle 401 responses (expired token)
  // =============================================================================

  async _handleUnauthorized() {
    console.log('🔐 ApiService: Received 401, clearing expired token...');
    try {
      const AuthSvc = _getAuthService();
      if (AuthSvc) {
        await AuthSvc.clearToken();
      }
    } catch (error) {
      console.log('🔐 ApiService: Error clearing token:', error.message);
    }
  },

  // =============================================================================
  // HELPER: Notify user of persistent save failure via chrome.notifications
  // =============================================================================

  _notifySaveFailure(errorMsg) {
    const message = `Save failed: ${errorMsg}`;
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create('threadcub-save-error', {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'ThreadCub — Save Failed',
          message: message,
          priority: 2
        }, (notifId) => {
          if (chrome.runtime.lastError) {
            console.warn('🔔 ApiService: Notification failed:', chrome.runtime.lastError.message);
          }
        });
      } else {
        console.warn('🔔 ApiService: chrome.notifications not available — save error:', message);
      }
    } catch (e) {
      console.warn('🔔 ApiService: Notification error:', e.message);
    }
  },

  // =============================================================================
  // SAVE CONVERSATION
  // Extracted from: content.js, floating-button.js, background.js
  // =============================================================================

  async saveConversation(apiData) {
    try {
      console.log('🔍 saveConversation called with apiData:', JSON.stringify(apiData, null, 2));

      // Extract messages early so we can inspect them before any send
      let messages = [];
      if (apiData?.conversationData?.messages) {
        messages = apiData.conversationData.messages;
        console.log('🔍 Messages found at apiData.conversationData.messages');
      } else if (apiData?.messages) {
        messages = apiData.messages;
        console.log('🔍 Messages found at apiData.messages');
      }
      console.log('🔍 Extracted messages length:', messages.length);
      if (messages.length === 0) {
        console.warn('⚠️ No messages found in payload — server will likely reject this');
      }

      const headers = await this._buildHeaders();

      // Check if we have an auth token — guests skip encryption entirely
      let hasAuthToken = false;
      try {
        const AuthSvc = _getAuthService();
        if (AuthSvc) {
          const token = await AuthSvc.getToken();
          hasAuthToken = !!token;
        }
      } catch (e) { /* ignore */ }
      console.log('🔐 ApiService.saveConversation: hasAuthToken:', hasAuthToken);

      let didAttemptEncrypted = false;

      // -----------------------------------------------------------------
      // Step 1: Try sending AES-GCM encrypted payload (authenticated users only)
      // Uses CryptoService (Web Crypto API, AES-GCM 256-bit).
      // Backend expects: { encrypted_payload: "base64...", title?, source? }
      // -----------------------------------------------------------------
      if (USE_ENCRYPTION && hasAuthToken) {
        try {
          const CryptoSvc = _getCryptoService();

          if (CryptoSvc) {
            const conversationData = apiData.conversationData || apiData;
            const title  = apiData?.title || conversationData?.title || 'Untitled Conversation';
            const source = apiData?.source || conversationData?.source || conversationData?.platform?.toLowerCase() || 'unknown';

            console.log('🔒 ApiService.saveConversation: Encrypting with AES-GCM...');
            const encryptedString = await CryptoSvc.encryptPayload(conversationData);

            if (encryptedString) {
              console.log('🔒 Encrypted payload length:', encryptedString.length);

              didAttemptEncrypted = true;
              const encResponse = await fetch(`${API_BASE}/conversations/save`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                  encrypted_payload: encryptedString,
                  encryption_format: 'aes-gcm',
                  title: title,
                  source: source,
                  session_id: apiData?.session_id || apiData?.sessionId || null,
                  capture_method: apiData?.capture_method || 'save',
                  parent_conversation_id: apiData?.parent_conversation_id || null,
                  source_chat_url: apiData?.source_chat_url || null
                })
              });

              console.log('🔒 ApiService.saveConversation: Encrypted POST response status:', encResponse.status);

              if (encResponse.status === 401) {
                await this._handleUnauthorized();
                console.log('🔐 ApiService.saveConversation: Token expired, falling back to guest save...');
              } else if (encResponse.ok) {
                const data = await encResponse.json();
                console.log('✅ ThreadCub: Encrypted API call successful:', JSON.stringify(data));
                return data;
              } else {
                const errBody = await encResponse.text();
                console.warn(
                  `🔒 ApiService.saveConversation: Encrypted send failed (status ${encResponse.status}) — falling back.`,
                  '\n  Response body:', errBody
                );
              }
            } else {
              console.warn('🔒 ApiService.saveConversation: CryptoService.encrypt returned null — skipping encryption');
            }
          } else {
            console.warn('🔒 ApiService.saveConversation: CryptoService not available, skipping encryption');
          }
        } catch (encryptError) {
          if (encryptError.message.includes('Authentication expired')) {
            throw encryptError;
          }
          console.error('🔒 Encryption failed:', encryptError);
          console.warn('🔒 ApiService.saveConversation: Falling back to unencrypted due to encryption error');
        }
      } else {
        console.log('🔒 ApiService.saveConversation: USE_ENCRYPTION=false or no auth token, sending unencrypted');
      }

      // -----------------------------------------------------------------
      // Step 2: Send unencrypted payload (primary path or fallback)
      // -----------------------------------------------------------------
      if (didAttemptEncrypted) {
        console.log('🔒 ApiService.saveConversation: Retrying with original unencrypted payload...');
      }

      const title  = apiData?.title || apiData?.conversationData?.title || 'Untitled Conversation';
      const source = apiData?.source || apiData?.conversationData?.source || apiData?.platform?.toLowerCase() || 'unknown';

      const unencryptedPayload = {
        conversationData: {
          messages: messages,
          title: title,
          source: source,
          url: apiData?.conversationData?.url || null
        },
        title: title,
        source: source,
        session_id: apiData?.session_id || apiData?.sessionId || null,
        capture_method: apiData?.capture_method || 'save',
        parent_conversation_id: apiData?.parent_conversation_id || null,
        source_chat_url: apiData?.source_chat_url || null
      };

      console.log('🔍 Sending unencrypted payload:', JSON.stringify(unencryptedPayload, null, 2));

      const response = await fetch(`${API_BASE}/conversations/save`, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify(unencryptedPayload)
      });

      console.log('🔍 ApiService.saveConversation: Unencrypted POST response status:', response.status);

      if (response.status === 401) {
        await this._handleUnauthorized();
        throw new Error('Authentication expired. Please log in again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🐻 ApiService.saveConversation: Unencrypted send also failed!',
                       'Status:', response.status, '| Body:', errorText);
        this._notifySaveFailure(`Server returned ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ ThreadCub: API call successful (unencrypted):', data);
      console.log('🔍 DEBUG: Full save API response:', JSON.stringify(data));

      return data;

    } catch (error) {
      console.error('🐻 ThreadCub: API call failed:', error);
      this._notifySaveFailure(error.message);
      throw error;
    }
  },

  // =============================================================================
  // SAVE CONVERSATION (Background Script Version)
  // Extracted from: background.js
  // =============================================================================

  async handleSaveConversation(data) {
    try {
      console.log('🐻 ApiService.handleSaveConversation: data keys:', Object.keys(data));
      console.log('🐻 ApiService.handleSaveConversation: API URL:', `${API_BASE}/conversations/save`);

      const headers = await this._buildHeaders({ 'Accept': 'application/json' });
      let didAttemptEncrypted = false;

      // -----------------------------------------------------------------
      // Step 1: Try sending AES-GCM encrypted payload
      // -----------------------------------------------------------------
      if (USE_ENCRYPTION) {
        try {
          const CryptoSvc = _getCryptoService();

          if (CryptoSvc) {
            console.log('🔒 ApiService.handleSaveConversation: Encrypting payload with AES-GCM...');

            const AuthSvc = _getAuthService();

            // Only encrypt if user is authenticated
            let hasKey = false;
            if (AuthSvc) {
              try {
                const key = await AuthSvc.getEncryptionKey();
                hasKey = !!key;
              } catch (e) { /* ignore */ }
            }

            if (!hasKey) {
              console.log('🔒 handleSaveConversation: No encryption key — skipping encryption, sending plaintext');
            } else {
              const conversationData = data.conversationData || data;
              const encryptedBase64 = await CryptoSvc.encryptPayload(conversationData);

              if (encryptedBase64) {
                const encryptedPayload = {
                  encrypted_payload: encryptedBase64,
                  encryption_format: 'aes-gcm',
                  source: data.source || data.conversationData?.platform?.toLowerCase() || 'unknown',
                  title: data.title || data.conversationData?.title || 'Untitled'
                };

                console.log('🔒 ApiService.handleSaveConversation: Sending encrypted payload');

                didAttemptEncrypted = true;
                const encResponse = await fetch(`${API_BASE}/conversations/save`, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(encryptedPayload)
                });

                console.log('🔒 ApiService.handleSaveConversation: Encrypted POST status:', encResponse.status);

                if (encResponse.status === 401) {
                  await this._handleUnauthorized();
                  throw new Error('Authentication expired. Please log in again.');
                }

                if (encResponse.ok) {
                  const result = await encResponse.json();
                  console.log('✅ ApiService.handleSaveConversation: Encrypted call successful:', result);
                  return result;
                }

                const errBody = await encResponse.text();
                console.warn(
                  `🔒 ApiService.handleSaveConversation: Encrypted send failed (status ${encResponse.status}) — falling back.`,
                  '\n  Response body:', errBody
                );
              }
            }
          } else {
            console.warn('🔒 ApiService.handleSaveConversation: CryptoService not available, skipping encryption');
          }
        } catch (encryptError) {
          if (encryptError.message.includes('Authentication expired')) {
            throw encryptError;
          }
          console.warn('🔒 ApiService.handleSaveConversation: Encryption/send error, falling back:', encryptError.message);
        }
      } else {
        console.log('🔒 ApiService.handleSaveConversation: USE_ENCRYPTION=false, sending unencrypted');
      }

      // -----------------------------------------------------------------
      // Step 2: Send original unencrypted payload (primary path or fallback)
      // -----------------------------------------------------------------
      if (didAttemptEncrypted) {
        console.log('🔒 ApiService.handleSaveConversation: Retrying with original unencrypted payload...');
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
        source: source
      };

      console.log('🔍 ApiService.handleSaveConversation: Unencrypted payload:', JSON.stringify(unencryptedPayload, null, 2));

      const response = await fetch(`${API_BASE}/conversations/save`, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify(unencryptedPayload)
      });

      console.log('🔍 ApiService.handleSaveConversation: Unencrypted POST status:', response.status);

      if (response.status === 401) {
        await this._handleUnauthorized();
        throw new Error('Authentication expired. Please log in again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🐻 ApiService.handleSaveConversation: Unencrypted send also failed!',
                       'Status:', response.status, '| Body:', errorText);

        if (response.status === 405) {
          const allowedMethods = response.headers.get('Allow');
          console.error('🐻 Background: Allowed methods:', allowedMethods);
          throw new Error(`Method not allowed. Allowed methods: ${allowedMethods || 'unknown'}`);
        }

        this._notifySaveFailure(`Server returned ${response.status}`);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ ApiService.handleSaveConversation: Unencrypted call successful:', result);

      return result;

    } catch (error) {
      console.error('🐻 ApiService.handleSaveConversation: API error:', error);
      this._notifySaveFailure(error.message);
      throw error;
    }
  },

  // =============================================================================
  // CREATE CONVERSATION WITH TAGS
  // =============================================================================

  async createConversationWithTags(conversationData, tags) {
    const headers = await this._buildHeaders();

    const response = await fetch(`${API_BASE}/conversations/tags/create`, {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify({
        conversationData: conversationData,
        tags: tags,
        source: conversationData.platform?.toLowerCase() || 'unknown',
        title: conversationData.title
      })
    });

    if (response.status === 401) {
      await this._handleUnauthorized();
      throw new Error('Authentication expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error('Failed to create conversation with tags');
    }

    const data = await response.json();
    console.log('🏷️ ThreadCub: Conversation created with tags:', data);
    return data;
  },

  // =============================================================================
  // ADD TAGS TO EXISTING CONVERSATION
  // =============================================================================

  async addTagsToExistingConversation(conversationId, tags) {
    const headers = await this._buildHeaders();

    const response = await fetch(`${API_BASE}/conversations/${conversationId}/tags`, {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify({ tags: tags })
    });

    if (response.status === 401) {
      await this._handleUnauthorized();
      throw new Error('Authentication expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error('Failed to add tags to conversation');
    }

    const data = await response.json();
    console.log('🏷️ ThreadCub: Tags added to conversation:', data);
    return data;
  },

  // =============================================================================
  // DELETE CONVERSATION
  // =============================================================================

  async deleteConversation(conversationId, sessionId) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionId) headers['x-session-id'] = sessionId;
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Delete failed');
  return response.json();
},

  // =============================================================================
  // FETCH PROMPTS
  // =============================================================================

  async fetchPrompts() {
    const response = await fetch(`${API_BASE}/prompts`);
    const prompts = await response.json();
    console.log('📋 Loaded prompts:', prompts);
    return prompts;
  }

};

// Export to global context (window for content scripts, self for service workers)
if (typeof window !== 'undefined') window.ApiService = ApiService;
if (typeof self !== 'undefined') self.ApiService = ApiService;
console.log('🔌 ThreadCub: ApiService module loaded');