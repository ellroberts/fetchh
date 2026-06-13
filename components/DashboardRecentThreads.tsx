// components/DashboardRecentThreads.tsx
'use client'

import React from 'react'

interface RecentThread {
  id: string
  title: string
  platform: string
  message_count: number
  created_at: string
}

interface DashboardRecentThreadsProps {
  threads: RecentThread[]
  onThreadClick?: (id: string) => void
}

const PLATFORM_COLORS: Record<string, string> = { 'claude.ai': '#D97757', 'claude': '#D97757', 'chatgpt': '#10a37f', 'gemini': '#4285F4', 'grok': '#1DA1F2' }
const PLATFORM_LABELS: Record<string, string> = { 'claude.ai': 'Claude', 'claude': 'Claude', 'chatgpt': 'ChatGPT', 'gemini': 'Gemini', 'grok': 'Grok' }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const DashboardRecentThreads: React.FC<DashboardRecentThreadsProps> = ({ threads, onThreadClick }) => {
  if (threads.length === 0) return <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No threads saved yet.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', fontFamily: 'var(--font-family-primary)' }}>
      {threads.map(thread => (
        <button key={thread.id} onClick={() => onThreadClick?.(thread.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-card-default)', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-family-primary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-500)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-state-hover-bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-default)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-card-default)' }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PLATFORM_COLORS[thread.platform?.toLowerCase()] ?? '#9CA3AF', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.title || 'Untitled conversation'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{thread.message_count} msgs</span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{timeAgo(thread.created_at)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

export default DashboardRecentThreads
