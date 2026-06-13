// app/(dashboard)/dashboard/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MessageSquare, Bot, Highlighter, ListTodo, Bell, GalleryVerticalEnd, Panda, Layers, CircleHelp } from 'lucide-react'
import { Icon } from '@/components/Icon'
import { createSupabaseClient } from '../../../lib/supabase'
import { TIER_DEFINITIONS, type SubscriptionTier } from '../../../lib/tier-limits'
import { useRouter, useSearchParams } from 'next/navigation'
import { StatsCard } from '@/components/StatsCard'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { Alert } from '@/components/Alert'
import { ClaimBanner } from '@/components/ClaimBanner'
import { ClaimModal } from '@/components/ClaimModal'
import { NewProjectModal } from '@/components/NewProjectModal'
import { RenameConversationModal } from '@/components/RenameConversationModal'
import { DeleteProjectModal } from '@/components/DeleteProjectModal'
import { AddToProjectModal } from '@/components/AddToProjectModal'
import { SaveHighlightModal } from '@/components/SaveHighlightModal'
import { AddActionModal } from '@/components/AddActionModal'
import { AddReminderModal } from '@/components/AddReminderModal'
import { useClaimBanner } from '@/lib/useClaimBanner'
import { JumpBackCard, ALL_TYPE_OPTIONS, type JumpBackItem, type JumpBackType } from '@/components/JumpBackCard'
import { Input } from '@/components/Input'
import { IconButton } from '@/components/IconButton'
import { convertToMarkdown, convertToPlainText, triggerDownload, buildExportFilename } from '@/lib/export-utils'
import type { ExportFormat } from '@/lib/export-utils'
import { useRagPanel } from '@/lib/rag-panel-context'
import { AddThreadSourceModal } from '@/components/AddThreadSourceModal'
import { Toast } from '@/components/Toast'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Project } from '@/components/ProjectCard'
import { PlatformsModal } from '@/components/PlatformsModal'
import { PlatformBar } from '@/components/PlatformBar'
import { LearnMoreModal, type LearnMoreTopic } from '@/components/LearnMoreModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickSummary {
  overview?: string
  key_topics?: string[]
  problems_solved?: string[]
  reading_time_minutes?: number
}

interface ConversationRow {
  id?: string
  title?: string
  message_count?: number
  platform?: string
  created_at: string
  quick_summary?: QuickSummary | null
  tags?: string | null
  project_id?: string | null
}

interface UserInsight {
  insight_type: string
  title: string
  summary: string
  count: number
  sample_items: string[]
  generated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  claude:  '#D97757',
  chatgpt: '#10a37f',
  gemini:  '#4285F4',
  unknown: '#9CA3AF',
}

const PLATFORM_LABELS: Record<string, string> = {
  claude:  'Claude',
  chatgpt: 'ChatGPT',
  gemini:  'Gemini',
  unknown: 'Unknown',
}

function getPlatformColor(platform: string) {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? PLATFORM_COLORS.unknown
}

function getPlatformLabel(platform: string) {
  return PLATFORM_LABELS[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
}

function getWeekLabels(n: number): string[] {
  const labels: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
  }
  return labels
}

function getWeeklyCounts(conversations: ConversationRow[], weeks: number): number[] {
  const now = new Date()
  const counts = Array(weeks).fill(0)
  conversations.forEach(c => {
    const created = new Date(c.created_at)
    const daysAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    const weekIndex = weeks - 1 - Math.floor(daysAgo / 7)
    if (weekIndex >= 0 && weekIndex < weeks) counts[weekIndex]++
  })
  return counts
}

function timeAgo(dateStr: string, now: number): string {
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityChart({ counts, labels }: { counts: number[]; labels: string[] }) {
  const max = Math.max(...counts, 1)
  return (
    <div>
      <div className="flex items-end gap-2 h-28">
        {counts.map((count, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{count > 0 ? count : ''}</span>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0', transition: 'all 0.5s',
              height: `${Math.max((count / max) * 88, count > 0 ? 8 : 2)}px`,
              backgroundColor: count > 0 ? 'var(--color-primary-500)' : 'var(--color-border-default)',
            }} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {labels.map((label, i) => (
          <div key={i} className="flex-1 text-center">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopicBadge({ topic }: { topic: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '999px',
      fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)',
      backgroundColor: 'var(--color-state-hover-bg)', color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border-default)', fontFamily: 'var(--font-family-primary)',
    }}>
      {topic}
    </span>
  )
}

const INSIGHT_TOKEN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  friction:      { bg: 'var(--color-alert-error-bg, #fef2f2)',   border: 'var(--color-error)',   text: 'var(--color-error)' },
  ai_errors:     { bg: 'var(--color-alert-warning-bg)',          border: 'var(--color-warning)', text: 'var(--color-warning)' },
  rework:        { bg: 'var(--color-alert-warning-bg)',          border: 'var(--color-warning)', text: 'var(--color-warning)' },
  breakthroughs: { bg: 'var(--color-alert-success-bg)',          border: 'var(--color-success)', text: 'var(--color-success)' },
  recurring:     { bg: 'var(--color-alert-info-bg)',             border: 'var(--color-info)',    text: 'var(--color-info)' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [showConfirmMessage, setShowConfirmMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientNow, setClientNow] = useState(0)

  useEffect(() => { setClientNow(Date.now()) }, [])

  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
  const [isAdmin, setIsAdmin] = useState(false)

  const [highlightsCount, setHighlightsCount] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  const [actionItemsCount, setActionItemsCount] = useState(0)
  const [reminderItemsCount, setReminderItemsCount] = useState(0)
  const [ragSessionsCount, setRagSessionsCount] = useState(0)
  const [actionsCount, setActionsCount] = useState(0)
  const [ragQueriesUsed, setRagQueriesUsed] = useState(0)
  const [threadGroupCount, setThreadGroupCount] = useState(0)
  const [recentThreads, setRecentThreads] = useState<any[]>([])
  const [jumpBackType, setJumpBackType] = useState<JumpBackType>('chats')
  const [jumpBackProjects, setJumpBackProjects] = useState<any[]>([])
  const [jumpBackThreadGroups, setJumpBackThreadGroups] = useState<any[]>([])
  const [jumpBackHighlights, setJumpBackHighlights] = useState<any[]>([])
  const [jumpBackActions, setJumpBackActions] = useState<any[]>([])
  const [jumpBackReminders, setJumpBackReminders] = useState<any[]>([])
  const [jumpBackQuestions, setJumpBackQuestions] = useState<any[]>([])
  const [jumpBackPinCounts, setJumpBackPinCounts] = useState<Record<string, number>>({})

  // JumpBack conversation modal state
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [conversationToRename, setConversationToRename] = useState<import('@/components/ConversationCard').Conversation | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [showAddToProjectModal, setShowAddToProjectModal] = useState(false)
  const [conversationToAddToProject, setConversationToAddToProject] = useState<import('@/components/ConversationCard').Conversation | null>(null)
  const [addToProjectSelectedId, setAddToProjectSelectedId] = useState('')

  // JumpBack project modal state
  const [showProjectRenameModal, setShowProjectRenameModal] = useState(false)
  const [projectToRename, setProjectToRename] = useState<Project | null>(null)
  const [isRenamingProject, setIsRenamingProject] = useState(false)
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // Modal open states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [showUpgradeView, setShowUpgradeView] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [showAddThreadModal, setShowAddThreadModal] = useState(false)
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const [showSaveHighlightModal, setShowSaveHighlightModal] = useState(false)
  const [showAddActionModal, setShowAddActionModal] = useState(false)
  const [showAddReminderModal, setShowAddReminderModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [toastQueue, setToastQueue] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastQueue({ type, message })
    setTimeout(() => setToastQueue(null), 3500)
  }
  const [learnMoreTopic, setLearnMoreTopic] = useState<LearnMoreTopic | null>(null)

  // AI Insights
  const [insights, setInsights] = useState<UserInsight[]>([])
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  // Onboarding
  const [highlightedCards, setHighlightedCards] = useState<string[]>([])
  useEffect(() => {
    const handler = (e: Event) => {
      const cards = (e as CustomEvent).detail?.cards
      setHighlightedCards(Array.isArray(cards) ? cards : [])
    }
    window.addEventListener('threadcub:onboarding-highlight', handler)
    return () => window.removeEventListener('threadcub:onboarding-highlight', handler)
  }, [])

  const supabase = createSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openToSession, openGlobal } = useRagPanel()

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setShowConfirmMessage(true)
      setTimeout(() => setShowConfirmMessage(false), 5000)
    }
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user

      const [
        { data: profile, error: profileError },
        { data: conversationsData },
        { data: projectsData },
        { data: threadGroupsData },
        { data: highlightsData },
        { data: actionsData },
        { data: remindersData },
        { data: questionsData },
        { count: hCount },
        { count: pCount },
        { count: tgCount },
        { count: aiCount },
        { count: riCount },
        { count: rsCount },
        { count: aCount },
        { data: profileData },
      ] = await Promise.all([
        supabase.from('user_profiles').select('subscription_tier, is_admin').eq('id', user.id).single(),
        supabase.from('conversations').select('id, title, message_count, platform, created_at, quick_summary, tags, project_id').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('thread_groups').select('id, name, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('highlights').select('id, source_title, highlighted_text, conversation_id, notes, tags, created_at').eq('user_id', user.id).eq('is_archived', false).order('created_at', { ascending: false }).limit(20),
        supabase.from('action_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('reminder_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('rag_sessions').select('id, title, project_name, global_mode, conversation_ids, messages, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('highlights').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_archived', false),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('thread_groups').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('action_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('reminder_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('rag_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('pinned_insights').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('section_type', 'actions'),
        supabase.from('user_profiles').select('rag_queries_this_period').eq('id', user.id).single(),
      ])

      if (profileError) throw new Error(`user_profiles query failed: ${profileError.message}`)
      const tier = (profile as any)?.subscription_tier ?? 'free'
      setSubscriptionTier(tier)
      setIsAdmin(!!(profile as any)?.is_admin)
      setConversations(conversationsData || [])
      setRecentThreads((conversationsData || []).slice(0, 5))
      setJumpBackProjects(projectsData ?? [])
      setJumpBackThreadGroups(threadGroupsData ?? [])
      setJumpBackHighlights(highlightsData ?? [])
      setJumpBackActions(actionsData ?? [])
      setJumpBackReminders(remindersData ?? [])
      setJumpBackQuestions(questionsData ?? [])

      const pinCounts: Record<string, number> = {}
      ;(highlightsData ?? []).forEach((r: any) => {
        if (r.conversation_id) pinCounts[r.conversation_id] = (pinCounts[r.conversation_id] || 0) + 1
      })
      const addPinCounts = (rows: any[]) => {
        rows.forEach(r => {
          if (Array.isArray(r.source_conversation_ids)) {
            r.source_conversation_ids.forEach((cid: string) => {
              pinCounts[cid] = (pinCounts[cid] || 0) + 1
            })
          }
        })
      }
      addPinCounts(actionsData ?? [])
      addPinCounts(remindersData ?? [])
      setJumpBackPinCounts(pinCounts)
      setHighlightsCount(hCount ?? 0)
      setProjectCount(pCount ?? 0)
      setThreadGroupCount(tgCount ?? 0)
      setActionItemsCount(aiCount ?? 0)
      setReminderItemsCount(riCount ?? 0)
      setRagSessionsCount(rsCount ?? 0)
      setActionsCount(aCount ?? 0)
      setRagQueriesUsed((profileData as any)?.rag_queries_this_period ?? 0)

      await checkClaimableConversations()
      if (tier === 'pro' || tier === 'unlimited') await loadCachedInsights()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCachedInsights = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/insights/generate', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) return
      const json = await res.json()
      if (json.insights?.length > 0) { setInsights(json.insights); setInsightsGeneratedAt(json.generated_at) }
    } catch (err) { console.error('Failed to load cached insights:', err) }
  }

  const generateInsights = async () => {
    setInsightsLoading(true); setInsightsError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/insights/generate', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (!res.ok) { setInsightsError(json.error || 'Failed to generate insights'); return }
      setInsights(json.insights); setInsightsGeneratedAt(json.generated_at)
    } catch (err: any) { setInsightsError(err.message || 'Failed to generate insights') }
    finally { setInsightsLoading(false) }
  }

  // ── Derived stats ────────────────────────────────────────────────────────────

  const conversationCount = conversations.length
  const {
    claimableConversations, showClaimBanner, showClaimModal, claiming, discarding,
    checkClaimableConversations, claimConversations, discardAll, setShowClaimModal, claimBannerProps,
  } = useClaimBanner({ onClaimSuccess: loadDashboardData, conversationCount, subscriptionTier })

  const totalMessages = conversations.reduce((sum, c) => sum + (c.message_count || 0), 0)
  const avgMessages = conversationCount > 0 ? Math.round(totalMessages / conversationCount) : 0

  const platformBreakdown: Record<string, number> = {}
  conversations.forEach(c => {
    const p = (c.platform || 'unknown').toLowerCase()
    platformBreakdown[p] = (platformBreakdown[p] || 0) + 1
  })
  const sortedPlatforms = Object.entries(platformBreakdown).sort((a, b) => b[1] - a[1])

  const WEEKS = 8
  const weekLabels = getWeekLabels(WEEKS)
  const weeklyCounts = getWeeklyCounts(conversations, WEEKS)

  const topicCounts: Record<string, number> = {}
  conversations.forEach(c => {
    const topics = c.quick_summary?.key_topics ?? []
    topics.forEach(t => { const key = t.toLowerCase().trim(); topicCounts[key] = (topicCounts[key] || 0) + 1 })
  })
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([topic]) => topic)

  const isProOrAbove = subscriptionTier === 'pro' || subscriptionTier === 'unlimited'

  // ── Project stats for JumpBack ───────────────────────────────────────────────

  const jumpBackProjectStats = useMemo(() => {
    const map: Record<string, import('@/components/ProjectCard').ProjectStats> = {}
    jumpBackProjects.forEach((p: any) => {
      const pc = conversations.filter(c => c.project_id === p.id)
      map[p.id] = {
        totalConversations: pc.length,
        totalMessages: pc.reduce((sum, c) => sum + (c.message_count || 0), 0),
        totalPins: jumpBackPinCounts[p.id] ?? 0,
        totalSources: [...new Set(pc.map(c => c.platform || 'unknown'))].length,
        lastActivity: p.created_at,
        sources: [...new Set(pc.map(c => c.platform || 'unknown'))] as string[],
      }
    })
    return map
  }, [jumpBackProjects, conversations, jumpBackPinCounts])

  // ── JumpBack conversation handlers ───────────────────────────────────────────

  const handleJumpBackRename = (conversation: import('@/components/ConversationCard').Conversation) => {
    setConversationToRename(conversation)
    setShowRenameModal(true)
  }

  const confirmRenameConversation = async (newTitle: string) => {
    if (!conversationToRename) return
    setIsRenaming(true)
    try {
      const { error } = await supabase.from('conversations').update({ title: newTitle }).eq('id', conversationToRename.id)
      if (error) throw error
      setConversations(prev => prev.map(c => c.id === conversationToRename.id ? { ...c, title: newTitle } : c))
    } catch (err) { console.error('Error renaming conversation:', err) }
    finally { setIsRenaming(false); setShowRenameModal(false); setConversationToRename(null) }
  }

  const handleJumpBackDelete = async (conversation: import('@/components/ConversationCard').Conversation) => {
    if (!window.confirm(`Delete "${conversation.title}"? This cannot be undone.`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`/api/conversations/${conversation.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      setConversations(prev => prev.filter(c => c.id !== conversation.id))
    } catch (err) { console.error('Error deleting conversation:', err) }
  }

  const handleJumpBackDownload = async (conversation: import('@/components/ConversationCard').Conversation, format: ExportFormat = 'json') => {
    const { data } = await supabase.from('conversations').select('content, url, metadata, summary, tags').eq('id', conversation.id).single()
    const full = { ...conversation, ...(data || {}) }
    const parsed = typeof full.content === 'string' ? (() => { try { return JSON.parse(full.content) } catch { return {} } })() : (full.content || {})
    const exportData = {
      title: full.title, platform: full.platform || 'unknown', exportDate: new Date().toISOString(),
      message_count: full.message_count ?? 0,
      tags: typeof full.tags === 'string' ? full.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (full.tags ?? null),
      url: (full as any).url || full.metadata?.source_url || null,
      summary: (full as any).summary ? (full as any).summary.replace(/^>\s*/gm, '').replace(/^\s*[\$#~].*$/gm, '').trim() || null : null,
      messages: parsed.messages || [],
    }
    const filename = buildExportFilename(full.title ?? 'conversation', format)
    if (format === 'json') triggerDownload(JSON.stringify(exportData, null, 2), filename, 'application/json')
    else if (format === 'markdown') triggerDownload(convertToMarkdown(exportData), filename, 'text/markdown')
    else triggerDownload(convertToPlainText(exportData), filename, 'text/plain')
  }

  const handleJumpBackAddToProject = (conversation: import('@/components/ConversationCard').Conversation) => {
    setConversationToAddToProject(conversation); setAddToProjectSelectedId(''); setShowAddToProjectModal(true)
  }

  const confirmAddToProject = async () => {
    if (!conversationToAddToProject || !addToProjectSelectedId) return
    try {
      const { error } = await supabase.from('conversations').update({ project_id: addToProjectSelectedId }).eq('id', conversationToAddToProject.id)
      if (error) throw error
    } catch (err) { console.error('Error adding to project:', err) }
    finally { setShowAddToProjectModal(false); setConversationToAddToProject(null); setAddToProjectSelectedId('') }
  }

  const createProjectInline = async (name: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase.from('projects').insert({ name, user_id: user.id }).select('id, name, created_at').single()
      if (error || !data) return null
      setJumpBackProjects(prev => [data, ...prev])
      return data.id
    } catch { return null }
  }

  // ── JumpBack project handlers ────────────────────────────────────────────────

  const handleJumpBackProjectRename = (project: Project) => {
    setProjectToRename(project)
    setShowProjectRenameModal(true)
  }

  const confirmRenameProject = async (newName: string) => {
    if (!projectToRename) return
    setIsRenamingProject(true)
    try {
      const { error } = await supabase.from('projects').update({ name: newName }).eq('id', projectToRename.id)
      if (error) throw error
      setJumpBackProjects(prev => prev.map(p => p.id === projectToRename.id ? { ...p, name: newName } : p))
    } catch (err) { console.error('Error renaming project:', err) }
    finally { setIsRenamingProject(false); setShowProjectRenameModal(false); setProjectToRename(null) }
  }

  const handleJumpBackProjectDelete = (project: Project) => {
    setProjectToDelete(project)
    setShowDeleteProjectModal(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id)
      if (error) throw error
      setJumpBackProjects(prev => prev.filter(p => p.id !== projectToDelete.id))
      setProjectCount(prev => prev - 1)
    } catch (err) { console.error('Error deleting project:', err) }
    finally { setShowDeleteProjectModal(false); setProjectToDelete(null) }
  }

  const handleJumpBackProjectDownload = async (project: Project, format: 'txt' | 'markdown' | 'json') => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const projectConvs = conversations.filter(c => c.project_id === project.id)
    const folderName = project.name.replace(/[^a-z0-9]/gi, '_')
    if (format === 'json') {
      zip.file(`${folderName}.json`, JSON.stringify({ project, conversations: projectConvs }, null, 2))
    } else {
      for (const conv of projectConvs) {
        const exportData = {
          title: conv.title ?? 'Untitled', platform: conv.platform || 'unknown',
          exportDate: new Date().toISOString(), message_count: conv.message_count ?? 0,
          tags: typeof conv.tags === 'string' ? conv.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
          summary: null, messages: [] as import('@/lib/export-utils').ExportData['messages'],
        }
        const filename = buildExportFilename(conv.title ?? 'conversation', format)
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

  // ── JumpBack items ───────────────────────────────────────────────────────────

  const jumpBackItems: JumpBackItem[] = (() => {
    const now = Date.now()
    const toTimeAgo = (dateStr: string) => {
      const diff = now - new Date(dateStr).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h ago`
      return `${Math.floor(hrs / 24)}d ago`
    }

    if (jumpBackType === 'chats') {
      return conversations.slice(0, 20).map(c => ({
        id: c.id ?? '', title: c.title ?? 'Untitled conversation', subtitle: c.platform ?? '',
        platform: c.platform ?? '', message_count: c.message_count ?? 0,
        tags: (c as any).tags ?? [], meta: `${c.message_count ?? 0} messages`,
        timeAgo: toTimeAgo(c.created_at), createdAt: c.created_at,
      }))
    }
    if (jumpBackType === 'thread-groups') {
      return jumpBackThreadGroups.map(g => ({
        id: g.id ?? '', title: g.name ?? 'Untitled group', subtitle: '',
        timeAgo: toTimeAgo(g.created_at), createdAt: g.created_at,
      }))
    }
    if (jumpBackType === 'projects') {
      return jumpBackProjects.map(p => ({
        id: p.id ?? '', title: p.name ?? 'Untitled project', subtitle: '',
        timeAgo: toTimeAgo(p.created_at), createdAt: p.created_at,
      }))
    }
    if (jumpBackType === 'highlights') {
      return jumpBackHighlights.map(h => ({
        id: h.id ?? '', title: h.highlighted_text ?? 'Untitled highlight',
        subtitle: h.source_title ?? undefined, note: h.notes ?? undefined,
        tag: (h.tags as string[] | null)?.[0] ?? undefined, sourceId: h.conversation_id ?? undefined,
        timeAgo: toTimeAgo(h.created_at), createdAt: h.created_at,
      }))
    }
    if (jumpBackType === 'actions') {
      return jumpBackActions.map(a => ({
        id: a.id ?? '', title: a.title ?? 'Untitled action', note: a.detail ?? undefined,
        tag: (a.tags as string[] | null)?.[0] ?? undefined, status: a.status ?? undefined,
        sourceId: a.project_id ?? undefined, timeAgo: toTimeAgo(a.created_at), createdAt: a.created_at,
      }))
    }
    if (jumpBackType === 'reminders') {
      return jumpBackReminders.map(r => ({
        id: r.id ?? '', title: r.title ?? 'Untitled reminder', note: r.detail ?? undefined,
        tag: (r.tags as string[] | null)?.[0] ?? undefined, status: r.status ?? undefined,
        sourceId: r.project_id ?? undefined, timeAgo: toTimeAgo(r.created_at), createdAt: r.created_at,
      }))
    }
    if (jumpBackType === 'questions') {
      return jumpBackQuestions.map(q => ({
        id: q.id ?? '', title: q.title ?? 'Untitled question', subtitle: '',
        conversationCount: (q.conversation_ids ?? []).length,
        exchangeCount: Math.floor((q.messages ?? []).length / 2),
        projectName: (!q.global_mode && q.project_name) ? q.project_name : null,
        isGlobal: q.global_mode ?? false, timeAgo: toTimeAgo(q.created_at), createdAt: q.created_at,
      }))
    }
    return []
  })()

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      <OnboardingFlow />
      <div style={{ padding: "var(--spacing-8)", display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>

        {showConfirmMessage && <Alert type="success">Email confirmed. Welcome to ThreadCub!</Alert>}

        {showClaimBanner && (
          <ClaimBanner
            {...claimBannerProps}
            onReview={() => {
              if (conversationCount >= 10 && subscriptionTier === 'free') router.push('/settings/billing')
              else setShowClaimModal(true)
            }}
          />
        )}

        <PageHeader title="Dashboard" loading={loading} sticky={false} style={{ paddingBottom: 0 }} />

        {/* ── Stats Row 1 ── */}
        {(() => {
          const formatLimit = (val: number | typeof Infinity) => val === Infinity ? 'Unlimited' : `of ${val} included`
          const tierDef = TIER_DEFINITIONS[subscriptionTier as SubscriptionTier]
          const now = new Date()
          const ragResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div className="stats-grid-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <StatsCard key={i} skeleton label="" value="" />)
              ) : (<>
                <StatsCard
                  label="Threads"
                  value={conversationCount}
                  accent="default"
                  isEmpty={conversationCount === 0}
                  subtitle={formatLimit(tierDef?.conversationLimit ?? Infinity)}
                  bottomSlot={conversationCount > 0 ? `${totalMessages.toLocaleString()} messages` : undefined}
                  icon={<Icon icon={MessageSquare} size="xl" />}
                  onAdd={(e?: React.MouseEvent) => { e?.stopPropagation(); setShowAddThreadModal(true) }}
                  onClick={() => router.push('/threads')}
                  selected={highlightedCards.includes('chats')}
                  data-onboarding-card="chats"
                  learnHow="#"
                />
                <StatsCard
  label="Thread groups"
  value=""
  comingSoon
  icon={<Icon icon={Layers} size="xl" />}
  learnHow={() => setLearnMoreTopic('thread-groups')}  // ← changed from "#"
/>
                <StatsCard 
                label="Projects" 
                value={projectCount} accent="default" isEmpty={projectCount === 0}
                  subtitle={formatLimit(tierDef?.projectsAllowed ?? Infinity)}
                  icon={<Icon icon={GalleryVerticalEnd} size="xl" />}
                  onAdd={(e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    const atLimit = tierDef?.projectLimit !== null && projectCount >= (tierDef?.projectLimit ?? Infinity)
                    setShowUpgradeView(atLimit); setShowCreateProjectModal(true)
                  }}
                  onClick={() => router.push('/projects')}
                  selected={highlightedCards.includes('projects')} data-onboarding-card="projects" 
                />
              <StatsCard
  label="Top platforms used"
  value=""
  isEmpty={sortedPlatforms.length === 0}
  icon={<Icon icon={Bot} size="xl" />}
  accent="default"
  bottomSlot={
    sortedPlatforms.length > 0 ? (
      <button
        onClick={() => setShowAllPlatforms(true)}
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', lineHeight: 'var(--line-height-normal)', display: 'block' }}
      >
        View all
      </button>
    ) : undefined
  }
>
  {sortedPlatforms.length === 0 ? (
    <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-disabled)' }}>0</div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '6px', lineHeight: 'var(--line-height-normal)' }}>
        {getPlatformLabel(sortedPlatforms[0][0])}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--color-border-subtle)', borderRadius: '999px', height: '8px' }}>
          <div style={{
            height: '8px', borderRadius: '999px',
            width: `${Math.round((sortedPlatforms[0][1] / conversationCount) * 100)}%`,
            backgroundColor: getPlatformColor(sortedPlatforms[0][0])
          }} />
        </div>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', width: '32px', textAlign: 'right' }}>
          {sortedPlatforms[0][1]}
        </span>
      </div>
    </div>
  )}
</StatsCard>
              </>)}
            </div>
          )
        })()}

        {/* ── Insights heading ── */}
        <div className="dashboard-section-heading-row">
          {loading ? (
            <span style={{ display: 'inline-block', width: 80, height: 22, backgroundColor: 'var(--color-border-subtle)', borderRadius: 'var(--border-radius-sm)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <>
              <h2 className="dashboard-section-title">Insights</h2>
              <IconButton size="sm" onClick={() => {}}><CircleHelp size={16} /></IconButton>
            </>
          )}
        </div>

        {/* ── Stats Row 2 ── */}
        <div className="stats-grid-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <StatsCard key={i} skeleton label="" value="" />)
          ) : (<>
<StatsCard
  label="Highlights saved"
  value={highlightsCount}
  accent="amber"
  icon={<Icon icon={Highlighter} size="xl" />}
  isEmpty={highlightsCount === 0}
  learnHow={() => setLearnMoreTopic('highlights')}   // ← changed
  selected={highlightedCards.includes('highlights')}
  data-onboarding-card="highlights"
/>
 
<StatsCard
  label="Actions set"
  value={actionItemsCount}
  accent="green"
  icon={<Icon icon={ListTodo} size="xl" />}
  isEmpty={actionItemsCount === 0}
  learnHow={() => setLearnMoreTopic('actions')}      // ← changed
  selected={highlightedCards.includes('actions')}
  data-onboarding-card="actions"
/>
 
<StatsCard
  label="Reminders set"
  value={reminderItemsCount}
  accent="rose"
  icon={<Icon icon={Bell} size="xl" />}
  isEmpty={reminderItemsCount === 0}
  learnHow={() => setLearnMoreTopic('reminders')}    // ← changed
  selected={highlightedCards.includes('reminders')}
  data-onboarding-card="reminders"
/>          </>)}
        </div>

        {/* ── Jump back ── */}
        <div className="dashboard-section-heading-row">
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: 100, height: 22, backgroundColor: 'var(--color-border-subtle)', borderRadius: 'var(--border-radius-sm)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ display: 'inline-block', width: 120, height: 32, backgroundColor: 'var(--color-border-subtle)', borderRadius: 'var(--border-radius-base)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
            </>
          ) : (
            <>
              <h2 className="dashboard-section-title">Jump back</h2>
              <div data-onboarding-card="jump-back">
              <Input
                type="select" value={jumpBackType}
                onChange={e => setJumpBackType(e.target.value as JumpBackType)}
                options={ALL_TYPE_OPTIONS.filter(opt => !opt.adminOnly || isAdmin).map(opt => ({ value: opt.value, label: opt.label }))}
                style={{ width: 'auto' }}
              />
              </div>
            </>
          )}
        </div>
        <SectionCard
          style={{ height: '600px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, overflow: 'hidden' }}
        >
          <JumpBackCard
            items={jumpBackItems}
            activeType={jumpBackType}
            isLoading={loading}
            pinCounts={jumpBackPinCounts}
            projectStats={jumpBackProjectStats}
            onRename={handleJumpBackRename}
            onDelete={handleJumpBackDelete}
            onDownload={handleJumpBackDownload}
            onAddToProject={handleJumpBackAddToProject}
            onProjectRename={handleJumpBackProjectRename}
            onProjectDelete={handleJumpBackProjectDelete}
            onProjectDownload={handleJumpBackProjectDownload}
            onRefresh={loadDashboardData}
            onItemClick={(id) => {
              if (jumpBackType === 'questions') openToSession(id)
              else if (jumpBackType === 'chats') router.push(`/threads?open=${id}`)
              else if (jumpBackType === 'projects') router.push(`/projects/${id}`)
              else if (jumpBackType === 'highlights') {
                const highlight = jumpBackHighlights.find(h => h.id === id)
                if (highlight?.conversation_id) router.push(`/threads?open=${highlight.conversation_id}&highlight=${encodeURIComponent(highlight.highlighted_text ?? '')}`)
              } else if (jumpBackType === 'actions') {
                const action = jumpBackActions.find(a => a.id === id)
                if (action) { sessionStorage.setItem('pendingAction', JSON.stringify(action)); router.push(`/threads?action=${id}`) }
              } else if (jumpBackType === 'reminders') {
                const reminder = jumpBackReminders.find(r => r.id === id)
                if (reminder) { sessionStorage.setItem('pendingReminder', JSON.stringify(reminder)); router.push(`/threads?reminder=${id}`) }
              } else if (jumpBackType === 'thread-groups') {
                router.push('/threads')
              }
            }}
          />
        </SectionCard>
      </div>

      {/* ── Modals ── */}
      {showClaimModal && <ClaimModal conversations={claimableConversations} onClaim={claimConversations} onCancel={() => setShowClaimModal(false)} onDiscard={discardAll} claiming={claiming} discarding={discarding} />}

      {showAddThreadModal && (
        <AddThreadSourceModal
          onClose={() => setShowAddThreadModal(false)}
          onFileUpload={() => fileInputRef.current?.click()}
          onCloudDownload={claimBannerProps.count > 0 ? () => { setShowAddThreadModal(false); setShowClaimModal(true) } : undefined}
        />
      )}

      {showAllPlatforms && (
        <PlatformsModal
          platforms={sortedPlatforms}
          total={conversationCount}
          onClose={() => setShowAllPlatforms(false)}
        />
      )}

      {showCreateProjectModal && (
        <NewProjectModal
          name={newProjectName} description={newProjectDescription}
          onChangeName={setNewProjectName} onChangeDescription={setNewProjectDescription}
          onConfirm={async (selectedThreadIds: string[]) => {
            if (!newProjectName.trim()) return
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data, error } = await supabase.from('projects').insert([{ name: newProjectName.trim(), description: newProjectDescription.trim() || null, user_id: user.id }]).select()
            if (error) { console.error('Error creating project:', error); return }
            window.dispatchEvent(new CustomEvent('threadcub:project-created'))
            const newProjectId = data[0].id
            if (selectedThreadIds.length > 0) {
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                const res = await fetch('/api/projects/assign-threads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ projectId: newProjectId, threadIds: selectedThreadIds }) })
                if (!res.ok) console.error('[assign-threads] Failed:', (await res.json()).error)
              }
            }
            setShowCreateProjectModal(false); setNewProjectName(''); setNewProjectDescription('')
            if (selectedThreadIds.length > 0) router.push(`/projects/${newProjectId}?seeded=${selectedThreadIds.length}`)
            else await loadDashboardData()
          }}
          onClose={() => { setShowCreateProjectModal(false); setShowUpgradeView(false); setNewProjectName(''); setNewProjectDescription('') }}
          threads={conversations as any} showUpgradeView={showUpgradeView} currentTier={subscriptionTier as SubscriptionTier}
        />
      )}

      {showSaveHighlightModal && <SaveHighlightModal content="" onSave={async () => { setShowSaveHighlightModal(false) }} onCancel={() => setShowSaveHighlightModal(false)} />}
      {showAddActionModal && <AddActionModal content="" onSave={async () => { setShowAddActionModal(false) }} onCancel={() => setShowAddActionModal(false)} />}
      {showAddReminderModal && <AddReminderModal content="" onSave={async () => { setShowAddReminderModal(false) }} onCancel={() => setShowAddReminderModal(false)} />}

      {/* Rename Conversation Modal */}
      {showRenameModal && conversationToRename && (
        <RenameConversationModal
          currentTitle={conversationToRename.title ?? ''}
          onSave={confirmRenameConversation}
          onCancel={() => { setShowRenameModal(false); setConversationToRename(null) }}
          saving={isRenaming}
        />
      )}

      {/* Rename Project Modal */}
      {showProjectRenameModal && projectToRename && (
        <RenameConversationModal
          currentTitle={projectToRename.name}
          onSave={confirmRenameProject}
          onCancel={() => { setShowProjectRenameModal(false); setProjectToRename(null) }}
          saving={isRenamingProject}
        />
      )}

      {/* Delete Project Modal */}
      {showDeleteProjectModal && projectToDelete && (
        <DeleteProjectModal
          projectName={projectToDelete.name}
          onConfirm={confirmDeleteProject}
          onClose={() => { setShowDeleteProjectModal(false); setProjectToDelete(null) }}
        />
      )}

      {/* Add to Project Modal */}
      {showAddToProjectModal && conversationToAddToProject && (
        <AddToProjectModal
          conversationTitle={conversationToAddToProject.title ?? ''}
          projects={jumpBackProjects}
          selectedProjectId={addToProjectSelectedId}
          onChangeProject={setAddToProjectSelectedId}
          onConfirm={confirmAddToProject}
          onCreateProject={createProjectInline}
          onClose={() => { setShowAddToProjectModal(false); setConversationToAddToProject(null); setAddToProjectSelectedId('') }}
        />
      )}

      {/* Learn Modal */}
      {learnMoreTopic && (
        <LearnMoreModal
          topic={learnMoreTopic}
          onClose={() => setLearnMoreTopic(null)}
        />
      )}

      {/* Hidden file input */}
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
          await loadDashboardData()
          if (savedCount > 0) showToast('success', `Imported ${savedCount} conversation${savedCount > 1 ? 's' : ''}`)
          if (dupCount > 0) showToast('info', `${dupCount} duplicate${dupCount > 1 ? 's' : ''} skipped`)
        }}
      />

      {toastQueue && <Toast type={toastQueue.type} message={toastQueue.message} onClose={() => setToastQueue(null)} />}
    </div>
  )
}