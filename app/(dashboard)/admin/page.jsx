'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '../../../lib/supabase'
import { Button } from '@/components/ui/button'

const TIERS = ['free', 'starter', 'pro', 'unlimited', 'enterprise']

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users')
  const [waitlistUsers, setWaitlistUsers] = useState([])
  const [appUsers, setAppUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [notification, setNotification] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const supabase = createSupabaseClient()

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3500)
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (error) {
      showNotification(`Failed to verify admin status: ${error.message}`, 'error')
      setLoading(false)
      return
    }

    if (profile?.is_admin) {
      setIsAdmin(true)
      await Promise.all([loadWaitlistData(), loadAppUsers()])
    }
    setLoading(false)
  }

  const loadWaitlistData = async () => {
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setWaitlistUsers(data || [])
  }

  const loadAppUsers = async () => {
    const { data: profiles, error } = await supabase
      .rpc('get_all_user_profiles')

    if (error) { console.error(error); return }

    const { data: countData } = await supabase.rpc('get_all_conversation_counts')
    const countMap = Object.fromEntries((countData || []).map(r => [r.user_id, r.conversation_count]))
    const enriched = (profiles || []).map(p => ({ ...p, conversation_count: countMap[p.id] || 0 }))

    try {
      const { data: emailData } = await supabase.rpc('get_user_emails')
      if (emailData) {
        const emailMap = Object.fromEntries(emailData.map(e => [e.id, e.email]))
        setAppUsers(enriched.map(u => ({ ...u, email: emailMap[u.id] || u.id })))
        return
      }
    } catch (_) {}

    setAppUsers(enriched.map(u => ({ ...u, email: u.id })))
  }

  const updateWaitlistStatus = async (id, email, newStatus) => {
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: newStatus, approved_at: newStatus === 'approved' ? new Date().toISOString() : null })
        .eq('id', id)

      if (error) { showNotification('Error updating status', 'error'); return }

      if (newStatus === 'approved') {
        try {
          const response = await fetch('/api/send-approval-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          showNotification(
            response.ok ? `Approved & email sent to ${email}` : `Approved but email failed for ${email}`,
            response.ok ? 'success' : 'warning'
          )
        } catch {
          showNotification(`Approved but email failed for ${email}`, 'warning')
        }
      } else {
        showNotification(`Status updated to ${newStatus}`)
      }
      await loadWaitlistData()
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const updateUserTier = async (userId, newTier) => {
    setProcessingIds(prev => new Set(prev).add(userId))
    try {
      const res = await fetch('/api/admin/update-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier: newTier }),
      })
      if (!res.ok) { showNotification('Failed to update tier', 'error'); return }
      showNotification(`Tier updated to ${newTier}`)
      await loadAppUsers()
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(userId); return s })
    }
  }

  const resetRagQueries = async (userId, email) => {
    setProcessingIds(prev => new Set(prev).add(`reset-${userId}`))
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ rag_queries_this_period: 0, rag_period_start: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) { showNotification('Failed to reset queries', 'error'); return }
      showNotification(`RAG queries reset for ${email || userId}`)
      await loadAppUsers()
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(`reset-${userId}`); return s })
    }
  }

  const deleteUserData = async (userId, email) => {
    setProcessingIds(prev => new Set(prev).add(`delete-${userId}`))
    setConfirmDelete(null)
    try {
      const res = await fetch('/api/admin/delete-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        showNotification(errData.error || 'Failed to delete data', 'error')
        return
      }
      showNotification(`Conversation data deleted for ${email || userId}`)
      await loadAppUsers()
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(`delete-${userId}`); return s })
    }
  }

  const deleteUser = async (userId, email) => {
    setProcessingIds(prev => new Set(prev).add(`delete-user-${userId}`))
    setConfirmDelete(null)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        showNotification(errData.error || 'Failed to delete user', 'error')
        return
      }
      showNotification(`User ${email || userId} deleted`)
      setAppUsers(prev => prev.filter(u => u.id !== userId))
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(`delete-user-${userId}`); return s })
    }
  }

  const getWaitlistStats = () => {
    const total = waitlistUsers.length
    const pending = waitlistUsers.filter(u => u.status === 'pending' || !u.status).length
    const approved = waitlistUsers.filter(u => u.status === 'approved').length
    const rejected = waitlistUsers.filter(u => u.status === 'rejected').length
    return { total, pending, approved, rejected }
  }

  const getUserStats = () => {
    const total = appUsers.length
    const byTier = TIERS.reduce((acc, t) => { acc[t] = appUsers.filter(u => u.subscription_tier === t).length; return acc }, {})
    const totalConvos = appUsers.reduce((sum, u) => sum + (u.conversation_count || 0), 0)
    return { total, byTier, totalConvos }
  }

  const tierBadgeStyle = (tier) => {
    const map = {
      free:       { background: 'var(--color-warm-100)',    color: 'var(--color-warm-700)' },
      starter:    { background: 'var(--color-primary-50)',  color: 'var(--color-primary-700)' },
      pro:        { background: 'var(--color-primary-100)', color: 'var(--color-primary-800)' },
      unlimited:  { background: 'var(--color-bear-100)',    color: 'var(--color-bear-700)' },
      enterprise: { background: 'var(--color-bear-200)',    color: 'var(--color-bear-800)' },
    }
    return map[tier] || { background: 'var(--color-warm-100)', color: 'var(--color-warm-700)' }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--color-text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Access denied</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>This page is restricted to admins.</p>
        </div>
      </div>
    )
  }

  const wStats = getWaitlistStats()
  const uStats = getUserStats()

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>

      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 50,
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          fontSize: '0.875rem', fontWeight: 500,
          background: notification.type === 'error' ? 'var(--color-coral-600)' :
                      notification.type === 'warning' ? '#d97706' :
                      'var(--color-warm-900)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {notification.message}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
        }}>
          <div style={{
            background: 'var(--color-surface-card)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '400px', width: '100%', margin: '0 1rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              {confirmDelete.type === 'user' ? 'Delete user account?' : 'Delete conversation data?'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {confirmDelete.type === 'user'
                ? <>This permanently deletes the account and all data for <strong>{confirmDelete.email || confirmDelete.userId}</strong>. This cannot be undone.</>
                : <>This permanently deletes all conversations and RAG sessions for <strong>{confirmDelete.email || confirmDelete.userId}</strong>. Their account stays intact.</>
              }
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="destructive" size="sm" style={{ flex: 1 }}
                onClick={() => confirmDelete.type === 'user'
                  ? deleteUser(confirmDelete.userId, confirmDelete.email)
                  : deleteUserData(confirmDelete.userId, confirmDelete.email)
                }>
                {confirmDelete.type === 'user' ? 'Delete user' : 'Delete data'}
              </Button>
              <Button variant="outline" size="sm" style={{ flex: 1 }}
                onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Admin
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
          Manage users, tiers, and waitlist
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        background: 'var(--color-surface-subtle)',
        borderRadius: '0.625rem', padding: '0.25rem', width: 'fit-content',
      }}>
        {['users', 'waitlist'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.4rem 1.1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: activeTab === tab ? 'var(--color-surface-card)' : 'transparent',
              color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab === 'users' ? `Users (${uStats.total})` : `Waitlist (${wStats.total})`}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Total users',     value: uStats.total },
              { label: 'Conversations',   value: uStats.totalConvos },
              { label: 'Pro / Unlimited', value: (uStats.byTier.pro || 0) + (uStats.byTier.unlimited || 0) },
              { label: 'Free tier',       value: uStats.byTier.free || 0 },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--color-surface-card)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: '0 0 0.25rem' }}>{stat.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* User list */}
          <div style={{
            background: 'var(--color-surface-card)',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border-subtle)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)', margin: 0 }}>All users</p>
            </div>

            {appUsers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '3rem', fontSize: '0.875rem' }}>No users found</p>
            ) : (
              <div>
                {appUsers.map((user, i) => {
                  const isProcessing    = processingIds.has(user.id)
                  const isResetting     = processingIds.has(`reset-${user.id}`)
                  const isDeleting      = processingIds.has(`delete-${user.id}`)
                  const isDeletingUser  = processingIds.has(`delete-user-${user.id}`)
                  const ts = tierBadgeStyle(user.subscription_tier)

                  return (
                    <div key={user.id} style={{
                      padding: '0.875rem 1.25rem',
                      borderBottom: i < appUsers.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      {/* Identity */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.email}
                          </span>
                          {user.is_admin && (
                            <span style={{
                              padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.6875rem',
                              fontWeight: 600, background: 'var(--color-warm-800)', color: 'var(--color-warm-50)',
                            }}>admin</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          {[
                            `${user.conversation_count} conversation${user.conversation_count !== 1 ? 's' : ''}`,
                            `${user.rag_queries_this_period} RAG queries this period`,
                          ].map(text => (
                            <span key={text} style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{text}</span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* Tier dropdown */}
                        <select
                          value={user.subscription_tier || 'free'}
                          onChange={e => updateUserTier(user.id, e.target.value)}
                          disabled={isProcessing}
                          style={{
                            padding: '0.3rem 0.6rem', borderRadius: '0.4rem',
                            fontSize: '0.75rem', fontWeight: 500, border: 'none',
                            cursor: 'pointer', outline: 'none',
                            background: ts.background, color: ts.color,
                            opacity: isProcessing ? 0.5 : 1,
                          }}
                        >
                          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {/* Reset queries */}
                        <Button
                          variant="outline" size="sm"
                          disabled={isResetting}
                          onClick={() => resetRagQueries(user.id, user.email)}
                          style={{ fontSize: '0.75rem', height: '1.875rem', padding: '0 0.625rem', whiteSpace: 'nowrap' }}
                        >
                          {isResetting ? '...' : 'Reset queries'}
                        </Button>

                        {/* Delete data — not shown for admins */}
                        {!user.is_admin && (
                          <Button
                            variant="ghost" size="sm"
                            disabled={isDeleting}
                            onClick={() => setConfirmDelete({ userId: user.id, email: user.email, type: 'data' })}
                            style={{
                              fontSize: '0.75rem', height: '1.875rem', padding: '0 0.625rem',
                              color: 'var(--color-coral-600)', whiteSpace: 'nowrap',
                            }}
                          >
                            {isDeleting ? '...' : 'Delete data'}
                          </Button>
                        )}

                        {/* Delete user — not shown for admins */}
                        {!user.is_admin && (
                          <Button
                            variant="ghost" size="sm"
                            disabled={isDeletingUser}
                            onClick={() => setConfirmDelete({ userId: user.id, email: user.email, type: 'user' })}
                            style={{
                              fontSize: '0.75rem', height: '1.875rem', padding: '0 0.625rem',
                              color: 'var(--color-coral-600)', whiteSpace: 'nowrap',
                            }}
                          >
                            {isDeletingUser ? '...' : 'Delete user'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── WAITLIST TAB ── */}
      {activeTab === 'waitlist' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Total',    value: wStats.total,    color: 'var(--color-text-primary)' },
              { label: 'Pending',  value: wStats.pending,  color: '#d97706' },
              { label: 'Approved', value: wStats.approved, color: 'var(--color-accent-teal, #0d9488)' },
              { label: 'Rejected', value: wStats.rejected, color: 'var(--color-coral-600)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--color-surface-card)',
                borderRadius: '0.75rem', padding: '1rem 1.25rem',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: '0 0 0.25rem' }}>{stat.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Waitlist list */}
          <div style={{
            background: 'var(--color-surface-card)',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border-subtle)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)', margin: 0 }}>
                Waitlist ({waitlistUsers.length})
              </p>
            </div>

            {waitlistUsers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '3rem', fontSize: '0.875rem' }}>No waitlist entries</p>
            ) : (
              <div>
                {waitlistUsers.map((user, i) => {
                  const isProcessing = processingIds.has(user.id)
                  const statusColour = user.status === 'approved'
                    ? { background: 'var(--color-accent-teal-subtle, #f0fdfa)', color: 'var(--color-accent-teal, #0d9488)' }
                    : user.status === 'rejected'
                    ? { background: 'var(--color-coral-50)', color: 'var(--color-coral-600)' }
                    : { background: 'var(--color-bear-50)', color: 'var(--color-bear-600)' }

                  return (
                    <div key={user.id} style={{
                      padding: '0.875rem 1.25rem',
                      borderBottom: i < waitlistUsers.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{user.email}</span>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '999px',
                            fontSize: '0.6875rem', fontWeight: 500,
                            ...statusColour
                          }}>
                            {user.status || 'pending'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                            Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {user.approved_at && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                              Approved {new Date(user.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: user.user_id ? 'var(--color-accent-teal, #0d9488)' : 'var(--color-text-tertiary)' }}>
                            {user.user_id ? '✓ Has account' : 'No account yet'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {user.status !== 'approved' && (
                          <Button size="sm" disabled={isProcessing}
                            onClick={() => updateWaitlistStatus(user.id, user.email, 'approved')}
                            style={{ fontSize: '0.75rem', height: '1.875rem', padding: '0 0.625rem' }}>
                            {isProcessing ? '...' : 'Approve'}
                          </Button>
                        )}
                        {user.status !== 'pending' && (
                          <Button variant="outline" size="sm" disabled={isProcessing}
                            onClick={() => updateWaitlistStatus(user.id, user.email, 'pending')}
                            style={{ fontSize: '0.75rem', height: '1.875rem', padding: '0 0.625rem' }}>
                            {isProcessing ? '...' : 'Set pending'}
                          </Button>
                        )}
                        {user.status !== 'rejected' && (
                          <Button variant="ghost" size="sm" disabled={isProcessing}
                            onClick={() => updateWaitlistStatus(user.id, user.email, 'rejected')}
                            style={{ fontSize: '0.75rem', height: '1.875rem', padding: '0 0.625rem', color: 'var(--color-coral-600)' }}>
                            {isProcessing ? '...' : 'Reject'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}