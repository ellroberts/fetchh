// src/components/SocialButton.tsx
import React from 'react'

export interface SocialButtonProps {
  /** Social provider */
  provider: 'google' | 'github' | 'apple' | 'microsoft'
  /** Custom button text */
  text?: string
  /** Button action type */
  action?: 'signup' | 'signin' | 'continue'
  /** Whether button is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
  /** Loading state */
  loading?: boolean
  /** Custom styles */
  style?: React.CSSProperties
  /** Additional CSS classes */
  className?: string
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
}

export const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  text,
  action = 'signup',
  disabled = false,
  onClick,
  loading = false,
  style,
  className,
  size = 'md'
}) => {
  // Size variants using design tokens
  const sizeVariants = {
    sm: {
      height: '36px',
      fontSize: 'var(--font-size-sm)',
      padding: '0 var(--spacing-3)',
      gap: 'var(--spacing-2)',
      iconSize: '16px'
    },
    md: {
      height: '44px',
      fontSize: 'var(--font-size-base)',
      padding: '0 var(--spacing-4)',
      gap: 'var(--spacing-3)',
      iconSize: '20px'
    },
    lg: {
      height: '48px',
      fontSize: 'var(--font-size-lg)',
      padding: '0 var(--spacing-5)',
      gap: 'var(--spacing-3)',
      iconSize: '22px'
    }
  }

  const sizeConfig = sizeVariants[size]

  // Default text based on provider and action
  const getDefaultText = () => {
    const actionText = {
      signup: 'Sign up with',
      signin: 'Sign in with', 
      continue: 'Continue with'
    }
    
    const providerNames = {
      google: 'Google',
      github: 'GitHub',
      apple: 'Apple',
      microsoft: 'Microsoft'
    }
    
    return `${actionText[action]} ${providerNames[provider]}`
  }

  const buttonText = text || getDefaultText()
  const isDisabled = disabled || loading

  // Button styles using design tokens
  const buttonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: sizeConfig.height,
    padding: sizeConfig.padding,
    backgroundColor: isDisabled ? 'var(--color-state-hover-bg)' : 'var(--color-surface-raised)',
    border: `var(--border-width-thin) solid ${isDisabled ? 'var(--color-border-default)' : 'var(--color-border-default)'}`,
    borderRadius: 'var(--border-radius-lg)',
    fontFamily: 'var(--font-family-primary)',
    fontSize: sizeConfig.fontSize,
    fontWeight: 'var(--font-weight-medium)',
    color: isDisabled ? 'var(--color-border-default)' : 'var(--color-text-body)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition-base)',
    gap: sizeConfig.gap,
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 'var(--line-height-normal)',
    whiteSpace: 'nowrap',
    ...style
  }

  // Icon styles using design tokens
  const iconStyles: React.CSSProperties = {
    width: sizeConfig.iconSize,
    height: sizeConfig.iconSize,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  // Loading spinner using design tokens
  const LoadingSpinner = () => (
    <div
      style={{
        width: sizeConfig.iconSize,
        height: sizeConfig.iconSize,
        border: `2px solid var(--color-border-subtle)`,
        borderTop: `2px solid var(--color-primary-500)`,
        borderRadius: 'var(--border-radius-full)',
        animation: 'spin 1s linear infinite',
        flexShrink: 0
      }}
    />
  )

  // Add keyframe animation for spinner
  React.useEffect(() => {
    const existingStyle = document.getElementById('social-button-spinner-styles')
    if (!existingStyle) {
      const style = document.createElement('style')
      style.id = 'social-button-spinner-styles'
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Provider icons with proper colors
  const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" style={iconStyles}>
      <path
        fill="#4285f4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34a853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#fbbc05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#ea4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )

  const GitHubIcon = () => (
    <svg viewBox="0 0 24 24" fill="#24292e" style={iconStyles}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  )

  const AppleIcon = () => (
    <svg viewBox="0 0 24 24" fill="#000000" style={iconStyles}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )

  const MicrosoftIcon = () => (
    <svg viewBox="0 0 24 24" style={iconStyles}>
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  )

  const getIcon = () => {
    if (loading) return <LoadingSpinner />
    
    switch (provider) {
      case 'google': return <GoogleIcon />
      case 'github': return <GitHubIcon />
      case 'apple': return <AppleIcon />
      case 'microsoft': return <MicrosoftIcon />
      default: return null
    }
  }

  // Event handlers using design tokens
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
      e.currentTarget.style.borderColor = 'var(--color-border-default)'
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
      e.currentTarget.style.borderColor = 'var(--color-border-default)'
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.boxShadow = `0 0 0 3px var(--color-state-focus-ring)` // Using primary color
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = 'none'
  }

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick()
    }
  }

  return (
    <button
      type="button"
      style={buttonStyles}
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={loading ? `Loading ${buttonText}` : buttonText}
    >
      {getIcon()}
      <span style={{ 
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {loading ? 'Loading...' : buttonText}
      </span>
    </button>
  )
}