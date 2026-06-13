'use client'

import { useState } from 'react'
import { X, CheckSquare, Square, ExternalLink } from 'lucide-react'
import type { ReminderItem } from './ReminderCard'

interface ReminderDrawerProps {
  item: ReminderItem
  conversations: { id: string; title: string }[]
  onClose: () => void
  onToggleStatus: (id: string, status: 'open' | 'done') => void
  onOpenThread?: (conversationId: string, title: string) => void
}

const REMINDER_ACCENT = 'var(--color-status-warning, #f59e0b)'
const REMINDER_ACCENT_BG = 'var(--color-status-warning-bg, #fef3c7)'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function ReminderDrawer({
  item,
  conversations,
  onClose,
  onToggleStatus,
  onOpenThread,
}: ReminderDrawerProps) {
  const [toggling, setToggling] = useState(false)
  const isDone = item.status === 'done'

  const sourceConvs = (item.source_conversation_ids ?? [])
    .map(id => conversations.find(c => c.id === id))
    .filter((c): c is { id: string; title: string } => !!c)

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    try {
      await onToggleStatus(item.id, isDone ? 'open' : 'done')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-surface-base)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--color-border-default)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <button
            onClick={handleToggle}
            disabled={toggling}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: isDone ? 'var(--color-status-success)' : REMINDER_ACCENT,
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
            aria-label={isDone ? 'Mark as open' : 'Mark as done'}
          >
            {isDone ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Reminder
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 'var(--spacing-1)', borderRadius: 'var(--border-radius-base)',
            color: 'var(--color-icon-default)', display: 'flex', alignItems: 'center',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Title */}
        <div>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)',
            color: 'var(--color-text-title)',
            lineHeight: 1.35,
            textDecoration: isDone ? 'line-through' : 'none',
            opacity: isDone ? 0.65 : 1,
          }}>
            {item.title}
          </h2>
          <p style={{
            margin: '6px 0 0',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family-primary)',
          }}>
            Created {formatDate(item.created_at)}
            {item.completed_at && ` · Completed ${formatDate(item.completed_at)}`}
          </p>
        </div>

        {/* Detail */}
        <section>
          <SectionLabel>Steps / how to do it</SectionLabel>
          <p style={{
            margin: 0,
            fontSize: 'var(--font-size-base)',
            lineHeight: 1.65,
            color: 'var(--color-text-body)',
            fontFamily: 'var(--font-family-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {item.detail}
          </p>
        </section>

        {/* Source excerpt */}
        {item.source_chunk && (
          <section>
            <SectionLabel>From your threads</SectionLabel>
            <blockquote style={{
              margin: 0,
              padding: '12px 16px',
              borderLeft: `3px solid ${REMINDER_ACCENT}`,
              backgroundColor: REMINDER_ACCENT_BG,
              borderRadius: '0 var(--border-radius-base) var(--border-radius-base) 0',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--color-text-body)',
              fontFamily: 'var(--font-family-primary)',
              fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {item.source_chunk}
            </blockquote>
          </section>
        )}

        {/* Source threads */}
        {sourceConvs.length > 0 && (
          <section>
            <SectionLabel>Source threads</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {sourceConvs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => onOpenThread?.(conv.id, conv.title)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--spacing-2)',
                    padding: '10px 14px',
                    borderRadius: 'var(--border-radius-base)',
                    border: '1px solid var(--color-border-default)',
                    backgroundColor: 'var(--color-surface-raised)',
                    cursor: onOpenThread ? 'pointer' : 'default',
                    textAlign: 'left',
                    fontFamily: 'var(--font-family-primary)',
                    transition: 'var(--transition-base)',
                  }}
                  onMouseEnter={e => {
                    if (onOpenThread) {
                      e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
                      e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
                    e.currentTarget.style.borderColor = 'var(--color-border-default)'
                  }}
                >
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {conv.title}
                  </span>
                  {onOpenThread && (
                    <ExternalLink size={14} style={{ color: 'var(--color-icon-subtle)', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Mark complete CTA */}
        <div style={{
          padding: '16px',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-3)',
        }}>
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family-primary)',
            color: 'var(--color-text-body)',
          }}>
            {isDone ? 'This reminder is noted.' : 'Ready to mark this done?'}
          </span>
          <button
            onClick={handleToggle}
            disabled={toggling}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--border-radius-base)',
              border: isDone ? '1px solid var(--color-border-default)' : 'none',
              cursor: toggling ? 'not-allowed' : 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
              backgroundColor: isDone ? 'var(--color-surface-base)' : REMINDER_ACCENT,
              color: isDone ? 'var(--color-text-muted)' : 'white',
              transition: 'var(--transition-base)',
              opacity: toggling ? 0.6 : 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {toggling ? '…' : isDone ? 'Mark open' : 'Mark done'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '0 0 10px',
      fontSize: '11px',
      fontWeight: 'var(--font-weight-semibold)',
      fontFamily: 'var(--font-family-primary)',
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {children}
    </p>
  )
}
