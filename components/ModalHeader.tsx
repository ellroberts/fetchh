'use client'

import React from 'react'
import { Heading } from '@/components/Heading'
import { IconButton } from '@/components/IconButton'
import { Tooltip } from '@/components/Tooltip'
import { X } from 'lucide-react'

export interface ModalHeaderProps {
  title: string
  subtitle?: React.ReactNode
  onClose: () => void
  closeDisabled?: boolean
  /** Slot rendered below subtitle — e.g. a select-all row */
  children?: React.ReactNode
  /** Render bottom divider. Default: true */
  divider?: boolean
  /** id passed to the heading for aria-labelledby */
  id?: string
}

export function ModalHeader({
  title,
  subtitle,
  onClose,
  closeDisabled = false,
  children,
  divider = true,
  id,
}: ModalHeaderProps) {
  return (
    <div style={{ padding: 'var(--spacing-6) var(--spacing-6) 0' }}>

      {/* Title row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--spacing-3)',
      }}>
        <Heading level={3} margin="none" id={id}>
          {title}
        </Heading>
        <Tooltip label="Close" position="top">
          <IconButton
            onClick={onClose}
            size="md"
            variant="ghost"
            disabled={closeDisabled}
          >
            <X size={16} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{
          margin: 'var(--spacing-0) 0 0',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 'var(--line-height-normal)',
        }}>
          {subtitle}
        </p>
      )}

      {/* Optional slot (e.g. select-all) */}
      {children && (
        <div style={{ marginTop: 'var(--spacing-4)' }}>
          {children}
        </div>
      )}

      {/* Divider */}
      {divider && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--spacing-4)',
          marginInline: 'calc(var(--spacing-6) * -1)',
        }} />
      )}
    </div>
  )
}
