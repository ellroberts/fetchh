'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

const FONT = 'var(--font-karla), sans-serif'

const INPUT_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #e6e2db',
  borderRadius: 8,
  height: 48,
  padding: '8px 16px',
  fontSize: 16,
  fontWeight: 500,
  fontFamily: FONT,
  color: '#111',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 400,
  fontFamily: FONT,
  color: '#3d3830',
}

const LS_KEY = 'digestt_try_token_v2'

export default function TryV2() {
  const router = useRouter()
  const [goal, setGoal] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'limit_reached'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = localStorage.getItem(LS_KEY)
    if (!token) return
    fetch(`/api/try-session?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.try_count >= 3) setStatus('limit_reached')
      })
      .catch(() => { /* silently ignore */ })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/try-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403 && data.error === 'limit_reached') {
          setStatus('limit_reached')
          return
        }
        setErrorMsg(data.error || 'Something went wrong.')
        setStatus('error')
        return
      }
      localStorage.setItem(LS_KEY, data.token)
      router.push(`/try2/${data.token}?videoUrl=${encodeURIComponent(videoUrl.trim())}`)
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'limit_reached') {
    return (
      <main style={{ background: '#ffd19d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 32, width: 400, maxWidth: '100%', boxShadow: '0px 4px 14px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img src="/coda_cheeky.svg" alt="" style={{ width: 64, height: 64, marginBottom: 24 }} />
          <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, fontFamily: FONT, color: '#111', lineHeight: 1.2 }}>That&apos;s your 3 previews</h1>
          <p style={{ margin: '0 0 28px', fontSize: 16, fontFamily: FONT, color: '#555', lineHeight: 1.5 }}>
            Want a weekly digest of the channels you&apos;re interested in?
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ background: '#00a9e5', borderRadius: 6, height: 48, width: '100%', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: FONT, color: '#FFF' }}
          >
            Join the waitlist
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <style>{`.digestt-input::placeholder { color: #d4cfc8; }`}</style>

      {/* Fixed top nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: '#FFF', boxShadow: '0px 2px 1px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}>
        <img src="/digestt-logo.svg" alt="Digestt" style={{ height: 24 }} />
      </div>

      <main style={{
        background: '#ffd19d',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 56,
        padding: '80px 16px',
      }}>
        {/* Dog above card */}
        <img src="/coda_cheeky.svg" alt="" style={{ width: 124, height: 124, position: 'relative', zIndex: 1, marginBottom: 32 }} />

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 24,
          padding: 32,
          width: 480,
          maxWidth: '100%',
          boxShadow: '0px 4px 14px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}>
          {/* Heading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, fontFamily: FONT, color: '#000', lineHeight: 'normal' }}>
              Catch the highlights
            </h1>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: FONT, lineHeight: '28px', color: '#000' }}>
              Get a quick summary on a YouTube video
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Goal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={LABEL_STYLE}>What do you want to get out of this video?</label>
                <input
                  className="digestt-input"
                  type="text"
                  placeholder="e.g. I want to start a similar business"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              {/* YouTube URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={LABEL_STYLE}>YouTube video</label>
                <input
                  className="digestt-input"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            {status === 'error' && (
              <p style={{ margin: 0, fontSize: 14, color: '#dc2626', fontFamily: FONT }}>{errorMsg}</p>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{
                background: '#00a9e5',
                borderRadius: 6,
                height: 56,
                width: '100%',
                border: 'none',
                cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: status === 'submitting' ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT, color: '#FFF' }}>
                {status === 'submitting' ? 'Sending...' : 'Send now'}
              </span>
              {status !== 'submitting' && <ArrowRight size={18} color="#FFF" />}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
