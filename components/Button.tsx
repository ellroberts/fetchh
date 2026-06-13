// components/Button.tsx
import React from 'react'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'ghost-white' | 'neutral' | 'white' | 'white-outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
  className?: string
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  title?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
  type = 'button',
  style,
  className,
  loading = false,
  icon,
  iconPosition = 'left'
}) => {
  const sizeStyles = {
    sm: { height: 'var(--spacing-8)',  paddingInline: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)',   spinnerSize: 'var(--font-size-sm)',   iconSize: 14 },
    md: { height: 'var(--spacing-10)', paddingInline: 'var(--spacing-5)', fontSize: 'var(--font-size-base)', spinnerSize: 'var(--font-size-base)', iconSize: 16 },
    lg: { height: 'var(--spacing-12)', paddingInline: 'var(--spacing-6)', fontSize: 'var(--font-size-lg)',   spinnerSize: 'var(--font-size-lg)',   iconSize: 18 },
  }[size]

  const isDisabled = disabled || loading

  const getVariantStyles = (): React.CSSProperties => {
    if (isDisabled) {
      switch (variant) {
        case 'primary':
          return { backgroundColor: 'var(--color-primary-500)', color: 'var(--color-text-on-primary)', border: 'none', opacity: 0.4 }
        case 'neutral':
          return { backgroundColor: 'transparent', color: 'var(--color-text-body)', border: '1px solid var(--color-border-strong)', opacity: 0.4 }
        case 'secondary':
          return { backgroundColor: 'transparent', color: 'var(--color-primary-500)', border: 'var(--border-width-thin) solid var(--color-primary-500)', opacity: 0.4 }
        case 'tertiary':
          return { backgroundColor: 'transparent', color: 'var(--color-primary-text)', border: 'none', opacity: 0.4 }
        case 'danger':
          return { backgroundColor: 'var(--color-accent-coral)', color: 'var(--color-text-on-primary)', border: 'none', opacity: 0.4 }
        case 'ghost':
          return { backgroundColor: 'transparent', color: 'var(--color-primary-500)', border: 'none', opacity: 0.4 }
        case 'ghost-white':
          return { backgroundColor: 'transparent', color: 'var(--color-text-inverse)', border: 'none', opacity: 0.4 }
        case 'white':
          return { backgroundColor: 'var(--color-warm-white)', color: 'var(--color-primary-500)', border: 'none', opacity: 0.4 }
        case 'white-outline':
          return { backgroundColor: 'transparent', color: 'var(--color-text-inverse)', border: '1px solid var(--color-text-inverse)', opacity: 0.4 }
        default: return {}
      }
    }
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary-500)',
          color: 'var(--color-text-on-primary)',
          border: 'none',
        }
      case 'neutral':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-body)',
          border: '1px solid var(--color-border-strong)',
        }
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary-500)',
          border: 'var(--border-width-thin) solid var(--color-primary-500)',
        }
      case 'tertiary':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary-text)',
          border: 'none',
        }
      case 'danger':
        return {
          backgroundColor: 'var(--color-accent-coral)',
          color: 'var(--color-text-on-primary)',
          border: 'none',
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary-500)',
          border: 'none',
        }
      case 'ghost-white':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-inverse)',
          border: 'none',
        }
      case 'white':
        return {
          backgroundColor: 'var(--color-warm-white)',
          color: 'var(--color-primary-500)',
          border: 'none',
        }
      case 'white-outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-inverse)',
          border: '1px solid var(--color-text-inverse)',
        }
      default: return {}
    }
  }

  const baseStyles: React.CSSProperties = {
    fontFamily: 'var(--font-family-primary)',
    fontWeight: 'var(--font-weight-medium)',
    borderRadius: 'var(--border-radius-lg)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition-base)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 'var(--line-height-normal)',
    whiteSpace: 'nowrap',
    gap: 'var(--spacing-2)',
    ...sizeStyles,
    ...getVariantStyles(),
    ...style,
  }

  const LoadingSpinner = () => {
    const spinnerColor = (variant === 'primary' || variant === 'danger') ? 'var(--color-text-on-primary)' : 'var(--color-primary-500)'
    const spinnerBorderColor = (variant === 'primary' || variant === 'danger') ? 'rgba(255,255,255,0.3)' : 'var(--color-border-default)'
    return (
      <div style={{
        width: sizeStyles.spinnerSize,
        height: sizeStyles.spinnerSize,
        border: `2px solid ${spinnerBorderColor}`,
        borderTop: `2px solid ${spinnerColor}`,
        borderRadius: 'var(--border-radius-full)',
        animation: 'spin 1s linear infinite',
        flexShrink: 0,
      }} />
    )
  }

  const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1 }}>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, { size: sizeStyles.iconSize, ...(children.props || {}) })
        : children}
    </span>
  )

  const renderContent = () => {
    const textSpan = <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    if (!icon) return textSpan
    if (iconPosition === 'right') return <>{textSpan}<IconWrapper>{icon}</IconWrapper></>
    return <><IconWrapper>{icon}</IconWrapper>{textSpan}</>
  }

  React.useEffect(() => {
    if (!document.getElementById('button-spinner-styles')) {
      const s = document.createElement('style')
      s.id = 'button-spinner-styles'
      s.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`
      document.head.appendChild(s)
    }
  }, [])

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const t = e.currentTarget
      if (variant === 'primary') { t.style.backgroundColor = 'var(--color-primary-dark)'; }
      else if (variant === 'danger') { t.style.backgroundColor = 'var(--color-coral-600)'; }
      else if (variant === 'neutral') { t.style.backgroundColor = 'var(--color-surface-overlay)'; }
      else if (variant === 'secondary') { t.style.color = 'var(--color-primary-dark)'; t.style.borderColor = 'var(--color-primary-dark)'; t.style.backgroundColor = 'var(--color-surface-overlay)'; }
      else if (variant === 'tertiary') { t.style.backgroundColor = 'var(--color-surface-overlay)'; t.style.color = 'var(--color-primary-text)'; }
      else if (variant === 'ghost') { t.style.backgroundColor = 'var(--color-surface-overlay)'; t.style.color = 'var(--color-primary-500)'; }
      else if (variant === 'ghost-white') { t.style.backgroundColor = 'rgba(255,255,255,0.15)'; t.style.color = 'var(--color-text-inverse)'; }
      else if (variant === 'white') { t.style.backgroundColor = 'rgba(255,255,255,0.9)'; t.style.color = 'var(--color-primary-500)'; }
      else if (variant === 'white-outline') { t.style.backgroundColor = 'rgba(255,255,255,0.1)'; t.style.color = 'var(--color-text-inverse)'; }
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const t = e.currentTarget
      const s = getVariantStyles()
      t.style.backgroundColor = style?.backgroundColor || s.backgroundColor || ''
      t.style.opacity = ''
      t.style.color = style?.color || s.color || ''
      t.style.borderColor = style?.borderColor || (s as any).borderColor || ''
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const t = e.currentTarget
      t.style.boxShadow = '0 0 0 3px var(--color-state-focus-ring)'
      if (variant === 'secondary') { t.style.borderColor = 'var(--color-primary-500)'; t.style.backgroundColor = 'transparent'; }
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const t = e.currentTarget
      t.style.boxShadow = 'none'
      if (variant === 'secondary') { t.style.borderColor = 'var(--color-primary-500)'; t.style.color = 'var(--color-primary-500)'; }
    }
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={(e) => { if (!isDisabled && onClick) onClick(e) }}
      style={baseStyles}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={loading ? `Loading ${children}` : undefined}
    >
      {loading && <LoadingSpinner />}
      {renderContent()}
    </button>
  )
}