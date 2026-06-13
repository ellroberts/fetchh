// =============================================================================
// ThreadCub Utilities
// General-purpose helper functions
// =============================================================================

const Utilities = {

  // =============================================================================
  // FILENAME UTILITIES
  // Consolidated from content.js and floating-button.js
  // =============================================================================

  /**
   * Sanitize text for use in filenames
   * Removes special characters, converts to lowercase, replaces spaces with dashes
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized filename-safe string
   */
  sanitizeFilename(text) {
    try {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
    } catch (error) {
      console.error('🐻 ThreadCub: Error sanitizing filename:', error);
      return 'conversation';
    }
  },

  /**
   * Generate smart filename for conversation downloads
   * Creates descriptive filename from conversation title or first user message
   * Format: platform-identifier-timestamp.json
   * @param {object} conversationData - Conversation data object
   * @returns {string} Generated filename
   */
  generateSmartFilename(conversationData) {
    try {
      const platform = conversationData.platform?.toLowerCase() || 'chat';

      let conversationIdentifier = '';

      if (conversationData.title && conversationData.title !== 'ThreadCub Conversation' && conversationData.title.trim().length > 0) {
        conversationIdentifier = this.sanitizeFilename(conversationData.title);
      } else if (conversationData.messages && conversationData.messages.length > 0) {
        const firstUserMessage = conversationData.messages.find(msg =>
          msg.role === 'user' || msg.role === 'human'
        );

        if (firstUserMessage && firstUserMessage.content) {
          const content = firstUserMessage.content.trim();
          conversationIdentifier = this.sanitizeFilename(content.substring(0, 50));
        }
      }

      if (!conversationIdentifier) {
        conversationIdentifier = 'conversation';
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${platform}-${conversationIdentifier}-${timestamp}.json`;

      console.log('🐻 ThreadCub: Generated filename:', filename);
      return filename;
    } catch (error) {
      console.error('🐻 ThreadCub: Error generating filename:', error);
      return `threadcub-conversation-${Date.now()}.json`;
    }
  }

};

// Export to global window object
window.Utilities = Utilities;
console.log('🔌 ThreadCub: Utilities module loaded');
