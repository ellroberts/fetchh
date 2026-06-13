# Chrome Store Build Guide

## Before You Start

- Bump the version number in `manifest.json` and `package.json`
- Make sure all changes are committed and merged to `main`
- Create a new branch for the release: `release/vX.X.X`

---

## Creating the Zip

Run this command from the **root of `threadcub-extension/`**:

```bash
zip -r build/threadcub-extension-vX.X.X.zip \
  assets \
  background.js \
  content.js \
  icons \
  LICENSE \
  manifest.json \
  package.json \
  platformHandlers.js \
  popup \
  README.md \
  src \
  tagging.js \
  threadcub_popup_system.js \
  vendor \
  welcome.html \
  welcome.js
```

> ⚠️ Replace `vX.X.X` with the actual version number.  
> ⚠️ Always use the terminal command — **do not zip manually** via Finder. Manual zips include hidden macOS files (`.DS_Store`, `__MACOSX`) which bloat the file size significantly.

---

## What's Excluded (intentionally)

| File | Reason |
|------|--------|
| `build/` | Previous zips, not needed |
| `docs/` | Internal documentation |
| `package-lock.json` | Not needed for extension runtime |
| `removed-tokens.css` | Legacy/unused file |
| `test-simple.js` | Dev/test file only |

---

## After Zipping

1. Check the file size looks reasonable (previous builds ~8MB range)
2. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Submit for review

---

## Version History Reference

| Version | Notes |
|---------|-------|
| v1.1.1 | fontwaesome removed |
| v1.1.0 | — |
| v1.0.9 | — |
