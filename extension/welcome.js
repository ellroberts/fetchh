// welcome.js — external script for welcome.html
// Kept as an external file to comply with Chrome extension CSP (no inline scripts)

// ── Welcome seen tracking ────────────────────────────────────────────────────

function markWelcomeSeen() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ threadcub_welcome_seen: true });
    }
  } catch (e) {
    // Extension context may not be available — silently ignore
  }
}

// pagehide fires on tab close AND navigation, more reliable than beforeunload
window.addEventListener('pagehide', markWelcomeSeen);

// Fallback
window.addEventListener('beforeunload', markWelcomeSeen);

// ── Carousel ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('carouselTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (!track || !prevBtn || !nextBtn) return;

  function getScrollAmount() {
    // Scroll by one card width + gap
    const card = track.querySelector('.carousel-card');
    return card ? card.offsetWidth + 20 : 300;
  }

  function updateButtons() {
    prevBtn.disabled = track.scrollLeft <= 4;
    nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  }

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    setTimeout(updateButtons, 400);
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    setTimeout(updateButtons, 400);
  });

  track.addEventListener('scroll', updateButtons, { passive: true });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
  });

  updateButtons();
});