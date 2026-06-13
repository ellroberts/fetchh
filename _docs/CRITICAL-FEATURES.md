# Critical Features - DO NOT BREAK ⚠️

This document lists features that have been fixed multiple times and must not be broken again.

---

## 1. Platform Badge Detection 🏷️

**What it does:** Correctly displays the platform badge (ChatGPT, Claude, Gemini, etc.) on conversation cards instead of showing "unknown".

### Files Involved (DO NOT MODIFY WITHOUT TESTING):

1. **lib/utils/fileParser.js** (line 108-109)
   - Extracts platform field from imported JSON files
   - Without this, platform defaults to "unknown"

2. **components/import/FileUpload.tsx** (line 53-63)
   - Checks conversation.platform FIRST
   - Normalizes platform names ("ChatGPT" → "chatgpt", "Claude" → "claude.ai")
   - Falls back to detecting from source/URL if platform is missing

3. **app/(dashboard)/threads/page.tsx** (line 330-331, 362-363)
   - Fallback transformation for old data where platform='unknown'
   - Uses source column when platform is unknown

### How The Fix Works:

```
JSON File: {"platform": "ChatGPT"}
    ↓
fileParser.js: Extracts platform field
    ↓
FileUpload.tsx: Normalizes to "chatgpt"
    ↓
Database: platform = "chatgpt" (not "unknown")
    ↓
UI: Badge shows "ChatGPT" ✅
```

### How to Test (REQUIRED before merging branches):

1. Import test file: chatgpt-promptmacros-what-are-macros-2025-11-15T08-15-25.json
2. Check console: "What parser returned" should show platform field
3. Check Supabase: platform column should be "chatgpt" (not "unknown")
4. Check UI: Badge should show correct platform

### Fixed In:
- Commits: 5624fdb, d416d60
- Date: November 16, 2025
- Context: Platform badge fix for conversation cards

### If This Breaks Again:
1. Check if fileParser.js still extracts the platform field (line 108)
2. Check if FileUpload.tsx still checks conversation.platform first (line 53)
3. Review git diff to see what changed
4. Re-test with the steps above
