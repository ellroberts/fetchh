// ============================================================================
// ThreadCub Content Script - Modular Architecture Entry Point
// ============================================================================
//
// This file serves as the minimal entry point for the ThreadCub extension.
// All functionality has been extracted into dedicated modules for better
// organization, maintainability, and testability.
//
// MODULE ARCHITECTURE:
//
// UTILITIES & SERVICES:
//   - src/utils/platform-detector.js      Platform detection and selectors
//   - src/utils/utilities.js              Helper functions (filename generation)
//   - src/services/storage-service.js     Chrome storage operations
//   - src/services/api-service.js         ThreadCub API communication
//
// CORE FUNCTIONALITY:
//   - src/core/conversation-extractor.js  Conversation extraction logic
//   - src/core/floating-button.js         Floating button UI component
//   - src/core/app-initializer.js         Application initialization
//
// UI COMPONENTS:
//   - src/ui/ui-components.js             Toast notifications and alerts
//   - src/ui/side-panel.js                Side panel UI
//
// FEATURE MODULES:
//   - src/features/tagging-system.js      Conversation tagging system
//   - src/features/continuation-system.js Cross-tab continuation logic
//   - src/features/platform-autostart.js  Platform-specific auto-start
//   - src/features/download-manager.js    Download and export functionality
//
// ============================================================================
//
// INITIALIZATION:
// The application is automatically initialized by app-initializer.js which
// is loaded before this file in manifest.json. This file exists primarily
// as a placeholder and documentation of the modular architecture.
//
// All modules expose their functionality via window.* objects:
//   - window.PlatformDetector
//   - window.Utilities
//   - window.StorageService
//   - window.ApiService
//   - window.ConversationExtractor
//   - window.UIComponents
//   - window.ThreadCubFloatingButton
//   - window.ThreadCubTagging
//   - window.ContinuationSystem
//   - window.PlatformAutostart
//   - window.DownloadManager
//   - window.AppInitializer
//
// ============================================================================

console.log('🐻 ThreadCub: Content script loaded - All functionality in modules');
console.log('🐻 ThreadCub: Modular architecture active');

// Optional: Additional logging for debugging module loading
if (typeof window.AppInitializer !== 'undefined') {
  console.log('🐻 ThreadCub: ✅ All modules loaded successfully');
} else {
  console.error('🐻 ThreadCub: ⚠️ Module loading may be incomplete');
}