// =============================================================================
// ThreadCub Onboarding — 4-step tour
// Flags:
//   threadcub_welcome_seen     — set by welcome.js when welcome tab closes
//   threadcub_onboarding_done  — set here when tour is completed or dismissed
// Steps:
//   0 — Coda intro (centred)
//   1 — Floating bear button (anchored to bear)
//   2 — Pin extension to toolbar (top right)
//   3 — Side panel / Pawmarks (left of panel)
// =============================================================================

(function () {
  'use strict';

  const STORAGE_WELCOME_KEY = 'threadcub_welcome_seen';
  const STORAGE_DONE_KEY    = 'threadcub_onboarding_done';

  // ---------------------------------------------------------------------------
  // 📊 GA: Analytics helper — routes events through background.js
  // Search '📊 GA:' in this file to find all tracked interactions
  // ---------------------------------------------------------------------------
  function sendTrackEvent(eventType, data) {
    try {
      chrome.runtime.sendMessage({ action: 'trackEvent', eventType, data });
    } catch (e) {
      console.warn('🐻 Onboarding: could not send analytics event:', e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Design tokens — mirrors tokens.css for use in content script context
  // Update values here when your design system changes
  // ---------------------------------------------------------------------------
  const TOKENS = {
    // Colours
    colorBrand:         '#925FE2',
    colorBrandHover:    '#7a4ec8',
    colorSurface:       '#1e1e2e',
    colorTextPrimary:   '#ffffff',
    colorTextSecondary: 'rgba(255,255,255,0.72)',
    colorTextMuted:     'rgba(255,255,255,0.35)',
    colorBorder:        'rgba(255,255,255,0.18)',
    // Typography
    fontFamily:         `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    fontSizeLabel:      '11px',
    fontSizeTitle:      '20px',
    fontSizeBody:       '14px',
    fontSizeBtn:        '13px',
    // Radii
    radiusModal:        '16px',
    radiusBtn:          '20px',
    radiusImage:        '10px',
    // Spacing
    spacingModalPad:    '24px',
    // Peak (tooltip arrow) — change peakSize to resize, peakTopRightPos to realign step 2
    peakSize:           '16px',
    peakOffset:         '-10px',
    peakTopRightPos:    '80px',
  };

  // ---------------------------------------------------------------------------
  // GIF config — update filenames here if you rename any files
  // ---------------------------------------------------------------------------

  function getGifUrl(filename) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(`assets/images/${filename}`);
      }
    } catch {}
    return '';
  }

  const GIFS = {
    step0: () => getGifUrl('welcome-coda.png'),    // Coda intro
    step1: () => getGifUrl('floating-button.gif'), // Bear menu
    step2: () => getGifUrl('install.gif'),         // Pin toolbar
    step3: () => getGifUrl('highlight.gif'),       // Pawmarks / side panel
  };

  function gifBlock(gifUrl) {
    if (!gifUrl) return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(255,255,255,0.15);margin-bottom:14px;"><span style="color:rgba(255,255,255,0.3);font-size:12px;">Loading...</span></div>`;
    return `<div style="border-radius:10px;overflow:hidden;margin-bottom:14px;"><img src="${gifUrl}" style="width:100%;display:block;border-radius:10px;" alt="" /></div>`;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let currentStep      = 0;
  let popoverEl        = null;
  let overlayEl        = null;
  let pulseEl          = null;
  let panelObserver    = null;
  let isRunning        = false;

  const STEPS = [
    { id: 'coda',      render: renderStep0 },
    { id: 'bear',      render: renderStep1 },
    { id: 'pin',       render: renderStep2 },
    { id: 'sidepanel', render: renderStep3 },
  ];

  // ---------------------------------------------------------------------------
  // Entry
  // ---------------------------------------------------------------------------

  async function maybeStart() {
    const result = await chromeGet([STORAGE_DONE_KEY, STORAGE_WELCOME_KEY]);
    if (result[STORAGE_DONE_KEY]) return;
    if (!result[STORAGE_WELCOME_KEY]) return;
    await waitForElement('#threadcub-edge-btn', 8000);
    setTimeout(startTour, 800);
  }

  function startTour() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    // 📊 GA: onboarding tour started
    sendTrackEvent('onboarding_started', {});
    createOverlay();
    STEPS[0].render();
  }

  function goToStep(index) {
    removePopover();
    removePulse();
    disconnectPanelObserver();
    if (index >= STEPS.length) { endTour(); return; }
    currentStep = index;
    // 📊 GA: onboarding step viewed — step is 0-indexed (0=intro, 1=bear menu, 2=pin toolbar, 3=pawmarks)
    sendTrackEvent('onboarding_step_viewed', { step: index, step_name: ['intro', 'bear_menu', 'pin_toolbar', 'pawmarks'][index] || 'unknown' });
    STEPS[index].render();
  }

  function endTour(dismissed = false) {
    removePopover();
    removeOverlay();
    removePulse();
    disconnectPanelObserver();
    isRunning = false;
    chrome.storage.local.set({ [STORAGE_DONE_KEY]: true });
    if (dismissed) {
      // 📊 GA: onboarding dismissed — user clicked X or dismiss before completing
      sendTrackEvent('onboarding_dismissed', { dismissed_at_step: currentStep });
    } else {
      // 📊 GA: onboarding completed — user reached the end of all 4 steps
      sendTrackEvent('onboarding_completed', { steps_total: STEPS.length });
    }
    console.log('🐻 ThreadCub Onboarding: complete');
  }

  // ---------------------------------------------------------------------------
  // Step 0 — Coda intro, centred on screen
  // ---------------------------------------------------------------------------

  function renderStep0() {
    popoverEl = buildPopover({
      step:    '1 of 4',
      title:   "Hey! I'm Coda",
      body:    gifBlock(GIFS.step0()) + "I live on the edge of your screen and I'm here to help you keep on top of all your AI chats.",
      primary: { label: 'Show me around', action: () => goToStep(1) },
      dismiss: { label: 'Dismiss', action: endTour },
      wide: true
    });

    positionCentred(popoverEl);
    animateIn(popoverEl);
  }

  // ---------------------------------------------------------------------------
  // Step 1 — Floating bear button
  // ---------------------------------------------------------------------------

  function renderStep1() {
    const bear = document.querySelector('#threadcub-edge-btn');
    if (!bear) { endTour(); return; }

    popoverEl = buildPopover({
      step:    '2 of 4',
      title:   'Your floating menu',
      body:    gifBlock(GIFS.step1()),
      primary: { label: 'Next', action: () => goToStep(2) },
      dismiss: { label: 'Back', action: () => goToStep(0) }
    });

    positionNextToElement(popoverEl, bear.getBoundingClientRect());
    animateIn(popoverEl);
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Pin extension, positioned top right
  // ---------------------------------------------------------------------------

  function renderStep2() {
    popoverEl = buildPopover({
      step:    '3 of 4',
      title:   'Pin me to your toolbar',
      body:    gifBlock(GIFS.step2()),
      primary: { label: 'Next', action: () => goToStep(3) },
      dismiss: { label: 'Back', action: () => goToStep(1) },
      wide: true
    });

    positionTopRight(popoverEl);
    animateIn(popoverEl);
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Side panel, modal to its left, watch for panel close
  // ---------------------------------------------------------------------------

  function renderStep3() {
    // Open the side panel
    try {
      if (window.threadcubTagging?.toggleSidePanel) {
        window.threadcubTagging.toggleSidePanel();
      } else if (window.ThreadCubTagging) {
        window.threadcubTagging = new window.ThreadCubTagging(window.threadcubButton);
        window.threadcubTagging.toggleSidePanel();
      }
    } catch (e) {
      console.warn('🐻 Onboarding: could not open side panel', e);
    }

    setTimeout(() => {
      const panel = findPanel();

      popoverEl = buildPopover({
        step:    '4 of 4',
        title:   'Pawmarks panel',
        body:    gifBlock(GIFS.step3()),
        primary: { label: 'Got it!', action: endTour },
        dismiss: { label: 'Back', action: () => {
          try { window.threadcubTagging?.toggleSidePanel(); } catch {}
          goToStep(2);
        }}
      });

      if (panel) {
        positionLeftOfPanel(popoverEl, panel.getBoundingClientRect());
        watchForPanelClose(panel);
      } else {
        const bear = document.querySelector('#threadcub-edge-btn');
        if (bear) positionNextToElement(popoverEl, bear.getBoundingClientRect());
        else positionCentred(popoverEl);
      }

      animateIn(popoverEl);
      setTimeout(addChatPulse, 400);
    }, 500);
  }

  function findPanel() {
    return (
      document.querySelector('#threadcub-side-panel') ||
      document.querySelector('.threadcub-side-panel') ||
      document.querySelector('[id*="threadcub"][id*="panel"]') ||
      document.querySelector('[class*="threadcub"][class*="panel"]')
    );
  }

  // Watch for the side panel being removed from the DOM — if the user
  // closes it themselves, close the onboarding modal too
  function watchForPanelClose(panel) {
    disconnectPanelObserver();

    function isPanelHidden() {
      if (!document.body.contains(panel)) return true;
      if (panel.hidden) return true;
      const s = panel.style;
      if (s.display === 'none' || s.visibility === 'hidden') return true;
      // Check computed style in case a class is toggling visibility
      const computed = window.getComputedStyle(panel);
      if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') return true;
      // Check if a parent has been hidden
      let el = panel.parentElement;
      while (el && el !== document.body) {
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return true;
        el = el.parentElement;
      }
      return false;
    }

    panelObserver = new MutationObserver(() => {
      if (isPanelHidden()) {
        disconnectPanelObserver();
        removePopover();
        removePulse();
      }
    });

    panelObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'hidden', 'class']
    });
  }

  function disconnectPanelObserver() {
    if (panelObserver) { panelObserver.disconnect(); panelObserver = null; }
  }

  // ---------------------------------------------------------------------------
  // Chat area pulse
  // ---------------------------------------------------------------------------

  function addChatPulse() {
    const chatArea = (
      document.querySelector('[class*="conversation"]') ||
      document.querySelector('[class*="messages"]') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]')
    );
    if (!chatArea) return;

    if (!document.getElementById('tc-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'tc-pulse-style';
      style.textContent = `
        @keyframes tc-chat-pulse {
          0%   { box-shadow: inset 0 0 0 3px rgba(146,95,226,0); }
          40%  { box-shadow: inset 0 0 0 3px rgba(146,95,226,0.55); }
          100% { box-shadow: inset 0 0 0 3px rgba(146,95,226,0); }
        }
        .tc-pulse-active { animation: tc-chat-pulse 2s ease-in-out 3; border-radius: 8px; }
      `;
      document.head.appendChild(style);
    }

    chatArea.classList.add('tc-pulse-active');
    pulseEl = chatArea;
    setTimeout(() => chatArea.classList.remove('tc-pulse-active'), 6500);
  }

  function removePulse() {
    if (pulseEl) { pulseEl.classList.remove('tc-pulse-active'); pulseEl = null; }
  }

  // ---------------------------------------------------------------------------
  // Popover builder
  // ---------------------------------------------------------------------------

  function buildPopover({ step, title, body, primary, dismiss, wide = false }) {
    const el = document.createElement('div');
    el.id = 'threadcub-onboarding-popover';
    el.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: ${TOKENS.colorSurface};
      color: ${TOKENS.colorTextPrimary};
      border-radius: ${TOKENS.radiusModal};
      padding: ${TOKENS.spacingModalPad};
      width: ${wide ? '440px' : '400px'};
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
      font-family: ${TOKENS.fontFamily};
      font-size: ${TOKENS.fontSizeBody};
      line-height: 1.55;
      pointer-events: auto;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.22s ease, transform 0.22s ease;
    `;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:${TOKENS.fontSizeLabel};color:${TOKENS.colorBrand};font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">${step}</span>
        <button id="tc-ob-x" style="background:none;border:none;cursor:pointer;color:${TOKENS.colorTextMuted};font-size:20px;line-height:1;padding:0;">×</button>
      </div>
      <strong style="font-size:${TOKENS.fontSizeTitle};color:${TOKENS.colorTextPrimary};display:block;margin-bottom:10px;line-height:1.3;">${title}</strong>
      <div style="color:${TOKENS.colorTextSecondary};margin-bottom:20px;">${body}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        ${dismiss ? `<button id="tc-ob-dismiss" style="background:none;border:1px solid ${TOKENS.colorBorder};color:${TOKENS.colorTextSecondary};border-radius:${TOKENS.radiusBtn};padding:10px 20px;font-size:${TOKENS.fontSizeBtn};cursor:pointer;font-family:${TOKENS.fontFamily};">${dismiss.label}</button>` : ''}
        <button id="tc-ob-primary" style="background:${TOKENS.colorBrand};border:none;color:${TOKENS.colorTextPrimary};border-radius:${TOKENS.radiusBtn};padding:10px 24px;font-size:${TOKENS.fontSizeBtn};cursor:pointer;font-weight:600;font-family:${TOKENS.fontFamily};">${primary.label}</button>
      </div>
      <div id="tc-ob-peak" style="position:absolute;width:${TOKENS.peakSize};height:${TOKENS.peakSize};background:${TOKENS.colorSurface};transform:rotate(45deg);display:none;border-radius:3px;"></div>
    `;

    document.body.appendChild(el);

    el.querySelector('#tc-ob-primary').addEventListener('mousedown', (e) => { e.stopPropagation(); primary.action(); });
    el.querySelector('#tc-ob-x').addEventListener('mousedown', (e) => { e.stopPropagation(); endTour(true); });
    if (dismiss) {
      el.querySelector('#tc-ob-dismiss').addEventListener('mousedown', (e) => { e.stopPropagation(); dismiss.action(); });
    }

    return el;
  }

  // ---------------------------------------------------------------------------
  // Positioning
  // ---------------------------------------------------------------------------

  function positionCentred(el) {
    el.querySelector('#tc-ob-peak').style.display = 'none';
    el.style.left = '50%';
    el.style.top  = '50%';
    el.style.transform = 'translate(-50%, -50%) translateY(6px)';
    el._isCentred = true;
  }

  function positionTopRight(el) {
    const peak = el.querySelector('#tc-ob-peak');

    el.style.right = '16px';
    el.style.left  = 'auto';
    el.style.top   = `calc(28px - ${TOKENS.peakOffset})`;
    el._isTopRight = true;

    if (peak) {
      peak.style.display   = 'block';
      peak.style.top       = TOKENS.peakOffset;
      peak.style.bottom    = 'auto';
      peak.style.right     = TOKENS.peakTopRightPos;
      peak.style.left      = 'auto';
      peak.style.boxShadow = '-2px -2px 6px rgba(0,0,0,0.15)';
    }
  }

  function positionNextToElement(el, anchorRect) {
    const popW   = parseInt(el.style.width) || 300;
    const margin = 14;
    const peak   = el.querySelector('#tc-ob-peak');
    const peakSizePx = parseInt(TOKENS.peakSize) || 20;

    let left = anchorRect.left - popW - margin;
    const flipRight = left < 8;
    if (flipRight) left = anchorRect.right + margin;

    let top = anchorRect.top + (anchorRect.height / 2) - 80;
    top = Math.max(8, Math.min(top, window.innerHeight - 260));

    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;

    if (peak) {
      peak.style.display = 'block';
      const halfPeak = peakSizePx / 2;
      if (flipRight) {
        peak.style.left      = `${-halfPeak}px`;
        peak.style.right     = 'auto';
        peak.style.boxShadow = '-2px 2px 6px rgba(0,0,0,0.15)';
      } else {
        peak.style.right     = `${-halfPeak}px`;
        peak.style.left      = 'auto';
        peak.style.boxShadow = '2px -2px 6px rgba(0,0,0,0.15)';
      }
      const peakTop = anchorRect.top + anchorRect.height / 2 - top - halfPeak;
      peak.style.top = `${Math.max(16, Math.min(peakTop, 120))}px`;
    }
  }

  function positionLeftOfPanel(el, panelRect) {
    const popW      = parseInt(el.style.width) || 300;
    const peak      = el.querySelector('#tc-ob-peak');
    const peakSizePx = parseInt(TOKENS.peakSize) || 20;

    const left = Math.max(8, panelRect.left - popW - 16);
    const top  = Math.max(20, panelRect.top + 40);

    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;

    if (peak) {
      peak.style.display   = 'block';
      peak.style.right     = `${-(peakSizePx / 2)}px`;
      peak.style.left      = 'auto';
      peak.style.top       = '28px';
      peak.style.boxShadow = '2px -2px 6px rgba(0,0,0,0.15)';
    }
  }

  function animateIn(el) {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      if (el._isCentred) {
        el.style.transform = 'translate(-50%, -50%) translateY(0)';
      } else if (el._isTopRight) {
        el.style.transform = 'translateY(0)';
      } else {
        el.style.transform = 'translateY(0)';
      }
    });
  }

  function removePopover() {
    if (popoverEl) { popoverEl.remove(); popoverEl = null; }
  }

  // ---------------------------------------------------------------------------
  // Overlay
  // ---------------------------------------------------------------------------

  function createOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.style.cssText = `
      position:fixed;inset:0;z-index:2147483640;
      background:rgba(0,0,0,0.3);pointer-events:none;
      opacity:0;transition:opacity 0.3s ease;
    `;
    document.body.appendChild(overlayEl);
    requestAnimationFrame(() => { overlayEl.style.opacity = '1'; });
  }

  function removeOverlay() {
    if (overlayEl) {
      overlayEl.style.opacity = '0';
      setTimeout(() => { overlayEl?.remove(); overlayEl = null; }, 300);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function chromeGet(keys) {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(keys, resolve); }
      catch { resolve({}); }
    });
  }

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) { resolve(); return; }
      const obs = new MutationObserver(() => {
        if (document.querySelector(selector)) { obs.disconnect(); resolve(); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(); }, timeout);
    });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeStart);
  } else {
    maybeStart();
  }

  window.threadcubOnboarding = {
    start: startTour,
    reset: () => chrome.storage.local.remove([STORAGE_DONE_KEY, STORAGE_WELCOME_KEY])
  };

})();