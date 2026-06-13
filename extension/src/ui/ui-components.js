// =============================================================================
// ThreadCub UI Components
// Reusable UI elements and utilities
// =============================================================================

const UIComponents = {

  // =============================================================================
  // TOAST/NOTIFICATION SYSTEM
  // Consolidated from floating-button.js, tagging.js
  // =============================================================================

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `threadcub-toast threadcub-toast-${type}`; // Use classes for styling

    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${type === 'success'
          ? '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>'
          : '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="m9 9 6 6"/>'
        }
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in using class
    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    // Animate out and remove using class
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300); // Match transition duration
    }, 3000);
  },

  showSuccessToast(message = '✅ Success!') {
    this.showToast(message, 'success');
  },

  showUndoToast(message, onUndo) {
  // Remove any existing undo toast first
  const existing = document.querySelector('.threadcub-toast-undo');
  if (existing) existing.parentNode.removeChild(existing);

  // Use rebrand tokens if available, fall back to hardcoded values
  const rb = window.ThreadCubRebrand || {};
  const bgColor  = rb.colors?.green100 || '#E8F5EE';
  const txtColor = rb.colors?.warm900  || '#231F1A';

  const toast = document.createElement('div');
  toast.className = 'threadcub-toast-undo';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(16px);
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    background: ${bgColor};
    color: ${txtColor};
    padding: 0 32px 0 24px;
    height: 56px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    pointer-events: auto;
    white-space: nowrap;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.10);
  `;

  const icon = document.createElement('span');
  icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  icon.style.cssText = 'display:flex;align-items:center;flex-shrink:0;margin-right:10px;';

  const textNode = document.createElement('span');
  textNode.textContent = message;
  textNode.style.flex = '1';

  const btn = document.createElement('button');
  btn.textContent = 'Undo';
  btn.style.cssText = `
    margin-left: 16px;
    background: none;
    border: 1px solid ${txtColor};
    color: ${txtColor};
    font-size: 13px;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.15s ease;
  `;
  btn.onmouseover = () => btn.style.opacity = '1';
  btn.onmouseout  = () => btn.style.opacity = '0.7';

  toast.appendChild(icon);
  toast.appendChild(textNode);
  toast.appendChild(btn);
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(8px)';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
  };

  btn.addEventListener('click', () => {
    dismiss();
    if (typeof onUndo === 'function') onUndo();
  });

  setTimeout(dismiss, 4000);
},
  showErrorToast(message = '❌ Error occurred') {
    this.showToast(message, 'error');
  },

  // Alternative notification style (from tagging.js)
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000001;
      opacity: 0;
      transition: opacity 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 100);

    // Animate out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },

  // Static method for global access (from floating-button.js)
  showGlobalSuccessToast(message = 'Operation completed successfully!') {
    if (window.threadcubButton && typeof window.threadcubButton.showSuccessToast === 'function') {
      window.threadcubButton.showSuccessToast(message);
    } else {
      // Fallback to UIComponents method
      this.showSuccessToast(message);
    }
  }

};

// Export to global window object
window.UIComponents = UIComponents;
console.log('🔌 ThreadCub: UIComponents module loaded');