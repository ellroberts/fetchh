// components/projects/StorylineView.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Zap, Lightbulb, AlertTriangle, CheckCircle, TrendingUp, Compass, Circle, AlignJustify, List, Link2, GitBranch } from 'lucide-react'
import { Button } from '@/components/Button'
import { createSupabaseClient } from '@/lib/supabase'
import {
  ProjectStoryline,
  StoryNode,
  StoryNodeType,
  StorylineDisplayState,
  deriveDisplayState,
} from '@/lib/storyline-types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  title: string
  summary?: string
}

interface StorylineViewProps {
  projectId: string
  conversations: Conversation[]
  onOpenThread?: (conversationId: string, conversationTitle: string) => void
}

// ── Node type config ──────────────────────────────────────────────────────────

const NODE_CONFIG: Record<StoryNodeType, {
  icon: React.ElementType
  color: string
  bg: string
  label: string
}> = {
  idea:        { icon: Lightbulb,     color: 'var(--color-primary-500)',  bg: 'var(--color-primary-50)',  label: 'Idea' },
  decision:    { icon: CheckCircle,   color: 'var(--color-accent-teal)',  bg: 'hsl(174 60% 96%)',         label: 'Decision' },
  blocker:     { icon: AlertTriangle, color: 'var(--color-coral-500)',    bg: 'hsl(0 80% 97%)',           label: 'Blocker' },
  milestone:   { icon: CheckCircle,   color: 'hsl(142 71% 40%)',          bg: 'hsl(142 60% 96%)',         label: 'Milestone' },
  insight:     { icon: Zap,           color: 'hsl(38 92% 50%)',           bg: 'hsl(38 92% 97%)',          label: 'Insight' },
  shift:       { icon: TrendingUp,    color: 'var(--color-rose-500)',     bg: 'hsl(350 80% 97%)',         label: 'Shift' },
  exploration: { icon: Compass,       color: 'var(--color-warm-600)',     bg: 'var(--color-warm-100)',    label: 'Exploration' },
  general:     { icon: Circle,        color: 'var(--color-warm-500)',     bg: 'var(--color-warm-100)',    label: 'General' },
}

const IMPORTANCE_SIZE: Record<string, number> = {
  high:   40,
  medium: 32,
  low:    28,
}

// Journey Bar dot sizing by importance
const JOURNEY_DOT: Record<string, { size: number; opacity: number }> = {
  high:   { size: 11, opacity: 1 },
  medium: { size: 8,  opacity: 0.7 },
  low:    { size: 6,  opacity: 0.4 },
}

// ── Branch depth computation ──────────────────────────────────────────────────
//
// A node is a "branch" (depth > 0) when its parent_node_id does NOT point to
// the immediately preceding node in chronological order. This means it causally
// diverges from an earlier node rather than continuing the main thread.
// branch_depth is never stored — always derived from the sorted node list.

function computeBranchDepths(nodes: StoryNode[]): Map<string, number> {
  const sorted = [...nodes].sort((a, b) => a.order - b.order)
  const depths = new Map<string, number>()

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]

    if (!node.parent_node_id) {
      depths.set(node.id, 0)
      continue
    }

    const prevNode = sorted[i - 1]
    if (prevNode && node.parent_node_id === prevNode.id) {
      // Normal linear continuation — stays on trunk
      depths.set(node.id, 0)
      continue
    }

    // parent skips — this is a causal branch
    const parentDepth = depths.get(node.parent_node_id) ?? 0
    depths.set(node.id, Math.min(parentDepth + 1, 2)) // cap at depth 2
  }

  return depths
}

// Build a map from resolver node ID → the title of what it resolves.
// Used to show "Resolves: [X]" on fix/decision nodes.
function buildResolvesMap(nodes: StoryNode[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const node of nodes) {
    if (node.resolved_by_node_id) {
      map.set(node.resolved_by_node_id, node.title)
    }
  }
  return map
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Thread count badge ────────────────────────────────────────────────────────

function ThreadCountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: '11px',
      fontWeight: 500,
      fontFamily: 'var(--font-family-primary)',
      color: 'var(--color-warm-500)',
      backgroundColor: 'var(--color-warm-100)',
      padding: '2px 6px',
      borderRadius: '999px',
    }}>
      <Link2 size={9} strokeWidth={2.5} />
      {count}
    </span>
  )
}

// ── Thread pills ──────────────────────────────────────────────────────────────

function ThreadPills({
  conversations,
  onOpenThread,
}: {
  conversations: Conversation[]
  onOpenThread?: (id: string, title: string) => void
}) {
  if (conversations.length === 0) return null
  return (
    <div style={{ marginTop: 'var(--spacing-2)' }}>
      <p style={{
        margin: '0 0 6px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'var(--font-family-primary)',
        color: 'hsl(var(--muted-foreground))',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Related threads
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {conversations.map(conv => (
          <span
            key={conv.id}
            title={conv.summary || undefined}
            onClick={e => { e.stopPropagation(); onOpenThread?.(conv.id, conv.title) }}
            style={{
              fontSize: '12px',
              color: 'var(--color-primary-500)',
              backgroundColor: 'var(--color-primary-50)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontFamily: 'var(--font-family-primary)',
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: onOpenThread ? 'pointer' : 'default',
            }}
          >
            {conv.title}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Resolve badges ────────────────────────────────────────────────────────────

function ResolvedBadge() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: '11px',
      fontWeight: 500,
      fontFamily: 'var(--font-family-primary)',
      color: 'hsl(142 50% 35%)',
      backgroundColor: 'hsl(142 60% 96%)',
      padding: '2px 7px',
      borderRadius: '999px',
      border: '1px solid hsl(142 50% 85%)',
    }}>
      <CheckCircle size={9} strokeWidth={2.5} />
      Resolved
    </span>
  )
}

function ResolvesBadge({ title }: { title: string }) {
  return (
    <span
      title={`Resolves: ${title}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: '11px',
        fontWeight: 500,
        fontFamily: 'var(--font-family-primary)',
        color: 'hsl(174 50% 35%)',
        backgroundColor: 'hsl(174 60% 96%)',
        padding: '2px 7px',
        borderRadius: '999px',
        border: '1px solid hsl(174 50% 85%)',
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <CheckCircle size={9} strokeWidth={2.5} />
      Resolves: {title}
    </span>
  )
}

// ============================================================================
// JOURNEY BAR
// ============================================================================

function JourneyBar({
  nodes,
  activeNodeId,
  onNodeClick,
}: {
  nodes: StoryNode[]
  activeNodeId: string | null
  onNodeClick: (id: string) => void
}) {
  if (nodes.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      marginBottom: 'var(--spacing-6)',
      padding: '10px var(--spacing-4)',
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--border-radius-lg)',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {nodes.map((node, index) => {
        const config = NODE_CONFIG[node.type] || NODE_CONFIG.general
        const dot = JOURNEY_DOT[node.importance] || JOURNEY_DOT.medium
        const isActive = node.id === activeNodeId
        const isLast = index === nodes.length - 1

        return (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* Dot */}
            <button
              onClick={() => onNodeClick(node.id)}
              title={`${config.label}: ${node.title}`}
              style={{
                width: dot.size,
                height: dot.size,
                borderRadius: '50%',
                backgroundColor: config.color,
                opacity: isActive ? 1 : dot.opacity,
                border: isActive ? `2px solid ${config.color}` : '2px solid transparent',
                outline: isActive ? `3px solid ${config.color}33` : 'none',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                transition: 'all 0.15s',
                transform: isActive ? 'scale(1.3)' : 'scale(1)',
              }}
            />
            {/* Connector */}
            {!isLast && (
              <div style={{
                width: 20,
                height: 1,
                backgroundColor: 'var(--color-warm-200)',
                flexShrink: 0,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// STORY NODE CARD
// ============================================================================

function StoryNodeCard({
  node,
  conversations,
  isLast,
  compact,
  branchDepth,
  isResolved,
  resolvesTitle,
  nodeRef,
  onOpenThread,
}: {
  node: StoryNode
  conversations: Conversation[]
  isLast: boolean
  compact: boolean
  branchDepth: number
  isResolved: boolean
  resolvesTitle: string | null
  nodeRef?: (el: HTMLDivElement | null) => void
  onOpenThread?: (conversationId: string, conversationTitle: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const config = NODE_CONFIG[node.type] || NODE_CONFIG.general
  const IconComponent = config.icon
  const iconSize = IMPORTANCE_SIZE[node.importance] || 32
  const isBranch = branchDepth > 0

  const relatedConversations = node.related_thread_ids
    .map(id => conversations.find(c => c.id === id))
    .filter(Boolean) as Conversation[]

  // ── Compact mode ─────────────────────────────────────────────────────────────
  if (compact) {
    const leftOffset = 20 + branchDepth * 20
    return (
      <div ref={nodeRef} style={{ display: 'flex', position: 'relative', paddingLeft: leftOffset }}>
        {/* Left rule */}
        <div style={{
          position: 'absolute',
          left: 7 + branchDepth * 20,
          top: 0,
          bottom: isLast ? '50%' : 0,
          width: 1,
          backgroundColor: isBranch ? config.color + '40' : 'var(--color-warm-200)',
        }} />
        {/* Dot */}
        <div style={{
          position: 'absolute',
          left: 3 + branchDepth * 20,
          top: 14,
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: config.color,
          flexShrink: 0,
          zIndex: 1,
        }} />

        <div style={{ flex: 1, marginBottom: isLast ? 0 : 2 }}>
          {/* Collapsed row */}
          <div
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'flex', alignItems: 'center',
              gap: 'var(--spacing-2)',
              padding: '7px var(--spacing-3)',
              borderRadius: 'var(--border-radius-base)',
              cursor: 'pointer', transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-warm-50)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
          >
            {/* Branch indicator */}
            {isBranch && (
              <span style={{
                fontSize: '11px',
                color: 'var(--color-warm-400)',
                flexShrink: 0,
                letterSpacing: '-0.02em',
              }}>↳</span>
            )}
            <span style={{
              fontSize: '11px', fontWeight: 600,
              fontFamily: 'var(--font-family-primary)',
              color: config.color, flexShrink: 0, width: 76,
            }}>
              {config.label}
            </span>
            <span style={{
              flex: 1,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              fontFamily: 'var(--font-family-primary)',
              color: 'var(--color-warm-900)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {node.title}
            </span>
            <ThreadCountBadge count={relatedConversations.length} />
            <span style={{
              fontSize: '11px',
              color: 'hsl(var(--muted-foreground))',
              fontFamily: 'var(--font-family-primary)',
              flexShrink: 0, minWidth: 80, textAlign: 'right',
            }}>
              {formatDate(node.timestamp)}
            </span>
          </div>

          {/* Inline expanded content */}
          {expanded && (
            <div style={{
              margin: '0 var(--spacing-3) var(--spacing-2)',
              padding: 'var(--spacing-3)',
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--border-radius-base)',
            }}>
              <p style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)', lineHeight: 1.6,
                color: 'hsl(var(--muted-foreground))',
                fontFamily: 'var(--font-family-primary)',
              }}>
                {node.summary}
              </p>
              <ThreadPills conversations={relatedConversations} onOpenThread={onOpenThread} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Expanded mode (default) ───────────────────────────────────────────────────
  return (
    <div
      ref={nodeRef}
      style={{
        display: 'flex',
        gap: 'var(--spacing-4)',
        alignItems: 'flex-start',
        marginLeft: isBranch ? branchDepth * 36 : 0,
        position: 'relative',
        // Branch arm: horizontal line from the left edge to the icon
        ...(isBranch ? {
          paddingTop: 2,
        } : {}),
      }}
    >
      {/* Branch entry connector: horizontal arm reaching back to trunk */}
      {isBranch && (
        <div style={{
          position: 'absolute',
          left: -(branchDepth * 36),
          top: iconSize / 2,
          width: branchDepth * 36 - 2,
          height: 0,
          borderTop: '1.5px dashed var(--color-warm-300)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Left column: icon + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: iconSize, height: iconSize,
          borderRadius: '50%',
          backgroundColor: config.bg,
          border: `2px solid ${config.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, zIndex: 1,
        }}>
          <IconComponent size={iconSize * 0.45} color={config.color} strokeWidth={2} />
        </div>
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 24,
            backgroundColor: isBranch ? config.color + '30' : 'var(--color-warm-200)',
            marginTop: 4,
          }} />
        )}
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          marginBottom: isLast ? 0 : 'var(--spacing-5)',
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          // Branch nodes get a left border in their node colour
          borderLeft: isBranch ? `3px solid ${config.color}60` : '1px solid hsl(var(--border))',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden', cursor: 'pointer',
          transition: 'var(--transition-base)',
        }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = 'var(--shadow-card-hover)'
          el.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = 'var(--shadow-card)'
          el.style.transform = 'translateY(0)'
        }}
      >
        {/* Colour bar */}
        <div style={{ height: 3, backgroundColor: config.color }} />

        <div style={{ padding: 'var(--spacing-4)' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)',
          }}>
            <div style={{ flex: 1 }}>
              {/* Type badge + thread count + resolve badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '11px', fontWeight: 600,
                  fontFamily: 'var(--font-family-primary)',
                  color: config.color, backgroundColor: config.bg,
                  padding: '2px 7px', borderRadius: '999px',
                }}>
                  {config.label}
                </span>
                <ThreadCountBadge count={relatedConversations.length} />
                {/* Branch badge */}
                {isBranch && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: '11px', fontWeight: 500,
                    fontFamily: 'var(--font-family-primary)',
                    color: 'var(--color-warm-500)',
                    backgroundColor: 'var(--color-warm-100)',
                    padding: '2px 6px', borderRadius: '999px',
                  }}>
                    <GitBranch size={9} strokeWidth={2.5} />
                    Branch
                  </span>
                )}
                {/* Resolved badge (on the open-loop node itself) */}
                {isResolved && <ResolvedBadge />}
                {/* Resolves badge (on the node that closes a loop) */}
                {resolvesTitle && <ResolvesBadge title={resolvesTitle} />}
              </div>

              <h4 style={{
                margin: 0,
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
                color: 'var(--color-warm-900)', lineHeight: 1.3,
              }}>
                {node.title}
              </h4>
            </div>

            <span style={{
              fontSize: '11px', color: 'hsl(var(--muted-foreground))',
              fontFamily: 'var(--font-family-primary)',
              whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2,
            }}>
              {formatDate(node.timestamp)}
            </span>
          </div>

          {/* Summary */}
          <p style={{
            margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.6,
            color: 'hsl(var(--muted-foreground))',
            fontFamily: 'var(--font-family-primary)',
          }}>
            {node.summary}
          </p>

          {/* Expanded: related threads */}
          {expanded && (
            <ThreadPills conversations={relatedConversations} onOpenThread={onOpenThread} />
          )}

          {/* Expand hint */}
          <div style={{
            marginTop: 'var(--spacing-2)', fontSize: '11px',
            color: 'var(--color-warm-400)',
            fontFamily: 'var(--font-family-primary)',
          }}>
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StorylineView({ projectId, conversations, onOpenThread }: StorylineViewProps) {
  const supabase = createSupabaseClient()
  const [storyline, setStoryline] = useState<ProjectStoryline | null>(null)
  const [threadCount, setThreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backfillPending, setBackfillPending] = useState(false)
  const [compact, setCompact] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [clientNow, setClientNow] = useState(0)

  useEffect(() => {
    setClientNow(Date.now())
  }, [])

  // Refs for scroll tracking
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [])

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchStoryline = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) { setIsLoading(false); return }
      const res = await fetch(`/api/storyline/${projectId}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch storyline')
      const data = await res.json()
      setStoryline(data.storyline)
      setThreadCount(data.threadCount)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, getToken])

  // ── Backfill ────────────────────────────────────────────────────────────────

  const triggerBackfill = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      await fetch(`/api/storyline/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'backfill' }),
      })
    } catch (err) {
      console.error('Backfill trigger failed:', err)
    }
  }, [projectId, getToken])

  // ── Polling ──────────────────────────────────────────────────────────────────

  const shouldPoll = (s: ProjectStoryline | null) => {
    if (!s) return false
    return s.status === 'pending' || s.status === 'processing' || s.status === 'stale'
  }

  useEffect(() => { fetchStoryline() }, [fetchStoryline])

  useEffect(() => {
    if (!isLoading && storyline === null && threadCount > 0) {
      triggerBackfill()
      setBackfillPending(true)
    }
  }, [isLoading, storyline, threadCount, triggerBackfill])

  useEffect(() => {
    if (storyline !== null) setBackfillPending(false)
  }, [storyline])

  useEffect(() => {
    if (shouldPoll(storyline) || backfillPending) {
      const interval = setInterval(fetchStoryline, 4000)
      return () => clearInterval(interval)
    }
  }, [storyline?.status, backfillPending])

  // ── IntersectionObserver — active node tracking ─────────────────────────────

  useEffect(() => {
    const refs = nodeRefs.current
    if (refs.size === 0) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).dataset.nodeId
          if (id) setActiveNodeId(id)
        }
      },
      { threshold: 0.3 }
    )

    refs.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [storyline])

  // ── Scroll to node ───────────────────────────────────────────────────────────

  const scrollToNode = useCallback((id: string) => {
    const el = nodeRefs.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveNodeId(id)
    }
  }, [])

  // ── Regenerate ──────────────────────────────────────────────────────────────

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/storyline/${projectId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.status === 429) {
        const mins = Math.ceil((data.cooldownRemainingSeconds || 600) / 60)
        setError(`Regeneration available in ${mins} minute${mins !== 1 ? 's' : ''}`)
        return
      }
      if (res.status === 409) {
        setError('Generation already in progress')
        return
      }

      setError(null)
      await fetchStoryline()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRegenerating(false)
    }
  }

  // ── Display state ───────────────────────────────────────────────────────────

  const displayState: StorylineDisplayState = isLoading
    ? 'generating'
    : deriveDisplayState(storyline, threadCount)

  const nodes: StoryNode[] = storyline?.story_nodes || []

  // ── Branch computation (derived, never stored) ───────────────────────────────
  const branchDepths = computeBranchDepths(nodes)
  const resolvesMap = buildResolvesMap(nodes)   // resolverNodeId → openLoopTitle

  // ── Render ──────────────────────────────────────────────────────────────────

  if (displayState === 'empty') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 320, gap: 'var(--spacing-3)',
        color: 'var(--color-warm-500)', fontFamily: 'var(--font-family-primary)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          backgroundColor: 'var(--color-warm-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Compass size={22} color="var(--color-warm-400)" />
        </div>
        <p style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-warm-700)' }}>
          No storyline yet
        </p>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-warm-400)', textAlign: 'center', maxWidth: 280 }}>
          Add threads to this project and Coda will piece together your story.
        </p>
      </div>
    )
  }

  if (displayState === 'generating') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 320, gap: 'var(--spacing-3)',
        fontFamily: 'var(--font-family-primary)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          backgroundColor: 'var(--color-primary-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw size={20} color="var(--color-primary-500)"
            style={{ animation: 'spin 1.5s linear infinite' }} />
        </div>
        <p style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-warm-700)' }}>
          Coda is piecing together your project story…
        </p>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-warm-400)' }}>
          This usually takes a few seconds
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (displayState === 'failed') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 320, gap: 'var(--spacing-3)',
        fontFamily: 'var(--font-family-primary)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          backgroundColor: 'hsl(0 80% 97%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={22} color="var(--color-coral-500)" />
        </div>
        <p style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-warm-700)' }}>
          Storyline generation failed
        </p>
        {error && (
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-warm-400)', textAlign: 'center', maxWidth: 280 }}>
            {error}
          </p>
        )}
        <Button size="sm" variant="secondary" onClick={handleRegenerate} loading={isRegenerating}>
          Try again
        </Button>
      </div>
    )
  }

  // Ready or Updating
  return (
    <div style={{ maxWidth: 680 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 'var(--spacing-4)',
      }}>
        <div>
          <h3 style={{
            margin: 0, fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)', color: 'var(--color-warm-900)',
          }}>
            Project Storyline
          </h3>
          {storyline?.last_updated && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-warm-400)', fontFamily: 'var(--font-family-primary)' }}>
              {displayState === 'updating' ? 'Updating…' : clientNow > 0 ? `Updated ${timeAgo(storyline.last_updated, clientNow)}` : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          {displayState === 'updating' && (
            <div style={{
              width: 18, height: 18,
              border: '2px solid var(--color-warm-200)',
              borderTopColor: 'var(--color-primary-500)',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }} />
          )}

          {/* Density toggle */}
          <button
            onClick={() => setCompact(c => !c)}
            title={compact ? 'Switch to expanded view' : 'Switch to compact view'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30,
              borderRadius: 'var(--border-radius-base)',
              border: '1px solid hsl(var(--border))',
              backgroundColor: compact ? 'var(--color-warm-100)' : 'transparent',
              cursor: 'pointer', color: 'var(--color-warm-500)',
              transition: 'background-color 0.15s',
            }}
          >
            {compact ? <AlignJustify size={14} /> : <List size={14} />}
          </button>

          <Button
            size="sm" variant="tertiary"
            onClick={handleRegenerate} loading={isRegenerating}
            disabled={displayState === 'updating'}
          >
            Regenerate
          </Button>
        </div>
      </div>

      {/* Journey Bar */}
      {nodes.length > 0 && (
        <JourneyBar
          nodes={nodes}
          activeNodeId={activeNodeId}
          onNodeClick={scrollToNode}
        />
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: 'var(--spacing-4)',
          padding: '10px var(--spacing-4)',
          backgroundColor: 'hsl(38 92% 97%)',
          border: '1px solid hsl(38 92% 80%)',
          borderRadius: 'var(--border-radius-base)',
          fontSize: 'var(--font-size-sm)',
          color: 'hsl(38 60% 35%)',
          fontFamily: 'var(--font-family-primary)',
        }}>
          {error}
        </div>
      )}

      {/* Timeline */}
      {nodes.length > 0 ? (
        <div>
          {nodes.map((node, index) => {
            const branchDepth = branchDepths.get(node.id) ?? 0
            const isResolved = !!node.resolved_by_node_id
            const resolvesTitle = resolvesMap.get(node.id) ?? null

            return (
              <StoryNodeCard
                key={node.id}
                node={node}
                conversations={conversations}
                isLast={index === nodes.length - 1}
                compact={compact}
                branchDepth={branchDepth}
                isResolved={isResolved}
                resolvesTitle={resolvesTitle}
                nodeRef={el => {
                  if (el) {
                    el.dataset.nodeId = node.id
                    nodeRefs.current.set(node.id, el)
                  } else {
                    nodeRefs.current.delete(node.id)
                  }
                }}
                onOpenThread={onOpenThread}
              />
            )
          })}
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 200, color: 'var(--color-warm-400)',
          fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family-primary)',
        }}>
          No story nodes yet
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}