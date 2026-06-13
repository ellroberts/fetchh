// components/Tooltip.tsx
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto'
type TooltipAlign = 'center' | 'left' | 'right'

interface TooltipProps {
  label: string
  position?: TooltipPosition
  align?: TooltipAlign
  disabled?: boolean
  children: React.ReactNode
}

const MIN_SPACE = 44

function resolvePosition(
  triggerRect: DOMRect,
  preferred: TooltipPosition,
): 'top' | 'bottom' | 'left' | 'right' {
  if (preferred !== 'auto') {
    const spaceMap = {
      top: triggerRect.top,
      bottom: window.innerHeight - triggerRect.bottom,
      left: triggerRect.left,
      right: window.innerWidth - triggerRect.right,
    }
    if (spaceMap[preferred] >= MIN_SPACE) return preferred
  }
  // Auto fallback: pick side with most room, preferring bottom then top
  const spaces = {
    bottom: window.innerHeight - triggerRect.bottom,
    top: triggerRect.top,
    right: window.innerWidth - triggerRect.right,
    left: triggerRect.left,
  }
  return (Object.entries(spaces).sort((a, b) => b[1] - a[1])[0][0]) as 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({
  label,
  position = 'auto',
  align = 'center',
  disabled = false,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [resolvedPos, setResolvedPos] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom')
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const pos = resolvePosition(rect, position)
    setResolvedPos(pos)

    // Temporarily show to measure tooltip size
    let tipW = 0, tipH = 0
    if (tooltipRef.current) {
      tipW = tooltipRef.current.offsetWidth
      tipH = tooltipRef.current.offsetHeight
    }

    const GAP = 8
    let top = 0, left = 0

    if (pos === 'top') {
      top = rect.top + window.scrollY - tipH - GAP
      left = align === 'right'
        ? rect.right + window.scrollX - tipW
        : align === 'left'
          ? rect.left + window.scrollX
          : rect.left + window.scrollX + rect.width / 2 - tipW / 2
    } else if (pos === 'bottom') {
      top = rect.bottom + window.scrollY + GAP
      left = rect.left + window.scrollX + rect.width / 2 - tipW / 2
    } else if (pos === 'left') {
      top = rect.top + window.scrollY + rect.height / 2 - tipH / 2
      left = rect.left + window.scrollX - tipW - GAP
    } else {
      top = rect.top + window.scrollY + rect.height / 2 - tipH / 2
      left = rect.right + window.scrollX + GAP
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8))
    top = Math.max(8, top)

    setCoords({ top, left })
  }, [position, align])

  // If disabled flips to true while the tooltip is already showing, hide it immediately
  useEffect(() => {
    if (disabled) setVisible(false)
  }, [disabled])

  const handleEnter = useCallback(() => {
    if (disabled) return
    setVisible(true)
  }, [disabled])

  const handleLeave = useCallback(() => {
    setVisible(false)
  }, [])

  // Recompute on scroll/resize while visible
  useEffect(() => {
    if (!visible) return
    computePosition()
    window.addEventListener('scroll', computePosition, true)
    window.addEventListener('resize', computePosition)
    return () => {
      window.removeEventListener('scroll', computePosition, true)
      window.removeEventListener('resize', computePosition)
    }
  }, [visible, computePosition])

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    ...(resolvedPos === 'top' && {
      top: '100%', left: '50%', transform: 'translateX(-50%)',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent',
      borderTop: '4px solid var(--color-text-title)',
    }),
    ...(resolvedPos === 'bottom' && {
      bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent',
      borderBottom: '4px solid var(--color-text-title)',
    }),
    ...(resolvedPos === 'left' && {
      left: '100%', top: '50%', transform: 'translateY(-50%)',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent',
      borderLeft: '4px solid var(--color-text-title)',
    }),
    ...(resolvedPos === 'right' && {
      right: '100%', top: '50%', transform: 'translateY(-50%)',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent',
      borderRight: '4px solid var(--color-text-title)',
    }),
  }

  const tooltip = visible && mounted ? createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        zIndex: 9999,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        backgroundColor: 'var(--color-text-title)',
        color: 'var(--color-surface-page)',
        fontSize: 'var(--font-size-xs)',
        fontFamily: 'var(--font-family-primary)',
        padding: '6px 10px',
        borderRadius: 'var(--border-radius-base)',
        boxShadow: 'var(--shadow-card-hover)',
      }}
    >
      {label}
      <div style={arrowStyle} />
    </div>,
    document.body
  ) : null

  return (
    <div
      ref={triggerRef}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {tooltip}
    </div>
  )
}
