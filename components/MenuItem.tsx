'use client'

import React, { useState } from 'react'

export interface MenuItemProps {
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export function MenuItem({ onClick, children, danger = false, disabled = false, style, className }: MenuItemProps) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const bg = pressed
    ? danger ? 'var(--color-status-error-bg)' : 'var(--color-state-hover-bg)'
    : hovered
    ? danger ? 'var(--color-status-error-bg)' : 'var(--color-state-hover-bg)'
    : 'transparent'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)',
        padding: 'var(--spacing-2) var(--spacing-4)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family-primary)',
        color: disabled ? 'var(--color-border-default)' : danger ? 'var(--color-status-error)' : 'var(--color-text-secondary)',
        backgroundColor: bg,
        border: 'none',
        borderRadius: 'var(--border-radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'background-color var(--transition-base)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
