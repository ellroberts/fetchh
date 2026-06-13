// components/SelectAllRow.tsx
'use client'

import React from 'react'
import { Checkbox } from '@/components/Checkbox'

export interface SelectAllRowProps {
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
  paddingTop?: string
  skeleton?: boolean
}

export function SelectAllRow({
  checked = false,
  indeterminate = false,
  onChange,
  paddingTop = 'var(--spacing-4)',
  skeleton = false,
}: SelectAllRowProps) {
  if (skeleton) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        paddingTop,
        paddingBottom: 'var(--spacing-6)',
        gap: 'var(--spacing-2)',
      }}>
        <div style={{
          width: 16,
          height: 16,
          borderRadius: 'var(--border-radius-sm)',
          backgroundColor: 'var(--color-border-subtle)',
          flexShrink: 0,
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          width: 60,
          height: 12,
          borderRadius: 'var(--border-radius-sm)',
          backgroundColor: 'var(--color-border-subtle)',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      paddingTop,
      paddingBottom: 'var(--spacing-6)',
    }}>
      <Checkbox
        label="Select all"
        checked={checked}
        indeterminate={indeterminate}
        onChange={onChange}
      />
    </div>
  )
}

export default SelectAllRow
