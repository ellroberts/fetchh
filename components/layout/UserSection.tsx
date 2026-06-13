import React from 'react'
import { UserRound } from 'lucide-react'
import { formatTierBadge, type SubscriptionTier } from '../../lib/tier-limits'

export interface UserInfo {
  name: string
  email: string
  avatar?: string
  plan?: string
}

export interface UserSectionProps {
  userName: string
  userAvatar?: string
  isMenuOpen: boolean
  onClick: () => void
  subscriptionTier?: SubscriptionTier
  collapsed?: boolean
}

export const UserSection: React.FC<UserSectionProps> = ({
  userName, userAvatar, isMenuOpen, onClick, subscriptionTier = 'free', collapsed = false
}) => {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (collapsed) {
    return (
      <div style={{ padding: '8px' }}>
        <button onClick={onClick}
          style={{ width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit', outline: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-nav-active)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <UserRound width={20} height={20} style={{ color: 'var(--color-icon-default)', flexShrink: 0 }} />
        </button>
      </div>
    )
  }

  // Expanded — 8px padding wrapper to match nav items
  // Inner button: 48px tall, 6px top/bottom, 8px sides
  // Avatar 40px | 8px gap | text (flex) | 8px gap | 20px chevron
  return (
    <div style={{ padding: '8px' }}>
      <button onClick={onClick}
        style={{ width: '100%', height: '56px', padding: '6px 12px', display: 'flex', alignItems: 'center', backgroundColor: isMenuOpen ? 'var(--color-nav-active)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit', outline: 'none' }}
        onMouseEnter={(e) => { if (!isMenuOpen) e.currentTarget.style.backgroundColor = 'var(--color-nav-hover)' }}
        onMouseLeave={(e) => { if (!isMenuOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {/* Icon */}
        <UserRound width={20} height={20} style={{ color: 'var(--color-icon-default)', flexShrink: 0 }} />
        {/* Text */}
        <div style={{ marginLeft: '10px', flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-icon-default)' }}>{formatTierBadge(subscriptionTier)} plan</div>
        </div>
        {/* Chevron 20px */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ marginLeft: '8px', flexShrink: 0, color: 'var(--color-icon-default)', transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
    </div>
  )
}

export default UserSection
