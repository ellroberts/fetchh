'use client'
import { LayoutDashboard, MessageSquareText, FileStack, GalleryVerticalEnd, PawPrint, LibraryBig, Upload, ShieldCheck } from 'lucide-react'

// app/(dashboard)/layout.tsx
// This layout automatically wraps all pages in the (dashboard) route group

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseClient } from '../../lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { RagPanelProvider } from '../../lib/rag-panel-context'
import { getNavItems } from '../../config/navigation'
import type { User } from '@supabase/supabase-js'
import { PinInsightModal, PinType } from '@/components/projects/PinInsightModal'
import type { InsightTag } from '@/lib/project-insight-types'

/** Read threadcub_session_id from localStorage, falling back to cookie */
function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  const fromStorage = localStorage.getItem('threadcub_session_id')
  if (fromStorage) return fromStorage
  const match = document.cookie.match(/(?:^|;\s*)threadcub_session_id=([^;]+)/)
  return match ? match[1] : null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversationCount, setConversationCount] = useState(0)
  const [claimableCount, setClaimableCount] = useState(0)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'starter' | 'pro' | 'unlimited'>('free')
  const [isAdmin, setIsAdmin] = useState(false)

  // ─── Global pin-insight modal ─────────────────────────────────────────────
  const [showPinModal, setShowPinModal] = useState(false)
  const [pendingPin, setPendingPin] = useState<{
    content: string
    ragQuery?: string
    sourceIds: string[]
  } | null>(null)
  const [userProjects, setUserProjects] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const currentProjectId = pathname.match(/\/projects\/([^\/]+)/)?.[1] ?? undefined
  const supabase = createSupabaseClient()

  const iconMap: Record<string, { iconComponent: React.ElementType; iconColor: string }> = {
    dashboard: { iconComponent: LayoutDashboard, iconColor: 'var(--color-icon-default)' },
    chats: { iconComponent: MessageSquareText, iconColor: 'var(--color-icon-default)' },
    'thread-groups': { iconComponent: FileStack, iconColor: 'var(--color-icon-default)' },
    projects: { iconComponent: GalleryVerticalEnd, iconColor: 'var(--color-icon-default)' },
    pawmarks: { iconComponent: PawPrint, iconColor: 'var(--color-icon-default)' },
    library:   { iconComponent: LibraryBig,      iconColor: 'var(--color-icon-default)' },
    import:    { iconComponent: Upload,          iconColor: 'var(--color-icon-default)' },
    admin:     { iconComponent: ShieldCheck,     iconColor: 'var(--color-icon-default)' },
  }

  const navItems = getNavItems(conversationCount, claimableCount, isAdmin).map(item => ({
    ...item,
    ...(iconMap[item.id] || {}),
    active: pathname === item.href || pathname.startsWith(item.href + '/'),
    onClick: () => router.push(item.href)
  }))

  const userForLayout = user ? {
    name: user.email?.split('@')[0] || 'User',
    email: user.email || ''
  } : undefined

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const handler = () => setClaimableCount(0)
    window.addEventListener('claim-banner-dismissed', handler)
    return () => window.removeEventListener('claim-banner-dismissed', handler)
  }, [])

  useEffect(() => {
  const handler = () => {
    if (user) loadConversationCount(user.id)
  }
  window.addEventListener('threads-updated', handler)
  return () => window.removeEventListener('threads-updated', handler)
}, [user])

  useEffect(() => {
    if (user) {
      loadConversationCount(user.id)
      loadClaimableCount()
      loadUserProjects(user.id)
    }
  }, [pathname, user])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setPendingPin({
        content: detail.content,
        ragQuery: detail.ragQuery,
        sourceIds: detail.sourceIds || [],
      })
      setShowPinModal(true)
    }
    window.addEventListener('threadcub:pin-insight', handler)
    return () => window.removeEventListener('threadcub:pin-insight', handler)
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/auth')
        return
      }

      // Check waitlist status — only redirect if explicitly not approved
      // (if the query returns null due to RLS, fail open and allow access)
      const { data: waitlistEntry } = await supabase
        .from('waitlist')
        .select('status')
        .eq('email', user.email)
        .single()

      if (waitlistEntry && waitlistEntry.status !== 'approved') {
        router.push('/waitlist-pending')
        return
      }

      setUser(user)
      await loadConversationCount(user.id)
      await loadClaimableCount()

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('subscription_tier, is_admin')
        .eq('id', user.id)
        .single()

      if (profileError) console.error('[layout] user_profiles query failed:', profileError.message)
      if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier)
      if (profile?.is_admin) setIsAdmin(true)

    } catch (err) {
      console.error('Auth check failed:', err)
      router.push('/auth')
    } finally {
      setLoading(false)
    }
  }

  const loadClaimableCount = async () => {
    try {
      const dismissed = sessionStorage.getItem('claim_banner_dismissed')
      if (dismissed) { setClaimableCount(0); return }
      const sessionToken = getSessionToken()
      if (!sessionToken) { setClaimableCount(0); return }
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .is('user_id', null)
        .is('removed_at', null)
        .eq('session_id', sessionToken)
      if (!error && data) setClaimableCount(data.length)
      else setClaimableCount(0)
    } catch { setClaimableCount(0) }
  }

  const loadConversationCount = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (!error && count !== null) {
        setConversationCount(count)
      }
    } catch (err) {
      console.error('Failed to load conversation count:', err)
    }
  }

  const loadUserProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .order('name')
      if (!error && data) setUserProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  const handleSaveInsight = async (type: PinType, tag: InsightTag | null, note?: string, projectId?: string) => {
    if (!pendingPin) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      if (type === 'insight') {
        const content = note ? `${pendingPin.content}\n\n_Note: ${note}_` : pendingPin.content
        const { error } = await supabase.from('project_insights').insert({
          user_id: user.id,
          project_id: projectId,
          content,
          tag,
          source_conversation_ids: pendingPin.sourceIds,
          rag_query: pendingPin.ragQuery,
        })
        if (error) throw error
        window.dispatchEvent(new CustomEvent('threadcub:insight-saved', { detail: { projectId } }))
      } else {
        const words = pendingPin.content.trim().split(/\s+/)
        const title = words.length <= 10 ? words.join(' ') : words.slice(0, 10).join(' ') + '...'
        const table = type === 'reminder' ? 'reminder_items' : 'action_items'
        const { error } = await supabase.from(table).insert({
          user_id: user.id,
          project_id: projectId,
          title,
          detail: note || '',
          source_chunk: pendingPin.content,
          source_conversation_ids: pendingPin.sourceIds,
          status: 'open',
          completed_at: null,
        })
        if (error) throw error
        const eventName = type === 'reminder' ? 'threadcub:reminder-item-added' : 'threadcub:action-item-added'
        window.dispatchEvent(new CustomEvent(eventName, { detail: { projectId } }))
      }
      setShowPinModal(false)
      setPendingPin(null)
    } catch (err) {
      console.error('Error saving pin:', err)
    }
  }

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('claim_banner_dismissed')
      await supabase.auth.signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  return (
    <RagPanelProvider>
      <AppLayout
        appName="ThreadCub"
        navItems={navItems}
        user={userForLayout}
        userId={user?.id}
        onSignOut={handleSignOut}
        onSettingsClick={handleSettingsClick}
        subscriptionTier={subscriptionTier}
        conversationCount={conversationCount}
      >
        {loading ? null : children}
      </AppLayout>

      {showPinModal && pendingPin && (
        <PinInsightModal
          content={pendingPin.content}
          projects={userProjects}
          defaultProjectId={currentProjectId}
          onSave={handleSaveInsight}
          onCancel={() => { setShowPinModal(false); setPendingPin(null) }}
        />
      )}
    </RagPanelProvider>
  )
}