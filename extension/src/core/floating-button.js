console.log('🔧 LOADING: floating-button.js');

function extractUuidFromUrl(url) {
  if (!url) return null;
  const match = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

// ThreadCub Floating Button Module
// Extracted from Section 4A-4F of content.js

// ---------------------------------------------------------------------------
// Service worker retry helper
// The background service worker can go idle and drop sendMessage calls.
// This wrapper retries once after 500ms if the first attempt fails with a
// 'Could not establish connection' or similar error.
// ---------------------------------------------------------------------------
async function sendMessageWithRetry(message, retryDelay = 500) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const errMsg = chrome.runtime.lastError.message || '';
        const isWorkerIdle = errMsg.includes('Could not establish connection') ||
                             errMsg.includes('Extension context invalidated') ||
                             errMsg.includes('The message port closed') ||
                             errMsg.includes('receiving end does not exist');
        if (isWorkerIdle) {
          console.warn('🔄 sendMessageWithRetry: worker idle, retrying in', retryDelay, 'ms...', errMsg);
          setTimeout(() => {
            chrome.runtime.sendMessage(message, (retryResponse) => {
              if (chrome.runtime.lastError) {
                console.error('🔄 sendMessageWithRetry: retry also failed:', chrome.runtime.lastError.message);
                resolve(null);
              } else {
                resolve(retryResponse);
              }
            });
          }, retryDelay);
        } else {
          console.error('🔄 sendMessageWithRetry: non-retryable error:', errMsg);
          resolve(null);
        }
      } else {
        resolve(response);
      }
    });
  });
}

class ThreadCubFloatingButton {
  constructor() {
    this.button = null;
    this.shadowButton = null;
    this.borderOverlay = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentEdge = 'right';
    this.currentPosition = 0.5;
    this.edgeMargin = 18; // CHANGE THIS LINE from 25 to 18
    this.buttonSize = 60; // Keep buttonSize as it's used for calculations
    this.currentBearState = 'default';
    this.isExporting = false;
    this.lastExportTime = 0;
    this.pendingCount = 0;

    console.log('🐻 ThreadCub: Starting floating button...');

    this.init();
  }

  init() {
    this.createButton();
    this.createBorderOverlay();
    // Removed addStyles() as it will be loaded via external CSS file
    this.setupEventListeners();
    this.loadPosition();
    this.checkPendingQueue();
    this.listenForPendingUpdates();
    this.applyHiddenState();
    this.listenForVisibilityChanges();

    console.log('🐻 ThreadCub: Floating button ready!');
  }

  createButton() {
    this.button = document.createElement('div');
    this.button.id = 'threadcub-edge-btn';

    // Try to get bear images first
    const bearImages = this.getBearImages();

    this.button.innerHTML = `
      <div class="threadcub-btn-content">
        <div class="threadcub-bear-face" id="bear-face">
          ${bearImages.default}
        </div>
      </div>
      <div class="threadcub-action-buttons">
        <div class="threadcub-new-btn" data-action="new">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>
            <path d="m21 3-9 9"/>
            <path d="M15 3h6v6"/>
          </svg>
        </div>
        <div class="threadcub-save-btn" data-action="save">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <path d="m7 10 5-5 5 5"/>
            <path d="M12 5v12"/>
          </svg>
        </div>
        <div class="threadcub-download-btn" data-action="download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 15V3"/>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <path d="m7 10 5 5 5-5"/>
          </svg>
        </div>
        <div class="threadcub-tag-btn" data-action="tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
            <path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"/>
            <circle cx="6.5" cy="9.5" r=".5" fill="currentColor"/>
          </svg>
        </div>
        <div class="threadcub-close-btn" data-action="close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </div>
      </div>
      <div class="threadcub-grip-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="12" r="1"/>
          <circle cx="9" cy="5" r="1"/>
          <circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/>
          <circle cx="15" cy="5" r="1"/>
          <circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
    `;

    // Store the bear image URLs for later use
    this.bearImages = bearImages;

    // Set initial position (dynamic style, remains in JS)
    this.setEdgePosition('right', 0.5);

    // Add to page
    document.body.appendChild(this.button);
    console.log('🐻 ThreadCub: Button added to page');
  }

  getBearImages() {
    console.log('🐻 ThreadCub: Getting bear images with fallback handling...');

    // More robust extension context checking
    let useExtensionImages = false;

    try {
      if (typeof chrome !== 'undefined' &&
          chrome.runtime &&
          chrome.runtime.getURL &&
          chrome.runtime.id) {

        const testUrl = chrome.runtime.getURL('icons/icon-48.png');
        if (testUrl && testUrl.startsWith('chrome-extension://')) {
          useExtensionImages = true;
          console.log('🐻 ThreadCub: Extension context available, using extension images');
        }
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Extension context not available:', error);
      useExtensionImages = false;
    }

    if (useExtensionImages) {
      try {
        const defaultIcon = chrome.runtime.getURL('icons/icon-48.png');
        const happyIcon = chrome.runtime.getURL('icons/icon-happy.png');
        const sadIcon = chrome.runtime.getURL('icons/icon-sad.png');
        const taggingIcon = chrome.runtime.getURL('icons/icon-happier.png');

        // Apply a class for styling and let CSS manage transition
        return {
          default: `<img src="${defaultIcon}" class="bear-img" alt="ThreadCub" onerror="console.log('🐻 Image load failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <span class="bear-emoji">🐻</span>`,
          happy: `<img src="${happyIcon}" class="bear-img" alt="Happy ThreadCub" onerror="console.log('🐻 Happy image failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                  <span class="bear-emoji">😊</span>`,
          sad: `<img src="${sadIcon}" class="bear-img" alt="Sad ThreadCub" onerror="console.log('🐻 Sad image failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <span class="bear-emoji">😢</span>`,
          tagging: `<img src="${taggingIcon}" class="bear-img" alt="Tagging ThreadCub" onerror="console.log('🐻 Tagging image failed, using emoji'); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <span class="bear-emoji">🏷️</span>`
        };
      } catch (error) {
        console.log('🐻 ThreadCub: Error generating extension image URLs:', error);
      }
    }

    // Fallback to emojis (always works)
    console.log('🐻 ThreadCub: Using emoji fallbacks for maximum compatibility');
    return {
      default: '<span class="bear-emoji">🐻</span>',
      happy: '<span class="bear-emoji">😊</span>',
      sad: '<span class="bear-emoji">😢</span>',
      tagging: '<span class="bear-emoji">🏷️</span>'
    };
  }

  createBorderOverlay() {
    this.borderOverlay = document.createElement('div');
    this.borderOverlay.id = 'threadcub-border-overlay';
    // Opacity and transition remain in JS for dynamic control
    this.borderOverlay.style.opacity = '0';
    document.body.appendChild(this.borderOverlay);
  }

  // Removed addStyles() method as styles will be in floating-button.css

  // ===== EVENT HANDLING =====
  setupEventListeners() {
    // Mouse events
    this.button.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events
    this.button.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Click events for action buttons (using event delegation on button)
    this.button.addEventListener('click', this.handleClick.bind(this));

    // Custom tooltip system
    this.setupTooltips();

    // Download format flyout menu
    this.setupDownloadFlyout();

    // Hover events for bear expressions
    this.setupBearExpressionListeners();

    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  setupTooltips() {
    const tooltipData = {
      'threadcub-new-btn': 'Continue Your Chat',
      'threadcub-save-btn': 'Send to ThreadCub',
      'threadcub-download-btn': 'Download',
      'threadcub-tag-btn': 'Pawmarks',
      'threadcub-close-btn': 'Bye For Now'
    };

    Object.entries(tooltipData).forEach(([className, text]) => {
      const button = this.button.querySelector(`.${className}`);
      if (!button) return;

      let tooltip = null;
      let showTimeout = null;
      let hideTimeout = null;

      const showTooltip = (e) => {
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);

        showTimeout = setTimeout(() => {
          // Suppress download button tooltip when flyout is visible
          if (className === 'threadcub-download-btn' && this.downloadFlyout?.classList.contains('show')) {
            return;
          }

          // Remove any existing tooltips
          document.querySelectorAll('.threadcub-tooltip').forEach(t => t.remove());

          // Create new tooltip
          tooltip = document.createElement('div');
          tooltip.className = 'threadcub-tooltip'; // Apply class
          tooltip.textContent = text;

          // Set initial styles for positioning (these remain inline for dynamic placement)
          tooltip.style.position = 'fixed';
          tooltip.style.opacity = '0';
          tooltip.style.pointerEvents = 'none';

          // Add to DOM
          document.body.appendChild(tooltip);

          // Get button position
          const buttonRect = button.getBoundingClientRect();

          // Force layout calculation by accessing offsetWidth
          const tooltipWidth = tooltip.offsetWidth;
          const tooltipHeight = tooltip.offsetHeight;

          // Simple positioning: 8px to the left, vertically centered
          const x = buttonRect.left - tooltipWidth - 8;
          const y = buttonRect.top + (buttonRect.height - tooltipHeight) / 2;

          // Apply position
          tooltip.style.left = x + 'px';
          tooltip.style.top = y + 'px';

          // Show with animation (using class for opacity/transform transition)
          requestAnimationFrame(() => {
            tooltip.classList.add('show');
          });

        }, 150);
      };

      const hideTooltip = () => {
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);

        if (tooltip) {
          tooltip.classList.remove('show'); // Remove class to hide
          hideTimeout = setTimeout(() => {
            if (tooltip && tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
            tooltip = null;
          }, 200);
        }
      };

      button.addEventListener('mouseenter', showTooltip);
      button.addEventListener('mouseleave', hideTooltip);
    });
  }

  setupDownloadFlyout() {
    const downloadBtn = this.button.querySelector('.threadcub-download-btn');
    if (!downloadBtn) return;

    // Create flyout element
    this.downloadFlyout = document.createElement('div');
    this.downloadFlyout.className = 'threadcub-download-flyout';
    this.downloadFlyout.innerHTML = `
      <div class="threadcub-flyout-option" data-format="json">JSON</div>
      <div class="threadcub-flyout-option" data-format="md">MD</div>
    `;
    document.body.appendChild(this.downloadFlyout);

    let hideTimeout = null;

    const removeDownloadTooltip = () => {
      if (this.downloadTooltip && this.downloadTooltip.parentNode) {
        this.downloadTooltip.parentNode.removeChild(this.downloadTooltip);
        this.downloadTooltip = null;
      }
    };

    const showFlyout = () => {
      clearTimeout(hideTimeout);

      // Clear any existing tooltips (from the regular tooltip system)
      document.querySelectorAll('.threadcub-tooltip').forEach(t => t.remove());

      // Keep the button stack expanded while flyout is active
      this.button.classList.add('flyout-active');

      // Position flyout next to download button
      const btnRect = downloadBtn.getBoundingClientRect();
      const flyoutWidth = this.downloadFlyout.offsetWidth || 100;
      const flyoutHeight = this.downloadFlyout.offsetHeight || 30;

      const flyoutLeft = btnRect.left - flyoutWidth - 8;
      const flyoutTop = btnRect.top + (btnRect.height - flyoutHeight) / 2;

      this.downloadFlyout.style.left = `${flyoutLeft}px`;
      this.downloadFlyout.style.top = `${flyoutTop}px`;

      // Create "Download" tooltip positioned to the left of the flyout
      removeDownloadTooltip();
      this.downloadTooltip = document.createElement('div');
      this.downloadTooltip.className = 'threadcub-tooltip';
      this.downloadTooltip.textContent = 'Download';
      this.downloadTooltip.style.position = 'fixed';
      this.downloadTooltip.style.pointerEvents = 'none';
      document.body.appendChild(this.downloadTooltip);

      const tooltipWidth = this.downloadTooltip.offsetWidth;
      const tooltipHeight = this.downloadTooltip.offsetHeight;
      this.downloadTooltip.style.left = `${flyoutLeft - tooltipWidth - 8}px`;
      this.downloadTooltip.style.top = `${flyoutTop + (flyoutHeight - tooltipHeight) / 2}px`;

      requestAnimationFrame(() => {
        this.downloadFlyout.classList.add('show');
        this.downloadTooltip.classList.add('show');
      });
    };

    const hideFlyout = () => {
      hideTimeout = setTimeout(() => {
        this.downloadFlyout.classList.remove('show');
        this.button.classList.remove('flyout-active');
        removeDownloadTooltip();
      }, 150);
    };

    const cancelHide = () => {
      clearTimeout(hideTimeout);
    };

    // Show on download button hover
    downloadBtn.addEventListener('mouseenter', showFlyout);
    downloadBtn.addEventListener('mouseleave', hideFlyout);

    // Keep flyout visible when hovering over it
    this.downloadFlyout.addEventListener('mouseenter', cancelHide);
    this.downloadFlyout.addEventListener('mouseleave', hideFlyout);

    // Handle format selection clicks
    this.downloadFlyout.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const option = e.target.closest('.threadcub-flyout-option');
      if (!option) return;

      const format = option.dataset.format;

      // 📊 GA: download button clicked — tracks format (json/md) and platform
      sendMessageWithRetry({
        action: 'trackEvent',
        eventType: 'floating_button_clicked',
        data: {
          platform: window.PlatformDetector?.detectPlatform() || 'unknown',
          action: 'download',
          format: format
        }
      });

      if (format === 'json') {
        this.downloadConversationJSON();
      } else if (format === 'md') {
        this.downloadConversationMarkdown();
      }

      // Hide flyout after click
      this.downloadFlyout.classList.remove('show');
      this.button.classList.remove('flyout-active');
      removeDownloadTooltip();
    });
  }

  setupBearExpressionListeners() {
    const newBtn = this.button.querySelector('.threadcub-new-btn');
    const saveBtn = this.button.querySelector('.threadcub-save-btn');
    const downloadBtn = this.button.querySelector('.threadcub-download-btn');
    const tagBtn = this.button.querySelector('.threadcub-tag-btn');
    const closeBtn = this.button.querySelector('.threadcub-close-btn');

    // These listeners change the bear image, which is HTML content, not CSS
    // The images themselves have a class for CSS transitions
    if (newBtn) {
      newBtn.addEventListener('mouseenter', () => this.setBearExpression('happy'));
      newBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (saveBtn) {
      saveBtn.addEventListener('mouseenter', () => this.setBearExpression('happy'));
      saveBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('mouseenter', () => this.setBearExpression('happy'));
      downloadBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (tagBtn) {
      tagBtn.addEventListener('mouseenter', () => this.setBearExpression('tagging'));
      tagBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', () => this.setBearExpression('sad'));
      closeBtn.addEventListener('mouseleave', () => this.setBearExpression('happy'));
    }

    this.button.addEventListener('mouseenter', () => {
      if (this.currentBearState === 'default') {
        this.setBearExpression('happy');
        this.currentBearState = 'happy';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      this.setBearExpression('default');
      this.currentBearState = 'default';
    });
  }

  setBearExpression(state) {
    const bearFace = this.button.querySelector('.threadcub-bear-face');
    if (!bearFace || !this.bearImages) return;

    let newContent;
    switch (state) {
      case 'happy':
        newContent = this.bearImages.happy;
        break;
      case 'sad':
        newContent = this.bearImages.sad;
        break;
      case 'tagging':
        newContent = this.bearImages.tagging;
        break;
      default:
        newContent = this.bearImages.default;
    }

    bearFace.innerHTML = newContent;
  }

  setSaveBtnLoading(isLoading) {
  const saveBtn = this.button?.querySelector('.threadcub-save-btn');
  if (!saveBtn) return;
  if (isLoading) {
    saveBtn.classList.add('saving');
    saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/>
      <path d="M12 3a9 9 0 0 1 9 9"/>
    </svg>`;
  } else {
    saveBtn.classList.remove('saving');
    saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <path d="m7 10 5-5 5 5"/>
      <path d="M12 5v12"/>
    </svg>`;
  }
}

  // ===== ACTION HANDLERS =====
  handleTagButtonClick() {
    try {
      console.log('🏷️ ThreadCub: Handling tag button click...');
      console.log('🏷️ ThreadCub: window.threadcubTagging exists:', !!window.threadcubTagging);

      if (window.threadcubTagging && typeof window.threadcubTagging.toggleSidePanel === 'function') {
        console.log('🏷️ ThreadCub: Calling toggleSidePanel...');
        window.threadcubTagging.toggleSidePanel();
      } else {
        console.log('🏷️ ThreadCub: Tagging system not available, initializing...');
        this.initializeTagging();
      }
    } catch (error) {
      console.error('🏷️ ThreadCub: Error in handleTagButtonClick:', error);
      this.showErrorToast('Tagging system error');
    }
  }

  initializeTagging() {
    if (typeof window.ThreadCubTagging !== 'undefined' && !window.threadcubTagging) {
      try {
        window.threadcubTagging = new window.ThreadCubTagging(this);
        console.log('🏷️ ThreadCub: Tagging system initialized from button click');

        // Now try to toggle the panel
        if (window.threadcubTagging.toggleSidePanel) {
          window.threadcubTagging.toggleSidePanel();
        }
      } catch (error) {
        console.error('🏷️ ThreadCub: Failed to initialize tagging system:', error);
      }
    } else {
      console.log('🏷️ ThreadCub: ThreadCubTagging class not available');
    }
  }

  ensureTaggingAvailable() {
    if (!window.threadcubTagging) {
      this.initializeTagging();
    }
    return !!window.threadcubTagging;
  }

  // ===== MOUSE/TOUCH EVENT HANDLERS =====
  handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Check for action button clicks
    const newBtn = e.target.closest('.threadcub-new-btn');
    const saveBtn = e.target.closest('.threadcub-save-btn');
    const downloadBtn = e.target.closest('.threadcub-download-btn');
    const tagBtn = e.target.closest('.threadcub-tag-btn');
    const closeBtn = e.target.closest('.threadcub-close-btn');

   if (newBtn) {
      // 📊 GA: continue button clicked — opens conversation in new AI tab
      sendMessageWithRetry({
        action: 'trackEvent',
        eventType: 'floating_button_clicked',
        data: {
          platform: window.PlatformDetector?.detectPlatform() || 'unknown',
          action: 'continue'
        }
      });
      
      this.saveAndOpenConversation('floating');
      return;
    }

    if (saveBtn) {
      // 📊 GA: save button clicked — saves conversation to ThreadCub without opening new tab
      sendMessageWithRetry({
        action: 'trackEvent',
        eventType: 'floating_button_clicked',
        data: {
          platform: window.PlatformDetector?.detectPlatform() || 'unknown',
          action: 'save'
        }
      });

      this.saveConversationOnly('floating');
      return;
    }

    if (downloadBtn) {
      // Download flyout menu handles format selection - just prevent drag
      return;
    }

    if (tagBtn) {
      console.log('🏷️ ThreadCub: Tag button clicked');
      
      // 📊 GA: tag (pawmarks) button clicked
      sendMessageWithRetry({
        action: 'trackEvent',
        eventType: 'floating_button_clicked',
        data: {
          platform: window.PlatformDetector?.detectPlatform() || 'unknown',
          action: 'tag'
        }
      });
      
      this.handleTagButtonClick();
      return;
    }

    if (closeBtn) {
      this.destroy();
      return;
    }

    // Start drag for bear head, grip icon, or main button (but not action buttons)
    if (!e.target.closest('.threadcub-action-buttons')) {
      this.startDrag(e.clientX, e.clientY);
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.endDrag(e.clientX, e.clientY);
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    const touch = e.changedTouches[0];
    this.endDrag(touch.clientX, touch.clientY);
  }

  handleClick(e) {
    // Prevent click if it was part of a drag operation
    if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    // Handle specific click logic if needed, but not for drag
    // No default action here if it was a drag,
    // otherwise, let action buttons handle their own clicks via handleMouseDown
  }

  handleResize() {
    // Add small delay to allow window to fully resize before repositioning
    setTimeout(() => {
      this.setEdgePosition(this.currentEdge, this.currentPosition);
    }, 100);
  }

  // ===== DRAG FUNCTIONALITY =====
  startDrag(clientX, clientY) {
    this.isDragging = true;
    this.button.classList.add('dragging'); // Add class for dragging styles
    this.startX = clientX;
    this.startY = clientY;

    this.borderOverlay.style.opacity = '1'; // Direct style as it's dynamic
    this.createShadowButton();
  }

  createShadowButton() {
    if (this.shadowButton) this.shadowButton.remove();

    this.shadowButton = document.createElement('div');
    this.shadowButton.className = 'threadcub-shadow-button'; // Apply class
    document.body.appendChild(this.shadowButton);
    this.updateShadowPosition();
  }

  updateShadowPosition() {
    if (!this.shadowButton) return;

    const snapPosition = this.calculateSnapPosition(this.currentEdge, this.currentPosition);
    // Adjusted shadow position for visual offset
    this.shadowButton.style.left = `${snapPosition.x + 6}px`;
    this.shadowButton.style.top = `${snapPosition.y + 6}px`;
    this.shadowButton.classList.add('active'); // Add active class to show shadow
  }

  calculateSnapPosition(edge, position) {
    const { innerWidth: width, innerHeight: height } = window;
    let x, y;

    switch (edge) {
      case 'left':
        x = this.edgeMargin;
        y = position * (height - this.buttonSize);
        break;
      case 'right':
        x = width - this.buttonSize - this.edgeMargin;
        y = position * (height - this.buttonSize);
        break;
      case 'top':
        x = position * (width - this.buttonSize);
        y = this.edgeMargin;
        break;
      case 'bottom':
        x = position * (width - this.buttonSize);
        y = height - this.buttonSize - this.edgeMargin;
        break;
      default: // Fallback
        x = width - this.buttonSize - this.edgeMargin; // Default to right
        y = position * (height - this.buttonSize);
    }

    // Clamp values to ensure button stays within viewport
    x = Math.max(this.edgeMargin, Math.min(width - this.buttonSize - this.edgeMargin, x));
    y = Math.max(this.edgeMargin, Math.min(height - this.buttonSize - this.edgeMargin, y));

    return { x, y };
  }

  updateDragPosition(clientX, clientY) {
    // Update button position dynamically during drag
    this.button.style.left = `${clientX - this.buttonSize/2}px`;
    this.button.style.top = `${clientY - this.buttonSize/2}px`;

    // Calculate nearest edge
    const { innerWidth: width, innerHeight: height } = window;
    const distances = {
      left: clientX,
      right: width - clientX,
      top: clientY,
      bottom: height - clientY
    };

    const nearestEdge = Object.keys(distances).reduce((a, b) => distances[a] < distances[b] ? a : b);

    let position;
    if (nearestEdge === 'left' || nearestEdge === 'right') {
      position = Math.max(0, Math.min(1, (clientY - this.buttonSize/2) / (height - this.buttonSize)));
    } else {
      position = Math.max(0, Math.min(1, (clientX - this.buttonSize/2) / (width - this.buttonSize)));
    }

    this.currentEdge = nearestEdge;
    this.currentPosition = position;
    this.updateShadowPosition();
  }

  endDrag(clientX, clientY) {
    const moveDistance = Math.sqrt(
      Math.pow(clientX - this.startX, 2) + Math.pow(clientY - this.startY, 2)
    );

    this.isDragging = false;
    this.button.classList.remove('dragging'); // Remove dragging class
    this.borderOverlay.style.opacity = '0'; // Hide border overlay

    if (this.shadowButton) {
      this.shadowButton.classList.remove('active'); // Hide shadow button
      // Delay removal to allow fade out transition
      setTimeout(() => {
        if (this.shadowButton) {
          this.shadowButton.remove();
          this.shadowButton = null;
        }
      }, 200);
    }

    // Only animate to new position if significant movement occurred
    if (moveDistance >= 10) {
      this.animateToEdgePosition();
      this.savePosition();
    }
  }

  animateToEdgePosition() {
    this.button.style.transition = 'all var(--transition-drag-snap)'; // Use CSS variable for snap transition
    this.setEdgePosition(this.currentEdge, this.currentPosition);

    // Reset transition after animation to allow regular hover transitions
    setTimeout(() => {
      this.button.style.transition = 'all var(--transition-base)'; // Use CSS variable for base transition
    }, 300);
  }

  // ===== POSITION MANAGEMENT =====
  setEdgePosition(edge, position) {
    const snapPosition = this.calculateSnapPosition(edge, position);

    this.button.style.left = `${snapPosition.x}px`;
    this.button.style.top = `${snapPosition.y}px`;

    // Update class for edge-specific styling (action button layout)
    this.button.className = this.button.className.replace(/edge-\w+/g, ''); // Clear existing edge classes
    this.button.classList.add(`edge-${edge}`);

    this.currentEdge = edge;
    this.currentPosition = position;
  }

  savePosition() {
    const position = { edge: this.currentEdge, position: this.currentPosition };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ threadcubButtonPosition: position });
      } else {
        localStorage.setItem('threadcubButtonPosition', JSON.stringify(position));
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Could not save position:', error);
    }
  }

  async loadPosition() {
    try {
      let savedPosition = null;

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['threadcubButtonPosition']);
        savedPosition = result.threadcubButtonPosition;
      } else {
        const saved = localStorage.getItem('threadcubButtonPosition');
        savedPosition = saved ? JSON.parse(saved) : null;
      }

      if (savedPosition && savedPosition.edge && typeof savedPosition.position === 'number') {
        this.setEdgePosition(savedPosition.edge, savedPosition.position);
      }
    } catch (error) {
      console.log('🐻 ThreadCub: Could not load position:', error);
    }
  }

  // ===== PENDING SAVE QUEUE =====

  /**
   * Check background for any queued failed saves and update the badge.
   */
  async checkPendingQueue() {
    try {
      const response = await sendMessageWithRetry({ action: 'getPendingCount' });
      if (response && response.success) {
        this.updatePendingBadge(response.count);
      }
    } catch (e) {
      // Background not ready yet — silently ignore
    }
  }

  /**
   * Listen for background notifications about queue changes.
   */
  listenForPendingUpdates() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'pendingSavesUpdated') {
        this.updatePendingBadge(message.count);
      }
    });
  }

  applyHiddenState() {
    chrome.storage.local.get('threadcub_button_hidden', ({ threadcub_button_hidden }) => {
      if (this.button) {
        this.button.style.display = threadcub_button_hidden ? 'none' : '';
      }
    });
  }

  listenForVisibilityChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'threadcub_button_hidden' in changes) {
        const isHidden = !!changes.threadcub_button_hidden.newValue;
        if (this.button) {
          this.button.style.display = isHidden ? 'none' : '';
          console.log('🐻 ThreadCub: Floating button visibility:', isHidden ? 'hidden' : 'visible');
        }
      }
    });
  }

  /**
   * Show/hide a badge on the bear button indicating pending failed saves.
   * If count > 0, shows a red dot with a tooltip; clicking it triggers retry.
   */
  updatePendingBadge(count) {
    this.pendingCount = count;
    const existingBadge = this.button?.querySelector('#tc-pending-badge');

    if (count === 0) {
      if (existingBadge) existingBadge.remove();
      return;
    }

    if (existingBadge) {
      existingBadge.title = `${count} save(s) pending — click to retry`;
      return;
    }

    // Create badge
    const badge = document.createElement('div');
    badge.id = 'tc-pending-badge';
    badge.title = `${count} save(s) pending — click to retry`;
    badge.style.cssText = `
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: {window.ThreadCubRebrand?.colors?.error || '#EF4444'};
      border-radius: 50%;
      border: 2px solid white;
      cursor: pointer;
      z-index: 10;
      animation: tc-pulse 2s infinite;
    `;

    // Inject keyframe animation if not already present
    if (!document.getElementById('tc-pending-style')) {
      const style = document.createElement('style');
      style.id = 'tc-pending-style';
      style.textContent = `
        @keyframes tc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }

    badge.addEventListener('click', async (e) => {
      e.stopPropagation();
      badge.style.background = (window.ThreadCubRebrand?.colors?.warning || '#F59E0B'); // amber while retrying
      badge.title = 'Retrying...';
      try {
        await sendMessageWithRetry({ action: 'retryPendingQueue' });
        this.showSuccessToast('Retrying failed saves...');
      } catch (err) {
        this.showErrorToast('Retry failed — will try again on next load');
      }
    });

    this.button.style.position = 'relative';
    this.button.appendChild(badge);
  }

  // ===== TOAST NOTIFICATIONS =====
  showSuccessToast(message = '✅ Success!') {
    window.UIComponents.showSuccessToast(message);
  }

  showErrorToast(message = '❌ Error occurred') {
    window.UIComponents.showErrorToast(message);
  }

  showToast(message, type = 'success') {
    window.UIComponents.showToast(message, type);
  }

  // Static method for global access
  static showGlobalSuccessToast(message = 'Operation completed successfully!') {
    window.UIComponents.showGlobalSuccessToast(message);
  }

  // ===== UTILITY METHODS =====
  destroy() {
    // Hide in-place rather than removing from the DOM.
    // This keeps the element alive so listenForVisibilityChanges() can
    // restore it when the popup toggles it back on.
    if (this.button) {
      this.button.style.display = 'none';
    }
    // Clean up any floating UI that shouldn't linger while hidden
    document.querySelectorAll('.threadcub-tooltip').forEach(t => t.remove());
    if (this.downloadFlyout) {
      this.downloadFlyout.classList.remove('show');
    }
    if (this.downloadTooltip && this.downloadTooltip.parentNode) {
      this.downloadTooltip.parentNode.removeChild(this.downloadTooltip);
      this.downloadTooltip = null;
    }
    // Persist hidden state so the popup toggle stays in sync
    chrome.storage.local.set({ threadcub_button_hidden: true });
    console.log('🐻 ThreadCub: Button hidden (kept in DOM for restore)');
  }

  // Session ID management removed - now using window.StorageService.getOrCreateSessionId()

  // ===== REAL WORKING METHODS (MOVED FROM CONTENT.JS) =====
  async saveAndOpenConversation(source = 'floating') {
  console.log('🐻 ThreadCub: Starting conversation save and open from:', source);

  // ===== GET USER AUTH TOKEN VIA BACKGROUND SCRIPT =====
  console.log('🔧 Getting user auth token via background script...');
  let userAuthToken = null;

  try {
    const response = await sendMessageWithRetry({ action: 'getAuthToken' });
    if (response && response.success) {
      userAuthToken = response.authToken;
      console.log('🔧 Auth token retrieved from ThreadCub tab:', !!userAuthToken);
      console.log('🔧 Auth token length:', userAuthToken?.length || 'null');
    } else {
      console.log('🔧 Could not get auth token:', response?.error || 'Unknown error');
    }
  } catch (error) {
    console.log('🔧 Background script communication failed:', error);
  }

  // Prevent double exports with debounce
  const now = Date.now();
  if (this.isExporting || (now - this.lastExportTime) < 2000) {
    console.log('🐻 ThreadCub: Export already in progress or too soon after last export');
    return;
  }

  this.isExporting = true;
  this.setSaveBtnLoading(true);

  try {
    // Extract conversation data from the current AI platform
    conversationData = await window.ConversationExtractor.extractConversation();

    console.log('🔍 DEBUG: Current hostname:', window.location.hostname);
    const targetPlatform = window.ConversationExtractor.getTargetPlatformFromCurrentUrl();
    console.log('🔍 DEBUG: targetPlatform detected as:', targetPlatform);

    // CRITICAL FIX: Validate conversation data before proceeding
    if (!conversationData) {
      console.error('🐻 ThreadCub: No conversation data returned from extraction');
      // 📊 GA: continue failed — no conversation data found on page
      sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_failed', data: { reason: 'no_conversation_data', platform: window.PlatformDetector?.detectPlatform() || 'unknown' } });
      this.showErrorToast('No conversation found to save');
      this.isExporting = false;
    this.setSaveBtnLoading(false);
      return;
    }

    if (!conversationData.messages || conversationData.messages.length === 0) {
      console.error('🐻 ThreadCub: No messages found in conversation data');
      // 📊 GA: continue failed — conversation found but no messages extracted
      sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_failed', data: { reason: 'no_messages', platform: window.PlatformDetector?.detectPlatform() || 'unknown' } });
      this.showErrorToast('No messages found in conversation');
      this.isExporting = false;
    this.setSaveBtnLoading(false);
      return;
    }

    console.log(`🐻 ThreadCub: Successfully extracted ${conversationData.messages.length} messages`);

    // Store conversation data globally for later use
    this.lastConversationData = conversationData;

    // Format data to match API route expectations (WITH AUTH TOKEN)
    // Get session ID for anonymous conversation tracking
    const sessionId = await window.StorageService.getOrCreateSessionId();
    console.log('🔍 Session ID for API call:', sessionId);

    // Resolve parent_conversation_id — in-memory first, then chrome.storage fallback
    let parentConversationId = this.lastSavedConversationId || null;
    if (!parentConversationId && conversationData.url) {
      const stored = await chrome.storage.local.get([`tc_parent_${conversationData.url}`]);
      parentConversationId = stored[`tc_parent_${conversationData.url}`] || null;
    }
    console.log('🔍 Resolved parentConversationId:', parentConversationId);

    const apiData = {
      conversationData: conversationData,
      source: conversationData.platform?.toLowerCase() || 'unknown',
      title: conversationData.title || 'Untitled Conversation',
      userAuthToken: userAuthToken,
      session_id: sessionId,
      capture_method: 'continue',
      parent_conversation_id: parentConversationId,
      source_chat_url: conversationData.url || null
    };

    console.log('🔍 parent_conversation_id:', apiData.parent_conversation_id, 'conversationData.url:', conversationData.url);
    console.log('🔍 API Data includes session_id:', !!apiData.session_id);

    // API call via ApiService — reuse cached save if Save was clicked recently (within 30s)
    try {
      let shareUrl, summary;

      const recentSave = apiData.capture_method !== 'continue' && this.lastSavedAt && (Date.now() - this.lastSavedAt) < 30000 && this.lastSavedShareUrl;

      if (recentSave) {
        console.log('🐻 ThreadCub: Reusing cached save result — skipping duplicate API call');
        shareUrl = this.lastSavedShareUrl;
        summary = window.ConversationExtractor.generateQuickSummary(conversationData.messages);
        // Clear cache after using it
        this.lastSavedConversationId = null;
        this.lastSavedShareUrl = null;
        this.lastSavedConversationData = null;
        this.lastSavedAt = null;
      } else {
        console.log("🔍 PRE-SAVE apiData.capture_method:", apiData.capture_method, "| apiData.source_chat_url:", apiData.source_chat_url);
        const data = await window.ApiService.saveConversation(apiData);

        // Store session_id returned from server (ensures anonymous saves are claimable)
        if (data.session_id) {
          try {
            localStorage.setItem('threadcubSessionId', data.session_id);
            chrome.storage.local.set({ threadcubSessionId: data.session_id });
            console.log('🔑 ThreadCub: session_id stored from server response:', data.session_id);
          } catch(e) {
            console.log('🔑 ThreadCub: could not store session_id', e);
          }
        }

        // Generate continuation prompt and handle platform-specific flow
        summary = data.summary || window.ConversationExtractor.generateQuickSummary(conversationData.messages);

        // Log the full API response so we can see exactly what keys are returned
        console.log('🔍 DEBUG: Full save API response:', JSON.stringify(data));

        // Extract conversation ID — backend may return it under different keys
        // Use nullish coalescing to avoid picking up JS `undefined` values, which
        // would coerce to the string "undefined" inside the template literal below.
        const rawId = data.conversationId ?? data.id ?? data.conversation?.id ?? data.data?.id ?? null;
        const conversationId = (rawId && typeof rawId === 'string' && rawId !== 'undefined') ? rawId : null;
        console.log('🔍 DEBUG: conversationId resolved as:', conversationId);
        this.lastSavedConversationId = conversationId;

        // Persist ThreadCub UUID so next Continue on same Claude URL knows its parent
        if (conversationId && conversationData.url) {
          chrome.storage.local.set({ [`tc_parent_${conversationData.url}`]: conversationId });
          console.log('🔍 DEBUG: Persisted parent ID for URL:', conversationData.url);
        }

        // Build shareUrl — only if we have a real UUID
        shareUrl = data.shareableUrl ||
                         (conversationId ? `https://threadcub.com/api/share/${conversationId}` : null);
        console.log('🔍 DEBUG: shareUrl:', shareUrl);
      }

      // If no valid shareUrl came back, fall back to direct continuation
      if (!shareUrl) {
        console.warn('🐻 ThreadCub: No conversation ID in API response, falling back to direct continuation');
        this.handleDirectContinuation(conversationData);
        this.isExporting = false;
    this.setSaveBtnLoading(false);
        return;
      }

      // Generate minimal continuation prompt
      // Enrich with API message count so pagination threshold is accurate
      const enrichedConversationData = { ...conversationData, total_messages: data?.message_count || data?.total_messages || conversationData.messages?.length || 0 };
      const minimalPrompt = window.ConversationExtractor.generateContinuationPrompt(summary, shareUrl, conversationData.platform, enrichedConversationData);

      console.log('🔍 DEBUG: About to route to platform:', targetPlatform);

      if (targetPlatform === 'chatgpt') {
        console.log('🤖 ThreadCub: Routing to ChatGPT flow (with file download)');
        // 📊 GA: continue succeeded — routed to ChatGPT
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'chatgpt', message_count: conversationData.messages.length } });
        this.handleChatGPTFlow(minimalPrompt, shareUrl, conversationData);
      } else if (targetPlatform === 'claude') {
        console.log('🤖 ThreadCub: Routing to Claude flow (no file download)');
        // 📊 GA: continue succeeded — routed to Claude
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'claude', message_count: conversationData.messages.length } });
        this.handleClaudeFlow(minimalPrompt, shareUrl, conversationData);
      } else if (targetPlatform === 'gemini') {
        console.log('🤖 ThreadCub: Routing to Gemini flow (with file download)');
        // 📊 GA: continue succeeded — routed to Gemini
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'gemini', message_count: conversationData.messages.length } });
        this.handleGeminiFlow(minimalPrompt, shareUrl, conversationData);
      } else if (targetPlatform === 'grok') {
        console.log('🤖 ThreadCub: Routing to Grok flow (with file download)');
        // 📊 GA: continue succeeded — routed to Grok
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'grok', message_count: conversationData.messages.length } });
        this.handleGrokFlow(minimalPrompt, shareUrl, conversationData);
      } else if (targetPlatform === 'deepseek') {
        console.log('🔵 ThreadCub: Routing to DeepSeek flow (with file download)');
        // 📊 GA: continue succeeded — routed to DeepSeek
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'deepseek', message_count: conversationData.messages.length } });
        this.handleDeepSeekFlow(minimalPrompt, shareUrl, conversationData);
      } else if (targetPlatform === 'perplexity') {
        console.log('🔮 ThreadCub: Routing to Perplexity flow (file-based)');
        // 📊 GA: continue succeeded — routed to Perplexity
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'perplexity', message_count: conversationData.messages.length } });
        this.handlePerplexityFlow(minimalPrompt, shareUrl, conversationData);
      } else {
        console.log('🤖 ThreadCub: Unknown platform, defaulting to ChatGPT flow');
        // 📊 GA: continue succeeded — platform unknown, defaulted to ChatGPT
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_success', data: { platform: 'unknown_defaulted_chatgpt', message_count: conversationData.messages.length } });
        this.handleChatGPTFlow(minimalPrompt, shareUrl, conversationData);
      }

      this.setBearExpression('happy');
      setTimeout(() => {
        if (this.currentBearState !== 'default') {
          this.setBearExpression('default');
        }
      }, 2000);

      this.isExporting = false;
    this.setSaveBtnLoading(false);

    } catch (apiError) {
      console.error('🐻 ThreadCub: Direct API call failed:', apiError);
      console.log('🐻 ThreadCub: Falling back to direct continuation without API save...');
      // 📊 GA: continue failed — API error, falling back to direct continuation
      sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_failed', data: { reason: 'api_error_fallback', platform: conversationData?.platform || 'unknown', error: apiError.message } });
      // FALLBACK: Skip API save and go straight to continuation
      this.handleDirectContinuation(conversationData);
      this.isExporting = false;
    this.setSaveBtnLoading(false);
      return;
    }

  } catch (error) {
    console.error('🐻 ThreadCub: Export error:', error);
    // 📊 GA: continue failed — unexpected error during export process
    sendMessageWithRetry({ action: 'trackEvent', eventType: 'continue_failed', data: { reason: 'unexpected_error', error: error.message } });
    this.showErrorToast('Export failed: ' + error.message);
    this.isExporting = false;
    this.setSaveBtnLoading(false);
  }
  }

  async saveConversationOnly(source = 'floating') {
    console.log('🐻 ThreadCub: Starting save-only (no tab open) from:', source);

    // ===== GET USER AUTH TOKEN VIA BACKGROUND SCRIPT =====
    console.log('🔧 Getting user auth token via background script...');
    let userAuthToken = null;

    try {
      const response = await sendMessageWithRetry({ action: 'getAuthToken' });
      if (response && response.success) {
        userAuthToken = response.authToken;
        console.log('🔧 Auth token retrieved from ThreadCub tab:', !!userAuthToken);
      } else {
        console.log('🔧 Could not get auth token:', response?.error || 'Unknown error');
      }
    } catch (error) {
      console.log('🔧 Background script communication failed:', error);
    }

    // Prevent double exports with debounce
    const now = Date.now();
    if (this.isExporting || (now - this.lastExportTime) < 2000) {
      console.log('🐻 ThreadCub: Export already in progress or too soon after last export');
      return;
    }

    this.isExporting = true;
    this.setSaveBtnLoading(true);

    try {
      // Extract conversation data from the current AI platform
      const conversationData = await window.ConversationExtractor.extractConversation();

      if (!conversationData) {
        console.error('🐻 ThreadCub: No conversation data returned from extraction');
        // 📊 GA: save failed — no conversation data found on page
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'save_failed', data: { reason: 'no_conversation_data', platform: window.PlatformDetector?.detectPlatform() || 'unknown' } });
        this.showErrorToast('No conversation found to save');
        this.isExporting = false;
    this.setSaveBtnLoading(false);
        return;
      }

      if (!conversationData.messages || conversationData.messages.length === 0) {
        console.error('🐻 ThreadCub: No messages found in conversation data');
        // 📊 GA: save failed — conversation found but no messages extracted
        sendMessageWithRetry({ action: 'trackEvent', eventType: 'save_failed', data: { reason: 'no_messages', platform: window.PlatformDetector?.detectPlatform() || 'unknown' } });
        this.showErrorToast('No messages found in conversation');
        this.isExporting = false;
    this.setSaveBtnLoading(false);
        return;
      }

      console.log(`🐻 ThreadCub: Successfully extracted ${conversationData.messages.length} messages`);

      // Get session ID for anonymous conversation tracking
      const sessionId = await window.StorageService.getOrCreateSessionId();

      const apiData = {
        conversationData: conversationData,
        source: conversationData.platform?.toLowerCase() || 'unknown',
        title: conversationData.title || 'Untitled Conversation',
        userAuthToken: userAuthToken,
        session_id: sessionId,
        capture_method: 'save',
        parent_conversation_id: null
      };

      // API call via ApiService - save only, no tab open
      try {
        const data = await window.ApiService.saveConversation(apiData);

        // Store session_id returned from server (ensures anonymous saves are claimable)
        if (data.session_id) {
          try {
            localStorage.setItem('threadcubSessionId', data.session_id);
            chrome.storage.local.set({ threadcubSessionId: data.session_id });
            console.log('🔑 ThreadCub: session_id stored from server response:', data.session_id);
          } catch(e) {
            console.log('🔑 ThreadCub: could not store session_id', e);
          }
        }

        console.log('🐻 ThreadCub: Conversation saved to ThreadCub successfully');
        // 📊 GA: save succeeded — conversation successfully saved to ThreadCub
        try { if (window.AnalyticsService) window.AnalyticsService.trackFeatureUsed('sync_success', { platform: conversationData.platform || 'unknown' }); } catch(e) {}
        try { sendMessageWithRetry({ action: 'trackEvent', eventType: 'save_success', data: { platform: conversationData.platform || 'unknown', message_count: conversationData.messages.length } }); } catch(e) {}

        this.setBearExpression('happy');

        const undoConversationId = data.conversationId || data.id || data.data?.id;
        const undoSessionId = sessionId;

        // Cache the save result so Continue can reuse it without re-saving
        this.lastSavedConversationId = undoConversationId;
        // Persist to chrome.storage so Continue works even after page reload
        if (undoConversationId && conversationData.url) {
          chrome.storage.local.set({ [`tc_parent_${conversationData.url}`]: undoConversationId });
        }
        this.lastSavedShareUrl = data.shareableUrl || (undoConversationId ? `https://threadcub.com/api/share/${undoConversationId}` : null);
        this.lastSavedConversationData = conversationData;
        this.lastSavedAt = Date.now();
        console.log('🐻 ThreadCub: Cached save result — shareUrl:', this.lastSavedShareUrl);

        window.UIComponents.showUndoToast(
          'Saved for when ThreadCub launches. Changed your mind?',
          async () => {
            try {
              await window.ApiService.deleteConversation(undoConversationId, undoSessionId);
              // Clear cache on undo
              this.lastSavedConversationId = null;
              this.lastSavedShareUrl = null;
              this.lastSavedConversationData = null;
              this.lastSavedAt = null;
              window.UIComponents.showSuccessToast('Save undone.');
            } catch (e) {
              window.UIComponents.showErrorToast('Could not undo — try again.');
            }
          }
        );

        this.checkPendingQueue(); // refresh badge in case a retry just cleared items

        setTimeout(() => {
          if (this.currentBearState !== 'default') {
            this.setBearExpression('default');
          }
        }, 2000);

        this.isExporting = false;
    this.setSaveBtnLoading(false);

      } catch (apiError) {
        const isContextError = apiError?.message?.includes('Extension context invalidated') || apiError?.message?.includes('context invalidated');
        if (isContextError) {
          console.warn('🐻 ThreadCub: Extension context invalidated after save — save likely succeeded. Refresh page to re-activate extension.');
        } else {
          console.error('🐻 ThreadCub: API save failed:', apiError);
          try { sendMessageWithRetry({ action: 'trackEvent', eventType: 'save_failed', data: { reason: 'api_error', platform: conversationData?.platform || 'unknown', error: apiError.message } }); } catch(e) {}
          this.showErrorToast('Failed to save conversation');
        }
        this.isExporting = false;
        this.setSaveBtnLoading(false);
      }

    } catch (error) {
      const isContextError = error?.message?.includes('Extension context invalidated') || error?.message?.includes('context invalidated');
      if (isContextError) {
        console.warn('🐻 ThreadCub: Extension context invalidated — save likely succeeded. Refresh page to re-activate extension.');
      } else {
        console.error('🐻 ThreadCub: Save error:', error);
        try { sendMessageWithRetry({ action: 'trackEvent', eventType: 'save_failed', data: { reason: 'unexpected_error', error: error.message } }); } catch(e) {}
        this.showErrorToast('Save failed: ' + error.message);
      }
      this.isExporting = false;
      this.setSaveBtnLoading(false);
    }
  }

  async downloadConversationJSON() {
    console.log('🐻 ThreadCub: Starting JSON download...');

    try {
      // Extract conversation data from the current AI platform
      console.log('🐻 ThreadCub: Extracting conversation data for download...');

      const conversationData = await window.ConversationExtractor.extractConversation();

      if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
        console.error('🐻 ThreadCub: No conversation data found');
        console.log('🐻 ThreadCub: Conversation data:', conversationData);

        // Create a fallback download with basic page info
        const fallbackData = {
          title: document.title || 'AI Conversation',
          url: window.location.href,
          platform: hostname.includes('claude.ai') ? 'Claude.ai' : 'Unknown',
          exportDate: new Date().toISOString(),
          totalMessages: 0,
          messages: [],
          note: 'No conversation messages could be extracted from this page'
        };

        this.createDownloadFromData(fallbackData);
        this.showSuccessToast('Conversation saved as JSON and Markdown!');
        return;
      }

      console.log(`🐻 ThreadCub: Successfully extracted ${conversationData.messages.length} messages for download`);

      // Create and download the conversation data
      this.createDownloadFromData(conversationData);
      this.showSuccessToast('Conversation saved as JSON and Markdown!');

    } catch (error) {
      console.error('🐻 ThreadCub: Download error:', error);

      // Create emergency fallback download
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

      this.createDownloadFromData(emergencyData);
      this.showErrorToast();
    }
  }

  async downloadConversationMarkdown() {
    console.log('🐻 ThreadCub: Starting Markdown download...');

    try {
      console.log('🐻 ThreadCub: Extracting conversation data for Markdown download...');

      const conversationData = await window.ConversationExtractor.extractConversation();

      if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
        console.error('🐻 ThreadCub: No conversation data found for Markdown');
        this.showErrorToast('No conversation found to download');
        return;
      }

      console.log(`🐻 ThreadCub: Generating Markdown for ${conversationData.messages.length} messages`);

      // Generate Markdown content
      const title = conversationData.title || 'AI Conversation';
      const platform = conversationData.platform || 'Unknown';
      const url = conversationData.url || window.location.href;

      let markdown = `# ${title}\n\n`;
      markdown += `**Platform:** ${platform}\n`;
      markdown += `**URL:** ${url}\n`;
      markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
      markdown += `**Total Messages:** ${conversationData.messages.length}\n\n`;
      markdown += `---\n\n`;

      conversationData.messages.forEach((msg, index) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        markdown += `### ${role}\n\n`;
        markdown += `${msg.content}\n\n`;
        if (index < conversationData.messages.length - 1) {
          markdown += `---\n\n`;
        }
      });

      // Generate filename
      const sanitizedTitle = window.Utilities.sanitizeFilename(title);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${platform.toLowerCase()}-${sanitizedTitle}-${timestamp}.md`;

      // Download the file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      console.log('🐻 ThreadCub: Markdown download completed:', filename);
      this.showSuccessToast('Conversation downloaded as Markdown!');

    } catch (error) {
      console.error('🐻 ThreadCub: Markdown download error:', error);
      this.showErrorToast('Markdown download failed: ' + error.message);
    }
  }

  handleChatGPTFlow(continuationPrompt, shareUrl, conversationData) {
    console.log('🤖 ThreadCub: Starting ENHANCED ChatGPT flow with auto-download...');

    // STEP 1: Auto-download the conversation file in background
    this.autoDownloadChatGPTFile(conversationData, shareUrl);

    // STEP 2: Create continuation data for cross-tab modal
    const continuationData = {
      prompt: this.generateChatGPTContinuationPrompt(),
      shareUrl: shareUrl,
      platform: 'ChatGPT',
      timestamp: Date.now(),
      messages: conversationData.messages || [],
      totalMessages: conversationData.total_messages || conversationData.messages?.length || 0,
      title: conversationData.title || 'Previous Conversation',
      conversationData: conversationData,
      chatGPTFlow: true,
      downloadCompleted: true
    };

    console.log('🤖 ThreadCub: ChatGPT continuation data prepared');

    // STEP 3: Use storage for modal
    const canUseChrome = window.StorageService.canUseChromStorage();

    if (canUseChrome) {
      console.log('🤖 ThreadCub: Using Chrome storage for ChatGPT modal...');
      window.StorageService.storeWithChrome(continuationData)
        .then(() => {
          console.log('🐻 ThreadCub: ChatGPT data stored successfully');
          const chatGPTUrl = 'https://chatgpt.com/';
          window.open(chatGPTUrl, '_blank');
          this.showSuccessToast('File downloaded! Check your new ChatGPT tab.');
        })
        .catch(error => {
          console.log('🤖 ThreadCub: Chrome storage failed, using fallback:', error);
          this.handleChatGPTFlowFallback(continuationData);
        });
    } else {
      console.log('🤖 ThreadCub: Using ChatGPT fallback method directly');
      this.handleChatGPTFlowFallback(continuationData);
    }
  }

  autoDownloadChatGPTFile(conversationData, shareUrl) {
    try {
      console.log('🤖 ThreadCub: Auto-downloading conversation file for ChatGPT...');

      const conversationJSON = {
        title: conversationData.title || 'ThreadCub Conversation Continuation',
        url: conversationData.url || window.location.href,
        platform: conversationData.platform,
        exportDate: new Date().toISOString(),
        totalMessages: conversationData.messages.length,
        source: 'ThreadCub Browser Extension - ChatGPT Continuation',
        shareUrl: shareUrl,
        instructions: 'This file contains our previous conversation. Please review it and continue from where we left off.',
        messages: conversationData.messages,
        summary: window.ConversationExtractor.generateQuickSummary(conversationData.messages)
      };

      const filename = `threadcub-continuation-${new Date().toISOString().split('T')[0]}.json`;

      const blob = new Blob([JSON.stringify(conversationJSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none'; // Keep this inline as it's a utility style
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('🤖 ThreadCub: ✅ ChatGPT file auto-downloaded:', filename);

    } catch (error) {
      console.error('🤖 ThreadCub: Error auto-downloading ChatGPT file:', error);
    }
  }

  autoDownloadGeminiFile(conversationData, shareUrl) {
  try {
    console.log('🟣 ThreadCub: Auto-downloading conversation file for Gemini...');
    
    const conversationJSON = {
      title: conversationData.title || 'ThreadCub Conversation Continuation',
      url: conversationData.url || window.location.href,
      platform: conversationData.platform,
      exportDate: new Date().toISOString(),
      totalMessages: conversationData.messages.length,
      source: 'ThreadCub Browser Extension - Gemini Continuation',
      shareUrl: shareUrl,
      instructions: 'This file contains our previous conversation. Please review it and continue from where we left off.',
      messages: conversationData.messages,
      summary: window.ConversationExtractor.generateQuickSummary(conversationData.messages)
    };
    
    const filename = `threadcub-gemini-continuation-${new Date().toISOString().split('T')[0]}.json`;
    
    const blob = new Blob([JSON.stringify(conversationJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('🟣 ThreadCub: ✅ Gemini file auto-downloaded:', filename);
    
  } catch (error) {
    console.error('🟣 ThreadCub: Error auto-downloading Gemini file:', error);
  }
}

  generateChatGPTContinuationPrompt() {
    return `I'd like to continue our previous conversation. While you can't currently access external URLs, I have our complete conversation history as a file attachment that I'll share now.

Please read through the attached conversation file and provide your assessment of:
- What we were working on
- The current status/progress
- Any next steps or tasks mentioned

Once you've reviewed it, let me know you're ready to continue from where we left off.`;
  }

  generateGeminiContinuationPrompt() {
  return `I'd like to continue our previous conversation. I have our complete conversation history as a file that I'll upload now.

Please read through the attached conversation file and provide your assessment of:
- What we were working on
- The current status/progress
- Any next steps or tasks mentioned

Once you've reviewed it, let me know you're ready to continue from where we left off.`;
}

  handleClaudeFlow(continuationPrompt, shareUrl, conversationData) {
    console.log('🤖 ThreadCub: Starting Claude flow (API-only, no downloads)...');

    const continuationData = {
      prompt: continuationPrompt,
      shareUrl: shareUrl,
      platform: 'Claude',
      timestamp: Date.now(),
      messages: conversationData.messages || [],
      totalMessages: conversationData.total_messages || conversationData.messages?.length || 0,
      title: conversationData.title || 'Previous Conversation',
      conversationData: conversationData,
      claudeFlow: true,
      downloadCompleted: false
    };

    console.log('🤖 ThreadCub: Claude continuation data with message count:', continuationData.totalMessages);

    const canUseChrome = window.StorageService.canUseChromStorage();

    if (canUseChrome) {
      console.log('🤖 ThreadCub: Using Chrome storage for Claude...');
      window.StorageService.storeWithChrome(continuationData)
        .then(() => {
          console.log('🐻 ThreadCub: Claude data stored successfully');
          const claudeUrl = 'https://claude.ai/';
          window.open(claudeUrl, '_blank');
          this.showSuccessToast('Opening Claude with conversation context...');
        })
        .catch(error => {
          console.log('🤖 ThreadCub: Chrome storage failed, using fallback:', error);
          window.StorageService.handleClaudeFlowFallback(continuationData);
        });
    } else {
      console.log('🤖 ThreadCub: Using Claude fallback method directly');
      window.StorageService.handleClaudeFlowFallback(continuationData);
    }
  }

  handleGeminiFlow(continuationPrompt, shareUrl, conversationData) {
  console.log('🟣 ThreadCub: Starting Gemini flow with auto-download...');
  
  // STEP 1: Auto-download the conversation file (same as ChatGPT)
  this.autoDownloadGeminiFile(conversationData, shareUrl);
  
  // STEP 2: Create continuation data for cross-tab modal
  const continuationData = {
    prompt: this.generateGeminiContinuationPrompt(),
    shareUrl: shareUrl,
    platform: 'Gemini',
    timestamp: Date.now(),
    messages: conversationData.messages || [],
    totalMessages: conversationData.total_messages || conversationData.messages?.length || 0,
    title: conversationData.title || 'Previous Conversation',
    conversationData: conversationData,
    geminiFlow: true,
    downloadCompleted: true
  };
  
  console.log('🟣 ThreadCub: Gemini continuation data prepared');
  
  // STEP 3: Use storage for modal
  const canUseChrome = window.StorageService.canUseChromStorage();

  if (canUseChrome) {
    console.log('🟣 ThreadCub: Using Chrome storage for Gemini modal...');
    window.StorageService.storeWithChrome(continuationData)
      .then(() => {
        console.log('🟣 ThreadCub: Gemini data stored successfully');
        const geminiUrl = 'https://gemini.google.com/app';
        window.open(geminiUrl, '_blank');
        this.showSuccessToast('File downloaded! Upload it in your new Gemini tab.');
      })
      .catch(error => {
        console.log('🟣 ThreadCub: Chrome storage failed, using fallback:', error);
        this.handleGeminiFlowFallback(continuationData);
      });
  } else {
    console.log('🟣 ThreadCub: Using Gemini fallback method directly');
    this.handleGeminiFlowFallback(continuationData);
  }
}

  // =============================================================================
  // GROK FLOW (similar to ChatGPT - with file download)
  // =============================================================================

  handleGrokFlow(continuationPrompt, shareUrl, conversationData) {
    console.log('🤖 ThreadCub: Starting Grok flow (URL-based, no downloads - like Claude)...');

    // Create continuation data with URL-based prompt (NO FILE DOWNLOAD!)
    const continuationData = {
      prompt: continuationPrompt,  // URL-based prompt from conversation-extractor
      shareUrl: shareUrl,
      platform: 'Grok',
      timestamp: Date.now(),
      messages: conversationData.messages || [],
      totalMessages: conversationData.total_messages || conversationData.messages?.length || 0,
      title: conversationData.title || 'Previous Conversation',
      conversationData: conversationData,
      grokFlow: true,
      downloadCompleted: false  // No file download needed!
    };

    console.log('🤖 ThreadCub: Grok continuation data prepared (URL-based, no file)');

    // Use storage to pass data to new tab
    const canUseChrome = window.StorageService.canUseChromStorage();

    if (canUseChrome) {
      console.log('🤖 ThreadCub: Using Chrome storage for Grok...');
      window.StorageService.storeWithChrome(continuationData)
        .then(() => {
          console.log('🐻 ThreadCub: Grok data stored successfully');
          const grokUrl = this.getGrokNewChatUrl();
          window.open(grokUrl, '_blank');
          this.showSuccessToast('Opening Grok with conversation context...');
        })
        .catch(error => {
          console.log('🤖 ThreadCub: Chrome storage failed, using fallback:', error);
          this.handleGrokFlowFallback(continuationData);
        });
    } else {
      console.log('🤖 ThreadCub: Using Grok fallback method directly');
      this.handleGrokFlowFallback(continuationData);
    }
  }

  autoDownloadGrokFile(conversationData, shareUrl) {
    try {
      console.log('🤖 ThreadCub: Auto-downloading conversation file for Grok...');

      const conversationJSON = {
        title: conversationData.title || 'ThreadCub Conversation Continuation',
        url: conversationData.url || window.location.href,
        platform: conversationData.platform,
        exportDate: new Date().toISOString(),
        totalMessages: conversationData.messages.length,
        shareUrl: shareUrl,
        messages: conversationData.messages,
        summary: window.ConversationExtractor.generateQuickSummary(conversationData.messages)
      };

      const filename = `threadcub-grok-continuation-${new Date().toISOString().split('T')[0]}.json`;

      const blob = new Blob([JSON.stringify(conversationJSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('🤖 ThreadCub: ✅ Grok file auto-downloaded:', filename);

    } catch (error) {
      console.error('🤖 ThreadCub: Error auto-downloading Grok file:', error);
    }
  }

  generateGrokContinuationPrompt() {
    return `I'd like to continue our previous conversation. I have our complete conversation history as a file that I'll share now.

Please read through the attached conversation file and provide your assessment of:
- What we were working on
- The current status/progress
- Any next steps or tasks mentioned

Once you've reviewed it, let me know you're ready to continue from where we left off.`;
  }

  handleGrokFlowFallback(continuationData) {
    console.log('🤖 ThreadCub: Using localStorage fallback for Grok...');

    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      const grokUrl = this.getGrokNewChatUrl();
      window.open(grokUrl, '_blank');
      this.showSuccessToast('Opening Grok with conversation context...');
    } catch (error) {
      console.error('🤖 ThreadCub: localStorage fallback failed:', error);
      this.showErrorToast('Failed to prepare continuation data');
    }
  }

  /**
   * Returns the correct Grok new-chat URL based on which domain the user is on.
   * grok.com → https://grok.com/  |  x.com → https://x.com/i/grok
   */
  getGrokNewChatUrl() {
    const hostname = window.location.hostname;
    if (hostname.includes('grok.com')) {
      return 'https://grok.com/';
    }
    if (hostname.includes('grok.x.ai')) {
      return 'https://grok.x.ai/';
    }
    // Default: x.com/i/grok (for x.com users)
    return 'https://x.com/i/grok';
  }

  // =============================================================================
  // DEEPSEEK FLOW (similar to ChatGPT - with file download)
  // =============================================================================

  handleDeepSeekFlow(continuationPrompt, shareUrl, conversationData) {
    console.log('🔵 ThreadCub: Starting DeepSeek flow with auto-download...');
    
    // STEP 1: Auto-download the conversation file (same as ChatGPT/Gemini)
    this.autoDownloadDeepSeekFile(conversationData, shareUrl);
    
    // STEP 2: Create continuation data for cross-tab modal
    const continuationData = {
      prompt: continuationPrompt,  // File-based prompt from conversation-extractor
      shareUrl: shareUrl,
      platform: 'DeepSeek',
      timestamp: Date.now(),
      messages: conversationData.messages || [],
      totalMessages: conversationData.total_messages || conversationData.messages?.length || 0,
      title: conversationData.title || 'Previous Conversation',
      conversationData: conversationData,
      deepseekFlow: true,
      downloadCompleted: true  // File was downloaded!
    };
    
    console.log('🔵 ThreadCub: DeepSeek continuation data prepared');
    
    // STEP 3: Use storage for modal
    const canUseChrome = window.StorageService.canUseChromStorage();

    if (canUseChrome) {
      console.log('🔵 ThreadCub: Using Chrome storage for DeepSeek modal...');
      window.StorageService.storeWithChrome(continuationData)
        .then(() => {
          console.log('🐻 ThreadCub: DeepSeek data stored successfully');
          const deepseekUrl = 'https://chat.deepseek.com/';
          window.open(deepseekUrl, '_blank');
          this.showSuccessToast('File downloaded! Upload it in your new DeepSeek tab.');
        })
        .catch(error => {
          console.log('🔵 ThreadCub: Chrome storage failed, using fallback:', error);
          this.handleDeepSeekFlowFallback(continuationData);
        });
    } else {
      console.log('🔵 ThreadCub: Using DeepSeek fallback method directly');
      this.handleDeepSeekFlowFallback(continuationData);
    }
  }

  autoDownloadDeepSeekFile(conversationData, shareUrl) {
    try {
      console.log('🔵 ThreadCub: Auto-downloading conversation file for DeepSeek...');

      const conversationJSON = {
        title: conversationData.title || 'ThreadCub Conversation Continuation',
        url: conversationData.url || window.location.href,
        platform: conversationData.platform,
        exportDate: new Date().toISOString(),
        totalMessages: conversationData.messages.length,
        shareUrl: shareUrl,
        messages: conversationData.messages,
        summary: window.ConversationExtractor.generateQuickSummary(conversationData.messages)
      };

      const filename = `threadcub-deepseek-continuation-${new Date().toISOString().split('T')[0]}.json`;

      const blob = new Blob([JSON.stringify(conversationJSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('🔵 ThreadCub: ✅ DeepSeek file auto-downloaded:', filename);

    } catch (error) {
      console.error('🔵 ThreadCub: Error auto-downloading DeepSeek file:', error);
    }
  }

  generateDeepSeekContinuationPrompt() {
    return `I'd like to continue our previous conversation. I have our complete conversation history as a file that I'll share now.

Please read through the attached conversation file and provide your assessment of:
- What we were working on
- The current status/progress
- Any next steps or tasks mentioned

Once you've reviewed it, let me know you're ready to continue from where we left off.`;
  }

  handleDeepSeekFlowFallback(continuationData) {
    console.log('🔵 ThreadCub: Using localStorage fallback for DeepSeek...');

    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      const deepseekUrl = 'https://chat.deepseek.com/';
      window.open(deepseekUrl, '_blank');
      this.showSuccessToast('File downloaded! Check your new DeepSeek tab.');
    } catch (error) {
      console.error('🔵 ThreadCub: localStorage fallback failed:', error);
      this.showErrorToast('Failed to prepare continuation data');
    }
  }

  // =============================================================================
  // PERPLEXITY FLOW (File upload - same pattern as ChatGPT/Gemini/DeepSeek)
  // =============================================================================

  handlePerplexityFlow(continuationPrompt, shareUrl, conversationData) {
    console.log('🔮 ThreadCub: Starting Perplexity flow with file upload...');

    // STEP 1: Auto-download the conversation file
    this.autoDownloadPerplexityFile(conversationData, shareUrl);

    // STEP 2: Create continuation data for cross-tab modal
    const continuationData = {
      prompt: this.generatePerplexityContinuationPrompt(),
      shareUrl: shareUrl,
      platform: 'Perplexity',
      timestamp: Date.now(),
      messages: conversationData.messages || [],
      totalMessages: conversationData.total_messages || conversationData.messages?.length || 0,
      title: conversationData.title || 'Previous Conversation',
      conversationData: conversationData,
      perplexityFlow: true,
      downloadCompleted: true
    };

    console.log('🔮 ThreadCub: Perplexity continuation data prepared');

    // STEP 3: Use storage for modal
   // PERPLEXITY SPECIAL CASE: Chrome APIs (chrome.runtime, chrome.storage) are completely 
    // undefined on www.perplexity.ai domain, so we must use localStorage instead.
    // This works fine since localStorage syncs instantly between tabs of the same domain.
    console.log('🔮 ThreadCub: Perplexity - using localStorage (Chrome APIs unavailable on this domain)');
    this.handlePerplexityFlowFallback(continuationData);
  }

  autoDownloadPerplexityFile(conversationData, shareUrl) {
    try {
      console.log('🔮 ThreadCub: Auto-downloading conversation file for Perplexity...');

      const conversationJSON = {
        title: conversationData.title || 'ThreadCub Conversation Continuation',
        url: conversationData.url || window.location.href,
        platform: conversationData.platform,
        exportDate: new Date().toISOString(),
        totalMessages: conversationData.messages.length,
        source: 'ThreadCub Browser Extension - Perplexity Continuation',
        shareUrl: shareUrl,
        instructions: 'This file contains our previous conversation. Please review it and continue from where we left off.',
        messages: conversationData.messages,
        summary: window.ConversationExtractor.generateQuickSummary(conversationData.messages)
      };

      const filename = `threadcub-perplexity-continuation-${new Date().toISOString().split('T')[0]}.json`;

      const blob = new Blob([JSON.stringify(conversationJSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('🔮 ThreadCub: ✅ Perplexity file auto-downloaded:', filename);

    } catch (error) {
      console.error('🔮 ThreadCub: Error auto-downloading Perplexity file:', error);
    }
  }

  generatePerplexityContinuationPrompt() {
    return `I'd like to continue our previous conversation. I have our complete conversation history as a file that I'll upload now.

Please read through the attached conversation file and provide your assessment of:
- What we were working on
- The current status/progress
- Any next steps or tasks mentioned

Once you've reviewed it, let me know you're ready to continue from where we left off.`;
  }

  handlePerplexityFlowFallback(continuationData) {
    console.log('🔮 ThreadCub: Using localStorage fallback for Perplexity...');

    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      const perplexityUrl = 'https://www.perplexity.ai/';
      window.open(perplexityUrl, '_blank');
      this.showSuccessToast('File downloaded! Upload it in your new Perplexity tab.');
    } catch (error) {
      console.error('🔮 ThreadCub: localStorage fallback failed:', error);
      this.showErrorToast('Failed to prepare continuation data');
    }
  }

  handleDirectContinuation(conversationData) {
    console.log('🐻 ThreadCub: Handling direct continuation without API save...');

    // Create a fallback share URL
    const fallbackShareUrl = `https://threadcub.com/fallback/${Date.now()}`;

    // Generate a simple continuation prompt
    const summary = window.ConversationExtractor.generateQuickSummary(conversationData.messages);
    const minimalPrompt = window.ConversationExtractor.generateContinuationPrompt(summary, fallbackShareUrl, conversationData.platform, conversationData);

    // Route to appropriate platform flow
    const targetPlatform = window.ConversationExtractor.getTargetPlatformFromCurrentUrl();

    // ADD DEBUG LINES HERE
    console.log('🔍 DEBUG LOCATION 1: Current hostname:', window.location.hostname);
    console.log('🔍 DEBUG LOCATION 1: targetPlatform detected as:', targetPlatform);
    console.log('🔍 DEBUG LOCATION 1: About to route to platform...');

    if (targetPlatform === 'chatgpt') {
      console.log('🤖 ThreadCub: Routing to ChatGPT flow (with file download)');
      this.handleChatGPTFlow(minimalPrompt, fallbackShareUrl, conversationData);
    } else if (targetPlatform === 'claude') {
      console.log('🤖 ThreadCub: Routing to Claude flow (no file download)');
      this.handleClaudeFlow(minimalPrompt, fallbackShareUrl, conversationData);
    } else if (targetPlatform === 'gemini') {
      console.log('🤖 ThreadCub: Routing to Gemini flow (with file download)');
      this.handleGeminiFlow(minimalPrompt, fallbackShareUrl, conversationData);
    } else if (targetPlatform === 'grok') {
      console.log('🤖 ThreadCub: Routing to Grok flow (with file download)');
      this.handleGrokFlow(minimalPrompt, fallbackShareUrl, conversationData);
    } else if (targetPlatform === 'deepseek') {
      console.log('🔵 ThreadCub: Routing to DeepSeek flow (with file download)');
      this.handleDeepSeekFlow(minimalPrompt, fallbackShareUrl, conversationData);
    } else if (targetPlatform === 'perplexity') {
      console.log('🔮 ThreadCub: Routing to Perplexity flow (file-based)');
      this.handlePerplexityFlow(minimalPrompt, fallbackShareUrl, conversationData);
    } else {
      console.log('🤖 ThreadCub: Unknown platform, defaulting to ChatGPT flow');
      this.handleChatGPTFlow(minimalPrompt, fallbackShareUrl, conversationData);
    }

    this.showSuccessToast('Continuing conversation (offline mode)');
  }

  // ===== STORAGE & FALLBACK METHODS =====
  // canUseChromStorage() removed - now using window.StorageService.canUseChromStorage()
  // storeWithChrome() removed - now using window.StorageService.storeWithChrome()
  // handleClaudeFlowFallback() removed - now using window.StorageService.handleClaudeFlowFallback()

  // Platform-specific fallback methods (kept - not in StorageService)
  handleChatGPTFlowFallback(continuationData) {
    console.log('🤖 ThreadCub: Using localStorage fallback for ChatGPT...');

    try {
      localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
      console.log('🔧 ChatGPT Fallback: Data stored in localStorage');

      const chatGPTUrl = 'https://chatgpt.com/';
      window.open(chatGPTUrl, '_blank');
      this.showSuccessToast('File downloaded! Check your new ChatGPT tab.');

    } catch (error) {
      console.error('🔧 ChatGPT Fallback: localStorage failed:', error);
    }
  }

  handleGeminiFlowFallback(continuationData) {
  console.log('🟣 ThreadCub: Using localStorage fallback for Gemini...');
  
  try {
    localStorage.setItem('threadcubContinuationData', JSON.stringify(continuationData));
    console.log('🔧 Gemini Fallback: Data stored in localStorage');
    
    const geminiUrl = 'https://gemini.google.com/app';
    window.open(geminiUrl, '_blank');
    this.showSuccessToast('File downloaded! Upload it in your new Gemini tab.');
    
  } catch (error) {
    console.error('🔧 Gemini Fallback: localStorage failed:', error);
  }
}

  // ===== DOWNLOAD METHODS =====
  createDownloadFromData(conversationData) {
    try {
      const tagsData = {
        title: conversationData.title || 'ThreadCub Conversation',
        url: conversationData.url || window.location.href,
        platform: conversationData.platform || 'Unknown',
        exportDate: new Date().toISOString(),
        totalMessages: conversationData.messages ? conversationData.messages.length : 0,
        messages: conversationData.messages || []
      };

      const filename = window.Utilities.generateSmartFilename(tagsData); // Use tagsData for filename
      const blob = new Blob([JSON.stringify(tagsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('🐻 ThreadCub: JSON download completed with filename:', filename);

      // Download Markdown after a brief delay for browser compatibility
      setTimeout(() => this.downloadMarkdown(tagsData), 200);

    } catch (error) {
      console.error('🐻 ThreadCub: Error in createDownloadFromData:', error);
      throw error;
    }
  }

}

// Make the class globally available
window.ThreadCubFloatingButton = ThreadCubFloatingButton;

console.log('✅ ThreadCubFloatingButton defined:', typeof window.ThreadCubFloatingButton);

// Add message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🐻 ThreadCub: Received message:', request);

    try {
        if (request.action === 'checkButtonStatus') {
            sendResponse({ success: true, exists: !!window.threadcubButton });
            return;
        }

        if (request.action === 'hideFloatingButton') {
            if (window.threadcubButton && window.threadcubButton.button) {
                window.threadcubButton.button.style.display = 'none';
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Button not found' });
            }
            return;
        }

        if (request.action === 'showFloatingButton') {
            if (window.threadcubButton && window.threadcubButton.button) {
                window.threadcubButton.button.style.display = 'flex';
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Button not found' });
            }
            return;
        }

        sendResponse({ success: false, error: 'Unknown action' });

    } catch (error) {
        console.error('🐻 ThreadCub: Message handler error:', error);
        sendResponse({ success: false, error: error.message });
    }
});