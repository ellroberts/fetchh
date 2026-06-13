// app/(dashboard)/projects/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '../../../lib/supabase'
import { DeleteConversationModal } from '@/components/DeleteConversationModal'
import { ProjectCard } from '@/components/ProjectCard'
import { NewProjectModal } from '@/components/NewProjectModal'
import { DeleteProjectModal } from '@/components/DeleteProjectModal'
import { RenameConversationModal } from '@/components/RenameConversationModal'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { type ExportFormat, convertToMarkdown, convertToPlainText, buildExportFilename } from '@/lib/export-utils'
import { ConversationCard } from '@/components/ConversationCard'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { AddToProjectModal } from '@/components/AddToProjectModal'
import { useRagPanel } from '@/lib/rag-panel-context'
import { EmptyState } from '@/components/EmptyState'
import { FolderOpen } from 'lucide-react'
import { TIER_DEFINITIONS, type SubscriptionTier } from '@/lib/tier-limits'
import { TabPill } from '@/components/TabPill'
import { TabFilterPanel, TabFilterState, DEFAULT_TAB_FILTER_STATE, applyTabFilter, groupByTime } from '@/components/TabFilterPanel'
import { PawmarkCard } from '@/components/PawmarkCard'
import { EditNoteTagModal, EditNoteTagMode } from '@/components/EditNoteTagModal'
import { SectionHeader } from '@/components/SectionHeader'
import { ActionItem } from '@/components/projects/ActionItemCard'
import { ReminderItem } from '@/components/projects/ReminderCard'
import { SelectAllRow } from '@/components/SelectAllRow'
import { ReminderDrawer } from '@/components/projects/ReminderDrawer'
import { ActionItemDrawer } from '@/components/projects/ActionItemDrawer'

// ─── Retry helper ─────────────────────────────────────────────────────────────

const withRetry = async (operation: any, maxRetries = 3): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error.message)
      if (attempt === maxRetries) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  title: string
  created_at: string
  message_count: number
  source: string
  platform?: string
  project_id?: string | null
  user_id?: string | null
  summary?: string
  quick_summary?: { overview?: string } | null
  has_embeddings?: boolean
  tags?: string
}

interface Project {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at?: string
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

function groupProjects(
  projects: Project[],
  pinnedIds: Set<string>
): Array<{ key: SectionKey; label: string; items: Project[] }> {
  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfLastWeek = new Date(startOfToday); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const groups: Record<SectionKey, Project[]> = {
    pinned: [], today: [], yesterday: [], last_week: [], older: [],
  }

  for (const p of projects) {
    if (pinnedIds.has(p.id)) { groups.pinned.push(p); continue }
    const d = new Date(p.created_at)
    if (d >= startOfToday) groups.today.push(p)
    else if (d >= startOfYesterday) groups.yesterday.push(p)
    else if (d >= startOfLastWeek) groups.last_week.push(p)
    else groups.older.push(p)
  }

  return SECTION_ORDER
    .filter(k => groups[k].length > 0)
    .map(k => ({ key: k, label: SECTION_LABELS[k], items: groups[k] }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProjectsPage = () => {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { openScoped, setProjectScope, clearProjectScope } = useRagPanel()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pinnedProjectIds, setPinnedProjectIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'storyline'>('list')
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())
  const [filterSource, setFilterSource] = useState('all')
  const [currentView, setCurrentView] = useState<'projects' | 'conversations'>('projects')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'projects' | 'highlights' | 'actions' | 'reminders'>('projects')
  const [tabCounts, setTabCounts] = useState<{ highlights: number; actions: number; reminders: number }>({ highlights: 0, actions: 0, reminders: 0 })
  const [tabItems, setTabItems] = useState<{ highlights: any[]; actions: ActionItem[]; reminders: ReminderItem[]; conversations: { id: string; title: string }[] }>({ highlights: [], actions: [], reminders: [], conversations: [] })
  const [activeActionItem, setActiveActionItem] = useState<ActionItem | null>(null)
  const [activeReminderItem, setActiveReminderItem] = useState<ReminderItem | null>(null)
  const [editingNoteTag, setEditingNoteTag] = useState<{ id: string; type: 'highlights' | 'actions' | 'reminders'; mode: EditNoteTagMode; currentNote?: string; currentTag?: string } | null>(null)
  const [tabFilterState, setTabFilterState] = useState<TabFilterState>(DEFAULT_TAB_FILTER_STATE)
  const [tabCollapsedSections, setTabCollapsedSections] = useState<Record<string, boolean>>({})

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [showUpgradeView, setShowUpgradeView] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [showDeleteConversationModal, setShowDeleteConversationModal] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteModalCounts, setDeleteModalCounts] = useState<{ highlights: number; actions: number; reminders: number }>({ highlights: 0, actions: 0, reminders: 0 })
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [projectToRename, setProjectToRename] = useState<Project | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [claimableConversations, setClaimableConversations] = useState<any[]>([])

  // ── Pinning ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pinnedProjectIds')
      if (stored) setPinnedProjectIds(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  const togglePin = (project: Project, pinned: boolean) => {
    setPinnedProjectIds(prev => {
      const next = new Set(prev)
      pinned ? next.add(project.id) : next.delete(project.id)
      try { localStorage.setItem('pinnedProjectIds', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  // ── Scoped RAG ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (conversations.length === 0) return
    const scoped = conversations.filter(c => c.project_id != null)
    if (scoped.length === 0) return
    const titles = new Map(scoped.map(c => [c.id, c.title]))
    setProjectScope(scoped.map(c => c.id), titles, 'All projects')
    return () => clearProjectScope()
  }, [conversations, setProjectScope, clearProjectScope])

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }
      setUser(authUser)
      const { data: profile } = await supabase.from('user_profiles').select('subscription_tier').eq('id', authUser.id).single()
      if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier)

      const { data: conversationsData, error: conversationsError } = await withRetry(() =>
        supabase.from('conversations').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false })
      )
      if (conversationsError) { console.error('Error fetching conversations:', conversationsError); setConversations([]) }
      else setConversations(conversationsData || [])

      // Fetch claimable (guest) conversations by session
const sessionId = localStorage.getItem('threadcub_session_id')
if (sessionId) {
  const { data: claimable } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .is('user_id', null)
    .is('removed_at', null)
    .order('created_at', { ascending: false })
  setClaimableConversations(claimable || [])
}

      const { data: projectsData, error: projectsError } = await withRetry(() =>
        supabase.from('projects').select('*').order('created_at', { ascending: false })
      )
      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        setProjects([{ id: 'general', name: 'General Conversations', description: 'All unorganized conversations', created_at: new Date().toISOString() }])
      } else setProjects(projectsData || [])

      await fetchTabCounts(authUser.id)
      await fetchTabItems(authUser.id)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTabCounts = useCallback(async (userId: string) => {
    try {
      const [{ count: hCount }, { count: aCount }, { count: rCount }] = await Promise.all([
        supabase.from('highlights').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_archived', false),
        supabase.from('action_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('reminder_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      setTabCounts({ highlights: hCount ?? 0, actions: aCount ?? 0, reminders: rCount ?? 0 })
    } catch (err) {
      console.error('Error fetching tab counts:', err)
    }
  }, [])

  const fetchTabItems = useCallback(async (userId: string) => {
    try {
      const [highlightsRes, actionsRes, remindersRes] = await Promise.all([
        supabase.from('highlights').select('*').eq('user_id', userId).eq('is_archived', false).order('created_at', { ascending: false }),
        supabase.from('action_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('reminder_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      const allIds = new Set<string>()
      ;(highlightsRes.data || []).forEach((h: any) => { if (h.conversation_id) allIds.add(h.conversation_id) })
      actionsRes.data?.forEach((a: any) => { (a.source_conversation_ids || []).forEach((id: string) => allIds.add(id)) })
      remindersRes.data?.forEach((r: any) => { (r.source_conversation_ids || []).forEach((id: string) => allIds.add(id)) })
      let convs: { id: string; title: string }[] = []
      if (allIds.size > 0) {
        const { data: convData } = await supabase.from('conversations').select('id, title').in('id', Array.from(allIds))
        convs = convData || []
      }
      setTabItems({
        highlights: (highlightsRes.data || []).map((h: any) => ({ ...h, _source: 'highlight' })),
        actions: actionsRes.data as ActionItem[] || [],
        reminders: remindersRes.data as ReminderItem[] || [],
        conversations: convs,
      })
    } catch (err) {
      console.error('Error fetching tab items:', err)
    }
  }, [])

  // ── Tab item handlers ────────────────────────────────────────────────────────

  const handleToggleActionStatus = async (id: string, status: 'open' | 'done') => {
    await supabase.from('action_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setTabItems(prev => ({ ...prev, actions: prev.actions.map(a => a.id === id ? { ...a, status, completed_at: status === 'done' ? new Date().toISOString() : null } : a) }))
    if (activeActionItem?.id === id) setActiveActionItem(prev => prev ? { ...prev, status } : prev)
  }

  const handleToggleReminderStatus = async (id: string, status: 'open' | 'done') => {
    await supabase.from('reminder_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setTabItems(prev => ({ ...prev, reminders: prev.reminders.map(r => r.id === id ? { ...r, status, completed_at: status === 'done' ? new Date().toISOString() : null } : r) }))
    if (activeReminderItem?.id === id) setActiveReminderItem(prev => prev ? { ...prev, status } : prev)
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

  // ── Project CRUD ─────────────────────────────────────────────────────────────

  const openNewProjectModal = () => {
    const tierDef = TIER_DEFINITIONS[subscriptionTier as SubscriptionTier]
    const atLimit = tierDef?.projectLimit !== null && projects.length >= (tierDef?.projectLimit ?? Infinity)
    setShowUpgradeView(atLimit)
    setShowCreateProjectModal(true)
  }

  const createProject = async (selectedThreadIds: string[] = []) => {
    if (!newProjectName.trim()) return
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name: newProjectName.trim(), description: newProjectDescription.trim() || null, user_id: authUser.id }])
        .select()
      if (error) { console.error('Error creating project:', error); return }
      // !! DO NOT REMOVE — triggers onboarding "created_project" step completion !!
      window.dispatchEvent(new CustomEvent('threadcub:project-created'))
      const newProjectId = data[0].id
      // Claim any claimable threads that were selected
const claimableIds = selectedThreadIds.filter(id => claimableConversations.some(c => c.id === id))
if (claimableIds.length > 0) {
  await supabase
    .from('conversations')
    .update({ user_id: authUser.id, removed_at: null })
    .in('id', claimableIds)
  setClaimableConversations(prev => prev.filter(c => !claimableIds.includes(c.id)))
}
      if (selectedThreadIds.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch('/api/projects/assign-threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ projectId: newProjectId, threadIds: selectedThreadIds }),
          })
          const result = await res.json()
          if (!res.ok) console.error('[assign-threads] Failed:', result.error)
        }
      }
      setShowCreateProjectModal(false)
      setNewProjectName('')
      setNewProjectDescription('')
      if (selectedThreadIds.length === 0) await fetchData()
      else router.push(`/projects/${newProjectId}?seeded=${selectedThreadIds.length}`)
    } catch (error) { console.error('Error creating project:', error) }
  }

  const handleRenameProject = async (newName: string) => {
    if (!projectToRename) return
    setIsRenaming(true)
    try {
      const { error } = await supabase.from('projects').update({ name: newName }).eq('id', projectToRename.id)
      if (error) throw error
      setProjects(prev => prev.map(p => p.id === projectToRename.id ? { ...p, name: newName } : p))
    } catch (err) {
      console.error('Error renaming project:', err)
    } finally {
      setIsRenaming(false)
      setShowRenameModal(false)
      setProjectToRename(null)
    }
  }

  const handleDownloadProject = async (project: Project, format: 'txt' | 'markdown' | 'json') => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const projectConvs = conversations.filter(c => c.project_id === project.id)
    const folderName = project.name.replace(/[^a-z0-9]/gi, '_')
    if (format === 'json') {
      zip.file(`${folderName}.json`, JSON.stringify({ project, conversations: projectConvs }, null, 2))
    } else {
      for (const conv of projectConvs) {
        const exportData = {
          title: conv.title,
          platform: conv.platform || conv.source || 'unknown',
          exportDate: new Date().toISOString(),
          message_count: conv.message_count ?? 0,
          tags: typeof conv.tags === 'string' ? conv.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
          summary: conv.summary || null,
          messages: [] as import('@/lib/export-utils').ExportData['messages'],
        }
        const filename = buildExportFilename(conv.title, format)
        const content = format === 'markdown' ? convertToMarkdown(exportData) : convertToPlainText(exportData)
        zip.file(`${folderName}/${filename}`, content)
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${folderName}.zip`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedProjectIds)
    await Promise.all(ids.map(id => supabase.from('projects').delete().eq('id', id)))
    setProjects(prev => prev.filter(p => !ids.includes(p.id)))
    setSelectedProjectIds(new Set())
    setShowBulkDeleteConfirm(false)
  }

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) console.error('Error deleting project:', error)
      setProjects(projects.filter(p => p.id !== projectId))
      setShowDeleteProjectModal(false)
      setProjectToDelete(null)
    } catch (error) { console.error('Error deleting project:', error) }
  }

  const openDeleteConversationModal = async (conversation: Conversation) => {
    setConversationToDelete(conversation)
    const [{ count: hCount }, { count: aCount }, { count: rCount }] = await Promise.all([
      supabase.from('highlights').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation.id),
      supabase.from('action_items').select('id', { count: 'exact', head: true }).overlaps('source_conversation_ids', [conversation.id]),
      supabase.from('reminder_items').select('id', { count: 'exact', head: true }).overlaps('source_conversation_ids', [conversation.id]),
    ])
    setDeleteModalCounts({ highlights: hCount ?? 0, actions: aCount ?? 0, reminders: rCount ?? 0 })
    setShowDeleteConversationModal(true)
  }

  const deleteConversation = async (conversationId: string) => {
    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) { const data = await response.json(); console.error('Error:', data.error); return }
      setConversations(conversations.filter(c => c.id !== conversationId))
      setShowDeleteConversationModal(false)
      setConversationToDelete(null)
    } catch (error) { console.error('Error deleting conversation:', error) }
    finally { setIsDeleting(false) }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const uniqueSources = [...new Set(conversations.map(c => c.source || c.platform || 'unknown'))]

  const [projectInsights, setProjectInsights] = useState<{ project_id: string; source_conversation_ids: string[] }[]>([])
  const [projectActions, setProjectActions] = useState<{ project_id: string; source_conversation_ids: string[] }[]>([])
  const [projectReminders, setProjectReminders] = useState<{ project_id: string; source_conversation_ids: string[] }[]>([])
  const [projectHighlights, setProjectHighlights] = useState<{ conversation_id: string }[]>([])
  const [allActions, setAllActions] = useState<{ source_conversation_ids: string[] }[]>([])
  const [allReminders, setAllReminders] = useState<{ source_conversation_ids: string[] }[]>([])

  useEffect(() => {
    const loadExtraStats = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const [{ data: insightsData }, { data: actionsData }, { data: remindersData }, { data: highlightsData }, { data: allActionsData }, { data: allRemindersData }] = await Promise.all([
        withRetry(() => supabase.from('project_insights').select('project_id, source_conversation_ids')),
        withRetry(() => supabase.from('action_items').select('project_id, source_conversation_ids').eq('user_id', authUser.id)),
        withRetry(() => supabase.from('reminder_items').select('project_id, source_conversation_ids').eq('user_id', authUser.id)),
        withRetry(() => supabase.from('highlights').select('conversation_id').eq('is_archived', false)),
        withRetry(() => supabase.from('action_items').select('source_conversation_ids').eq('user_id', authUser.id)),
        withRetry(() => supabase.from('reminder_items').select('source_conversation_ids').eq('user_id', authUser.id)),
      ])
      if (insightsData) setProjectInsights(insightsData)
      if (actionsData) setProjectActions(actionsData)
      if (remindersData) setProjectReminders(remindersData)
      if (highlightsData) setProjectHighlights(highlightsData)
      if (allActionsData) setAllActions(allActionsData)
      if (allRemindersData) setAllReminders(allRemindersData)
    }
    loadExtraStats()
  }, [])

  const getProjectConversations = (projectId: string) =>
    conversations.filter(c => c.project_id === projectId)

  const getProjectStats = (projectId: string) => {
    const pc = getProjectConversations(projectId)
    const lastActivity = pc.length > 0
      ? new Date(Math.max(...pc.map(c => new Date(c.created_at).getTime()))).toISOString()
      : projects.find(p => p.id === projectId)?.created_at ?? new Date().toISOString()
    return {
      totalConversations: pc.length,
      totalMessages: pc.reduce((sum, c) => sum + (c.message_count || 0), 0),
      totalPins: projectInsights.filter(i => i.project_id === projectId).length
        + allActions.filter(a => (a.source_conversation_ids || []).some(id => pc.some(c => c.id === id))).length
        + allReminders.filter(r => (r.source_conversation_ids || []).some(id => pc.some(c => c.id === id))).length
        + projectHighlights.filter(h => pc.some(c => c.id === h.conversation_id)).length,
      totalSources: [...new Set(pc.map(c => c.source || c.platform || 'unknown'))].length,
      lastActivity,
      sources: [...new Set(pc.map(c => c.source || c.platform || 'unknown'))],
    }
  }

  let filteredConversations = currentView === 'conversations' && selectedProject
    ? getProjectConversations(selectedProject)
    : conversations
  filteredConversations = filteredConversations.filter(conv => {
    const matchesFilter = filterSource === 'all' || (conv.source || conv.platform || 'unknown') === filterSource
    return matchesFilter
  })

  // ── Render helpers ────────────────────────────────────────────────────────────

  const toggleProjectSelection = (id: string) => setSelectedProjectIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const allProjectsSelected = projects.length > 0 && projects.every(p => selectedProjectIds.has(p.id))
  const someProjectsSelected = projects.some(p => selectedProjectIds.has(p.id))
  const selectAllProjects = () => setSelectedProjectIds(new Set(projects.map(p => p.id)))
  const clearAllProjects = () => setSelectedProjectIds(new Set())

  const groupedProjects = groupProjects(projects, pinnedProjectIds)

  const sharedProjectCardProps = (project: Project) => ({
    project,
    stats: getProjectStats(project.id),
    isPinned: pinnedProjectIds.has(project.id),
    onClick: (p: Project) => router.push(`/projects/${p.id}`),
    onDelete: (p: Project) => { setProjectToDelete(p); setShowDeleteProjectModal(true) },
    onPin: togglePin,
    onRename: (p: Project) => { setProjectToRename(p); setShowRenameModal(true) },
    onDownload: handleDownloadProject,
    onSwitchProject: undefined,
    isSelected: selectedProjectIds.has(project.id),
    onSelect: (e: React.MouseEvent) => { e.stopPropagation(); toggleProjectSelection(project.id) },
  })

  const showHeader = !(currentView === 'projects' && projects.length === 0 && !loading)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      {showHeader && (
        <div className="px-8 shrink-0" style={{ paddingTop: 'var(--spacing-8)', paddingBottom: 'var(--spacing-4)', position: 'relative', zIndex: 1, boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'box-shadow 200ms ease' }}>
          <PageHeader
            title={currentView === 'conversations'
              ? `${projects.find(p => p.id === selectedProject)?.name || 'Project'} Threads`
              : 'Your Projects'}
            subtitle={currentView === 'projects'
              ? `${projects.length} projects • ${projects.reduce((sum, p) => sum + conversations.filter(c => c.project_id === p.id).length, 0)} total threads`
              : `${filteredConversations.length} threads in this project`}
            loading={loading}
            showFilters={activeTab !== 'projects'}
            filterContent={<TabFilterPanel state={tabFilterState} onChange={setTabFilterState} />}
            filtersOpen={filtersOpen}
            onFiltersOpenChange={setFiltersOpen}
            showViewToggle={activeTab === 'projects'}
            viewMode={viewMode}
            onViewModeChange={(mode) => setViewMode(mode as 'cards' | 'list')}
            showBack={currentView === 'conversations'}
            onBack={() => { setCurrentView('projects'); setSelectedProject(null) }}
            actions={currentView === 'conversations' ? (
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none"
              >
                <option value="all">All Sources</option>
                {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : undefined}
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
                    <TabPill label={`Projects (${projects.length})`} selected={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
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

      {/* ── Content ── */}
      <div
        ref={scrollRef}
        onScroll={() => setScrolled((scrollRef.current?.scrollTop ?? 0) > 0)}
        className="flex-1 overflow-auto px-8 pb-24"
        style={{ paddingTop: '0' }}
      >

        {/* ── Projects tab ── */}
        {activeTab === 'projects' && (
          <>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <SelectAllRow skeleton />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ProjectCard
                    key={i}
                    skeleton
                    viewMode={viewMode === 'cards' ? 'card' : 'list'}
                    project={{ id: '', name: '', created_at: '' }}
                    stats={{ totalConversations: 0, totalMessages: 0, totalPins: 0, totalSources: 0, lastActivity: '', sources: [] }}
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
                <EmptyState
                  size="page"
                  icon={FolderOpen}
                  iconColor="var(--color-accent-teal)"
                  title="It's looking pretty empty in here..."
                  subtitle="Projects help organise your threads and keep track of useful insights."
                  action={{ label: 'Create one now', onClick: openNewProjectModal, variant: 'primary', style: { filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' } }}
                />
              </div>
            ) : (
              <>
                <SelectAllRow
                  checked={allProjectsSelected}
                  indeterminate={someProjectsSelected && !allProjectsSelected}
                  onChange={(checked) => checked ? selectAllProjects() : clearAllProjects()}
                />
                {groupedProjects.map(section => {
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
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {section.items.map(project => (
                              <ProjectCard key={project.id} {...sharedProjectCardProps(project)} viewMode="card" />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {section.items.map(project => (
                              <ProjectCard key={project.id} {...sharedProjectCardProps(project)} viewMode="list" />
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* REMOVED: highlights/actions/reminders tab panels
        {activeTab === 'highlights' && (
          <div style={{ paddingTop: '24px' }}>
            {tabItems.highlights.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No highlights yet.</p>
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
                        {items.map((h: any) => {
                          const sourceTitle = h.conversation_id ? tabItems.conversations.find(c => c.id === h.conversation_id)?.title : undefined
                          return (
                            <PawmarkCard key={h.id} type="highlight" id={h.id} content={h.highlighted_text} note={h.notes ?? undefined} tag={(h.tags as string[] | null)?.[0] ?? undefined} sourceTitle={sourceTitle} createdAt={h.created_at} isPinned={h.is_pinned ?? false}
                              onNote={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'note', currentNote: h.notes ?? undefined, currentTag: (h.tags as string[] | null)?.[0] ?? undefined })}
                              onTag={() => setEditingNoteTag({ id: h.id, type: 'highlights', mode: 'tag', currentNote: h.notes ?? undefined, currentTag: (h.tags as string[] | null)?.[0] ?? undefined })}
                              onPin={() => handlePinItem(h.id, 'highlights', !(h.is_pinned ?? false))}
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
          <div style={{ paddingTop: '24px' }}>
            {tabItems.actions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No actions yet.</p>
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
                        {items.map(item => {
                          const ids = item.source_conversation_ids || []
                          const sourceTitle = ids.length > 1 ? 'Coda says' : ids.length === 1 ? tabItems.conversations.find(c => c.id === ids[0])?.title || undefined : undefined
                          return (
                            <PawmarkCard key={item.id} type="action" id={item.id} content={item.title} note={item.detail || undefined} tag={(item as any).tags?.[0] ?? undefined} status={item.status} sourceTitle={sourceTitle} createdAt={item.created_at} isPinned={item.is_pinned ?? false}
                              onViewDetails={() => setActiveActionItem(item)}
                              onNote={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'note', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                              onTag={() => setEditingNoteTag({ id: item.id, type: 'actions', mode: 'tag', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                              onPin={() => handlePinItem(item.id, 'actions', !(item.is_pinned ?? false))}
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
          <ActionItemDrawer item={activeActionItem} conversations={tabItems.conversations} onClose={() => setActiveActionItem(null)} onToggleStatus={handleToggleActionStatus} onOpenThread={(id: string, title: string) => { setActiveActionItem(null); router.push(`/threads?open=${id}`) }} />
        )}

        {activeTab === 'reminders' && !activeReminderItem && (
          <div style={{ paddingTop: '24px' }}>
            {tabItems.reminders.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No reminders yet.</p>
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
                        {items.map(item => {
                          const ids = item.source_conversation_ids || []
                          const sourceTitle = ids.length > 1 ? 'Coda says' : ids.length === 1 ? tabItems.conversations.find(c => c.id === ids[0])?.title || undefined : undefined
                          return (
                            <PawmarkCard key={item.id} type="reminder" id={item.id} content={item.title} note={item.detail || undefined} tag={(item as any).tags?.[0] ?? undefined} status={item.status} sourceTitle={sourceTitle} createdAt={item.created_at} isPinned={item.is_pinned ?? false}
                              onViewDetails={() => setActiveReminderItem(item)}
                              onNote={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'note', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                              onTag={() => setEditingNoteTag({ id: item.id, type: 'reminders', mode: 'tag', currentNote: item.detail || undefined, currentTag: item.tags?.[0] ?? undefined })}
                              onPin={() => handlePinItem(item.id, 'reminders', !(item.is_pinned ?? false))}
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
          <ReminderDrawer item={activeReminderItem} conversations={tabItems.conversations} onClose={() => setActiveReminderItem(null)} onToggleStatus={handleToggleReminderStatus} onOpenThread={(id: string, title: string) => { setActiveReminderItem(null); router.push(`/threads?open=${id}`) }} />
        )}
        */}

      </div>

      {/* ── New Project sticky button ── */}
      {activeTab === 'projects' && projects.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '40px',
          left: 'calc(var(--sidebar-width, 280px) + 48px)',
          transition: 'left 0.2s ease-in-out', zIndex: 40,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        }}>
          <Button
            variant="primary"
            style={{ opacity: selectedProjectIds.size > 0 ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: selectedProjectIds.size > 0 ? 'none' : 'auto' }}
            onClick={openNewProjectModal}
          >
            + Add Project
          </Button>
        </div>
      )}

      {/* ── Modals ── */}
      {showCreateProjectModal && (() => {
        const allThreadsWithProject = [
  ...conversations.map(c => ({
    ...c,
    projectName: c.project_id ? (projects.find(p => p.id === c.project_id)?.name ?? null) : null,
    isClaimable: false,
  })),
  ...claimableConversations.map(c => ({
    ...c,
    projectName: null,
    isClaimable: true,
  })),
]
        return (
          <NewProjectModal
            name={newProjectName}
            description={newProjectDescription}
            onChangeName={setNewProjectName}
            onChangeDescription={setNewProjectDescription}
            onConfirm={createProject}
            onClose={() => { setShowCreateProjectModal(false); setShowUpgradeView(false); setNewProjectName(''); setNewProjectDescription('') }}
            threads={allThreadsWithProject}
            showUpgradeView={showUpgradeView}
            currentTier={subscriptionTier as SubscriptionTier}
          />
        )
      })()}

      {showRenameModal && projectToRename && (
        <RenameConversationModal
          currentTitle={projectToRename.name}
          onSave={handleRenameProject}
          onCancel={() => { setShowRenameModal(false); setProjectToRename(null) }}
          saving={isRenaming}
        />
      )}

      {showDeleteProjectModal && projectToDelete && (
        <DeleteProjectModal
          projectName={projectToDelete.name}
          onConfirm={() => deleteProject(projectToDelete.id)}
          onClose={() => { setShowDeleteProjectModal(false); setProjectToDelete(null) }}
        />
      )}

      {showDeleteConversationModal && conversationToDelete && (
        <DeleteConversationModal
          title={conversationToDelete.title}
          isDeleting={isDeleting}
          onConfirm={() => deleteConversation(conversationToDelete.id)}
          onCancel={() => { setShowDeleteConversationModal(false); setConversationToDelete(null) }}
          highlightCount={deleteModalCounts.highlights}
          actionCount={deleteModalCounts.actions}
          reminderCount={deleteModalCounts.reminders}
        />
      )}

      {showBulkDeleteConfirm && (
        <DeleteProjectModal
          projectName={`${selectedProjectIds.size} project${selectedProjectIds.size === 1 ? '' : 's'}`}
          count={selectedProjectIds.size}
          onConfirm={handleBulkDelete}
          onClose={() => setShowBulkDeleteConfirm(false)}
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
        selectedCount={selectedProjectIds.size}
        onAskCoda={() => {
          const projectIds = Array.from(selectedProjectIds)
          const scoped = conversations.filter(c => c.project_id && projectIds.includes(c.project_id))
          const titlesMap = new Map(scoped.map(c => [c.id, c.title]))
          const scopeName = projectIds.length === 1
            ? (projects.find(p => p.id === projectIds[0])?.name ?? 'Selected project')
            : `${projectIds.length} projects`
          openScoped(scoped.map(c => c.id), titlesMap, scopeName)
        }}
        onDownload={async (format: ExportFormat) => {
          const { default: JSZip } = await import('jszip')
          const zip = new JSZip()
          for (const id of Array.from(selectedProjectIds)) {
            const project = projects.find(p => p.id === id)
            if (!project) continue
            const projectConvs = conversations.filter(c => c.project_id === id)
            const folderName = project.name.replace(/[^a-z0-9]/gi, '_')
            if (format === 'json') {
              zip.file(`${folderName}.json`, JSON.stringify({ project, conversations: projectConvs }, null, 2))
            } else {
              for (const conv of projectConvs) {
                const exportData = {
                  title: conv.title,
                  platform: conv.platform || conv.source || 'unknown',
                  exportDate: new Date().toISOString(),
                  message_count: conv.message_count ?? 0,
                  tags: typeof conv.tags === 'string' ? conv.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
                  summary: conv.summary || null,
                  messages: [] as import('@/lib/export-utils').ExportData['messages'],
                }
                const filename = buildExportFilename(conv.title, format)
                const content = format === 'markdown' ? convertToMarkdown(exportData) : convertToPlainText(exportData)
                zip.file(`${folderName}/${filename}`, content)
              }
            }
          }
          const blob = await zip.generateAsync({ type: 'blob' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const ids = Array.from(selectedProjectIds)
          const zipName = ids.length === 1
            ? (projects.find(p => p.id === ids[0])?.name ?? 'project').replace(/[^a-z0-9]/gi, '_')
            : 'projects'
          a.href = url; a.download = `${zipName}.zip`; a.click()
          URL.revokeObjectURL(url)
        }}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onClear={() => setSelectedProjectIds(new Set())}
      />
    </div>
  )
}

export default ProjectsPage