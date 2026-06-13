# ThreadCub Chrome Extension (v1.1.1)

ThreadCub helps you stay in control of long AI conversations.

It adds a small floating button to supported AI chat sites so you can:
- **Save** a full conversation as a structured **JSON, Markdown, or PDF** file
- **Highlight + tag** key parts of a chat ("Pawmarks") with **anchors** and manage them in a side panel
- **Continue** a conversation into another AI platform by carrying context forward
- **Archive** conversations to ThreadCub with a shareable link — works for both logged-in and guest users

> Local-first by default. No required login.

---

## What's included

### Core features
- **Multi-format conversation export**
  - **JSON** — Structured data with title, URL, platform, timestamp, and messages
  - **Markdown** — Clean, readable format for documentation
  - **PDF** — Professional export with ThreadCub branding
  - Export menu with three-dot dropdown for easy format selection

- **Pawmarks (highlight + tagging)**
  - Select text → tag it (Don't Forget / Backlog / Priority)
  - Create **anchors** for quick navigation to important sections
  - Highlights **persist across sessions** via Chrome storage + XPath range restoration
  - **Side panel** with separate tabs for Tags and Anchors
  - Copy tagged text to clipboard with one click
  - Jump-to-highlight functionality
  - Individual delete controls for tags and anchors
  - Tooltips on all action buttons for better discoverability

- **Continue Chat (cross-tab continuation)**
  - Stores continuation data in Chrome storage
  - Opens the next platform and auto-fills the prompt
  - Auto-submit supported on some platforms (see below)

- **Send to ThreadCub**
  - Archives the full conversation to threadcub.com and generates a shareable link
  - Works for both **logged-in users** (linked to account) and **guests** (anonymous session)
  - Guest session ID persisted in `chrome.storage.local` — no login required
  - Failed saves queued offline and retried automatically on reconnect

### Security
- Payloads encrypted using **AES-GCM via the native Web Crypto API** — no third-party crypto dependency
- Encryption key generated on first install and stored in `chrome.storage.local`
- Authenticated users always get a per-user key; guests skip encryption entirely
- User is warned if storage is cleared (data loss risk)

### Authentication / accounts (optional)
ThreadCub does **not** require login. It uses an **anonymous session ID** by default, and can optionally authenticate via a ThreadCub account tab for account linking. Login is handled via OAuth in a new tab — the popup updates to show your email and a logout button when authenticated.

### Usage Analytics (v1.0.5+)
ThreadCub includes privacy-first analytics to help improve the extension:
- **What we track:** Feature usage (tags created, exports, continuations), platform detection, extension installs/updates, extraction success/failure per platform
- **What we DON'T track:** Conversation content, personal information, or any identifiable data
- **How it works:** Anonymous tracking via Google Analytics 4 Measurement Protocol
- **Privacy:** All tracking uses anonymous client IDs with no personal data collection

---

## Platform support

| Platform | Status | Notes |
|---|---:|---|
| Claude.ai | Fully implemented | Strongest extraction + enhanced role detection |
| ChatGPT (chatgpt.com) | Fully implemented | Alternating role detection |
| Gemini | Fully implemented | Enhanced conversation detection |
| Grok (grok.com / x.com/i/grok) | Fully implemented | Full extraction, download, continue, tagging |
| DeepSeek (chat.deepseek.com) | Fully implemented | Full extraction, download, continue, tagging |
| Perplexity (perplexity.ai) | Fully implemented | Full support |
| Microsoft Copilot | Partial | Tagging/download/continue work; highlights don't persist across chats |

Continuation behaviour:
- **Claude / Grok / X.com/i/grok:** direct flow, can auto-submit
- **ChatGPT / Gemini / Copilot / DeepSeek / Perplexity:** file-based flow, requires manual upload step before submitting

---

## Project structure (high level)

- `manifest.json` — Manifest V3, content scripts load order
- `background.js` — service worker (downloads, API calls, auth token lookup, analytics)
- `content.js` — entry point
- `src/`
  - `core/` — app initializer, conversation extractor, floating button UI
  - `features/` — continuation, tagging (tags + anchors), downloads, platform autostart
  - `services/` — API + storage wrappers, analytics service, crypto service
  - `ui/` — side panel with tabs + UI utilities
  - `adapters/` — platform-specific adapters for chat extraction
  - `utils/` — platform detection + helpers
- `assets/` — CSS + images/icons
- `popup/` — minimal popup (auth state, feedback form + Discord webhook)
- `docs/` — audits, quick start, testing guides

---

## How to use

1. Visit a supported platform (e.g. Claude / ChatGPT / Gemini)
2. The **floating ThreadCub button** appears
3. Use it to:
   - **Tag** → highlight text and create tags or anchors
   - **Anchor** → create quick-jump anchors for important sections
   - **Side Panel** → view all your tags and anchors with filtering and navigation
   - **Export** → choose JSON, Markdown, or PDF format from the dropdown menu
   - **Continue Chat** → carry the conversation into another platform
   - **Send to ThreadCub** → archive to threadcub.com and get a shareable link

---

## Export formats

### JSON
Structured data including:
- `title`, `url`, `platform`, `timestamp`
- `messages[]` with `role`, `content`, timestamps
- Smart filename generation (platform + date/time)

### Markdown
Clean, readable format perfect for:
- Documentation
- Sharing conversations
- Archiving discussions

### PDF
Professional export featuring:
- ThreadCub branding
- Formatted conversation layout
- Platform and metadata information
- Tagged sections highlighted

---

## What's New in v1.1.0

### Security & Encryption
- **AES-GCM migration** — Migrated from CryptoJS to native Web Crypto API. Payloads are now encrypted using AES-GCM; CryptoJS removed as a dependency entirely
- Encryption key generated on first install, stored in `chrome.storage.local`
- Guest saves skip encryption — no wasted round trip when unauthenticated
- Hardcoded fallback key removed; authenticated users always get a proper per-user key

### Manifest & Permissions tightened
- Removed `http://localhost:3000/*` from `host_permissions`
- Grok host permission tightened from `https://x.com/*` to `https://x.com/i/grok*`
- `web_accessible_resources` scoped from `<all_urls>` to the AI platform list

### Reliability
- **Offline queue** — failed saves stored in `chrome.storage.local` and retried on reconnect; capped at 10 items
- Badge indicator on floating button when pending failed saves exist
- Chrome notification fires on save failure
- Error logging throughout

### Analytics
- Extraction success tracked across all 7 platforms
- Extraction failure tracked per platform via `trackError`
- `sync_success` event added
- Fixed Grok analytics bug (calls were after a `return` and never fired)

### Platform extraction fixes
- **Grok** — replaced dead `aria-label="Grok"` selector with CSS class detection; removed ~250 lines of obsolete code
- **Perplexity** — consecutive assistant chunks merged into single messages
- **Claude.ai** — tool-use/thinking summary blocks stripped from extracted messages
- **Grok on x.com/i/grok** — fixed extension not loading on conversation URLs

### UX
- Floating save button shows a **spinner while saving**

### Bug fixes
- Fixed share URLs generating as `/undefined`
- Fixed guest-to-authenticated session upgrade — existing guest row now correctly claimed with `user_id` on login

---

## Previous Updates

### v1.1.1 — Onboarding, Popup Redesign & Bug Fixes

### Onboarding
- **First-run welcome modal** — shown automatically on first install with options to explore or dismiss
- **Feature tour** — 3 guided modals with animated GIFs showcasing key features in action (floating button, highlights, tagging)
- **Persistent opt-out** — dismissing the tour saves the preference; can be re-enabled manually from the popup at any time

### Popup redesign
- **Show/hide floating button** — toggle the ThreadCub button on/off directly from the popup without uninstalling
- **Conversation count** — signed-in users now see how many conversations are saved to their account
- **Consistent guest/signed-in views** — both states now follow the same layout and visual structure
- **Dynamic version label** — version number pulled live from the manifest and displayed in the popup
- **Improved auth state handling** — cleaner three-state UI (loading / signed in / signed out) with no layout flicker

### Platform extraction
- **Grok on x.com/i/grok** — overhauled extraction with multiple fallback strategies: `data-testid` selectors, CSS class patterns, scroll container traversal, and DOM walking for alternating user/assistant turns
- Grok extraction now explicitly handles differences between grok.com and x.com DOM structures

### Bug fixes
- **Guest-to-user upgrade now writes `user_email`** — previously only `user_id` was set when claiming a guest row on sign-in
- **`quick_summary` now generated on upgraded rows** — guest rows claimed after sign-in now correctly trigger summary generation; self-heals if summary is missing on subsequent saves
- **Undo toast auto-dismisses** — save confirmation toast now disappears after 8 seconds rather than persisting indefinitely (✕ button still available for immediate dismissal)

### Housekeeping
- Removed `background copy.js` and `floating-button copy.js` backup files
- Removed unused `fontawesome/` icon folder
- Onboarding GIF assets added to `web_accessible_resources` in manifest

---

### v1.0.8 — Guest Saving, Share Links & Reliability

- **Guest saving now fully works** — no login required to save a conversation to ThreadCub and get a real share URL
- Guest session ID generated and persisted in `chrome.storage.local`
- Fixed: timestamp-based fallback URLs (`/fallback/[timestamp]`) replaced with real `https://threadcub.com/api/share/[uuid]` links
- Fixed: stale auth tokens no longer block guest saves — on 401, the extension clears the token and retries as guest
- Fixed: guest users no longer trigger a wasted encrypted-payload round trip
- **Service worker retry** — `sendMessage` calls retry once after 500ms if the background worker has gone idle
- **Duplicate save prevention** — 60-second soft dedup check

---

### v1.0.7 — Authentication, Enhanced Saving & Download Improvements

- **User Authentication** — Log in to ThreadCub directly from the extension popup
- **Send to ThreadCub button** — 5th action button on the floating stack
- **Download format selection** — flyout menu with JSON and Markdown options
- Fixed Claude.ai title extraction ("Claude" → actual conversation name)
- Fixed tooltip overlapping flyout menu and button stack collapsing on hover

---

### v1.0.6 — Cross Platform Updates

- **Grok** (grok.com / x.com/i/grok) — full support added
- **DeepSeek** — full extraction, download, tagging, continuation
- **Gemini** — enhanced conversation detection
- **Microsoft Copilot** — tagging, anchoring, side panel, download, continue chat (highlights don't persist across chats)
- Fixed conversation isolation on DeepSeek
- Fixed Copilot "Continue Chat" routing

---

### v1.0.5 — Google Analytics Integration

- Added Google Analytics 4 tracking for usage insights
- Privacy-first: no conversation content or personal data tracked
- Anonymous client IDs only

---

### v1.0.4 — Side Panel & Export Enhancements

- Fixed tab switching in side panel
- Multi-format export (JSON, Markdown, PDF)
- Tags and anchors persist across sessions

---

## Docs

- `docs/PROJECT-AUDIT.md` — deep codebase audit
- `docs/development/QUICK-START.md` — install + troubleshooting notes
- `docs/development/GROK_DEEPSEEK_TESTING.md` — how to finish Grok/DeepSeek selectors

---

## Links

- **Chrome Web Store**: [ThreadCub](https://chromewebstore.google.com/detail/threadcub/hfipaiffgjplgnlocipafhcfjmofdeie)
- **Website**: [https://threadcub.com](https://threadcub.com)
- **Discord Community**: Join for support and updates

---

## License

MIT License.