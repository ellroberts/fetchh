'use client'

import React from 'react'

export interface ModalFooterProps {
  children: React.ReactNode
  /** Render top divider. Default: true */
  divider?: boolean
  /** Remove padding from inner row. Default: false */
  noPadding?: boolean
}

export function ModalFooter({ children, divider = true, noPadding = false }: ModalFooterProps) {
  return (
    <>
      {divider && (
        <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />
      )}
      <div style={{
        padding: noPadding ? 0 : 'var(--spacing-4) var(--spacing-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 'var(--spacing-3)',
      }}>
        {children}
      </div>
    </>
  )
}
