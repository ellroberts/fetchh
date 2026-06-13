'use client'
import React from 'react'
import { OverflowMenu, type OverflowMenuProps } from './OverflowMenu'
import { Trash2, FileText, FileType, File, Eye, Download } from 'lucide-react'
import { Checkbox } from '@/components/Checkbox'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LibraryDoc {
  id: string
  title: string
  file_name: string
  file_type: string
  word_count: number
  tags: string[]
  created_at: string
}

export interface LibraryCardProps {
  doc: LibraryDoc
  viewMode?: 'card' | 'list'
  selectable?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onOpen?: (doc: LibraryDoc) => void
  onDownload?: (doc: LibraryDoc) => void
  onDelete?: (doc: LibraryDoc) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, React.ElementType> = {
  md:   FileText,
  txt:  FileText,
  docx: FileType,
  pdf:  File,
}

const FILE_COLORS: Record<string, string> = {
  md:   'var(--color-accent-teal)',
  txt:  'var(--color-accent-blue)',
  docx: 'var(--color-accent-amber)',
  pdf:  'var(--color-accent-rose)',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

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

// ─── Card base styles ─────────────────────────────────────────────────────────

const cardBaseStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  borderRadius: 'var(--border-radius-lg)',
  boxShadow: 'none',
  fontFamily: 'var(--font-family-primary)',
  transition: 'var(--transition-base)',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LibraryCard({
  doc,
  viewMode = 'list',
  selectable = true,
  isSelected = false,
  onSelect,
  onOpen,
  onDownload,
  onDelete,
}: LibraryCardProps) {
  const Icon = FILE_ICONS[doc.file_type] || File
  const color = FILE_COLORS[doc.file_type] || 'var(--color-text-muted)'
  const date = formatDate(doc.created_at)

  const overflowItems = [
    onOpen && {
      label: 'View Details',
      icon: <Eye size={14} />,
      onClick: () => onOpen(doc),
    },
    onDownload && {
      label: 'Download',
      icon: <Download size={14} />,
      onClick: () => onDownload(doc),
    },
    onDelete && {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => onDelete(doc),
      danger: true,
    },
  ].filter(Boolean) as OverflowMenuProps['items']

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
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
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
          e.currentTarget.style.border = '1px solid var(--color-border-inverse)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.border = '1px solid var(--color-border-default)'
        }}
        onClick={() => onOpen?.(doc)}
      >
        {/* Checkbox */}
        {selectable && (
          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect?.()}
            />
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-title)',
            fontFamily: 'var(--font-family-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            marginBottom: 'var(--spacing-2)',
          }}>
            {doc.title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {date}
            </span>
            <StatDot />
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              .{doc.file_type}
            </span>
          </div>
        </div>

        {/* Overflow menu */}
        <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <OverflowMenu items={overflowItems} />
        </div>
      </div>
    )
  }

  // ── Card view ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        ...cardBaseStyle,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-3)',
        padding: 'var(--spacing-4)',
        border: '1px solid var(--color-border-default)',
        outline: isSelected ? '2px solid var(--color-primary-500)' : undefined,
        outlineOffset: isSelected ? '0px' : undefined,
        cursor: 'pointer',
      }}
      onClick={() => onOpen?.(doc)}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = '1px solid var(--color-border-inverse)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = '1px solid var(--color-border-default)'
      }}
    >
      {/* Checkbox + overflow row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {selectable && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={isSelected} onChange={() => onSelect?.()} />
          </div>
        )}
        <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
          <OverflowMenu items={overflowItems} />
        </div>
      </div>

      {/* Title */}
      <span style={{
        fontWeight: 'var(--font-weight-semibold)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-title)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {doc.title}
      </span>

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{date}</span>
        <StatDot />
        <span style={{
          fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          .{doc.file_type}
        </span>
      </div>
    </div>
  )
}
