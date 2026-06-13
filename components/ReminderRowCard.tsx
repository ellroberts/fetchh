'use client'

import React from 'react'
import { CornerDownLeft, Eye, StickyNote, Tag } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { OverflowMenu } from '@/components/OverflowMenu'
import { Badge } from '@/components/Badge'
import { PRESET_TAGS } from '@/components/TagPicker'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatDot() {
  return (
    <span style={{
      width: '3px',
      height: '3px',
      borderRadius: '50%',
      backgroundColor: 'var(--color-border-subtle)',
      flexShrink: 0,
      display: 'inline-block',
    }} />
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`

  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`

  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderRowCardProps {
  id: string
  content: string
  note?: string
  tag?: string
  status?: 'open' | 'done'
  createdAt: string
  onJumpBack?: () => void
  onViewDetails?: () => void
  onEditNote?: () => void
  onEditTag?: () => void
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

function getTagLabel(tag: string): string {
  return PRESET_TAGS.find(t => t.value === tag)?.label ?? tag
}

export function ReminderRowCard({
  content,
  note,
  tag,
  status: _status,
  createdAt,
  onJumpBack,
  onViewDetails,
  onEditNote,
  onEditTag,
  className,
}: ReminderRowCardProps) {
  const date = formatDate(createdAt)

  const overflowItems = [
    onViewDetails && {
      label: 'View details',
      icon: <Eye size={14} />,
      onClick: onViewDetails,
    },
    onEditNote && {
      label: note ? 'Edit note' : 'Add note',
      icon: <StickyNote size={14} />,
      onClick: onEditNote,
    },
    onEditTag && {
      label: tag ? 'Edit tag' : 'Add tag',
      icon: <Tag size={14} />,
      onClick: onEditTag,
    },
  ].filter(Boolean) as React.ComponentProps<typeof OverflowMenu>['items']

  return (
    <div className={['jump-row-card', className].filter(Boolean).join(' ')}>
      <div className="jump-row-card__body" onClick={onViewDetails}>
        <span className="jump-row-card__content">{content}</span>
        {tag && <Badge variant="base" size="sm" style={{ marginTop: '4px' }}>{getTagLabel(tag)}</Badge>}
        {note && <div className="jump-row-card__note">{note}</div>}
        <div className="jump-row-card__meta">
          <span suppressHydrationWarning className="jump-row-card__meta-text">{date}</span>
        </div>
      </div>
      <div className="jump-row-card__actions">
        <IconButton size="sm" tooltip="Jump back" onClick={onJumpBack}>
          <CornerDownLeft size={14} />
        </IconButton>
        <OverflowMenu items={overflowItems} />
      </div>
    </div>
  )
}

export default ReminderRowCard
