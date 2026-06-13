'use client'
import React from 'react'

export interface RadioProps {
  checked?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { box: '16px', dot: '6px' },
  md: { box: '18px', dot: '7px' },
  lg: { box: '20px', dot: '8px' },
}

export function Radio({ checked = false, disabled = false, size = 'md' }: RadioProps) {
  const { box, dot } = sizes[size]
  return (
    <div
      style={{
        width: box,
        height: box,
        flexShrink: 0,
        borderRadius: '50%',
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderColor: checked ? 'var(--color-primary-500)' : 'var(--color-border-default)',
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        width: dot,
        height: dot,
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary-500)',
        opacity: checked ? 1 : 0,
        transition: 'opacity 0.15s',
      }} />
    </div>
  )
}

export default Radio
