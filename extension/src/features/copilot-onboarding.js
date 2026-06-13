// ============================================================================
// COPILOT ONBOARDING MODAL
// Shows one-time informational prompt about Copilot highlighting limitations
// ============================================================================

class CopilotOnboarding {
  constructor() {
    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    this.CONFIG = {
      STORAGE_KEY: 'threadcub_copilot_onboarding_seen',
      PLATFORM: 'copilot',
      ENABLED: true,
    };

    // ============================================================================
    // STATE
    // ============================================================================
    this._platform = null;
    this._onboardingShown = false;
    this._initialized = false;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    this._detectPlatform();
    
    // Only initialize if on Copilot
    if (this._platform === 'copilot') {
      this._injectStyles();
      this._checkAndShowOnboarding();
      this._initialized = true;
      console.log('[CopilotOnboarding] Initialized for Copilot');
    } else {
      console.log('[CopilotOnboarding] Not Copilot platform, skipping initialization');
    }
  }

  // ============================================================================
  // PLATFORM DETECTION
  // ============================================================================

  _detectPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('copilot.microsoft.com')) {
      this._platform = 'copilot';
    } else {
      this._platform = 'other';
    }
  }

  // ============================================================================
  // STORAGE (check if user has seen onboarding)
  // ============================================================================

  _hasSeenOnboarding() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get([this.CONFIG.STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
              console.error('[CopilotOnboarding] Storage error:', chrome.runtime.lastError);
              resolve(false); // Default to not seen if error
            } else {
              resolve(result[this.CONFIG.STORAGE_KEY] === true);
            }
          });
        } else {
          // Fallback to localStorage
          const seen = localStorage.getItem(this.CONFIG.STORAGE_KEY);
          resolve(seen === 'true');
        }
      } catch (error) {
        console.error('[CopilotOnboarding] Error checking storage:', error);
        resolve(false);
      }
    });
  }

  _markOnboardingAsSeen() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [this.CONFIG.STORAGE_KEY]: true }, () => {
          if (chrome.runtime.lastError) {
            console.error('[CopilotOnboarding] Error saving to storage:', chrome.runtime.lastError);
          } else {
            console.log('[CopilotOnboarding] Onboarding marked as seen');
          }
        });
      } else {
        // Fallback to localStorage
        localStorage.setItem(this.CONFIG.STORAGE_KEY, 'true');
        console.log('[CopilotOnboarding] Onboarding marked as seen (localStorage)');
      }
    } catch (error) {
      console.error('[CopilotOnboarding] Error saving to storage:', error);
    }
  }

  // ============================================================================
  // CHECK AND SHOW LOGIC
  // ============================================================================

  async _checkAndShowOnboarding() {
    // Check if user has already seen the onboarding
    const hasSeen = await this._hasSeenOnboarding();
    
    if (!hasSeen && this.CONFIG.ENABLED) {
      // Wait a moment for the page to load, then show
      setTimeout(() => {
        this._showOnboarding();
      }, 1500); // 1.5 second delay for page to settle
    } else {
      console.log('[CopilotOnboarding] User has already seen onboarding or disabled');
    }
  }

  // ============================================================================
  // ONBOARDING UI
  // ============================================================================

  _showOnboarding() {
    console.log('[CopilotOnboarding] Showing onboarding modal');
    
    this._onboardingShown = true;

    // 📊 GA: copilot_onboarding_shown — fired the first time a Copilot user sees the limitations modal
    // Only fires once per install (storage flag prevents repeat shows)
    chrome.runtime.sendMessage({
      action: 'trackEvent',
      eventType: 'copilot_onboarding_shown',
      data: { platform: 'copilot' }
    });

    // Create and inject the modal
    this._injectModal();
  }

  _injectModal() {
    // Remove any existing modal
    this._removeModal();

    // Create modal element
    const modal = this._createModalElement();
    
    // Inject into page
    document.body.appendChild(modal);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      modal.classList.add('threadcub-copilot-onboarding-visible');
    });

    // Auto-close when user interacts with the page
    this._setupAutoClose(modal);
  }

  _createModalElement() {
    const modal = document.createElement('div');
    modal.className = 'threadcub-copilot-onboarding';
    modal.setAttribute('data-threadcub-element', 'true');
    
    modal.innerHTML = `
      <div class="threadcub-copilot-onboarding-content">
        <div class="threadcub-copilot-onboarding-header">
          <div class="threadcub-copilot-onboarding-title">
            Thanks for installing ThreadCub
          </div>
          <button class="threadcub-copilot-onboarding-close" data-action="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="threadcub-copilot-onboarding-message">
          <p style="margin: 0;">
            Unfortunately this version isn't working 100% on CoPilot. You're able to use our 'pawmarks' feature though the anchor and tag page highlights don't retain across chats. We're hoping to have this fixed in a future release.
          </p>
        </div>
        
        <div class="threadcub-copilot-onboarding-actions">
          <button class="threadcub-copilot-onboarding-action threadcub-copilot-onboarding-cta" data-action="got-it">
            <span>Got it!</span>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('[data-action="close"]');
    const gotItBtn = modal.querySelector('[data-action="got-it"]');
    
    const handleClose = () => {
      // 📊 GA: copilot_onboarding_dismissed — fired when user closes the modal via the X button
      chrome.runtime.sendMessage({
        action: 'trackEvent',
        eventType: 'copilot_onboarding_dismissed',
        data: { platform: 'copilot', method: 'close_button' }
      });
      this._markOnboardingAsSeen();
      this._removeModal();
    };

    const handleGotIt = () => {
      // 📊 GA: copilot_onboarding_dismissed — fired when user acknowledges the modal via "Got it!"
      chrome.runtime.sendMessage({
        action: 'trackEvent',
        eventType: 'copilot_onboarding_dismissed',
        data: { platform: 'copilot', method: 'got_it' }
      });
      this._markOnboardingAsSeen();
      this._removeModal();
    };

    closeBtn.addEventListener('click', handleClose);
    gotItBtn.addEventListener('click', handleGotIt);

    return modal;
  }

  _removeModal() {
    const existing = document.querySelector('.threadcub-copilot-onboarding');
    if (existing) {
      existing.classList.remove('threadcub-copilot-onboarding-visible');
      setTimeout(() => {
        existing.remove();
      }, 300); // Wait for fade-out animation
    }

    // Clean up auto-close listeners if they exist
    if (this._autoCloseHandler) {
      document.removeEventListener('click', this._autoCloseHandler);
      document.removeEventListener('keydown', this._autoCloseHandler);
      this._autoCloseHandler = null;
    }
  }

  // ============================================================================
  // AUTO-CLOSE ON USER INTERACTION
  // ============================================================================

  _setupAutoClose(modal) {
    // Close modal when user clicks outside of it or interacts with the page
    this._autoCloseHandler = (event) => {
      // Don't close if clicking inside the modal itself
      if (modal.contains(event.target)) {
        return;
      }

      // Don't close if clicking on ThreadCub elements (to prevent interference)
      if (event.target.closest('[data-threadcub-element]')) {
        return;
      }

      // Close on any other click (chat input, page content, etc.)
      if (event.type === 'click') {
        console.log('[CopilotOnboarding] User clicked outside modal - auto-closing');
        // 📊 GA: copilot_onboarding_dismissed — fired when user clicks outside the modal
        chrome.runtime.sendMessage({
          action: 'trackEvent',
          eventType: 'copilot_onboarding_dismissed',
          data: { platform: 'copilot', method: 'click_outside' }
        });
        this._markOnboardingAsSeen();
        this._removeModal();
      }

      // Close on any keypress (user typing in chat)
      if (event.type === 'keydown') {
        console.log('[CopilotOnboarding] User started typing - auto-closing');
        // 📊 GA: copilot_onboarding_dismissed — fired when user starts typing (modal auto-closes)
        chrome.runtime.sendMessage({
          action: 'trackEvent',
          eventType: 'copilot_onboarding_dismissed',
          data: { platform: 'copilot', method: 'keydown_auto_close' }
        });
        this._markOnboardingAsSeen();
        this._removeModal();
      }
    };

    // Add listeners with a small delay to prevent immediate closure
    setTimeout(() => {
      document.addEventListener('click', this._autoCloseHandler, true);
      document.addEventListener('keydown', this._autoCloseHandler, true);
      console.log('[CopilotOnboarding] Auto-close listeners activated');
    }, 500); // 500ms delay so modal has time to appear
  }

  // ============================================================================
  // STYLES (matching conversation-length-detector styling)
  // ============================================================================

  _injectStyles() {
    // Check if styles already injected
    if (document.getElementById('threadcub-copilot-onboarding-styles')) return;

    const style = document.createElement('style');
    style.id = 'threadcub-copilot-onboarding-styles';
    style.textContent = `
      .threadcub-copilot-onboarding {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        max-width: 420px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }

      .threadcub-copilot-onboarding-visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .threadcub-copilot-onboarding-content {
        padding: 20px;
      }

      .threadcub-copilot-onboarding-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .threadcub-copilot-onboarding-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        flex: 1;
      }

      .threadcub-copilot-onboarding-close {
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
        flex-shrink: 0;
      }

      .threadcub-copilot-onboarding-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .threadcub-copilot-onboarding-message {
        font-size: 14px;
        color: #374151;
        line-height: 1.6;
        margin: 0 0 16px 0;
      }

      .threadcub-copilot-onboarding-actions {
        display: flex;
        gap: 8px;
      }

      .threadcub-copilot-onboarding-action {
        flex: 1;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      /* CTA Button styling matching popup.html .cta-button */
      .threadcub-copilot-onboarding-cta {
        background: #96D9FA;
        color: #4C596E;
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 15px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
      }

      .threadcub-copilot-onboarding-cta:hover {
        background: #7BC3E8;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(150, 217, 250, 0.4);
      }

      .threadcub-copilot-onboarding-cta:active {
        transform: translateY(0);
      }
    `;

    document.head.appendChild(style);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy() {
    this._removeModal();
    
    const styles = document.getElementById('threadcub-copilot-onboarding-styles');
    if (styles) styles.remove();
    
    console.log('[CopilotOnboarding] Destroyed');
  }

  // ============================================================================
  // STATIC INIT METHOD (for app-initializer.js)
  // ============================================================================

  static init() {
    console.log('[CopilotOnboarding] Static init() called');
    
    if (window.copilotOnboarding) {
      console.log('[CopilotOnboarding] Instance already exists');
      return window.copilotOnboarding;
    }
    
    window.copilotOnboarding = new CopilotOnboarding();
    return window.copilotOnboarding;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Export the class to window for app-initializer to use
window.CopilotOnboarding = CopilotOnboarding;
console.log('[CopilotOnboarding] Class exported to window');