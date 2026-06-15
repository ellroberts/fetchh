'use client'

import { useState } from 'react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedField {
  key: string
  label: string
  bodyHtml: string  // raw HTML slice from cardHtml (or plain text for ai-relevance)
  count?: number    // number of <li> items, if any
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

// Maps cleaned label text (lowercased, number-stripped) → canonical key
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

const DEFAULT_EXPANDED = new Set(['ai-relevance', 'worth-watching-in-full'])

// ── Parser ────────────────────────────────────────────────────────────────────

function parseCardHtml(cardHtml: string): ParsedField[] {
  const fields: ParsedField[] = []

  // 1. AI relevance — find "AI relevance:" text, back up to its <p>, extract plain text
  const aiIdx = cardHtml.indexOf('AI relevance:')
  if (aiIdx !== -1) {
    const pStart = cardHtml.lastIndexOf('<p', aiIdx)
    const pClose = cardHtml.indexOf('</p>', aiIdx)
    if (pStart !== -1 && pClose !== -1) {
      const raw = cardHtml.slice(pStart, pClose + 4)
      const text = raw
        .replace(/<[^>]+>/g, '')
        .replace(/^AI relevance:\s*/i, '')
        .trim()
      fields.push({ key: 'ai-relevance', label: 'AI relevance', bodyHtml: text })
    }
  }

  // 2. Numbered section fields — label paragraphs have the unique LABEL_STYLE
  //    from cardToHtml: margin:20px 0 4px;font-size:11px;font-weight:700...
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

// ── Field body renderer ───────────────────────────────────────────────────────

function FieldBody({ field, videoId }: { field: ParsedField; videoId: string }) {
  const { key, bodyHtml, count } = field

  // AI relevance — plain text stored in bodyHtml
  if (key === 'ai-relevance') {
    return (
      <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.6 }}>{bodyHtml}</p>
    )
  }

  // Tools mentioned with no items
  if (key === 'tools-mentioned' && !count) {
    const plainText = bodyHtml.replace(/<[^>]+>/g, '').trim()
    const isEmpty = !plainText || /^nothing notable\.?$/i.test(plainText)
    if (isEmpty) {
      return <p style={{ margin: 0, fontSize: 14, color: '#999', lineHeight: 1.6 }}>None mentioned</p>
    }
  }

  // Fields with list items — render each <li> as label + body
  const liMatches = [...bodyHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
  if (liMatches.length > 0) {
    return (
      <div>
        {liMatches.map((match, i) => {
          const content = match[1]
          const boldMatch = content.match(/^<strong>([\s\S]*?)<\/strong>([\s\S]*)/)
          const isLast = i === liMatches.length - 1

          if (boldMatch) {
            const itemLabel = boldMatch[1].replace(/<[^>]+>/g, '').toUpperCase()
            const itemBody = boldMatch[2].replace(/^\s*[—–-]\s*/, '').trim()
            return (
              <div key={i} style={{ marginBottom: isLast ? 0 : 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999' }}>
                  {itemLabel}
                </p>
                <p
                  style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: itemBody }}
                />
              </div>
            )
          }

          // Plain list item (no bold label)
          return (
            <div key={i} style={{ marginBottom: isLast ? 0 : 16 }}>
              <p
                style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // Non-list fields — split by </p> to preserve paragraph breaks, strip HTML tags
  const paragraphs = bodyHtml
    .split('</p>')
    .map((s) => s.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)

  return (
    <div>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: i < paragraphs.length - 1 ? '0 0 8px' : 0, fontSize: 14, color: '#333', lineHeight: 1.6 }}>
          {para}
        </p>
      ))}
      {key === 'worth-watching-in-full' && (
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 12, fontSize: 14, color: '#2563EB', textDecoration: 'none' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none' }}
        >
          Watch now →
        </a>
      )}
    </div>
  )
}

// ── Collapsible field card ────────────────────────────────────────────────────

function FieldCard({
  field,
  expanded,
  onToggle,
  videoId,
}: {
  field: ParsedField
  expanded: boolean
  onToggle: () => void
  videoId: string
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: '#111111' }}>
          {field.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {field.count !== undefined && (
            <span style={{ fontSize: 16, color: '#111111' }}>{field.count}</span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111111"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <FieldBody field={field} videoId={videoId} />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE: React.CSSProperties = {
  background: '#E8E4DC',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  padding: '24px 16px',
}

const COLUMN: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
}

export default function TryPage() {
  const [email, setEmail] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DEFAULT_EXPANDED))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    setResult(null)
    setExpanded(new Set(DEFAULT_EXPANDED))

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

  const toggleField = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Loading
  if (status === 'loading') {
    return (
      <main style={{ ...PAGE, alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, color: '#555' }}>Analysing video…</p>
      </main>
    )
  }

  // Results
  if (status === 'done' && result) {
    const fields = parseCardHtml(result.cardHtml)
    const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`

    return (
      <main style={PAGE}>
        <div style={COLUMN}>
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 16 }}>
            <img
              src={`https://img.youtube.com/vi/${result.videoId}/maxresdefault.jpg`}
              alt={result.videoTitle}
              style={{ display: 'block', width: '100%', borderRadius: 12 }}
            />
          </a>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((field) => (
              <FieldCard
                key={field.key}
                field={field}
                expanded={expanded.has(field.key)}
                onToggle={() => toggleField(field.key)}
                videoId={result.videoId}
              />
            ))}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              onClick={() => { setStatus('idle'); setResult(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666', textDecoration: 'underline', padding: 0 }}
            >
              Try another video
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Form (idle / error)
  return (
    <main style={{ ...PAGE, alignItems: 'flex-start', paddingTop: 48 }}>
      <div style={COLUMN}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#111' }}>
          Try it on a video
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 16, color: '#555', lineHeight: 1.5 }}>
          Paste any YouTube video URL and get an instant extraction — the same format as your weekly digest.
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
