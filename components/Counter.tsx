'use client'
import React from 'react'

export interface CounterProps {
  count: number
  active?: boolean
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

export const Counter: React.FC<CounterProps> = ({
  count,
  active = false,
  size = 'md',
  className,
  style,
}) => {
  if (!count || count <= 0) return null

  const isSmall = size === 'sm'

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: isSmall ? '16px' : '20px',
        height: isSmall ? '16px' : '20px',
        padding: isSmall ? '0 4px' : '0 8px',
        borderRadius: '999px',
        fontSize: isSmall ? 'var(--font-size-2xs)' : 'var(--font-size-xs)',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        backgroundColor: 'var(--color-primary-500)',
        color: 'var(--color-text-on-primary)',
        border: '1.5px solid transparent',
        ...style,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default Counter
