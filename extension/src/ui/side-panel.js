console.log('Loading: side-panel.js');

// ThreadCub Side Panel UI Module
// Extracted from Section 1H of content.js - all syntax errors fixed

class ThreadCubSidePanel {
  constructor(taggingSystem) {
    this.taggingSystem = taggingSystem;
    this.sidePanel = null;
    this.currentTab = 'tags'; // 'tags' or 'anchors'
    this.currentPriorityFilter = 'all'; // 'all', 'high', 'medium', 'low'
  }

  // ---------------------------------------------------------------------------
  // 📊 GA: Analytics helper — routes events through background.js
  // Search '📊 GA:' in this file to find all tracked interactions
  // ---------------------------------------------------------------------------
  _trackEvent(eventType, data) {
    try {
      chrome.runtime.sendMessage({ action: 'trackEvent', eventType, data });
    } catch (e) {
      console.warn('Side panel: could not send analytics event:', e.message);
    }
  }

  // ===== MAIN UPDATE METHOD =====
  updateTagsList() {
    const tagsList = this.sidePanel.querySelector('#threadcub-tags-container');
    if (!tagsList) return;

    // Render based on current tab
    if (this.currentTab === 'anchors') {
      this.renderAnchorsView(tagsList);
    } else {
      this.renderTagsView(tagsList);
    }
  }

  // Render Tags view with priority filter
  renderTagsView(container) {
    const items = this.taggingSystem.tags || [];
    const tags = items.filter(item => item.type !== 'anchor');

    // Apply priority filter
    const filteredTags = this.filterByPriority(tags);

    if (tags.length === 0) {
      container.innerHTML = this.createEmptyState('tags');
      return;
    }

    container.innerHTML = `
      <div class="threadcub-items-list" style="display: flex; flex-direction: column; gap: 8px;">
        ${filteredTags.map(tag => this.createTagCard(tag)).join('')}
      </div>
    `;

    this.setupPriorityFilterListener();
    this.setupNewCardListeners();
  }

  // Render Anchors view (simple list with delete and jump-to)
  renderAnchorsView(container) {
    const items = this.taggingSystem.tags || [];
    const anchors = items.filter(item => item.type === 'anchor');

    if (anchors.length === 0) {
      container.innerHTML = this.createEmptyState('anchors');
      return;
    }

    container.innerHTML = `
      <div class="threadcub-items-list">
        ${anchors.map(anchor => this.createSimpleAnchorCard(anchor)).join('')}
      </div>
    `;

    this.setupAnchorListListeners();
  }

  // Filter tags by priority
  filterByPriority(tags) {
    if (this.currentPriorityFilter === 'all') {
      return tags;
    }
    return tags.filter(tag => {
      return tag.tags?.some(t => t.priority === this.currentPriorityFilter);
    });
  }

  // Create priority filter dropdown
  createPriorityFilterDropdown() {
    return `
      <div class="threadcub-priority-filter-wrapper">
        <select class="threadcub-priority-select" id="threadcub-priority-filter">
          <option value="all" ${this.currentPriorityFilter === 'all' ? 'selected' : ''}>All priorities</option>
          <option value="high" ${this.currentPriorityFilter === 'high' ? 'selected' : ''}>High priority</option>
          <option value="medium" ${this.currentPriorityFilter === 'medium' ? 'selected' : ''}>Medium priority</option>
          <option value="low" ${this.currentPriorityFilter === 'low' ? 'selected' : ''}>Low priority</option>
        </select>
      </div>
    `;
  }

  // Setup priority filter listener
  setupPriorityFilterListener() {
    const select = this.sidePanel.querySelector('#threadcub-priority-filter');
    if (select) {
      select.addEventListener('change', (e) => {
        this.currentPriorityFilter = e.target.value;
        // 📊 GA: side panel priority filter changed — filter = all | high | medium | low
        this._trackEvent('side_panel_priority_filter_changed', { filter: e.target.value });
        this.updateTagsList();
      });
    }
  }

  // Create simple anchor card (just delete and jump-to)
  createSimpleAnchorCard(anchor) {
    return `
      <div class="threadcub-anchor-item" data-anchor-id="${anchor.id}">
        <div class="anchor-item-content">
          <div class="anchor-item-text">${anchor.snippet || anchor.text}</div>
        </div>
        <div class="anchor-item-actions">
          <button class="anchor-action-btn jump-to-btn" data-anchor-id="${anchor.id}" title="Jump to">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg>
          </button>
          <button class="anchor-action-btn delete-btn" data-anchor-id="${anchor.id}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Setup anchor list listeners
  setupAnchorListListeners() {
    // Jump to buttons
    const jumpBtns = this.sidePanel.querySelectorAll('.jump-to-btn');
    jumpBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const anchorId = parseInt(btn.getAttribute('data-anchor-id'));
        // 📊 GA: anchor jump-to clicked from side panel
        this._trackEvent('side_panel_anchor_jumped', { anchor_id: anchorId });
        if (this.taggingSystem.jumpToAnchor) {
          this.taggingSystem.jumpToAnchor(anchorId);
        }
      });
    });

    // Delete buttons
    const deleteBtns = this.sidePanel.querySelectorAll('.anchor-item-actions .delete-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const anchorId = parseInt(btn.getAttribute('data-anchor-id'));
        // 📊 GA: anchor deleted from side panel
        this._trackEvent('side_panel_anchor_deleted', { anchor_id: anchorId });
        this.taggingSystem.deleteTagWithUndo(anchorId);
      });
    });
  }

  // Switch tab
  switchTab(tab) {
    this.currentTab = tab;
    // 📊 GA: side panel tab switched — tab = tags | anchors
    this._trackEvent('side_panel_tab_switched', { tab });
    this.updateTabStyles();
    this.updateTagsList();
  }

  // Update tab button styles
  updateTabStyles() {
    const tagsTab = this.sidePanel.querySelector('[data-tab="tags"]');
    const anchorsTab = this.sidePanel.querySelector('[data-tab="anchors"]');

    if (tagsTab && anchorsTab) {
      if (this.currentTab === 'tags') {
        tagsTab.classList.add('active');
        anchorsTab.classList.remove('active');
        // Update inline styles to override initial values
        tagsTab.style.borderBottom = 'none';
        tagsTab.style.background = 'var(--color-white)';
        tagsTab.style.color = 'var(--color-warm-900)';
        tagsTab.style.fontWeight = '600';
        anchorsTab.style.borderBottom = 'none';
        anchorsTab.style.background = 'transparent';
        anchorsTab.style.color = 'var(--color-warm-600)';
        anchorsTab.style.fontWeight = '500';
      } else {
        tagsTab.classList.remove('active');
        anchorsTab.classList.add('active');
        // Update inline styles to override initial values
        anchorsTab.style.borderBottom = 'none';
        anchorsTab.style.background = 'var(--color-white)';
        anchorsTab.style.color = 'var(--color-warm-900)';
        anchorsTab.style.fontWeight = '600';
        tagsTab.style.borderBottom = 'none';
        tagsTab.style.background = 'transparent';
        tagsTab.style.color = 'var(--color-warm-600)';
        tagsTab.style.fontWeight = '500';
      }
    }
  }

  // Setup tab listeners (called from tagging-system after panel creation)
  setupTabListeners() {
    const tagsTab = this.sidePanel.querySelector('[data-tab="tags"]');
    const anchorsTab = this.sidePanel.querySelector('[data-tab="anchors"]');

    if (tagsTab) {
      tagsTab.addEventListener('click', () => this.switchTab('tags'));
    }
    if (anchorsTab) {
      anchorsTab.addEventListener('click', () => this.switchTab('anchors'));
    }
  }

  // Jump to a tag location in the conversation
  jumpToTag(tagId) {
    const tag = this.taggingSystem.tags.find(t => t.id === tagId);
    if (!tag) {
      console.log('Tag not found:', tagId);
      return;
    }

    console.log('Jumping to tag:', tag);
    // 📊 GA: tag jump-to clicked from side panel
    this._trackEvent('side_panel_tag_jumped', { tag_id: tagId, category: tag.category || 'unknown' });

    // Strategy 1: Use rangeInfo if available (TextQuote-style)
    if (tag.rangeInfo) {
      const result = this.jumpToTagViaRangeInfo(tag);
      if (result.success) return;
    }

    // Strategy 2: Use anchor context if available
    if (tag.anchor) {
      const result = window.anchorSystem?.jumpToAnchor(tag.anchor);
      if (result?.success) return;
    }

    // Strategy 3: Search for text in messages
    this.jumpToTagViaTextSearch(tag);
  }

  // Copy tag text to clipboard
  copyTagText(card, tagId) {
    const tag = this.taggingSystem.tags.find(t => t.id === tagId);
    if (!tag) {
      console.log('Tag not found:', tagId);
      return;
    }

    navigator.clipboard.writeText(tag.text).then(() => {
      // 📊 GA: tag text copied from side panel
      this._trackEvent('side_panel_tag_copied', { tag_id: tagId, category: tag.category || 'unknown' });
      // Show feedback
      this.showCopiedFeedback(card);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // Show "Copied!" feedback on the card
  showCopiedFeedback(card) {
    const copyBtn = card.querySelector('[data-action="copy"]');
    if (!copyBtn) return;

    // Create feedback element
    const feedback = document.createElement('span');
    feedback.textContent = 'Copied!';
    feedback.style.cssText = `
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      z-index: 1000;
      animation: fadeInOut 1.5s ease forwards;
    `;

    // Add animation styles if not already present
    if (!document.getElementById('threadcub-copy-feedback-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'threadcub-copy-feedback-styles';
      styleSheet.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    // Position the button relatively if needed
    copyBtn.style.position = 'relative';
    copyBtn.appendChild(feedback);

    // Remove after animation
    setTimeout(() => {
      feedback.remove();
    }, 1500);
  }

  // Jump using rangeInfo (stored selection context)
  jumpToTagViaRangeInfo(tag) {
    const rangeInfo = tag.rangeInfo;

    // Try adapter-based search first, then fallback to broad search
    const adapter = window.PlatformAdapters?.getAdapter();
    let messages = adapter ? adapter.getMessageElements() : [];

    // If adapter returns nothing, use broad DOM search
    if (!messages || messages.length === 0) {
      messages = document.querySelectorAll('div[class*="message"], div[class*="prose"], div[class*="markdown"], article, [data-message]');
    }

    // Final fallback
    if (!messages || messages.length === 0) {
      messages = document.querySelectorAll('div, p, article');
    }

    for (const message of messages) {
      const messageText = message.textContent || '';

      // Check if exact text exists in this message
      if (!messageText.includes(tag.text)) continue;

      // Verify with prefix/suffix context if available
      const exactIndex = messageText.indexOf(tag.text);
      let score = 0.5;

      if (rangeInfo?.prefix || rangeInfo?.beforeText) {
        const prefix = rangeInfo.prefix || rangeInfo.beforeText;
        const beforeText = messageText.slice(0, exactIndex);
        if (beforeText.includes(prefix)) score += 0.25;
      }

      if (rangeInfo?.suffix || rangeInfo?.afterText) {
        const suffix = rangeInfo.suffix || rangeInfo.afterText;
        const afterText = messageText.slice(exactIndex + tag.text.length);
        if (afterText.includes(suffix)) score += 0.25;
      }

      if (score >= 0.5) { // Lower threshold for better matching
        // Found good match - try to scroll to exact highlight first
        const highlightSpan = message.querySelector(`.threadcub-highlight[data-tag-id="${tag.id}"]`);
        
        if (highlightSpan) {
          // Scroll to the specific highlighted text (more accurate)
          highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.flashElement(highlightSpan);
        } else {
          // Fallback: scroll to message
          message.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.flashElement(message);
        }
        
        return { success: true, method: 'rangeInfo' };
      }
    }

    return { success: false };
  }

  // Jump using text search fallback
  jumpToTagViaTextSearch(tag) {
    // Try adapter-based search first
    const adapter = window.PlatformAdapters?.getAdapter();
    let messages = adapter ? adapter.getMessageElements() : [];

    // If adapter returns nothing, use broad DOM search
    if (!messages || messages.length === 0) {
      messages = document.querySelectorAll('div[class*="message"], div[class*="prose"], div[class*="markdown"], article, [data-message]');
    }

    for (const message of messages) {
      const messageText = message.textContent || '';

      if (messageText.includes(tag.text)) {
        // Try to scroll to exact highlight first
        const highlightSpan = message.querySelector(`.threadcub-highlight[data-tag-id="${tag.id}"]`);
        
        if (highlightSpan) {
          highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.flashElement(highlightSpan);
        } else {
          message.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.flashElement(message);
        }
        
        return { success: true, method: 'textSearch' };
      }
    }

    // Final fallback: Full DOM text node search
    const result = this.jumpViaFullTextSearch(tag.text);
    if (result.success) return result;

    // Show failure notification
    this.showJumpFailedNotification();
    return { success: false };
  }

  // Full DOM text search (walks all text nodes)
  jumpViaFullTextSearch(searchText) {
    console.log('Attempting full DOM text search for:', searchText);

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode;
    while ((textNode = walker.nextNode())) {
      const nodeText = textNode.textContent;
      if (nodeText.includes(searchText)) {
        const element = textNode.parentElement;
        if (element) {
          // Try to find the actual highlight span first
          const highlightSpan = element.closest('.threadcub-highlight') || 
                                element.querySelector('.threadcub-highlight');
          
          if (highlightSpan) {
            highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.flashElement(highlightSpan);
          } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.flashElement(element);
          }
          
          return { success: true, method: 'fullTextSearch' };
        }
      }
    }

    return { success: false };
  }

  // Flash highlight an element
  flashElement(element) {
    if (!element) return;

    element.classList.add('threadcub-anchor-flash');
    setTimeout(() => {
      element.classList.remove('threadcub-anchor-flash');
    }, 2000);
  }

  // Show notification when jump fails
  showJumpFailedNotification() {
    const notification = document.createElement('div');
    notification.className = 'threadcub-jump-failed';
    notification.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <span>Could not find this text in the conversation</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  // Get items based on current filter (legacy - now handled by sections)
  getFilteredItems() {
    return this.taggingSystem.tags || [];
  }

  // Set filter and update list (legacy compatibility)
  setFilter(filter) {
    this.currentFilter = filter;
    this.updateTagsList();
    this.updateFilterTabs();
  }

  // Update filter tab active states (legacy compatibility)
  updateFilterTabs() {
    const tabs = this.sidePanel?.querySelectorAll('.threadcub-filter-tab');
    tabs?.forEach(tab => {
      const tabFilter = tab.getAttribute('data-filter');
      if (tabFilter === this.currentFilter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // ===== ANCHOR CARD CREATION =====
  // Anchor cards now match tag card structure for visual consistency
  createAnchorCard(anchor) {
    const hasNote = anchor.note && anchor.note.trim().length > 0;
    const hasTags = anchor.tags && anchor.tags.length > 0;

    return `
      <div class="threadcub-tag-card threadcub-anchor-card" data-tag-id="${anchor.id}" data-anchor-id="${anchor.id}" data-state="default" data-type="anchor">
        <div class="card-content">
          <div class="tag-text">${anchor.snippet || anchor.text}</div>

          ${hasTags ? this.createPriorityTags(anchor.tags) : ''}
          ${hasNote ? this.createNoteDisplay(anchor.note, anchor.id) : ''}

          <div class="default-state">
            <div class="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
            </div>
            <div class="action-buttons">
              ${this.createActionButton('jump-to', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg>', anchor.id)}
              ${this.createActionButton('edit-note', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>', anchor.id)}
              ${this.createActionButton('add-tag', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>', anchor.id)}
              ${this.createActionButton('delete', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', anchor.id)}
            </div>
          </div>

          ${this.createNoteEditingState(anchor)}
          ${this.createTagEditingState(anchor)}
        </div>
      </div>
    `;
  }

  // ===== EMPTY STATE =====
  createEmptyState(type = 'tags') {
    if (type === 'anchors') {
      return `
        <div id="threadcub-empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg>
          </div>
          <h3 class="empty-state-title">No anchors yet</h3>
          <p class="empty-state-description">Highlight text and click the anchor icon to create a bookmark point.</p>
        </div>
      `;
    }

    return `
      <div id="threadcub-empty-state">
        <div class="empty-state-icon">🏷️</div>
        <h3 class="empty-state-title">No tags yet</h3>
        <p class="empty-state-description">Highlight text to get started with your first swipe!</p>
      </div>
    `;
  }

  // ===== TAG CARD CREATION =====
  createTagCard(tag) {
    return `
      <div class="threadcub-tag-card" data-tag-id="${tag.id}" style="
        background: #FFFFFF;
        border: 1px solid var(--color-warm-400);
        border-radius: 8px;
        overflow: visible;
        transition: all 0.2s ease;
      ">
        <div class="default-state" style="display: flex; flex-direction: column;">
        <div style="
          display: flex;
          align-items: flex-start;
          padding: 12px 16px;
          gap: 8px;
          box-sizing: border-box;
        ">
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; align-self: center; align-items: flex-start;">
            ${ tag.tags && tag.tags[0] ? (() => { const colours = { amber: {bg: '#FEF3C7', text: '#92400E'}, rose: {bg: '#FFE4E6', text: '#9F1239'}, teal: {bg: '#CCFBF1', text: '#134E4A'} }; const c = colours[tag.tags[0].colour] || colours.amber; return '<div style="display:inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background:' + c.bg + '; color:' + c.text + '; margin-bottom: 8px;">' + tag.tags[0].label + '</div>'; })() : '' }
            <div style="font-family: var(--font-family-primary); font-size: var(--font-size-sm); color: var(--color-warm-900);">${tag.text}</div>
            ${ tag.note && tag.note.trim().length > 0 ? '<div style="font-size: var(--font-size-xs); color: var(--color-warm-700); font-style: italic; margin-top: var(--spacing-2);">' + tag.note + '</div>' : '' }
          </div>
          <button class="action-button tc-tooltip-btn" data-action="jump-to-tag" data-tag-id="${tag.id}" data-tooltip="Jump to highlight" style="flex-shrink: 0; position: relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
          </button>
          <button class="action-button tc-chevron-btn tc-tooltip-btn" data-tag-id="${tag.id}" data-tooltip="Actions" style="flex-shrink: 0; position: relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
        <div class="tc-actions-row" style="
          display: none;
          justify-content: flex-end;
          align-items: center;
          padding: 4px 12px 8px;
          gap: 4px;
          border-top: 1px solid #F3F4F6;
        ">
          <button class="action-button" data-action="copy" data-tag-id="${tag.id}" data-tooltip="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="action-button" data-action="edit-note" data-tag-id="${tag.id}" data-tooltip="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-button" data-action="add-tag" data-tag-id="${tag.id}" data-tooltip="Tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </button>
          <button class="action-button" data-action="delete" data-tag-id="${tag.id}" data-tooltip="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path><path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
        </div>
        ${this.createNoteEditingState(tag)}
        ${this.createTagEditingState(tag)}
      </div>
    `;
  }

  // ===== CARD COMPONENTS (Simplified to use CSS classes) =====
  createTagText(tag) { // Removed 'tokens' parameter
    return `
      <div class="tag-text">${tag.text}</div>
    `;
  }

  createDefaultState(tag) { // Removed 'tokens' parameter
    return `
      <div class="default-state">
        <div class="card-icon paw-print-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paw-print"><path d="M5.5 7.8c-.8.7-1.5 1.7-1.5 2.8C4 13.5 7 16 9.5 16c2.2 0 3.5-2.1 4-3.5"/><path d="M18 9c.8-.7 1.5-1.7 1.5-2.8C19.5 3.5 16.5 1 14 1c-2.2 0-3.5 2.1-4 3.5"/><path d="M2.5 16.1c.8-.7 1.5-1.7 1.5-2.8C4 10.5 7 8 9.5 8c2.2 0 3.5 2.1 4 3.5"/><path d="M21 17c-.8.7-1.5 1.7-1.5 2.8C19.5 22.5 16.5 25 14 25c-2.2 0-3.5-2.1-4-3.5"/><circle cx="12" cy="12" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="19" cy="19" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="19" r="1"/></svg>
        </div>

        <div class="action-buttons">
          ${this.createActionButton('jump-to-tag', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/></svg>', tag.id)}
          ${this.createActionButton('edit-note', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>', tag.id)}
          ${this.createActionButton('add-tag', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>', tag.id)}
          ${this.createActionButton('delete', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', tag.id)}
        </div>
      </div>
    `;
  }

  createActionButton(action, iconSvg, tagId) {
    // Map action to tooltip text
    const tooltipMap = {
      'copy': 'Copy',
      'jump-to': 'Jump to location',
      'jump-to-tag': 'Jump to location',
      'edit-note': 'Edit note',
      'add-tag': 'Add priority',
      'delete': 'Delete'
    };
    const tooltip = tooltipMap[action] || action;

    return `
      <button class="action-button" data-action="${action}" data-tag-id="${tagId}" data-tooltip="${tooltip}" title="${tooltip}">
        ${iconSvg}
      </button>
    `;
  }

  createNoteEditingState(tag) { // Removed 'tokens' parameter
    return `
      <div class="note-editing" style="display: none;" data-tag-id="${tag.id}">
        <textarea class="note-textarea" placeholder="Add your note...">${tag.note || ''}</textarea>

        <div class="note-actions">
          ${this.createSaveButton(tag.id)}
          ${tag.note && tag.note.trim().length > 0 ? `<button class="remove-note-btn" data-tag-id="${tag.id}">Remove</button>` : ''}
          ${this.createCancelButton(tag.id)}
        </div>
      </div>
    `;
  }
  createTagEditingState(tag) {
    return `
      <div class="tag-editing" style="display: none;" data-tag-id="${tag.id}">
        <input class="tag-name-input" type="text" placeholder="Tag name" maxlength="20" value="${tag.tags && tag.tags[0] ? tag.tags[0].label : ''}" />
        <div class="tag-colour-options">
          <button class="tag-colour-btn selected" data-colour="amber" style="background: #FEF3C7; color: #92400E;">Amber</button>
          <button class="tag-colour-btn" data-colour="rose" style="background: #FFE4E6; color: #9F1239;">Rose</button>
          <button class="tag-colour-btn" data-colour="teal" style="background: #CCFBF1; color: #134E4A;">Teal</button>
        </div>
        <div class="tag-actions">
          <button class="save-tag-btn" data-tag-id="${tag.id}">Save</button>
          <button class="cancel-tag-btn" data-tag-id="${tag.id}">Cancel</button>
        </div>
      </div>
    `;
  }

  // ===== HELPER COMPONENTS (Simplified to use CSS classes and variables) =====
  createPriorityButton(priority) { // Removed 'tokens' parameter
    return `
      <button class="priority-btn" data-priority="${priority}">${priority.toUpperCase()}</button>
    `;
  }

  // TODO: Re-enable when custom tag functionality is implemented
  createAddTagButton() { // Removed 'tokens' parameter
    return `
      <button class="priority-btn add-tag-btn">
        <span class="add-tag-plus">+</span> ADD TAG
      </button>
    `;
  }

  createSaveButton(tagId) { // Removed 'tokens' parameter
    return `
      <button class="save-note-btn" data-tag-id="${tagId}">Save</button>
    `;
  }

  createCancelButton(tagId) { // Removed 'tokens' parameter
    return `
      <button class="cancel-note-btn" data-tag-id="${tagId}">Cancel</button>
    `;
  }

  createCancelTagButton(tagId) { // Removed 'tokens' parameter
    return `
      <button class="cancel-tag-btn" data-tag-id="${tagId}">Cancel</button>
    `;
  }

  createPriorityTags(tags) {
    return `
      <div class="priority-tags">
        ${tags.map(tag => `
          <span class="priority-tag priority-${tag.priority || 'medium'}">${tag.label}</span>
        `).join('')}
      </div>
    `;
  }

  createNoteDisplay(note, tagId) {
    return `
      <div class="note-display" data-tag-id="${tagId}">${note}</div>
    `;
  }

  // ===== EVENT LISTENERS (Updated to use CSS variables and classes) =====
  setupNewCardListeners() {
    // Setup section tag card listeners (tags inside sections)
    const sectionTagCards = this.sidePanel.querySelectorAll('.threadcub-section-tag');
    sectionTagCards.forEach(card => {
      const tagId = parseInt(card.getAttribute('data-tag-id'));
      this.setupSectionTagCardListeners(card, tagId);
    });

    // Setup standalone tag card listeners (legacy, outside sections)
    const tagCards = this.sidePanel.querySelectorAll('.threadcub-tag-card:not(.threadcub-section-tag):not(.threadcub-anchor-card)');
    tagCards.forEach(card => {
      const tagId = parseInt(card.getAttribute('data-tag-id'));
      this.setupTagCardListeners(card, tagId);
    });

    // Setup anchor card listeners (legacy standalone anchors)
    const anchorCards = this.sidePanel.querySelectorAll('.threadcub-anchor-card');
    anchorCards.forEach(card => {
      const anchorId = parseInt(card.getAttribute('data-anchor-id'));
      this.setupAnchorCardListeners(card, anchorId);
    });
  }

  // Setup listeners for section tag cards (with jump-to functionality)
  setupSectionTagCardListeners(card, tagId) {
    // Card hover effects
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = 'var(--shadow-card-hover)';
    });

    card.addEventListener('mouseleave', () => {
      const currentState = card.getAttribute('data-state');
      if (currentState === 'default') {
        card.style.boxShadow = 'var(--shadow-card)';
      }
    });

    // Jump to tag (anchor icon)
    const jumpBtn = card.querySelector('[data-action="jump-to-tag"]');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jumpToTag(tagId);
      });
    }

    // Edit note
    const editBtn = card.querySelector('[data-action="edit-note"]');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("EDIT NOTE CLICKED", card, tagId);
        this.enterNoteEditingState(card, tagId);
      });
    }

    // Add tag/priority
    const tagBtn = card.querySelector('[data-action="add-tag"]');
    if (tagBtn) {
      tagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterTagEditingState(card, tagId);
      });
    }

    // Delete
    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.taggingSystem.deleteTagWithUndo(tagId);
      });
    }

    // Note editing listeners
    this.setupNoteEditingListeners(card, tagId);

    // Tag editing listeners
    this.setupTagEditingListeners(card, tagId);
  }

  // Setup listeners for anchor cards (now uses same pattern as tag cards)
  setupAnchorCardListeners(card, anchorId) {
    // Card hover effects - same as tags
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = 'var(--shadow-card-hover)';
    });

    card.addEventListener('mouseleave', () => {
      const currentState = card.getAttribute('data-state');
      if (currentState === 'default') {
        card.style.boxShadow = 'var(--shadow-card)';
      }
    });

    // Jump-to action icon
    const jumpBtn = card.querySelector('[data-action="jump-to"]');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Anchor: Jump to clicked for anchor', anchorId);
        if (this.taggingSystem.jumpToAnchor) {
          this.taggingSystem.jumpToAnchor(anchorId);
        }
      });
    }

    // Edit note button
    const editBtn = card.querySelector('[data-action="edit-note"]');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterNoteEditingState(card, anchorId);
      });
    }

    // Add tag/priority button
    const tagBtn = card.querySelector('[data-action="add-tag"]');
    if (tagBtn) {
      tagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterTagEditingState(card, anchorId);
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.taggingSystem.deleteTagWithUndo(anchorId);
      });
    }

    // Note editing listeners - use same as tags
    this.setupNoteEditingListeners(card, anchorId);

    // Tag editing listeners - use same as tags
    this.setupTagEditingListeners(card, anchorId);
  }

  // Setup listeners for tag cards (existing functionality)
  setupTagCardListeners(card, tagId) {
    const WARM = '#F7F3EE';

    // Chevron toggle + hover
    const chevronBtn = card.querySelector('.tc-chevron-btn');
    if (chevronBtn) {
      chevronBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionsRow = card.querySelector('.tc-actions-row');
        const chevronSvg = chevronBtn.querySelector('svg');
        const isOpen = actionsRow.style.display === 'flex';
        actionsRow.style.display = isOpen ? 'none' : 'flex';
        chevronSvg.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
      chevronBtn.addEventListener('mouseenter', () => {
        chevronBtn.style.background = WARM;
        chevronBtn.style.color = '#374151';
      });
      chevronBtn.addEventListener('mouseleave', () => {
        chevronBtn.style.background = 'transparent';
        chevronBtn.style.color = '#9CA3AF';
      });
    }

    // Jump button hover
    const jumpBtn = card.querySelector('[data-action="jump-to-tag"]');
    if (jumpBtn) {
      jumpBtn.addEventListener('mouseenter', () => {
        jumpBtn.style.background = WARM;
        jumpBtn.style.color = '#6C74FB';
      });
      jumpBtn.addEventListener('mouseleave', () => {
        jumpBtn.style.background = 'transparent';
        jumpBtn.style.color = '#9CA3AF';
      });
    }

    // Action buttons hover
    card.querySelectorAll('.tc-actions-row .action-button').forEach(btn => {
      const isDelete = btn.getAttribute('data-action') === 'delete';
      btn.addEventListener('mouseenter', () => {
        btn.style.background = isDelete ? '#FEF2F2' : WARM;
        btn.style.color = isDelete ? '#EF4444' : '#374151';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        btn.style.color = '#9CA3AF';
      });
    });

    // Action button listeners
    this.setupCardActionListeners(card, tagId);
  }


  setupCardActionListeners(card, tagId) {
    // Copy to clipboard
    const copyBtn = card.querySelector('[data-action="copy"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyTagText(card, tagId);
      });
    }

    // Jump to tag
    const jumpBtn = card.querySelector('[data-action="jump-to-tag"]');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jumpToTag(tagId);
      });
    }

    // Edit note
    const editBtn = card.querySelector('[data-action="edit-note"]');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterNoteEditingState(card, tagId);
      });

      /*this.addButtonHoverEffects(editBtn, 'var(--color-gray-100)', 'var(--color-primary)'); */ // Use CSS variables
    }

    // Add tag
    const tagBtn = card.querySelector('[data-action="add-tag"]');
    if (tagBtn) {
      tagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterTagEditingState(card, tagId);
      });

      /*this.addButtonHoverEffects(tagBtn, 'var(--color-gray-100)', 'var(--color-primary)');*/ // Use CSS variables
    }

    // Delete
    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.taggingSystem.deleteTagWithUndo(tagId);
      });

     /* this.addButtonHoverEffects(deleteBtn, 'var(--color-error-light)', 'var(--color-error)');*/ // Use CSS variables
    }

    // Note editing listeners
    this.setupNoteEditingListeners(card, tagId);

    // Tag editing listeners
    this.setupTagEditingListeners(card, tagId);
  }

  addButtonHoverEffects(button, hoverBg, hoverColor) {
    button.addEventListener('mouseenter', () => {
      button.style.background = hoverBg;
      button.style.color = hoverColor;
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.color = 'var(--color-gray-500)'; // Use CSS variable
    });
  }

  // ===== STATE MANAGEMENT =====
  enterNoteEditingState(card, tagId) {
    card.setAttribute('data-state', 'note-editing');

    const defaultState = card.querySelector('.default-state');
    const noteEditing = card.querySelector('.note-editing');

    if (defaultState) defaultState.style.display = 'none';
    if (noteEditing) {
      noteEditing.style.display = 'flex';

      const textarea = noteEditing.querySelector('.note-textarea');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  }

  enterTagEditingState(card, tagId) {
    card.setAttribute('data-state', 'tag-editing');

    const defaultState = card.querySelector('.default-state');
    const tagEditing = card.querySelector('.tag-editing');

    if (defaultState) defaultState.style.display = 'none';
    if (tagEditing) tagEditing.style.display = 'block';
  }

  exitEditingState(card) {
    card.setAttribute('data-state', 'default');

    const noteEditing = card.querySelector('.note-editing');
    const tagEditing = card.querySelector('.tag-editing');

    if (noteEditing) noteEditing.style.display = 'none';
    if (tagEditing) tagEditing.style.display = 'none';

    const defaultState = card.querySelector('.default-state');
    if (defaultState) defaultState.style.display = 'flex';
  }

  // ===== NOTE EDITING =====
  setupNoteEditingListeners(card, tagId) {
    const textarea = card.querySelector('.note-textarea');
    const saveBtn = card.querySelector('.save-note-btn');
    const cancelBtn = card.querySelector('.cancel-note-btn');

    if (textarea && saveBtn) {
      textarea.addEventListener('input', () => {
        const hasText = textarea.value.trim().length > 0;

        if (hasText) {
          saveBtn.classList.add('active'); // Use class for active state
          // Use setProperty with 'important' to override Grok's !important CSS
          saveBtn.style.setProperty('color', 'white', 'important');
        } else {
          saveBtn.classList.remove('active'); // Remove class for inactive state
          saveBtn.style.removeProperty('color'); // Reset to CSS default
        }
      });

      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Only save if active (i.e., has text)
        if (saveBtn.classList.contains('active')) {
          this.taggingSystem.saveNoteForCard(tagId, textarea.value.trim());
          this.exitEditingState(card);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitEditingState(card);
      });
    }
    const removeBtn = card.querySelector('.remove-note-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.taggingSystem.saveNoteForCard(tagId, '');
        this.exitEditingState(card);
      });
    }
  }

  // ===== TAG EDITING =====
  setupTagEditingListeners(card, tagId) {
    const cancelBtn = card.querySelector('.cancel-tag-btn');
    const saveTagBtn = card.querySelector('.save-tag-btn');
    const tagInput = card.querySelector('.tag-name-input');
    const colourBtns = card.querySelectorAll('.tag-colour-btn');

    colourBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        colourBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    if (saveTagBtn && tagInput) {
      tagInput.addEventListener('input', () => {
        if (tagInput.value.trim().length > 0) {
          saveTagBtn.classList.add('active');
        } else {
          saveTagBtn.classList.remove('active');
        }
      });
      saveTagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const label = tagInput.value.trim();
        if (!label) return;
        const selectedColour = card.querySelector('.tag-colour-btn.selected');
        const colour = selectedColour ? selectedColour.getAttribute('data-colour') : 'amber';
        this.taggingSystem.addCustomTag(tagId, label, colour);
        this.exitEditingState(card);
        this.updateTagsList();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitEditingState(card);
      });
    }
    const removeBtn = card.querySelector('.remove-note-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.taggingSystem.saveNoteForCard(tagId, '');
        this.exitEditingState(card);
      });
    }
  }

  // ===== PUBLIC METHODS =====
  setSidePanel(sidePanel) {
    this.sidePanel = sidePanel;
  }
}

// Make the class globally available
window.ThreadCubSidePanel = ThreadCubSidePanel;

console.log('✅ ThreadCubSidePanel defined:', typeof window.ThreadCubSidePanel);