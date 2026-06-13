'use client'

import React, { useState, useEffect } from 'react'

export interface SideNavHeaderProps {
  isCollapsed: boolean
  onToggle: () => void
  appName?: string
}

export const SideNavHeader: React.FC<SideNavHeaderProps> = ({ isCollapsed, onToggle, appName = 'ThreadCub' }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => { setIsHovered(false) }, [isCollapsed])
  
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  if (isCollapsed) {
    return (
      <div style={{ position: 'relative', height: '48px', display: 'flex', alignItems: 'center', padding: '0 8px', marginTop: '8px' }}>
        <button
          onClick={() => { setIsHovered(false); onToggle() }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ width: '48px', height: '48px', background: isHovered ? 'var(--color-nav-hover)' : 'transparent', border: 'none', cursor: 'pointer', padding: '0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s ease' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-icon-default)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
            <path d="M14 9l3 3-3 3" />
          </svg>
        </button>
        {isHovered && (
          <div style={{ position: 'fixed', left: '72px', top: '24px', backgroundColor: 'hsl(var(--foreground))', color: 'hsl(var(--background))', fontSize: '12px', fontWeight: 500, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none' }}>
            Open sidebar
            <div style={{ position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '4px solid hsl(var(--foreground))' }} />
          </div>
        )}
      </div>
    )
  }

  // Expanded
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', height: '48px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s', margin: '8px 8px 0 8px', background: isHovered ? 'var(--color-nav-hover)' : 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src={isDark ? '/threadcub-dark.svg' : '/threadcub-logo.svg'} alt="ThreadCub" width={140} height={24} style={{ display: 'block', flexShrink: 0 }} />
      </div>
      <div style={{ width: '20px', height: '20px', marginRight: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
          <path d="M16 15l-3-3 3-3" />
        </svg>
      </div>
      {isHovered && (
        <div style={{ position: 'fixed', left: '292px', top: '25px', backgroundColor: 'hsl(var(--foreground))', color: 'hsl(var(--background))', fontSize: '12px', fontWeight: 500, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none' }}>
          Close sidebar
          <div style={{ position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '4px solid hsl(var(--foreground))' }} />
        </div>
      )}
    </div>
  )
}

export default SideNavHeader
