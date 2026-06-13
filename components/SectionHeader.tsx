// components/SectionHeader.tsx
'use client'

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export interface SectionHeaderProps {
  label?: string
  count?: number
  collapsed?: boolean
  onToggle?: () => void
  skeleton?: boolean
}

export function SectionHeader({
  label,
  count,
  collapsed = false,
  onToggle,
  skeleton = false,
}: SectionHeaderProps) {
  if (skeleton) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        padding: '0 0 var(--spacing-2)',
        marginBottom: 'var(--spacing-2)',
        height: 24,
      }}>
        <div style={{
          width: 13,
          height: 13,
          borderRadius: 'var(--border-radius-sm)',
          backgroundColor: 'var(--color-border-subtle)',
          flexShrink: 0,
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          width: 72,
          height: 11,
          borderRadius: 'var(--border-radius-sm)',
          backgroundColor: 'var(--color-border-subtle)',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }} />
      </div>
    )
  }

  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 0 var(--spacing-2)',
        marginBottom: 'var(--spacing-2)',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        letterSpacing: '0.06em',
        width: '100%',
        textAlign: 'left',
      }}
    >
      {collapsed
        ? <ChevronRight size={13} style={{ flexShrink: 0 }} />
        : <ChevronDown size={13} style={{ flexShrink: 0 }} />
      }
      {label}
      {count !== undefined && (
        <span style={{ fontWeight: 'var(--font-weight-normal)', opacity: 0.6, marginLeft: '2px' }}>
          ({count})
        </span>
      )}
    </button>
  )
}

export default SectionHeader
