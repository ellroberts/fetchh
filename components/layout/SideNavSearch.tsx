'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessagesSquare, FolderOpen, SearchX, Pin, PinOff, Check, CornerDownLeft } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface ThreadResult {
  id: string
  title: string
  summary?: string | null
  platform?: string | null
  is_pinned?: boolean
}

interface ProjectResult {
  id: string
  name: string
  description?: string | null
}

interface SearchResults {
  threads: ThreadResult[]
  projects: ProjectResult[]
}

export interface SideNavSearchProps {
  collapsed?: boolean
  onExpand?: () => void
}

export const SideNavSearch: React.FC<SideNavSearchProps> = ({ collapsed = false, onExpand }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [results, setResults] = useState<SearchResults>({ threads: [], projects: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pinnedOverrides, setPinnedOverrides] = useState<Record<string, boolean>>({})
  const [justToggled, setJustToggled] = useState<Record<string, boolean>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setQuery('')
    setResults({ threads: [], projects: [] })
    setActiveIndex(-1)
    inputRef.current?.blur()
  }, [])

  const focus = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // Global F shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focus])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults({ threads: [], projects: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults({
          threads: data.results || [],
          projects: data.projects || [],
        })
      } catch {
        setResults({ threads: [], projects: [] })
      } finally {
        setLoading(false)
      }
      setActiveIndex(-1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Flat list for keyboard nav
  const flatItems = [
    ...results.threads.map(t => ({ type: 'thread' as const, id: t.id, label: t.title, sub: t.platform ?? undefined })),
    ...results.projects.map(p => ({ type: 'project' as const, id: p.id, label: p.name, sub: p.description ?? undefined })),
  ]

  const handlePin = useCallback(async (thread: ThreadResult, pinned: boolean) => {
    setPinnedOverrides(prev => ({ ...prev, [thread.id]: pinned }))
    setJustToggled(prev => ({ ...prev, [thread.id]: true }))
    setTimeout(() => setJustToggled(prev => { const n = { ...prev }; delete n[thread.id]; return n }), 1500)
    const supabase = createSupabaseClient()
    const { error } = await supabase.from('conversations').update({ is_pinned: pinned }).eq('id', thread.id)
    if (!error) {
      window.dispatchEvent(new CustomEvent('threads-updated'))
    }
  }, [])

  const navigate = useCallback((item: typeof flatItems[number]) => {
    if (item.type === 'thread') router.push(`/threads/${item.id}`)
    else router.push(`/projects/${item.id}`)
    dismiss()
  }, [router, dismiss])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { dismiss(); return }
    if (!flatItems.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      navigate(flatItems[activeIndex])
    }
  }

  const showDropdown = focused && query.trim().length > 0
  const hasResults = results.threads.length > 0 || results.projects.length > 0
  const isActive = focused || query.length > 0

  const SearchSvg = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="var(--color-icon-default)" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )

  if (collapsed) {
    return (
      <button
        onClick={() => { onExpand?.(); setTimeout(focus, 200) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '48px', height: '48px', border: 'none',
          background: isActive ? 'var(--color-nav-active)' : hovered ? 'var(--color-nav-hover)' : 'transparent',
          borderRadius: '6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, transition: 'background 0.15s ease', outline: 'none', flexShrink: 0,
        }}
      >
        <SearchSvg size={20} />
      </button>
    )
  }

  // Thread count for index offset in keyboard nav
  const threadCount = results.threads.length

  return (
    <>
      {/* Backdrop */}
      {focused && (
        <div
          onClick={dismiss}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            zIndex: 40,
            backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* Wrapper — keeps dropdown positioned relative to input */}
      <div style={{ position: 'relative', zIndex: focused ? 41 : 'auto', width: '100%' }}>

        {/* Input row */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => { onExpand?.(); setTimeout(focus, 200) }}
          style={{
            width: '100%', height: '48px',
            background: focused ? 'var(--color-surface)' : isActive ? 'var(--color-nav-active)' : hovered ? 'var(--color-nav-hover)' : 'transparent',
            borderRadius: showDropdown ? '8px 8px 0 0' : '8px',
            border: '1.5px solid transparent',
            cursor: 'text',
            display: 'flex', alignItems: 'center',
            padding: '6px 12px',
            transition: 'background 0.15s ease, border-radius 0.1s ease',
            boxSizing: 'border-box',
            boxShadow: focused ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            gap: '8px',
          }}
        >
          <div style={{ width: '24px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchSvg size={20} />
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setQuery(''); setResults({ threads: [], projects: [] }) }}
            onKeyDown={handleKeyDown}
            placeholder="Find..."
            className="sidenav-search-input"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontSize: '14px', fontWeight: 400,
              fontFamily: 'inherit', color: 'var(--color-text-title)', minWidth: 0,
            }}
          />

          <div style={{ flexShrink: 0, opacity: (focused || hovered) ? 1 : 0, transition: 'opacity 0.15s' }}>
            <kbd style={{
              fontSize: '11px', fontFamily: 'inherit', fontWeight: 500,
              color: 'var(--color-icon-default)', backgroundColor: 'var(--color-border-subtle)',
              border: '1px solid var(--color-border-default)', borderRadius: '4px',
              padding: '1px 5px', lineHeight: '16px', display: 'inline-block',
            }}>
              {focused ? 'Esc' : 'F'}
            </kbd>
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--color-surface)',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid var(--color-border-subtle)',
            borderTop: 'none',
            overflow: 'hidden',
            maxHeight: '360px',
            overflowY: 'auto',
          }}>
            {loading && (
              <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Searching…
              </div>
            )}

            {!loading && !hasResults && (
              <div style={{
                padding: '20px 16px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)',
              }}>
                <SearchX size={20} />
                <span style={{ fontSize: '13px' }}>No results for "{query}"</span>
              </div>
            )}

            {!loading && results.threads.length > 0 && (
              <div>
                <div style={{
                  padding: '8px 16px 4px',
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--color-text-muted)',
                }}>
                  Threads
                </div>
                {results.threads.map((t, i) => {
                  const isPinned = t.id in pinnedOverrides ? pinnedOverrides[t.id] : (t.is_pinned ?? false)
                  return (
                    <ResultRow
                      key={t.id}
                      icon={<MessagesSquare size={14} color="var(--color-accent-teal)" />}
                      label={t.title}
                      sub={t.platform ?? undefined}
                      active={activeIndex === i}
                      isPinned={isPinned}
                      justToggled={!!justToggled[t.id]}
                      onPin={(e) => { e.stopPropagation(); handlePin(t, !isPinned) }}
                      onNavigate={(e) => {
                        e.stopPropagation()
                        if (pathname === '/threads') {
                          window.dispatchEvent(new CustomEvent('open-thread-drawer', {
                            detail: { conversationId: t.id, conversationTitle: t.title, initialTab: 'messages' },
                          }))
                          dismiss()
                        } else {
                          navigate({ type: 'thread', id: t.id, label: t.title, sub: t.platform ?? undefined })
                        }
                      }}
                      onMouseDown={() => navigate({ type: 'thread', id: t.id, label: t.title, sub: t.platform ?? undefined })}
                      onMouseEnter={() => setActiveIndex(i)}
                    />
                  )
                })}
              </div>
            )}

            {!loading && results.projects.length > 0 && (
              <div>
                <div style={{
                  padding: '8px 16px 4px',
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--color-text-muted)',
                  borderTop: results.threads.length > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                  marginTop: results.threads.length > 0 ? '4px' : 0,
                }}>
                  Projects
                </div>
                {results.projects.map((p, i) => (
                  <ResultRow
                    key={p.id}
                    icon={<FolderOpen size={14} color="var(--color-accent-rose)" />}
                    label={p.name}
                    sub={p.description ?? undefined}
                    active={activeIndex === threadCount + i}
                    onMouseDown={() => navigate({ type: 'project', id: p.id, label: p.name, sub: p.description ?? undefined })}
                    onMouseEnter={() => setActiveIndex(threadCount + i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function ResultRow({
  icon, label, sub, active, isPinned, justToggled, onPin, onNavigate, onMouseDown, onMouseEnter,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  active: boolean
  isPinned?: boolean
  justToggled?: boolean
  onPin?: (e: React.MouseEvent) => void
  onNavigate?: (e: React.MouseEvent) => void
  onMouseDown: () => void
  onMouseEnter: () => void
}) {
  const [rowHovered, setRowHovered] = useState(false)

  return (
    <div
      onMouseDown={e => { e.preventDefault(); onMouseDown() }}
      onMouseEnter={() => { onMouseEnter(); setRowHovered(true) }}
      onMouseLeave={() => setRowHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 12px 8px 16px', cursor: 'pointer',
        background: active ? 'var(--color-nav-hover)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px', fontWeight: 500, color: 'var(--color-text-title)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        {sub && (
          <div style={{
            fontSize: '11px', color: 'var(--color-text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginTop: '1px',
          }}>
            {sub}
          </div>
        )}
      </div>
      {rowHovered && onNavigate && (
        <button
          onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={onNavigate}
          title="Open thread"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, border: 'none', borderRadius: '4px',
            background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0,
            color: 'var(--color-icon-subtle)',
          }}
        >
          <CornerDownLeft size={13} />
        </button>
      )}
      {onPin && (rowHovered || isPinned) && (
        <button
          onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={onPin}
          title={isPinned ? 'Unpin' : 'Pin'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, border: 'none', borderRadius: '4px',
            background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0,
            color: justToggled ? 'var(--color-status-success)' : isPinned ? 'var(--color-primary-500)' : 'var(--color-icon-subtle)',
          }}
        >
          {justToggled
            ? <Check size={13} />
            : isPinned ? <PinOff size={13} /> : <Pin size={13} />
          }
        </button>
      )}
    </div>
  )
}

export default SideNavSearch
