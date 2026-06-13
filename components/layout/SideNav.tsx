import React, { useState, useRef } from 'react'
import { SideNavHeader } from './SideNavHeader'
import { SideNavItem } from './SideNavItem'
import { UserSection } from './UserSection'
import { UserMenu } from './UserMenu'
import { SideNavSearch } from './SideNavSearch'
import type { UserInfo } from './UserSection'

export type { UserInfo } from './UserSection'

export interface SideNavItemData {
  id: string
  label: string
  icon: string
  iconComponent?: React.ElementType
  iconColor?: string
  active?: boolean
  badge?: number
  onClick?: () => void
}

export interface SideNavProps {
  items: SideNavItemData[]
  user?: UserInfo
  userId?: string
  appName?: string
  defaultCollapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
  onUserClick?: () => void
  onSignOut?: () => void
  onSettingsClick?: () => void
  className?: string
  style?: React.CSSProperties
  subscriptionTier?: import('../../lib/tier-limits').SubscriptionTier
}

export const SideNav: React.FC<SideNavProps> = ({
  items = [], user, userId, appName = 'ThreadCub', defaultCollapsed = false,
  onCollapseChange, onUserClick, onSignOut = () => {}, onSettingsClick = () => {},
  className = '', style, subscriptionTier = 'free'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const userSectionRef = useRef<HTMLDivElement>(null)

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
    if (newCollapsed) setIsMenuOpen(false)
  }

  const handleUserSectionClick = () => {
    setIsMenuOpen(!isMenuOpen)
    onUserClick?.()
  }

  return (
    <div
      className={className}
      style={{
        width: isCollapsed ? '64px' : '280px',
        height: '100%',
        backgroundColor: 'transparent',
        
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <SideNavHeader isCollapsed={isCollapsed} onToggle={handleToggleCollapse} appName={appName} />
      <div style={{ padding: isCollapsed ? '4px 8px' : '4px 8px 0' }}>
        <SideNavSearch collapsed={isCollapsed} onExpand={() => { setIsCollapsed(false); onCollapseChange?.(false) }} />
      </div>
      <nav style={{ flex: 1, padding: '4px 8px 8px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', overflowX: 'hidden' }}>
        {items.map((item) => (
          <SideNavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            iconComponent={item.iconComponent}
            iconColor={item.iconColor}
            active={item.active}
            badge={item.badge}
            collapsed={isCollapsed}
            onClick={item.onClick}
          />
        ))}

      </nav>
      {user != null && (
        <UserMenu
          userEmail={user.email}
          userName={user.name}
          userAvatar={user.avatar}
          isOpen={isMenuOpen}
          isCollapsed={isCollapsed}
          userSectionRef={userSectionRef}
          onSettingsClick={() => { setIsMenuOpen(false); onSettingsClick() }}
          onSignOutClick={() => { setIsMenuOpen(false); onSignOut() }}
          onUserSectionClick={() => setIsMenuOpen(false)}
        />
      )}
      {user != null && (
        <div ref={userSectionRef}>
        <UserSection
          userName={user.name}
          userAvatar={user.avatar}
          isMenuOpen={isMenuOpen}
          onClick={handleUserSectionClick}
          subscriptionTier={subscriptionTier}
          collapsed={isCollapsed}
        />
        </div>
      )}
    </div>
  )
}

export default SideNav