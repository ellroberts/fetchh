// components/Alert.tsx
import React from 'react'
import { Heading } from './Heading'

export interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning' | 'insight'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  title?: string
  onClose?: () => void
  dismissible?: boolean
  className?: string
  style?: React.CSSProperties
  action?: { label: string; onClick: () => void; loading?: boolean }
  shadow?: boolean | 'sm' | 'md' | 'lg'
  center?: boolean
  customIcon?: React.ReactNode
}

export const Alert: React.FC<AlertProps> = ({
  type,
  size = 'md',
  children,
  title,
  onClose,
  dismissible = true,
  className,
  style,
  action,
  shadow = false,
  center = false,
  customIcon
}) => {
  const S = {
    sm: {
      px: 'var(--spacing-3)',
      py: 'var(--spacing-2)',
      fontSize: 'var(--font-size-xs)',
      lineHeight: 'var(--line-height-tight)',
      radius: 'var(--border-radius-base)',
      icon: 18,
      close: 14,
      gap: 'var(--spacing-2)',
    },
    md: {
      px: '16px',
      py: '12px',
      fontSize: 'var(--font-size-base)',
      lineHeight: 'var(--line-height-normal)',
      radius: 'var(--border-radius-lg)',
      icon: 24,
      close: 16,
      gap: 'var(--spacing-3)',
    },
    lg: {
      px: 'var(--spacing-6)',
      py: 'var(--spacing-4)',
      fontSize: 'var(--font-size-lg)',
      lineHeight: 'var(--line-height-normal)',
      radius: 'var(--border-radius-xl)',
      icon: 26,
      close: 18,
      gap: 'var(--spacing-4)',
    },
  }[size]

  const SuccessIcon = ({ s }: { s: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
    </svg>
  )
  const TriangleAlertIcon = ({ s }: { s: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
      <path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  )
  const InfoIcon = ({ s }: { s: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  )
  const LightbulbIcon = ({ s }: { s: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/><path d="M10 22h4"/>
    </svg>
  )
  const CloseIcon = ({ s }: { s: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
    </svg>
  )

  const IconForType = () => {
    switch (type) {
      case 'success': return <SuccessIcon s={S.icon} />
      case 'error':   return <TriangleAlertIcon s={S.icon} />
      case 'warning': return <TriangleAlertIcon s={S.icon} />
      case 'insight': return <LightbulbIcon s={S.icon} />
      default:        return <InfoIcon s={S.icon} />
    }
  }

  const surfaceStyles: React.CSSProperties =
    type === 'success' ? { backgroundColor: 'var(--color-status-success-bg)',  color: 'var(--color-status-success)' } :
    type === 'error'   ? { backgroundColor: 'var(--color-status-error-bg)',         color: 'var(--color-status-error)' } :
    type === 'warning' ? { backgroundColor: 'var(--color-status-warning-bg)',   color: 'var(--color-status-warning)' } :
    type === 'insight' ? { backgroundColor: 'var(--color-primary-light)',       color: 'var(--color-primary-text)' } :
                         { backgroundColor: 'var(--color-primary-light)',       color: 'var(--color-primary-text)' }

  const columns = ['auto', '1fr']
  if (action) columns.push('auto')
  if (dismissible && onClose) columns.push('auto')

  const baseStyles: React.CSSProperties = {
    minHeight: 48,
    display: center ? 'flex' : 'grid',
    ...(center ? { justifyContent: 'center' } : { gridTemplateColumns: columns.join(' ') }),
    alignItems: 'center',
    gap: S.gap,
    paddingInline: S.px,
    paddingBlock: action ? '4px' : S.py,
    borderRadius: S.radius,
    fontFamily: 'var(--font-family-primary)',
    fontWeight: 'var(--font-weight-medium)',
    fontSize: S.fontSize,
    lineHeight: S.lineHeight,
    ...(shadow ? {
      boxShadow:
        shadow === 'sm' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' :
        shadow === 'lg' ? '0 10px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.07)' :
                         '0 4px 12px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.06)',
    } : {}),
    ...surfaceStyles,
    ...style,
  }

  const actionButtonStyles: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: 'currentColor',
    border: '1.5px solid currentColor',
    borderRadius: 'var(--border-radius-base)',
    padding: size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 16px' : '2px 12px',
    fontSize: S.fontSize,
    fontWeight: 'var(--font-weight-semibold)',
    fontFamily: 'var(--font-family-primary)',
    cursor: action?.loading ? 'not-allowed' : 'pointer',
    opacity: action?.loading ? 0.7 : 1,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'var(--transition-base)',
  }

  const closeButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--spacing-1)',
    borderRadius: 'var(--border-radius-base)',
    color: 'currentColor',
    opacity: 0.6,
    transition: 'opacity var(--transition-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      style={baseStyles}
      className={className}
    >
      <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
        {customIcon ? React.cloneElement(customIcon as React.ReactElement<any>, { size: S.icon }) : <IconForType />}
      </span>

      <div style={{ margin: 0, minWidth: 0, wordBreak: 'break-word' }}>
        {title && (
          <Heading
            level={4}
            margin="none"
            style={{
              marginBottom: '4px',
              fontSize: S.fontSize,
              color: 'inherit',
            }}
          >
            {title}
          </Heading>
        )}
        <div style={{ fontWeight: title ? 'var(--font-weight-normal)' : 'var(--font-weight-medium)' }}>
          {children}
        </div>
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.loading}
          style={actionButtonStyles}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = action?.loading ? '0.7' : '1' }}
        >
          {action.loading ? 'Loading...' : action.label}
        </button>
      )}

      {dismissible && onClose && (
        <button
          type="button"
          onClick={onClose}
          style={closeButtonStyles}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
          aria-label="Close alert"
        >
          <CloseIcon s={S.close} />
        </button>
      )}
    </div>
  )
}
