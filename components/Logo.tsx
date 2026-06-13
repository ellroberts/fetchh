'use client'
import React, { useEffect, useState } from 'react'
export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'white' | 'dark' | 'auto'
  stacked?: boolean
  clickable?: boolean
  onClick?: () => void
  alt?: string
  className?: string
  style?: React.CSSProperties
}
export const Logo: React.FC<LogoProps> = ({
  size = 'md', variant = 'auto', stacked = false, clickable = false,
  onClick, alt = 'ThreadCub Logo', className, style
}) => {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const sizeVariants = { xs: '24px', sm: '32px', md: '48px', lg: '64px', xl: '80px' }
  const textSizeVariants = { xs: '12px', sm: '14px', md: '18px', lg: '24px', xl: '32px' }

  const LOGO_LIGHT = '/threadcub.svg'
  const LOGO_DARK  = '/threadcub.svg'
  const src = variant === 'auto' ? (isDark ? LOGO_DARK : LOGO_LIGHT) : '/threadcub.svg'
  const filter = variant === 'white' ? 'brightness(0) invert(1)' : variant === 'dark' ? 'brightness(0)' : 'none'
  const textColor = variant === 'white' ? '#ffffff' : 'var(--color-text-title)'

  const img = (
    <img
      src={src}
      alt={alt}
      style={{ width: sizeVariants[size], height: sizeVariants[size], display: 'block', cursor: clickable ? 'pointer' : 'default', transition: 'var(--transition-base)', userSelect: 'none', filter: variant !== 'auto' ? filter : 'none' }}
    />
  )

  if (stacked) {
    const stackedSizeVariants = { xs: '48px', sm: '64px', md: '96px', lg: '128px', xl: '160px' }
    return (
      <img
        src="/threadcub-logo.svg"
        alt={alt}
        className={className}
        style={{ width: stackedSizeVariants[size], height: 'auto', display: 'block', cursor: clickable ? 'pointer' : 'default', userSelect: 'none', ...style }}
        onClick={clickable ? onClick : undefined}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ width: sizeVariants[size], height: sizeVariants[size], display: 'block', cursor: clickable ? 'pointer' : 'default', transition: 'var(--transition-base)', userSelect: 'none', filter: variant !== 'auto' ? filter : 'none', ...style }}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.transform = 'scale(1.05)' }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.transform = 'scale(1)' }}
      tabIndex={clickable ? 0 : -1}
      role={clickable ? 'button' : 'img'}
    />
  )
}
export default Logo
