'use client'

import { useState } from 'react'
import { CheckSquare, Square, ChevronRight } from 'lucide-react'

export interface ActionItem {
  id: string
  project_id: string
  user_id: string
  title: string
  detail: string
  source_chunk: string | null
  source_conversation_ids: string[]
  status: 'open' | 'done'
  created_at: string
  completed_at: string | null
  is_pinned?: boolean
  tags?: string[] | null
}

interface ActionItemCardProps {
  item: ActionItem
  conversations: { id: string; title: string }[]
  onToggleStatus: (id: string, status: 'open' | 'done') => void
  onOpen: (item: ActionItem) => void
  viewMode?: 'card' | 'list'
  sourceLabel?: string | null
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function ActionItemCard({
  item,
  conversations,
  onToggleStatus,
  onOpen,
  viewMode = 'list',
  sourceLabel,
}: ActionItemCardProps) {
  const [toggling, setToggling] = useState(false)

  const isDone = item.status === 'done'
  const threadCount = item.source_conversation_ids?.length ?? 0

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    try {
      await onToggleStatus(item.id, isDone ? 'open' : 'done')
    } finally {
      setToggling(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onOpen(item)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)',
          padding: '12px var(--spacing-4)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border-default)',
          backgroundColor: 'var(--color-surface-raised)',
          cursor: 'pointer',
          transition: 'var(--transition-base)',
          opacity: isDone ? 0.65 : 1,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
          e.currentTarget.style.borderColor = 'var(--color-border-strong)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
          e.currentTarget.style.borderColor = 'var(--color-border-default)'
        }}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, flexShrink: 0,
            color: isDone ? 'var(--color-status-success)' : 'var(--color-icon-subtle)',
            display: 'flex', alignItems: 'center',
          }}
          aria-label={isDone ? 'Mark as open' : 'Mark as done'}
        >
          {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>

        {/* Title */}
        <span style={{
          flex: 1,
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          fontFamily: 'var(--font-family-primary)',
          color: 'var(--color-text-title)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.title}
        </span>

        {/* Meta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
          flexShrink: 0,
        }}>
          {sourceLabel ? (
            <span style={{
              fontSize: '11px', color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-family-primary)',
              fontStyle: 'italic',
            }}>
              {sourceLabel}
            </span>
          ) : threadCount > 0 ? (
            <span style={{
              fontSize: '11px', color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              {threadCount === 1 ? '1 thread' : `${threadCount} threads`}
            </span>
          ) : null}
          <span style={{
            fontSize: '11px', color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family-primary)',
          }}>
            {formatDate(item.created_at)}
          </span>
          <StatusBadge status={item.status} />
          <ChevronRight size={14} style={{ color: 'var(--color-icon-subtle)' }} />
        </div>
      </div>
    )
  }

  // Card view
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border-default)',
        backgroundColor: 'var(--color-surface-raised)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'var(--transition-base)',
        opacity: isDone ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
      }}
    >
      {/* Accent bar */}
      <div style={{
        height: 3,
        backgroundColor: isDone
          ? 'var(--color-status-success)'
          : 'var(--color-primary-500)',
      }} />

      <div style={{ padding: 'var(--spacing-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)' }}>
          <button
            onClick={handleToggle}
            disabled={toggling}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, flexShrink: 0, marginTop: 2,
              color: isDone ? 'var(--color-status-success)' : 'var(--color-icon-subtle)',
              display: 'flex', alignItems: 'center',
            }}
            aria-label={isDone ? 'Mark as open' : 'Mark as done'}
          >
            {isDone ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <p style={{
            margin: 0, flex: 1,
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)',
            color: 'var(--color-text-title)',
            textDecoration: isDone ? 'line-through' : 'none',
            lineHeight: 1.4,
          }}>
            {item.title}
          </p>
        </div>

        {/* Detail snippet */}
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-family-primary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.detail}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--color-border-subtle)',
        padding: '8px var(--spacing-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-primary)', fontStyle: sourceLabel ? 'italic' : 'normal' }}>
          {sourceLabel ?? (threadCount > 0 ? (threadCount === 1 ? '1 thread' : `${threadCount} threads`) : '')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-primary)' }}>
            {formatDate(item.created_at)}
          </span>
          <StatusBadge status={item.status} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'open' | 'done' }) {
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 'var(--font-weight-semibold)',
      fontFamily: 'var(--font-family-primary)',
      padding: '2px 7px',
      borderRadius: '999px',
      backgroundColor: status === 'done'
        ? 'var(--color-status-success-bg)'
        : 'var(--color-primary-light)',
      color: status === 'done'
        ? 'var(--color-status-success)'
        : 'var(--color-primary-500)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {status}
    </span>
  )
}
