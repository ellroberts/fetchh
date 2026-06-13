# ThreadCub Release Checklist

## Pre-Release (Before raising PR to main)

### Code
- [ ] All features tested locally
- [ ] Extension reloaded at `chrome://extensions/` and smoke tested
- [ ] No console errors on supported platforms (Claude.ai, ChatGPT, Gemini, Copilot)
- [ ] Auth flow tested (login, logout, popup state)
- [ ] Floating button tested (all 5 actions work)
- [ ] Download flyout tested (JSON and MD)

### Version & Docs
- [ ] Bump version in `manifest.json`
- [ ] Update `README.md` to reflect new features, changed UI or screenshots
- [ ] Write GitHub Release notes (features, bug fixes, known issues)
- [ ] Commit all three together: `chore: release vX.X.X`

### Git
- [ ] All changes committed and pushed to release branch
- [ ] PR raised to `main` on GitHub
- [ ] PR reviewed and merged
- [ ] Locally: `git checkout main` and `git pull origin main`
- [ ] Old release branch deleted (optional): `git branch -d branch-name`

---

## Chrome Web Store

- [ ] Create zip (from root of project):
  ```bash
  zip -r threadcub-X.X.X.zip . --exclude "*.git*" --exclude "node_modules/*" --exclude "*.DS_Store" --exclude "docs/*" --exclude "build/*"
  ```
- [ ] Log in to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [ ] Upload new zip to existing listing
- [ ] Update store description if new features added
- [ ] Update store screenshots if UI changed
- [ ] Submit for review

---

## GitHub Release

- [ ] Go to Releases on GitHub
- [ ] Publish the draft release (or create new)
- [ ] Tag matches manifest version (e.g. `v1.0.7`)
- [ ] Release notes are complete and accurate

---

## Post-Release

- [ ] Verify Chrome Store submission status (usually 1-3 days for review)
- [ ] Test the published extension once live
- [ ] Update any public docs or Substack post if needed