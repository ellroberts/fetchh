console.log('🔧 LOADING: storage-service.js');

/**
 * Storage Service Module
 *
 * Extracted from content.js - handles all Chrome storage and localStorage operations
 * Code kept EXACTLY as-is from original - no modifications
 */

// Storage Service Object
const StorageService = {
  /**
   * Check if Chrome storage is available
   * EXACT CODE from content.js line 4196
   */
  canUseChromStorage() {
    try {
      // Check each condition step by step for better debugging
      if (typeof chrome === 'undefined') return false;
      if (!chrome.runtime) return false;
      if (!chrome.runtime.id) return false;  // This checks if extension context is valid
      if (!chrome.storage) return false;
      if (!chrome.storage.local) return false;

      return true;
    } catch (error) {
      console.log('🔧 Chrome check failed:', error);
      return false;
    }
  },

  /**
   * Store continuation data with Chrome storage
   * EXACT CODE from content.js line 4212
   */
  async storeWithChrome(continuationData) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ threadcubContinuationData: continuationData }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('🔧 Chrome storage: Success with message count:', continuationData.totalMessages);
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Handle Claude flow with localStorage fallback
   * EXACT CODE from content.js line 4229
   */
  handleClaudeFlowFallback(continuationData) {
    console.log('🤖 ThreadCub: Using localStorage fallback for Claude...');

    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      console.log('🔧 Claude Fallback: Data stored in localStorage');

      const claudeUrl = 'https://claude.ai/';
      window.open(claudeUrl, '_blank');
      if (window.UIComponents) {
        window.UIComponents.showSuccessToast('Opening Claude with conversation context...');
      }

    } catch (error) {
      console.error('🔧 Claude Fallback: localStorage failed:', error);
    }
  },

  /**
   * Get or create session ID with Chrome storage + localStorage sync
   * EXACT CODE from content.js line 4653
   */
  async getOrCreateSessionId() {
    let sessionId = null;

    try {
      try {
        sessionId = localStorage.getItem('threadcubSessionId');
        if (sessionId) {
          console.log('🔑 Using existing ThreadCub session ID (localStorage):', sessionId);

          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
              chrome.storage.local.set({ threadcubSessionId: sessionId }, () => {
                if (!chrome.runtime.lastError) {
                  console.log('🔑 Synced session ID to Chrome storage');
                }
              });
            } catch (chromeError) {
              console.log('🔑 Chrome storage sync failed (non-critical):', chromeError);
            }
          }

          return sessionId;
        }
      } catch (localError) {
        console.log('🔑 localStorage access failed:', localError);
      }

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id) {
        try {
          const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['threadcubSessionId'], (result) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(result);
              }
            });
          });

          sessionId = result.threadcubSessionId;
          if (sessionId) {
            console.log('🔑 Using existing ThreadCub session ID (Chrome storage):', sessionId);

            try {
              localStorage.setItem('threadcubSessionId', sessionId);
              console.log('🔑 Synced session ID to localStorage for dashboard access');
            } catch (localError) {
              console.log('🔑 Could not sync to localStorage (non-critical):', localError);
            }

            return sessionId;
          }
        } catch (chromeError) {
          console.log('🔑 Chrome storage access failed:', chromeError);
        }
      }

      sessionId = 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      console.log('🔑 Generated new ThreadCub session ID:', sessionId);

      try {
        localStorage.setItem('threadcubSessionId', sessionId);
        console.log('🔑 Saved new session ID to localStorage');
      } catch (localError) {
        console.log('🔑 Could not save to localStorage:', localError);
      }

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ threadcubSessionId: sessionId }, () => {
            if (!chrome.runtime.lastError) {
              console.log('🔑 Saved new session ID to Chrome storage');
            }
          });
        } catch (chromeError) {
          console.log('🔑 Could not save to Chrome storage (non-critical):', chromeError);
        }
      }

      return sessionId;

    } catch (error) {
      console.error('🔑 Session ID management failed:', error);

      try {
        sessionId = localStorage.getItem('threadcubSessionId');
        if (!sessionId) {
          sessionId = 'tc_emergency_' + Date.now();
          localStorage.setItem('threadcubSessionId', sessionId);
        }
        console.log('🔑 Using emergency session ID:', sessionId);
        return sessionId;
      } catch (emergencyError) {
        console.error('🔑 Emergency session ID failed:', emergencyError);
        return 'tc_critical_' + Date.now();
      }
    }
  }
};

// Make the service globally available
window.StorageService = StorageService;

console.log('✅ StorageService defined:', typeof window.StorageService);
