'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  { key: 'techniques-worth-trying', label: 'Techniques' },
  { key: 'decision-relevant-facts', label: 'Facts' },
  { key: 'mental-models', label: 'Mental models' },
  { key: 'things-to-skip', label: 'Skip' },
  { key: 'one-action-this-week', label: 'Do this week' },
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
  title: string   // bold heading in the card
  body: string    // plain text content
}

function fieldToCards(field: ParsedField): CarouselCard[] {
  const { key, bodyHtml } = field

  // Single-text fields
  if (key === 'ai-relevance' || key === 'one-action-this-week' || key === 'worth-watching-in-full') {
    const text = bodyHtml.replace(/<[^>]+>/g, '').trim()
    const title = KEY_TO_DISPLAY[key] ?? field.label
    return text ? [{ title, body: text }] : []
  }

  // List fields — each <li> becomes its own card
  const liMatches = [...bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
  if (liMatches.length > 0) {
    return liMatches.map((match) => {
      const content = match[1]
      const boldMatch = content.match(/^<strong>([\s\S]*?)<\/strong>([\s\S]*)/)
      if (boldMatch) {
        const title = boldMatch[1].replace(/<[^>]+>/g, '').trim()
        const body = boldMatch[2].replace(/^\s*[—–-]\s*/, '').replace(/<[^>]+>/g, '').trim()
        return { title, body }
      }
      return { title: '', body: content.replace(/<[^>]+>/g, '').trim() }
    })
  }

  // Non-list, non-single-text fields (paragraphs)
  const paragraphs = bodyHtml
    .split('</p>')
    .map((s) => s.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
  if (paragraphs.length > 0) {
    return [{ title: field.label, body: paragraphs.join('\n\n') }]
  }

  return []
}

// ── Mock fixture ──────────────────────────────────────────────────────────────

const MOCK_META = {
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  youtubeUrl: 'https://www.youtube.com/watch?v=example',
  watchUrl: 'https://www.youtube.com/watch?v=example',
  videoTitle: '$10,000 in a Week — Inflatable Movie Theatre Business',
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
      li('Inflatable movie theater business model: Derek started with a $250–300 consumer inflatable screen from Amazon, evolved to a $3,500 commercial 20-foot screen from Alibaba.'),
      li('Equipment breakdown: $1,100 projector, $3,000 for two JBL speakers, $3,500 for 20-foot commercial screen, total outdoor setup around $8,000–10,000.'),
      li('LED dance floor expansion: $20,000 for 24x24 foot setup, charges $3,000 per rental, pays for itself after 6.67 rentals.'),
    ].join(''),
    count: 3,
  },
  {
    key: 'decision-relevant-facts',
    label: 'Decision relevant facts',
    bodyHtml: [
      li('Top package $1,500. Indoor climate-controlled inflatable theater charges $1,700 per event.'),
      li('LED floor comes in 2-foot panels — configure 8x8, 16x6, or 24x24.'),
    ].join(''),
    count: 2,
  },
  {
    key: 'mental-models',
    label: 'Mental models',
    bodyHtml: li('Upsell by environment: outdoor → indoor → premium add-ons each justify higher pricing.'),
    count: 1,
  },
  {
    key: 'things-to-skip',
    label: 'Things to skip',
    bodyHtml: li("Skip the consumer-grade screen if you're serious — the $250 Amazon version won't hold up commercially."),
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
const PEEK_SCALE = 0.8
const PEEK_OPACITY = 0.5
// Gap between active card edge and start of peeking card
const PEEK_GAP = 24

function CarouselCard({ card }: { card: CarouselCard }) {
  return (
    <div style={{ padding: CARD_PADDING }}>
      {card.title && (
        <p style={{ margin: '0 0 16px', fontSize: 32, fontWeight: 700, color: '#111111', lineHeight: 1.2 }}>
          {card.title}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 20, lineHeight: '32px', color: '#333333', whiteSpace: 'pre-wrap' }}>
        {card.body}
      </p>
    </div>
  )
}

function Carousel({
  cards,
  watchUrl,
}: {
  cards: CarouselCard[]
  watchUrl: string
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    setActiveIdx(0)
  }, [cards])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setContainerWidth(el.offsetWidth))
    obs.observe(el)
    setContainerWidth(el.offsetWidth)
    return () => obs.disconnect()
  }, [])

  const canPrev = activeIdx > 0
  const canNext = activeIdx < cards.length - 1

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

  // How far the peek card is offset from the active card edge
  const peekCardOffset = CARD_WIDTH + PEEK_GAP

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Carousel track — overflow visible so peek cards are visible */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          // Height driven by active card; peek cards are the same element size
          height: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'visible',
        }}
      >
        {/* Render prev peek, active, next peek */}
        {cards.map((card, i) => {
          const offset = i - activeIdx // -1=prev, 0=active, 1=next
          if (Math.abs(offset) > 1) return null

          const isActive = offset === 0
          const translateX = offset * peekCardOffset
          const scale = isActive ? 1 : PEEK_SCALE
          const opacity = isActive ? 1 : PEEK_OPACITY

          return (
            <div
              key={i}
              onClick={!isActive ? () => setActiveIdx(i) : undefined}
              style={{
                position: isActive ? 'relative' : 'absolute',
                top: 0,
                left: isActive ? undefined : '50%',
                width: CARD_WIDTH,
                background: '#FFFFFF',
                borderRadius: CARD_RADIUS,
                transform: isActive
                  ? undefined
                  : `translateX(calc(-50% + ${translateX}px)) scale(${scale})`,
                transformOrigin: offset < 0 ? 'right center' : 'left center',
                opacity,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
                cursor: isActive ? 'default' : 'pointer',
                flexShrink: 0,
                zIndex: isActive ? 2 : 1,
                // Clip peek cards at page edge
                overflow: 'hidden',
              }}
            >
              <CarouselCard card={card} />
            </div>
          )
        })}

        {/* Left arrow */}
        {canPrev && (
          <button
            onClick={() => setActiveIdx(activeIdx - 1)}
            aria-label="Previous"
            style={{
              position: 'absolute',
              left: `calc(50% - ${CARD_WIDTH / 2}px - 36px - 20px)`,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}
          >
            <ChevronLeft size={20} color="#111" />
          </button>
        )}

        {/* Right arrow */}
        {canNext && (
          <button
            onClick={() => setActiveIdx(activeIdx + 1)}
            aria-label="Next"
            style={{
              position: 'absolute',
              left: `calc(50% + ${CARD_WIDTH / 2}px - 36px + 20px)`,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}
          >
            <ChevronRight size={20} color="#111" />
          </button>
        )}
      </div>

      {/* Pagination dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 48 }}>
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            aria-label={`Go to card ${i + 1}`}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: i === activeIdx ? '#08B9B9' : '#5E5E5E',
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>
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
  padding: '48px 16px 80px',
}

export default function TryPage() {
  const [email, setEmail] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS[0].key)

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === 'true') {
      setIsMock(true)
      setStatus('done')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    setResult(null)

    try {
      const res = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, videoUrl }),
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

  // ── Loading ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <main style={{ ...PAGE, justifyContent: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, color: '#555' }}>Analysing video…</p>
      </main>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────

  if (status === 'done' && (result || isMock)) {
    const fields = isMock ? MOCK_FIELDS : parseCardHtml(result!.cardHtml)
    const thumbnailUrl = isMock
      ? MOCK_META.thumbnailUrl
      : `https://img.youtube.com/vi/${result!.videoId}/maxresdefault.jpg`
    const youtubeUrl = isMock ? MOCK_META.youtubeUrl : `https://www.youtube.com/watch?v=${result!.videoId}`
    const watchUrl = isMock ? MOCK_META.watchUrl : `https://www.youtube.com/watch?v=${result!.videoId}`

    const fieldMap = new Map(fields.map((f) => [f.key, f]))
    const worthField = fieldMap.get('worth-watching-in-full')
    const worthText = worthField
      ? worthField.bodyHtml.replace(/<[^>]+>/g, '').trim()
      : ''

    const activeField = fieldMap.get(activeTab)
    const activeCards = activeField ? fieldToCards(activeField) : []

    return (
      <main style={PAGE}>
        {/* Logo */}
        <p style={{ margin: '0 0 48px', fontSize: 24, fontWeight: 700, letterSpacing: '0.08em', color: '#111', fontFamily: 'inherit' }}>
          DIGESTT
        </p>

        {/* Thumbnail */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', marginBottom: 48, width: 330, borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}
        >
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            style={{ display: 'block', width: '100%' }}
          />
        </a>

        {/* Tab nav */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginBottom: 48,
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            paddingBottom: 0,
            width: '100%',
            maxWidth: 700,
            justifyContent: 'center',
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '4px solid #000000' : '4px solid transparent',
                  padding: '0 0 12px',
                  fontSize: 20,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#000000' : 'rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Carousel */}
        <div style={{ width: '100%', marginBottom: 0 }}>
          <Carousel key={activeTab} cards={activeCards} watchUrl={watchUrl} />
        </div>

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

        {/* Try another */}
        <div style={{ marginTop: 32 }}>
          <button
            onClick={() => { setStatus('idle'); setResult(null); setIsMock(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#999', textDecoration: 'underline', padding: 0 }}
          >
            Try another video
          </button>
        </div>
      </main>
    )
  }

  // ── Form (idle / error) ────────────────────────────────────────────────────

  return (
    <main style={{ ...PAGE, justifyContent: 'flex-start' }}>
      <p style={{ margin: '0 0 48px', fontSize: 24, fontWeight: 700, letterSpacing: '0.08em', color: '#111', fontFamily: 'inherit' }}>
        DIGESTT
      </p>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#111' }}>
          Try it on a video
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 16, color: '#555', lineHeight: 1.5 }}>
          Paste any YouTube video URL and get an instant extraction.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            type="email"
            label="Your email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            required
            autoComplete="email"
          />
          <Input
            type="text"
            label="YouTube video URL"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl((e.target as HTMLInputElement).value)}
            required
          />
          {status === 'error' && (
            <p style={{ margin: 0, fontSize: 14, color: '#dc2626' }}>{errorMsg}</p>
          )}
          <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }}>
            Get digest
          </Button>
        </form>
      </div>
    </main>
  )
}
