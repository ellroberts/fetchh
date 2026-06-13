'use client'
import { createSupabaseClient } from '../lib/supabase'

interface LibraryDocument {
  id: string
  title: string
  file_name: string
  file_type: string
  word_count: number
  tags: string[]
  created_at: string
  content: string
}

interface LibraryDrawerProps {
  doc: LibraryDocument
  onClose: () => void
  onDeleted: () => void
}

const FILE_COLORS: Record<string, string> = {
  md:   'var(--color-accent-teal)',
  txt:  'var(--color-accent-blue)',
  docx: 'var(--color-accent-amber)',
  pdf:  'var(--color-accent-rose)',
}

export function LibraryDrawer({ doc, onClose, onDeleted }: LibraryDrawerProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header — matches ThreadDrawer sticky header style */}
      <div style={{
        flexShrink: 0,
        padding: 'var(--spacing-5) var(--spacing-6) var(--spacing-4)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <h2 style={{
          margin: '0 0 var(--spacing-2)',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-title)',
          fontFamily: 'var(--font-family-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{doc.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <span style={{
            fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
            color: FILE_COLORS[doc.file_type] || 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>.{doc.file_type}</span>
          <span style={{ color: 'var(--color-border-default)', fontSize: 'var(--font-size-xs)' }}>·</span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
            {formatDate(doc.created_at)}
          </span>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px var(--spacing-6) var(--spacing-8)' }}>
        <pre style={{
          margin: 0,
          fontFamily: 'var(--font-family-primary, inherit)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 1.75,
          color: 'var(--color-text-body)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>{doc.content}</pre>
      </div>
    </div>
  )
}
