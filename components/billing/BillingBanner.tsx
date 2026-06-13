'use client'

import React from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { TIER_DEFINITIONS, type SubscriptionTier } from '../../lib/tier-limits'

interface BillingBannerProps {
  tier: SubscriptionTier
  status?: string
  periodEnd?: string | null
  conversationCount: number
  ragQueriesUsed: number
  ragPeriodStart?: string | null
  hasStripeCustomer: boolean
  managingBilling: boolean
  onManageBilling: () => void
}

export function BillingBanner({
  tier,
  status,
  periodEnd,
  conversationCount,
  ragQueriesUsed,
  ragPeriodStart,
  hasStripeCustomer,
  managingBilling,
  onManageBilling,
}: BillingBannerProps) {
  const def = TIER_DEFINITIONS[tier]

  const resetDate = ragPeriodStart
    ? new Date(new Date(ragPeriodStart).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  const renewsDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{
      backgroundColor: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-6)',
      fontFamily: 'var(--font-family-primary)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--spacing-6)',
    }}>

      {/* Left — plan name + status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Current plan
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <span style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-title)',
            textTransform: 'capitalize',
          }}>
            {tier}
          </span>
          <Badge variant="light">{status ?? 'active'}</Badge>
        </div>
        {renewsDate && tier !== 'free' && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
            Renews {renewsDate}
          </p>
        )}
      </div>

      {/* Right — stats + manage billing */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-6)' }}>

          {/* Conversations */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-title)',
              margin: 0,
              lineHeight: 'var(--line-height-tight)',
            }}>
              {conversationCount}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
              of {def.conversationLimit ?? '∞'} conversations
            </p>
          </div>

          {/* Queries */}
          {tier !== 'free' && (
  <div style={{ textAlign: 'center' }}>
    <p style={{
      fontSize: 'var(--font-size-2xl)',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-text-title)',
      margin: 0,
      lineHeight: 'var(--line-height-tight)',
    }}>
      {ragQueriesUsed}
    </p>
    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
      of {def.ragQueriesPerMonth} queries this month
    </p>
    {resetDate && (
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
        Resets {resetDate}
      </p>
    )}
  </div>
)}
        </div>

        {hasStripeCustomer && tier !== 'free' && (
          <Button variant="secondary" onClick={onManageBilling} disabled={managingBilling}>
            {managingBilling ? 'Loading...' : 'Manage billing'}
          </Button>
        )}
      </div>

    </div>
  )
}

export default BillingBanner