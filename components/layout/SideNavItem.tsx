'use client'
import React, { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Counter } from '@/components/Counter'

export interface SideNavItemProps {
  label: string
  icon: string
  iconHover?: string
  iconDark?: string       // e.g. '/sidenav-dashboard-dark.svg'
  iconHoverDark?: string  // e.g. '/sidenav-dashboard-hover-dark.svg'
  active?: boolean
  badge?: number
  collapsed?: boolean
  onClick?: () => void
  iconComponent?: React.ElementType
  iconColor?: string
  className?: string
  style?: React.CSSProperties
}

export const SideNavItem: React.FC<SideNavItemProps> = ({
  label, icon, iconHover, iconDark, iconHoverDark,
  iconComponent: IconComponent, iconColor,
  active = false, badge, collapsed = false, onClick, className, style
}) => {
  const [hovered, setHovered] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const showHover = hovered && !active
  const resolvedIcon      = (isDark && iconDark)      ? iconDark      : icon
  const resolvedIconHover = (isDark && iconHoverDark) ? iconHoverDark : (iconHover || icon)
  const currentIcon = showHover ? resolvedIconHover : resolvedIcon
  const bgColor = active ? 'var(--color-nav-active)' : hovered ? 'var(--color-nav-hover)' : 'transparent'

  // Collapsed: 48x48, icon centred
  if (collapsed) {
    return (
      <button onClick={onClick} className={className}
        style={{ width: '48px', height: '48px', border: 'none', background: bgColor, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'background 0.15s ease', position: 'relative', outline: 'none', flexShrink: 0, ...style }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      >
        {IconComponent
          ? <IconComponent size={20} color={iconColor || 'var(--color-icon-default)'} strokeWidth={2} />
          : currentIcon.endsWith('.svg')
            ? <img src={currentIcon} alt="" width={24} height={24} style={{ display: 'block' }} />
            : <span dangerouslySetInnerHTML={{ __html: currentIcon }} />
        }
        {badge && badge > 0 && <span style={{ position: 'absolute', right: '6px', top: '6px', display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary-500)' }} />}
      </button>
    )
  }

  // Expanded
  // Spec: 48px tall, padding 6px top/bottom 12px sides
  // 24px icon | 8px gap | label (flex) | 8px gap | 20px arrow
  return (
    <button onClick={onClick} className={className}
      style={{ width: '100%', height: '48px', border: 'none', background: bgColor, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px 12px', transition: 'background 0.15s ease', color: active ? 'var(--color-nav-active-text)' : 'var(--color-text-title)', fontSize: '14px', fontWeight: active ? 500 : 400, fontFamily: 'inherit', outline: 'none', ...style }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: '24px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {IconComponent
          ? <IconComponent size={20} color={iconColor || 'var(--color-icon-default)'} strokeWidth={2} />
          : currentIcon.endsWith('.svg')
            ? <img src={currentIcon} alt="" width={24} height={24} style={{ display: 'block' }} />
            : <span dangerouslySetInnerHTML={{ __html: currentIcon }} />
        }
      </div>
      <span style={{ marginLeft: '8px', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {badge && badge > 0 && <Counter count={badge} active={active} style={{ marginLeft: '8px' }} />}
      <div style={{ width: '20px', height: '20px', marginLeft: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (active || hovered) ? 1 : 0, transition: 'opacity 0.15s, color 0.15s', color: active ? 'var(--color-nav-active-text)' : 'var(--color-icon-default)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </button>
  )
}

export default SideNavItem
