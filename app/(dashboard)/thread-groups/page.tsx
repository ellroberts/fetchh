// app/(dashboard)/thread-groups/page.tsx
'use client'

import { convertToMarkdown, convertToPlainText, triggerDownload, buildExportFilename } from '@/lib/export-utils'
import type { ExportFormat } from '@/lib/export-utils'
import { friendlyErrorMessage } from '@/lib/errors'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { FilterState } from '@/components/ThreadFilters'
import { PageHeader } from '@/components/layout/PageHeader'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { AddToProjectModal } from '@/components/AddToProjectModal'
import { NewProjectModal } from '@/components/NewProjectModal'
import { EmptyState } from '@/components/EmptyState'
import { AddThreadModal } from '@/components/AddThreadModal'
import { AddThreadSourceModal } from '@/components/AddThreadSourceModal'
import { Checkbox } from '@/components/Checkbox'
import { FolderOpen, SearchX, Plus } from 'lucide-react'
import { TabPill } from '@/components/TabPill'
import { ActionItemCard, ActionItem } from '@/components/projects/ActionItemCard'
import { ReminderCard, ReminderItem } from '@/components/projects/ReminderCard'
import { ProjectInsightCard } from '@/components/projects/ProjectInsightCard'
import { ActionItemDrawer } from '@/components/projects/ActionItemDrawer'
import { ReminderDrawer } from '@/components/projects/ReminderDrawer'

// Extends the shared Conversation type with thread_id which this page fetches
interface ConversationWithThread extends Conversation {
  thread_id?: string | null
}

interface ThreadGroup {
  threadId: string
  root: ConversationWithThread
  continuations: ConversationWithThread[]  // sorted by continuation_depth then created_at
  allMembers: ConversationWithThread[]     // root + continuations
}

function buildThreadGroups(
  conversations: ConversationWithThread[],
  filteredIds: Set<string>,
): ThreadGroup[] {
  const byId = new Map(conversations.map(c => [c.id, c]))

  // Collect every unique non-null thread_id across all conversations
  const threadIds = new Set(
    conversations.filter(c => c.thread_id).map(c => c.thread_id as string)
  )

  const groups: ThreadGroup[] = []

  for (const threadId of threadIds) {
    const root = byId.get(threadId)
    if (!root) continue

    const continuations = conversations
      .filter(c => c.thread_id === threadId)
      .sort(
        (a, b) =>
          (a.continuation_depth ?? 1) - (b.continuation_depth ?? 1) ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )

    if (continuations.length === 0) continue

    const allMembers = [root, ...continuations]

    // Only include this group if 2+ of its members pass the current filter
    const visibleCount = allMembers.filter(c => filteredIds.has(c.id)).length
    if (visibleCount < 2) continue

    groups.push({ threadId, root, continuations, allMembers })
  }

  // Most recently active group first
  return groups.sort((a, b) => {
    const latestA = Math.max(...a.allMembers.map(c => new Date(c.created_at).getTime()))
    const latestB = Math.max(...b.allMembers.map(c => new Date(c.created_at).getTime()))
    return latestB - latestA
  })
}

interface Project {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at?: string
}

const ThreadGroupsPage = () => {
  const [conversations, setConversations] = useState<ConversationWithThread[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [filters, setFilters] = useState<FilterState>({
    platforms: [],
    dateRange: 'all',
    projectId: 'all',
    topics: [],
  })
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<ConversationWithThread[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithThread | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set())
  const [threadDrawer, setThreadDrawer] = useState<{ conversationId: string; conversationTitle: string } | null>(null)
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'threads' | 'highlights' | 'actions' | 'reminders'>('threads')
  const [tabCounts, setTabCounts] = useState<{ highlights: number; actions: number; reminders: number }>({ highlights: 0, actions: 0, reminders: 0 })
  const [tabItems, setTabItems] = useState<{ highlights: any[]; actions: ActionItem[]; reminders: ReminderItem[]; conversations: { id: string; title: string }[] }>({ highlights: [], actions: [], reminders: [], conversations: [] })
  const [activeActionItem, setActiveActionItem] = useState<ActionItem | null>(null)
  const [activeReminderItem, setActiveReminderItem] = useState<ReminderItem | null>(null)

  const { openScoped, close } = useRagPanel()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
  const [user, setUser] = useState<any>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<ConversationWithThread | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [conversationToRename, setConversationToRename] = useState<ConversationWithThread | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)

  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
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
    },
    conversationCount: conversations.length,
    subscriptionTier,
  })

  const [toastQueue, setToastQueue] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastQueue({ type, message })
    setTimeout(() => setToastQueue(null), 3500)
  }

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchConversations = async (userId: string, tier: string = subscriptionTier) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, created_at, title, content, source, user_id, tags, summary, quick_summary, platform, message_count, project_id, has_embeddings, last_embedded_at, parent_conversation_id, thread_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const planLimits: Record<string, number> = { free: 10, starter: 50, pro: 200, unlimited: Infinity }
      const limit = planLimits[tier] ?? 10
      const convList = (data || []) as ConversationWithThread[]
      const idToConv = Object.fromEntries(convList.map(c => [c.id, c]))
      const getDepth = (conv: ConversationWithThread, visited = new Set<string>()): number => {
        if (!conv.parent_conversation_id) return 0
        if (visited.has(conv.id)) return 0
        visited.add(conv.id)
        const parent = idToConv[conv.parent_conversation_id]
        return parent ? 1 + getDepth(parent, visited) : 1
      }
      const annotated = convList.map((conv, index) => ({
        ...conv,
        locked: index >= limit,
        continuation_depth: getDepth(conv),
      }))
      setConversations(annotated)
    } catch (err: any) {
      setError(friendlyErrorMessage(err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setProjects(data)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
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
        id: i.id,
        user_id: i.user_id,
        highlighted_text: i.content,
        conversation_id: (i.source_conversation_ids || [])[0] || null,
        created_at: i.created_at,
        is_archived: false,
        _source: 'insight',
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
      setTabItems({
        highlights: allHighlights,
        actions: actionsRes.data as ActionItem[] || [],
        reminders: remindersRes.data as ReminderItem[] || [],
        conversations: convs,
      })
    } catch (err) {
      console.error('Error fetching tab items:', err)
    }
  }, [])

  const fetchPinCounts = useCallback(async (userId: string) => {
    try {
      const [{ data: highlightData }, { data: actionData }, { data: reminderData }] = await Promise.all([
        supabase.from('highlights').select('conversation_id').eq('user_id', userId).eq('is_archived', false),
        supabase.from('action_items').select('source_conversation_ids').eq('user_id', userId),
        supabase.from('reminder_items').select('source_conversation_ids').eq('user_id', userId),
      ])
      const counts: Record<string, number> = {}
      if (highlightData) {
        highlightData.forEach((r: any) => {
          if (r.conversation_id) counts[r.conversation_id] = (counts[r.conversation_id] || 0) + 1
        })
      }
      const addCounts = (rows: any[] | null) => {
        if (!rows) return
        rows.forEach(r => {
          if (Array.isArray(r.source_conversation_ids)) {
            r.source_conversation_ids.forEach((id: string) => { counts[id] = (counts[id] || 0) + 1 })
          }
        })
      }
      addCounts(actionData)
      addCounts(reminderData)
      setPinCounts(counts)
    } catch (err) {
      console.error('Error fetching pin counts:', err)
    }
  }, [])

  // ── Initialise ───────────────────────────────────────────────────────────────

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
    } catch (err: any) {
      setError(friendlyErrorMessage(err.message || ''))
      setLoading(false)
    }
  }

  // ── useEffect wiring ─────────────────────────────────────────────────────────

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
    const hasProcessing = conversations.some(conv => !conv.has_embeddings && !conv.locked)
    if (hasProcessing) {
      const interval = setInterval(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('conversations')
            .select('id, created_at, title, content, source, user_id, tags, summary, quick_summary, platform, message_count, project_id, has_embeddings, last_embedded_at, parent_conversation_id, thread_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          if (data) setConversations(data as ConversationWithThread[])
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [conversations, supabase])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
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

  useEffect(() => {
    const handler = () => {
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        if (data.user) {
          fetchPinCounts(data.user.id)
          fetchTabCounts(data.user.id)
          fetchTabItems(data.user.id)
        }
      })
    }
    const events = ['threadcub:insight-saved', 'threadcub:action-item-added', 'threadcub:reminder-item-added']
    events.forEach(e => window.addEventListener(e, handler))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [fetchPinCounts, fetchTabCounts, fetchTabItems])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).single()
        const tier = profile?.subscription_tier ?? 'free'
        if (profile?.subscription_tier) setSubscriptionTier(tier)
        await fetchConversations(user.id, tier)
        sessionStorage.removeItem('claim_banner_dismissed')
        resetBanner()
        await checkClaimableConversations()
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleViewDetails = (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId)
    setThreadDrawer({ conversationId, conversationTitle: conv?.title || 'Thread' })
  }

  const downloadConversation = (conversation: ConversationWithThread, format: ExportFormat = 'json') => {
    const parsed = typeof conversation.content === 'string'
      ? (() => { try { return JSON.parse(conversation.content) } catch { return {} } })()
      : (conversation.content || {})
    const exportData = {
      title: conversation.title,
      platform: conversation.platform || conversation.source || 'unknown',
      exportDate: new Date().toISOString(),
      message_count: conversation.message_count ?? 0,
      tags: typeof conversation.tags === 'string' ? conversation.tags.split(',').map(t => t.trim()).filter(Boolean) : (conversation.tags ?? null),
      url: conversation.url || conversation.metadata?.source_url || null,
      summary: conversation.summary
        ? conversation.summary.replace(/^>\s*/gm, '').replace(/^\s*[\$#~].*$/gm, '').trim() || null
        : null,
      messages: parsed.messages || [],
    }
    const filename = buildExportFilename(conversation.title, format)
    if (format === 'json') triggerDownload(JSON.stringify(exportData, null, 2), filename, 'application/json')
    else if (format === 'markdown') triggerDownload(convertToMarkdown(exportData), filename, 'text/markdown')
    else triggerDownload(convertToPlainText(exportData), filename, 'text/plain')
  }

  const renameConversation = (conversation: ConversationWithThread) => {
    setConversationToRename(conversation)
    setShowRenameModal(true)
  }

  const confirmRenameConversation = async (newTitle: string) => {
    if (!conversationToRename) return
    setIsRenaming(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase.from('conversations').update({ title: newTitle }).eq('id', conversationToRename.id)
      if (error) throw error
      setConversations(prev => prev.map(c => c.id === conversationToRename.id ? { ...c, title: newTitle } : c))
    } catch (err) {
      console.error('Error renaming conversation:', err)
    } finally {
      setIsRenaming(false)
      setShowRenameModal(false)
      setConversationToRename(null)
    }
  }

  const deleteConversation = (conversation: ConversationWithThread) => {
    setConversationToDelete(conversation)
    setShowDeleteModal(true)
  }

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return
    setIsDeleting(true)
    const idsToDelete = selectedConversationIds.size > 1
      ? Array.from(selectedConversationIds)
      : [conversationToDelete.id]
    const deletedProjectId = conversationToDelete.project_id ?? null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
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
      if (deletedProjectId) triggerStorylineUpdate(deletedProjectId, 'thread_deleted')
    } catch (err) {
      console.error('Error deleting conversation:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setConversationToDelete(null)
    }
  }

  const triggerStorylineUpdate = async (
    projectId: string,
    action: 'thread_added' | 'thread_removed' | 'thread_deleted' | 'thread_moved',
    previousProjectId?: string,
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`/api/storyline/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, previousProjectId }),
      })
    } catch (err) {
      console.error('Storyline trigger failed (non-critical):', err)
    }
  }

  const createProjectInline = async (name: string): Promise<string | null> => {
    const u = (await supabase.auth.getUser()).data.user
    if (!u) return null
    const { data, error } = await supabase.from('projects').insert([{ name, user_id: u.id }]).select().single()
    if (error || !data) return null
    setProjects(prev => [...prev, data])
    return data.id
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
    setNewProjectName('')
    setNewProjectDescription('')
    setShowNewProjectModal(false)
  }

  const openAddToProjectModal = (conversation: ConversationWithThread) => {
    setSelectedConversation(conversation)
    setShowProjectModal(true)
  }

  const addToProject = async () => {
    if (!selectedProjectId) return
    const isBulk = selectedConversationIds.size > 1
    const idsToUpdate = isBulk ? Array.from(selectedConversationIds) : (selectedConversation ? [selectedConversation.id] : [])
    if (idsToUpdate.length === 0) return
    try {
      const { error } = await supabase.from('conversations').update({ project_id: selectedProjectId }).in('id', idsToUpdate)
      if (!error) {
        const previousProjectIds = new Set(
          conversations.filter(c => idsToUpdate.includes(c.id) && c.project_id && c.project_id !== selectedProjectId).map(c => c.project_id as string)
        )
        setConversations(prev => prev.map(c => idsToUpdate.includes(c.id) ? { ...c, project_id: selectedProjectId } : c))
        setShowProjectModal(false)
        setSelectedConversation(null)
        setSelectedProjectId('')
        if (isBulk) setSelectedConversationIds(new Set())
        triggerStorylineUpdate(selectedProjectId, previousProjectIds.size > 0 ? 'thread_moved' : 'thread_added')
        previousProjectIds.forEach(prevId => triggerStorylineUpdate(prevId, 'thread_removed'))
      }
    } catch (err) {
      alert('Failed to add to project. Please try again.')
    }
  }

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversationIds(prev => {
      const next = new Set(prev)
      next.has(conversationId) ? next.delete(conversationId) : next.add(conversationId)
      return next
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
    Array.from(selectedConversationIds).forEach(id => {
      const conv = conversations.find(c => c.id === id)
      if (conv) downloadConversation(conv, format)
    })
  }

  const handleBulkDelete = () => {
    if (selectedConversationIds.size === 0) return
    const conv = conversations.find(c => c.id === Array.from(selectedConversationIds)[0])
    if (conv) { setConversationToDelete(conv); setShowDeleteModal(true) }
  }

  const clearSelection = () => { setSelectedConversationIds(new Set()); close() }

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

  // ── Thread grouping ──────────────────────────────────────────────────────────

  const getFilteredConversations = (): ConversationWithThread[] => {
    const base = searchResults !== null ? searchResults : conversations
    let filtered = base
    if (filters.platforms.length > 0) {
      filtered = filtered.filter(c => {
        const p = (c.platform || c.source || '').toLowerCase()
        return filters.platforms.some(fp => p.includes(fp))
      })
    }
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const startOf = (unit: 'day' | 'week' | 'month') => {
        const d = new Date(now)
        if (unit === 'day') d.setHours(0, 0, 0, 0)
        else if (unit === 'week') { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0) }
        else if (unit === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0) }
        return d
      }
      const cutoff = filters.dateRange === 'today' ? startOf('day') : filters.dateRange === 'week' ? startOf('week') : startOf('month')
      filtered = filtered.filter(c => new Date(c.created_at) >= cutoff)
    }
    if (filters.projectId === 'none') filtered = filtered.filter(c => !c.project_id)
    else if (filters.projectId !== 'all') filtered = filtered.filter(c => c.project_id === filters.projectId)
    if (filters.topics.length > 0) {
      filtered = filtered.filter(c => {
        const tags = c.tags
        if (!tags) return false
        const arr: string[] = Array.isArray(tags) ? tags : (typeof tags === 'string' ? (() => { try { return JSON.parse(tags) } catch { return [] } })() : [])
        return filters.topics.some(t => arr.includes(t))
      })
    }
    return filterConversations(filtered, searchQuery)
  }

  const filteredConversations = getFilteredConversations()
  const filteredIds = useMemo(
    () => new Set(filteredConversations.map(c => c.id)),
    [filteredConversations],
  )
  const threadGroups = useMemo(
    () => buildThreadGroups(conversations, filteredIds),
    [conversations, filteredIds],
  )

  console.log('[thread-groups] groups:', threadGroups.length, threadGroups.map(g => ({
    threadId: g.threadId,
    root: g.root.title,
    continuations: g.continuations.map(c => ({ title: c.title, depth: c.continuation_depth })),
  })))

  const filtersActive = filters.platforms.length > 0 || filters.dateRange !== 'all' || filters.projectId !== 'all' || filters.topics.length > 0 || searchQuery.trim().length > 0
  const allGroupedIds = threadGroups.flatMap(g => g.allMembers.map(c => c.id))
  const allSelected = allGroupedIds.length > 0 && allGroupedIds.every(id => selectedConversationIds.has(id))
  const someSelected = allGroupedIds.some(id => selectedConversationIds.has(id))
  const selectAll = () => setSelectedConversationIds(new Set(allGroupedIds))
  const clearAll = () => setSelectedConversationIds(new Set())

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Page header ── */}
      {!threadDrawer && !loading && conversations.length > 0 && (
        <div className="px-8 shrink-0" style={{
          paddingTop: '32px',
          position: 'relative',
          zIndex: 1,
          boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          transition: 'box-shadow 200ms ease',
        }}>
          <PageHeader
            title="Thread Groups"
            subtitle={`${threadGroups.length} thread${threadGroups.length !== 1 ? 's' : ''} with continuations`}
            showFilters
            filters={filters}
            filterProjects={projects}
            filterConversations={conversations}
            onFiltersChange={setFilters}
            showViewToggle
            viewMode={viewMode}
            onViewModeChange={(mode) => setViewMode(mode as 'card' | 'list')}
            showRefresh
            isRefreshing={refreshing}
            onRefresh={handleRefresh}
            tabs={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TabPill label={`Threads (${threadGroups.length})`} selected={activeTab === 'threads'} onClick={() => setActiveTab('threads')} />
                <TabPill label={`Highlights (${tabCounts.highlights})`} selected={activeTab === 'highlights'} onClick={() => setActiveTab('highlights')} />
                <TabPill label={`Actions (${tabCounts.actions})`} selected={activeTab === 'actions'} onClick={() => setActiveTab('actions')} />
                <TabPill label={`Reminders (${tabCounts.reminders})`} selected={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
              </div>
            }
          />
        </div>
      )}

      {threadDrawer ? (
        <ThreadDrawer
          pageTitle="Thread Groups"
          conversationId={threadDrawer.conversationId}
          conversationTitle={threadDrawer.conversationTitle}
          highlightText=""
          onClose={() => { setThreadDrawer(null); setScrolled(false) }}
        />
      ) : (
        <div
          ref={scrollRef}
          onScroll={() => setScrolled((scrollRef.current?.scrollTop ?? 0) > 0)}
          className="flex-1 overflow-auto px-8 pb-24"
          style={{ paddingTop: '24px' }}
        >

          {/* ── Threads tab ── */}
          {activeTab === 'threads' && (<>

            {showClaimBanner && conversations.length > 0 && (
              <ClaimBanner {...claimBannerProps} style={{ marginBottom: 'var(--spacing-4)' }} />
            )}

            {threadGroups.length > 0 && (
              <Checkbox
                label="Select all"
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={(checked) => checked ? selectAll() : clearAll()}
                style={{ marginBottom: 'var(--spacing-3)' }}
              />
            )}

            {showNewProjectModal && (
              <NewProjectModal
                name={newProjectName}
                description={newProjectDescription}
                onChangeName={setNewProjectName}
                onChangeDescription={setNewProjectDescription}
                onConfirm={async () => { await createAndAssignProject() }}
                onClose={() => { setShowNewProjectModal(false); setNewProjectName(''); setNewProjectDescription('') }}
                threads={[]}
              />
            )}
            {showProjectModal && (
              <AddToProjectModal
                conversationTitle={selectedConversation?.title ?? ''}
                count={selectedConversationIds.size > 1 ? selectedConversationIds.size : 1}
                projects={projects}
                selectedProjectId={selectedProjectId}
                onChangeProject={setSelectedProjectId}
                onConfirm={addToProject}
                onCreateProject={createProjectInline}
                onClose={() => { setShowProjectModal(false); setSelectedConversation(null); setSelectedProjectId('') }}
              />
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)' }}>Loading conversations...</span>
              </div>
            )}

            {error && (
             <Alert type="error" style={{ marginTop: 'var(--spacing-4)', marginBottom: '1rem' }}>
                <strong>Error</strong>
                <p className="text-sm mt-1">{error}</p>
              </Alert>
            )}

            {/* ── Empty states ── */}
            {!loading && !error && threadGroups.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
                {filtersActive ? (
                  <EmptyState
                    size="page"
                    icon={SearchX}
                    iconColor="var(--color-icon-subtle)"
                    title="No thread groups match your filters"
                    subtitle="Try adjusting your search or filters"
                  />
                ) : (
                  <EmptyState
                    size="page"
                    icon={FolderOpen}
                    iconColor="var(--color-accent-teal)"
                    title="No multi-part threads yet"
                    subtitle="Use Continue Chat in the extension to build a thread, then save it here."
                  />
                )}
              </div>
            )}

            {/* ── Thread groups list ── */}
            {!loading && !error && threadGroups.length > 0 && (
              <div className="flex flex-col gap-4">
                {threadGroups.map(group => (
                  <div
                    key={group.threadId}
                    style={{
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--border-radius-lg)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--color-surface-raised)',
                    }}
                  >
                    {/* Group label */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      padding: '6px 14px',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {group.allMembers.length} conversation{group.allMembers.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Root conversation */}
                    <ConversationCard
                      conversation={{ ...group.root, platform: group.root.platform !== 'unknown' ? group.root.platform : group.root.source }}
                      viewMode={viewMode}
                      selectable
                      isSelected={selectedConversationIds.has(group.root.id)}
                      onSelect={() => toggleConversationSelection(group.root.id)}
                      onViewDetails={handleViewDetails}
                      onAddToProject={openAddToProjectModal}
                      onRename={renameConversation}
                      onDelete={deleteConversation}
                      onDownload={downloadConversation}
                      pinCount={pinCounts[group.root.id] || 0}
                    />

                    {/* Continuations — indented by continuation_depth, with faint left border */}
                    {group.continuations.map(conv => (
                      <div
                        key={conv.id}
                        style={{
                          marginLeft: `${(conv.continuation_depth ?? 1) * 24}px`,
                          borderLeft: '2px solid var(--color-border-subtle)',
                          borderTop: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        <ConversationCard
                          conversation={{ ...conv, platform: conv.platform !== 'unknown' ? conv.platform : conv.source }}
                          viewMode={viewMode}
                          selectable
                          isSelected={selectedConversationIds.has(conv.id)}
                          onSelect={() => toggleConversationSelection(conv.id)}
                          onViewDetails={handleViewDetails}
                          onAddToProject={openAddToProjectModal}
                          onRename={renameConversation}
                          onDelete={deleteConversation}
                          onDownload={downloadConversation}
                          pinCount={pinCounts[conv.id] || 0}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

          </>)}

          {/* ── Highlights tab ── */}
          {activeTab === 'highlights' && (
            <div className="flex-1 overflow-auto pb-24" style={{ paddingTop: '24px' }}>
              {tabItems.highlights.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No highlights yet. Select text in any thread to save one.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tabItems.highlights.map((h: any) => {
                    const sourceTitle = h.conversation_id ? tabItems.conversations.find(c => c.id === h.conversation_id)?.title : null
                    return (
                      <div key={h.id} style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--border-radius-base)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)', lineHeight: 1.6, margin: 0 }}>{h.highlighted_text}</p>
                          {sourceTitle && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 6, marginBottom: 0, fontStyle: 'italic' }}>{sourceTitle}</p>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={async () => {
                              await supabase.from('highlights').update({ is_archived: true }).eq('id', h.id)
                              setTabItems(prev => ({ ...prev, highlights: prev.highlights.filter(x => x.id !== h.id) }))
                              setTabCounts(prev => ({ ...prev, highlights: prev.highlights - 1 }))
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px 4px', borderRadius: 4 }}
                          >✕</button>
                          {h.conversation_id && (
                            <button
                              onClick={() => {
                                const conv = tabItems.conversations.find(c => c.id === h.conversation_id)
                                setThreadDrawer({ conversationId: h.conversation_id, conversationTitle: conv?.title || '' })
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-500)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', padding: '2px 4px', borderRadius: 4, whiteSpace: 'nowrap' }}
                            >View in thread →</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Actions tab ── */}
          {activeTab === 'actions' && !activeActionItem && (
            <div className="flex-1 overflow-auto pb-24" style={{ paddingTop: '24px' }}>
              {tabItems.actions.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No actions yet. Select text in any thread or RAG to save one.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tabItems.actions.map(item => {
                    const ids = item.source_conversation_ids || []
                    const sourceLabel = ids.length > 1 ? 'Coda says' : ids.length === 1 ? tabItems.conversations.find(c => c.id === ids[0])?.title || null : null
                    return (
                      <ActionItemCard key={item.id} item={item} conversations={tabItems.conversations} onToggleStatus={handleToggleActionStatus} onOpen={setActiveActionItem} viewMode="list" sourceLabel={sourceLabel} />
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'actions' && activeActionItem && (
            <ActionItemDrawer
              item={activeActionItem}
              conversations={tabItems.conversations}
              onClose={() => setActiveActionItem(null)}
              onToggleStatus={handleToggleActionStatus}
              onOpenThread={(id, title) => { setActiveActionItem(null); setThreadDrawer({ conversationId: id, conversationTitle: title }) }}
            />
          )}

          {/* ── Reminders tab ── */}
          {activeTab === 'reminders' && !activeReminderItem && (
            <div className="flex-1 overflow-auto pb-24" style={{ paddingTop: '24px' }}>
              {tabItems.reminders.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No reminders yet. Select text in any thread or RAG to save one.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tabItems.reminders.map(item => {
                    const ids = item.source_conversation_ids || []
                    const sourceLabel = ids.length > 1 ? 'Coda says' : ids.length === 1 ? tabItems.conversations.find(c => c.id === ids[0])?.title || null : null
                    return (
                      <ReminderCard key={item.id} item={item} conversations={tabItems.conversations} onToggleStatus={handleToggleReminderStatus} onOpen={setActiveReminderItem} viewMode="list" sourceLabel={sourceLabel} />
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'reminders' && activeReminderItem && (
            <ReminderDrawer
              item={activeReminderItem}
              conversations={tabItems.conversations}
              onClose={() => setActiveReminderItem(null)}
              onToggleStatus={handleToggleReminderStatus}
              onOpenThread={(id, title) => { setActiveReminderItem(null); setThreadDrawer({ conversationId: id, conversationTitle: title }) }}
            />
          )}

        </div>
      )}

      {/* ── Modals ── */}
      {showClaimModal && (
        <ClaimModal conversations={claimableConversations} onClaim={claimConversations} onCancel={() => setShowClaimModal(false)} onDiscard={discardAll} claiming={claiming} discarding={discarding} />
      )}
      {showRenameModal && conversationToRename && (
        <RenameConversationModal
          currentTitle={conversationToRename.title}
          onSave={confirmRenameConversation}
          onCancel={() => { setShowRenameModal(false); setConversationToRename(null) }}
          saving={isRenaming}
        />
      )}
      {showDeleteModal && conversationToDelete && (
        <DeleteConversationModal
          title={conversationToDelete.title}
          count={selectedConversationIds.size > 1 ? selectedConversationIds.size : 1}
          isDeleting={isDeleting}
          onConfirm={confirmDeleteConversation}
          onCancel={() => { setShowDeleteModal(false); setConversationToDelete(null) }}
        />
      )}

      {/* ── Floating action bar & selection ── */}
      {showAddMenu && (
        <AddThreadSourceModal
          onClose={() => setShowAddMenu(false)}
          onFileUpload={() => fileInputRef.current?.click()}
          onCloudDownload={claimBannerProps.count > 0 ? () => setShowClaimModal(true) : undefined}
        />
      )}
      <SelectionActionBar
        selectedCount={selectedConversationIds.size}
        onAskCoda={handleBulkAskCoda}
        onAddToProject={handleBulkAddToProject}
        onDownload={handleBulkDownload}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      {toastQueue && <Toast type={toastQueue.type} message={toastQueue.message} onClose={() => setToastQueue(null)} />}
    </div>
  )
}

export default ThreadGroupsPage
