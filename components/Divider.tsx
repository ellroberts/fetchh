// src/components/Divider.tsx
import React from 'react'

export interface DividerProps {
  /** Text to display in the center of the divider */
  text?: string
  /** Color variant for line and text */
  color?: 'gray' | 'light' | 'muted'
  /** Spacing above and below the divider */
  spacing?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  bg?: string
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
}

export const Divider: React.FC<DividerProps> = ({
  text = 'OR',
  color = 'gray',
  spacing = 'md',
  bg,
  className,
  style
}) => {
  // Color variants using design tokens
  const colorVariants = {
    gray: {
      line: 'var(--color-border-default)',
      text: 'var(--color-text-secondary)'
    },
    light: {
      line: 'var(--color-border-subtle)',
      text: 'var(--color-border-default)'
    },
    muted: {
      line: 'var(--color-border-default)',
      text: 'var(--color-text-secondary)'
    }
  }

  // Spacing variants using design tokens
  const spacingVariants = {
    sm: 'var(--spacing-4)',
    md: 'var(--spacing-6)',
    lg: 'var(--spacing-8)'
  }

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: `${spacingVariants[spacing]} 0`,
    ...style
  }

  const lineStyles: React.CSSProperties = {
    flex: 1,
    height: 'var(--border-width-thin)',
    backgroundColor: colorVariants[color].line,
    border: 'none'
  }

  const textStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: colorVariants[color].text,
    padding: `0 var(--spacing-4)`,
    backgroundColor: bg ?? 'var(--color-surface-page)',
    fontFamily: 'var(--font-family-primary)',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    userSelect: 'none'
  }

  // If no text is provided, render just a line..
  if (!text) {
    return (
      <div 
        className={className}
        style={{
          ...containerStyles,
          padding: 0
        }}
      >
        <div style={lineStyles} />
      </div>
    )
  }

  return (
    <div className={className} style={containerStyles}>
      <div style={lineStyles} />
      <span style={textStyles}>{text}</span>
      <div style={lineStyles} />
    </div>
  )
}