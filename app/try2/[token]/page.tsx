'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Copy, Check, Frown, Meh, Smile, Laugh } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface CarouselCard {
  title: string
  body: string
  bullets?: string[]
  url?: string
}

// ── Field config ───────────────────────────────────────────────────────────────

const FIELD_ORDER = [
  'ai-relevance', 'tools-mentioned', 'techniques-worth-trying',
  'decision-relevant-facts', 'mental-models', 'things-to-skip',
  'one-action-this-week', 'worth-watching-in-full',
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

const TABS = [
  { key: 'techniques-worth-trying', label: 'Try this' },
  { key: 'decision-relevant-facts', label: 'Worth knowing' },
  { key: 'mental-models', label: 'New angle' },
  { key: 'things-to-skip', label: "Don't bother" },
  { key: 'one-action-this-week', label: 'Next steps' },
]

const LOADING_STEPS = [
  "Watching the whole thing so you don't have to...",
  "Sifting out what's actually worth knowing...",
  "Finding the idea worth stealing this week...",
  "Calling out what to skip (you're welcome)...",
  "Almost done — pulling it all together...",
]
const STEP_THRESHOLDS = [18, 36, 54, 72, 92]

const FONT = 'var(--font-karla), sans-serif'

// ── Parser ─────────────────────────────────────────────────────────────────────

function parseCardHtml(cardHtml: string): ParsedField[] {
  const fields: ParsedField[] = []
  const aiIdx = cardHtml.indexOf('AI relevance:')
  if (aiIdx !== -1) {
    const pStart = cardHtml.lastIndexOf('<p', aiIdx)
    const pClose = cardHtml.indexOf('</p>', aiIdx)
    if (pStart !== -1 && pClose !== -1) {
      const text = cardHtml.slice(pStart, pClose + 4).replace(/<[^>]+>/g, '').replace(/^AI relevance:\s*/i, '').trim()
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
    const cleanLabel = rawLabel.replace(/<[^>]+>/g, '').replace(/^\d+\.\s*/, '').trim().toLowerCase()
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

function normalizeDisplayText(text: string) {
  return text.replace(/\s*—\s*/g, ', ').replace(/\s{2,}/g, ' ').trim()
}

function fieldToCards(field: ParsedField): CarouselCard[] {
  const { key, bodyHtml } = field
  if (key === 'ai-relevance' || key === 'one-action-this-week' || key === 'worth-watching-in-full') {
    const text = normalizeDisplayText(bodyHtml.replace(/<[^>]+>/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '').trim())
    const title = key === 'one-action-this-week' ? 'Your next step' : (KEY_TO_DISPLAY[key] ?? field.label)
    return text ? [{ title, body: text }] : []
  }
  const liMatches = [...bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].slice(0, 5)
  if (liMatches.length > 0) {
    return liMatches.map((match) => {
      const content = match[1]
      const boldMatch = content.match(/^<strong>([\s\S]*?)<\/strong>([\s\S]*)/)
      if (boldMatch) {
        const title = boldMatch[1].replace(/<[^>]+>/g, '').replace(/:\s*$/, '').trim()
        const rawBody = boldMatch[2].replace(/^\s*(?:[—–-]|:)\s*/, '').replace(/<[^>]+>/g, '').trim()
        const cleaned = rawBody.replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '')
        const parts = cleaned.split(' | ').map(s => normalizeDisplayText(s.trim())).filter(Boolean)
        const body = parts[0] ?? ''
        const bullets = parts.length > 1 ? parts.slice(1) : undefined
        return { title: normalizeDisplayText(title), body, bullets }
      }
      const rawText = content.replace(/<[^>]+>/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '').trim()
      const urlMatch = rawText.match(/https?:\/\/[^\s)]+/)
      const plainText = urlMatch ? rawText.replace(urlMatch[0], '').replace(/\s{2,}/g, ' ').trim() : rawText
      const url = urlMatch?.[0]
      const dashMatch = plainText.match(/^(.+?)\s*[—–]\s*(.+)/s)
      if (dashMatch && dashMatch[1].length <= 80) return { title: normalizeDisplayText(dashMatch[1].trim()), body: normalizeDisplayText(dashMatch[2].trim()), url }
      const colonMatch = plainText.match(/^([^:(—–\n]{3,50}):\s*(.+)/s)
      if (colonMatch) return { title: normalizeDisplayText(colonMatch[1].trim()), body: normalizeDisplayText(colonMatch[2].trim()), url }
      return { title: '', body: normalizeDisplayText(plainText), url }
    })
  }
  const paragraphs = bodyHtml.split('</p>').map(s => s.replace(/<[^>]+>/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/\*/g, '').trim()).filter(Boolean)
  if (paragraphs.length > 0) {
    const fullText = paragraphs.join('\n\n')
    const dashMatch = fullText.match(/^(.+?)\s*[—–]\s*(.+)/s)
    if (dashMatch && dashMatch[1].length <= 80) return [{ title: normalizeDisplayText(dashMatch[1].trim()), body: normalizeDisplayText(dashMatch[2].trim()) }]
    return [{ title: field.label, body: normalizeDisplayText(fullText) }]
  }
  return []
}

// ── Mock data ──────────────────────────────────────────────────────────────────

function li(text: string) { return `<li>${text}</li>` }

const MOCK_META = {
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  youtubeUrl: 'https://www.youtube.com/watch?v=example',
  videoTitle: '$10,000 in a Week — Inflatable Movie Theatre Business',
  channelName: 'The Koerner Office',
}

const MOCK_FIELDS: ParsedField[] = [
  { key: 'ai-relevance', label: 'AI relevance', bodyHtml: 'This is entirely about starting an inflatable movie theatre rental business with no mention of AI tools or workflows.' },
  { key: 'tools-mentioned', label: 'Tools mentioned', bodyHtml: '' },
  {
    key: 'techniques-worth-trying', label: 'Techniques worth trying',
    bodyHtml: [
      li('<strong>Start with a consumer screen, upgrade fast</strong>: Derek started with a $250–300 Amazon inflatable and quickly outgrew it | The $3,500 commercial 20-foot screen from Alibaba is the real product | Consumer grade won\'t hold up for repeat commercial use'),
      li('<strong>Full outdoor setup cost breakdown</strong>: Budget around $8,000–10,000 all-in for a professional rig | $1,100 projector + $3,000 for two JBL speakers + $3,500 for the 20-foot screen | Source the screen from Alibaba, not Amazon'),
      li('<strong>LED dance floor as upsell</strong>: $20,000 for a 24x24 foot setup | Charge $3,000 per rental — pays for itself after 7 bookings | Comes in 2-foot panels so you can configure 8x8, 16x6, or 24x24'),
    ].join(''), count: 3,
  },
  {
    key: 'decision-relevant-facts', label: 'Decision relevant facts',
    bodyHtml: [
      li('<strong>Top package pricing</strong>: $1,500. Indoor climate-controlled inflatable theater charges $1,700 per event.'),
      li('<strong>LED floor configuration</strong>: comes in 2-foot panels — configure 8x8, 16x6, or 24x24.'),
    ].join(''), count: 2,
  },
  { key: 'mental-models', label: 'Mental models', bodyHtml: li('<strong>Upsell by environment</strong>: outdoor → indoor → premium add-ons each justify higher pricing.'), count: 1 },
  { key: 'things-to-skip', label: 'Things to skip', bodyHtml: li("<strong>Consumer-grade screen</strong>: skip if you're serious — the $250 Amazon version won't hold up commercially."), count: 1 },
  { key: 'one-action-this-week', label: 'One action this week', bodyHtml: 'Price out the $3,500 Alibaba screen and compare against your local event rental market rate.' },
  { key: 'worth-watching-in-full', label: 'Worth watching in full?', bodyHtml: 'Yes — Derek provides specific numbers, equipment costs, pricing strategies, and evolution from accidental side hustle to $100k business.' },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Try2TokenPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const niche = searchParams.get('niche') ?? 'builders'
  const videoUrlParam = searchParams.get('videoUrl') ?? ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'limit_reached'>('idle')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS[0].key)
  const [cardIndex, setCardIndex] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [hoveringPrompt, setHoveringPrompt] = useState(false)
  const [hoveringCopyBtn, setHoveringCopyBtn] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, boolean>>({})
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const hasAutostartedRef = useRef(false)

  // Mock mode
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mock = new URLSearchParams(window.location.search).get('mock')
    if (mock === 'true') { setIsMock(true); setStatus('done') }
    if (mock === 'loading') { setStatus('loading') }
  }, [])

  // Autostart from URL param
  useEffect(() => {
    if (!videoUrlParam || status !== 'idle' || hasAutostartedRef.current) return
    hasAutostartedRef.current = true
    setStatus('loading')
    fetch('/api/try', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: videoUrlParam, token }),
    }).then(r => r.json()).then(data => {
      if (data.error === 'limit_reached') { setStatus('limit_reached'); return }
      if (data.error) { setStatus('error'); return }
      setResult(data)
      setStatus('done')
    }).catch(() => setStatus('error'))
  }, [videoUrlParam, status, token])

  // Loading progress animation
  useEffect(() => {
    if (status !== 'loading') { setLoadingProgress(0); return }
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) return prev
        return Math.min(95, prev + (prev < 50 ? 0.9 : prev < 75 ? 0.5 : 0.2))
      })
    }, 500)
    return () => clearInterval(interval)
  }, [status])

  // Reset card index, rating and comment on tab change
  useEffect(() => {
    setCardIndex(0)
    setFeedbackRating(null)
    setFeedbackComment('')
  }, [activeTab])

  const LogoHeader = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      background: '#FFF', boxShadow: '0px 2px 1px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <img src="/digestt-logo.svg" alt="Digestt" style={{ height: 24 }} />
    </div>
  )

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    const currentStep = STEP_THRESHOLDS.findIndex(t => loadingProgress < t)
    const activeStep = currentStep === -1 ? LOADING_STEPS.length : currentStep
    return (
      <>
        <LogoHeader />
        <main style={{ background: '#ffd19d', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 56 }}>
          <img src="/fetchh-loading.svg" alt="" style={{ width: 180, height: 180, marginBottom: 32 }} />
          <p style={{ margin: '0 0 40px', fontSize: 32, fontWeight: 700, fontStyle: 'italic', fontFamily: FONT, color: '#000', textAlign: 'center', maxWidth: 464, padding: '0 16px' }}>
            {LOADING_STEPS[Math.min(activeStep, LOADING_STEPS.length - 1)]}
          </p>
          {/* Progress bar */}
          <div style={{ width: 280, height: 6, background: 'rgba(0,0,0,0.12)', borderRadius: 999 }}>
            <div style={{ height: '100%', borderRadius: 999, background: '#000', width: `${loadingProgress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </main>
      </>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────────

  if (status === 'done' && (result || isMock)) {
    const cleanedCardHtml = result?.cardHtml
      .replace(/<p[^>]*>\s*-{2,}\s*<\/p>/gi, '')
      .replace(/<p[^>]*>RELEVANT_RESOURCES:[^<]*<\/p>/gi, '') ?? ''
    const fields = isMock ? MOCK_FIELDS : parseCardHtml(cleanedCardHtml)
    const thumbnailUrl = isMock ? MOCK_META.thumbnailUrl : `https://img.youtube.com/vi/${result!.videoId}/maxresdefault.jpg`
    const watchUrl = isMock ? MOCK_META.youtubeUrl : `https://www.youtube.com/watch?v=${result!.videoId}`
    const videoTitle = normalizeDisplayText(isMock ? MOCK_META.videoTitle : result!.videoTitle)
    const channelName = isMock ? MOCK_META.channelName : result!.channelName
    const channelInitial = channelName.charAt(0).toUpperCase()

    const fieldMap = new Map(fields.map(f => [f.key, f]))
    const visibleTabs = TABS.filter(tab => {
      const field = fieldMap.get(tab.key)
      if (!field) return false
      const cards = fieldToCards(field)
      return cards.length > 0 && !(cards.length === 1 && /^nothing (notable|flagged)/i.test(cards[0].body))
    })

    const resolvedTab = visibleTabs.find(t => t.key === activeTab)?.key ?? visibleTabs[0]?.key ?? activeTab
    const activeField = fieldMap.get(resolvedTab)
    const cards = activeField ? fieldToCards(activeField) : []
    const safeIndex = Math.min(cardIndex, Math.max(0, cards.length - 1))
    const currentCard = cards[safeIndex] ?? cards[cards.length - 1]

    // AI prompt view for "Next steps" tab
    const isNextSteps = resolvedTab === 'one-action-this-week'
    // Feedback appears as an extra slide (index = cards.length) for tabs with >1 card
    const hasFeedbackSlide = !isNextSteps && cards.length > 1
    const totalSlides = hasFeedbackSlide ? cards.length + 1 : cards.length
    const safeIndexFull = Math.min(cardIndex, Math.max(0, totalSlides - 1))
    const defaultPrompt = cards[0]
      ? `I just watched "${videoTitle}" and here's the one action I want to take this week:\n\n${cards[0].body}\n\nHelp me get started. What's the first concrete step I can take right now?`
      : ''
    const handleCopy = () => {
      const text = promptRef.current?.value ?? defaultPrompt
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    const promptText = promptRef.current?.value ?? defaultPrompt
    const encodedPrompt = encodeURIComponent(promptText)
    const AI_PROVIDERS = [
      { label: 'Claude', url: `https://claude.ai/new?q=${encodedPrompt}`, favicon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=64' },
      { label: 'ChatGPT', url: `https://chatgpt.com/?q=${encodedPrompt}`, favicon: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64' },
      { label: 'Gemini', url: `https://gemini.google.com/app`, favicon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64', copyOnClick: true },
    ]
    const showCopyBtn = hoveringPrompt || hoveringCopyBtn

    // Show feedback card when on the extra slide
    const showFeedback = hasFeedbackSlide && safeIndexFull === cards.length

    // Feedback options
    const feedbackOptions = [
      { value: 1, label: 'Not helpful', Icon: Frown },
      { value: 2, label: 'A little helpful', Icon: Meh },
      { value: 3, label: 'Helpful', Icon: Smile },
      { value: 4, label: 'Very helpful', Icon: Laugh },
    ]

    return (
      <>
        <LogoHeader />
        <main style={{
          background: '#ffd19d',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 16px',
          paddingTop: 196,
          position: 'relative',
        }}>
          {/* Left chevron — outside card */}
          {totalSlides > 1 && (
            <button
              onClick={() => setCardIndex(i => Math.max(0, i - 1))}
              disabled={safeIndexFull === 0}
              style={{
                position: 'absolute',
                left: 'calc(50% - 400px)',
                top: 'calc(96px + 196px)',
                background: 'none', border: 'none',
                cursor: safeIndexFull === 0 ? 'default' : 'pointer',
                opacity: safeIndexFull === 0 ? 0.2 : 1,
                width: 56, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12, padding: 0,
              }}
            >
              <ChevronLeft size={36} color="#000" />
            </button>
          )}
          {/* Right chevron — outside card */}
          {totalSlides > 1 && (
            <button
              onClick={() => setCardIndex(i => Math.min(totalSlides - 1, i + 1))}
              disabled={safeIndexFull === totalSlides - 1}
              style={{
                position: 'absolute',
                right: 'calc(50% - 400px)',
                top: 'calc(96px + 196px)',
                background: 'none', border: 'none',
                cursor: safeIndexFull === totalSlides - 1 ? 'default' : 'pointer',
                opacity: safeIndexFull === totalSlides - 1 ? 0.2 : 1,
                width: 56, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12, padding: 0,
              }}
            >
              <ChevronRight size={36} color="#000" />
            </button>
          )}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 24,
            padding: 32,
            width: 600,
            maxWidth: '100%',
            boxShadow: '0px 4px 14px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}>

            {/* Top section: video info + tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Video header */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <a href={watchUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    style={{ width: 215, height: 120, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                  />
                </a>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: FONT, color: '#3d3830', lineHeight: '28px' }}>
                    {videoTitle}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#D4D0C8', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, fontWeight: 700,
                      color: '#555', flexShrink: 0, fontFamily: FONT,
                    }}>
                      {channelInitial}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT, color: 'rgba(0,0,0,0.5)' }}>
                      {channelName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab bar */}
              <div style={{
                background: 'rgba(229,229,229,0.5)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                {visibleTabs.map(tab => {
                  const isActive = tab.key === resolvedTab
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        background: isActive ? '#000' : 'transparent',
                        color: isActive ? '#FFF' : '#000',
                        borderRadius: 8,
                        padding: '4px 12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: FONT,
                        whiteSpace: 'nowrap',
                        lineHeight: '20px',
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Card content + navigation */}
            {currentCard && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200, overflowY: 'auto' }}>
                  {showFeedback ? (
                    /* Feedback card */
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, fontFamily: FONT, color: '#000', lineHeight: '44px' }}>Have these cards been helpful?</p>
                      <p style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 400, fontFamily: FONT, color: 'rgba(0,0,0,0.8)', lineHeight: '28px' }}>Any ideas or suggestions to improve the output? Let us know.</p>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                        {feedbackOptions.map(({ value, label, Icon }) => {
                          const selected = feedbackRating === value
                          return (
                            <button
                              key={value}
                              onClick={() => setFeedbackRating(value)}
                              title={label}
                              style={{
                                background: selected ? '#F0F0FF' : 'transparent',
                                border: 'none', borderRadius: 999, cursor: 'pointer',
                                width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: selected ? '#6C74FB' : '#777', padding: 0,
                              }}
                            >
                              <Icon size={24} />
                            </button>
                          )
                        })}
                      </div>
                      {feedbackSubmitted[resolvedTab] ? (
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 400, fontFamily: FONT, color: 'rgba(0,0,0,0.8)', lineHeight: '28px' }}>Thanks for the feedback!</p>
                      ) : (
                        <>
                          <textarea
                            placeholder="Add a comment"
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            rows={3}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #e6e2db', borderRadius: 8, fontSize: 15, fontFamily: FONT, lineHeight: 1.5, color: '#333', background: '#FAFAFA', resize: 'none', outline: 'none', marginBottom: 12 }}
                          />
                          <button
                            onClick={async () => {
                              try {
                                await fetch('/api/try-feedback', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ token, rating: feedbackRating, comment: feedbackComment, tab: resolvedTab }),
                                })
                                setFeedbackSubmitted(prev => ({ ...prev, [resolvedTab]: true }))
                              } catch { /* silently fail */ }
                            }}
                            style={{
                              background: '#00a9e5', borderRadius: 6, height: 44, padding: '0 24px',
                              border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
                              fontFamily: FONT, color: '#FFF',
                            }}
                          >
                            Send
                          </button>
                        </>
                      )}
                    </div>
                  ) : isNextSteps && defaultPrompt ? (
                    /* AI prompt view for Next steps */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {currentCard.title && (
                        <p style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 800, fontFamily: FONT, color: '#000', lineHeight: '44px' }}>
                          {currentCard.title}
                        </p>
                      )}
                      {currentCard.body && (
                        <p style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 400, fontFamily: FONT, color: 'rgba(0,0,0,0.8)', lineHeight: '28px' }}>
                          {currentCard.body}
                        </p>
                      )}
                      <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, fontFamily: FONT, color: '#111' }}>
                        Use this as an AI prompt to get started
                      </p>
                      <div style={{ position: 'relative' }} onMouseEnter={() => setHoveringPrompt(true)} onMouseLeave={() => setHoveringPrompt(false)}>
                        <textarea
                          key={`prompt-${videoTitle}`}
                          ref={promptRef}
                          defaultValue={defaultPrompt}
                          rows={6}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '14px 44px 14px 14px', border: '1px solid #e6e2db', borderRadius: 8, fontSize: 14, lineHeight: 1.6, color: '#333', background: '#FAFAFA', resize: 'none', fontFamily: FONT, outline: 'none' }}
                        />
                        <div
                          style={{ position: 'absolute', top: 10, right: 10, opacity: showCopyBtn ? 1 : 0, transition: 'opacity 0.15s ease' }}
                          onMouseEnter={() => setHoveringCopyBtn(true)}
                          onMouseLeave={() => setHoveringCopyBtn(false)}
                        >
                          <button
                            onClick={handleCopy}
                            style={{ background: '#F0F0F0', border: 'none', borderRadius: 7, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, color: copied ? '#22C55E' : '#666', transition: 'color 0.15s ease' }}
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
                        {AI_PROVIDERS.map(({ label, url, favicon, copyOnClick }) => (
                          <a key={label} href={url} target="_blank" rel="noopener noreferrer" title={copyOnClick ? `Open ${label} (prompt copied to clipboard)` : `Open ${label}`} onClick={copyOnClick ? handleCopy : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                            <img src={favicon} alt={label} style={{ width: 32, height: 32 }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Normal card content */
                    <>
                      {cards.length > 1 && (
                        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, fontFamily: FONT, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {safeIndexFull + 1} of {cards.length}
                        </p>
                      )}
                      {currentCard.title && (
                        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, fontFamily: FONT, color: '#000', lineHeight: '44px' }}>
                          {currentCard.title}
                        </p>
                      )}
                      {currentCard.body && (
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 400, fontFamily: FONT, color: 'rgba(0,0,0,0.8)', lineHeight: '28px' }}>
                          {currentCard.body}
                        </p>
                      )}
                      {currentCard.bullets && currentCard.bullets.map((b, i) => (
                        <p key={i} style={{ margin: '4px 0 0', fontSize: 16, fontFamily: FONT, color: 'rgba(0,0,0,0.8)', lineHeight: '28px' }}>
                          • {b}
                        </p>
                      ))}
                      {currentCard.url && (
                        <a href={currentCard.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, fontSize: 14, color: '#00a9e5', fontFamily: FONT, textDecoration: 'none' }}>
                          Open link →
                        </a>
                      )}
                    </>
                  )}
                </div>

                {/* Dots only — chevrons are outside the card */}
                <div style={{ display: 'flex', justifyContent: 'center', visibility: totalSlides > 1 ? 'visible' : 'hidden' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCardIndex(i)}
                        style={{
                          width: 10, height: 10, borderRadius: '50%', border: 'none', padding: 0,
                          background: i === safeIndexFull ? '#000' : '#D4D0C8',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </>
    )
  }

  return null
}
