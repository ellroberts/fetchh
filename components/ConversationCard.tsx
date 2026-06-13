'use client'

import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { OverflowMenu, type OverflowMenuProps } from './OverflowMenu'
import { Play, MoreHorizontal, Eye, Download, Trash2, FolderPlus, Search, Clock, MessageSquare, Sparkles, Pencil, FileText, FileCode, FileJson, Pin, PinOff, CornerDownLeft } from 'lucide-react'
import { EmbedStatus } from '@/components/EmbedStatus'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Checkbox } from '@/components/Checkbox'
import { IconButton } from '@/components/IconButton'

function StatDot() {
  return (
    <span style={{
      width: '3px', height: '3px',
      borderRadius: '50%',
      backgroundColor: 'var(--color-border-subtle)',
      flexShrink: 0,
      display: 'inline-block',
    }} />
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  title: string
  platform?: string
  source?: string
  message_count?: number
  created_at: string
  has_embeddings?: boolean
  project_id?: string | null
  summary?: string
  quick_summary?: {
    overview?: string
    key_topics?: string[]
    problems_solved?: string[]
    reading_time_minutes?: number
  } | null
  user_id?: string | null
  is_pinned?: boolean
  tags?: string
  content?: any
  last_embedded_at?: string
  locked?: boolean
  parent_conversation_id?: string | null
  continuation_depth?: number
  url?: string | null
  metadata?: {
    source_created_at?: string | null
    source_url?: string | null
    [key: string]: unknown
  } | null
}

export interface ConversationCardProps {
  conversation?: Conversation
  viewMode?: 'card' | 'list'
  selectable?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onContinue?: (conversation: Conversation) => void
  onAnalyze?: (conversation: Conversation) => void
  onViewDetails?: (id: string) => void
  onAddToProject?: (conversation: Conversation) => void
  onDownload?: (conversation: Conversation, format?: import('@/lib/export-utils').ExportFormat) => void
  onDelete?: (conversation: Conversation) => void
  onRename?: (conversation: Conversation) => void
  onPin?: (conversation: Conversation, pinned: boolean) => void
  showHoverPin?: boolean
  showJumpBack?: boolean
  isAnalyzing?: boolean
  insightCount?: number
  pinCount?: number
  className?: string
  hideCheckbox?: boolean
  skeleton?: boolean
}

// ─── Card base styles ──────────────────────────────────────────────────────────

const cardBaseStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  borderRadius: 'var(--border-radius-lg)',
  boxShadow: 'none',
  fontFamily: 'var(--font-family-primary)',
  transition: 'var(--transition-base)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlatformVariant(platform: string): 'info' | 'success' | 'warning' | 'base' {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('claude') || p.includes('anthropic')) return 'info'
  if (p.includes('chatgpt') || p.includes('openai')) return 'success'
  if (p.includes('gemini') || p.includes('google')) return 'warning'
  return 'base'
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

function getPreviewText(conversation: Conversation): string {
  if (conversation.quick_summary?.overview) return conversation.quick_summary.overview
  if (conversation.summary) return conversation.summary
  return 'Click to view conversation details'
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function SelectCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation() }}
      style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}
    >
      <Checkbox checked={checked} onChange={() => onChange()} size="sm" />
    </div>
  )
}

// ─── Lock Tooltip ─────────────────────────────────────────────────────────────

function LockBadge() {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ fontSize: '16px', cursor: 'default', userSelect: 'none' }}>🔒</span>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          right: 0,
          backgroundColor: 'var(--color-surface-inverse)',
          color: 'var(--color-page-bg)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-family-primary)',
          padding: '6px 10px',
          borderRadius: 'var(--border-radius-base)',
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: 'var(--shadow-card-hover)',
          pointerEvents: 'none',
        }}>
          Upgrade your plan to access this conversation
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '6px',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid var(--color-surface-inverse)',
          }} />
        </div>
      )}
    </div>
  )
}

// ─── Fetching Tooltip ─────────────────────────────────────────────────────────

function FetchingTooltip({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--color-surface-inverse)',
      color: 'var(--color-page-bg)',
      fontSize: 'var(--font-size-xs)',
      fontFamily: 'var(--font-family-primary)',
      padding: '6px 10px',
      borderRadius: 'var(--border-radius-base)',
      whiteSpace: 'nowrap',
      zIndex: 100,
      boxShadow: 'var(--shadow-card-hover)',
      pointerEvents: 'none',
    }}>
      Just gather all the messages to this thread
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid var(--color-surface-inverse)',
      }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConversationCard({
  conversation,
  viewMode = 'list',
  selectable = false,
  isSelected = false,
  onSelect,
  onContinue,
  onAnalyze,
  onViewDetails,
  onAddToProject,
  onDownload,
  onDelete,
  onRename,
  onPin,
  showHoverPin = false,
  showJumpBack = false,
  isAnalyzing = false,
  insightCount,
  pinCount = 0,
  className,
  hideCheckbox = false,
  skeleton = false,
}: ConversationCardProps) {

  // ─── Skeleton variant ────────────────────────────────────────────────────────
  if (skeleton) {
    const shimmer: React.CSSProperties = {
      backgroundColor: 'var(--color-border-subtle)',
      borderRadius: 'var(--border-radius-sm)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }

    if (viewMode === 'list') {
      return (
        <div
          className={className}
          style={{
            ...cardBaseStyle,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            border: '1px solid var(--color-border-subtle)',
            minHeight: 84,
          }}
        >
          {!hideCheckbox && (
            <div style={{ ...shimmer, width: 16, height: 16, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...shimmer, width: '55%', height: 14, marginBottom: 10 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...shimmer, width: 80, height: 12, borderRadius: 10 }} />
              <StatDot />
              <div style={{ ...shimmer, width: 60, height: 12, borderRadius: 10 }} />
              <StatDot />
              <div style={{ ...shimmer, width: 70, height: 12, borderRadius: 10 }} />
              <StatDot />
              <div style={{ ...shimmer, width: 55, height: 12, borderRadius: 10 }} />
            </div>
          </div>
          <div style={{ ...shimmer, width: 20, height: 20, flexShrink: 0 }} />
        </div>
      )
    }

    return (
      <div
        className={className}
        style={{
          ...cardBaseStyle,
          border: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...shimmer, width: '60%', height: 15, marginBottom: 8 }} />
            <div style={{ ...shimmer, width: '30%', height: 13 }} />
          </div>
          <div style={{ ...shimmer, width: 20, height: 20 }} />
        </div>
        <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px' }}>
          <div style={{ ...shimmer, width: 16, height: 16, borderRadius: 4 }} />
          <div style={{ ...shimmer, width: 24, height: 13 }} />
          <StatDot />
          <div style={{ ...shimmer, width: 16, height: 16, borderRadius: 4 }} />
          <div style={{ ...shimmer, width: 20, height: 13 }} />
        </div>
      </div>
    )
  }

  // ─── Real component ───────────────────────────────────────────────────────────

  const platform = conversation!.platform || conversation!.source || 'Unknown'
  const date = formatDate(conversation!.metadata?.source_created_at || conversation!.created_at)
  const preview = getPreviewText(conversation!)
  const locked = conversation!.locked ?? false
  const fetching = false
  const [showFetchingTooltip, setShowFetchingTooltip] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleViewDetails = () => {
    onViewDetails?.(conversation!.id)
  }

  const overflowItems = [
    onPin && {
      label: conversation!.is_pinned ? 'Unpin' : 'Pin',
      icon: conversation!.is_pinned ? <PinOff size={14} /> : <Pin size={14} />,
      onClick: () => onPin(conversation!, !conversation!.is_pinned),
    },
    onRename && {
      label: 'Rename',
      icon: <Pencil size={16} />,
      onClick: () => onRename(conversation!),
    },
    onViewDetails && {
      label: 'View Details',
      icon: <Eye size={14} />,
      onClick: handleViewDetails,
    },
    onAddToProject && !conversation!.project_id && {
      label: 'Add to Project',
      icon: <FolderPlus size={14} />,
      onClick: () => onAddToProject(conversation!),
    },
    onDownload && {
      label: 'Download As…',
      icon: <Download size={14} />,
      chevron: true,
      submenu: [
        {
          label: 'Plain Text',
          icon: <FileText size={14} />,
          onClick: () => onDownload(conversation!, 'txt'),
        },
        {
          label: 'Markdown',
          icon: <FileCode size={14} />,
          onClick: () => onDownload(conversation!, 'markdown'),
        },
        {
          label: 'JSON',
          icon: <FileJson size={14} />,
          onClick: () => onDownload(conversation!, 'json'),
        },
      ],
    },
    onDelete && {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => onDelete(conversation!),
      danger: true,
    },
  ].filter(Boolean) as OverflowMenuProps['items']

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={className}
        style={{
          ...cardBaseStyle,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)',
          padding: 'var(--spacing-3) var(--spacing-4)',
          border: '1px solid var(--color-border-default)',
          outline: isSelected ? '2px solid var(--color-primary-500)' : undefined,
          outlineOffset: isSelected ? '0px' : undefined,
          opacity: locked ? 0.5 : 1,
          pointerEvents: locked ? 'none' : undefined,
          minHeight: 84,
        }}
        onMouseEnter={(e) => {
          if (locked) return
          if (showHoverPin || showJumpBack) setIsHovered(true)
          e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
          e.currentTarget.style.border = '1px solid var(--color-border-inverse)'
        }}
        onMouseLeave={(e) => {
          if (locked) return
          if (showHoverPin || showJumpBack) setIsHovered(false)
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.border = '1px solid var(--color-border-default)'
        }}
      >
        {selectable && onSelect && !hideCheckbox && (
          <SelectCheckbox checked={isSelected} onChange={onSelect} />
        )}

        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={handleViewDetails}
        >
          <span style={{
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--color-text-title)',
            fontFamily: 'var(--font-family-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            marginBottom: '6px',
          }}>
            {conversation!.title || 'Untitled Conversation'}
            {conversation!.continuation_depth && conversation!.continuation_depth > 0 ? (
              <span style={{
                display: 'inline-block',
                marginLeft: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '1px 5px',
                verticalAlign: 'middle',
              }}>cont {conversation!.continuation_depth}</span>
            ) : null}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span suppressHydrationWarning style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              <Clock size={13} />
              {date}
            </span>
            {conversation!.message_count && (
              <>
                <StatDot />
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  <MessageSquare size={13} />
                  {conversation!.message_count} messages
                </span>
              </>
            )}
            {(() => { const n = insightCount ?? pinCount; return n > 0 ? (
              <>
                <StatDot />
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  <Sparkles size={13} style={{ color: 'var(--color-accent-amber)' }} />
                  {n} {n === 1 ? 'insight' : 'insights'}
                </span>
              </>
            ) : null })()}
            {!locked && conversation!.has_embeddings && (
              <>
                <StatDot />
                <EmbedStatus hasEmbeddings={conversation!.has_embeddings} createdAt={conversation!.created_at} showTimer />
              </>
            )}
          </div>
        </div>

        {locked && <LockBadge />}

        {!locked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexShrink: 0 }}>
            {onAnalyze && (
              <Button variant="secondary" size="sm" onClick={() => onAnalyze(conversation!)} disabled={isAnalyzing} loading={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
            )}
            {onContinue && !showJumpBack && (
              <Button variant="primary" size="sm" icon={<Play />} onClick={() => onContinue(conversation!)}>
                Continue
              </Button>
            )}
            {isHovered && showJumpBack && (
              <IconButton size="sm" tooltip="Jump back" onClick={() => onContinue ? onContinue(conversation!) : handleViewDetails()}>
                <CornerDownLeft size={14} />
              </IconButton>
            )}
            {showHoverPin && onPin && (isHovered || conversation!.is_pinned) && (
              <button
                onClick={(e) => { e.stopPropagation(); onPin(conversation!, !conversation!.is_pinned) }}
                title={conversation!.is_pinned ? 'Unpin' : 'Pin'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, border: 'none', borderRadius: 'var(--border-radius-sm)',
                  background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0,
                  color: conversation!.is_pinned ? 'var(--color-primary-500)' : 'var(--color-icon-subtle)',
                }}
              >
                {conversation!.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
            )}
            <OverflowMenu items={overflowItems} />
          </div>
        )}
      </div>
    )
  }

  // ── Card view ──────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        ...cardBaseStyle,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--color-border-default)',
        outline: isSelected ? '2px solid var(--color-primary-500)' : undefined,
        outlineOffset: isSelected ? '0px' : undefined,
        opacity: locked ? 0.5 : 1,
        pointerEvents: locked ? 'none' : undefined,
      }}
      onMouseEnter={(e) => {
        if (locked) return
        if (showHoverPin) setIsHovered(true)
        e.currentTarget.style.border = '1px solid var(--color-border-inverse)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
      }}
      onMouseLeave={(e) => {
        if (locked) return
        if (showHoverPin) setIsHovered(false)
        e.currentTarget.style.border = '1px solid var(--color-border-default)'
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
        {selectable && onSelect && !hideCheckbox && (
          <SelectCheckbox checked={isSelected} onChange={onSelect} />
        )}
        <div onClick={handleViewDetails} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <p style={{
            fontWeight: 600, fontSize: '15px',
            color: 'var(--color-text-title)',
            fontFamily: 'var(--font-family-primary)',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {conversation!.title || 'Untitled Conversation'}
            {conversation!.continuation_depth && conversation!.continuation_depth > 0 ? (
              <span style={{
                display: 'inline-block',
                marginLeft: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '1px 5px',
                verticalAlign: 'middle',
              }}>cont {conversation!.continuation_depth}</span>
            ) : null}
          </p>
          <p suppressHydrationWarning style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-family-primary)',
            margin: '3px 0 0',
          }}>
            {date}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexShrink: 0 }}>
          {showHoverPin && onPin && (isHovered || conversation!.is_pinned) && (
            <button
              onClick={() => onPin(conversation!, !conversation!.is_pinned)}
              title={conversation!.is_pinned ? 'Unpin' : 'Pin'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, border: 'none', borderRadius: 'var(--border-radius-sm)',
                background: 'transparent', cursor: 'pointer', padding: 0,
                color: conversation!.is_pinned ? 'var(--color-primary-500)' : 'var(--color-icon-subtle)',
              }}
            >
              {conversation!.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          )}
          <OverflowMenu items={overflowItems} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border-default)' }} />

      {/* Stats row */}
      <div onClick={handleViewDetails} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '16px 20px',
        cursor: 'pointer',
      }}>
        <MessageSquare size={14} style={{ color: 'var(--color-accent-blue)' }} />
        <span style={{
          fontSize: '14px', fontWeight: 600,
          color: 'var(--color-text-title)',
          fontFamily: 'var(--font-family-primary)',
        }}>
          {conversation!.message_count ?? 0}
        </span>
        {(() => { const n = insightCount ?? pinCount; return n > 0 ? (
          <>
            <StatDot />
            <Sparkles size={14} style={{ color: 'var(--color-accent-amber)' }} />
            <span style={{
              fontSize: '14px', fontWeight: 600,
              color: 'var(--color-text-title)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              {n}
            </span>
          </>
        ) : null })()}
        {!locked && conversation!.has_embeddings && (
          <>
            <StatDot />
            <EmbedStatus hasEmbeddings={conversation!.has_embeddings} createdAt={conversation!.created_at} showTimer />
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border-default)' }} />
    </div>
  )
}

export default ConversationCard