'use client'

// app/(dashboard)/settings/billing/page.tsx

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '../../../../lib/supabase'
import { TIER_DEFINITIONS, type SubscriptionTier } from '../../../../lib/tier-limits'
import { Badge } from '../../../../components/Badge'
import { PlanCard } from '../../../../components/billing/PlanCard'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { BillingBanner } from '../../../../components/billing/BillingBanner'
import { FeatureTable } from '../../../../components/billing/FeatureTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  subscription_tier: SubscriptionTier
  subscription_status: string
  subscription_period_end: string | null
  stripe_customer_id: string | null
  rag_queries_this_period: number
  rag_period_start: string | null
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { label: 'Saved conversations', free: '50', starter: '250', pro: '1,000', unlimited: 'Unlimited' },
  { label: 'AI queries per month', free: false, starter: '150', pro: '400', unlimited: '800' },
  { label: 'Chrome extension', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Quick thread stats', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Cross-conversation search', free: false, starter: true, pro: true, unlimited: true },
  { label: 'Deep analysis (RAG)', free: false, starter: true, pro: true, unlimited: true },
  { label: 'Pin text as insight', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Pin full response as insight', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Project hub', free: true, starter: true, pro: true, unlimited: true },
  { label: 'RAG chat history', free: false, starter: true, pro: true, unlimited: true },
  { label: 'Export conversations (per thread)', free: false, starter: true, pro: true, unlimited: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      style={{ color: 'var(--color-accent-green)', display: 'block', margin: '0 auto' }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      style={{ color: 'var(--color-text-secondary)', opacity: 0.4, display: 'block', margin: '0 auto' }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') return value ? <CheckIcon /> : <XIcon />
  return (
    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)' }}>
      {value}
    </span>
  )
}



// ─── Badge ────────────────────────────────────────────────────────────────────



// ─── Button ───────────────────────────────────────────────────────────────────



// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [checkingOut, setCheckingOut] = useState<SubscriptionTier | null>(null)
  const [managingBilling, setManagingBilling] = useState(false)
  const [conversationCount, setConversationCount] = useState(0)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setTimeout(() => fetchProfile(), 2000)
    } else {
      fetchProfile()
    }
  }, [])

  const successMessage = searchParams.get('success') === 'true'
    ? `You're now on the ${searchParams.get('tier')} plan!`
    : null
  const cancelledMessage = searchParams.get('cancelled') === 'true'
    ? 'Checkout cancelled — no changes made.'
    : null

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [profileResult, convResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('subscription_tier, subscription_status, subscription_period_end, stripe_customer_id, rag_queries_this_period, rag_period_start')
          .eq('id', user.id)
          .single(),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      if (profileResult.data) setProfile(profileResult.data as UserProfile)
      if (convResult.count !== null) setConversationCount(convResult.count)
    } catch (err) {
      console.error('Failed to load billing profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'free') return
    setCheckingOut(tier)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingPeriod, userId: user.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Checkout failed:', err)
    } finally {
      setCheckingOut(null)
    }
  }

  const handleManageBilling = async () => {
    setManagingBilling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Billing portal failed:', err)
    } finally {
      setManagingBilling(false)
    }
  }

  const currentTier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
  const tiers = Object.entries(TIER_DEFINITIONS) as [SubscriptionTier, typeof TIER_DEFINITIONS[SubscriptionTier]][]

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-8)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--color-border-default)', borderTopColor: 'var(--color-primary-500)', animation: 'spin 0.75s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--spacing-8)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', fontFamily: 'var(--font-family-primary)' }}>

      {/* Banners */}
      {successMessage && (
        <div style={{ borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-accent-green)', backgroundColor: 'var(--color-alert-success-bg)', padding: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-alert-success-text)' }}>
          ✅ {successMessage}
        </div>
      )}
      {cancelledMessage && (
        <div style={{ borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-accent-amber)', backgroundColor: 'var(--color-alert-warning-bg)', padding: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-alert-warning-text)' }}>
          {cancelledMessage}
        </div>
      )}

      {/* Header */}
      <PageHeader title="Billing & Plan" subtitle="Manage your ThreadCub subscription" sticky={false} />

      {/* Current plan summary */}
      <BillingBanner
  tier={currentTier}
  status={profile?.subscription_status}
  periodEnd={profile?.subscription_period_end}
  conversationCount={conversationCount}
  ragQueriesUsed={profile?.rag_queries_this_period ?? 0}
  ragPeriodStart={profile?.rag_period_start}
  hasStripeCustomer={!!profile?.stripe_customer_id}
  managingBilling={managingBilling}
  onManageBilling={handleManageBilling}
/>

      {/* Billing toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-3)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: billingPeriod === 'monthly' ? 'var(--color-text-title)' : 'var(--color-text-secondary)' }}>
          Monthly
        </span>
        <button
          onClick={() => setBillingPeriod(p => p === 'monthly' ? 'annual' : 'monthly')}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            width: '44px',
            height: '24px',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: billingPeriod === 'annual' ? 'var(--color-primary-500)' : 'var(--color-state-hover-bg)',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            padding: 0,
          }}
        >
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-page-bg)',
            transform: billingPeriod === 'annual' ? 'translateX(24px)' : 'translateX(4px)',
            transition: 'transform 0.2s',
          }} />
        </button>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: billingPeriod === 'annual' ? 'var(--color-text-title)' : 'var(--color-text-secondary)' }}>
          Annual
        </span>
        {billingPeriod === 'annual' && (
          <Badge variant="success">Save 20%</Badge>
        )}
      </div>

      {/* Pricing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
        {tiers.map(([tier, def]) => {
          const isCurrent = tier === currentTier
          const isPopular = tier === 'pro'
          return (
            <PlanCard
              key={tier}
              tier={tier}
              isCurrent={isCurrent}
              isPopular={isPopular}
              billingPeriod={billingPeriod}
              checkingOut={checkingOut}
              onUpgrade={handleUpgrade}
            />
          )
        })}
      </div>

      {/* Feature comparison table */}
      <FeatureTable currentTier={currentTier} />

    </div>
  )
}