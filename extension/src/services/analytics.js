// ============================================================================
// ThreadCub Analytics Service - Google Analytics 4 Integration
// ============================================================================
//
// This module provides analytics tracking for ThreadCub extension using
// Google Analytics 4 Measurement Protocol API.
//
// WHAT WE TRACK:
//   - Feature usage (tags, anchors, exports)
//   - Platform detection
//   - Extension lifecycle (install, update)
//   - User engagement patterns
//
// WHAT WE DON'T TRACK:
//   - Conversation content
//   - Personally identifiable information
//   - User messages or AI responses
//
// PRIVACY: All tracking uses anonymous client IDs with no PII
//
// ============================================================================

const Analytics = (function() {
  'use strict';

  // GA4 Configuration
  const GA4_CONFIG = {
    measurementId: 'G-C8P8077SG8',
    apiSecret: 'bQOELj-hRduhrmLtjJfUPGQ',
    endpoint: 'https://www.google-analytics.com/mp/collect'
  };

  /**
   * Generate or retrieve a unique client ID for this user
   * Stored in chrome.storage.local to persist across sessions
   */
  async function getClientId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['ga_client_id'], (result) => {
        if (result.ga_client_id) {
          resolve(result.ga_client_id);
        } else {
          // Generate a new client ID (UUID v4 format)
          const clientId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          chrome.storage.local.set({ ga_client_id: clientId });
          resolve(clientId);
        }
      });
    });
  }

  /**
   * Get the extension version from manifest
   */
  function getExtensionVersion() {
    return chrome.runtime.getManifest().version;
  }

  /**
   * Send event to Google Analytics 4 via Measurement Protocol
   */
  async function sendEvent(eventName, eventParams = {}) {
    try {
      const clientId = await getClientId();
      const version = getExtensionVersion();

      const payload = {
        client_id: clientId,
        events: [{
          name: eventName,
          params: {
            ...eventParams,
            extension_version: version,
            engagement_time_msec: 100 // Required parameter
          }
        }]
      };

      const url = `${GA4_CONFIG.endpoint}?measurement_id=${GA4_CONFIG.measurementId}&api_secret=${GA4_CONFIG.apiSecret}`;

      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log(`🐻 [Analytics] Event sent: ${eventName}`, eventParams);
    } catch (error) {
      console.error('🐻 [Analytics] Error sending event:', error);
    }
  }

  // Public API
  return {
    /**
     * Track extension installation
     */
    trackInstall() {
      sendEvent('extension_installed', {
        install_date: new Date().toISOString()
      });
    },

    /**
     * Track extension update
     */
    trackUpdate(previousVersion) {
      sendEvent('extension_updated', {
        previous_version: previousVersion,
        new_version: getExtensionVersion()
      });
    },

    /**
     * Track tag creation
     */
    trackTagCreated(tagData) {
      sendEvent('tag_created', {
        tag_text_length: tagData.text?.length || 0,
        has_selection: !!tagData.selectedText,
        platform: tagData.platform || 'unknown'
      });
    },

    /**
     * Track anchor creation
     */
    trackAnchorCreated(anchorData) {
      sendEvent('anchor_created', {
        anchor_text_length: anchorData.text?.length || 0,
        has_selection: !!anchorData.selectedText,
        platform: anchorData.platform || 'unknown'
      });
    },

    /**
     * Track conversation export
     */
    trackExport(format, conversationData) {
      sendEvent('conversation_exported', {
        export_format: format, // 'json', 'markdown', or 'pdf'
        tag_count: conversationData.tags?.length || 0,
        anchor_count: conversationData.anchors?.length || 0,
        message_count: conversationData.messages?.length || 0,
        platform: conversationData.platform || 'unknown'
      });
    },

    /**
     * Track side panel opened
     */
    trackSidePanelOpened(platform) {
      sendEvent('side_panel_opened', {
        platform: platform || 'unknown'
      });
    },

    /**
     * Track platform detection
     */
    trackPlatformDetected(platform) {
      sendEvent('platform_detected', {
        platform: platform
      });
    },

    /**
     * Track conversation extraction
     */
    trackConversationExtracted(conversationData) {
      sendEvent('conversation_extracted', {
        message_count: conversationData.messages?.length || 0,
        platform: conversationData.platform || 'unknown',
        extraction_method: conversationData.method || 'manual'
      });
    },

    /**
     * Track floating button clicked
     */
    trackFloatingButtonClicked(platform) {
      sendEvent('floating_button_clicked', {
        platform: platform || 'unknown'
      });
    },

    /**
     * Track continuation started
     */
    trackContinuationStarted(platform) {
      sendEvent('continuation_started', {
        platform: platform || 'unknown'
      });
    },

    /**
     * Track error
     */
    trackError(errorType, errorMessage) {
      sendEvent('extension_error', {
        error_type: errorType,
        error_message: errorMessage?.substring(0, 100) || 'unknown'
      });
    },

    /**
     * Track feature usage (generic)
     */
    trackFeatureUsed(featureName, featureParams = {}) {
      sendEvent('feature_used', {
        feature_name: featureName,
        ...featureParams
      });
    }
  };
})();

// Expose Analytics to window for use in content scripts
if (typeof window !== 'undefined') {
  window.Analytics = Analytics;
}

// Export for background script (service worker)
if (typeof self !== 'undefined' && self.Analytics === undefined) {
  self.Analytics = Analytics;
}

console.log('🐻 ThreadCub Analytics: Module loaded');