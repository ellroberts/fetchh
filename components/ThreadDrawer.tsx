// components/ThreadDrawer.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createSupabaseClient } from '../lib/supabase'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ThreadSelectionMenuPortal, type ThreadSelectionMenuHandle } from '@/components/ThreadSelectionMenu'
import { PinType } from '@/components/projects/PinInsightModal'
import { SaveHighlightModal } from '@/components/SaveHighlightModal'
import { AddActionModal } from '@/components/AddActionModal'
import { AddReminderModal } from '@/components/AddReminderModal'
import { UserBubble } from '@/components/rag/UserBubble'
import { CodaBubble } from '@/components/rag/CodaBubble'
import { TabPill } from '@/components/TabPill'
import { IconButton } from '@/components/IconButton'
import { Tooltip } from '@/components/Tooltip'
import { ActionItem } from '@/components/projects/ActionItemCard'
import { ActionItemDrawer } from '@/components/projects/ActionItemDrawer'
import { ReminderItem } from '@/components/projects/ReminderCard'
import { ReminderDrawer } from '@/components/projects/ReminderDrawer'
import { PawmarkCard } from '@/components/PawmarkCard'
import { EditNoteTagModal, EditNoteTagMode } from '@/components/EditNoteTagModal'
import { TabFilterPanel, TabFilterState, DEFAULT_TAB_FILTER_STATE, applyTabFilter, groupByTime } from '@/components/TabFilterPanel'
import {
  type SavedHighlight,
  computeOffsetsFromRange,
} from '@/lib/highlight-utils'

interface Message {
  id?: number
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface ThreadDrawerProps {
  pageTitle: string
  conversationId: string
  conversationTitle: string
  highlightText: string
  messageIndices?: number[]
  projectId?: string
  onClose: () => void
  onScrolled?: (scrolled: boolean) => void
  initialTab?: 'messages' | 'highlights' | 'actions' | 'reminders'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSearchFragments(chunkText: string): string[] {
  return chunkText
    .split(/\n+/)
    .map(l => l.trim())
    .map(l => l.replace(/^\[(ASSISTANT|USER)\]:\s*/i, ''))
    .filter(l => l.length >= 20)
    .slice(0, 5)
    .map(l => l.toLowerCase())
}

function findHighlightedIndex(messages: Message[], chunkText: string): number {
  if (!chunkText || chunkText.length < 10) return -1
  const fragments = getSearchFragments(chunkText)
  if (fragments.length === 0) return -1
  for (const fragment of fragments) {
    const idx = messages.findIndex(m => m.content.toLowerCase().includes(fragment))
    if (idx !== -1) return idx
  }
  return -1
}

function resolveHighlightedIndex(messages: Message[], messageIndices: number[] | undefined, chunkText: string): number {
  if (messageIndices && messageIndices.length > 0) {
    const idx = messageIndices[0]
    if (idx >= 0 && idx < messages.length) return idx
  }
  return findHighlightedIndex(messages, chunkText)
}

function TabEmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: 'var(--border-radius-base)',
        backgroundColor: 'var(--color-primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        fontSize: 24,
      }}>
        {emoji}
      </div>
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: '6px' }}>{title}</h3>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '320px', margin: '0 auto', fontSize: 'var(--font-size-sm)' }}>{subtitle}</p>
    </div>
  )
}

// ── Message skeleton ──────────────────────────────────────────────────────────
const shimmer = (overrides?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: 'var(--color-border-subtle)',
  borderRadius: 'var(--border-radius-sm)',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  ...overrides,
})

const MESSAGE_SKELETON_WIDTHS = ['72%', '45%', '65%', '38%', '70%', '42%', '60%', '35%']

function MessageSkeletonRow({ role, widthPercent }: { role: 'user' | 'assistant'; widthPercent: string }) {
  const isUser = role === 'user'
  return (
    <div style={{ padding: '6px 24px', display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        width: widthPercent,
        borderRadius: 'var(--border-radius-lg)',
        padding: '12px 16px',
        backgroundColor: 'var(--color-border-subtle)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={shimmer({ width: '100%', height: 13 })} />
        <div style={shimmer({ width: isUser ? '60%' : '80%', height: 13 })} />
        {!isUser && <div style={shimmer({ width: '55%', height: 13 })} />}
      </div>
    </div>
  )
}

// ── Main components ────────────────────────────────────────────────────────────
export function ThreadDrawer({
  pageTitle, conversationId, conversationTitle, highlightText,
  messageIndices, projectId, onClose, onScrolled, initialTab,
}: ThreadDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const highlightRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<'messages' | 'highlights' | 'actions' | 'reminders'>(initialTab ?? 'messages')
  const [insights, setInsights] = useState<any[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [highlights, setHighlights] = useState<any[]>([])
  // Saved highlights shaped for CodaBubble re-application
  const [savedHighlights, setSavedHighlights] = useState<SavedHighlight[]>([])
  const [jumpHighlightText, setJumpHighlightText] = useState<string | null>(null)
  const [jumpMsgIndex, setJumpMsgIndex] = useState<number | null>(null)

  // Offset data captured at selection time, carried through to save
  const pendingHighlightMetaRef = useRef<{
    msgIndex: number
    startOffset: number
    endOffset: number
  } | null>(null)

  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null)
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null)
  const [editingNoteTag, setEditingNoteTag] = useState<{
    id: string; type: 'highlights' | 'actions' | 'reminders'
    mode: EditNoteTagMode; currentNote?: string; currentTag?: string
  } | null>(null)

  const [filterOpen, setFilterOpen] = useState(false)
  const [drawerFilterState, setDrawerFilterState] = useState<TabFilterState>(DEFAULT_TAB_FILTER_STATE)
  const [drawerCollapsedSections, setDrawerCollapsedSections] = useState<Record<string, boolean>>({})

  const [scrolled, setScrolled] = useState(false)
  const handleTabContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 0)
  }

  // ── Temporary selection highlight ────────────────────────────────────────
  // The ::selection CSS rule (injected below) gives the yellow while the user
  // is selecting. Once they click the menu, the selection is cleared by the
  // browser. No Highlight API needed for this transient state.
  const hasHighlightRef = useRef(false)

  // ── Yellow ::selection colour while drawer is mounted ─────────────────────
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'threadcub-selection-color'
    style.textContent = `
      ::selection { background: #F6DB77 !important; color: inherit !important; }
      ::-moz-selection { background: #F6DB77 !important; color: inherit !important; }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById('threadcub-selection-color')?.remove()
      hasHighlightRef.current = false
    }
  }, [])

  const selectionMenuPortalRef = useRef<ThreadSelectionMenuHandle | null>(null)
  // True while the selection menu is showing — we must not clear the highlight
  // when mouseup fires from clicking a button inside that menu.
  const menuVisibleRef = useRef(false)
  const [pendingPin, setPendingPin] = useState<string | null>(null)
  const pendingPinRef = useRef<string | null>(null)
  const setPendingPinAndRef = useCallback((val: string | null) => {
    pendingPinRef.current = val
    setPendingPin(val)
  }, [])
  const [pendingPinType, setPendingPinType] = useState<'insight' | 'reminder' | 'action'>('insight')
  const [pinSaved, setPinSaved] = useState(false)

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const menuWasVisible = menuVisibleRef.current

    setTimeout(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (!text || text.length < 2) {
        if (menuWasVisible || (hasHighlightRef.current && pendingPinRef.current)) return
        if (hasHighlightRef.current) {
          hasHighlightRef.current = false
        }
        selectionMenuPortalRef.current?.hide()
        return
      }

      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const container = scrollContainerRef.current
      if (!container || !range) return

      const ancestor = range.commonAncestorContainer
      const ancestorEl = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor as Element
      if (!ancestorEl || !container.contains(ancestorEl)) {
        if (hasHighlightRef.current) {
          hasHighlightRef.current = false
        }
        selectionMenuPortalRef.current?.hide()
        return
      }

      // ── Compute offsets before we lose the Range ──────────────────────────
      // Find which message element the selection is inside so we can store
      // msg-relative character offsets.
      let msgIndex = -1
      let startOffset = 0
      let endOffset = 0

      const msgEl = ancestorEl.closest('[data-msg-index]') as HTMLElement | null
      if (msgEl) {
        msgIndex = parseInt(msgEl.dataset.msgIndex ?? '-1', 10)
        // Walk up to the content wrapper inside the bubble (the div[ref=contentRef])
        // Use .threadcub-bubble-content as root — this is exactly the div
        // whose innerHTML is produced by marked.parse() and walked by
        // injectHighlightMarks. Offsets must be relative to this same root.
        const contentRoot = msgEl.querySelector('.threadcub-bubble-content') ?? msgEl.querySelector('[data-msg-role="assistant"]') ?? msgEl
        const offsets = computeOffsetsFromRange(range, contentRoot)
        if (offsets) {
          startOffset = offsets.startOffset
          endOffset = offsets.endOffset
        }
      }

      pendingHighlightMetaRef.current = msgIndex >= 0
        ? { msgIndex, startOffset, endOffset }
        : null

      const rect = range.getBoundingClientRect()
      const trackRange = range.cloneRange()
      const x = rect.width > 0 ? rect.left + rect.width / 2 : e.clientX
      const y = rect.height > 0 ? rect.top : e.clientY

      // The ::selection CSS rule keeps the yellow visible while the menu is
      // shown. We just need to track that a selection is active.
      hasHighlightRef.current = true
      selection.removeAllRanges()

      menuVisibleRef.current = true
      selectionMenuPortalRef.current?.show({ x, y, text, range: trackRange })
    }, 10)
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseClient()

  const handlePinSave = async (type: PinType, tag: string | null, note?: string, chosenProjectId?: string, customTitle?: string) => {
    if (!pendingPin) return
    const targetProjectId = chosenProjectId || projectId || null
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (type === 'insight') {
      const meta = pendingHighlightMetaRef.current
      const { data, error } = await supabase.from('highlights').insert({
        user_id: userId,
        conversation_id: conversationId,
        highlighted_text: pendingPin,
        source_url: window.location.href,
        source_title: conversationTitle,
        source_platform: 'app',
        is_archived: false,
        notes: note || null,
        tags: tag ? [tag] : null,
        msg_index: meta?.msgIndex ?? null,
        start_offset: meta?.startOffset ?? null,
        end_offset: meta?.endOffset ?? null,
      }).select().single()
      if (error) { console.error('Error saving highlight:', error); throw error }
      // Immediately add to local savedHighlights so it appears without a refetch
      if (data && meta && meta.msgIndex >= 0) {
        setSavedHighlights(prev => [
          ...prev,
          {
            id: data.id,
            msgIndex: meta.msgIndex,
            text: pendingPin,
            startOffset: meta.startOffset,
            endOffset: meta.endOffset,
          },
        ])
      }
      pendingHighlightMetaRef.current = null
      window.dispatchEvent(new Event('threadcub:insight-saved'))
    } else {
      const words = pendingPin.trim().split(/\s+/)
      const title = customTitle || (words.length <= 10 ? words.join(' ') : words.slice(0, 10).join(' ') + '...')
      const table = type === 'reminder' ? 'reminder_items' : 'action_items'
      const { error } = await supabase.from(table).insert({
        user_id: userId,
        project_id: targetProjectId,
        title,
        detail: note || '',
        source_chunk: pendingPin,
        source_conversation_ids: [conversationId],
        status: 'open',
        completed_at: null,
      })
      if (error) { console.error(`Error saving ${type}:`, error); throw error }
      const eventName = type === 'reminder' ? 'threadcub:reminder-item-added' : 'threadcub:action-item-added'
      window.dispatchEvent(new CustomEvent(eventName, { detail: { projectId: targetProjectId } }))
    }
    setPendingPinAndRef(null)
    menuVisibleRef.current = false
    setPinSaved(true)
    fetchTabData()
    setTimeout(() => setPinSaved(false), 2500)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('conversations')
          .select('content, messages')
          .eq('id', conversationId)
          .single()
        if (data?.content?.messages) setMessages(data.content.messages)
        else if (data?.messages) setMessages(data.messages)
      } catch (err) {
        console.error('ThreadDrawer: failed to load messages', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [conversationId])

  const fetchTabData = useCallback(async () => {
    setTabLoading(true)
    try {
      const [insightsRes, actionsRes, remindersRes, highlightsRes] = await Promise.all([
        supabase.from('project_insights').select('*').contains('source_conversation_ids', [conversationId]).order('created_at', { ascending: false }),
        supabase.from('action_items').select('*').overlaps('source_conversation_ids', [conversationId]).order('created_at', { ascending: false }),
        supabase.from('reminder_items').select('*').overlaps('source_conversation_ids', [conversationId]).order('created_at', { ascending: false }),
        supabase.from('highlights').select('*').eq('conversation_id', conversationId).eq('is_archived', false).order('created_at', { ascending: false }),
      ])
      if (insightsRes.data) setInsights(insightsRes.data)
      if (highlightsRes.data) {
        setHighlights(highlightsRes.data)
        // Build the SavedHighlight list for re-application — only rows that
        // have offset data (msg_index + offsets) or at minimum a msg_index
        // so we can fall back to text search.
        const shaped: SavedHighlight[] = highlightsRes.data
          .filter((h: any) => h.msg_index != null && h.highlighted_text)
          .map((h: any) => ({
            id: h.id,
            msgIndex: h.msg_index,
            text: h.highlighted_text,
            startOffset: h.start_offset ?? 0,
            endOffset: h.end_offset ?? 0,
          }))
        setSavedHighlights(shaped)
      }
      if (actionsRes.data) setActionItems(actionsRes.data as ActionItem[])
      if (remindersRes.data) setReminders(remindersRes.data as ReminderItem[])
    } catch (err) {
      console.error('ThreadDrawer: failed to load tab data', err)
    } finally {
      setTabLoading(false)
    }
  }, [conversationId])

  useEffect(() => { fetchTabData() }, [fetchTabData])

  // Refetch when user returns to the tab
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      fetchTabData()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  return () => document.removeEventListener('visibilitychange', handleVisibility)
}, [fetchTabData])

  const handleToggleActionStatus = async (id: string, status: 'open' | 'done') => {
    await supabase.from('action_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setActionItems(prev => prev.map(a => a.id === id ? { ...a, status, completed_at: status === 'done' ? new Date().toISOString() : null } : a))
    if (selectedAction?.id === id) setSelectedAction(prev => prev ? { ...prev, status, completed_at: status === 'done' ? new Date().toISOString() : null } : null)
  }

  const handleToggleReminderStatus = async (id: string, status: 'open' | 'done') => {
    await supabase.from('reminder_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status, completed_at: status === 'done' ? new Date().toISOString() : null } : r))
    if (selectedReminder?.id === id) setSelectedReminder(prev => prev ? { ...prev, status, completed_at: status === 'done' ? new Date().toISOString() : null } : null)
  }

  const handleNoteTagSave = async (value: string | null) => {
    if (!editingNoteTag) return
    const { id, type, mode } = editingNoteTag
    const table = type === 'highlights' ? 'highlights' : type === 'actions' ? 'action_items' : 'reminder_items'
    if (mode === 'note') {
      const field = type === 'highlights' ? 'notes' : 'detail'
      await supabase.from(table).update({ [field]: value }).eq('id', id)
    } else {
      await supabase.from(table).update({ tags: value ? [value] : null }).eq('id', id)
    }
    setEditingNoteTag(null)
    fetchTabData()
  }

  const handlePinItem = async (id: string, type: 'highlights' | 'actions' | 'reminders', pinned: boolean) => {
    if (type === 'highlights') setHighlights(prev => prev.map(h => h.id === id ? { ...h, is_pinned: pinned } : h))
    if (type === 'actions') setActionItems(prev => prev.map(a => a.id === id ? { ...a, is_pinned: pinned } : a))
    if (type === 'reminders') setReminders(prev => prev.map(r => r.id === id ? { ...r, is_pinned: pinned } : r))
    const table = type === 'highlights' ? 'highlights' : type === 'actions' ? 'action_items' : 'reminder_items'
    const { error } = await supabase.from(table).update({ is_pinned: pinned }).eq('id', id)
    if (error) fetchTabData()
  }

  const highlightedIndex = jumpHighlightText
    ? resolveHighlightedIndex(messages, jumpMsgIndex != null ? [jumpMsgIndex] : undefined, jumpHighlightText)
    : resolveHighlightedIndex(messages, messageIndices, highlightText)

  useEffect(() => {
    if (!loading && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [loading, highlightedIndex, jumpMsgIndex])

  const thisConversation = [{ id: conversationId, title: conversationTitle }]

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'transparent' }}>

      <ThreadSelectionMenuPortal
        ref={selectionMenuPortalRef}
        onChoose={(text, type) => {
          menuVisibleRef.current = false
          setPendingPinAndRef(text)
          setPendingPinType(type)
        }}
      />

      {pinSaved && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', bottom: 24, right: 24, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--border-radius-lg)', padding: '12px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 400, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📌</span> Pinned to project
        </div>,
        document.body
      )}

      {pendingPin && pendingPinType === 'insight' && (
        <SaveHighlightModal content={pendingPin} defaultProjectId={projectId}
          onCancel={() => { menuVisibleRef.current = false; setPendingPin(null); pendingPinRef.current = null }}
          onSave={async (note, _pid, tag) => { await handlePinSave('insight', tag ?? null, note, projectId) }}
        />
      )}
      {pendingPin && pendingPinType === 'action' && (
        <AddActionModal content={pendingPin} defaultProjectId={projectId}
          onCancel={() => { menuVisibleRef.current = false; setPendingPin(null); pendingPinRef.current = null }}
          onSave={async (title, detail, pid, tag) => { await handlePinSave('action', tag ?? null, detail, pid, title) }}
        />
      )}
      {pendingPin && pendingPinType === 'reminder' && (
        <AddReminderModal content={pendingPin} defaultProjectId={projectId}
          onCancel={() => { menuVisibleRef.current = false; setPendingPin(null); pendingPinRef.current = null }}
          onSave={async (title, detail, pid, tag) => { await handlePinSave('reminder', tag ?? null, detail, pid, title) }}
        />
      )}

      {/* Sticky header */}
      <div className="px-8" style={{
        paddingTop: 'var(--spacing-8)', flexShrink: 0, position: 'relative', zIndex: 1,
        backgroundColor: 'transparent',
        boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        transition: 'box-shadow 200ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 'var(--spacing-12)', marginBottom: 'var(--spacing-2)' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', fontFamily: 'var(--font-family-primary)', margin: 0, lineHeight: 'var(--line-height-tight)' }}>
              {pageTitle}
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)', fontFamily: 'var(--font-family-primary)', lineHeight: 'var(--line-height-normal)' }}>
              {conversationTitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', paddingBottom: 'var(--spacing-3)' }}>
          <Tooltip label="Back" position="top">
            <IconButton onClick={onClose} variant="ghost" size="lg">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </IconButton>
          </Tooltip>
          <TabPill label={`Messages (${messages.length})`} selected={activeTab === 'messages'} onClick={() => { setActiveTab('messages'); setJumpHighlightText(null); setJumpMsgIndex(null); setScrolled(false) }} />
          <TabPill label={`Highlights (${highlights.length})`} selected={activeTab === 'highlights'} onClick={() => { setActiveTab('highlights'); setScrolled(false) }} />
          <TabPill label={`Actions (${actionItems.length})`} selected={activeTab === 'actions'} onClick={() => { setActiveTab('actions'); setScrolled(false) }} />
          <TabPill label={`Reminders (${reminders.length})`} selected={activeTab === 'reminders'} onClick={() => { setActiveTab('reminders'); setScrolled(false) }} />
          {activeTab !== 'messages' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexShrink: 0 }}>
              <Tooltip label="Filters" position="top">
                <IconButton onClick={() => setFilterOpen(o => !o)} variant="ghost" selected={filterOpen} size="lg" style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>

        {filterOpen && activeTab !== 'messages' && (
          <TabFilterPanel state={drawerFilterState} onChange={setDrawerFilterState} />
        )}
      </div>

      {/* ── Messages tab ── */}
      {activeTab === 'messages' && (
        <div ref={scrollContainerRef} onScroll={handleTabContentScroll} className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-surface-raised)', padding: '24px 0 32px' }}>
          {loading ? (
            <div>
              {MESSAGE_SKELETON_WIDTHS.map((width, i) => (
                <MessageSkeletonRow key={i} role={i % 2 === 0 ? 'assistant' : 'user'} widthPercent={width} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground/70 text-sm py-12">No messages found</div>
          ) : (
            <div>
              {messages.map((msg, index) => {
                const isHighlighted = index === highlightedIndex

                return (
                  <div
                    key={msg.id || index}
                    data-msg-index={index}
                    ref={isHighlighted ? highlightRef : undefined}
                    style={{
                      padding: '6px 24px',
                      paddingBottom: index === messages.length - 1 ? '48px' : '6px',
                      outline: isHighlighted ? '2px solid var(--color-warning-300)' : 'none',
                      outlineOffset: '-2px',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <UserBubble content={msg.content} timestamp={msg.timestamp} />
                    ) : (
                      <CodaBubble
                        content={msg.content}
                        timestamp={msg.timestamp}
                        msgIndex={index}
                        savedHighlights={savedHighlights.filter(h => h.msgIndex === index)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Highlights tab ── */}
      {activeTab === 'highlights' && (
        <div className="flex-1 overflow-y-auto" onScroll={handleTabContentScroll} style={{ padding: '12px 24px 48px' }}>
          {tabLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', paddingTop: 'var(--spacing-2)' }}>
              {Array.from({ length: 4 }).map((_, i) => <PawmarkCard key={i} skeleton type="highlight" />)}
            </div>
          ) : highlights.length === 0 ? (
            <TabEmptyState emoji="✨" title="No highlights yet" subtitle="Select any text in the Messages tab to save a highlight." />
          ) : (() => {
            const filtered = applyTabFilter(highlights, drawerFilterState)
            const pinned = filtered.filter(h => (h as any).is_pinned)
            const unpinned = filtered.filter(h => !(h as any).is_pinned)
            const groups = [
              ...(pinned.length > 0 ? [{ label: 'PINNED' as any, items: pinned }] : []),
              ...groupByTime(unpinned, h => h.created_at),
            ]
            if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No highlights match the current filter.</p>
            return groups.map(({ label, items }) => {
              const key = `h-${label}`
              const collapsed = !!drawerCollapsedSections[key]
              return (
                <div key={key} className="time-section">
                  <button className="time-section-header" onClick={() => setDrawerCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                    {label}<span className="time-section-header__count">({items.length})</span>
                  </button>
                  {!collapsed && (
                    <div className="jump-row-card-list">
                      {items.map(h => (
                        <PawmarkCard key={h.id} type="highlight" id={h.id} content={h.highlighted_text}
                          note={h.notes ?? undefined} tag={(h.tags as string[] | null)?.[0] ?? undefined}
                          tagColour={(h as any).tag_colours ? (Object.values((h as any).tag_colours as Record<string,string>)[0] as 'amber'|'rose'|'teal') ?? 'amber' : undefined}
                          sourceTitle={h.source_title ?? undefined} createdAt={h.created_at}
                          isPinned={(h as any).is_pinned ?? false}
                          onViewDetails={() => { setJumpMsgIndex(h.msg_index ?? null); setJumpHighlightText(h.highlighted_text); setActiveTab('messages'); setScrolled(false) }}
                          onJumpBack={() => { setJumpMsgIndex(h.msg_index ?? null); setJumpHighlightText(h.highlighted_text); setActiveTab('messages'); setScrolled(false) }}
                          onNote={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'note', currentNote: h.notes ?? undefined, currentTag: (h.tags as string[] | null)?.[0] ?? undefined })}
                          onTag={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'tag', currentNote: h.notes ?? undefined, currentTag: (h.tags as string[] | null)?.[0] ?? undefined })}
                          onPin={() => handlePinItem(h.id, 'highlights', !((h as any).is_pinned ?? false))}
                          onDelete={async () => {
                            await supabase.from('highlights').delete().eq('id', h.id)
                            setHighlights(prev => prev.filter(x => x.id !== h.id))
                            setSavedHighlights(prev => prev.filter(x => x.id !== h.id))
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* ── Actions tab ── */}
      {activeTab === 'actions' && (
        <div className="flex-1 overflow-y-auto" onScroll={handleTabContentScroll} style={{ padding: '12px 24px 48px' }}>
          {tabLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', paddingTop: 'var(--spacing-2)' }}>
              {Array.from({ length: 4 }).map((_, i) => <PawmarkCard key={i} skeleton type="action" />)}
            </div>
          ) : selectedAction ? (
            <ActionItemDrawer item={selectedAction} conversations={thisConversation} onClose={() => setSelectedAction(null)} onToggleStatus={handleToggleActionStatus} />
          ) : actionItems.length === 0 ? (
            <TabEmptyState emoji="✅" title="No actions detected" subtitle="Action items are detected automatically when you chat in the RAG panel." />
          ) : (() => {
            const filtered = applyTabFilter(actionItems, drawerFilterState)
            const pinned = filtered.filter(item => (item as any).is_pinned)
            const unpinned = filtered.filter(item => !(item as any).is_pinned)
            const groups = [
              ...(pinned.length > 0 ? [{ label: 'PINNED' as any, items: pinned }] : []),
              ...groupByTime(unpinned, item => item.created_at),
            ]
            if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No actions match the current filter.</p>
            return groups.map(({ label, items }) => {
              const key = `a-${label}`
              const collapsed = !!drawerCollapsedSections[key]
              return (
                <div key={key} className="time-section">
                  <button className="time-section-header" onClick={() => setDrawerCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                    {label}<span className="time-section-header__count">({items.length})</span>
                  </button>
                  {!collapsed && (
                    <div className="jump-row-card-list">
                      {items.map(item => (
                        <PawmarkCard key={item.id} type="action" id={item.id} content={item.title}
                          note={item.detail || undefined} tag={(item as any).tags?.[0] ?? undefined}
                          tagColour={(item as any).tag_colours ? (Object.values((item as any).tag_colours as Record<string,string>)[0] as 'amber'|'rose'|'teal') ?? 'amber' : undefined}
                          status={item.status} sourceTitle={conversationTitle} createdAt={item.created_at}
                          isPinned={(item as any).is_pinned ?? false}
                          onViewDetails={() => setSelectedAction(item)}
                          onNote={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'note', currentNote: item.detail || undefined, currentTag: (item as any).tags?.[0] ?? undefined })}
                          onTag={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'tag', currentNote: item.detail || undefined, currentTag: (item as any).tags?.[0] ?? undefined })}
                          onPin={() => handlePinItem(item.id, 'actions', !((item as any).is_pinned ?? false))}
                          onDelete={async () => {
                            await supabase.from('action_items').delete().eq('id', item.id)
                            setActionItems(prev => prev.filter(x => x.id !== item.id))
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* ── Reminders tab ── */}
      {activeTab === 'reminders' && (
        <div className="flex-1 overflow-y-auto" onScroll={handleTabContentScroll} style={{ padding: '12px 24px 48px' }}>
          {tabLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', paddingTop: 'var(--spacing-2)' }}>
              {Array.from({ length: 4 }).map((_, i) => <PawmarkCard key={i} skeleton type="reminder" />)}
            </div>
          ) : selectedReminder ? (
            <ReminderDrawer item={selectedReminder} conversations={thisConversation} onClose={() => setSelectedReminder(null)} onToggleStatus={handleToggleReminderStatus} />
          ) : reminders.length === 0 ? (
            <TabEmptyState emoji="🔔" title="No reminders detected" subtitle="Reminder items are detected automatically when you chat in the RAG panel." />
          ) : (() => {
            const filtered = applyTabFilter(reminders, drawerFilterState)
            const pinned = filtered.filter(item => (item as any).is_pinned)
            const unpinned = filtered.filter(item => !(item as any).is_pinned)
            const groups = [
              ...(pinned.length > 0 ? [{ label: 'PINNED' as any, items: pinned }] : []),
              ...groupByTime(unpinned, item => item.created_at),
            ]
            if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No reminders match the current filter.</p>
            return groups.map(({ label, items }) => {
              const key = `r-${label}`
              const collapsed = !!drawerCollapsedSections[key]
              return (
                <div key={key} className="time-section">
                  <button className="time-section-header" onClick={() => setDrawerCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                    {label}<span className="time-section-header__count">({items.length})</span>
                  </button>
                  {!collapsed && (
                    <div className="jump-row-card-list">
                      {items.map(item => (
                        <PawmarkCard key={item.id} type="reminder" id={item.id} content={item.title}
                          note={item.detail || undefined} tag={(item as any).tags?.[0] ?? undefined}
                          tagColour={(item as any).tag_colours ? (Object.values((item as any).tag_colours as Record<string,string>)[0] as 'amber'|'rose'|'teal') ?? 'amber' : undefined}
                          status={item.status} sourceTitle={conversationTitle} createdAt={item.created_at}
                          isPinned={(item as any).is_pinned ?? false}
                          onViewDetails={() => setSelectedReminder(item)}
                          onNote={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'note', currentNote: item.detail || undefined, currentTag: (item as any).tags?.[0] ?? undefined })}
                          onTag={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'tag', currentNote: item.detail || undefined, currentTag: (item as any).tags?.[0] ?? undefined })}
                          onPin={() => handlePinItem(item.id, 'reminders', !((item as any).is_pinned ?? false))}
                          onDelete={async () => {
                            await supabase.from('reminder_items').delete().eq('id', item.id)
                            setReminders(prev => prev.filter(x => x.id !== item.id))
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {editingNoteTag && (
        <EditNoteTagModal
          mode={editingNoteTag.mode}
          defaultNote={editingNoteTag.currentNote}
          defaultTag={editingNoteTag.currentTag}
          onSave={handleNoteTagSave}
          onCancel={() => setEditingNoteTag(null)}
        />
      )}
    </div>
  )
}