// app/(dashboard)/threads/page.tsx
'use client'
import { convertToMarkdown, convertToPlainText, triggerDownload, buildExportFilename } from '@/lib/export-utils'
import type { ExportFormat } from '@/lib/export-utils'
import { friendlyErrorMessage } from '@/lib/errors'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '../../../lib/supabase'
import { Button } from '@/components/Button'
import { ThreadDrawer } from '@/components/ThreadDrawer'
import { Alert } from '@/components/Alert'
import { ClaimModal } from '@/components/ClaimModal'
import { ClaimBanner } from '@/components/ClaimBanner'
import { Toast } from '@/components/Toast'
import { useClaimBanner } from '@/lib/useClaimBanner'
import { ConversationCard, Conversation } from '@/components/ConversationCard'
import { filterConversations } from '../../../lib/search'
import { useRagPanel } from '../../../lib/rag-panel-context'
import { DeleteConversationModal } from '@/components/DeleteConversationModal'
import { RenameConversationModal } from '@/components/RenameConversationModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { AddToProjectModal } from '@/components/AddToProjectModal'
import { NewProjectModal } from '@/components/NewProjectModal'
import { EmptyState } from '@/components/EmptyState'
import { AddThreadModal } from '@/components/AddThreadModal'
import { FolderOpen, SearchX, Plus, ChevronDown, ChevronRight, ChevronUp, CloudDownload, Upload } from 'lucide-react'
import { TabPill } from '@/components/TabPill'
import { Menu } from '@/components/Menu'
import { TabFilterPanel, TabFilterState, DEFAULT_TAB_FILTER_STATE, applyTabFilter, groupByTime } from '@/components/TabFilterPanel'
import { ActionItem } from '@/components/projects/ActionItemCard'
import { ReminderItem } from '@/components/projects/ReminderCard'
import { ProjectInsightCard } from '@/components/projects/ProjectInsightCard'
import { ActionItemDrawer } from '@/components/projects/ActionItemDrawer'
import { ReminderDrawer } from '@/components/projects/ReminderDrawer'
import { PawmarkCard } from '@/components/PawmarkCard'
import { EditNoteTagModal, EditNoteTagMode } from '@/components/EditNoteTagModal'
import { SectionHeader } from '@/components/SectionHeader'
import { SelectAllRow } from '@/components/SelectAllRow'

interface Project {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at?: string
}

interface AnalysisResult {
  summary: string
  keyTopics: string[]
  nextSteps: string[]
  openQuestions: string[]
  sentiment: 'positive' | 'neutral' | 'needs-attention'
  progress: number
}

// ─── Section grouping ─────────────────────────────────────────────────────────

type SectionKey = 'pinned' | 'today' | 'yesterday' | 'last_week' | 'older'
const SECTION_LABELS: Record<SectionKey, string> = {
  pinned: 'PINNED',
  today: 'TODAY',
  yesterday: 'YESTERDAY',
  last_week: 'LAST WEEK',
  older: 'OLDER',
}
const SECTION_ORDER: SectionKey[] = ['pinned', 'today', 'yesterday', 'last_week', 'older']

function groupConversations(conversations: Conversation[]): Array<{ key: SectionKey; label: string; items: Conversation[] }> {
  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfLastWeek = new Date(startOfToday); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const groups: Record<SectionKey, Conversation[]> = {
    pinned: [], today: [], yesterday: [], last_week: [], older: [],
  }

  for (const c of conversations) {
    if (c.is_pinned) { groups.pinned.push(c); continue }
    const d = new Date(c.created_at)
    if (d >= startOfToday) groups.today.push(c)
    else if (d >= startOfYesterday) groups.yesterday.push(c)
    else if (d >= startOfLastWeek) groups.last_week.push(c)
    else groups.older.push(c)
  }

  return SECTION_ORDER
    .filter(k => groups[k].length > 0)
    .map(k => ({ key: k, label: SECTION_LABELS[k], items: groups[k] }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ThreadsPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const [analysisLoading, setAnalysisLoading] = useState<{ [key: string]: boolean }>({})
  const [analyses, setAnalyses] = useState<{ [key: string]: AnalysisResult }>({})

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set())
  const [threadDrawer, setThreadDrawer] = useState<{ conversationId: string; conversationTitle: string; initialTab?: 'messages' | 'highlights' | 'actions' | 'reminders'; highlightText?: string } | null>(null)
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'threads' | 'highlights' | 'actions' | 'reminders'>('threads')
  const [tabCounts, setTabCounts] = useState<{ highlights: number; actions: number; reminders: number }>({ highlights: 0, actions: 0, reminders: 0 })
  const [tabItems, setTabItems] = useState<{ highlights: any[]; actions: ActionItem[]; reminders: ReminderItem[]; conversations: { id: string; title: string }[] }>({ highlights: [], actions: [], reminders: [], conversations: [] })
  const [activeActionItem, setActiveActionItem] = useState<ActionItem | null>(null)
  const [activeReminderItem, setActiveReminderItem] = useState<ReminderItem | null>(null)
  const [editingNoteTag, setEditingNoteTag] = useState<{ id: string; type: 'highlights' | 'actions' | 'reminders'; mode: EditNoteTagMode; currentNote?: string; currentTag?: string } | null>(null)
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false)
  const [embeddingProgress, setEmbeddingProgress] = useState<string | null>(null)

  const { openScoped, close } = useRagPanel()

  const [showAddModal, setShowAddModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
  const [user, setUser] = useState<any>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteModalCounts, setDeleteModalCounts] = useState<{ highlights: number; actions: number; reminders: number }>({ highlights: 0, actions: 0, reminders: 0 })
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [conversationToRename, setConversationToRename] = useState<Conversation | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [tabFilterState, setTabFilterState] = useState<TabFilterState>(DEFAULT_TAB_FILTER_STATE)
  const [tabCollapsedSections, setTabCollapsedSections] = useState<Record<string, boolean>>({})
  const [filtersOpen, setFiltersOpen] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()

  const {
    claimableConversations,
    showClaimBanner,
    showClaimModal,
    claiming,
    discarding,
    claimCheckLoading,
    checkClaimableConversations,
    resetBanner,
    claimConversations,
    discardAll,
    setShowClaimModal,
    claimBannerProps,
  } = useClaimBanner({
    onClaimSuccess: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await fetchConversations(user.id)
      resetBanner()
    },
    conversationCount: conversations.length,
    subscriptionTier,
  })

  const [toastQueue, setToastQueue] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastQueue({ type, message })
    setTimeout(() => setToastQueue(null), 3500)
  }

  useEffect(() => { initializeAndFetch() }, [])

  useEffect(() => {
    const handler = () => {
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        if (data.user) fetchConversations(data.user.id)
      })
    }
    window.addEventListener('threads-updated', handler)
    return () => window.removeEventListener('threads-updated', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { conversationId, conversationTitle, initialTab } = (e as CustomEvent).detail
      setThreadDrawer({ conversationId, conversationTitle, initialTab })
    }
    window.addEventListener('open-thread-drawer', handler)
    return () => window.removeEventListener('open-thread-drawer', handler)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const { results } = await res.json()
        setSearchResults(results || [])
      } catch (e) {
        console.error('Search failed:', e)
        setSearchResults(null)
      } finally {
        setIsSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const initializeAndFetch = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) return
      setUser(user)
      const { data: profile } = await supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).single()
      const tier = profile?.subscription_tier ?? 'free'
      if (profile?.subscription_tier) setSubscriptionTier(tier)
      await fetchConversations(user.id, tier)
      await fetchPinCounts(user.id)
      await fetchTabCounts(user.id)
      await fetchTabItems(user.id)
      await fetchProjects()
      await checkClaimableConversations()
    } catch (error: any) {
      setError(friendlyErrorMessage(error.message || ''))
      setLoading(false)
    }
  }

  const fetchTabCounts = useCallback(async (userId: string) => {
    try {
      const [{ count: hCount }, { count: iCount }, { count: aCount }, { count: rCount }] = await Promise.all([
        supabase.from('highlights').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_archived', false),
        supabase.from('project_insights').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('project_id', null),
        supabase.from('action_items').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('project_id', null),
        supabase.from('reminder_items').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('project_id', null),
      ])
      setTabCounts({ highlights: (hCount ?? 0) + (iCount ?? 0), actions: aCount ?? 0, reminders: rCount ?? 0 })
    } catch (err) {
      console.error('Error fetching tab counts:', err)
    }
  }, [])

  const fetchTabItems = useCallback(async (userId: string) => {
    try {
      const [highlightsRes, insightsRes, actionsRes, remindersRes] = await Promise.all([
        supabase.from('highlights').select('*').eq('user_id', userId).eq('is_archived', false).order('created_at', { ascending: false }),
        supabase.from('project_insights').select('*').eq('user_id', userId).is('project_id', null).order('created_at', { ascending: false }),
        supabase.from('action_items').select('*').eq('user_id', userId).is('project_id', null).order('created_at', { ascending: false }),
        supabase.from('reminder_items').select('*').eq('user_id', userId).is('project_id', null).order('created_at', { ascending: false }),
      ])
      const insightsMapped = (insightsRes.data || []).map((i: any) => ({
        id: i.id, user_id: i.user_id, highlighted_text: i.content,
        conversation_id: (i.source_conversation_ids || [])[0] || null,
        created_at: i.created_at, is_archived: false, _source: 'insight',
      }))
      const allHighlights = [...(highlightsRes.data || []).map((h: any) => ({ ...h, _source: 'highlight' })), ...insightsMapped]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const allIds = new Set<string>()
      allHighlights.forEach((h: any) => { if (h.conversation_id) allIds.add(h.conversation_id) })
      actionsRes.data?.forEach((a: any) => { (a.source_conversation_ids || []).forEach((id: string) => allIds.add(id)) })
      remindersRes.data?.forEach((r: any) => { (r.source_conversation_ids || []).forEach((id: string) => allIds.add(id)) })
      let convs: { id: string; title: string }[] = []
      if (allIds.size > 0) {
        const { data: convData } = await supabase.from('conversations').select('id, title').in('id', Array.from(allIds))
        convs = convData || []
      }
      setTabItems({ highlights: allHighlights, actions: actionsRes.data as ActionItem[] || [], reminders: remindersRes.data as ReminderItem[] || [], conversations: convs })
    } catch (err) {
      console.error('Error fetching tab items:', err)
    }
  }, [])

  const handleToggleActionStatus = async (id: string, status: 'open' | 'done') => {
    await supabase.from('action_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setTabItems(prev => ({ ...prev, actions: prev.actions.map(a => a.id === id ? { ...a, status, completed_at: status === 'done' ? new Date().toISOString() : null } : a) }))
    if (activeActionItem?.id === id) setActiveActionItem(prev => prev ? { ...prev, status, completed_at: status === 'done' ? new Date().toISOString() : null } : prev)
  }

  const handleToggleReminderStatus = async (id: string, status: 'open' | 'done') => {
    await supabase.from('reminder_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setTabItems(prev => ({ ...prev, reminders: prev.reminders.map(r => r.id === id ? { ...r, status, completed_at: status === 'done' ? new Date().toISOString() : null } : r) }))
    if (activeReminderItem?.id === id) setActiveReminderItem(prev => prev ? { ...prev, status, completed_at: status === 'done' ? new Date().toISOString() : null } : prev)
  }

  const handleNoteTagSave = async (value: string | null) => {
    if (!editingNoteTag) return
    const { id, type, mode } = editingNoteTag
    const table = type === 'highlights' ? 'highlights' : type === 'actions' ? 'action_items' : 'reminder_items'
    if (mode === 'note') {
      await supabase.from(table).update({ [type === 'highlights' ? 'notes' : 'detail']: value }).eq('id', id)
    } else {
      await supabase.from(table).update({ tags: value ? [value] : null }).eq('id', id)
    }
    setEditingNoteTag(null)
    if (user) fetchTabItems(user.id)
  }

  const handlePinItem = async (id: string, type: 'highlights' | 'actions' | 'reminders', pinned: boolean) => {
    const table = type === 'highlights' ? 'highlights' : type === 'actions' ? 'action_items' : 'reminder_items'
    if (type === 'highlights') {
      setTabItems(prev => ({ ...prev, highlights: prev.highlights.map((h: any) => h.id === id ? { ...h, is_pinned: pinned } : h) }))
    }
    await supabase.from(table).update({ is_pinned: pinned }).eq('id', id)
    if (user) fetchTabItems(user.id)
  }

  const fetchPinCounts = useCallback(async (userId: string) => {
    try {
      const [{ data: highlightData }, { data: actionData }, { data: reminderData }] = await Promise.all([
        supabase.from('highlights').select('conversation_id').eq('user_id', userId).or('is_archived.is.false,is_archived.is.null'),
        supabase.from('action_items').select('source_conversation_ids').eq('user_id', userId),
        supabase.from('reminder_items').select('source_conversation_ids').eq('user_id', userId),
      ])
      const counts: Record<string, number> = {}
      if (highlightData) highlightData.forEach((r: any) => { if (r.conversation_id) counts[r.conversation_id] = (counts[r.conversation_id] || 0) + 1 })
      const addCounts = (rows: any[] | null) => {
        if (!rows) return
        rows.forEach(r => { if (Array.isArray(r.source_conversation_ids)) r.source_conversation_ids.forEach((id: string) => { counts[id] = (counts[id] || 0) + 1 }) })
      }
      addCounts(actionData)
      addCounts(reminderData)
      setPinCounts(counts)
    } catch (err) { console.error('Error fetching pin counts:', err) }
  }, [])

  useEffect(() => {
    const handler = () => {
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        if (data.user) { fetchConversations(data.user.id); fetchPinCounts(data.user.id); fetchTabCounts(data.user.id); fetchTabItems(data.user.id) }
      })
    }
    const events = ['threadcub:insight-saved', 'threadcub:action-item-added', 'threadcub:reminder-item-added']
    events.forEach(e => window.addEventListener(e, handler))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [fetchPinCounts, fetchTabCounts, fetchTabItems])

  const fetchConversations = async (userId: string, tier: string = subscriptionTier) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, created_at, title, content, source, user_id, tags, summary, quick_summary, platform, message_count, project_id, has_embeddings, last_embedded_at, parent_conversation_id, is_pinned')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const planLimits: Record<string, number> = { free: 10, starter: 50, pro: 200, unlimited: Infinity }
      const limit = planLimits[tier] ?? 10
      const convList = data || []
      const idToConv = Object.fromEntries(convList.map((c: any) => [c.id, c]))
      const getDepth = (conv: any, visited = new Set<string>()): number => {
        if (!conv.parent_conversation_id) return 0
        if (visited.has(conv.id)) return 0
        visited.add(conv.id)
        const parent = idToConv[conv.parent_conversation_id]
        return parent ? 1 + getDepth(parent, visited) : 1
      }
      const annotated = convList.map((conv: any, index: number) => ({ ...conv, locked: index >= limit, continuation_depth: getDepth(conv) }))
      setConversations(annotated)
window.dispatchEvent(new CustomEvent('threads-updated'))
} catch (error: any) {
  setError(friendlyErrorMessage(error.message || ''))
} finally {
  setLoading(false)
}
  }

  useEffect(() => {
    let channels: any[] = [];
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (!data.user) return;
      const tables = ['highlights', 'action_items', 'reminder_items'];
      channels = tables.map(table =>
        supabase
          .channel(`${table}-changes`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table,
            filter: `user_id=eq.${data.user.id}`,
          }, () => {
            fetchPinCounts(data.user.id);
            initializeAndFetch();
          })
          .subscribe()
      );
    });
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchPinCounts])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).single()
        const tier = profile?.subscription_tier ?? 'free'
        if (profile?.subscription_tier) setSubscriptionTier(tier)
        await fetchConversations(user.id, tier)
        await fetchPinCounts(user.id)
        await fetchTabCounts(user.id)
        await fetchTabItems(user.id)
        sessionStorage.removeItem('claim_banner_dismissed')
        resetBanner()
        await checkClaimableConversations()
      }
    } finally { setRefreshing(false) }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      if (!error && data) setProjects(data)
    } catch (error: any) { console.error('Error fetching projects:', error) }
  }

  const analyzeConversation = async (conversationId: string) => {
    setAnalysisLoading(prev => ({ ...prev, [conversationId]: true }))
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const analysis: AnalysisResult = {
        summary: `Analysis of this conversation: This conversation covers key topics and shows positive progress.`,
        keyTopics: ['Main Topic', 'Secondary Topic', 'Action Items'],
        nextSteps: ['Follow up on discussed points', 'Implement suggestions', 'Schedule review'],
        openQuestions: ['What are the priorities?', 'Timeline for implementation?'],
        sentiment: 'positive', progress: 75
      }
      setAnalyses(prev => ({ ...prev, [conversationId]: analysis }))
      alert(`Analysis complete\n\n${analysis.summary}`)
    } catch (error) {
      alert('Failed to analyze conversation. Please try again.')
    } finally {
      setAnalysisLoading(prev => ({ ...prev, [conversationId]: false }))
    }
  }

  const continueConversation = (conversation: Conversation) => { router.push(`/threads/${conversation.id}?mode=continue`) }

  const handleViewDetails = (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId)
    setThreadDrawer({ conversationId, conversationTitle: conv?.title || 'Thread' })
  }

  const handleViewDetailsOnTab = (conversationId: string, tab: 'messages' | 'highlights' | 'actions' | 'reminders') => {
    const conv = conversations.find(c => c.id === conversationId)
    setThreadDrawer({ conversationId, conversationTitle: conv?.title || 'Thread', initialTab: tab })
  }

  const handleViewDetailsWithHighlight = (conversationId: string, highlightText: string) => {
    const conv = conversations.find(c => c.id === conversationId)
    setThreadDrawer({ conversationId, conversationTitle: conv?.title || 'Thread', initialTab: 'messages', highlightText })
  }

  useEffect(() => {
    const openId = searchParams.get('open')
    const tab = searchParams.get('tab') as 'messages' | 'highlights' | 'actions' | 'reminders' | null
    const highlight = searchParams.get('highlight')
    if (!openId || conversations.length === 0) return
    if (highlight) handleViewDetailsWithHighlight(openId, decodeURIComponent(highlight))
    else if (tab) handleViewDetailsOnTab(openId, tab)
    else handleViewDetails(openId)
  }, [conversations, searchParams])

  useEffect(() => {
    const actionId = searchParams.get('action')
    const reminderId = searchParams.get('reminder')
    if (actionId) {
      const raw = sessionStorage.getItem('pendingAction')
      if (raw) { try { const item = JSON.parse(raw) as ActionItem; setActiveActionItem(item); setActiveTab('actions'); sessionStorage.removeItem('pendingAction') } catch {} }
    }
    if (reminderId) {
      const raw = sessionStorage.getItem('pendingReminder')
      if (raw) { try { const item = JSON.parse(raw) as ReminderItem; setActiveReminderItem(item); setActiveTab('reminders'); sessionStorage.removeItem('pendingReminder') } catch {} }
    }
  }, [searchParams])

  const downloadConversation = (conversation: Conversation, format: ExportFormat = 'json') => {
    const parsed = typeof conversation.content === 'string' ? (() => { try { return JSON.parse(conversation.content) } catch { return {} } })() : (conversation.content || {})
    const exportData = {
      title: conversation.title, platform: conversation.platform || conversation.source || 'unknown',
      exportDate: new Date().toISOString(), message_count: conversation.message_count ?? 0,
      tags: typeof conversation.tags === 'string' ? conversation.tags.split(',').map(t => t.trim()).filter(Boolean) : (conversation.tags ?? null),
      url: conversation.url || conversation.metadata?.source_url || null,
      summary: conversation.summary ? conversation.summary.replace(/^>\s*/gm, '').replace(/^\s*[\$#~].*$/gm, '').trim() || null : null,
      messages: parsed.messages || []
    }
    const filename = buildExportFilename(conversation.title, format)
    if (format === 'json') triggerDownload(JSON.stringify(exportData, null, 2), filename, 'application/json')
    else if (format === 'markdown') triggerDownload(convertToMarkdown(exportData), filename, 'text/markdown')
    else triggerDownload(convertToPlainText(exportData), filename, 'text/plain')
  }

  const renameConversation = (conversation: Conversation) => { setConversationToRename(conversation); setShowRenameModal(true) }

  const confirmRenameConversation = async (newTitle: string) => {
    if (!conversationToRename) return
    setIsRenaming(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase.from('conversations').update({ title: newTitle }).eq('id', conversationToRename.id)
      if (error) throw error
      setConversations(prev => prev.map(c => c.id === conversationToRename.id ? { ...c, title: newTitle } : c))
    } catch (error) { console.error('Error renaming conversation:', error) }
    finally { setIsRenaming(false); setShowRenameModal(false); setConversationToRename(null) }
  }

  const handlePinConversation = async (conversation: Conversation, pinned: boolean) => {
    setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_pinned: pinned } : c))
    const { error } = await supabase.from('conversations').update({ is_pinned: pinned }).eq('id', conversation.id)
    if (error) { setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_pinned: !pinned } : c)); showToast('error', 'Failed to update pin') }
    else showToast('success', pinned ? 'Pinned' : 'Unpinned')
  }

  const deleteConversation = async (conversation: Conversation) => {
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
    const deletedProjectId = conversationToDelete.project_id ?? null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { console.error('No active session'); return }
      for (const id of idsToDelete) {
        const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } })
        if (!response.ok) {
          const contentType = response.headers.get('content-type') || ''
          console.error('Error deleting conversation:', contentType.includes('application/json') ? (await response.json()).error : `HTTP ${response.status}`)
        }
      }
      setConversations(prev => prev.filter(c => !idsToDelete.includes(c.id)))
      setSelectedConversationIds(new Set())
      if (deletedProjectId) triggerStorylineUpdate(deletedProjectId, 'thread_deleted')
    } catch (error) { console.error('Error deleting conversation:', error) }
    finally { setIsDeleting(false); setShowDeleteModal(false); setConversationToDelete(null) }
  }

  const triggerStorylineUpdate = async (projectId: string, action: 'thread_added' | 'thread_removed' | 'thread_deleted' | 'thread_moved', previousProjectId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`/api/storyline/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, previousProjectId }),
      })
    } catch (err) { console.error('Storyline trigger failed (non-critical):', err) }
  }

  const createAndAssignProject = async () => {
    if (!newProjectName.trim()) return
    const newId = await createProjectInline(newProjectName.trim())
    if (!newId) return
    const idsToUpdate = Array.from(selectedConversationIds)
    if (idsToUpdate.length > 0) {
      await supabase.from('conversations').update({ project_id: newId }).in('id', idsToUpdate)
      setConversations(prev => prev.map(c => idsToUpdate.includes(c.id) ? { ...c, project_id: newId } : c))
      setSelectedConversationIds(new Set())
      triggerStorylineUpdate(newId, 'thread_added')
    }
    setNewProjectName(''); setNewProjectDescription(''); setShowNewProjectModal(false)
  }

  const createProjectInline = async (name: string): Promise<string | null> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return null
    const { data, error } = await supabase.from('projects').insert([{ name, user_id: user.id }]).select().single()
    if (error || !data) return null
    setProjects(prev => [...prev, data])
    return data.id
  }

  const openAddToProjectModal = (conversation: Conversation) => { setSelectedConversation(conversation); setShowProjectModal(true) }

  const addToProject = async () => {
    if (!selectedProjectId) return
    const isBulk = selectedConversationIds.size > 1
    const idsToUpdate = isBulk ? Array.from(selectedConversationIds) : (selectedConversation ? [selectedConversation.id] : [])
    if (idsToUpdate.length === 0) return
    try {
      const { error } = await supabase.from('conversations').update({ project_id: selectedProjectId }).in('id', idsToUpdate)
      if (!error) {
        const previousProjectIds = new Set(conversations.filter(c => idsToUpdate.includes(c.id) && c.project_id && c.project_id !== selectedProjectId).map(c => c.project_id as string))
        setConversations(prev => prev.map(c => idsToUpdate.includes(c.id) ? { ...c, project_id: selectedProjectId } : c))
        setShowProjectModal(false); setSelectedConversation(null); setSelectedProjectId('')
        if (isBulk) setSelectedConversationIds(new Set())
        triggerStorylineUpdate(selectedProjectId, previousProjectIds.size > 0 ? 'thread_moved' : 'thread_added')
        previousProjectIds.forEach(prevId => triggerStorylineUpdate(prevId, 'thread_removed'))
      }
    } catch (error) { alert('Failed to add to project. Please try again.') }
  }

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversationIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(conversationId)) newSet.delete(conversationId)
      else newSet.add(conversationId)
      return newSet
    })
  }

  const handleBulkAskCoda = () => {
    const titles = new Map<string, string>()
    conversations.forEach(conv => titles.set(conv.id, conv.title))
    openScoped(Array.from(selectedConversationIds), titles)
    setSelectedConversationIds(new Set())
  }

  const handleBulkAddToProject = () => {
    if (selectedConversationIds.size === 0) return
    if (projects.length === 0) { setShowNewProjectModal(true); return }
    const conv = conversations.find(c => c.id === Array.from(selectedConversationIds)[0])
    if (conv) openAddToProjectModal(conv)
  }

  const handleBulkDownload = (format: ExportFormat = 'json') => {
    Array.from(selectedConversationIds).forEach(id => { const conv = conversations.find(c => c.id === id); if (conv) downloadConversation(conv, format) })
  }

  const handleBulkDelete = () => {
    if (selectedConversationIds.size === 0) return
    const conv = conversations.find(c => c.id === Array.from(selectedConversationIds)[0])
    if (conv) { setConversationToDelete(conv); setShowDeleteModal(true) }
  }

  const clearSelection = () => { setSelectedConversationIds(new Set()); close() }

  const generateEmbeddingsForIds = async (ids: string[]): Promise<boolean> => {
    const needsEmbedding = ids.filter(id => !conversations.find(c => c.id === id)?.has_embeddings)
    if (needsEmbedding.length === 0) return true
    setGeneratingEmbeddings(true)
    setEmbeddingProgress(`Indexing ${needsEmbedding.length} conversation${needsEmbedding.length > 1 ? 's' : ''} for analysis...`)
    try {
      for (let i = 0; i < needsEmbedding.length; i++) {
        const id = needsEmbedding[i]
        setEmbeddingProgress(`Indexing "${conversations.find(c => c.id === id)?.title || 'conversation'}" (${i + 1}/${needsEmbedding.length})...`)
        const response = await fetch('/api/embeddings/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: id }) })
        if (!response.ok) console.error(`Failed to generate embeddings for ${id}`)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await fetchConversations(user.id)
      return true
    } catch (error) { console.error('Error generating embeddings:', error); return false }
    finally { setGeneratingEmbeddings(false); setEmbeddingProgress(null) }
  }

  const getFilteredConversations = () => {
  const base = searchResults !== null ? searchResults : filterConversations(conversations, searchQuery)
  if (activeTab !== 'threads') return base
  return applyTabFilter(base, tabFilterState)
}
  const filteredConversations = getFilteredConversations()
  const isSearchMode = searchResults !== null
  const allSelected = filteredConversations.length > 0 && filteredConversations.every(c => selectedConversationIds.has(c.id))
  const someSelected = filteredConversations.some(c => selectedConversationIds.has(c.id))
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectAll = () => setSelectedConversationIds(new Set(filteredConversations.map(c => c.id)))
  const clearAll = () => setSelectedConversationIds(new Set())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {!threadDrawer && (loading || conversations.length > 0) && (
        <div className="px-8 shrink-0" style={{
  paddingTop: '32px', paddingBottom: 'var(--spacing-4)', position: 'relative', zIndex: 1,
  boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
  transition: 'box-shadow 200ms ease',
}}>
          <PageHeader
            title="Threads"
            loading={loading}
            subtitle={loading ? undefined : `${conversations.length} thread${conversations.length !== 1 ? 's' : ''} across ${[...new Set(conversations.map(c => c.platform || c.source).filter(Boolean))].length} AI platform${[...new Set(conversations.map(c => c.platform || c.source).filter(Boolean))].length !== 1 ? 's' : ''}`}
            showFilters
            filterContent={
              <TabFilterPanel
                state={tabFilterState}
                onChange={setTabFilterState}
                activeTab={activeTab}
                projects={projects}
                platforms={[...new Set(conversations.map(c => (c.platform || c.source)).filter(Boolean) as string[])]}
              />
            }
            showViewToggle
            viewMode={viewMode}
            onViewModeChange={(mode) => setViewMode(mode as 'cards' | 'list')}
            showRefresh
            filtersOpen={filtersOpen}
            onFiltersOpenChange={setFiltersOpen}
            isRefreshing={refreshing}
            onRefresh={handleRefresh}
            tabs={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? (
                  <>
                    <TabPill skeleton skeletonWidth={110} />
                    {/* REMOVED: highlights/actions/reminders skeleton tabs
                    <TabPill skeleton skeletonWidth={100} />
                    <TabPill skeleton skeletonWidth={90} />
                    <TabPill skeleton skeletonWidth={95} />
                    */}
                  </>
                ) : (
                  <>
                    <TabPill label={`Threads (${conversations.length})`} selected={activeTab === 'threads'} onClick={() => setActiveTab('threads')} />
                    {/* REMOVED: highlights/actions/reminders tabs
                    <TabPill label={`Highlights (${tabCounts.highlights})`} selected={activeTab === 'highlights'} onClick={() => setActiveTab('highlights')} />
                    <TabPill label={`Actions (${tabCounts.actions})`} selected={activeTab === 'actions'} onClick={() => setActiveTab('actions')} />
                    <TabPill label={`Reminders (${tabCounts.reminders})`} selected={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
                    */}
                  </>
                )}
              </div>
            }
          />
        </div>
      )}

      {threadDrawer ? (
        <ThreadDrawer
          pageTitle="Chats"
          conversationId={threadDrawer.conversationId}
          conversationTitle={threadDrawer.conversationTitle}
          highlightText={threadDrawer.highlightText ?? ''}
          initialTab={threadDrawer.initialTab}
          onClose={() => { setThreadDrawer(null); setScrolled(false) }}
        />
      ) : (
        <div
          ref={scrollRef}
          onScroll={() => setScrolled((scrollRef.current?.scrollTop ?? 0) > 0)}
          className="flex-1 overflow-auto px-8 pb-24"
          style={{ paddingTop: '0' }}
        >
          {activeTab === 'threads' && (<>
            {showClaimBanner && conversations.length > 0 && (
              <ClaimBanner {...claimBannerProps} style={{ marginTop: 'var(--spacing-5)', marginBottom: 'var(--spacing-5)' }} />
            )}
            {generatingEmbeddings && embeddingProgress && (
              <div style={{ marginBottom: "var(--spacing-4)", backgroundColor: "var(--color-state-info-bg)", border: "1px solid var(--color-state-info-border)", borderRadius: "var(--border-radius-md)", padding: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 flex-shrink-0" style={{ borderColor: "var(--color-primary-500)" }} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-body)" }}>{embeddingProgress}</span>
              </div>
            )}
            {showNewProjectModal && (
              <NewProjectModal name={newProjectName} description={newProjectDescription} onChangeName={setNewProjectName} onChangeDescription={setNewProjectDescription} onConfirm={async () => { await createAndAssignProject() }} onClose={() => { setShowNewProjectModal(false); setNewProjectName(''); setNewProjectDescription('') }} threads={[]} />
            )}
            {showProjectModal && (
              <AddToProjectModal conversationTitle={selectedConversation?.title ?? ''} count={selectedConversationIds.size > 1 ? selectedConversationIds.size : 1} projects={projects} selectedProjectId={selectedProjectId} onChangeProject={setSelectedProjectId} onConfirm={addToProject} onCreateProject={createProjectInline} onClose={() => { setShowProjectModal(false); setSelectedConversation(null); setSelectedProjectId('') }} />
            )}

            {/* ── Skeleton loading state ── */}
            {loading && (
              <div style={{ paddingTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <SelectAllRow skeleton paddingTop="0" />
                <SectionHeader skeleton />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ConversationCard key={i} skeleton viewMode={viewMode === 'cards' ? 'card' : 'list'} />
                ))}
              </div>
            )}

            {error && (
              <Alert type="error" style={{ marginTop: 'var(--spacing-4)', marginBottom: '1rem' }}>
                <strong>Error</strong>
                <p className="text-sm mt-1">{error}</p>
              </Alert>
            )}

            {!loading && !claimCheckLoading && !error && filteredConversations.length === 0 && (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
    {!searchQuery ? (
      claimBannerProps.count > 0 ? (
  <EmptyState
  size="page"
  icon={FolderOpen}
  iconColor="var(--color-accent-teal)"
  title="Nothing here yet..."
  subtitle="but you've got some chats saved in the cloud!"
  action={{ label: 'Upload', onClick: () => fileInputRef.current?.click(), variant: 'secondary', icon: <Upload /> }}
  secondaryAction={{ label: 'Download', onClick: () => setShowClaimModal(true), variant: 'primary', icon: <CloudDownload /> }}
  actionLayout="row"
/>
) : (
        <EmptyState size="page" icon={FolderOpen} iconColor="var(--color-accent-teal)" title="It's so quiet here." subtitle="Send some chats from the extension, or drop one in from your computer." action={{ label: 'Add your first thread', onClick: () => fileInputRef.current?.click(), variant: 'primary' }} />
      )
    ) : (
      <EmptyState size="page" icon={SearchX} iconColor="var(--color-icon-subtle)" title="No results found" subtitle="Try adjusting your search" />
    )}
  </div>
)}

            {!loading && !error && filteredConversations.length > 0 && (<>
              <SelectAllRow
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={(checked) => checked ? selectAll() : clearAll()}
                paddingTop={filtersOpen ? 'var(--spacing-3)' : 'var(--spacing-4)'}
              />
              {groupConversations(filteredConversations).map((section) => {
                const collapsed = !!collapsedSections[section.key]
                return (
                  <div key={section.key} style={{ marginBottom: 'var(--spacing-5)' }}>
                    <SectionHeader
                      label={section.label}
                      count={section.items.length}
                      collapsed={collapsed}
                      onToggle={() => setCollapsedSections(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
                    />
                    {!collapsed && (
                      viewMode === 'cards' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {section.items.map((conversation) => {
                            const conv = { ...conversation, platform: conversation.platform !== 'unknown' ? conversation.platform : conversation.source }
                            return (
                              <ConversationCard key={conversation.id} conversation={conv} viewMode="card" selectable={true} isSelected={selectedConversationIds.has(conversation.id)} onSelect={() => toggleConversationSelection(conversation.id)} onViewDetails={handleViewDetails} onAddToProject={openAddToProjectModal} onRename={renameConversation} onDelete={deleteConversation} onDownload={downloadConversation} onPin={handlePinConversation} showHoverPin={isSearchMode} isAnalyzing={analysisLoading[conversation.id]} insightCount={pinCounts[conversation.id] || 0} />
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {section.items.map((conversation) => {
                            const conv = { ...conversation, platform: conversation.platform !== 'unknown' ? conversation.platform : conversation.source }
                            return (
                              <ConversationCard key={conversation.id} conversation={conv} viewMode="list" selectable={true} isSelected={selectedConversationIds.has(conversation.id)} onSelect={() => toggleConversationSelection(conversation.id)} onViewDetails={handleViewDetails} onAddToProject={openAddToProjectModal} onRename={renameConversation} onDelete={deleteConversation} onDownload={downloadConversation} onPin={handlePinConversation} showHoverPin={isSearchMode} isAnalyzing={analysisLoading[conversation.id]} insightCount={pinCounts[conversation.id] || 0} />
                            )
                          })}
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </>)}
          </>)}

          {/* REMOVED: highlights/actions/reminders tab panels
          {activeTab === 'highlights' && (
            <div className="flex-1 overflow-auto pb-24" style={{ paddingTop: '24px' }}>
              {tabItems.highlights.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No highlights yet. Select text in any thread to save one.</p>
              ) : (() => {
                const filtered = applyTabFilter(tabItems.highlights, tabFilterState)
                const pinned = (filtered as any[]).filter((h: any) => h.is_pinned)
                const unpinned = (filtered as any[]).filter((h: any) => !h.is_pinned)
                const groups: { label: string; items: any[] }[] = [
                  ...(pinned.length > 0 ? [{ label: 'PINNED', items: pinned }] : []),
                  ...groupByTime(unpinned, (h: any) => h.created_at),
                ]
                if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No highlights match the current filter.</p>
                return groups.map(({ label, items }) => {
                  const key = `h-${label}`
                  const collapsed = !!tabCollapsedSections[key]
                  return (
                    <div key={key} className="time-section">
                      <SectionHeader label={label} count={items.length} collapsed={collapsed} onToggle={() => setTabCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))} />
                      {!collapsed && (
                        <div className="jump-row-card-list">
                          {(items as any[]).map((h) => {
                            const sourceTitle = h.conversation_id ? tabItems.conversations.find(c => c.id === h.conversation_id)?.title : undefined
                            return (
                              <PawmarkCard key={h.id} type="highlight" id={h.id} content={h.highlighted_text} note={h.notes ?? undefined} tag={(h.tags as string[] | null)?.[0] ?? undefined} sourceTitle={sourceTitle} createdAt={h.created_at}
                                onViewDetails={h.conversation_id ? () => { const conv = tabItems.conversations.find(c => c.id === h.conversation_id); setThreadDrawer({ conversationId: h.conversation_id, conversationTitle: conv?.title || '' }) } : undefined}
                                isPinned={h.is_pinned ?? false}
                                onNote={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'note', currentNote: h.notes ?? undefined, currentTag: (h.tags as string[] | null)?.[0] ?? undefined })}
                                onTag={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'tag', currentNote: h.notes ?? undefined, currentTag: (h.tags as string[] | null)?.[0] ?? undefined })}
                                onPin={() => handlePinItem(h.id, 'highlights', !(h.is_pinned ?? false))}
                                onDelete={async () => {
                                  await supabase.from('highlights').delete().eq('id', h.id)
                                  setTabItems(prev => ({ ...prev, highlights: prev.highlights.filter((x: any) => x.id !== h.id) }))
                                  setTabCounts(prev => ({ ...prev, highlights: Math.max(0, prev.highlights - 1) }))
                                  if (h.conversation_id) {
                                    setPinCounts(prev => ({ ...prev, [h.conversation_id]: Math.max(0, (prev[h.conversation_id] ?? 0) - 1) }))
                                  }
                                }}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {activeTab === 'actions' && !activeActionItem && (
            <div className="flex-1 overflow-auto pb-24" style={{ paddingTop: '24px' }}>
              {tabItems.actions.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No actions yet. Select text in any thread or RAG to save one.</p>
              ) : (() => {
                const filtered = applyTabFilter(tabItems.actions, tabFilterState)
                const pinned = filtered.filter(item => item.is_pinned)
                const unpinned = filtered.filter(item => !item.is_pinned)
                const groups: { label: string; items: typeof filtered }[] = [
                  ...(pinned.length > 0 ? [{ label: 'PINNED', items: pinned }] : []),
                  ...groupByTime(unpinned, item => item.created_at),
                ]
                if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No actions match the current filter.</p>
                return groups.map(({ label, items }) => {
                  const key = `a-${label}`
                  const collapsed = !!tabCollapsedSections[key]
                  return (
                    <div key={key} className="time-section">
                      <SectionHeader label={label} count={items.length} collapsed={collapsed} onToggle={() => setTabCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))} />
                      {!collapsed && (
                        <div className="jump-row-card-list">
                          {items.map((item) => {
                            const ids = item.source_conversation_ids || []
                            const sourceTitle = ids.length > 1 ? 'Coda says' : ids.length === 1 ? tabItems.conversations.find(c => c.id === ids[0])?.title || undefined : undefined
                            return (
                              <PawmarkCard key={item.id} type="action" id={item.id} content={item.title} note={item.detail || undefined} tag={(item as any).tags?.[0] ?? undefined} status={item.status} sourceTitle={sourceTitle} createdAt={item.created_at} isPinned={item.is_pinned ?? false}
                                onViewDetails={() => setActiveActionItem(item)}
                                onNote={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'note', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                onTag={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'tag', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                onPin={() => handlePinItem(item.id, 'actions', !(item.is_pinned ?? false))}
                                onDelete={async () => {
                                  await supabase.from('action_items').delete().eq('id', item.id)
                                  setTabItems(prev => ({ ...prev, actions: prev.actions.filter((x: any) => x.id !== item.id) }))
                                  setTabCounts(prev => ({ ...prev, actions: Math.max(0, prev.actions - 1) }))
                                  const convIds = item.source_conversation_ids || []
                                  if (convIds.length > 0) setPinCounts(prev => { const next = { ...prev }; convIds.forEach((id: string) => { next[id] = Math.max(0, (next[id] ?? 0) - 1) }); return next })
                                }}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {activeTab === 'actions' && activeActionItem && (
            <ActionItemDrawer item={activeActionItem} conversations={tabItems.conversations} onClose={() => setActiveActionItem(null)} onToggleStatus={handleToggleActionStatus} onOpenThread={(id, title) => { setActiveActionItem(null); setThreadDrawer({ conversationId: id, conversationTitle: title }) }} />
          )}

          {activeTab === 'reminders' && !activeReminderItem && (
            <div className="flex-1 overflow-auto pb-24" style={{ paddingTop: '24px' }}>
              {tabItems.reminders.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No reminders yet. Select text in any thread or RAG to save one.</p>
              ) : (() => {
                const filtered = applyTabFilter(tabItems.reminders, tabFilterState)
                const pinned = filtered.filter(item => item.is_pinned)
                const unpinned = filtered.filter(item => !item.is_pinned)
                const groups: { label: string; items: typeof filtered }[] = [
                  ...(pinned.length > 0 ? [{ label: 'PINNED', items: pinned }] : []),
                  ...groupByTime(unpinned, item => item.created_at),
                ]
                if (groups.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No reminders match the current filter.</p>
                return groups.map(({ label, items }) => {
                  const key = `r-${label}`
                  const collapsed = !!tabCollapsedSections[key]
                  return (
                    <div key={key} className="time-section">
                      <SectionHeader label={label} count={items.length} collapsed={collapsed} onToggle={() => setTabCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))} />
                      {!collapsed && (
                        <div className="jump-row-card-list">
                          {items.map((item) => {
                            const ids = item.source_conversation_ids || []
                            const sourceTitle = ids.length > 1 ? 'Coda says' : ids.length === 1 ? tabItems.conversations.find(c => c.id === ids[0])?.title || undefined : undefined
                            return (
                              <PawmarkCard key={item.id} type="reminder" id={item.id} content={item.title} note={item.detail || undefined} tag={(item as any).tags?.[0] ?? undefined} status={item.status} sourceTitle={sourceTitle} createdAt={item.created_at} isPinned={item.is_pinned ?? false}
                                onViewDetails={() => setActiveReminderItem(item)}
                                onNote={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'note', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                onTag={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'tag', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                                onPin={() => handlePinItem(item.id, 'reminders', !(item.is_pinned ?? false))}
                                onDelete={async () => {
                                  await supabase.from('reminder_items').delete().eq('id', item.id)
                                  setTabItems(prev => ({ ...prev, reminders: prev.reminders.filter((x: any) => x.id !== item.id) }))
                                  setTabCounts(prev => ({ ...prev, reminders: Math.max(0, prev.reminders - 1) }))
                                  const convIds = item.source_conversation_ids || []
                                  if (convIds.length > 0) setPinCounts(prev => { const next = { ...prev }; convIds.forEach((id: string) => { next[id] = Math.max(0, (next[id] ?? 0) - 1) }); return next })
                                }}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {activeTab === 'reminders' && activeReminderItem && (
            <ReminderDrawer item={activeReminderItem} conversations={tabItems.conversations} onClose={() => setActiveReminderItem(null)} onToggleStatus={handleToggleReminderStatus} onOpenThread={(id, title) => { setActiveReminderItem(null); setThreadDrawer({ conversationId: id, conversationTitle: title }) }} />
          )}
          */}
        </div>
      )}

      {editingNoteTag && (
        <EditNoteTagModal mode={editingNoteTag.mode} defaultNote={editingNoteTag.currentNote} defaultTag={editingNoteTag.currentTag} onSave={handleNoteTagSave} onCancel={() => setEditingNoteTag(null)} />
      )}

      {showClaimModal && (
        <ClaimModal conversations={claimableConversations} onClaim={claimConversations} onCancel={() => setShowClaimModal(false)} onDiscard={discardAll} claiming={claiming} discarding={discarding} />
      )}

      {showRenameModal && conversationToRename && (
        <RenameConversationModal currentTitle={conversationToRename.title} onSave={confirmRenameConversation} onCancel={() => { setShowRenameModal(false); setConversationToRename(null) }} saving={isRenaming} />
      )}

      {showDeleteModal && conversationToDelete && (
        <DeleteConversationModal title={conversationToDelete.title} count={selectedConversationIds.size > 1 ? selectedConversationIds.size : 1} isDeleting={isDeleting} onConfirm={confirmDeleteConversation} onCancel={() => { setShowDeleteModal(false); setConversationToDelete(null) }} highlightCount={deleteModalCounts.highlights} actionCount={deleteModalCounts.actions} reminderCount={deleteModalCounts.reminders} />
      )}

      <input ref={fileInputRef} type="file" accept=".json" multiple style={{ display: 'none' }}
        onChange={async (e) => {
          const files = Array.from(e.target.files || [])
          if (files.length === 0) return
          e.target.value = ''
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          let savedCount = 0; let dupCount = 0
          for (const file of files) {
            const text = await file.text()
            let convs: any[] = []
            if (file.name.endsWith('.json')) { const parsed = JSON.parse(text); convs = Array.isArray(parsed) ? parsed : [parsed] }
            else convs = [{ title: file.name.replace('.md', ''), content: {}, messages: [], platform: 'import', _filename: file.name }]
            for (const conv of convs) {
              const platformRaw = (conv.platform || conv.source || '').toLowerCase()
              let platform = 'unknown'
              if (platformRaw.includes('claude')) platform = 'claude.ai'
              else if (platformRaw.includes('chatgpt') || platformRaw.includes('openai')) platform = 'chatgpt'
              else if (platformRaw.includes('gemini')) platform = 'gemini'
              else if (conv.platform) platform = conv.platform
              const now = new Date().toISOString()
              const messages = conv.messages || []
              const conversationData: any = { title: conv.title || 'Untitled Conversation', content: conv.content || {}, source: conv.url || conv.source || platform, messages, message_count: Array.isArray(messages) ? messages.length : 0, created_at: conv.created_at || now, updated_at: now, platform, metadata: { original_filename: conv._filename || file.name, import_date: now }, tags: [], user_id: user.id, session_id: null, project_id: null, summary: null }
              const { data, error } = await supabase.from('conversations').insert([conversationData]).select()
              if (error?.code === '23505') { dupCount++; continue }
              if (error || !data?.[0]) continue
              savedCount++
              fetch('/api/embeddings/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: data[0].id }) })
            }
          }
          fetchConversations(user.id)
          if (savedCount > 0) showToast('success', `Imported ${savedCount} conversation${savedCount > 1 ? 's' : ''}`)
          if (dupCount > 0) showToast('info', `${dupCount} duplicate${dupCount > 1 ? 's' : ''} skipped`)
        }}
      />

      {conversations.length > 0 && !threadDrawer && (
        <div style={{ position: 'fixed', bottom: '40px', left: 'calc(var(--sidebar-width, 280px) + 48px)', transition: 'left 0.2s ease-in-out', zIndex: 40, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))', opacity: selectedConversationIds.size > 0 ? 0 : 1, pointerEvents: selectedConversationIds.size > 0 ? 'none' : 'auto' }}>
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
              ...(claimBannerProps.count > 0 ? [{ icon: <CloudDownload size={16} strokeWidth={1.5} />, label: 'Cloud download', onClick: () => setShowClaimModal(true) }] : []),
            ]}
          />
        </div>
      )}

      <SelectionActionBar selectedCount={selectedConversationIds.size} onAskCoda={handleBulkAskCoda} onAddToProject={handleBulkAddToProject} onDownload={handleBulkDownload} onDelete={handleBulkDelete} onClear={clearSelection} />

      {toastQueue && <Toast type={toastQueue.type} message={toastQueue.message} onClose={() => setToastQueue(null)} />}
    </div>
  )
}

export default ThreadsPage