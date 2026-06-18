'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'

type Niche = 'designers' | 'builders' | 'general'

const NICHE_OPTIONS: Array<{ value: Niche; label: string }> = [
  { value: 'designers', label: 'Designers using AI' },
  { value: 'builders', label: 'Builders & founders' },
  { value: 'general', label: 'General AI & tech' },
]

const PAGE: React.CSSProperties = {
  background: '#F7F6F4',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 16px',
  overflowX: 'hidden',
}

export default function TryPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [niche, setNiche] = useState<Niche>('builders')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/try-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), niche }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.')
        setStatus('error')
        return
      }
      router.push(`/try/${data.token}?niche=${niche}&email=${encodeURIComponent(email.trim().toLowerCase())}`)
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <>
      {/* Fixed header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: '#FFF', borderBottom: '1px solid #E5E5E5', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src="/digestt-logo.svg" alt="Digestt" style={{ height: 24 }} />
      </div>

      <main style={PAGE}>
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

          <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
            Try Digestt free
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 16, color: '#555', lineHeight: 1.5 }}>
            Get AI-filtered takeaways from any YouTube video. Pick what fits you best.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', textAlign: 'left' }}>
            <Input
              type="email"
              label="Your email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              required
              autoComplete="email"
            />

            {/* Niche pill toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#555' }}>What best describes you?</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {NICHE_OPTIONS.map((opt) => {
                  const isSelected = niche === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNiche(opt.value)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        border: isSelected ? '2px solid #6C74FB' : '1px solid #E5E5E5',
                        background: isSelected ? '#EEEEFF' : '#FFF',
                        color: isSelected ? '#6C74FB' : '#555',
                        fontSize: 14,
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        fontFamily: 'inherit',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {status === 'error' && (
              <p style={{ margin: 0, fontSize: 14, color: '#dc2626' }}>{errorMsg}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={status === 'submitting'}
              style={{ width: '100%' }}
            >
              Get started →
            </Button>
          </form>
        </div>
      </main>
    </>
  )
}
