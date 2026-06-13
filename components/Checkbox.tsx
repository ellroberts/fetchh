'use client'
import React, { useId } from 'react'

export interface CheckboxProps {
  label?: string
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
  onBlur?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
  id?: string
  name?: string
  'data-testid'?: string
}

const sizes = {
  sm: { box: '16px', icon: 10, fontSize: '13px', gap: '6px' },
  md: { box: '18px', icon: 11, fontSize: '14px', gap: '8px' },
  lg: { box: '20px', icon: 13, fontSize: '15px', gap: '8px' },
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked = false,
  indeterminate = false,
  onChange,
  onBlur,
  disabled = false,
  size = 'md',
  style,
  id,
  name,
  'data-testid': testId,
}) => {
  const generatedId = useId()
  const checkboxId = id || `checkbox-${generatedId}`
  const { box, icon, fontSize, gap } = sizes[size]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) onChange(e.target.checked)
  }

  const boxBase: React.CSSProperties = {
    width: box,
    height: box,
    flexShrink: 0,
    borderRadius: '4px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: (checked || indeterminate) ? 'var(--color-primary-500)' : 'var(--color-border-default)',
    backgroundColor: (checked || indeterminate) ? 'var(--color-primary-500)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background-color 0.15s',
  }

  return (
    <label
      htmlFor={checkboxId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-family-primary)',
        userSelect: 'none',
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        const box = e.currentTarget.querySelector<HTMLDivElement>('[data-checkbox-box]')
        if (!box) return
        if (checked || indeterminate) {
          box.style.borderColor = 'var(--color-primary-600)'
          box.style.backgroundColor = 'var(--color-primary-600)'
        } else {
          box.style.borderColor = 'var(--color-border-strong)'
          box.style.backgroundColor = 'var(--color-surface-raised)'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        const box = e.currentTarget.querySelector<HTMLDivElement>('[data-checkbox-box]')
        if (!box) return
        box.style.borderColor = (checked || indeterminate) ? 'var(--color-primary-500)' : 'var(--color-border-default)'
        box.style.backgroundColor = (checked || indeterminate) ? 'var(--color-primary-500)' : 'transparent'
      }}
    >
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        checked={checked}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        data-testid={testId}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0 }}
      />
      <div data-checkbox-box style={boxBase}>
        {indeterminate && !checked ? (
          <svg
            width={icon}
            height={icon}
            viewBox="0 0 12 12"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <line x1="2.5" y1="6" x2="9.5" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            width={icon}
            height={icon}
            viewBox="0 0 12 12"
            fill="none"
            style={{ opacity: checked ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
          >
            <path
              d="M2 6L4.5 8.5L10 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && (
        <span style={{
          fontSize,
          color: disabled ? 'var(--color-border-default)' : 'var(--color-text-body)',
          lineHeight: '1.4',
        }}>
          {label}
        </span>
      )}
    </label>
  )
}

export default Checkbox
