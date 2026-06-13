// components/EmptyState.tsx
import React from 'react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'

export interface EmptyStateProps {
  size?: 'card' | 'page'
  icon?: React.ElementType
  iconColor?: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'tertiary'
    style?: React.CSSProperties
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'tertiary'
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
  }
  actionLayout?: 'stacked' | 'row'
  style?: React.CSSProperties
  children?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  size = 'card',
  icon,
  iconColor = 'var(--color-icon-muted)',
  title,
  subtitle,
  action,
  secondaryAction,
  actionLayout = 'stacked',
  style,
  children,
}) => {
  const buttonSize = size === 'page' ? 'lg' : 'sm'

  const buttons = (
    <>
      {action && (
        <Button
          variant={action.variant ?? 'secondary'}
          size={buttonSize}
          onClick={action.onClick}
          style={action.style}
          icon={action.icon}
          iconPosition={action.iconPosition ?? 'left'}
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          variant={secondaryAction.variant ?? 'tertiary'}
          size={buttonSize}
          onClick={secondaryAction.onClick}
          icon={secondaryAction.icon}
          iconPosition={secondaryAction.iconPosition ?? 'left'}
        >
          {secondaryAction.label}
        </Button>
      )}
    </>
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-6)',
      textAlign: 'center',
      ...style,
    }}>
      {icon && (
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <Icon icon={icon} size={size === 'page' ? 'page' : 'xl'} color={iconColor} />
        </div>
      )}
      <p style={{
        fontSize: size === 'page' ? 'var(--font-size-3xl)' : 'var(--font-size-base)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-body)',
        margin: 0,
        marginBottom: 'var(--spacing-0)',
      }}>
        {title}
      </p>
      {subtitle && (
        <p style={{
          fontSize: size === 'page' ? 'var(--font-size-lg)' : 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-regular)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          marginBottom: 'var(--spacing-8)',
        }}>
          {subtitle}
        </p>
      )}
      {(action || secondaryAction) && (
        actionLayout === 'row' ? (
          <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-3)' }}>
            {buttons}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            {buttons}
          </div>
        )
      )}
      {children}
    </div>
  )
}

export default EmptyState