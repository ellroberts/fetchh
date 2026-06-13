# ThreadCub Extension — GA Tracking Reference

> **Purpose:** Full reference of all Google Analytics events added across the extension, including what each tracks, which file it lives in, and which files were intentionally omitted.
>
> **Comment convention:** All tracked events are marked with `// 📊 GA:` in the source file so you can find them quickly with a search.

---

## How Tracking Works

Events are sent from content scripts and feature files via:

```js
chrome.runtime.sendMessage({
  action: 'trackEvent',
  eventType: 'event_name',
  data: { key: 'value' }
});
```

These messages are received by `background.js`, which routes them through a `handleTrackEvent` switch statement to the `AnalyticsService` in `src/services/analytics.js`. Adding a new event type requires a matching `case` in that switch — this was updated as part of this work.

---

## Files With Tracking Added

---

### `src/core/floating-button.js`

The primary user interaction surface. Most important file for tracking.

| Event | Trigger | Data |
|---|---|---|
| `floating_button_clicked` | Save button clicked | `action: 'save'`, platform |
| `floating_button_clicked` | Download button clicked | `action: 'download'`, format |
| `floating_button_clicked` | Tag/pawmarks button clicked | `action: 'tag'` |
| `save_success` | Conversation saved successfully | platform, message count |
| `save_failed` | API returned an error on save | platform, error reason |
| `save_no_content` | Save clicked but no messages found | platform |
| `continue_success` | Continue flow completed | platform |
| `continue_failed` | Continue flow API error | platform, error |
| `continue_no_content` | Continue clicked but no messages found | platform |
| `continue_platform_routed` | Platform detected for routing | which platform |
| `sync_success` | *(pre-existing)* Sync completed | — |

---

### `background.js`

Receives all events from content scripts and routes them. Also has its own events for the conversation length prompt feature.

| Event | Trigger | Data |
|---|---|---|
| `length_prompt_shown` | *(pre-existing)* Length warning shown | — |
| `length_prompt_download_clicked` | *(pre-existing)* Download clicked from prompt | — |
| `length_prompt_continue_clicked` | *(pre-existing)* Continue clicked from prompt | — |
| `length_prompt_dismissed` | *(pre-existing)* Prompt dismissed | — |
| `save_success` | Switch case added to route new event | — |
| `save_failed` | Switch case added to route new event | — |
| `continue_success` | Switch case added to route new event | — |
| `continue_failed` | Switch case added to route new event | — |

> **Note:** `background.js` itself doesn't fire most of these — it needed new `case` entries added to the switch so the events fired from `floating-button.js` don't fall through to the `default` case and get lost.

---

### `popup.js`

Zero tracking before this work. Tracks all interactions within the extension popup.

| Event | Trigger | Data |
|---|---|---|
| `popup_opened` | Popup opened while authenticated | `state: 'authed'` |
| `popup_opened` | Popup opened while unauthenticated | `state: 'unauthed'` |
| `login_clicked` | Login button clicked | — |
| `logout_clicked` | Logout button clicked | — |
| `dashboard_opened` | Open Dashboard button clicked | — |
| `discord_clicked` | Discord link clicked (authed) | `state: 'authed'` |
| `discord_clicked` | Discord link clicked (unauthed) | `state: 'unauthed'` |
| `onboarding_triggered` | Show onboarding clicked | — |
| `floating_button_toggled` | Floating button visibility toggled | `visible: true/false` |

---

### `src/core/onboarding.js`

Zero tracking before this work. Tracks the onboarding flow and drop-off by step.

| Event | Trigger | Data |
|---|---|---|
| `onboarding_started` | Onboarding flow begins | — |
| `onboarding_step_viewed` | Each step is shown | `step: 0–3` |
| `onboarding_completed` | User reaches the final step | — |
| `onboarding_dismissed` | X button or skip at any step | `step: 0–3` (step they were on) |

> The `onboarding_step_viewed` event with `step` data lets you see exactly where users drop off in the flow.

---

### `tagging.js`

Zero tracking before this work. Tracks the pawmarks/tagging feature.

| Event | Trigger | Data |
|---|---|---|
| `tagging_panel_opened` | Tag panel opened | — |
| `tagging_panel_closed` | Panel closed | `reason: 'close_button' / 'click_outside' / 'escape_key'` |
| `tagging_tag_created` | New tag created | — |
| `tagging_tag_removed` | Tag deleted | — |

---

### `src/features/anchor-system.js`

Zero tracking before this work. Tracks the anchor/jump feature.

| Event | Trigger | Data |
|---|---|---|
| `anchor_created` | New anchor set | — |
| `anchor_jump_attempted` | User jumps to an anchor | `success: true/false` |

---

### `src/ui/side-panel.js`

Zero tracking before this work. Tracks all interactions within the side panel.

| Event | Trigger | Data |
|---|---|---|
| `side_panel_tab_switched` | Switched between Tags and Anchors tabs | `tab: 'tags' / 'anchors'` |
| `side_panel_priority_filter_changed` | Priority filter changed | `priority: 'high' / 'medium' / 'low'` |
| `side_panel_tag_copied` | Tag text copied | — |
| `side_panel_tag_jumped` | Jumped to tag location | `success: true/false` |
| `side_panel_anchor_jumped` | Jumped to anchor location | — |
| `side_panel_anchor_deleted` | Anchor deleted from side panel | — |

---

### `src/features/continuation-system.js`

Had one pre-existing event. Three new events added.

| Event | Trigger | Data |
|---|---|---|
| `continuation_started` | *(pre-existing)* Continuation data found and begins | platform |
| `continuation_executed` | Input field fill is about to run | `platform`, `flow_type: 'file_based' / 'grok_spa' / 'url_based'` |
| `continuation_auto_started` | Send button clicked automatically | platform, `is_grok: true/false` |
| `continuation_fill_failed` | Input field couldn't be filled after all retries | platform, `attempts_made` |

> `flow_type` in `continuation_executed` is particularly useful — it tells you which platforms users are continuing from/to.

---

### `src/features/copilot-onboarding.js`

Zero tracking before this work. Tracks the Copilot-specific limitations modal.

| Event | Trigger | Data |
|---|---|---|
| `copilot_onboarding_shown` | Modal shown for the first time | `platform: 'copilot'` |
| `copilot_onboarding_dismissed` | Modal closed via X button | `method: 'close_button'` |
| `copilot_onboarding_dismissed` | Modal closed via Got it | `method: 'got_it'` |
| `copilot_onboarding_dismissed` | Modal auto-closed by click outside | `method: 'click_outside'` |
| `copilot_onboarding_dismissed` | Modal auto-closed by keypress | `method: 'keydown_auto_close'` |

> The `method` field tells you whether users are actively dismissing or just ignoring the modal.

---

### `src/features/download-manager.js`

Had one pre-existing event, no changes needed.

| Event | Trigger | Data |
|---|---|---|
| `conversation_exported` | *(pre-existing)* JSON download completed | `format: 'json'`, platform, message count |

---

## Files Intentionally Omitted

These files were reviewed and confirmed as having no user-facing interactions worth tracking — they are all automated/system-level.

| File | Reason omitted |
|---|---|
| `src/features/platform-autostart.js` | Automated — fires send buttons programmatically, no user input |
| `src/features/conversation-length-detector.js` | Automated — detects message count, fires `length_prompt_shown` via `background.js` (already tracked) |
| `src/adapters/platform-adapters.js` | Configuration only — CSS selectors and DOM extraction logic, no interactions |
| `src/services/analytics.js` | The analytics service itself — tracking infrastructure, not a user surface |
| `src/services/api-service.js` | API communication utility — no user interactions |
| `src/services/auth-service.js` | Authentication utility — no user interactions |
| `src/services/storage-service.js` | Storage utility — no user interactions |
| `src/services/crypto-service.js` | Encryption utility — no user interactions |
| `src/utils/platform-detector.js` | Platform detection utility — no user interactions |
| `src/utils/utilities.js` | Helper functions — no user interactions |
| `src/utils/design-tokens.js` | Design tokens — no user interactions |
| `platformHandlers.js` | Platform configuration and DOM extraction — no user interactions |
| `content.js` | Entry point/documentation file only — no logic |
| `welcome.js` | Only fires `pagehide`/`beforeunload` to mark welcome as seen — not a meaningful user event |

---

## Quick Search Reference

To find all tracked events across the codebase, search for:

```
📊 GA:
```

Every tracked event has a comment in this format immediately above it:

```js
// 📊 GA: event_name — description of when it fires
chrome.runtime.sendMessage({ action: 'trackEvent', eventType: 'event_name', data: { ... } });
```

---

## Events Summary (All Events, Alphabetical)

| Event | File |
|---|---|
| `anchor_created` | `anchor-system.js` |
| `anchor_jump_attempted` | `anchor-system.js` |
| `continuation_auto_started` | `continuation-system.js` |
| `continuation_executed` | `continuation-system.js` |
| `continuation_fill_failed` | `continuation-system.js` |
| `continuation_started` | `continuation-system.js` |
| `continue_failed` | `floating-button.js` |
| `continue_no_content` | `floating-button.js` |
| `continue_platform_routed` | `floating-button.js` |
| `continue_success` | `floating-button.js` |
| `conversation_exported` | `download-manager.js` |
| `copilot_onboarding_dismissed` | `copilot-onboarding.js` |
| `copilot_onboarding_shown` | `copilot-onboarding.js` |
| `dashboard_opened` | `popup.js` |
| `discord_clicked` | `popup.js` |
| `floating_button_clicked` | `floating-button.js` |
| `floating_button_toggled` | `popup.js` |
| `length_prompt_dismissed` | `background.js` |
| `length_prompt_download_clicked` | `background.js` |
| `length_prompt_continue_clicked` | `background.js` |
| `length_prompt_shown` | `background.js` |
| `login_clicked` | `popup.js` |
| `logout_clicked` | `popup.js` |
| `onboarding_completed` | `onboarding.js` |
| `onboarding_dismissed` | `onboarding.js` |
| `onboarding_started` | `onboarding.js` |
| `onboarding_step_viewed` | `onboarding.js` |
| `onboarding_triggered` | `popup.js` |
| `popup_opened` | `popup.js` |
| `save_failed` | `floating-button.js` |
| `save_no_content` | `floating-button.js` |
| `save_success` | `floating-button.js` |
| `side_panel_anchor_deleted` | `side-panel.js` |
| `side_panel_anchor_jumped` | `side-panel.js` |
| `side_panel_priority_filter_changed` | `side-panel.js` |
| `side_panel_tab_switched` | `side-panel.js` |
| `side_panel_tag_copied` | `side-panel.js` |
| `side_panel_tag_jumped` | `side-panel.js` |
| `sync_success` | `floating-button.js` |
| `tagging_panel_closed` | `tagging.js` |
| `tagging_panel_opened` | `tagging.js` |
| `tagging_tag_created` | `tagging.js` |
| `tagging_tag_removed` | `tagging.js` |

---

*Last updated: Feb 2026 — v1.1.1 tracking implementation*
