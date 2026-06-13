// components/DashboardSideCards.tsx
import React from 'react'
import { Plus, Highlighter, ListTodo, Bell } from 'lucide-react'
import { IconButton } from '@/components/IconButton'

// ─── Shared card shell ────────────────────────────────────────────────────────

interface SideCardShellProps {
  icon: React.ReactNode
  iconColor: string
  label: string
  count: number
  subLabel: React.ReactNode
  onAdd?: () => void
}

function SideCardShell({ icon, iconColor, label, count, subLabel, onAdd }: SideCardShellProps) {
  return (
    <div style={{
      position: 'relative',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-5)',
      fontFamily: 'var(--font-family-primary)',
      backgroundColor: 'transparent',
    }}>
      {onAdd && (
        <div style={{ position: 'absolute', top: 'var(--spacing-3)', right: 'var(--spacing-3)' }}>
          <IconButton size="sm" onClick={onAdd}>
            <Plus size={14} />
          </IconButton>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <div style={{ color: iconColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontSize: 'var(--font-size-3xl)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-title)',
        marginTop: 'var(--spacing-2)',
        lineHeight: 1,
      }}>
        {count}
      </div>

      <div style={{ marginTop: 'var(--spacing-1)', fontSize: 'var(--font-size-xs)' }}>
        {subLabel}
      </div>
    </div>
  )
}

// ─── HighlightsSideCard ───────────────────────────────────────────────────────

export interface HighlightsSideCardProps {
  count: number
  onAdd?: () => void
  onViewSummary?: () => void
}

export function HighlightsSideCard({ count, onAdd, onViewSummary }: HighlightsSideCardProps) {
  const subLabel = count > 0
    ? (
      <span
        onClick={onViewSummary}
        style={{
          color: 'var(--color-primary)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        View summary
      </span>
    )
    : (
      <span style={{ color: 'var(--color-text-muted)' }}>None saved yet</span>
    )

  return (
    <SideCardShell
      icon={<Highlighter size={16} />}
      iconColor="var(--color-accent-amber)"
      label="Highlights saved"
      count={count}
      subLabel={subLabel}
      onAdd={onAdd}
    />
  )
}

// ─── ActionsSideCard ──────────────────────────────────────────────────────────

export interface ActionsSideCardProps {
  count: number
  onAdd?: () => void
}

export function ActionsSideCard({ count, onAdd }: ActionsSideCardProps) {
  const subLabel = (
    <span style={{ color: 'var(--color-text-muted)' }}>
      {count > 0 ? 'From your threads' : 'None set yet'}
    </span>
  )

  return (
    <SideCardShell
      icon={<ListTodo size={16} />}
      iconColor="var(--color-accent-blue)"
      label="Actions set"
      count={count}
      subLabel={subLabel}
      onAdd={onAdd}
    />
  )
}

// ─── RemindersSideCard ────────────────────────────────────────────────────────

export interface RemindersSideCardProps {
  count: number
  onAdd?: () => void
}

export function RemindersSideCard({ count, onAdd }: RemindersSideCardProps) {
  const subLabel = (
    <span style={{ color: 'var(--color-text-muted)' }}>
      {count > 0 ? 'From your threads' : 'None set yet'}
    </span>
  )

  return (
    <SideCardShell
      icon={<Bell size={16} />}
      iconColor="var(--color-accent-teal)"
      label="Reminders set"
      count={count}
      subLabel={subLabel}
      onAdd={onAdd}
    />
  )
}
