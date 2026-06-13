// src/components/Heading.tsx
import React from 'react'

export interface HeadingProps {
  /** The heading content */
  children: React.ReactNode
  /** Semantic heading level */
  level?: 1 | 2 | 3 | 4
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Color variant */
  color?: 'primary' | 'secondary' | 'muted'
  /** Bottom margin */
  margin?: 'none' | 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
  id?: string
}

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 2,
  align = 'left',
  color = 'primary',
  margin = 'md',
  className,
  style,
  id,
}) => {
  // Color variants using design tokens
  const colorVariants = {
    primary: 'var(--color-text-title)',
    secondary: 'var(--color-text-body)',
    muted: 'var(--color-text-secondary)'
  }

  // Margin variants using design tokens
  const marginVariants = {
    none: '0',
    sm: '0 0 var(--spacing-2) 0',
    md: '0 0 var(--spacing-4) 0',
    lg: '0 0 var(--spacing-6) 0'
  }

  // Level styles using available design tokens
  const levelStyles = {
    1: {
      fontSize: 'var(--font-size-4xl)',
      fontWeight: 'var(--font-weight-bold)',
      lineHeight: 'var(--line-height-tight)'
    },
    2: {
      fontSize: 'var(--font-size-2xl)',
      fontWeight: 'var(--font-weight-bold)',
      lineHeight: 'var(--line-height-tight)'
    },
    3: {
      fontSize: 'var(--font-size-lg)',
      fontWeight: 'var(--font-weight-semibold)',
      lineHeight: 'var(--line-height-normal)'
    },
    4: {
      fontSize: 'var(--font-size-base)',
      fontWeight: 'var(--font-weight-semibold)',
      lineHeight: 'var(--line-height-normal)'
    }
  }

  const baseStyles: React.CSSProperties = {
    fontFamily: 'var(--font-family-title)',
    color: colorVariants[color],
    textAlign: align,
    margin: marginVariants[margin],
    ...levelStyles[level],
    ...style
  }

  // Render appropriate semantic HTML element
  if (level === 1) {
    return <h1 id={id} style={baseStyles} className={className}>{children}</h1>
  } else if (level === 2) {
    return <h2 id={id} style={baseStyles} className={className}>{children}</h2>
  } else if (level === 3) {
    return <h3 id={id} style={baseStyles} className={className}>{children}</h3>
  } else {
    return <h4 id={id} style={baseStyles} className={className}>{children}</h4>
  }
}