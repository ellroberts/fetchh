// components/DashboardCodaWidget.tsx
'use client'

import React from 'react'
import { TIER_DEFINITIONS, type SubscriptionTier } from '../lib/tier-limits'

interface DashboardCodaWidgetProps {
  queriesUsed: number
  subscriptionTier: SubscriptionTier
  onAskCoda?: () => void
  onUpgrade?: () => void
}

export const DashboardCodaWidget: React.FC<DashboardCodaWidgetProps> = ({ queriesUsed, subscriptionTier, onAskCoda, onUpgrade }) => {
  const tierDef = TIER_DEFINITIONS[subscriptionTier]
  const limit = tierDef.ragQueriesPerMonth
  const remaining = Math.max(0, limit - queriesUsed)
  const pct = Math.min(100, Math.round((queriesUsed / limit) * 100))
  const isNearLimit = pct >= 80
  const isAtLimit = remaining === 0
  const barColor = isAtLimit ? 'var(--color-error)' : isNearLimit ? 'var(--color-warning)' : 'var(--color-primary-500)'

  return (
    <div style={{ fontFamily: 'var(--font-family-primary)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <span style={{ fontSize: '1.25rem' }}>🐻</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)' }}>Ask Coda</span>
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-state-hover-bg)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--color-border-default)' }}>{tierDef.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-1)' }}>
        <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)' }}>{queriesUsed}</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>/ {limit} queries this month</span>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', backgroundColor: 'var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', backgroundColor: barColor, transition: 'width 0.4s ease' }} />
      </div>
      {isAtLimit ? (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', margin: 0 }}>
          You've used all your queries this month.{' '}
          {subscriptionTier !== 'unlimited' && <button onClick={onUpgrade} style={{ color: 'var(--color-primary-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}>Upgrade for more</button>}
        </p>
      ) : isNearLimit ? (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', margin: 0 }}>
          {remaining} {remaining === 1 ? 'query' : 'queries'} remaining
          {subscriptionTier !== 'unlimited' && <> · <button onClick={onUpgrade} style={{ color: 'var(--color-primary-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}>Upgrade</button></>}
        </p>
      ) : (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>{remaining} {remaining === 1 ? 'query' : 'queries'} remaining this month</p>
      )}
      <button onClick={onAskCoda} disabled={isAtLimit} style={{ marginTop: 'var(--spacing-1)', padding: 'var(--spacing-2) var(--spacing-4)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-primary-500)', backgroundColor: isAtLimit ? 'var(--color-state-hover-bg)' : 'transparent', color: isAtLimit ? 'var(--color-text-muted)' : 'var(--color-primary-500)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', cursor: isAtLimit ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-family-primary)', transition: 'background-color 0.15s' }}>
        Ask Coda a question →
      </button>
    </div>
  )
}

export default DashboardCodaWidget
