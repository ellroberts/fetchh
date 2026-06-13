// app/(dashboard)/projects/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FilterState } from '@/components/ThreadFilters'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseClient } from '../../../../lib/supabase'
import { useRagPanel } from '../../../../lib/rag-panel-context'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConversationCard, Conversation } from '@/components/ConversationCard'
import { Button } from '@/components/Button'
import { ProjectInsightCard } from '@/components/projects/ProjectInsightCard'
import { ActionItem } from '@/components/projects/ActionItemCard'
import { ReminderItem } from '@/components/projects/ReminderCard'
import { ActionItemDrawer } from '@/components/projects/ActionItemDrawer'
import { ReminderDrawer } from '@/components/projects/ReminderDrawer'
import { InsightTag, TAG_CONFIG } from '@/lib/project-insight-types'
import { ThreadDrawer } from '@/components/ThreadDrawer'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { type ExportFormat, convertToMarkdown, convertToPlainText, buildExportFilename } from '@/lib/export-utils'
import { AddToProjectModal } from '@/components/AddToProjectModal'
import { IconButton } from '@/components/IconButton'
import { Tooltip } from '@/components/Tooltip'
import { TabPill } from '@/components/TabPill'
import { StorylineView } from '@/components/projects/StorylineView'
import { AddThreadSourceModal } from '@/components/AddThreadSourceModal'
import { ThreadSelectModal } from '@/components/ThreadSelectModal'
import { ClaimModal } from '@/components/ClaimModal'
import { useClaimBanner } from '@/lib/useClaimBanner'
import { EmptyState } from '@/components/EmptyState'
import { SelectAllRow } from '@/components/SelectAllRow'
import { DeleteConversationModal } from '@/components/DeleteConversationModal'
import { FolderOpen, ChevronDown, ChevronRight, ChevronUp, Upload, CloudDownload, GalleryVerticalEnd, MessageSquareText } from 'lucide-react'
import { TabFilterPanel, TabFilterState, DEFAULT_TAB_FILTER_STATE, applyTabFilter, groupByTime } from '@/components/TabFilterPanel'
import { PawmarkCard } from '@/components/PawmarkCard'
import { EditNoteTagModal, EditNoteTagMode } from '@/components/EditNoteTagModal'
import { Menu } from '@/components/Menu'


// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at?: string
  user_id: string
}

interface ProjectInsight {
  id: string
  project_id: string
  user_id: string
  content: string
  tag: InsightTag
  source_conversation_ids: string[]
  rag_query: string | null
  created_at: string
}

interface HighlightItem {
  id: string
  conversation_id: string
  highlighted_text: string
  notes?: string | null
  tags?: string[] | null
  is_pinned?: boolean
  is_archived: boolean
  created_at: string
}

interface ThreadDrawerState {
  conversationId: string
  conversationTitle: string
  highlightText: string
  messageIndices?: number[]
}

type ActiveTab = 'threads' | 'highlights' | 'actions' | 'reminders'

// ─── Section grouping (mirrors threads/page.tsx) ─────────────────────────────

type SectionKey = 'pinned' | 'today' | 'yesterday' | 'last_week' | 'older'
const SECTION_LABELS: Record<SectionKey, string> = {
  pinned: 'PINNED', today: 'TODAY', yesterday: 'YESTERDAY', last_week: 'LAST WEEK', older: 'OLDER',
}
const SECTION_ORDER: SectionKey[] = ['pinned', 'today', 'yesterday', 'last_week', 'older']

function groupConversations(conversations: Conversation[]): Array<{ key: SectionKey; label: string; items: Conversation[] }> {
  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfLastWeek = new Date(startOfToday); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
  const groups: Record<SectionKey, Conversation[]> = { pinned: [], today: [], yesterday: [], last_week: [], older: [] }
  for (const c of conversations) {
    if (c.is_pinned) { groups.pinned.push(c); continue }
    const d = new Date(c.created_at)
    if (d >= startOfToday) groups.today.push(c)
    else if (d >= startOfYesterday) groups.yesterday.push(c)
    else if (d >= startOfLastWeek) groups.last_week.push(c)
    else groups.older.push(c)
  }
  return SECTION_ORDER.filter(k => groups[k].length > 0).map(k => ({ key: k, label: SECTION_LABELS[k], items: groups[k] }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const seededCount = parseInt(searchParams?.get('seeded') || '0', 10)
  const projectId = params.id as string
  const supabase = createSupabaseClient()
  const { setProjectScope, clearProjectScope, openScoped } = useRagPanel()

  const [project, setProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [insights, setInsights] = useState<ProjectInsight[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [highlights, setHighlights] = useState<{ id: string; conversation_id: string }[]>([])
  const [projectHighlights, setProjectHighlights] = useState<HighlightItem[]>([])
  const [allConvActions, setAllConvActions] = useState<{ source_conversation_ids: string[] }[]>([])
  const [allConvReminders, setAllConvReminders] = useState<{ source_conversation_ids: string[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('threads')
  const [threadDrawer, setThreadDrawer] = useState<ThreadDrawerState | null>(null)
  const [activeActionItem, setActiveActionItem] = useState<ActionItem | null>(null)
  const [activeReminderItem, setActiveReminderItem] = useState<ReminderItem | null>(null)

  // Threads state
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'storyline'>('list')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Insights state
  const [insightViewMode, setInsightViewMode] = useState<'cards' | 'list'>('list')
  const [insightSearchTerm, setInsightSearchTerm] = useState('')
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set())
  const [showMoveToProjectModal, setShowMoveToProjectModal] = useState(false)
  const [moveTargetProjectId, setMoveTargetProjectId] = useState('')
  const [filters, setFilters] = useState<FilterState>({ platforms: [], dateRange: 'all', projectId: 'all', topics: [] })
  const [tabFilterState, setTabFilterState] = useState<TabFilterState>(DEFAULT_TAB_FILTER_STATE)
  const [tabCollapsedSections, setTabCollapsedSections] = useState<Record<string, boolean>>({})
  const [editingNoteTag, setEditingNoteTag] = useState<{ id: string; type: 'highlights' | 'actions' | 'reminders'; mode: EditNoteTagMode; currentNote?: string; currentTag?: string } | null>(null)

  // Pin modal state
  const [pendingPin, setPendingPin] = useState<{ content: string; ragQuery: string; sourceIds: string[] } | null>(null)

  // Download from Supabase
  const [showClaimModal, setShowClaimModal] = useState(false)

  // Thread selection modal
  const [showThreadSelectModal, setShowThreadSelectModal] = useState(false)
  const [threadSelectDefaultTab, setThreadSelectDefaultTab] = useState<'unassigned' | 'in-project'>('unassigned')
  const [allAppConversations, setAllAppConversations] = useState<Conversation[]>([])
  const [addingThreads, setAddingThreads] = useState(false)

  // Delete conversation state
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteModalCounts, setDeleteModalCounts] = useState({ highlights: 0, actions: 0, reminders: 0 })

  const {
    claimableConversations,
    showClaimModal: showClaimCloudModal,
    claiming,
    discarding,
    claimConversations,
    discardAll,
    setShowClaimModal: setShowClaimCloudModal,
    claimBannerProps,
    checkClaimableConversations,
  } = useClaimBanner({
    onClaimSuccess: async () => { await fetchData() },
  })

  // ─── Per-conversation pin counts ─────────────────────────────────────────────

  const convPinCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const addIds = (ids: string[]) => ids?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
    insights.forEach(i => addIds(i.source_conversation_ids))
    allConvActions.forEach(a => addIds(a.source_conversation_ids || []))
    allConvReminders.forEach(r => addIds(r.source_conversation_ids || []))
    highlights.forEach(h => { if (h.conversation_id) counts[h.conversation_id] = (counts[h.conversation_id] || 0) + 1 })
    return counts
  }, [insights, allConvActions, allConvReminders, highlights])

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const userIdRef = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id
      const uid = user.id

      const conversationsP = supabase
        .from('conversations').select('*')
        .eq('project_id', projectId).eq('user_id', uid)
        .order('created_at', { ascending: false })
        .then((r: any) => r)

      const highlightsP = conversationsP.then((convRes: any) => {
        const convIds = ((convRes.data || []) as any[]).map((c: any) => c.id)
        return convIds.length > 0
          ? supabase.from('highlights').select('*').in('conversation_id', convIds).eq('is_archived', false).order('created_at', { ascending: false }).then((r: any) => r)
          : Promise.resolve({ data: [] as HighlightItem[] })
      })

      const [projectRes, conversationsRes, insightsRes, allProjectsRes, allConvsRes, actionsRes, remindersRes, allActionsRes, allRemindersRes, highlightsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        conversationsP,
        supabase.from('project_insights').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('name'),
        supabase.from('conversations').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('action_items').select('*').eq('project_id', projectId).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('reminder_items').select('*').eq('project_id', projectId).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('action_items').select('source_conversation_ids').eq('user_id', uid),
        supabase.from('reminder_items').select('source_conversation_ids').eq('user_id', uid),
        highlightsP,
      ])

      if (projectRes.error) { console.error('Project not found:', projectRes.error); router.push('/projects'); return }

      setProject(projectRes.data)
      setAllProjects(allProjectsRes.data || [])
      const projectConvs = conversationsRes.data || []
      setConversations(projectConvs)
      window.dispatchEvent(new CustomEvent(projectConvs.length === 0 ? 'rag-button-hide' : 'rag-button-show'))
      setInsights(insightsRes.data || [])
      setActions(actionsRes.data || [])
      setReminders(remindersRes.data || [])
      setProjectHighlights(highlightsRes.data || [])
      setHighlights((highlightsRes.data || []).map((h: any) => ({ id: h.id, conversation_id: h.conversation_id })))
      setAllConvActions(allActionsRes.data || [])
      setAllConvReminders(allRemindersRes.data || [])
      setAllAppConversations(allConvsRes.data || [])
    } catch (err) {
      console.error('Error fetching project:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // ─── Targeted refetch helpers ──────────────────────────────────────────────

  const refetchActions = async () => {
    if (!userIdRef.current) return
    const { data } = await supabase.from('action_items').select('*')
      .eq('project_id', projectId).eq('user_id', userIdRef.current)
      .order('created_at', { ascending: false })
    if (data) setActions(data as ActionItem[])
  }

  const refetchReminders = async () => {
    if (!userIdRef.current) return
    const { data } = await supabase.from('reminder_items').select('*')
      .eq('project_id', projectId).eq('user_id', userIdRef.current)
      .order('created_at', { ascending: false })
    if (data) setReminders(data as ReminderItem[])
  }

  const refetchHighlights = async () => {
    const convIds = conversations.map(c => c.id)
    if (convIds.length === 0) return
    const { data } = await supabase.from('highlights').select('*')
      .in('conversation_id', convIds).eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (data) {
      setProjectHighlights(data)
      setHighlights(data.map((h: any) => ({ id: h.id, conversation_id: h.conversation_id })))
    }
  }

  useEffect(() => {
    if (seededCount > 0) {
      const poll = async (attempts = 0) => {
        await fetchData()
        setTimeout(async () => {
          const { data } = await supabase.from('conversations').select('id').eq('project_id', projectId)
          if ((data?.length ?? 0) < seededCount && attempts < 8) {
            setTimeout(() => poll(attempts + 1), 400)
          }
        }, 100)
      }
      poll()
    } else {
      fetchData()
    }
  }, [fetchData])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail.projectId || detail.projectId === projectId) {
        supabase.from('project_insights').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
          .then(({ data }: { data: ProjectInsight[] | null }) => { if (data) setInsights(data) })
      }
    }
    window.addEventListener('threadcub:insight-saved', handler)
    return () => window.removeEventListener('threadcub:insight-saved', handler)
  }, [projectId])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.projectId || detail.projectId === projectId) { fetchData() }
    }
    window.addEventListener('threadcub:action-item-added', handler)
    return () => window.removeEventListener('threadcub:action-item-added', handler)
  }, [projectId, fetchData])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.projectId || detail.projectId === projectId) { fetchData() }
    }
    window.addEventListener('threadcub:reminder-item-added', handler)
    return () => window.removeEventListener('threadcub:reminder-item-added', handler)
  }, [projectId, fetchData])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  useEffect(() => {
    if (!project) return
    const indexed = conversations.filter(c => c.has_embeddings)
    const ids = indexed.map(c => c.id)
    const titles = new Map(indexed.map(c => [c.id, c.title]))
    setProjectScope(ids, titles, project.name)
  }, [conversations, project])

  useEffect(() => {
    return () => clearProjectScope()
  }, [])

  useEffect(() => {
    if (!project) return
    if (threadDrawer) {
      const titles = new Map([[threadDrawer.conversationId, threadDrawer.conversationTitle]])
      setProjectScope([threadDrawer.conversationId], titles, threadDrawer.conversationTitle)
    } else {
      const indexed = conversations.filter(c => c.has_embeddings)
      const ids = indexed.map(c => c.id)
      const titles = new Map(indexed.map(c => [c.id, c.title]))
      setProjectScope(ids, titles, project.name)
    }
  }, [threadDrawer, project])

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setThreadDrawer({
        conversationId: e.detail.conversationId,
        conversationTitle: e.detail.conversationTitle || 'Thread',
        highlightText: e.detail.highlightText || '',
        messageIndices: e.detail.messageIndices || [],
      })
    }
    window.addEventListener('threadcub:open-thread', handler as EventListener)
    return () => window.removeEventListener('threadcub:open-thread', handler as EventListener)
  }, [])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleDeleteInsight = async (id: string) => {
    try {
      await supabase.from('project_insights').delete().eq('id', id)
      setInsights(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Error deleting insight:', err)
    }
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
    if (type === 'highlights') refetchHighlights()
    else if (type === 'actions') refetchActions()
    else refetchReminders()
  }

  const toggleConversationSelection = (id: string) => {
    setSelectedConversationIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const clearSelection = () => setSelectedConversationIds(new Set())

  const handleBulkAskCoda = () => {
    const ids = Array.from(selectedConversationIds)
    const scoped = conversations.filter(c => ids.includes(c.id))
    const titlesMap = new Map(scoped.map(c => [c.id, c.title]))
    openScoped(ids, titlesMap)
  }

  const downloadConversation = (conv: Conversation, format: ExportFormat = 'json') => {
    const parsed = typeof conv.content === 'string'
      ? (() => { try { return JSON.parse(conv.content) } catch { return {} } })()
      : (conv.content || {})
    const exportData = {
      title: conv.title,
      platform: conv.platform || conv.source || 'unknown',
      exportDate: new Date().toISOString(),
      message_count: conv.message_count ?? 0,
      tags: typeof conv.tags === 'string' ? conv.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (conv.tags ?? null),
      summary: conv.summary || null,
      messages: (parsed.messages || []) as import('@/lib/export-utils').ExportData['messages'],
    }
    const filename = buildExportFilename(conv.title, format)
    let content: string
    let mimeType: string
    if (format === 'markdown') {
      content = convertToMarkdown(exportData)
      mimeType = 'text/markdown'
    } else if (format === 'txt') {
      content = convertToPlainText(exportData)
      mimeType = 'text/plain'
    } else {
      content = JSON.stringify(exportData, null, 2)
      mimeType = 'application/json'
    }
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBulkDownload = async (format: ExportFormat = 'json') => {
    const selected = Array.from(selectedConversationIds)
      .map(id => conversations.find(c => c.id === id))
      .filter((c): c is Conversation => !!c)
    if (selected.length === 0) return
    if (selected.length === 1) { downloadConversation(selected[0], format); return }
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const conv of selected) {
      const parsed = typeof conv.content === 'string'
        ? (() => { try { return JSON.parse(conv.content!) } catch { return {} } })()
        : (conv.content || {})
      const exportData = {
        title: conv.title,
        platform: conv.platform || conv.source || 'unknown',
        exportDate: new Date().toISOString(),
        message_count: conv.message_count ?? 0,
        tags: typeof conv.tags === 'string' ? conv.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (conv.tags ?? null),
        summary: conv.summary || null,
        messages: ((parsed as { messages?: unknown[] }).messages || []) as import('@/lib/export-utils').ExportData['messages'],
      }
      const filename = buildExportFilename(conv.title, format)
      let content: string
      if (format === 'markdown') { content = convertToMarkdown(exportData) }
      else if (format === 'txt') { content = convertToPlainText(exportData) }
      else { content = JSON.stringify(exportData, null, 2) }
      zip.file(filename, content)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const zipName = (project?.name ?? 'conversations').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.href = url
    a.download = `${zipName}-${new Date().toISOString().split('T')[0]}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const triggerStorylineUpdate = async (
    targetProjectId: string,
    action: 'thread_added' | 'thread_removed' | 'thread_deleted' | 'thread_moved',
    previousProjectId?: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`/api/storyline/${targetProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, previousProjectId }),
      })
    } catch (err) {
      console.error('Storyline trigger failed (non-critical):', err)
    }
  }

  const handleDeleteConversation = async (conversation: Conversation) => {
    setConversationToDelete(conversation)
    const idsToCount = selectedConversationIds.size > 1 ? Array.from(selectedConversationIds) : [conversation.id]
    const [{ count: hCount }, { count: aCount }, { count: rCount }] = await Promise.all([
      supabase.from('highlights').select('id', { count: 'exact', head: true }).in('conversation_id', idsToCount),
      supabase.from('action_items').select('id', { count: 'exact', head: true }).overlaps('source_conversation_ids', idsToCount),
      supabase.from('reminder_items').select('id', { count: 'exact', head: true }).overlaps('source_conversation_ids', idsToCount),
    ])
    setDeleteModalCounts({ highlights: hCount ?? 0, actions: aCount ?? 0, reminders: rCount ?? 0 })
    setShowDeleteModal(true)
  }

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return
    setIsDeleting(true)
    const idsToDelete = selectedConversationIds.size > 1 ? Array.from(selectedConversationIds) : [conversationToDelete.id]
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { console.error('No active session'); return }
      for (const id of idsToDelete) {
        const response = await fetch(`/api/conversations/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          const contentType = response.headers.get('content-type') || ''
          const errMsg = contentType.includes('application/json') ? (await response.json()).error : `HTTP ${response.status}`
          console.error('Error deleting conversation:', errMsg)
        }
      }
      setConversations(prev => prev.filter(c => !idsToDelete.includes(c.id)))
      setSelectedConversationIds(new Set())
      triggerStorylineUpdate(projectId, 'thread_deleted')
    } catch (error) {
      console.error('Error deleting conversation:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setConversationToDelete(null)
    }
  }

  const handleBulkMoveToProject = () => { setMoveTargetProjectId(''); setShowMoveToProjectModal(true) }

  const handleBulkDelete = () => {
    if (selectedConversationIds.size === 0) return
    const firstId = Array.from(selectedConversationIds)[0]
    const conv = conversations.find(c => c.id === firstId)
    if (conv) handleDeleteConversation(conv)
  }

  const handleMoveToProjectConfirm = async () => {
    if (!moveTargetProjectId) return
    const ids = Array.from(selectedConversationIds)
    const supabaseClient = createSupabaseClient()
    await Promise.all(ids.map(id => supabaseClient.from('conversations').update({ project_id: moveTargetProjectId }).eq('id', id)))
    setShowMoveToProjectModal(false)
    setMoveTargetProjectId('')
    clearSelection()
    fetchData()
    triggerStorylineUpdate(moveTargetProjectId, 'thread_moved')
    triggerStorylineUpdate(projectId, 'thread_removed')
  }

  const handleTabChange = (tab: ActiveTab) => {
    setActiveActionItem(null)
    setActiveReminderItem(null)
    setActiveTab(tab)
  }

  const handleToggleActionStatus = async (id: string, status: 'open' | 'done') => {
    const res = await fetch(`/api/action-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    const { action_item } = await res.json()
    setActions(prev => prev.map(a => a.id === id ? action_item : a))
    if (activeActionItem?.id === id) setActiveActionItem(action_item)
  }

  const handleToggleReminderStatus = async (id: string, status: 'open' | 'done') => {
    const res = await fetch(`/api/reminder-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    const { reminder_item } = await res.json()
    setReminders(prev => prev.map(r => r.id === id ? reminder_item : r))
    if (activeReminderItem?.id === id) setActiveReminderItem(reminder_item)
  }

  // ─── Optimistic pin handlers ────────────────────────────────────────────────

  const handlePinConversation = async (conversation: Conversation, pinned: boolean) => {
    setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_pinned: pinned } : c))
    const { error } = await supabase.from('conversations').update({ is_pinned: pinned }).eq('id', conversation.id)
    if (error) {
      setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_pinned: !pinned } : c))
    }
  }

  const handlePinAction = async (id: string, currentPinned: boolean) => {
    const newPinned = !currentPinned
    setActions(prev => prev.map(a => a.id === id ? { ...a, is_pinned: newPinned } : a))
    const { error } = await supabase.from('action_items').update({ is_pinned: newPinned }).eq('id', id)
    if (error) {
      setActions(prev => prev.map(a => a.id === id ? { ...a, is_pinned: currentPinned } : a))
      refetchActions()
    }
  }

  const handlePinReminder = async (id: string, currentPinned: boolean) => {
    const newPinned = !currentPinned
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_pinned: newPinned } : r))
    const { error } = await supabase.from('reminder_items').update({ is_pinned: newPinned }).eq('id', id)
    if (error) {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_pinned: currentPinned } : r))
      refetchReminders()
    }
  }

  const handlePinHighlight = async (id: string, currentPinned: boolean) => {
    const newPinned = !currentPinned
    setProjectHighlights(prev => prev.map(h => h.id === id ? { ...h, is_pinned: newPinned } : h))
    const { error } = await supabase.from('highlights').update({ is_pinned: newPinned }).eq('id', id)
    if (error) {
      setProjectHighlights(prev => prev.map(h => h.id === id ? { ...h, is_pinned: currentPinned } : h))
      refetchHighlights()
    }
  }

  const handleAddThreads = async (selectedIds: string[]) => {
    setAddingThreads(true)
    try {
      const results = await Promise.all(
        selectedIds.map(id => supabase.from('conversations').update({ project_id: projectId }).eq('id', id).select())
      )
      console.log('Update results:', JSON.stringify(results))
      setShowThreadSelectModal(false)
      await fetchData()
    } catch (err) {
      console.error('Error adding threads:', err)
    } finally {
      setAddingThreads(false)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = filters.platforms.length === 0 || filters.platforms.some(p => (c.platform || c.source || '').toLowerCase().includes(p))
    return matchesSearch && matchesPlatform
  })

  const allSelected = filteredConversations.length > 0 && filteredConversations.every(c => selectedConversationIds.has(c.id))
  const someSelected = filteredConversations.some(c => selectedConversationIds.has(c.id))
  const selectAll = () => setSelectedConversationIds(new Set(filteredConversations.map(c => c.id)))
  const clearAll = () => setSelectedConversationIds(new Set())
  const filteredInsights = insights.filter(i =>
    i.content.toLowerCase().includes(insightSearchTerm.toLowerCase()) ||
    (i.rag_query || '').toLowerCase().includes(insightSearchTerm.toLowerCase())
  )
  const indexedCount = conversations.filter(c => c.has_embeddings).length
  const unassignedThreadCount = allAppConversations.filter(c => c.project_id !== projectId && !c.project_id).length

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="shrink-0" style={{ position: 'relative', zIndex: 1 }}>
          <div className="px-8" style={{ paddingTop: 'var(--spacing-8)' }}>
            <PageHeader
              loading={true}
              title="loading"
              subtitle="loading"
              tabs={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--border-radius-base)',
                    backgroundColor: 'var(--color-border-subtle)',
                    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                    flexShrink: 0,
                  }} />
                  <TabPill skeleton />
                  {/* REMOVED: highlights/actions/reminders skeleton tabs
                  <TabPill skeleton />
                  <TabPill skeleton />
                  <TabPill skeleton />
                  */}
                </div>
              }
            />
          </div>
        </div>
        <div className="h-full overflow-auto px-8 pb-24">
  <SelectAllRow skeleton />
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <ConversationCard key={i} skeleton viewMode="list" />
    ))}
  </div>
</div>
        <div className="h-full overflow-auto px-8 pb-24">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <ConversationCard key={i} skeleton viewMode="list" />
    ))}
  </div>
</div>
      </div>
    )
  }

  if (!project) return null

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {!threadDrawer && (
        <div className="shrink-0" style={{ position: 'relative', zIndex: 1 }}>
          <div className="px-8" style={{ paddingTop: 'var(--spacing-8)' }}>
            <PageHeader
              title={project.name}
              subtitle={`${conversations.length} threads · ${projectHighlights.length} highlights`}
              showViewToggle={activeTab === 'threads' && conversations.length > 0}
              showStorylineToggle={(process.env.NEXT_PUBLIC_BETA_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).includes(userEmail ?? '')}
              viewMode={viewMode}
              onViewModeChange={(m) => setViewMode(m as 'cards' | 'list' | 'storyline')}
              showFilters={conversations.length > 0}
              filterContent={<TabFilterPanel state={tabFilterState} onChange={setTabFilterState} />}
              tabs={(
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <Tooltip label="Back" position="top">
                    <IconButton onClick={() => router.push('/projects')} variant="ghost" size="lg">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </IconButton>
                  </Tooltip>
                  <TabPill label={`Threads (${conversations.length})`} selected={activeTab === 'threads'} onClick={() => handleTabChange('threads')} />
                  {/* REMOVED: highlights/actions/reminders tabs
                  <TabPill label={`Highlights (${projectHighlights.length})`} selected={activeTab === 'highlights'} onClick={() => handleTabChange('highlights')} />
                  <TabPill label={`Actions (${actions.length})`} selected={activeTab === 'actions'} onClick={() => handleTabChange('actions')} />
                  <TabPill label={`Reminders (${reminders.length})`} selected={activeTab === 'reminders'} onClick={() => handleTabChange('reminders')} />
                  */}
                </div>
              )}
            />
          </div>
        </div>
      )}

      {threadDrawer ? (
        <ThreadDrawer
          pageTitle={project.name}
          conversationId={threadDrawer.conversationId}
          conversationTitle={threadDrawer.conversationTitle}
          highlightText={threadDrawer.highlightText}
          messageIndices={threadDrawer.messageIndices}
          projectId={project.id}
          onClose={() => { setThreadDrawer(null) }}
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          {activeActionItem ? (
            <ActionItemDrawer
              item={activeActionItem}
              conversations={conversations}
              onClose={() => setActiveActionItem(null)}
              onToggleStatus={handleToggleActionStatus}
              onOpenThread={(id, title) => {
                setActiveActionItem(null)
                setThreadDrawer({ conversationId: id, conversationTitle: title, highlightText: '' })
              }}
            />
          ) : activeReminderItem ? (
            <ReminderDrawer
              item={activeReminderItem}
              conversations={conversations}
              onClose={() => setActiveReminderItem(null)}
              onToggleStatus={handleToggleReminderStatus}
              onOpenThread={(id, title) => {
                setActiveReminderItem(null)
                setThreadDrawer({ conversationId: id, conversationTitle: title, highlightText: '' })
              }}
            />
          ) : (
            <div className="h-full overflow-auto px-8 pb-24">

              {/* ── Threads tab ── */}
              {activeTab === 'threads' && (
                viewMode === 'storyline' ? (
                  <StorylineView
                    projectId={projectId}
                    conversations={conversations}
                    onOpenThread={(conversationId, conversationTitle) =>
                      setThreadDrawer({ conversationId, conversationTitle, highlightText: '' })
                    }
                  />
                ) : filteredConversations.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
  {conversations.length === 0 ? (
    claimBannerProps.count > 0 ? (
      <EmptyState
        size="page"
        icon={FolderOpen}
        iconColor="var(--color-accent-teal)"
        title="Nothing here yet..."
        subtitle="but you've some chats saved in the cloud!"
        action={{ label: `Download all ${claimBannerProps.count}`, onClick: () => claimConversations(claimableConversations.map(c => c.id), projectId), variant: 'primary', style: { filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' } }}
        secondaryAction={{ label: 'Have a look first', onClick: () => setShowClaimCloudModal(true), variant: 'tertiary' }}
      />
    ) : null
  ) : (
    <EmptyState
      size="page"
      icon={FolderOpen}
      iconColor="var(--color-icon-subtle)"
      title="No threads match your search."
      subtitle="Try adjusting your search or filters."
    />
  )}
</div>
                ) : (() => {
                  const sections = groupConversations(filteredConversations)
                  return (
                    <>
                      <SelectAllRow
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={(checked) => checked ? selectAll() : clearAll()}
                      />
                      {sections.map(({ key, label, items }) => {
                        const sectionKey = `thread-${key}`
                        const collapsed = !!tabCollapsedSections[sectionKey]
                        return (
                          <div key={sectionKey} className="time-section">
                            <button
                              className="time-section-header"
                              onClick={() => setTabCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                            >
                              {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                              {label}
                              <span className="time-section-header__count">({items.length})</span>
                            </button>
                            {!collapsed && (viewMode === 'cards' ? (
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {items.map(c => (
                                  <ConversationCard
                                    key={c.id}
                                    conversation={c}
                                    viewMode="card"
                                    selectable={true}
                                    isSelected={selectedConversationIds.has(c.id)}
                                    onSelect={() => toggleConversationSelection(c.id)}
                                    onViewDetails={(id) => {
                                      const conv = conversations.find(c => c.id === id)
                                      setThreadDrawer({ conversationId: id, conversationTitle: conv?.title || 'Thread', highlightText: '' })
                                    }}
                                    onPin={handlePinConversation}
                                    onDelete={handleDeleteConversation}
                                    pinCount={convPinCounts[c.id] || 0}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {items.map(c => (
                                  <ConversationCard
                                    key={c.id}
                                    conversation={c}
                                    viewMode="list"
                                    selectable={true}
                                    isSelected={selectedConversationIds.has(c.id)}
                                    onSelect={() => toggleConversationSelection(c.id)}
                                    onViewDetails={(id) => {
                                      const conv = conversations.find(c => c.id === id)
                                      setThreadDrawer({ conversationId: id, conversationTitle: conv?.title || 'Thread', highlightText: '' })
                                    }}
                                    onPin={handlePinConversation}
                                    onDelete={handleDeleteConversation}
                                    pinCount={convPinCounts[c.id] || 0}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  )
                })()
              )}

              {/* REMOVED: actions/reminders/highlights tab panels
              {activeTab === 'actions' && (
                actions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--border-radius-base)', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✅</div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: '6px' }}>No actions yet</h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '320px', margin: '0 auto', fontSize: 'var(--font-size-sm)' }}>When ThreadCub detects something actionable in a chat response, it will appear here automatically.</p>
                  </div>
                ) : (() => {
                  const filtered = applyTabFilter(actions, tabFilterState)
                  const pinned = filtered.filter(item => item.is_pinned)
                  const unpinned = filtered.filter(item => !item.is_pinned)
                  const timeGroups = groupByTime(unpinned, item => item.created_at)
                  const groups = [
                    ...(pinned.length > 0 ? [{ label: 'PINNED' as any, items: pinned }] : []),
                    ...timeGroups,
                  ]
                  if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No actions match the current filter.</p>
                  return (
                    <div>
                      {groups.map(({ label, items }) => {
                        const key = `proj-a-${label}`
                        const collapsed = !!tabCollapsedSections[key]
                        return (
                          <div key={key} className="time-section">
                            <button className="time-section-header" onClick={() => setTabCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                              {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                              {label}
                              <span className="time-section-header__count">({items.length})</span>
                            </button>
                            {!collapsed && (
                              <div className="jump-row-card-list">
                                {items.map((item) => (
                                  <PawmarkCard
                                    key={item.id}
                                    type="action"
                                    id={item.id}
                                    content={item.title}
                                    note={item.detail || undefined}
                                    tag={item.tags?.[0] ?? undefined}
                                    status={item.status}
                                    sourceTitle={conversations.find(c => (item.source_conversation_ids || []).includes(c.id))?.title}
                                    createdAt={item.created_at}
                                    isPinned={item.is_pinned ?? false}
                                    onViewDetails={() => setActiveActionItem(item)}
                                    onNote={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'note', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                    onTag={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'tag', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                    onPin={() => handlePinAction(item.id, item.is_pinned ?? false)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}

              {activeTab === 'reminders' && (
                reminders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--border-radius-base)', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🔔</div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: '6px' }}>No reminders yet</h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '320px', margin: '0 auto', fontSize: 'var(--font-size-sm)' }}>When ThreadCub detects a process step or workflow instruction in a chat response, it will appear here automatically.</p>
                  </div>
                ) : (() => {
                  const filtered = applyTabFilter(reminders, tabFilterState)
                  const pinned = filtered.filter(item => item.is_pinned)
                  const unpinned = filtered.filter(item => !item.is_pinned)
                  const timeGroups = groupByTime(unpinned, item => item.created_at)
                  const groups = [
                    ...(pinned.length > 0 ? [{ label: 'PINNED' as any, items: pinned }] : []),
                    ...timeGroups,
                  ]
                  if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No reminders match the current filter.</p>
                  return (
                    <div>
                      {groups.map(({ label, items }) => {
                        const key = `proj-r-${label}`
                        const collapsed = !!tabCollapsedSections[key]
                        return (
                          <div key={key} className="time-section">
                            <button className="time-section-header" onClick={() => setTabCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                              {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                              {label}
                              <span className="time-section-header__count">({items.length})</span>
                            </button>
                            {!collapsed && (
                              <div className="jump-row-card-list">
                                {items.map((item) => (
                                  <PawmarkCard
                                    key={item.id}
                                    type="reminder"
                                    id={item.id}
                                    content={item.title}
                                    note={item.detail || undefined}
                                    tag={item.tags?.[0] ?? undefined}
                                    status={item.status}
                                    sourceTitle={conversations.find(c => (item.source_conversation_ids || []).includes(c.id))?.title}
                                    createdAt={item.created_at}
                                    isPinned={item.is_pinned ?? false}
                                    onViewDetails={() => setActiveReminderItem(item)}
                                    onNote={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'note', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                    onTag={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'tag', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                    onPin={() => handlePinReminder(item.id, item.is_pinned ?? false)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}

              {activeTab === 'highlights' && (
                projectHighlights.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--border-radius-base)', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>📌</div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: '6px' }}>No highlights yet</h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '320px', margin: '0 auto', fontSize: 'var(--font-size-sm)' }}>Select text in any thread in this project to save a highlight.</p>
                  </div>
                ) : (() => {
                  const pinned = projectHighlights.filter(h => h.is_pinned)
                  const unpinned = projectHighlights.filter(h => !h.is_pinned)
                  const timeGroups = groupByTime(unpinned, h => h.created_at)
                  const groups: { label: string; items: typeof projectHighlights }[] = [
                    ...(pinned.length > 0 ? [{ label: 'PINNED', items: pinned }] : []),
                    ...timeGroups,
                  ]
                  if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No highlights match the current filter.</p>
                  return (
                    <div>
                      {groups.map(({ label, items }) => {
                        const key = `proj-h-${label}`
                        const collapsed = !!tabCollapsedSections[key]
                        return (
                          <div key={key} className="time-section">
                            <button className="time-section-header" onClick={() => setTabCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}>
                              {collapsed ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                              {label}
                              <span className="time-section-header__count">({items.length})</span>
                            </button>
                            {!collapsed && (
                              <div className="jump-row-card-list">
                                {items.map(h => (
                                  <PawmarkCard
                                    key={h.id}
                                    type="highlight"
                                    id={h.id}
                                    content={h.highlighted_text}
                                    note={h.notes ?? undefined}
                                    tag={h.tags?.[0] ?? undefined}
                                    sourceTitle={conversations.find(c => c.id === h.conversation_id)?.title}
                                    createdAt={h.created_at}
                                    isPinned={h.is_pinned ?? false}
                                    onViewDetails={h.conversation_id ? () => {
                                      const conv = conversations.find(c => c.id === h.conversation_id)
                                      setThreadDrawer({ conversationId: h.conversation_id, conversationTitle: conv?.title || 'Thread', highlightText: h.highlighted_text })
                                    } : undefined}
                                    onNote={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'note', currentNote: h.notes ?? undefined, currentTag: h.tags?.[0] ?? undefined })}
                                    onTag={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'tag', currentNote: h.notes ?? undefined, currentTag: h.tags?.[0] ?? undefined })}
                                    onPin={() => handlePinHighlight(h.id, h.is_pinned ?? false)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
              */}

            </div>
          )}
        </div>
      )}

      {/* ── Floating Add button ── */}
      {activeTab === 'threads' && !threadDrawer && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: 'calc(var(--sidebar-width, 280px) + 48px)',
          transition: 'left 0.2s ease-in-out',
          zIndex: 40,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.md"
            multiple
            style={{ display: 'none' }}
            onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              if (files.length === 0) return
              e.target.value = ''
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return
              for (const file of files) {
                const text = await file.text()
                let convs: any[] = []
                if (file.name.endsWith('.json')) {
                  const parsed = JSON.parse(text)
                  convs = Array.isArray(parsed) ? parsed : [parsed]
                } else {
                  convs = [{ title: file.name.replace('.md', ''), content: {}, messages: [], platform: 'import', _filename: file.name }]
                }
                for (const conv of convs) {
                  const platformRaw = (conv.platform || conv.source || '').toLowerCase()
                  let platform = 'unknown'
                  if (platformRaw.includes('claude')) platform = 'claude.ai'
                  else if (platformRaw.includes('chatgpt') || platformRaw.includes('openai')) platform = 'chatgpt'
                  else if (platformRaw.includes('gemini')) platform = 'gemini'
                  else if (conv.platform) platform = conv.platform
                  const now = new Date().toISOString()
                  const messages = conv.messages || []
                  const { data, error } = await supabase.from('conversations').insert([{
                    title: conv.title || 'Untitled Conversation',
                    content: conv.content || {},
                    source: conv.url || conv.source || platform,
                    messages,
                    message_count: Array.isArray(messages) ? messages.length : 0,
                    created_at: conv.created_at || now,
                    updated_at: now,
                    platform,
                    metadata: { original_filename: conv._filename || file.name, import_date: now },
                    tags: [],
                    user_id: user.id,
                    session_id: null,
                    project_id: projectId,
                    summary: null,
                  }]).select()
                  if (error || !data?.[0]) continue
                  fetch('/api/embeddings/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversation_id: data[0].id }),
                  })
                }
              }
              fetchData()
            }}
          />
          <Menu
            align="left"
            minWidth={200}
            trigger={(open, isOpen) => (
              <Button variant="primary" onClick={open}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  Add
                  {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
              </Button>
            )}
           options={[
  { icon: <Upload size={16} strokeWidth={1.5} />, label: 'File upload', onClick: () => fileInputRef.current?.click() },
  ...(claimBannerProps.count > 0 ? [{ icon: <CloudDownload size={16} strokeWidth={1.5} />, label: 'Cloud download', onClick: async () => { await checkClaimableConversations(); setShowClaimCloudModal(true) } }] : []),
  { icon: <GalleryVerticalEnd size={16} strokeWidth={1.5} />, label: 'From projects', onClick: () => { setThreadSelectDefaultTab('in-project'); setShowThreadSelectModal(true) } },
  ...(unassignedThreadCount > 0 ? [{ icon: <MessageSquareText size={16} strokeWidth={1.5} />, label: 'From threads', onClick: () => { setThreadSelectDefaultTab('unassigned'); setShowThreadSelectModal(true) } }] : []),
]}  />
        </div>
      )}

      {/* ── Modals ── */}
      {showClaimCloudModal && (
        <ClaimModal
          conversations={claimableConversations}
          onClaim={(selectedIds) => claimConversations(selectedIds, projectId)}
          onCancel={() => setShowClaimCloudModal(false)}
          onDiscard={discardAll}
          claiming={claiming}
          discarding={discarding}
        />
      )}
      {showThreadSelectModal && (() => {
        const otherProjects = new Map(allProjects.map(p => [p.id, p.name]))
        const threadsNotHere = allAppConversations
          .filter(c => c.project_id !== projectId)
          .map(c => ({ ...c, projectName: c.project_id ? (otherProjects.get(c.project_id) ?? null) : null }))
        return (
          <ThreadSelectModal
            threads={threadsNotHere}
            onConfirm={handleAddThreads}
            onCancel={() => setShowThreadSelectModal(false)}
            confirming={addingThreads}
            defaultTab={threadSelectDefaultTab}
          />
        )
      })()}
      {showDeleteModal && conversationToDelete && (
        <DeleteConversationModal
          title={conversationToDelete.title}
          count={selectedConversationIds.size > 1 ? selectedConversationIds.size : 1}
          isDeleting={isDeleting}
          onConfirm={confirmDeleteConversation}
          onCancel={() => { setShowDeleteModal(false); setConversationToDelete(null) }}
          highlightCount={deleteModalCounts.highlights}
          actionCount={deleteModalCounts.actions}
          reminderCount={deleteModalCounts.reminders}
        />
      )}
      {showMoveToProjectModal && (
        <AddToProjectModal
          title="Move to Project"
          confirmLabel="Move to Project"
          conversationTitle={`${selectedConversationIds.size} thread${selectedConversationIds.size === 1 ? '' : 's'}`}
          projects={allProjects.filter(p => p.id !== projectId)}
          selectedProjectId={moveTargetProjectId}
          onChangeProject={setMoveTargetProjectId}
          onConfirm={handleMoveToProjectConfirm}
          onClose={() => setShowMoveToProjectModal(false)}
        />
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
      <SelectionActionBar
        selectedCount={selectedConversationIds.size}
        onAskCoda={handleBulkAskCoda}
        onMoveToProject={handleBulkMoveToProject}
        onDownload={handleBulkDownload}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </div>
  )
}

// ─── Insight tag summary bar ──────────────────────────────────────────────────

function InsightTagSummary({ insights }: { insights: ProjectInsight[] }) {
  const counts = insights.reduce((acc, i) => {
    acc[i.tag] = (acc[i.tag] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(counts).map(([tag, count]) => {
        const config = TAG_CONFIG[tag as InsightTag]
        if (!config) return null
        return (
          <span
            key={tag}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '999px', fontSize: '13px',
              fontWeight: 500, fontFamily: 'var(--font-family-primary)',
              backgroundColor: config.bg, color: config.color,
              border: `1px solid ${config.color}22`,
            }}
          >
            {config.emoji} {config.label} <span style={{ opacity: 0.7 }}>({count})</span>
          </span>
        )
      })}
    </div>
  )
}