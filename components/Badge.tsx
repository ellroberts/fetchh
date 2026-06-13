import React from 'react'

export interface BadgeProps {
  /** Badge text content */
  children?: React.ReactNode
  /** Badge count (legacy prop for backwards compatibility) */
  count?: number
  /** Visual variant */
  variant?: 'base' | 'inverse' | 'light' | 'info' | 'success' | 'warning' | 'error' | 'allCaps'
  /** Size variant for different use cases */
  size?: 'sm' | 'md' | 'lg'
  /** Icon to display (left side) */
  icon?: React.ReactNode
  /** Icon to display on right side */
  iconRight?: React.ReactNode
  /** Whether this is in a collapsed sidebar (shows as dot) */
  collapsed?: boolean
  /** Whether the parent item is active (affects styling) */
  active?: boolean
  /** Custom className */
  className?: string
  /** Custom style overrides */
  style?: React.CSSProperties
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  count,
  variant = 'base',
  size = 'md',
  icon,
  iconRight,
  collapsed = false,
  active = false,
  className = '',
  style
}) => {
  // If count is provided, use it; otherwise use children
  const content = count !== undefined ? (count > 99 ? '99+' : count) : children
  
  if ((count !== undefined && count <= 0) || (!count && !children)) return null

  // Size scales using design tokens
  const S = {
    sm: {
      fontSize: 'var(--font-size-xs)',
      padding: 'var(--spacing-1) var(--spacing-2)', // 4px 8px
      iconSize: 'var(--spacing-3)', // 12px
      dotSize: 'var(--spacing-3)' // 8px
    },
    md: {
      fontSize: 'var(--font-size-xs)',
      padding: 'var(--spacing-1) var(--spacing-2)', // 4px 8px
      iconSize: 'var(--spacing-4)', // 16px (better for 14px icons)
      dotSize: 'var(--spacing-3)' // 8px
    },
    lg: {
      fontSize: 'var(--font-size-sm)',
      padding: 'var(--spacing-1) var(--spacing-2)', // 4px 8px
      iconSize: 'var(--spacing-5)', // 20px (better for 16px icons)
      dotSize: 'var(--spacing-3)' // 12px
    }
  }[size]

  // Variant styles using your existing design tokens
  const getVariantStyles = () => {
    switch (variant) {
      case 'base':
        return {
          backgroundColor: active ? 'var(--color-primary-text)' : 'var(--color-border-default)',
          color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-body)',
          border: 'none'
        }
      case 'inverse':
        return {
          backgroundColor: 'var(--color-text-body)',
          color: 'var(--color-text-on-primary)',
          border: 'none'
        }
      case 'light':
        return {
          backgroundColor: 'var(--color-surface-default)',
          color: 'var(--color-text-secondary)',
          border: `1px solid var(--color-border-strong)`
        }
      case 'info':
        return {
          backgroundColor: 'var(--color-status-info-bg)',
          color: 'var(--color-status-info-text)',
          border: 'none'
        }
      case 'success':
        return {
          backgroundColor: 'var(--color-status-success-bg)',
          color: 'var(--color-status-success-text)',
          border: 'none'
        }
      case 'warning':
        return {
          backgroundColor: 'var(--color-status-warning-bg)',
          color: 'var(--color-status-warning-text)',
          border: 'none'
        }
      case 'error':
        return {
          backgroundColor: 'var(--color-status-error-bg)',
          color: 'var(--color-status-error-text)',
          border: 'none'
        }
      case 'allCaps':
        return {
          backgroundColor: 'var(--color-border-default)',
          color: 'var(--color-text-secondary)',
          border: 'none',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em'
        }
      default:
        return {
          backgroundColor: 'var(--color-border-default)',
          color: 'var(--color-text-body)',
          border: 'none'
        }
    }
  }

  if (collapsed) {
    // Dot badge for collapsed state
    return (
      <div
        className={className}
        style={{
          position: 'absolute',
          top: 'var(--spacing-3)',
          right: 'var(--spacing-3)',
          width: S.dotSize,
          height: S.dotSize,
          backgroundColor: 'var(--color-status-error)',
          borderRadius: 'var(--border-radius-full)',
          border: `var(--border-width-medium) solid var(--color-text-on-primary)`,
          flexShrink: 0,
          ...style
        }}
      />
    )
  }

  const variantStyles = getVariantStyles()

  // Lightning Design System style badge
  return (
    <span 
      className={className}
      style={{
        ...variantStyles,
        fontSize: S.fontSize,
        fontWeight: 'var(--font-weight-medium)',
        fontFamily: 'var(--font-family-primary)',
        borderRadius: 'var(--border-radius-base)',
        padding: S.padding,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-1)',
        lineHeight: '1',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {icon && (
        <span style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: S.iconSize,
          flexShrink: 0 
        }}>
          {icon}
        </span>
      )}
      {content}
      {iconRight && (
        <span style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: S.iconSize,
          flexShrink: 0 
        }}>
          {iconRight}
        </span>
      )}
    </span>
  )
}

export default Badge