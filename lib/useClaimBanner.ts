// lib/hooks/useClaimBanner.ts
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import type { ClaimableConversation } from '@/components/ClaimModal'

interface UseClaimBannerOptions {
  /** Called after conversations are successfully claimed — use to refresh your page data */
  onClaimSuccess?: () => void | Promise<void>
  /** Passed through to ClaimBanner to determine if user is at their free tier limit */
  conversationCount?: number
  subscriptionTier?: string
}

/**
 * Read threadcub_session_id from (in priority order):
 *   1. URL query param  ?sessionId=…  (extension redirect / deep-link)
 *   2. localStorage
 *   3. Cookie set by the save API response
 *
 * When found in the URL the value is persisted to localStorage and the
 * query param is removed from the address bar so it doesn't leak on share.
 */
function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null

  // 1. URL query param — set by the extension when it opens the web app
  const urlParams = new URLSearchParams(window.location.search)
  const fromUrl = urlParams.get('sessionId')
  if (fromUrl) {
    localStorage.setItem('threadcub_session_id', fromUrl)
    // Clean the param from the URL without triggering a navigation
    urlParams.delete('sessionId')
    const newSearch = urlParams.toString()
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
    window.history.replaceState(null, '', newUrl)
    return fromUrl
  }

  // 2. localStorage
  const fromStorage = localStorage.getItem('threadcub_session_id')
  if (fromStorage) return fromStorage

  // 3. Cookie (set by Save API response when extension uses credentials: 'include')
  const match = document.cookie.match(/(?:^|;\s*)threadcub_session_id=([^;]+)/)
  return match ? match[1] : null
}

export function useClaimBanner({
  onClaimSuccess,
  conversationCount = 0,
  subscriptionTier = 'free',
}: UseClaimBannerOptions = {}) {
  const supabase = createSupabaseClient()

  const [claimableCount, setClaimableCount] = useState(0)
  const [claimableConversations, setClaimableConversations] = useState<ClaimableConversation[]>([])
  const [showClaimBanner, setShowClaimBanner] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [claimCheckLoading, setClaimCheckLoading] = useState(true)

  // Hide the RAG floating button while the claim modal is open so it doesn't
  // sit on top of the modal overlay (the button is z-50, same as the backdrop).
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(showClaimModal ? 'rag-button-hide' : 'rag-button-show'))
  }, [showClaimModal])

  /**
   * Reset banner state — call this before checkClaimableConversations on manual
   * refresh so React sees a state change and re-renders the banner.
   */
  const resetBanner = () => {
    setShowClaimBanner(false)
    setClaimableCount(0)
    setClaimableConversations([])
  }

  /**
   * Check for unclaimed conversations belonging to this user.
   * Uses a server-side API route with the service role key so RLS SELECT
   * policies (which only allow reading owned rows) do not block the query.
   * Matches on session_id (localStorage or cookie) OR email — whichever is available.
   * Call this once auth is confirmed, e.g. inside initializeAndFetch / loadDashboardData.
   */
  const checkClaimableConversations = async () => {
    setClaimCheckLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user || !session) return

      const sessionToken = getSessionToken()

      if (!sessionToken && !user.email) return

      const params = new URLSearchParams()
      if (sessionToken) params.set('sessionId', sessionToken)
      if (user.email) params.set('email', user.email)

      const response = await fetch(`/api/conversations/claimable?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!response.ok) {
        console.error('[useClaimBanner] API error:', response.status)
        return
      }

      const { conversations } = await response.json()

      if (conversations && conversations.length > 0) {
        setClaimableConversations(conversations)
        setClaimableCount(conversations.length)
        const dismissed = sessionStorage.getItem('claim_banner_dismissed')
        if (!dismissed) setShowClaimBanner(true)
      }
    } catch (error: any) {
      console.error('[useClaimBanner] Error checking claimable conversations:', error)
    } finally {
      setClaimCheckLoading(false)
    }
  }

  /**
   * Claim selected (or all) conversations, then call onClaimSuccess to let
   * the page refresh its own data however it needs to.
   */
  const claimConversations = async (selectedIds?: string[], projectId?: string) => {
    setClaiming(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user || !session) return

      const sessionToken = getSessionToken()

      // Build body — always include email as fallback for users without a session token
      const body: Record<string, any> = {
        email: user.email,
        ...(sessionToken ? { sessionId: sessionToken } : {}),
        ...(selectedIds ? { ids: selectedIds } : {}),
        ...(projectId ? { projectId } : {}),
      }

      const response = await fetch('/api/conversations/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const err = await response.json()
        console.error('[claim] API error:', err)
        throw new Error('Claim failed')
      }

      setShowClaimModal(false)
      setShowClaimBanner(false)

      await onClaimSuccess?.()
    } catch (error: any) {
      console.error('[useClaimBanner] Error claiming conversations:', error)
    } finally {
      setClaiming(false)
    }
  }

  const dismissBanner = () => {
    sessionStorage.setItem('claim_banner_dismissed', '1')
    setShowClaimBanner(false)
    setClaimableCount(0)
    window.dispatchEvent(new Event('claim-banner-dismissed'))
  }

  /**
   * Permanently discard all claimable conversations — hard-deletes them from
   * Supabase and clears the local session token so they won't reappear.
   */
  const discardAll = async () => {
    setDiscarding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user || !session) return

      const sessionToken = getSessionToken()

      const params = new URLSearchParams()
      if (sessionToken) params.set('sessionId', sessionToken)
      if (user.email) params.set('email', user.email)

      await fetch(`/api/conversations/claimable?${params.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      // Clear the session token from localStorage so the claimable check
      // won't find anything on the next page load.
      if (typeof window !== 'undefined') {
        localStorage.removeItem('threadcub_session_id')
      }

      // Tell the extension to clear its locally cached conversation data so
      // the claimable list doesn't reappear on next load from chrome.storage.
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'THREADCUB_CLEAR_CONVERSATIONS' }, '*')
      }

      setShowClaimModal(false)
      setShowClaimBanner(false)
      setClaimableConversations([])
      setClaimableCount(0)
    } catch (err) {
      console.error('[useClaimBanner] discardAll error:', err)
    } finally {
      setDiscarding(false)
    }
  }

  return {
    // State
    claimableCount,
    claimableConversations,
    showClaimBanner,
    showClaimModal,
    claiming,
    discarding,
    claimCheckLoading,
    // Actions
    checkClaimableConversations,
    resetBanner,
    claimConversations,
    discardAll,
    dismissBanner,
    setShowClaimModal,
    // Passthrough props — spread these directly onto <ClaimBanner>
    claimBannerProps: {
      count: claimableCount,
      conversationCount,
      subscriptionTier,
      onDismiss: dismissBanner,
      onReview: () => setShowClaimModal(true),
    },
  }
}