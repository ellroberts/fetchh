'use client'
import React, { useEffect, useState } from 'react'

type Status = 'ready' | 'processing' | 'on_hold'
type AnimationType = 'none' | 'spin' | 'pulse'

function getStatus(hasEmbeddings: boolean | undefined, now: number, createdAt: string): Status {
  if (hasEmbeddings) return 'ready'
  const age = now - new Date(createdAt).getTime()
  return age < 90000 ? 'processing' : 'on_hold'
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; dotColor: string; animate: AnimationType }> = {
  ready:      { label: 'Ready',      color: 'var(--color-status-success-text)', dotColor: 'var(--color-status-success)', animate: 'none'  },
  processing: { label: 'Processing', color: 'var(--color-status-warning-text)', dotColor: 'var(--color-status-warning)', animate: 'spin'  },
  on_hold:    { label: 'Fetching',   color: 'var(--color-status-warning-text)', dotColor: 'var(--color-status-warning)', animate: 'spin'  },
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

interface EmbedStatusProps {
  hasEmbeddings?: boolean
  createdAt: string
  size?: number
  /** Shows a live elapsed timer while processing or on hold */
  showTimer?: boolean
}

export function EmbedStatus({ hasEmbeddings, createdAt, size = 8, showTimer = false }: EmbedStatusProps) {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
  }, [createdAt])

  const status = now === 0 ? (hasEmbeddings ? 'ready' : 'on_hold') : getStatus(hasEmbeddings, now, createdAt)
  const { label, color, dotColor, animate } = STATUS_CONFIG[status]
  const isActive = status === 'processing' || status === 'on_hold'

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!showTimer || !isActive) {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [showTimer, isActive])

  const dotStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
    ...(animate === 'spin' ? {
      backgroundColor: 'transparent',
      border: `2px solid ${dotColor}`,
      borderTopColor: 'transparent',
      animation: 'embedSpin 0.8s linear infinite',
    } : animate === 'pulse' ? {
      backgroundColor: dotColor,
      animation: 'embedPulse 1.4s ease-in-out infinite',
    } : {
      backgroundColor: dotColor,
    }),
  }

  if (status === 'ready') return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={dotStyle} />
      <span style={{ fontSize: '13px', fontFamily: 'var(--font-family-primary)', color }}>
        {label}
        {showTimer && isActive && elapsed > 0 && (
          <span style={{ marginLeft: '4px', opacity: 0.65 }}>
            {formatElapsed(elapsed)}
          </span>
        )}
      </span>
      <style>{`
        @keyframes embedSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes embedPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.75); }
        }
      `}</style>
    </span>
  )
}