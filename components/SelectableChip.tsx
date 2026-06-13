'use client'

import React from 'react'

export interface SelectableChipProps {
  label: string
  icon: React.ComponentType<any>
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export function SelectableChip({ label, icon: Icon, selected, onClick, disabled }: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        height: '40px',
        paddingLeft: '16px',
        paddingRight: '16px',
        borderRadius: '999px',
        border: 'none',
        backgroundColor: selected
          ? 'var(--color-surface-inverse)'
          : 'var(--color-surface-sunken)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 'var(--font-size-base)',
        fontWeight: 'var(--font-weight-medium)',
        fontFamily: 'var(--font-family-primary)',
        color: selected
          ? 'var(--color-text-on-inverse)'
          : 'var(--color-text-body)',
        transition: 'background-color 0.12s ease, color 0.12s ease',
        outline: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <Icon
        size={16}
        color={selected ? 'var(--color-icon-on-inverse)' : 'var(--color-icon-default)'}
        strokeWidth={2}
      />
      {label}
    </button>
  )
}
