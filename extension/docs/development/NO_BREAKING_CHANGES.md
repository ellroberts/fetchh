# 🚫 NO BREAKING CHANGES - Development Guidelines

## Core Principle
**Never break what's already working.** All changes should be enhancements, not replacements of proven functionality.

---

## 📋 Before Making ANY Changes

### 1. **Clarifying Questions (ALWAYS ASK FIRST)**
Before writing any code, Claude must ask:

- ✅ **What platform(s) is this issue affecting?**
  - Specific platform: Claude, ChatGPT, Gemini, Grok, DeepSeek, Perplexity
  - All platforms or just one?

- ✅ **What is the EXACT current behavior?**
  - What happens now?
  - What error appears (if any)?
  - What step in the flow fails?

- ✅ **What SHOULD happen instead?**
  - Expected behavior
  - Reference to working example (e.g., "like the floating button does")

- ✅ **What is currently WORKING that must not break?**
  - Which platforms work correctly?
  - Which features work correctly?
  - Any specific flows that are proven?

- ✅ **Is there a working reference implementation?**
  - Does floating-button.js have this working?
  - Does another file have the correct logic?
  - Should we copy existing working code?

### 2. **Create Backup Snapshot**
Before ANY modifications:
```bash
# Save current working state with timestamp
cp [filename].js [filename].WORKING-[YYYY-MM-DD].js
```

Example:
```bash
cp conversation-length-detector.js conversation-length-detector.WORKING-2026-02-15.js
cp background.js background.WORKING-2026-02-15.js
```

---

## 🎯 Making Changes - The Surgical Approach

### Rule 1: **Minimal Modifications Only**
- Change ONLY what's needed to fix the specific issue
- Don't refactor working code
- Don't "improve" code that's functioning correctly
- Don't reorganize or rename things that work

### Rule 2: **Show Before Changing**
Claude must show:

```markdown
**Change Summary:**
- File: conversation-length-detector.js
- Lines affected: 347-352 (6 lines)
- What's changing: Adding platform check for Gemini
- What's NOT changing: All other platform handlers remain identical

**Before:**
```javascript
// old code here
```

**After:**
```javascript
// new code here
```

**Risk Assessment:**
- ✅ Low risk - only affects Gemini platform
- ✅ Other platforms unchanged
- ⚠️ Requires testing on Gemini
```

### Rule 3: **One Issue, One Fix**
- Fix ONE specific problem per iteration
- Don't combine multiple fixes
- Test after each fix before moving to the next

### Rule 4: **Preserve Working Logic**
If copying from a working reference (like floating-button.js):
- Copy the ENTIRE logic block
- Don't modify it "to make it better"
- Keep variable names, structure, error handling identical
- Add comments indicating the source:
  ```javascript
  // COPIED FROM floating-button.js - DO NOT MODIFY
  // This logic is proven to work across all platforms
  ```

---

## 🔒 Protected Code Sections

### Never Modify These Without Explicit Permission:

#### 1. **Platform Handlers (conversation-length-detector.js)**
```javascript
// Lines ~398-530 - Platform-specific continuation flows
_handleClaudeFlow()
_handleChatGPTFlow()
_handleGeminiFlow()
_handleGrokFlow()
_handleDeepSeekFlow()
_handlePerplexityFlow()
```
**Why:** These are copied from floating-button.js and proven to work

#### 2. **Core Continuation Logic**
```javascript
// Lines ~303-395 - Main continuation flow
async _handleContinueClick()
```
**Why:** This is the exact same logic as floating button's saveAndOpenConversation()

#### 3. **Analytics Tracking**
```javascript
_trackEvent()
```
**Why:** Working correctly, don't break tracking

### Modifications Allowed WITH Explicit Issue:
- Platform detection logic (if new platform or URL pattern)
- Selector maps (if DOM structure changed on platform)
- Error messages and user feedback
- Fallback handlers (if storage fails)

---

## ✅ Approved Change Patterns

### Pattern 1: **Adding New Platform Support**
```javascript
// 1. Add to platform detection
if (hostname.includes('newplatform.com')) {
  this._platform = 'newplatform';
}

// 2. Add selectors
newplatform: {
  messageContainer: 'div.message',
  userMessage: '[data-role="user"]',
  assistantMessage: '[data-role="assistant"]',
}

// 3. Add handler (copy from existing working platform)
_handleNewPlatformFlow(continuationPrompt, shareUrl, conversationData) {
  // COPY ENTIRE LOGIC from similar platform
}
```

### Pattern 2: **Fixing Selectors (Platform UI Changed)**
```javascript
// OLD (not working anymore)
chatgpt: {
  messageContainer: 'div[data-old-selector]',
}

// NEW (updated for current DOM)
chatgpt: {
  messageContainer: 'div[data-new-selector]',
}
```

### Pattern 3: **Adding Fallback Logic**
```javascript
// Add try-catch around risky operations
try {
  await window.StorageService.storeWithChrome(continuationData);
} catch (error) {
  // Fallback to localStorage
  this._handlePlatformFlowFallback(continuationData);
}
```

---

## 🚨 Red Flags - STOP and Ask

If Claude finds itself:
- ❌ Rewriting entire methods
- ❌ "Simplifying" or "cleaning up" working code
- ❌ Changing variable names for "consistency"
- ❌ Combining multiple fixes in one change
- ❌ Removing error handling
- ❌ Changing proven logic flow

**→ STOP. Ask user if this is really needed.**

---

## 📝 Issue Reporting Template

When Ells reports an issue, use this format to clarify:

```markdown
**Issue Report Checklist:**

Platform affected: [Claude/ChatGPT/Gemini/Grok/DeepSeek/Perplexity/All]

Current behavior:
- What happens: [description]
- Error message: [if any]
- Console logs: [if available]

Expected behavior:
- What should happen: [description]
- Reference: [e.g., "works correctly in floating button"]

Currently working (don't break):
- Platforms: [list working platforms]
- Features: [list working features]

Additional context:
- Screenshots: [if available]
- Console output: [if available]
```

---

## 🔄 Testing Workflow

### After Each Change:

1. **Targeted Testing**
   - Test ONLY the platform/feature that was changed
   - Verify the specific issue is fixed

2. **Regression Testing**
   - Quick test on one other working platform
   - Verify nothing broke

3. **Full Testing** (before deployment)
   - Test all platforms
   - Test both Download and Continue buttons
   - Verify analytics events fire

---

## 💾 Version Control Strategy

### File Naming Convention:
```
[filename].js                          ← Current working version
[filename].WORKING-2026-02-15.js      ← Backup before changes
[filename].TESTING-gemini-fix.js      ← Experimental fix version
```

### When to Create Backups:
- ✅ Before starting any debugging session
- ✅ After confirming something works perfectly
- ✅ Before making "larger" changes (3+ platforms affected)
- ✅ Before any refactoring

### When to Restore from Backup:
- ❌ New change breaks working functionality
- ❌ Can't identify source of new bug
- ❌ User says "revert to working version"

---

## 🎓 Learning from Mistakes

### Past Breaking Changes (Don't Repeat):

1. **❌ Trying to "improve" the floating button logic**
   - **What happened:** Added API-first approach, API returned 400 error
   - **Lesson:** Don't modify working logic unless explicitly broken
   - **Fix:** Reverted to exact floating button code

2. **❌ Clicking floating button instead of calling continuation**
   - **What happened:** Opened side panel, didn't trigger continuation
   - **Lesson:** Understand what code actually does before using it
   - **Fix:** Copied actual continuation logic from floating button

3. **❌ Adding complex analytics before core functionality works**
   - **What happened:** Extension context errors broke everything
   - **Lesson:** Core functionality first, enhancements second
   - **Fix:** Wrapped analytics in try-catch, made non-critical

---

## 📞 Communication Protocol

### When Claude Should Ask for Clarification:
- User says "fix all platforms" → Ask for specific issues by platform
- User says "it doesn't work" → Ask for exact behavior and platform
- User says "make it better" → Ask what specific improvement is needed
- User provides screenshot only → Ask what the issue is
- Unclear if change will break something → State concern, ask permission

### When Claude Can Proceed:
- User provides specific issue on specific platform
- User provides exact error message or logs
- User says "copy the logic from [working reference]"
- User says "add support for [new platform]"

---

## ✨ Success Criteria

A change is successful when:
- ✅ The specific reported issue is fixed
- ✅ No previously working functionality is broken
- ✅ Code follows the same patterns as proven working code
- ✅ User confirms it works on target platform
- ✅ Quick regression test passes on one other platform

---

## 🚀 Quick Reference Checklist

Before making changes:
- [ ] Asked clarifying questions
- [ ] Created backup snapshot
- [ ] Identified minimal change needed
- [ ] Showed before/after comparison
- [ ] Got user approval

While making changes:
- [ ] Changing ONLY affected code
- [ ] Not refactoring working code
- [ ] Preserving error handling
- [ ] Adding comments for context

After making changes:
- [ ] Tested on target platform
- [ ] Quick regression test
- [ ] Documented what changed
- [ ] Ready for user testing

---

## 📚 Reference Files

### Working Reference Implementations:
- `floating-button.js` - Proven continuation logic for all platforms
- `conversation-extractor.js` - Proven extraction logic for all platforms
- `background.js` - Proven message handlers and analytics

### When in Doubt:
1. Check if floating-button.js has working implementation
2. Copy that implementation exactly
3. Don't try to "improve" it

---

## 🎯 Remember

> **The goal is not perfect code. The goal is working code.**
> 
> **Better to ship code that works for 5 platforms than perfect code that works for none.**
>
> **When copying working code, copy ALL of it. Don't be clever.**

---

**Last Updated:** 2026-02-15
**Document Version:** 1.0
**Status:** Active - Reference this document at the start of EVERY development session
