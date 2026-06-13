// components/IconButton.tsx
'use client'
import React from 'react'
import { Tooltip } from '@/components/Tooltip'

export interface IconButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
  tooltip?: string
  title?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'ghost' | 'outline' | 'white'
  danger?: boolean
  type?: 'button' | 'submit' | 'reset'
  selected?: boolean
  style?: React.CSSProperties
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  tooltipAlign?: 'center' | 'left' | 'right'
}

const sizes = {
  sm: { width: '28px', height: '28px' },
  md: { width: '32px', height: '32px' },
  lg: { width: '40px', height: '40px' },
  xl: { width: '48px', height: '48px' },
}

export function IconButton({
  onClick,
  children,
  tooltip,
  title,
  disabled = false,
  size = 'md',
  variant = 'ghost',
  danger = false,
  type = 'button',
  selected = false,
  style,
  tooltipPosition = 'top',
  tooltipAlign = 'center',
}: IconButtonProps) {
  const { width, height } = sizes[size]
  const hoverBg = variant === 'white' ? 'rgba(255, 255, 255, 0.9)'
    : danger ? 'var(--color-status-error-bg)'
    : selected ? 'var(--color-state-selected)'
    : 'var(--color-state-hover-bg)'
  const hoverColor = variant === 'white' ? 'var(--color-primary-500)'
    : danger ? 'var(--color-status-error)'
    : 'var(--color-icon-strong)'
  const defaultColor = variant === 'white' ? 'var(--color-primary-500)'
    : danger ? 'var(--color-status-error)'
    : selected ? 'var(--color-icon-strong)'
    : 'var(--color-icon-default)'
  const defaultBg = variant === 'white' ? 'var(--color-warm-white)'
    : selected ? 'var(--color-state-selected)'
    : 'transparent'
  const border = variant === 'outline' ? '1px solid var(--color-border-default)' : 'none'

  const button = (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        flexShrink: 0,
        borderRadius: 'var(--border-radius-lg)',
        border,
        backgroundColor: defaultBg,
        color: defaultColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'var(--transition-base)',
        padding: 0,
        fontFamily: 'var(--font-family-primary)',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.backgroundColor = hoverBg
        e.currentTarget.style.color = hoverColor
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        e.currentTarget.style.backgroundColor = defaultBg
        e.currentTarget.style.color = defaultColor
      }}
    >
      {children}
    </button>
  )

  if (tooltip) {
    return (
      <Tooltip label={tooltip} position={tooltipPosition} align={tooltipAlign}>
        {button}
      </Tooltip>
    )
  }

  return button
}

export default IconButton
