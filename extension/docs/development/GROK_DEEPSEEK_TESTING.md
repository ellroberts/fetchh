# Grok and DeepSeek Platform Support - Testing Guide

## Overview

This document outlines the manual testing and configuration steps required to complete the Grok and DeepSeek platform integration for ThreadCub.

**Status:** ⚠️ Placeholder implementations complete - Manual DOM inspection and configuration required

---

## What's Been Implemented

### ✅ Completed

1. **Platform Detection** (`src/utils/platform-detector.js`)
   - Added GROK and DEEPSEEK platform constants
   - Added display names for both platforms
   - Added URL detection logic:
     - Grok: `grok.x.ai` or `x.com/i/grok`
     - DeepSeek: `chat.deepseek.com`
   - Added to supported platforms list

2. **Manifest Permissions** (`manifest.json`)
   - Added host permissions for:
     - `https://grok.x.ai/*`
     - `https://x.com/*`
     - `https://chat.deepseek.com/*`
   - Added content script matches for same URLs

3. **Conversation Extraction** (`src/core/conversation-extractor.js`)
   - Added `extractGrokConversation()` with placeholder implementation
   - Added `extractDeepSeekConversation()` with placeholder implementation
   - Updated main routing to call new platform functions

4. **Autostart Logic** (`src/features/platform-autostart.js`)
   - Added `attemptGrokAutoStart()` with placeholder implementation
   - Added `attemptDeepSeekAutoStart()` with placeholder implementation
   - Updated main routing to call new platform functions
   - Exported new functions

---

## 🔍 Manual Configuration Required

### For Grok (https://grok.x.ai or https://x.com/i/grok)

#### Step 1: Visit Grok
1. Navigate to https://grok.x.ai (or https://x.com/i/grok)
2. Open a conversation or start a new one
3. Open Chrome DevTools (F12)

#### Step 2: Inspect Message Structure
Find and document the following selectors:

**Message Containers:**
- [ ] What selector identifies individual message containers?
- [ ] Example: `div[data-testid="message"]`, `div[class*="ChatMessage"]`
- Current placeholder: Generic selectors

**User Messages:**
- [ ] How to identify user messages vs assistant messages?
- [ ] Check for: `data-role="user"`, `data-author="user"`, class patterns
- Current: Alternating pattern (index % 2)

**Assistant Messages:**
- [ ] How to identify assistant messages?
- [ ] Check for: `data-role="assistant"`, specific class names
- Current: Alternating pattern (index % 2)

**Message Content:**
- [ ] Where is the actual message text?
- [ ] Check for: `.textContent`, `.innerText`, specific content containers
- Current: `element.textContent`

**Code Blocks:**
- [ ] How are code blocks rendered?
- [ ] Are they in `<pre>`, `<code>`, or custom elements?

**Special Content:**
- [ ] How are images displayed?
- [ ] How are links formatted?
- [ ] Any other special content types?

#### Step 3: Inspect Input/Submit Elements

**Input Field:**
- [ ] What selector identifies the message input field?
- [ ] Is it a `<textarea>` or `contenteditable` div?
- [ ] Example: `textarea[data-testid="chat-input"]`
- Current placeholder: Generic textarea selectors

**Send Button:**
- [ ] What selector identifies the send button?
- [ ] Example: `button[data-testid="send-button"]`
- [ ] Is it disabled when input is empty?
- Current placeholder: Generic button selectors

#### Step 4: Update Code

Update `src/core/conversation-extractor.js` → `extractGrokConversation()`:
```javascript
// Replace placeholder selectors with actual ones found above
const messageSelectors = [
  '[YOUR-ACTUAL-MESSAGE-SELECTOR]',
  // Add fallbacks
];

// Replace role detection with actual attribute checking
const roleAttr = element.getAttribute('data-role'); // or whatever Grok uses
const role = roleAttr === 'user' ? 'user' : 'assistant';
```

Update `src/utils/platform-detector.js` → `INPUT_SELECTORS.grok`:
```javascript
grok: [
  '[YOUR-ACTUAL-INPUT-SELECTOR]',
  // Add fallbacks
],
```

Update `src/features/platform-autostart.js` → `attemptGrokAutoStart()`:
```javascript
const sendSelectors = [
  '[YOUR-ACTUAL-SEND-BUTTON-SELECTOR]',
  // Add fallbacks
];
```

#### Step 5: Test Functionality

- [ ] Platform detection works (check console: "🐻 ThreadCub: Grok platform detected")
- [ ] Floating button appears on Grok pages
- [ ] Clicking "Save Conversation" extracts messages correctly
- [ ] User messages have correct role
- [ ] Assistant messages have correct role
- [ ] Message content is clean (no UI button text)
- [ ] Code blocks are preserved
- [ ] "Continue Conversation" fills input field
- [ ] "Continue Conversation" clicks send button
- [ ] No console errors

---

### For DeepSeek (https://chat.deepseek.com)

#### Step 1: Visit DeepSeek
1. Navigate to https://chat.deepseek.com
2. Open a conversation or start a new one
3. Open Chrome DevTools (F12)

#### Step 2: Inspect Message Structure
Find and document the following selectors:

**Message Containers:**
- [ ] What selector identifies individual message containers?
- [ ] Example: `div[data-message-id]`, `div[class*="Message"]`
- Current placeholder: Generic selectors

**User Messages:**
- [ ] How to identify user messages vs assistant messages?
- [ ] Check for: `data-role="user"`, `data-author="user"`, class patterns
- Current: Alternating pattern (index % 2) or data-role attribute

**Assistant Messages:**
- [ ] How to identify assistant messages?
- [ ] Check for: `data-role="assistant"`, specific class names
- Current: Alternating pattern (index % 2) or data-role attribute

**Message Content:**
- [ ] Where is the actual message text?
- [ ] Check for: `.markdown`, `.content`, specific content containers
- Current: `element.textContent`

**Code Blocks:**
- [ ] How are code blocks rendered?
- [ ] Are they in `<pre>`, `<code>`, or custom elements?

**Special Content:**
- [ ] How are images displayed?
- [ ] How are links formatted?
- [ ] Any other special content types?

#### Step 3: Inspect Input/Submit Elements

**Input Field:**
- [ ] What selector identifies the message input field?
- [ ] Is it a `<textarea>` or `contenteditable` div?
- [ ] Example: `textarea[placeholder*="Ask"]`
- Current placeholder: Generic textarea selectors

**Send Button:**
- [ ] What selector identifies the send button?
- [ ] Example: `button[aria-label="Send"]`
- [ ] Is it disabled when input is empty?
- Current placeholder: Generic button selectors

**Modals/Popups:**
- [ ] Are there any welcome modals that need to be dismissed?
- [ ] Any login/signup popups that interfere?

#### Step 4: Update Code

Update `src/core/conversation-extractor.js` → `extractDeepSeekConversation()`:
```javascript
// Replace placeholder selectors with actual ones found above
const messageSelectors = [
  '[YOUR-ACTUAL-MESSAGE-SELECTOR]',
  // Add fallbacks
];

// Replace role detection with actual attribute checking
const roleAttr = element.getAttribute('data-role'); // or whatever DeepSeek uses
const role = roleAttr === 'user' ? 'user' : 'assistant';
```

Update `src/utils/platform-detector.js` → `INPUT_SELECTORS.deepseek`:
```javascript
deepseek: [
  '[YOUR-ACTUAL-INPUT-SELECTOR]',
  // Add fallbacks
],
```

Update `src/features/platform-autostart.js` → `attemptDeepSeekAutoStart()`:
```javascript
const sendSelectors = [
  '[YOUR-ACTUAL-SEND-BUTTON-SELECTOR]',
  // Add fallbacks
];
```

#### Step 5: Test Functionality

- [ ] Platform detection works (check console: "🐻 ThreadCub: DeepSeek platform detected")
- [ ] Floating button appears on DeepSeek pages
- [ ] Clicking "Save Conversation" extracts messages correctly
- [ ] User messages have correct role
- [ ] Assistant messages have correct role
- [ ] Message content is clean (no UI button text)
- [ ] Code blocks are preserved
- [ ] "Continue Conversation" fills input field
- [ ] "Continue Conversation" clicks send button
- [ ] No console errors

---

## General Testing Checklist

After configuring both platforms:

- [ ] Load unpacked extension in Chrome
- [ ] Test all features on Grok
- [ ] Test all features on DeepSeek
- [ ] Verify no regressions on existing platforms (Claude, ChatGPT, Gemini)
- [ ] Check for console errors
- [ ] Test conversation download (JSON file)
- [ ] Test conversation tagging
- [ ] Test conversation continuation
- [ ] Verify input field population works
- [ ] Verify auto-submit works

---

## Development Workflow

1. Make changes to selectors in code
2. Save files
3. Go to `chrome://extensions/`
4. Click "Reload" on ThreadCub extension
5. Refresh the Grok/DeepSeek page
6. Test changes
7. Repeat until working

---

## Common Issues & Solutions

**Issue: Messages not extracted**
- Solution: Check console logs to see which selectors are being tried
- Verify the selector actually matches elements on the page
- Try more specific selectors

**Issue: Role detection wrong (all user or all assistant)**
- Solution: Look for data attributes like `data-role`, `data-author`, `data-message-author-role`
- Check for specific class patterns (e.g., `.user-message`, `.assistant-message`)
- Inspect parent containers for role indicators

**Issue: Send button not clicking**
- Solution: Check if button is disabled until input has text
- May need to wait longer before clicking
- Check for multiple submit buttons and use more specific selector

**Issue: Input field not filling**
- Solution: Verify correct selector for input field
- Check if it's `<textarea>` vs `contenteditable`
- Try both `.value =` and `.textContent =` depending on element type
- Dispatch input/change events after setting value

**Issue: Floating button not appearing**
- Solution: Check platform detection in console
- Verify manifest permissions include the URL
- Check content scripts are loading (see console logs)

---

## Files Modified

1. `src/utils/platform-detector.js` - Platform detection logic
2. `src/core/conversation-extractor.js` - Conversation extraction
3. `src/features/platform-autostart.js` - Autostart/continuation logic
4. `manifest.json` - Permissions and content script matches

---

## Next Steps

1. Follow Grok testing steps above
2. Follow DeepSeek testing steps above
3. Update code with actual selectors
4. Test thoroughly
5. Commit final working version
6. Update README with new supported platforms

---

## Questions?

If selectors are hard to find:
- Use Chrome DevTools "Inspect" tool to click on messages
- Look at the element's attributes in the Elements panel
- Check for patterns in class names or data attributes
- Try using the Console to test selectors: `document.querySelectorAll('[YOUR-SELECTOR]')`

---

**Created:** 2026-01-20
**Status:** Awaiting manual DOM inspection and configuration
