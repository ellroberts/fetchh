'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedField {
  key: string
  label: string
  bodyHtml: string
  count?: number
}

interface ExtractionResult {
  videoId: string
  videoTitle: string
  channelName: string
  cardHtml: string
}

// ── Field config ──────────────────────────────────────────────────────────────

const FIELD_ORDER = [
  'ai-relevance',
  'tools-mentioned',
  'techniques-worth-trying',
  'decision-relevant-facts',
  'mental-models',
  'things-to-skip',
  'one-action-this-week',
  'worth-watching-in-full',
]

const RAW_TO_KEY: Record<string, string> = {
  'tools mentioned': 'tools-mentioned',
  'techniques worth trying': 'techniques-worth-trying',
  'decision-relevant facts': 'decision-relevant-facts',
  'decision relevant facts': 'decision-relevant-facts',
  'mental models / contrarian takes': 'mental-models',
  'mental models': 'mental-models',
  'things to skip': 'things-to-skip',
  'one action this week': 'one-action-this-week',
  'worth watching in full?': 'worth-watching-in-full',
  'worth watching in full': 'worth-watching-in-full',
}

const KEY_TO_DISPLAY: Record<string, string> = {
  'ai-relevance': 'AI relevance',
  'tools-mentioned': 'Tools mentioned',
  'techniques-worth-trying': 'Techniques worth trying',
  'decision-relevant-facts': 'Decision relevant facts',
  'mental-models': 'Mental models',
  'things-to-skip': 'Things to skip',
  'one-action-this-week': 'One action this week',
  'worth-watching-in-full': 'Worth watching in full?',
}

// Tabs shown in the top nav — in display order
const TABS: Array<{ key: string; label: string }> = [
  { key: 'techniques-worth-trying', label: 'Try this' },
  { key: 'decision-relevant-facts', label: 'Worth knowing' },
  { key: 'mental-models', label: 'See it differently' },
  { key: 'things-to-skip', label: "Don't bother" },
  { key: 'one-action-this-week', label: 'This week' },
]

// ── Parser ────────────────────────────────────────────────────────────────────

function parseCardHtml(cardHtml: string): ParsedField[] {
  const fields: ParsedField[] = []

  const aiIdx = cardHtml.indexOf('AI relevance:')
  if (aiIdx !== -1) {
    const pStart = cardHtml.lastIndexOf('<p', aiIdx)
    const pClose = cardHtml.indexOf('</p>', aiIdx)
    if (pStart !== -1 && pClose !== -1) {
      const text = cardHtml
        .slice(pStart, pClose + 4)
        .replace(/<[^>]+>/g, '')
        .replace(/^AI relevance:\s*/i, '')
        .trim()
      fields.push({ key: 'ai-relevance', label: 'AI relevance', bodyHtml: text })
    }
  }

  const labelRe = /<p style="margin:20px 0 4px;[^"]*">(.+?)<\/p>/g
  const hits: Array<{ rawLabel: string; start: number; contentStart: number }> = []
  let m: RegExpExecArray | null
  while ((m = labelRe.exec(cardHtml)) !== null) {
    hits.push({ rawLabel: m[1], start: m.index, contentStart: m.index + m[0].length })
  }

  for (let i = 0; i < hits.length; i++) {
    const { rawLabel, contentStart } = hits[i]
    const nextStart = hits[i + 1]?.start ?? cardHtml.length
    const bodyHtml = cardHtml.slice(contentStart, nextStart).trim()
    const cleanLabel = rawLabel
      .replace(/<[^>]+>/g, '')
      .replace(/^\d+\.\s*/, '')
      .trim()
      .toLowerCase()
    const key = RAW_TO_KEY[cleanLabel] ?? cleanLabel.replace(/[^a-z0-9]+/g, '-')
    const label = KEY_TO_DISPLAY[key] ?? cleanLabel
    const liCount = (bodyHtml.match(/<li/g) ?? []).length
    fields.push({ key, label, bodyHtml, count: liCount > 0 ? liCount : undefined })
  }

  return fields.sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(a.key)
    const bi = FIELD_ORDER.indexOf(b.key)
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  })
}

// ── Field → carousel cards ────────────────────────────────────────────────────

// Each "card" is one displayable item (one li, or the full body for non-list fields)
interface CarouselCard {
  title: string       // bold heading in the card
  body: string        // lead sentence (first part before any | separators)
  bullets?: string[]  // supporting details (parts after | separators)
  url?: string        // optional link extracted from body text
}

function fieldToCards(field: ParsedField): CarouselCard[] {
  const { key, bodyHtml } = field

  // Single-text fields
  if (key === 'ai-relevance' || key === 'one-action-this-week' || key === 'worth-watching-in-full') {
    const text = bodyHtml.replace(/<[^>]+>/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '').trim()
    // 'one-action-this-week' has no specific title — the tab label already provides context
    const title = key === 'one-action-this-week' ? '' : (KEY_TO_DISPLAY[key] ?? field.label)
    return text ? [{ title, body: text }] : []
  }

  // List fields — each <li> becomes its own card, capped at 5
  const liMatches = [...bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].slice(0, 5)
  if (liMatches.length > 0) {
    return liMatches.map((match) => {
      const content = match[1]

      // Primary: <strong>Title</strong>: body
      const boldMatch = content.match(/^<strong>([\s\S]*?)<\/strong>([\s\S]*)/)
      if (boldMatch) {
        const title = boldMatch[1].replace(/<[^>]+>/g, '').replace(/:\s*$/, '').trim()
        const rawBody = boldMatch[2].replace(/^\s*(?:[—–-]|:)\s*/, '').replace(/<[^>]+>/g, '').trim()
        const cleaned = rawBody.replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '')
        const parts = cleaned.split(' | ').map(s => s.trim()).filter(Boolean)
        const body = parts[0] ?? ''
        const bullets = parts.length > 1 ? parts.slice(1) : undefined
        return { title, body, bullets }
      }

      // Fallback: strip asterisks and detect any URLs before title extraction
      const rawText = content.replace(/<[^>]+>/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '').trim()
      const urlMatch = rawText.match(/https?:\/\/[^\s)]+/)
      const plainText = urlMatch ? rawText.replace(urlMatch[0], '').replace(/\s{2,}/g, ' ').trim() : rawText
      const url = urlMatch?.[0]

      // Fallback 1: "Title — body" em-dash pattern
      const dashMatch = plainText.match(/^(.+?)\s*[—–]\s*(.+)/s)
      if (dashMatch && dashMatch[1].length <= 80) {
        return { title: dashMatch[1].trim(), body: dashMatch[2].trim(), url }
      }

      // Fallback 2: "Title: body" colon pattern (no parens/dashes before colon)
      const colonMatch = plainText.match(/^([^:(—–\n]{3,50}):\s*(.+)/s)
      if (colonMatch) {
        return { title: colonMatch[1].trim(), body: colonMatch[2].trim(), url }
      }

      return { title: '', body: plainText, url }
    })
  }

  // Non-list, non-single-text fields (paragraphs)
  const paragraphs = bodyHtml
    .split('</p>')
    .map((s) => s.replace(/<[^>]+>/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '').trim())
    .filter(Boolean)
  if (paragraphs.length > 0) {
    const fullText = paragraphs.join('\n\n')
    // Try em-dash split for a more specific title than the generic field label
    const dashMatch = fullText.match(/^(.+?)\s*[—–]\s*(.+)/s)
    if (dashMatch && dashMatch[1].length <= 80) {
      return [{ title: dashMatch[1].trim(), body: dashMatch[2].trim() }]
    }
    return [{ title: field.label, body: fullText }]
  }

  return []
}

// ── Mock fixture ──────────────────────────────────────────────────────────────

const MOCK_META = {
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  youtubeUrl: 'https://www.youtube.com/watch?v=example',
  watchUrl: 'https://www.youtube.com/watch?v=example',
  videoTitle: '$10,000 in a Week — Inflatable Movie Theatre Business',
  channelName: 'The Koerner Office',
  relevantResources: [
    { name: 'Alibaba', url: 'https://alibaba.com' },
    { name: 'Amazon', url: 'https://amazon.com' },
  ],
}

function parseRelevantResources(cardHtml: string): Array<{ name: string; url: string }> {
  const match = cardHtml.match(/RELEVANT_RESOURCES:\s*(\[[\s\S]*?\])/)
  if (!match) return []
  try { return JSON.parse(match[1]) } catch { return [] }
}

function li(text: string) {
  return `<li>${text}</li>`
}

const MOCK_FIELDS: ParsedField[] = [
  {
    key: 'ai-relevance',
    label: 'AI relevance',
    bodyHtml: 'This is entirely about starting an inflatable movie theatre rental business with no mention of AI tools or workflows.',
  },
  { key: 'tools-mentioned', label: 'Tools mentioned', bodyHtml: '' },
  {
    key: 'techniques-worth-trying',
    label: 'Techniques worth trying',
    bodyHtml: [
      li('<strong>Start with a consumer screen, upgrade fast</strong>: Derek started with a $250–300 Amazon inflatable and quickly outgrew it | The $3,500 commercial 20-foot screen from Alibaba is the real product | Consumer grade won\'t hold up for repeat commercial use'),
      li('<strong>Full outdoor setup cost breakdown</strong>: Budget around $8,000–10,000 all-in for a professional rig | $1,100 projector + $3,000 for two JBL speakers + $3,500 for the 20-foot screen | Source the screen from Alibaba, not Amazon'),
      li('<strong>LED dance floor as upsell</strong>: $20,000 for a 24x24 foot setup | Charge $3,000 per rental — pays for itself after 7 bookings | Comes in 2-foot panels so you can configure 8x8, 16x6, or 24x24'),
    ].join(''),
    count: 3,
  },
  {
    key: 'decision-relevant-facts',
    label: 'Decision relevant facts',
    bodyHtml: [
      li('<strong>Top package pricing</strong>: $1,500. Indoor climate-controlled inflatable theater charges $1,700 per event.'),
      li('<strong>LED floor configuration</strong>: comes in 2-foot panels — configure 8x8, 16x6, or 24x24.'),
    ].join(''),
    count: 2,
  },
  {
    key: 'mental-models',
    label: 'Mental models',
    bodyHtml: li('<strong>Upsell by environment</strong>: outdoor → indoor → premium add-ons each justify higher pricing.'),
    count: 1,
  },
  {
    key: 'things-to-skip',
    label: 'Things to skip',
    bodyHtml: li("<strong>Consumer-grade screen</strong>: skip if you're serious — the $250 Amazon version won't hold up commercially."),
    count: 1,
  },
  {
    key: 'one-action-this-week',
    label: 'One action this week',
    bodyHtml: 'Price out the $3,500 Alibaba screen and compare against your local event rental market rate.',
  },
  {
    key: 'worth-watching-in-full',
    label: 'Worth watching in full?',
    bodyHtml: 'Yes — Derek provides specific numbers, equipment costs, pricing strategies, and evolution from accidental side hustle to $100k business across the full interview.',
  },
]

// ── Carousel ──────────────────────────────────────────────────────────────────

const CARD_WIDTH = 600
const CARD_RADIUS = 24
const CARD_PADDING = 32
// Horizontal space each slide occupies in the Embla flex track.
// Extra beyond CARD_WIDTH creates the gap between cards and allows peeking.
const SLIDE_PADDING_X = 16 // padding on each side of the card inside its slide slot — gap between cards = 2× this

function EmblaCarouselCard({ card }: { card: CarouselCard }) {
  const hasBullets = card.bullets && card.bullets.length > 0
  return (
    <div style={{
      padding: CARD_PADDING,
      minHeight: 400,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: hasBullets ? 'flex-start' : 'center',
      textAlign: hasBullets ? 'left' : 'center',
    }}>
      {card.title && (
        <p style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700, color: '#111111', lineHeight: 1.2, textAlign: hasBullets ? 'left' : 'center', width: '100%' }}>
          {card.title}
        </p>
      )}
      {card.body && (
        <p style={{ margin: hasBullets ? '0 0 16px' : '0', fontSize: 18, lineHeight: '28px', color: '#333333', whiteSpace: 'pre-wrap', textAlign: hasBullets ? 'left' : 'center' }}>
          {card.body}
        </p>
      )}
      {hasBullets && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {card.bullets!.map((bullet, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: '#6C74FB', fontSize: 18, lineHeight: '26px', flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 16, lineHeight: '26px', color: '#333333' }}>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
      {card.url && (
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 24,
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: 12,
            border: '1px solid #E5E5E5',
            background: '#FFFFFF',
            fontSize: 14,
            color: '#111111',
            textDecoration: 'none',
          }}
        >
          Open link →
        </a>
      )}
    </div>
  )
}

function Carousel({ cards }: { cards: CarouselCard[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    loop: false,
  })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    onSelect()
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  const canPrev = selectedIndex > 0
  const canNext = selectedIndex < cards.length - 1

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: CARD_WIDTH,
          background: '#FFFFFF',
          borderRadius: CARD_RADIUS,
          padding: CARD_PADDING,
          textAlign: 'center',
          color: '#999',
          fontSize: 16,
        }}>
          Nothing to show here
        </div>
      </div>
    )
  }

  const ARROW_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // Gradient mask: transparent at page edges → opaque where the active card begins.
  const halfCard = CARD_WIDTH / 2
  const maskGradient = `linear-gradient(to right, transparent 0px, black calc(50% - ${halfCard}px), black calc(50% + ${halfCard}px), transparent 100%)`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Mask wrapper — fades peek cards toward the page edges */}
        <div style={{
          maskImage: maskGradient,
          WebkitMaskImage: maskGradient,
        }}>
          {/* Embla viewport */}
          <div ref={emblaRef} style={{ overflow: 'hidden', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {cards.map((card, i) => {
                const isActive = i === selectedIndex
                return (
                  <div
                    key={i}
                    style={{
                      flex: `0 0 ${CARD_WIDTH + SLIDE_PADDING_X * 2}px`,
                      paddingLeft: SLIDE_PADDING_X,
                      paddingRight: SLIDE_PADDING_X,
                      display: 'flex',
                    }}
                  >
                    {/* Inner card — scale and fade when not active */}
                    <div
                      style={{
                        flex: 1,
                        background: '#FFFFFF',
                        borderRadius: CARD_RADIUS,
                        minHeight: 400,
                        transform: isActive ? 'scale(1)' : 'scale(0.8)',
                        opacity: isActive ? 1 : 0.5,
                        transition: 'transform 0.3s ease, opacity 0.3s ease',
                        cursor: isActive ? 'default' : 'pointer',
                        transformOrigin: 'center center',
                      }}
                      onClick={!isActive ? () => emblaApi?.scrollTo(i) : undefined}
                    >
                      <EmblaCarouselCard card={card} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Left arrow — 32px from the active card's left edge */}
        {canPrev && (
          <button
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous"
            style={{ ...ARROW_STYLE, left: `calc(50% - ${halfCard}px - 32px - 24px)` }}
          >
            <ArrowLeft size={24} color="#6C74FB" />
          </button>
        )}

        {/* Right arrow — 32px from the active card's right edge */}
        {canNext && (
          <button
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next"
            style={{ ...ARROW_STYLE, left: `calc(50% + ${halfCard}px + 32px)` }}
          >
            <ArrowRight size={24} color="#6C74FB" />
          </button>
        )}
      </div>

      {/* Pagination dots — below the carousel, hidden when only one card */}
      {cards.length > 1 && <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to card ${i + 1}`}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: i === selectedIndex ? '#08B9B9' : '#C9C9C7',
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE: React.CSSProperties = {
  background: '#F7F6F4',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '104px 16px 144px',
  overflowX: 'hidden',
}

const LOADING_STEPS = [
  'Deciding what\'s worth trying',
  'Choosing what\'s worth knowing',
  'Logging what to see differently',
  'Calling out what not to bother with',
  'Locking in something to start this week',
]

// Step thresholds — step N completes when progress passes these values
const STEP_THRESHOLDS = [18, 36, 54, 72, 92]

export default function TryPage() {
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS[0].key)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mock = new URLSearchParams(window.location.search).get('mock')
    if (mock === 'true') { setIsMock(true); setStatus('done') }
    if (mock === 'loading') { setStatus('loading') }
  }, [])

  // Animate progress bar while loading — increments every 500ms, caps at 95
  useEffect(() => {
    if (status !== 'loading') {
      setLoadingProgress(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return prev
        // Targets ~75s to reach 95% — slows significantly in later stages
        const increment = prev < 50 ? 0.9 : prev < 75 ? 0.5 : 0.2
        return Math.min(95, prev + increment)
      })
    }, 500)
    return () => clearInterval(interval)
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    setResult(null)

    try {
      const res = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.')
        setStatus('error')
        return
      }
      setResult(data)
      setStatus('done')
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  // ── Shared components ──────────────────────────────────────────────────────

  // Logo-only header — used on form and loading states
  const LogoHeader = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      background: '#FFF', borderBottom: '1px solid #E5E5E5', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img src="/digestt-logo.svg" alt="Digestt" style={{ height: 24 }} />
    </div>
  )

  // Full header — used on results page with video info
  const FixedHeader = ({ videoTitle, channelName, channelInitial }: { videoTitle?: string; channelName?: string; channelInitial?: string }) => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      background: '#FFF', borderBottom: '1px solid #E5E5E5', zIndex: 100,
      display: 'flex', alignItems: 'center', paddingLeft: 24, paddingRight: 24,
    }}>
      <img src="/digestt-logo.svg" alt="Digestt" style={{ height: 20, flexShrink: 0 }} />
      {videoTitle && (
        <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 16px' }}>
          {videoTitle}
        </span>
      )}
      {channelName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: '#D4D0C8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#555',
          }}>
            {channelInitial}
          </div>
          <span style={{ fontSize: 14, color: '#333' }}>{channelName}</span>
        </div>
      )}
    </div>
  )

  // Shared card shell used by form and loading states
  const FormCard = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E5E5',
      borderRadius: 12,
      padding: '40px 32px',
      width: '100%',
      maxWidth: 480,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      <img src="/coda_cheeky.svg" alt="" style={{ width: 64, height: 64, marginBottom: 24 }} />
      {children}
    </div>
  )

  // ── Loading state ──────────────────────────────────────────────────────────

  if (status === 'loading') {
    const currentStep = STEP_THRESHOLDS.findIndex((t) => loadingProgress < t)
    // currentStep === -1 means all steps done (progress >= last threshold)
    const activeStep = currentStep === -1 ? LOADING_STEPS.length : currentStep

    return (
      <>
        <LogoHeader />
        <main style={{ ...PAGE, justifyContent: 'center' }}>
          <FormCard>
            <h1 style={{ margin: '0 0 28px', fontSize: 28, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
              Digestt some content
            </h1>

            {/* Progress bar */}
            <div style={{ width: '100%', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>Progress</span>
                <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>{Math.round(loadingProgress)}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#EFEFEF', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${loadingProgress}%`,
                  background: '#6C74FB',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            {/* Current step */}
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111', textAlign: 'center' }}>
              {LOADING_STEPS[Math.min(activeStep, LOADING_STEPS.length - 1)]}
            </p>
          </FormCard>
        </main>
      </>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────

  if (status === 'done' && (result || isMock)) {
    const cleanedCardHtml = result?.cardHtml
      .replace(/<p[^>]*>\s*-{2,}\s*<\/p>/gi, '')
      .replace(/<p[^>]*>RELEVANT_RESOURCES:[^<]*<\/p>/gi, '') ?? ''
    const fields = isMock ? MOCK_FIELDS : parseCardHtml(cleanedCardHtml)
    const thumbnailUrl = isMock
      ? MOCK_META.thumbnailUrl
      : `https://img.youtube.com/vi/${result!.videoId}/maxresdefault.jpg`
    const youtubeUrl = isMock ? MOCK_META.youtubeUrl : `https://www.youtube.com/watch?v=${result!.videoId}`
    const watchUrl = isMock ? MOCK_META.watchUrl : `https://www.youtube.com/watch?v=${result!.videoId}`

    const videoTitle = isMock ? MOCK_META.videoTitle : result!.videoTitle
    const channelName = isMock ? MOCK_META.channelName : result!.channelName
    const channelInitial = channelName.charAt(0).toUpperCase()

    const fieldMap = new Map(fields.map((f) => [f.key, f]))
    const worthField = fieldMap.get('worth-watching-in-full')
    const worthText = worthField
      ? worthField.bodyHtml.replace(/<[^>]+>/g, '').trim()
      : ''

    // Only show tabs that have at least one card with real content
    const visibleTabs = TABS.filter((tab) => {
      const field = fieldMap.get(tab.key)
      if (!field) return false
      const cards = fieldToCards(field)
      if (cards.length === 0) return false
      // Hide tabs where the only card is a "nothing" placeholder
      if (cards.length === 1 && /^nothing (notable|flagged)/i.test(cards[0].body)) return false
      return true
    })

    // If the current activeTab isn't visible, default to the first visible tab
    const resolvedTab = visibleTabs.find(t => t.key === activeTab)?.key ?? visibleTabs[0]?.key ?? activeTab

    const activeField = fieldMap.get(resolvedTab)
    const rawCards = activeField ? fieldToCards(activeField) : []
    // For 'This week' cards that mention a download/description link, attach the video URL
    const activeCards = resolvedTab === 'one-action-this-week'
      ? rawCards.map(card => /download|description/i.test(card.body) ? { ...card, url: watchUrl } : card)
      : rawCards
    const relevantResources = isMock ? MOCK_META.relevantResources : parseRelevantResources(result!.cardHtml)

    return (
      <>
        <FixedHeader videoTitle={videoTitle} channelName={channelName} channelInitial={channelInitial} />
        <main style={PAGE}>
        {/* Thumbnail */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', width: 330, borderRadius: 16, overflow: 'hidden', flexShrink: 0, marginBottom: 32 }}
        >
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            style={{ display: 'block', width: '100%' }}
          />
        </a>

        {/* Carousel */}
        <div style={{ width: '100%', marginBottom: 0 }}>
          <Carousel key={resolvedTab} cards={activeCards} />
        </div>

        {/* Inspired? quick links */}
        {relevantResources.length > 0 && (
          <div style={{ width: CARD_WIDTH, marginTop: 48, textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 400, color: '#000' }}>
              Inspired? Here&apos;s some quick links
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {relevantResources.map((resource) => (
                <a
                  key={resource.name}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid #E5E5E5',
                    background: '#FFFFFF',
                    fontSize: 14,
                    color: '#111111',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {resource.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Worth watching module */}
        {worthText && (
          <div style={{
            width: CARD_WIDTH,
            background: 'rgba(255,255,255,0.8)',
            borderRadius: CARD_RADIUS,
            padding: CARD_PADDING,
            marginTop: 48,
          }}>
            <p style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700, color: '#111111' }}>
              Worth watching?
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 16, color: '#333333', lineHeight: 1.6 }}>
              {worthText}
            </p>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 16, color: '#3086FF', textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none' }}
            >
              Watch now →
            </a>
          </div>
        )}

      </main>

        {/* Fixed footer nav */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 56,
          background: '#FFF', borderTop: '1px solid #E5E5E5', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          {visibleTabs.map((tab) => {
            const isActive = tab.key === resolvedTab
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: isActive ? '#E2E2E2' : 'none',
                  border: 'none',
                  borderRadius: isActive ? 8 : 0,
                  padding: isActive ? '4px 8px' : '4px 8px',
                  fontSize: 16,
                  fontFamily: 'Avenir, "Avenir Next", sans-serif',
                  fontWeight: 500,
                  color: '#000',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </>
    )
  }

  // ── Form (idle / error) ────────────────────────────────────────────────────

  return (
    <>
      <LogoHeader />
      <main style={{ ...PAGE, justifyContent: 'center' }}>
        <FormCard>
          <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
            Digestt some content
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 20, color: '#555', lineHeight: 1.5 }}>
            Get the highlights. See if it&apos;s worth watching in full.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', textAlign: 'left' }}>
            <Input
              type="text"
              label="YouTube video"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl((e.target as HTMLInputElement).value)}
              required
            />
            {status === 'error' && (
              <p style={{ margin: 0, fontSize: 14, color: '#dc2626' }}>{errorMsg}</p>
            )}
            <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }}>
              Lets go
            </Button>
          </form>
        </FormCard>
      </main>
    </>
  )
}
