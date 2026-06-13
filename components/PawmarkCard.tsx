// PawmarkCard - unified highlight, action, reminder card
'use client'

import React from 'react'
import { Clock, CornerDownLeft, Eye, MessageSquare, Pin, PinOff, SquarePen, Tag, Trash2 } from 'lucide-react'
import { OverflowMenu } from '@/components/OverflowMenu'
import { Badge } from '@/components/Badge'
import { IconButton } from '@/components/IconButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

export interface PawmarkCardProps {
  type: 'highlight' | 'action' | 'reminder'
  id?: string
  content?: string
  note?: string
  tag?: string
  /** Source conversation title shown in the meta row */
  sourceTitle?: string
  status?: 'open' | 'done'
  createdAt?: string
  /** Pre-computed relative time label; used instead of re-computing from createdAt when provided */
  timeAgo?: string
  onViewDetails?: () => void
  /** Called when the user picks "Add note" or "Edit note" from the overflow menu */
  onNote?: () => void
  /** Called when the user picks "Add tag" or "Edit tag" */
  onTag?: () => void
  /** Called when the user clicks the hover-only jump-back arrow */
  onJumpBack?: () => void
  /** Called when the user picks "Pin" or "Unpin" from the overflow menu */
  onPin?: () => void
  /** Whether this item is currently pinned */
  isPinned?: boolean
  /** Called when the user picks "Delete" from the overflow menu */
  onDelete?: () => void
  /** Colour of the tag pill — amber (default), rose, or teal */
  tagColour?: 'amber' | 'rose' | 'teal'
  className?: string
  /** When true, renders a shimmer skeleton instead of real content */
  skeleton?: boolean
}

// ─── Shimmer helper ───────────────────────────────────────────────────────────

const shimmer = (overrides?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: 'var(--color-border-subtle)',
  borderRadius: 'var(--border-radius-sm)',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  flexShrink: 0,
  ...overrides,
})

// ─── Component ────────────────────────────────────────────────────────────────

export function PawmarkCard({
  type,
  content,
  note,
  tag,
  sourceTitle,
  createdAt,
  timeAgo,
  onViewDetails,
  onNote,
  onTag,
  onJumpBack,
  onPin,
  isPinned = false,
  onDelete,
  tagColour = 'amber',
  className,
  skeleton = false,
}: PawmarkCardProps) {

  // ── Skeleton variant ───────────────────────────────────────────────────────
  if (skeleton) {
    return (
      <div
        className={['jump-row-card', className].filter(Boolean).join(' ')}
        style={{ minHeight: 84 }}
      >
        <div className="jump-row-card__body" style={{ pointerEvents: 'none' }}>
          {/* Title row */}
          <div className="jump-row-card__title-row">
            <div style={shimmer({ width: '55%', height: 14, borderRadius: 'var(--border-radius-sm)' })} />
          </div>
          {/* Meta row */}
          <div className="jump-row-card__meta" style={{ gap: 10 }}>
            <div style={shimmer({ width: 80, height: 12, borderRadius: 10 })} />
            <span className="jump-row-card__meta-sep">·</span>
            <div style={shimmer({ width: 110, height: 12, borderRadius: 10 })} />
          </div>
        </div>
        {/* Overflow placeholder */}
        <div className="jump-row-card__actions">
          <div style={shimmer({ width: 20, height: 20, borderRadius: 'var(--border-radius-sm)' })} />
        </div>
      </div>
    )
  }

  // ── Real variant ───────────────────────────────────────────────────────────
  const date = timeAgo ?? formatDate(createdAt!)

  const overflowItems = [
    onNote && {
      label: note ? 'Edit note' : 'Add note',
      icon: <SquarePen size={14} />,
      onClick: onNote,
    },
    onTag && {
      label: tag ? 'Edit tag' : 'Add tag',
      icon: <Tag size={14} />,
      onClick: onTag,
    },
    onPin && {
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
      onClick: onPin,
    },
    onViewDetails && {
      label: 'View details',
      icon: <Eye size={14} />,
      onClick: onViewDetails,
    },
    onDelete && {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: onDelete,
      danger: true,
    },
  ].filter(Boolean) as React.ComponentProps<typeof OverflowMenu>['items']

  return (
    <div
      className={['jump-row-card', className].filter(Boolean).join(' ')}
      style={{ minHeight: 84 }}
    >
      <div className="jump-row-card__body" onClick={onViewDetails}>
        {/* Title row: content + tag badge + note icon */}
        <div className="jump-row-card__title-row">
          <span className="jump-row-card__content">{content}</span>
          {tag && (
            <Badge variant="base" size="sm" style={
              tagColour === 'rose'
                ? { backgroundColor: 'var(--color-status-error-bg)', color: 'var(--color-status-error-text)' }
                : tagColour === 'teal'
                ? { backgroundColor: 'var(--color-accent-teal-muted)', color: 'var(--color-accent-teal-text)' }
                : { backgroundColor: 'var(--color-status-warning-bg)', color: 'var(--color-status-warning-text)' }
            }>{tag}</Badge>
          )}
          {note && <SquarePen size={13} className="jump-row-card__note-icon" />}
        </div>
        {note && <div className="jump-row-card__note">{note}</div>}
        {/* Metadata row: clock + time · message + source */}
        <div className="jump-row-card__meta">
          <span suppressHydrationWarning className="jump-row-card__meta-item">
            <Clock size={13} />
            {date}
          </span>
          <span className="jump-row-card__meta-sep">·</span>
          <span className="jump-row-card__meta-item">
            <MessageSquare size={13} />
            {sourceTitle ?? 'from chat'}
          </span>
        </div>
      </div>
      <div className="jump-row-card__actions">
        {onJumpBack && (
          <span className="jump-row-card__jump-back">
            <IconButton size="sm" tooltip="Jump back" onClick={onJumpBack}>
              <CornerDownLeft size={14} />
            </IconButton>
          </span>
        )}
        <OverflowMenu items={overflowItems} />
      </div>
    </div>
  )
}

export default PawmarkCard