'use client'

import { useEffect, useRef } from 'react'
import styles from './page.module.css'

export default function ChromeExtensionWelcomePage() {
  const trackRef = useRef(null)
  const prevBtnRef = useRef(null)
  const nextBtnRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    const prevBtn = prevBtnRef.current
    const nextBtn = nextBtnRef.current

    if (!track || !prevBtn || !nextBtn) return

    function getScrollAmount() {
      const card = track.querySelector(`.${styles.carouselCard}`)
      return card ? card.offsetWidth + 20 : 300
    }

    function updateButtons() {
      prevBtn.disabled = track.scrollLeft <= 4
      nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    }

    function handlePrev() {
      track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' })
      setTimeout(updateButtons, 400)
    }

    function handleNext() {
      track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' })
      setTimeout(updateButtons, 400)
    }

    function handleKeyDown(e) {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    prevBtn.addEventListener('click', handlePrev)
    nextBtn.addEventListener('click', handleNext)
    track.addEventListener('scroll', updateButtons, { passive: true })
    document.addEventListener('keydown', handleKeyDown)

    updateButtons()

    return () => {
      prevBtn.removeEventListener('click', handlePrev)
      nextBtn.removeEventListener('click', handleNext)
      track.removeEventListener('scroll', updateButtons)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const starburstBlue = (
    <svg className={styles.cardBgCircle} viewBox="0 0 100 100" fill="#3B6EEA">
      <g transform="translate(50,50)">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <rect key={deg} x="-3" y="-48" width="6" height="30" rx="2" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  )

  const starburstGreen = (
    <svg className={styles.cardBgCircle} viewBox="0 0 100 100" fill="#2E7D52">
      <g transform="translate(50,50)">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <rect key={deg} x="-3" y="-48" width="6" height="30" rx="2" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  )

  const starburstAmber = (
    <svg className={styles.cardBgCircle} viewBox="0 0 100 100" fill="#B07D00">
      <g transform="translate(50,50)">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <rect key={deg} x="-3" y="-48" width="6" height="30" rx="2" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  )

  const starburstPurple = (
    <svg className={styles.cardBgCircle} viewBox="0 0 100 100" fill="#7C3AED">
      <g transform="translate(50,50)">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <rect key={deg} x="-3" y="-48" width="6" height="30" rx="2" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  )

  const starburstCoral = (
    <svg className={styles.cardBgCircle} viewBox="0 0 100 100" fill="#C0392B">
      <g transform="translate(50,50)">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <rect key={deg} x="-3" y="-48" width="6" height="30" rx="2" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  )

  const arrowRight = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )

  return (
    <div className={styles.page}>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className={styles.hero}>
        <img src="/icons/threadcub-logo.png" alt="ThreadCub" className={styles.heroLogo} />
        <p className={styles.heroEyebrow}>ThreadCub is installed ✦</p>
        <h1 className={styles.heroHeadline}>
          Stop losing track<br />inside <em>long AI chats.</em>
        </h1>
        <p className={styles.heroSubtext}>
          AI writes fast. Chats grow long. Context resets.
          Here&rsquo;s how ThreadCub helps you stay in control.
        </p>
        <div className={styles.heroCtaGroup}>
          <a href="#features" className={styles.heroCta}>See how it works</a>
          <a href="https://threadcub.com/auth" className={styles.heroSignIn}>
            Already have an account? Sign in to sync →
          </a>
        </div>
        <div className={styles.heroImageArea}>
          <div className={styles.heroImageWrapper}>
            {/* REPLACE with: <img src="assets/images/your-mockup.png" alt="ThreadCub UI"> */}
            <div className={styles.heroImagePlaceholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Your UI mockup goes here</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ RECOGNITION STRIP ═══════════════ */}
      <section className={styles.recognition}>
        <h2 className={styles.recognitionStatement}>
          One project. Five chats. All the good parts buried.
        </h2>
        <p className={styles.recognitionSub}>
          Insights get buried. Decisions get forgotten. Answers disappear into scrollback. ThreadCub catches them before they&rsquo;re gone.
        </p>

        <div className={styles.recognitionImages}>
          <div className={styles.recognitionImgPlaceholder}>
            {/* REPLACE with: <img src="assets/images/recognition-1.png" alt=""> */}
          </div>
          <div className={styles.recognitionImgPlaceholder}>
            {/* REPLACE with: <img src="assets/images/recognition-2.png" alt=""> */}
          </div>
          <div className={styles.recognitionImgPlaceholder}>
            {/* REPLACE with: <img src="assets/images/recognition-3.png" alt=""> */}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES CAROUSEL ═══════════════ */}
      <section id="features" className={styles.featuresCarouselSection}>
        <div className={styles.featuresCarouselHeader}>
          <h2 className={styles.featuresCarouselTitle}>
            Everything you need to stay<br />in control of your AI conversations
          </h2>
          <p className={styles.featuresCarouselSub}>Long chats don&rsquo;t have to mean lost progress.</p>
        </div>

        <div className={styles.carouselViewport}>
          <div className={styles.carouselTrack} ref={trackRef}>

            {/* Card 1 */}
            <div className={styles.carouselCard}>
              <div className={styles.cardBg}>
                {/* REPLACE with: <img src="assets/images/bg-save.png" alt=""> */}
                {starburstBlue}
              </div>
              <div className={styles.cardContent}>
                <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3B6EEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                </div>
                <h3 className={styles.cardTitle}>Save your chats</h3>
                <p className={styles.cardDesc}>Stop losing answers in scrollback. Keep a copy of important conversations so your best thinking doesn&rsquo;t disappear.</p>
              </div>
              <div className={styles.cardArrow}>{arrowRight}</div>
            </div>

            {/* Card 2 */}
            <div className={styles.carouselCard}>
              <div className={styles.cardBg}>
                {starburstPurple}
              </div>
              <div className={styles.cardContent}>
                <div className={`${styles.cardIcon} ${styles.iconPurple}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className={styles.cardTitle}>Ask your conversations</h3>
                <p className={styles.cardDesc}>Every saved chat syncs to your ThreadCub dashboard. Ask questions across all your conversations and surface what matters — without rereading everything.</p>
              </div>
              <div className={styles.cardArrow}>{arrowRight}</div>
            </div>

            {/* Card 3 */}
            <div className={styles.carouselCard}>
              <div className={styles.cardBg}>
                {starburstAmber}
              </div>
              <div className={styles.cardContent}>
                <div className={`${styles.cardIcon} ${styles.iconAmber}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#B07D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M12 5v10" />
                  </svg>
                </div>
                <h3 className={styles.cardTitle}>Download and keep</h3>
                <p className={styles.cardDesc}>Export any conversation as JSON or Markdown. Keep a local copy, drop it into a doc, or use it however you need.</p>
              </div>
              <div className={styles.cardArrow}>{arrowRight}</div>
            </div>

            {/* Card 4 */}
            <div className={styles.carouselCard}>
              <div className={styles.cardBg}>
                {starburstPurple}
              </div>
              <div className={styles.cardContent}>
                <div className={`${styles.cardIcon} ${styles.iconPurple}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className={styles.cardTitle}>Find it fast</h3>
                <p className={styles.cardDesc}>Remember solving that already? Search and surface the exact moment you need — without rereading thousands of words.</p>
              </div>
              <div className={styles.cardArrow}>{arrowRight}</div>
            </div>

            {/* Card 5 */}
            <div className={styles.carouselCard}>
              <div className={styles.cardBg}>
                {starburstCoral}
              </div>
              <div className={styles.cardContent}>
                <div className={`${styles.cardIcon} ${styles.iconCoral}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className={styles.cardTitle}>Ask questions across everything</h3>
                <p className={styles.cardDesc}>Once your chats are saved, ask natural language questions across all of them. ThreadCub finds the answer — even if it came from a conversation weeks ago.</p>
              </div>
              <div className={styles.cardArrow}>{arrowRight}</div>
            </div>

          </div>
        </div>

        <div className={styles.carouselControls}>
          <button className={styles.carouselBtn} ref={prevBtnRef} aria-label="Previous" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className={styles.carouselBtn} ref={nextBtnRef} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ═══════════════ DARK CTA BANNER ═══════════════ */}
      <section className={styles.darkCta}>
        <div className={styles.darkCtaContent}>
          <h2 className={styles.darkCtaTitle}>AI is powerful. But your best moments get buried.</h2>
          <div className={styles.darkCtaPillars}>
            <div className={styles.darkCtaPillar}>
              <img src="/assets/images/ai-philosophy-shapes1.svg" alt="" className={styles.darkCtaPillarIcon} />
              <h3 className={styles.darkCtaPillarLabel}>Chats get longer</h3>
            </div>
            <div className={styles.darkCtaPillar}>
              <img src="/assets/images/ai-philosophy-shapes2.svg" alt="" className={styles.darkCtaPillarIcon} />
              <h3 className={styles.darkCtaPillarLabel}>Context resets</h3>
            </div>
            <div className={styles.darkCtaPillar}>
              <img src="/assets/images/ai-philosophy-shapes3.svg" alt="" className={styles.darkCtaPillarIcon} />
              <h3 className={styles.darkCtaPillarLabel}>Answers get buried</h3>
            </div>
          </div>
          <p className={styles.darkCtaTagline}>
            ThreadCub adds a <strong>memory layer to AI,</strong> so progress compounds instead of resets.
          </p>
        </div>
      </section>

      {/* ═══════════════ OUTCOME PILLARS ═══════════════ */}
      <div className={styles.outcomePillarsWrapper}>
        <h2 className={styles.outcomePillarsTitle}>Built for the way AI actually works</h2>

        {/* Pillar 1: Capture */}
        <section className={styles.featureRowSection}>
          <div className={styles.featureRowText}>
            <span className={styles.featureRowEyebrow}>Capture</span>
            <h2 className={styles.featureRowTitle}>Never lose a breakthrough again</h2>
            <p className={styles.featureRowSubtitle}>Long chats hide valuable moments.</p>
            <p className={styles.featureRowDesc}>With ThreadCub, you can save any AI conversation with one click — so your best thinking doesn&rsquo;t get buried in scrollback.</p>
          </div>
          <div className={styles.featureRowImage}>
            {/* REPLACE with: <img src="assets/images/feature-capture.png" alt="Never lose a breakthrough again"> */}
            <span className={styles.featureRowImagePlaceholder}>Screenshot</span>
          </div>
        </section>

        {/* Pillar 2: Sync */}
        <section className={`${styles.featureRowSection} ${styles.reverse}`}>
          <div className={styles.featureRowText}>
            <span className={styles.featureRowEyebrow}>Sync</span>
            <h2 className={styles.featureRowTitle}>Your highlights, everywhere you need them</h2>
            <p className={styles.featureRowSubtitle}>Saved from the extension. Available everywhere.</p>
            <p className={styles.featureRowDesc}>Every conversation you save syncs to your ThreadCub dashboard. Search across all your platforms, surface what you need, and ask AI to go deeper — without rereading thousands of words.</p>
          </div>
          <div className={styles.featureRowImage}>
            {/* REPLACE with: <img src="assets/images/feature-sync.png" alt="Your highlights, everywhere you need them"> */}
            <span className={styles.featureRowImagePlaceholder}>Screenshot</span>
          </div>
        </section>

        {/* Pillar 3: Retrieval */}
        <section className={styles.featureRowSection}>
          <div className={styles.featureRowText}>
            <span className={styles.featureRowEyebrow}>Retrieval</span>
            <h2 className={styles.featureRowTitle}>Find what you need, instantly</h2>
            <p className={styles.featureRowDesc}>Search across your saved chats and surface the exact answer — right when you need it. No rereading. No guessing. No repeating.</p>
          </div>
          <div className={styles.featureRowImage}>
            {/* REPLACE with: <img src="assets/images/feature-retrieval.png" alt="Find what you need, instantly"> */}
            <span className={styles.featureRowImagePlaceholder}>Screenshot</span>
          </div>
        </section>

        {/* Pillar 4: Control */}
        <section className={`${styles.featureRowSection} ${styles.reverse}`}>
          <div className={styles.featureRowText}>
            <span className={styles.featureRowEyebrow}>Control</span>
            <h2 className={styles.featureRowTitle}>Stay in control as your AI work grows</h2>
            <p className={styles.featureRowDesc}>Clarity instead of clutter. Momentum instead of resets. Confidence instead of second-guessing. Because progress should compound — not disappear into scrollback.</p>
          </div>
          <div className={styles.featureRowImage}>
            {/* REPLACE with: <img src="assets/images/feature-control.png" alt="Stay in control as your AI work grows"> */}
            <span className={styles.featureRowImagePlaceholder}>Screenshot</span>
          </div>
        </section>
      </div>

      {/* ═══════════════ PLATFORMS STRIPE ═══════════════ */}
      <section className={styles.platformsStripe}>
        <p className={styles.platformsStripeEyebrow}>Compatibility</p>
        <h2 className={styles.platformsStripeTitle}>Plays well with all the big bears</h2>
        <p className={styles.platformsStripeDesc}>
          Works across all six platforms. Save any conversation to your ThreadCub dashboard with one click, wherever the chat happened.
        </p>
        <div className={styles.platformsStripeIcons}>
          <a href="https://claude.ai" target="_blank" rel="noopener" className={styles.platformsStripeItem} data-label="Claude">
            <img src="/assets/images/claude-ai-icon.svg" alt="Claude AI" />
          </a>
          <a href="https://grok.x.com" target="_blank" rel="noopener" className={styles.platformsStripeItem} data-label="Grok">
            <img src="/assets/images/grok-icon.svg" alt="Grok" />
          </a>
          <a href="https://chat.openai.com" target="_blank" rel="noopener" className={styles.platformsStripeItem} data-label="ChatGPT">
            <img src="/assets/images/chatgpt-icon.svg" alt="ChatGPT" />
          </a>
          <a href="https://gemini.google.com" target="_blank" rel="noopener" className={styles.platformsStripeItem} data-label="Gemini">
            <img src="/assets/images/gemini-icon.svg" alt="Gemini" />
          </a>
          <a href="https://chat.deepseek.com" target="_blank" rel="noopener" className={styles.platformsStripeItem} data-label="DeepSeek">
            <img src="/assets/images/deepseek-icon.svg" alt="DeepSeek" />
          </a>
          <a href="https://www.perplexity.ai" target="_blank" rel="noopener" className={styles.platformsStripeItem} data-label="Perplexity">
            <img src="/assets/images/perplexity-icon.svg" alt="Perplexity" />
          </a>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className={styles.siteFooter}>
        <div className={styles.footerInner}>

          {/* Brand + socials */}
          <div className={styles.footerBrand}>
            <a href="#" className={styles.footerLogo}>
              <img src="/icons/threadcub-logo.png" alt="ThreadCub" />
              <span className={styles.footerLogoText}>ThreadCub</span>
            </a>
            <div className={styles.footerSocials}>
              <a href="https://x.com/threadcub" target="_blank" rel="noopener" className={styles.footerSocialLink} title="X (Twitter)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://linkedin.com/company/threadcub" target="_blank" rel="noopener" className={styles.footerSocialLink} title="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column: Product */}
          <div className={styles.footerCol}>
            <h4>Product</h4>
            <ul>
              <li><a href="https://substack.com/@threadcub" target="_blank" rel="noopener">Blog / Substack</a></li>
              <li><a href="https://chrome.google.com/webstore" target="_blank" rel="noopener">Chrome Web Store</a></li>
            </ul>
          </div>

          {/* Column: Support */}
          <div className={styles.footerCol}>
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:hello@threadcub.com">Contact us</a></li>
              <li><a href="https://substack.com/@threadcub" target="_blank" rel="noopener">How it works</a></li>
            </ul>
          </div>

          {/* Column: Legal */}
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <ul>
              <li><a href="/privacy">Privacy policy</a></li>
              <li><a href="/terms">Terms of use</a></li>
            </ul>
          </div>

        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerCopyright}>© 2026 ThreadCub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
