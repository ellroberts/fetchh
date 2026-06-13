// components/TabPill.tsx
'use client'
import { useState } from 'react'

interface TabPillProps {
  label?: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  skeleton?: boolean
  /** Approximate width of the skeleton pill — defaults to 80px */
  skeletonWidth?: number
}

export function TabPill({
  label,
  selected = false,
  onClick,
  disabled = false,
  skeleton = false,
  skeletonWidth = 80,
}: TabPillProps) {
  const [hovered, setHovered] = useState(false)

  if (skeleton) {
    return (
      <div style={{
        width: skeletonWidth,
        height: 'var(--spacing-10)',
        borderRadius: 'var(--border-radius-lg)',
        backgroundColor: 'var(--color-border-subtle)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }} />
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0 var(--spacing-3)',
        height: 'var(--spacing-10)',
        display: 'flex',
        alignItems: 'center',
        border: 'none',
        borderRadius: 'var(--border-radius-lg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        fontFamily: 'var(--font-family-primary)',
        backgroundColor: selected
          ? 'var(--color-state-selected)'
          : hovered
          ? 'var(--color-state-hover-bg)'
          : 'transparent',
        color: selected
          ? 'var(--color-text-title)'
          : hovered
          ? 'var(--color-text-body)'
          : 'var(--color-text-secondary)',
        transition: 'var(--transition-base)',
        opacity: disabled ? 0.4 : 1,
        outline: 'none',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}