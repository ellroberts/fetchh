'use client'

import React from 'react'
import { type SubscriptionTier } from '../../lib/tier-limits'

const FEATURES = [
  { label: 'Saved conversations', free: '50', starter: '250', pro: '1,000', unlimited: 'Unlimited' },
  { label: 'Projects', free: '3', starter: 'Unlimited', pro: 'Unlimited', unlimited: 'Unlimited' },
  { label: 'AI queries per month', free: false, starter: '150', pro: '400', unlimited: '800' },
  { label: 'Chrome extension', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Dashboard & insights', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Pawmarks (highlights, actions, reminders)', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Thread search', free: true, starter: true, pro: true, unlimited: true },
  { label: 'Ask Coda (RAG chat)', free: false, starter: true, pro: true, unlimited: true },
  { label: 'Export (JSON, Markdown, text)', free: false, starter: true, pro: true, unlimited: true },
]

const TIERS: SubscriptionTier[] = ['free', 'starter', 'pro', 'unlimited']

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

interface FeatureTableProps {
  currentTier: SubscriptionTier
}

export function FeatureTable({ currentTier }: FeatureTableProps) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      fontFamily: 'var(--font-family-primary)',
    }}>
      <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border-default)' }}>
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', margin: 0 }}>
          Full feature comparison
        </h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 'var(--font-size-sm)', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', width: '33%' }}>
                Feature
              </th>
              {TIERS.map(tier => (
                <th key={tier} style={{ textAlign: 'center', padding: 'var(--spacing-4)', fontWeight: 'var(--font-weight-medium)', color: tier === currentTier ? 'var(--color-primary-500)' : 'var(--color-text-secondary)', width: '16%' }}>
                  <span style={{ textTransform: 'capitalize' }}>{tier}</span>
                  {tier === currentTier && (
                    <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-normal)' }}>← you</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature, idx) => (
              <tr key={feature.label} style={{ borderBottom: '1px solid var(--color-border-default)', backgroundColor: idx % 2 !== 0 ? 'var(--color-state-hover-bg)' : 'transparent' }}>
                <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-title)' }}>{feature.label}</td>
                <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}><FeatureValue value={feature.free} /></td>
                <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}><FeatureValue value={feature.starter} /></td>
                <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}><FeatureValue value={feature.pro} /></td>
                <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}><FeatureValue value={feature.unlimited} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FeatureTable