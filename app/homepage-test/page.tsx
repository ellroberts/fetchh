'use client'
import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/Button'

const PLATFORMS = [
  { src: 'https://cdn.brandfetch.io/idmJWF3N06/theme/dark/symbol.svg', label: 'Claude',      href: 'https://claude.ai' },
  { src: 'https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg', label: 'ChatGPT',     href: 'https://chat.openai.com' },
  { src: 'https://cdn.brandfetch.io/id5WCdHFci/theme/dark/symbol.svg', label: 'Gemini',      href: 'https://gemini.google.com' },
  { src: 'https://cdn.brandfetch.io/idDGOJGMOs/theme/dark/symbol.svg', label: 'Grok',        href: 'https://grok.x.com' },
  { src: 'https://cdn.brandfetch.io/idJDMDNkGR/theme/dark/symbol.svg', label: 'DeepSeek',    href: 'https://chat.deepseek.com' },
  { src: 'https://cdn.brandfetch.io/idCDax4FRm/theme/dark/symbol.svg', label: 'Perplexity',  href: 'https://www.perplexity.ai' },
]

const CAROUSEL_CARDS = [
  {
    color: '#3B6EEA', bg: 'icon-blue',
    title: 'Save your chats',
    desc: 'Stop losing answers in scrollback. Keep a copy of important conversations so your best thinking doesn\'t disappear.',
    icon: <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>,
  },
  {
    color: '#2E7D52', bg: 'icon-green',
    title: 'Resume with context',
    desc: 'Closed the tab? Started a new thread? Pick up exactly where you left off — without re-explaining everything.',
    icon: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.52"/></>,
  },
  {
    color: '#B07D00', bg: 'icon-amber',
    title: 'Highlight what matters',
    desc: 'Mark key decisions, turning points, and insights. Turn long chats into structured thinking you can actually use.',
    icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  },
  {
    color: '#7C3AED', bg: 'icon-purple',
    title: 'Find it fast',
    desc: 'Remember solving that already? Search and surface the exact moment you need — without rereading thousands of words.',
    icon: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  },
  {
    color: '#C0392B', bg: 'icon-coral',
    title: 'Organise your way',
    desc: 'Use tags, notes, and branches only if they help. Structure without complexity. Control without clutter.',
    icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  },
]

const FEATURE_ROWS = [
  { eyebrow: 'Capture',    title: 'Never lose a breakthrough again',       subtitle: 'Long chats hide valuable moments.',                         desc: 'With ThreadCub, you can highlight turning points, tag decisions, and branch from key moments — so your best thinking doesn\'t get buried. Instead of scrolling endlessly, you\'ll know exactly where progress happened.', reverse: false },
  { eyebrow: 'Continuity', title: 'Continue without friction',             subtitle: 'Closed the tab? Started a new session? Switched AI tools?', desc: 'AI conversations reset. Your work shouldn\'t. ThreadCub helps you carry context forward, so you can move from one chat to the next without re-explaining everything.',                                            reverse: true  },
  { eyebrow: 'Retrieval',  title: 'Find what you need, instantly',         subtitle: '',                                                          desc: 'Search across your saved chats and surface the exact answer — right when you need it. No rereading. No guessing. No repeating.',                                                                                   reverse: false },
  { eyebrow: 'Control',    title: 'Stay in control as your AI work grows', subtitle: '',                                                          desc: 'Clarity instead of clutter. Momentum instead of resets. Confidence instead of second-guessing. Because progress should compound — not disappear into scrollback.',                                           reverse: true  },
]

function CarouselCard({ card }: { card: typeof CAROUSEL_CARDS[0] }) {
  const [hovered, setHovered] = useState(false)
  const iconBg: Record<string,string> = {
    'icon-blue': '#E8F0FE', 'icon-green': '#E6F4EA',
    'icon-amber': '#FFF8E1', 'icon-purple': '#F3E8FD', 'icon-coral': '#FDE8E8',
  }
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 300px', background: 'white', borderRadius: 'var(--border-radius-2xl)',
        padding: 'var(--spacing-8)', scrollSnapAlign: 'start',
        position: 'relative', overflow: 'hidden', cursor: 'default',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 16px rgba(26,23,20,0.08)' : 'none',
      }}
    >
      {/* Starburst bg */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '224px', height: '224px',
        opacity: hovered ? 1 : 0, pointerEvents: 'none',
        transform: hovered ? 'rotate(0deg)' : 'rotate(15deg)',
        transformOrigin: 'top right',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        <svg viewBox="0 0 100 100" fill={card.color} style={{ position: 'absolute', top: '-50%', right: '-50%', width: '100%', height: '100%', opacity: 0.1 }}>
          <g transform="translate(50,50)">
            {[0,30,60,90,120,150,180,210,240,270,300,330].map(r => (
              <rect key={r} x="-3" y="-48" width="6" height="30" rx="2" transform={`rotate(${r})`}/>
            ))}
          </g>
        </svg>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: iconBg[card.bg],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 'var(--spacing-7)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px' }}>
            {card.icon}
          </svg>
        </div>
        <h3 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: 'var(--spacing-3)', lineHeight: '1.3' }}>
          {card.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-normal)', color: '#4E4D4C', lineHeight: '1.7' }}>
          {card.desc}
        </p>
      </div>

      {/* Arrow */}
      <div style={{
        position: 'absolute', bottom: '20px', right: '22px', zIndex: 2,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        color: 'var(--color-text-title)',
      }}>
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </div>
  )
}

export default function HomepageTest() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const scroll = (dir: 'prev' | 'next') => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: dir === 'next' ? 320 : -320, behavior: 'smooth' })
  }

  const checkScroll = () => {
    const track = trackRef.current
    if (!track) return
    setCanPrev(track.scrollLeft > 0)
    setCanNext(track.scrollLeft < track.scrollWidth - track.clientWidth - 1)
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.addEventListener('scroll', checkScroll)
    checkScroll()
    return () => track.removeEventListener('scroll', checkScroll)
  }, [])

  return (
    <>
      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        paddingTop: '120px', paddingBottom: 0,
        paddingLeft: 'var(--spacing-10)', paddingRight: 'var(--spacing-10)',
        textAlign: 'center',
        background: 'var(--color-warm-100)',
        margin: '40px', borderRadius: 'var(--border-radius-2xl)',
      }}>
        <Logo size="md" style={{ marginBottom: 'var(--spacing-10)' }} />
        <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-6)' }}>
          AI conversation management
        </p>
        <h1 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 'var(--font-weight-bold)', lineHeight: '1.05', letterSpacing: '-0.02em', color: 'var(--color-text-title)', maxWidth: '820px', marginBottom: 'var(--spacing-6)' }}>
          Stop losing track inside long AI chats.
        </h1>
        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-body)', maxWidth: '520px', lineHeight: '1.6', marginBottom: 'var(--spacing-11)' }}>
          AI writes fast. Chats grow long. Context resets. Here's how ThreadCub helps you stay in control.
        </p>
        <Button size="lg" style={{ marginBottom: 'var(--spacing-11)' }} onClick={() => { const el = document.getElementById('features'); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}>See how it works</Button>

        <div style={{ width: '100%', maxWidth: '1000px', background: 'var(--color-warm-200)', borderRadius: '16px 16px 0 0', aspectRatio: '16/9', boxShadow: '0 -2px 0 rgba(255,255,255,0.6) inset, 0 32px 80px rgba(26,23,20,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--spacing-3)', color: 'var(--color-text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.5 }}>Your UI mockup goes here</span>
        </div>
      </section>

      {/* ── RECOGNITION ── */}
      <section style={{ background: 'var(--color-surface-raised)', padding: '100px var(--spacing-10) 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(32px, 3.5vw, 50px)', fontWeight: 'var(--font-weight-bold)', lineHeight: '1.1', color: 'var(--color-text-title)', maxWidth: '700px', margin: '0 auto var(--spacing-4)', letterSpacing: '-0.02em' }}>
          One project. Five chats.<br />No continuity.
        </h2>
        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-body)', maxWidth: '560px', margin: '0 auto var(--spacing-14)', lineHeight: '1.6' }}>
          AI tools reset. Context gets scattered. ThreadCub keeps everything connected — so you can move forward without starting over.
        </p>

        {/* Recognition image placeholders */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-16)', flexWrap: 'wrap' }}>
          {[
            { w: '280px', h: '180px', rotate: '0deg' },
            { w: '240px', h: '160px', rotate: '-3deg' },
            { w: '200px', h: '140px', rotate: '5deg'  },
          ].map((p, i) => (
            <div key={i} style={{ width: p.w, height: p.h, borderRadius: 'var(--border-radius-xl)', background: 'var(--color-warm-200)', transform: `rotate(${p.rotate})` }} />
          ))}
        </div>

        {/* Platforms */}
        <p style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-7)' }}>
          Works with
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-10)', flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <a key={p.label} href={p.href} target="_blank" rel="noopener" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)', textDecoration: 'none', opacity: 0.65, transition: 'var(--transition-base)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.65'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <img src={p.src} alt={p.label} style={{ width: '40px', height: '40px' }} />
              <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-muted)', letterSpacing: '0.02em' }}>{p.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── FEATURES CAROUSEL ── */}
      <section id="features" style={{ background: 'var(--color-warm-200)', padding: '120px 0 60px' }}>
        <div style={{ textAlign: 'center', padding: '0 var(--spacing-10)', marginBottom: 'var(--spacing-14)' }}>
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(32px, 3.5vw, 50px)', fontWeight: 'var(--font-weight-bold)', lineHeight: '1.15', color: 'var(--color-text-title)', letterSpacing: '-0.02em', marginBottom: 'var(--spacing-5)' }}>
            Everything you need to stay<br />in control of your AI conversations
          </h2>
          <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-body)', lineHeight: '1.6', maxWidth: '560px', margin: '0 auto' }}>
            Long chats don't have to mean lost progress.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div ref={trackRef} style={{ display: 'flex', gap: 'var(--spacing-5)', padding: '8px var(--spacing-10) var(--spacing-6)', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
            {CAROUSEL_CARDS.map(card => <CarouselCard key={card.title} card={card} />)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-10)', padding: '0 var(--spacing-10)' }}>
          {(['prev', 'next'] as const).map(dir => (
            <button key={dir} onClick={() => scroll(dir)} disabled={dir === 'prev' ? !canPrev : !canNext}
              style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1.5px solid rgba(26,23,20,0.25)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'var(--transition-base)', color: 'var(--color-text-title)', opacity: (dir === 'prev' ? !canPrev : !canNext) ? 0.25 : 1 }}
              onMouseEnter={e => { if (!(dir === 'prev' ? !canPrev : !canNext)) { (e.currentTarget as HTMLElement).style.background = 'var(--color-text-title)'; (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-text-title)' }}}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-title)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,23,20,0.25)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                {dir === 'prev' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
              </svg>
            </button>
          ))}
        </div>
      </section>

      {/* ── DARK CTA ── */}
      <section style={{ background: '#141414', padding: '128px var(--spacing-10)', textAlign: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 'var(--font-weight-semibold)', lineHeight: '1.15', color: 'white', marginBottom: 'var(--spacing-5)', letterSpacing: '-0.02em' }}>
            AI is powerful.<br />But your chats aren't built for continuity.
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '80px', marginTop: 'var(--spacing-12)', flexWrap: 'wrap', marginBottom: '0' }}>
            {['Chats get longer', 'Context resets', 'Answers get buried'].map(label => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <div style={{ width: '140px', height: '80px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--border-radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-medium)', color: '#000', background: '#FFDE99', padding: '2px 8px', borderRadius: 'var(--border-radius-sm)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 'var(--font-weight-normal)', color: '#CB89FF', maxWidth: '640px', margin: 'var(--spacing-14) auto 0', lineHeight: '1.2' }}>
            ThreadCub adds a <strong style={{ fontWeight: 'var(--font-weight-semibold)', color: '#CB89FF' }}>memory layer to AI,</strong> so progress compounds instead of resets.
          </p>
        </div>
      </section>

      {/* ── FEATURE ROWS ── */}
      <div style={{ padding: '80px 0 20px', background: 'var(--color-surface-page)' }}>
        <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: '1.1', marginBottom: '80px', padding: '0 var(--spacing-10)' }}>
          Built for the way AI actually works
        </h2>

        {FEATURE_ROWS.map(f => (
          <section key={f.eyebrow} style={{ background: 'var(--color-warm-100)', margin: '0 40px 60px', borderRadius: 'var(--border-radius-2xl)', padding: '80px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', direction: f.reverse ? 'rtl' : 'ltr' }}>
            <div style={{ direction: 'ltr' }}>
              <span style={{ display: 'inline-block', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', background: '#FFA24D', padding: '4px 12px', borderRadius: '52px', marginBottom: 'var(--spacing-4)' }}>
                {f.eyebrow}
              </span>
              <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', lineHeight: '1.1', letterSpacing: '-0.02em', marginBottom: 'var(--spacing-4)' }}>
                {f.title}
              </h2>
              {f.subtitle && (
                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', lineHeight: '1.3', marginBottom: 'var(--spacing-3)' }}>
                  {f.subtitle}
                </p>
              )}
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-title)', lineHeight: '1.6', marginBottom: 'var(--spacing-8)' }}>
                {f.desc}
              </p>
              <Link href="/auth?mode=signup" style={{ display: 'inline-block', background: 'var(--color-text-title)', color: 'white', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', padding: '10px 24px', borderRadius: 'var(--border-radius-md)', textDecoration: 'none' }}>
                Get started
              </Link>
            </div>
            <div style={{ direction: 'ltr', background: 'var(--color-warm-300)', borderRadius: 'var(--border-radius-xl)', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', opacity: 0.35 }}>Screenshot</span>
            </div>
          </section>
        ))}
      </div>

      {/* ── PLATFORMS STRIPE ── */}
      <section style={{ background: 'var(--color-surface-raised)', padding: '80px var(--spacing-10)', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-5)' }}>Compatibility</p>
        <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)', marginBottom: 'var(--spacing-4)', letterSpacing: '-0.02em' }}>
          Plays well with all the big bears
        </h2>
        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-secondary)', maxWidth: '620px', margin: '0 auto var(--spacing-14)', lineHeight: '1.7' }}>
          Claude and Grok work seamlessly — capturing full context for a smooth handoff. ChatGPT, Gemini, DeepSeek and Perplexity are also supported, though not quite as seamlessly.
          <br /><br />
          <a href="https://substack.com/@threadcub" target="_blank" rel="noopener" style={{ color: 'var(--color-text-title)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>More details in our Substack article →</a>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <a key={p.label} href={p.href} target="_blank" rel="noopener" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)', textDecoration: 'none', transition: 'transform 0.2s ease', position: 'relative' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
            >
              <img src={p.src} alt={p.label} style={{ width: '48px', height: '48px' }} />
            </a>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--color-warm-200)', padding: '80px 60px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '260px 1fr 1fr 1fr', gap: '40px', paddingBottom: '60px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <Link href="/homepage-test" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', textDecoration: 'none' }}>
              <Logo size="sm" />
              <span style={{ fontFamily: 'var(--font-family-title)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)', letterSpacing: '-0.02em' }}>ThreadCub</span>
            </Link>
            <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              {[
                { href: 'https://x.com/threadcub', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { href: 'https://linkedin.com/company/threadcub', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noopener"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'var(--transition-base)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-text-title)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-title)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}><path d={s.path}/></svg>
                </a>
              ))}
            </div>
          </div>
          {[
            { heading: 'Product', links: [{ label: 'Blog / Substack', href: 'https://substack.com/@threadcub' }, { label: 'Chrome Extension', href: 'https://chrome.google.com/webstore' }] },
            { heading: 'Support', links: [{ label: 'Contact us', href: 'mailto:hello@threadcub.com' }, { label: 'How it works', href: 'https://substack.com/@threadcub' }] },
            { heading: 'Legal',   links: [{ label: 'Privacy policy', href: '/privacy' }, { label: 'Terms of use', href: '/terms' }] },
          ].map(col => (
            <div key={col.heading}>
              <h4 style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: 'var(--spacing-5)', letterSpacing: '-0.01em' }}>{col.heading}</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'var(--transition-base)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-title)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'}
                    >{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: 'var(--spacing-8)' }}>
          <p style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-muted)' }}>© 2026 ThreadCub. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
