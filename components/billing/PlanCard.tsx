'use client'

import React from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { TIER_DEFINITIONS, type SubscriptionTier } from '../../lib/tier-limits'

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      style={{ color: 'var(--color-accent-green)', display: 'block', flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export interface PlanCardProps {
  tier: SubscriptionTier
  isCurrent?: boolean
  isPopular?: boolean
  billingPeriod?: 'monthly' | 'annual'
  checkingOut?: SubscriptionTier | null
  onUpgrade?: (tier: SubscriptionTier) => void
}

export function PlanCard({
  tier,
  isCurrent = false,
  isPopular = false,
  billingPeriod = 'monthly',
  checkingOut = null,
  onUpgrade,
}: PlanCardProps) {
  const def = TIER_DEFINITIONS[tier]
  const price = billingPeriod === 'annual' ? def.priceAnnual : def.priceMonthly
  const monthlyEquiv = billingPeriod === 'annual' && def.priceAnnual > 0
    ? (def.priceAnnual / 12).toFixed(2)
    : null

  return (
    <div style={{
      position: 'relative',
      backgroundColor: 'var(--color-surface-raised)',
      border: `1px solid ${isCurrent ? 'var(--color-primary-500)' : 'var(--color-border-default)'}`,
      borderRadius: 'var(--border-radius-lg)',
      boxShadow: isCurrent ? '0 0 0 3px var(--color-primary-light)' : 'none',
      padding: 'var(--spacing-6)',
      paddingTop: '28px',
      transition: 'var(--transition-base)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-4)',
      fontFamily: 'var(--font-family-primary)',
    }}>

      {(isCurrent || isPopular) && (
        <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
          <Badge variant="base" active>
            {isCurrent ? 'Current plan' : 'Most popular'}
          </Badge>
        </div>
      )}

      <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'capitalize' }}>
        {tier}
      </p>

      <div>
        {price === 0 ? (
          <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)' }}>Free</span>
        ) : (
          <div>
            <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)' }}>£{price}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>/{billingPeriod === 'annual' ? 'yr' : 'mo'}</span>
            {monthlyEquiv && (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>£{monthlyEquiv}/mo</p>
            )}
          </div>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
  <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)' }}>
    <CheckIcon />
    <span>{def.conversationLimit ?? 'Unlimited'} conversations</span>
  </li>
  {def.ragQueriesPerMonth > 0 && (
    <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)' }}>
      <CheckIcon />
      <span>{def.ragQueriesPerMonth} queries/month</span>
    </li>
  )}
</ul>

      {isCurrent ? (
        <Button variant="secondary" disabled>Current plan</Button>
      ) : tier === 'free' ? (
        <Button variant="secondary" disabled>Downgrade</Button>
      ) : (
        <Button
          variant={tier === 'pro' ? 'primary' : 'secondary'}
          onClick={() => onUpgrade?.(tier)}
          disabled={checkingOut !== null}
         
        >
          {checkingOut === tier ? 'Loading...' : `Upgrade to ${def.name}`}
        </Button>
      )}
    </div>
  )
}

export default PlanCard
