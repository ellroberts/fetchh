'use client';
import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

export interface UserMenuProps {
  userEmail: string
  userName: string
  userAvatar?: string
  isOpen: boolean
  isCollapsed?: boolean
  onSettingsClick: () => void
  onSignOutClick: () => void
  onUserSectionClick: () => void
  userSectionRef?: React.RefObject<HTMLDivElement>
  subscriptionTier?: string
}

export const UserMenu: React.FC<UserMenuProps> = ({
  userEmail, userName, userAvatar, isOpen, isCollapsed = false,
  onSettingsClick, onSignOutClick, onUserSectionClick, userSectionRef,
}) => {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !userSectionRef?.current?.contains(e.target as Node)) {
        onUserSectionClick()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onUserSectionClick])

  if (!isOpen) return null

  const menuStyle: React.CSSProperties = isCollapsed
    ? {
        position: 'fixed',
        bottom: '72px',
        left: '16px',
        width: '264px',
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-default)',
        borderRadius: '10px',
        zIndex: 1000,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        padding: '8px 8px 4px 8px',
      }
    : {
        position: 'absolute',
        bottom: '64px',
        left: '0',
        right: '0',
        backgroundColor: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border-default)',
        zIndex: 1000,
        overflow: 'hidden',
        padding: '8px 8px 4px 8px',
      }

  // Spec: 48px tall, 6px top/bottom, 12px left | 20px icon | 8px gap | label | 12px right
  const buttonStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-title)',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'left',
    gap: 0,
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)'
    const arrow = e.currentTarget.querySelector('.menu-arrow') as HTMLElement
    if (arrow) arrow.style.opacity = '1'
  }
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent'
    const arrow = e.currentTarget.querySelector('.menu-arrow') as HTMLElement
    if (arrow) arrow.style.opacity = '0'
  }

  const iconStyle = { width: '20px', height: '20px', flexShrink: 0 as const }
  const labelStyle = { marginLeft: '8px', flex: 1 as const }
  const arrowSvg = (
    <svg className="menu-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ opacity: 0, transition: 'opacity 0.15s', color: 'var(--color-icon-default)', flexShrink: 0, marginLeft: '8px' }}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )

  return (
    <div ref={menuRef} style={menuStyle}>


      {/* Dark mode toggle */}
      <button onClick={toggleTheme} style={buttonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {isDark ? (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
        <span style={labelStyle}>{isDark ? 'Light mode' : 'Dark mode'}</span>
      </button>

      {/* Upgrade plan */}
      <button onClick={() => router.push('/settings/billing')} style={buttonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
        <span style={labelStyle}>Upgrade plan</span>
        {arrowSvg}
      </button>

      {/* API Keys */}
      <button onClick={() => router.push('/settings/api-keys')} style={buttonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
        <span style={labelStyle}>API Keys</span>
        {arrowSvg}
      </button>

      {/* Settings */}
      <button onClick={onSettingsClick} style={buttonStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span style={labelStyle}>Settings</span>
        {arrowSvg}
      </button>

      {/* Sign out */}
      <button onClick={onSignOutClick} style={{ ...buttonStyle, marginBottom: '4px' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
        <span style={labelStyle}>Sign out</span>
        {arrowSvg}
      </button>
    </div>
  )
}

export default UserMenu
