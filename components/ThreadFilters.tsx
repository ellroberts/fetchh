// components/ThreadFilters.tsx
'use client'
import React, { useMemo, useState, useRef, useEffect } from 'react'

export interface FilterState {
  platforms: string[]
  dateRange: 'all' | 'today' | 'week' | 'month'
  projectId: string
  topics: string[]
}

interface Project {
  id: string
  name: string
}

interface ThreadFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  projects: Project[]
  conversations: Array<{ tags?: any; platform?: string; source?: string }>
}

const PLATFORMS = [
  { value: 'claude', label: 'Claude' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
]

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

export const ThreadFilters: React.FC<ThreadFiltersProps> = ({
  filters,
  onChange,
  projects,
  conversations,
}) => {
  const [topicsOpen, setTopicsOpen] = useState(false)
  const topicsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (topicsRef.current && !topicsRef.current.contains(e.target as Node)) {
        setTopicsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allTopics = useMemo(() => {
    const topicSet = new Set<string>()
    conversations.forEach(conv => {
      const tags = conv.tags
      if (!tags) return
      const arr: string[] = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? (() => { try { return JSON.parse(tags) } catch { return [] } })()
        : []
      arr.forEach(t => { if (t) topicSet.add(t) })
    })
    return Array.from(topicSet).sort()
  }, [conversations])

  const hasActiveFilters =
    filters.platforms.length > 0 ||
    filters.dateRange !== 'all' ||
    filters.projectId !== 'all' ||
    filters.topics.length > 0

  const togglePlatform = (platform: string) => {
    const next = filters.platforms.includes(platform)
      ? filters.platforms.filter(p => p !== platform)
      : [...filters.platforms, platform]
    onChange({ ...filters, platforms: next })
  }

  const toggleTopic = (topic: string) => {
    const next = filters.topics.includes(topic)
      ? filters.topics.filter(t => t !== topic)
      : [...filters.topics, topic]
    onChange({ ...filters, topics: next })
  }

  const clearAll = () => {
    onChange({ platforms: [], dateRange: 'all', projectId: 'all', topics: [] })
  }

  const pillBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    border: '1px solid hsl(var(--border))',
    transition: 'var(--transition-base)',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'var(--font-family-primary)',
    background: 'none',
  }

  const pillActive: React.CSSProperties = {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
    borderColor: 'hsl(var(--primary))',
  }

  const pillInactive: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: 'hsl(var(--muted-foreground))',
    borderColor: 'hsl(var(--border))',
  }

  const divider = (
    <div style={{
      width: '1px',
      height: '20px',
      backgroundColor: 'hsl(var(--border))',
      margin: '0 2px',
      flexShrink: 0,
    }} />
  )

  const topicsActive = filters.topics.length > 0
  const topicsLabel = topicsActive ? `Topics (${filters.topics.length})` : 'Topics'
  const projectActive = filters.projectId !== 'all'

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

        {/* Platform pills */}
        {PLATFORMS.map(p => {
          const active = filters.platforms.includes(p.value)
          return (
            <button
              key={p.value}
              onClick={() => togglePlatform(p.value)}
              style={{ ...pillBase, ...(active ? pillActive : pillInactive) }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {p.label}
            </button>
          )
        })}

        {divider}

        {/* Date range pills */}
        {DATE_RANGES.map(d => {
          const active = filters.dateRange === d.value
          return (
            <button
              key={d.value}
              onClick={() => onChange({ ...filters, dateRange: active ? 'all' : d.value as FilterState['dateRange'] })}
              style={{ ...pillBase, ...(active ? pillActive : pillInactive) }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {d.label}
            </button>
          )
        })}

        {divider}

        {/* Project dropdown */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={filters.projectId}
            onChange={e => onChange({ ...filters, projectId: e.target.value })}
            style={{
              padding: '4px 28px 4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '500',
              fontFamily: 'var(--font-family-primary)',
              border: `1px solid ${projectActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              backgroundColor: projectActive ? 'hsl(var(--primary))' : 'transparent',
              color: projectActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              appearance: 'none' as const,
              WebkitAppearance: 'none' as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='${projectActive ? '%23ffffff' : '%236B7280'}' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              transition: 'var(--transition-base)',
            }}
          >
            <option value="all">All Projects</option>
            <option value="none">No Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Topics dropdown */}
        {allTopics.length > 0 && (
          <div ref={topicsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setTopicsOpen(o => !o)}
              style={{
                ...pillBase,
                ...(topicsActive ? pillActive : pillInactive),
                paddingRight: '24px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='${topicsActive ? '%23ffffff' : '%236B7280'}' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              {topicsLabel}
            </button>

            {topicsOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 50,
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-card-hover)',
                minWidth: '220px',
                maxWidth: '320px',
                maxHeight: '280px',
                overflowY: 'auto',
                padding: '6px',
              }}>
                {allTopics.map(topic => {
                  const active = filters.topics.includes(topic)
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 'var(--border-radius-base)',
                        border: 'none',
                        background: active ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                        color: active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                        fontSize: '12px',
                        fontFamily: 'var(--font-family-primary)',
                        fontWeight: active ? '500' : '400',
                        cursor: 'pointer',
                        textAlign: 'left' as const,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                        transition: 'var(--transition-base)',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = active ? 'hsl(var(--primary) / 0.1)' : 'transparent'
                      }}
                    >
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                        backgroundColor: active ? 'hsl(var(--primary))' : 'transparent',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {active && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {topic}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            style={{
              ...pillBase,
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              color: 'hsl(var(--muted-foreground))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'hsl(var(--foreground))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
            }}
          >
            Clear all ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default ThreadFilters