// components/projects/ProjectInsightCard.tsx
'use client'

import { useState } from 'react'
import { InsightTag, TAG_CONFIG } from '@/lib/project-insight-types'

interface ProjectInsight {
  id: string
  content: string
  tag: InsightTag
  source_conversation_ids: string[]
  rag_query: string | null
  created_at: string
}

interface Conversation {
  id: string
  title: string
}

interface ProjectInsightCardProps {
  insight: ProjectInsight
  conversations: Conversation[]
  onDelete: (id: string) => void
  viewMode?: 'card' | 'list'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProjectInsightCard({ insight, conversations, onDelete, viewMode = 'card' }: ProjectInsightCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const config = TAG_CONFIG[insight.tag]
  const sourceTitles = insight.source_conversation_ids
    .map(id => conversations.find(c => c.id === id)?.title)
    .filter(Boolean) as string[]

  const isLong = insight.content.length > 200

  return (
    <div
      style={{
        borderRadius: 'var(--border-radius-lg)',
        border: `1px solid ${config.color}33`,
        backgroundColor: 'var(--color-surface-raised)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'var(--transition-base)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)' }}
    >
      {/* Colour bar */}
      <div style={{ height: 4, backgroundColor: config.color }} />

      <div style={{ padding: 'var(--spacing-4)', flex: 1 }}>
        {/* Tag + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-family-primary)',
            color: config.color, backgroundColor: config.bg,
            padding: '2px 8px', borderRadius: '999px',
          }}>
            {config.emoji} {config.label}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-primary)' }}>
            {formatDate(insight.created_at)}
          </span>
        </div>

        {/* Content */}
        <p style={{
          fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text-body)',
          fontFamily: 'var(--font-family-primary)', margin: 0,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          ...(!expanded && isLong ? {
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } : {}),
        }}>
          {insight.content}
        </p>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: 6, fontSize: '12px', color: 'var(--color-primary-500)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-family-primary)', padding: 0,
            }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* RAG query source */}
        {insight.rag_query && (
          <div style={{
            marginTop: 'var(--spacing-3)', padding: '6px 10px',
            backgroundColor: 'var(--color-state-hover-bg)', borderRadius: 'var(--border-radius-base)',
            borderLeft: `3px solid ${config.color}66`,
          }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, fontFamily: 'var(--font-family-primary)' }}>
              <span style={{ fontWeight: 600 }}>Asked:</span> {insight.rag_query}
            </p>
          </div>
        )}

        {/* Source threads */}
        {sourceTitles.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-2)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sourceTitles.slice(0, 3).map((title, i) => (
              <span key={i} style={{
                fontSize: '11px', color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-state-hover-bg)', padding: '2px 6px',
                borderRadius: '4px', fontFamily: 'var(--font-family-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 160,
              }}>
                {title}
              </span>
            ))}
            {sourceTitles.length > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-primary)' }}>
                +{sourceTitles.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--color-border-default)',
        padding: '8px var(--spacing-4)',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        {showConfirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-primary)' }}>Delete this insight?</span>
            <button
              onClick={() => onDelete(insight.id)}
              style={{
                fontSize: '12px', color: 'white', backgroundColor: 'var(--color-status-error)',
                border: 'none', borderRadius: 'var(--border-radius-base)', padding: '3px 10px',
                cursor: 'pointer', fontFamily: 'var(--font-family-primary)',
              }}
            >
              Delete
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              style={{
                fontSize: '12px', color: 'var(--color-text-muted)', background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmDelete(true)}
            style={{
              fontSize: '12px', color: 'var(--color-text-muted)', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-status-error)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)' }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}