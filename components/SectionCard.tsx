// components/SectionCard.tsx
import React from 'react'

export interface SectionCardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Onboarding target attribute — used by OnboardingFlow to position modals */
  'data-onboarding-card'?: string
  /** Shows selected state: border-focus replaces default border */
  selected?: boolean
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  children,
  action,
  className = '',
  style,
  'data-onboarding-card': dataOnboardingCard,
  selected = false,
}) => {
  const getBorder = () => {
    if (selected) return '2px solid var(--color-border-focus)'
    return '1px solid var(--color-border-default)'
  }

  return (
    <div
      className={className}
      data-onboarding-card={dataOnboardingCard}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface-raised)',
        border: getBorder(),
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--spacing-6)',
        fontFamily: 'var(--font-family-primary)',
        ...style,
      }}
    >
      {(title || subtitle || action) && (
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {title && (
              <h3 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-title)',
                margin: 0,
              }}>
                {title}
              </h3>
            )}
            {action && <div>{action}</div>}
          </div>
          {subtitle && (
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              margin: 'var(--spacing-1) 0 0',
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}

export default SectionCard
