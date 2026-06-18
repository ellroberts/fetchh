'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'

const MAX_CHANNELS = 15

export default function Home() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')

  useEffect(() => {
    const prefill = searchParams.get('email')
    if (prefill) setEmail(decodeURIComponent(prefill))
  }, [searchParams])
  const [channels, setChannels] = useState<string[]>(['', ''])
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const addChannel = () => {
    if (channels.length < MAX_CHANNELS) {
      setChannels([...channels, ''])
    }
  }

  const updateChannel = (index: number, value: string) => {
    const next = [...channels]
    next[index] = value
    setChannels(next)
  }

  const removeChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const filledChannels = channels.map((c) => c.trim()).filter(Boolean)

    if (filledChannels.length === 0) {
      setErrorMsg('Add at least one YouTube channel URL.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/digest-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, channels: filledChannels }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
      } else {
        setErrorMsg(data.error || 'Something went wrong.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <main className="digest-page">
        <div className="digest-card">
          <h1 className="digest-title">You're in.</h1>
          <p className="digest-subtitle">
            We'll send your first digest once your channels are ready. Keep an eye on your inbox.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="digest-page">
      <div className="digest-card">
        <h1 className="digest-title">Niche Digest</h1>
        <p className="digest-subtitle">
          Get a weekly email digest of the YouTube channels you actually care about — no algorithm, no noise.
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

          <div className="digest-channels-label">
            <span className="digest-label-text">YouTube channel URLs</span>
            <span className="digest-label-hint">{channels.filter(Boolean).length} / {MAX_CHANNELS}</span>
          </div>

          <div className="digest-channels-list">
            {channels.map((url, i) => (
              <div key={i} className="digest-channel-row">
                <Input
                  type="text"
                  placeholder="https://youtube.com/@channel"
                  value={url}
                  onChange={(e) => updateChannel(i, (e.target as HTMLInputElement).value)}
                  style={{ flex: 1 }}
                />
                {channels.length > 1 && (
                  <button
                    type="button"
                    className="digest-remove-btn"
                    onClick={() => removeChannel(i)}
                    aria-label="Remove channel"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {channels.length < MAX_CHANNELS && (
            <button type="button" className="digest-add-btn" onClick={addChannel}>
              + Add another channel
            </button>
          )}

          {status === 'error' && (
            <p className="digest-error">{errorMsg}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={status === 'submitting'}
            style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
          >
            {status === 'submitting' ? 'Signing up…' : 'Get my digest'}
          </Button>
        </form>
      </div>
    </main>
  )
}
