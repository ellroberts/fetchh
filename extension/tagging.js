window.TAGGING_TEST = "loaded";
console.log('🏷️ SIMPLE TEST: tagging.js is running');

console.log('🏷️ ThreadCub: tagging.js file is executing...');

// ThreadCub Tagging Module
// Handles text selection, tagging, and side panel management

console.log('🏷️ ThreadCub: Loading tagging module...');

class ThreadCubTagging {
  constructor(floatingButton) {
    this.floatingButton = floatingButton;
    this.currentConversationId = null;
    this.tags = [];
    this.isTaggingEnabled = true;
    this.sidePanel = null;
    this.contextMenu = null;
    this.selectedText = '';
    this.selectedRange = null;

    // Make this instance globally accessible for removeTag functionality
  window.threadcubTagging = this;
    
    // Tag categories
    this.tagCategories = [
      { id: 'dont-forget', label: "Don't Forget", color: '#ff6b6b' },
      { id: 'backlog', label: 'Backlog Item', color: '#4ecdc4' },
      { id: 'priority', label: 'Top Priority', color: '#45b7d1' }
    ];
    
    console.log('🏷️ ThreadCub: Tagging module initialized');
    this.init();
  }

  init() {
    this.addTaggingStyles();
    this.createContextMenu();
    this.createSidePanel();
    this.setupEventListeners();
    this.loadSessionTags();
    
    console.log('🏷️ ThreadCub: Tagging system ready');
  }

  addTaggingStyles() {
    if (document.getElementById('threadcub-tagging-styles')) return;

    const style = document.createElement('style');
    style.id = 'threadcub-tagging-styles';
    style.textContent = `
      /* Context Menu Styles */
      .threadcub-context-menu {
        position: fixed;
        background: white;
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 8px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        padding: 12px;
        z-index: 10000000;
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 200px;
      }
      
      .threadcub-context-menu.show {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: auto;
      }
      
      .threadcub-context-label {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .threadcub-tag-dropdown {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: white;
        font-size: 14px;
        color: #333;
        cursor: pointer;
        margin-bottom: 8px;
      }
      
      .threadcub-tag-dropdown:focus {
        outline: none;
        border-color: #4F46E5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }
      
      .threadcub-context-submit {
        width: 100%;
        background: #4F46E5;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .threadcub-context-submit:hover {
        background: #4338ca;
      }
      
      /* Side Panel Styles */
      .threadcub-side-panel {
        position: fixed;
        top: 0;
        right: -350px;
        width: 350px;
        height: 100vh;
        background: white;
        border-left: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
        z-index: 9999999;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
      }
      
      .threadcub-side-panel.open {
        right: 0;
      }
      
      .threadcub-panel-header {
        padding: 20px;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
        position: relative;
      }
      
      .threadcub-panel-title {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .threadcub-panel-subtitle {
        font-size: 14px;
        color: #64748b;
      }
      
      .threadcub-panel-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      .threadcub-panel-close:hover {
        background: rgba(226, 232, 240, 0.5);
        color: #1e293b;
      }
      
      .threadcub-panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .threadcub-tags-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .threadcub-tag-item {
        background: #f8fafc;
        border-radius: 8px;
        padding: 16px;
        border-left: 4px solid;
        position: relative;
        transition: all 0.2s ease;
      }
      
      .threadcub-tag-item:hover {
        background: #f1f5f9;
      }
      
      .threadcub-tag-item.dont-forget {
        border-left-color: #ff6b6b;
      }
      
      .threadcub-tag-item.backlog {
        border-left-color: #4ecdc4;
      }
      
      .threadcub-tag-item.priority {
        border-left-color: #45b7d1;
      }
      
      .threadcub-tag-category {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 6px;
        opacity: 0.7;
      }
      
      .threadcub-tag-category.dont-forget {
        color: #ff6b6b;
      }
      
      .threadcub-tag-category.backlog {
        color: #4ecdc4;
      }
      
      .threadcub-tag-category.priority {
        color: #45b7d1;
      }
      
      .threadcub-tag-text {
        font-size: 14px;
        line-height: 1.5;
        color: #1e293b;
        margin-bottom: 8px;
      }
      
      .threadcub-tag-meta {
        font-size: 12px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .threadcub-tag-remove {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      
      .threadcub-tag-remove:hover {
        background: rgba(239, 68, 68, 0.1);
      }
      
      .threadcub-panel-footer {
        padding: 20px;
        border-top: 1px solid #f1f5f9;
        background: #f8fafc;
      }
      
      .threadcub-submit-tags {
        width: 100%;
        background: #059669;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .threadcub-submit-tags:hover {
        background: #047857;
      }
      
      .threadcub-submit-tags:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }
      
      .threadcub-empty-tags {
        text-align: center;
        padding: 40px 20px;
        color: #64748b;
      }
      
      .threadcub-empty-tags-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .threadcub-empty-tags-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .threadcub-empty-tags-desc {
        font-size: 14px;
        line-height: 1.5;
      }
      
      /* Text Highlighting Styles */
      .threadcub-highlight {
        background: rgba(79, 70, 229, 0.2);
        border-radius: 3px;
        padding: 1px 3px;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .threadcub-highlight.dont-forget {
        background: rgba(255, 107, 107, 0.3);
        border-left: 3px solid #ff6b6b;
      }
      
      .threadcub-highlight.backlog {
        background: rgba(78, 205, 196, 0.3);
        border-left: 3px solid #4ecdc4;
      }
      
      .threadcub-highlight.priority {
        background: rgba(69, 183, 209, 0.3);
        border-left: 3px solid #45b7d1;
      }
      
      .threadcub-highlight:hover {
        background: rgba(79, 70, 229, 0.3);
      }
      
      /* Tag button for floating button */
      .threadcub-tag-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transform: scale(0.7);
        pointer-events: auto;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(226, 232, 240, 0.8);
        color: #64748b;
      }
      
      .threadcub-tag-btn:hover {
        background: #4F46E5 !important;
        color: white !important;
        border-color: #4F46E5 !important;
        transform: scale(1.1) !important;
      }

      .threadcub-context-view {
        width: 100%;
        background: #059669;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 4px;
      }
      
      .threadcub-context-view:hover {
        background: #047857;
      }
    `;
    
    document.head.appendChild(style);
  }

  createContextMenu() {
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'threadcub-context-menu';
    this.contextMenu.innerHTML = `
      <div class="threadcub-context-label">Tag this as:</div>
      <select class="threadcub-tag-dropdown" id="threadcub-tag-select">
        ${this.tagCategories.map(cat => 
          `<option value="${cat.id}">${cat.label}</option>`
        ).join('')}
      </select>
      <button class="threadcub-context-submit" id="threadcub-tag-submit">Add Tag</button>
      <button class="threadcub-context-view" id="threadcub-view-tags">View Tags</button>
    `;
    
    document.body.appendChild(this.contextMenu);
  }

  createSidePanel() {
    this.sidePanel = document.createElement('div');
    this.sidePanel.className = 'threadcub-side-panel';
    this.sidePanel.innerHTML = `
      <div class="threadcub-panel-header">
        <div class="threadcub-panel-title">
          <i class="fas fa-tag"></i>
          Conversation Tags
        </div>
        <div class="threadcub-panel-subtitle">Tagged items for this conversation</div>
        <button class="threadcub-panel-close" id="threadcub-panel-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="threadcub-panel-content">
        <div class="threadcub-tags-list" id="threadcub-tags-list">
          <div class="threadcub-empty-tags">
            <div class="threadcub-empty-tags-icon">🏷️</div>
            <div class="threadcub-empty-tags-title">No tags yet</div>
            <div class="threadcub-empty-tags-desc">
              Highlight text in the conversation and select a tag category to get started.
            </div>
          </div>
        </div>
      </div>
      
      <div class="threadcub-panel-footer">
        <button class="threadcub-submit-tags" id="threadcub-submit-tags" disabled>
          <i class="fas fa-cloud-upload-alt"></i>
          Submit to ThreadCub
        </button>
      </div>
    `;
    
    document.body.appendChild(this.sidePanel);
  }

setupEventListeners() {
  // ✅ Text selection events (you have this)
  document.addEventListener('mouseup', (e) => {
    if (!this.isTaggingEnabled) return;
    this.handleTextSelection(e);
  });

  document.addEventListener('mousedown', () => {
    this.hideContextMenu();
  });

  document.addEventListener('click', (e) => {
    // Add Tag button
    if (e.target && e.target.id === 'threadcub-tag-submit') {
      e.preventDefault();
      e.stopPropagation();
      this.createTagFromSelection();
    }
    
    // View Tags button
    if (e.target && e.target.id === 'threadcub-view-tags') {
      e.preventDefault();
      e.stopPropagation();
      this.showSidePanel();
      this.hideContextMenu();
    }
    
    // Side panel close button
    if (e.target && e.target.id === 'threadcub-panel-close') {
      e.preventDefault();
      e.stopPropagation();
      this.hideSidePanel();
    }
    
    // Submit tags to API button
    if (e.target && e.target.id === 'threadcub-submit-tags') {
      e.preventDefault();
      e.stopPropagation();
      this.submitTagsToAPI();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (this.sidePanel && this.sidePanel.classList.contains('open')) {
      if (!this.sidePanel.contains(e.target) && 
          !e.target.closest('.threadcub-floating-button') &&
          !e.target.closest('.threadcub-context-menu') &&
          !e.target.closest('.threadcub-tag-btn')) {
        this.hideSidePanel();
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      this.hideContextMenu();
      this.hideSidePanel();
    }
  });
}

  handleTextSelection(e) {
    console.log('🏷️ ThreadCub: Text selection event triggered');
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('🏷️ ThreadCub: Selected text:', selectedText);
    console.log('🏷️ ThreadCub: Context menu exists:', !!this.contextMenu);
    console.log('🏷️ ThreadCub: Tagging enabled:', this.isTaggingEnabled);
    
    if (selectedText.length > 0 && selectedText.length < 500) {
      this.selectedText = selectedText;
      this.selectedRange = selection.getRangeAt(0);
      console.log('🏷️ ThreadCub: Showing context menu at:', e.pageX, e.pageY);
      this.showContextMenu(e.pageX, e.pageY);
    } else {
      console.log('🏷️ ThreadCub: Hiding context menu - text length:', selectedText.length);
      this.hideContextMenu();
    }
  }

  showContextMenu(x, y) {
    if (!this.contextMenu) {
      console.log('🏷️ ThreadCub: Context menu not found, creating...');
      this.createContextMenu();
    }
    
    // Reset positioning and make visible for measurement
    this.contextMenu.style.position = 'fixed';
    this.contextMenu.style.left = '0px';
    this.contextMenu.style.top = '0px';
    this.contextMenu.style.visibility = 'hidden';
    this.contextMenu.style.display = 'block';
    
    // Get menu dimensions
    const menuRect = this.contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate optimal position
    let finalX = x;
    let finalY = y - 80; // Offset above cursor
    
    // Prevent menu from going off-screen horizontally
    if (finalX + menuRect.width > viewportWidth - 10) {
      finalX = viewportWidth - menuRect.width - 10;
    }
    if (finalX < 10) {
      finalX = 10;
    }
    
    // Prevent menu from going off-screen vertically
    if (finalY + menuRect.height > viewportHeight - 10) {
      finalY = y - menuRect.height - 10; // Show above selection
    }
    if (finalY < 10) {
      finalY = y + 20; // Show below selection
    }
    
    // Apply final position and show
    this.contextMenu.style.left = `${finalX}px`;
    this.contextMenu.style.top = `${finalY}px`;
    this.contextMenu.style.visibility = 'visible';
    this.contextMenu.classList.add('show');
    
    // Focus the dropdown
    const dropdown = document.getElementById('threadcub-tag-select');
    if (dropdown) {
      setTimeout(() => dropdown.focus(), 100);
    }
    
    console.log('🏷️ ThreadCub: Context menu positioned at', finalX, finalY);
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.classList.remove('show');
    }
  }

  createTagFromSelection() {
    const dropdown = document.getElementById('threadcub-tag-select');
    if (!dropdown || !this.selectedText || !this.selectedRange) return;
    
    const categoryId = dropdown.value;
    const category = this.tagCategories.find(cat => cat.id === categoryId);
    
    if (!category) return;
    
    // Create the tag object
    const tag = {
      id: Date.now(),
      text: this.selectedText,
      category: categoryId,
      categoryLabel: category.label,
      timestamp: new Date().toISOString(),
      position: this.getSelectionPosition()
    };
    
    // Add to tags array
    this.tags.push(tag);
    
    // Apply highlighting
    this.applyHighlight(this.selectedRange, categoryId, tag.id);
    
    // Update side panel
    this.updateTagsList();
    
    // Show side panel if it's the first tag
    if (this.tags.length === 1) {
      this.showSidePanel();
    }
    
    // Hide context menu
    this.hideContextMenu();
    
    // Save to session storage
    this.saveSessionTags();
    
    // Clear selection
    window.getSelection().removeAllRanges();
    
    console.log('🏷️ ThreadCub: Tag created:', tag);
    // 📊 GA: tag created — tracks category and total tag count
    this._trackEvent('tagging_tag_created', { category: categoryId, category_label: category.label, total_tags: this.tags.length });
  }

  getSelectionPosition() {
    if (!this.selectedRange) return null;
    
    const rect = this.selectedRange.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }

  applyHighlight(range, categoryId, tagId) {
    try {
      const span = document.createElement('span');
      span.className = `threadcub-highlight ${categoryId}`;
      span.setAttribute('data-tag-id', tagId);
      span.setAttribute('data-category', categoryId);
      
      // Wrap the selected text
      range.surroundContents(span);
      
      // Add click handler to highlight
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSidePanel();
      });
      
    } catch (error) {
      console.log('🏷️ ThreadCub: Could not apply highlight:', error);
    }
  }

  updateTagsList() {
    const tagsList = document.getElementById('threadcub-tags-list');
    if (!tagsList) return;
    
    if (this.tags.length === 0) {
      tagsList.innerHTML = `
        <div class="threadcub-empty-tags">
          <div class="threadcub-empty-tags-icon">🏷️</div>
          <div class="threadcub-empty-tags-title">No tags yet</div>
          <div class="threadcub-empty-tags-desc">
            Highlight text in the conversation and select a tag category to get started.
          </div>
        </div>
      `;
    } else {
      tagsList.innerHTML = this.tags.map(tag => `
        <div class="threadcub-tag-item ${tag.category}">
          <div class="threadcub-tag-category ${tag.category}">${tag.categoryLabel}</div>
          <div class="threadcub-tag-text">${tag.text}</div>
          <div class="threadcub-tag-meta">
            <span>${new Date(tag.timestamp).toLocaleTimeString()}</span>
            <button class="threadcub-tag-remove" onclick="window.threadcubTagging.removeTag(${tag.id})">
              Remove
            </button>
          </div>
        </div>
      `).join('');
    }
    
    // Update submit button state
    const submitBtn = document.getElementById('threadcub-submit-tags');
    if (submitBtn) {
      submitBtn.disabled = this.tags.length === 0;
      submitBtn.innerHTML = this.tags.length === 0 
        ? '<i class="fas fa-cloud-upload-alt"></i> Submit to ThreadCub'
        : `<i class="fas fa-cloud-upload-alt"></i> Submit ${this.tags.length} tag${this.tags.length === 1 ? '' : 's'} to ThreadCub`;
    }
  }

  removeTag(tagId) {
    // Remove from array
    this.tags = this.tags.filter(tag => tag.id !== tagId);
    
    // Remove highlight from DOM
    const highlight = document.querySelector(`[data-tag-id="${tagId}"]`);
    if (highlight) {
      const parent = highlight.parentNode;
      const textNode = document.createTextNode(highlight.textContent);
      parent.replaceChild(textNode, highlight);
      
      // Normalize the parent to merge adjacent text nodes
      parent.normalize();
    }
    
    // Update UI
    this.updateTagsList();
    this.saveSessionTags();
    
    console.log('🏷️ ThreadCub: Tag removed:', tagId);
    // 📊 GA: tag removed — tracks remaining tag count
    this._trackEvent('tagging_tag_removed', { remaining_tags: this.tags.length });
  }

  // ---------------------------------------------------------------------------
  // 📊 GA: Analytics helper — routes events through background.js
  // Search '📊 GA:' in this file to find all tracked interactions
  // ---------------------------------------------------------------------------
  _trackEvent(eventType, data) {
    try {
      chrome.runtime.sendMessage({ action: 'trackEvent', eventType, data });
    } catch (e) {
      console.warn('🏷️ ThreadCub: could not send analytics event:', e.message);
    }
  }

  showSidePanel() {
    if (this.sidePanel) {
      this.sidePanel.classList.add('open');
      // 📊 GA: tagging side panel opened
      this._trackEvent('tagging_panel_opened', { tag_count: this.tags.length });
    }
  }

  hideSidePanel() {
    if (this.sidePanel) {
      this.sidePanel.classList.remove('open');
      // 📊 GA: tagging side panel closed
      this._trackEvent('tagging_panel_closed', { tag_count: this.tags.length });
    }
  }

  toggleSidePanel() {
    if (this.sidePanel) {
      if (this.sidePanel.classList.contains('open')) {
        this.hideSidePanel();
      } else {
        this.showSidePanel();
      }
    }
  }

  async submitTagsToAPI() {
    if (this.tags.length === 0) return;
    
    const submitBtn = document.getElementById('threadcub-submit-tags');
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
      // First, get or create conversation
      if (!this.currentConversationId) {
        await this.createConversationWithTags();
      } else {
        await this.addTagsToExistingConversation();
      }
      
      // Success state
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }, 2000);
      
      // Show success notification
      this.showNotification('Tags submitted to ThreadCub successfully!', 'success');
      
    } catch (error) {
      console.error('🏷️ ThreadCub: Failed to submit tags:', error);
      
      // Error state
      submitBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }, 2000);
      
      this.showNotification('Failed to submit tags. Please try again.', 'error');
    }
  }

  async createConversationWithTags() {
    // Extract conversation data using ConversationExtractor
    const conversationData = await window.ConversationExtractor.extractConversation();

    if (!conversationData || conversationData.messages.length === 0) {
      throw new Error('No conversation data available');
    }

    // Add tags to conversation data
    conversationData.tags = this.tags;

    const data = await window.ApiService.createConversationWithTags(conversationData, this.tags);
    this.currentConversationId = data.conversationId;
  }

  async addTagsToExistingConversation() {
    const data = await window.ApiService.addTagsToExistingConversation(this.currentConversationId, this.tags);
  }

  saveSessionTags() {
    try {
      const conversationKey = this.getConversationKey();
      const sessionData = {
        tags: this.tags,
        conversationId: this.currentConversationId,
        timestamp: Date.now()
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [`threadcub_tags_${conversationKey}`]: sessionData });
      } else {
        localStorage.setItem(`threadcub_tags_${conversationKey}`, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.log('🏷️ ThreadCub: Could not save session tags:', error);
    }
  }

  async loadSessionTags() {
    try {
      const conversationKey = this.getConversationKey();
      let sessionData = null;
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([`threadcub_tags_${conversationKey}`]);
        sessionData = result[`threadcub_tags_${conversationKey}`];
      } else {
        const saved = localStorage.getItem(`threadcub_tags_${conversationKey}`);
        sessionData = saved ? JSON.parse(saved) : null;
      }
      
      if (sessionData && sessionData.tags) {
        this.tags = sessionData.tags;
        this.currentConversationId = sessionData.conversationId;
        this.updateTagsList();
        
        // Restore highlights (best effort)
        this.restoreHighlights();
        
        console.log('🏷️ ThreadCub: Session tags loaded:', this.tags);
      }
    } catch (error) {
      console.log('🏷️ ThreadCub: Could not load session tags:', error);
    }
  }

  getConversationKey() {
    // Use URL as conversation key for now
    // TODO: Could be enhanced with content hash
    const url = window.location.href;
    return btoa(url).substring(0, 20); // Base64 encoded URL (truncated)
  }

  restoreHighlights() {
    // This is a best-effort attempt to restore highlights
    // In practice, this is complex due to DOM changes
    // For now, we'll just ensure the UI is updated
    console.log('🏷️ ThreadCub: Highlights restoration skipped (DOM may have changed)');
  }

  showNotification(message, type = 'info') {
    window.UIComponents.showNotification(message, type);
  }

  // Public method to enable/disable tagging
  setEnabled(enabled) {
    this.isTaggingEnabled = enabled;
    console.log('🏷️ ThreadCub: Tagging', enabled ? 'enabled' : 'disabled');
  }

  // Public method to clear all tags
  clearAllTags() {
    this.tags = [];
    this.currentConversationId = null;
    
    // Remove all highlights
    document.querySelectorAll('.threadcub-highlight').forEach(highlight => {
      const parent = highlight.parentNode;
      const textNode = document.createTextNode(highlight.textContent);
      parent.replaceChild(textNode, highlight);
      parent.normalize();
    });
    
    this.updateTagsList();
    this.saveSessionTags();
    
    console.log('🏷️ ThreadCub: All tags cleared');
  }

  // Public method to get current tags
  getTags() {
    return this.tags;
  }
}

/// Make removeTag method globally accessible
window.threadcubTagging = null;

// Export ThreadCubTagging class globally
window.ThreadCubTagging = ThreadCubTagging;
console.log('🏷️ ThreadCub: ThreadCubTagging class exported, type:', typeof ThreadCubTagging);