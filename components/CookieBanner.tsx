'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('tc-cookies-accepted')) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('tc-cookies-accepted', 'true')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('tc-cookies-accepted', 'false')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--color-surface-inverse)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: 'var(--spacing-4) var(--spacing-10)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 'var(--spacing-6)', flexWrap: 'wrap',
    }}>
      <p style={{
        fontSize: 'var(--font-size-sm)',
        color: 'rgba(255,255,255,0.65)',
        margin: 0, lineHeight: '1.5',
        maxWidth: '680px',
      }}>
        We use cookies to improve your experience and analyse site usage.{' '}
        <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}>
          Privacy policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexShrink: 0 }}>
        <button onClick={decline} style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
          color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
          cursor: 'pointer', padding: 'var(--spacing-2) var(--spacing-4)',
          borderRadius: 'var(--border-radius-lg)', transition: 'var(--transition-base)',
          fontFamily: 'var(--font-family-primary)',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}
        >
          Decline
        </button>
        <button onClick={accept} style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-title)', background: 'var(--color-surface-page)',
          border: 'none', cursor: 'pointer',
          padding: 'var(--spacing-2) var(--spacing-4)',
          borderRadius: 'var(--border-radius-lg)', transition: 'var(--transition-base)',
          fontFamily: 'var(--font-family-primary)',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.9'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          Accept
        </button>
      </div>
    </div>
  )
}
