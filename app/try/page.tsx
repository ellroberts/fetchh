'use client'

import { useState } from 'react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'

interface ExtractionResult {
  videoId: string
  videoTitle: string
  channelName: string
  cardHtml: string
}

export default function TryPage() {
  const [email, setEmail] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<ExtractionResult | null>(null)

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

  return (
    <main className="digest-page">
      <div className="digest-card" style={{ maxWidth: '680px' }}>
        <h1 className="digest-title">Try it on a video</h1>
        <p className="digest-subtitle">
          Paste any YouTube video URL and get an instant extraction — the same format as your weekly digest.
        </p>

        <form onSubmit={handleSubmit} className="digest-form">
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
            <p className="digest-error">{errorMsg}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={status === 'loading'}
            style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
          >
            {status === 'loading' ? 'Extracting…' : 'Get digest'}
          </Button>
        </form>

        {status === 'done' && result && (
          <div className="try-result">
            <div className="try-result-header">
              <a
                href={`https://www.youtube.com/watch?v=${result.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="try-result-thumbnail-link"
              >
                <img
                  src={`https://img.youtube.com/vi/${result.videoId}/maxresdefault.jpg`}
                  alt={result.videoTitle}
                  className="try-result-thumbnail"
                />
              </a>
              <p className="try-result-channel">{result.channelName}</p>
              <h2 className="try-result-title">
                <a
                  href={`https://www.youtube.com/watch?v=${result.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="try-result-title-link"
                >
                  {result.videoTitle}
                </a>
              </h2>
            </div>
            <div
              className="try-result-card"
              dangerouslySetInnerHTML={{ __html: result.cardHtml }}
            />
          </div>
        )}
      </div>
    </main>
  )
}
