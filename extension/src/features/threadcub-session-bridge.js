// Runs on threadcub.com — bridges chrome.storage session ID into localStorage
// so the dashboard can detect guest conversations to claim
(function() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.get(['threadcubSessionId'], (result) => {
    if (chrome.runtime.lastError) return;
    if (result.threadcubSessionId) {
      localStorage.setItem('threadcub_session_id', result.threadcubSessionId);
    }
  });
})();