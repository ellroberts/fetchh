'use client'

// components/ThreadSelectionMenu.tsx
import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Highlighter, ListTodo, Bell } from 'lucide-react'
import { IconButton } from '@/components/IconButton'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThreadSelectionMenuData {
  /** Viewport X at time of mouseup — we'll recompute from range on scroll */
  x: number
  /** Viewport Y at time of mouseup */
  y: number
  text: string
  /** The live Range object so we can recompute position on scroll */
  range: Range
}

export interface ThreadSelectionMenuHandle {
  show: (data: ThreadSelectionMenuData) => void
  hide: () => void
}

const MENU_BUTTONS = [
  { type: 'insight'  as const, Icon: Highlighter, title: 'Save highlight' },
  { type: 'action'   as const, Icon: ListTodo,    title: 'Add action'     },
  { type: 'reminder' as const, Icon: Bell,        title: 'Add reminder'   },
]

// ─── Static inner component (for playground / composition) ───────────────────

export interface ThreadSelectionMenuProps {
  onChoose?: (type: 'insight' | 'action' | 'reminder') => void
}

export function ThreadSelectionMenu({ onChoose }: ThreadSelectionMenuProps) {
  return (
    <div className="thread-selection-menu">
      {MENU_BUTTONS.map(({ type, Icon, title }) => (
        <IconButton
          key={type}
          tooltip={title}
          tooltipPosition="top"
          onClick={() => onChoose?.(type)}
        >
          <Icon size={17} />
        </IconButton>
      ))}
    </div>
  )
}

// ─── Portal wrapper (used in ThreadDrawer) ────────────────────────────────────

export const ThreadSelectionMenuPortal = forwardRef<
  ThreadSelectionMenuHandle,
  { onChoose: (text: string, type: 'insight' | 'action' | 'reminder') => void }
>(function ThreadSelectionMenuPortal({ onChoose }, ref) {
  const [menu, setMenu] = useState<ThreadSelectionMenuData | null>(null)
  // Live position derived from the range — recomputed on scroll/resize
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  const recomputePos = useCallback((range: Range) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      try {
        const rect = range.getBoundingClientRect()
        // If the range has scrolled off-screen, hide gracefully
        if (rect.width === 0 && rect.height === 0) {
          setPos(null)
          return
        }
        setPos({ x: rect.left + rect.width / 2, y: rect.top })
      } catch {
        setPos(null)
      }
    })
  }, [])

  useImperativeHandle(ref, () => ({
    show: (data) => {
      setMenu(data)
      setPos({ x: data.x, y: data.y })
    },
    hide: () => {
      setMenu(null)
      setPos(null)
    },
  }))

  // Recompute position on scroll or resize while menu is visible
  useEffect(() => {
    if (!menu) return
    const { range } = menu

    const onScroll = () => recomputePos(range)
    const onResize = () => recomputePos(range)

    // Listen on capture so we catch scroll on any ancestor
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [menu, recomputePos])

  // Dismiss on outside mousedown — but only if no text gets selected (i.e. not a drag)
  useEffect(() => {
    if (!menu) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-selection-menu]')) return
      // Wait for mouseup to see if text was selected — if so, don't dismiss
      const onMouseUp = () => {
        const sel = window.getSelection()
        if (!sel || sel.toString().trim().length < 2) {
          setMenu(null)
          setPos(null)
        }
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mouseup', onMouseUp, { once: true })
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menu])

  if (!menu || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-selection-menu
      onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
        zIndex: 9999,
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-default)',
        borderRadius: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        padding: '6px',
        display: 'flex',
        gap: '2px',
      }}
    >
      {MENU_BUTTONS.map(({ type, Icon, title }) => (
        <span
          key={type}
          onMouseDown={(e) => {
            e.preventDefault()
            const text = menu.text
            setMenu(null)
            setPos(null)
            window.getSelection()?.removeAllRanges()
            onChoose(text, type)
          }}
        >
          <IconButton tooltip={title} tooltipPosition="top">
            <Icon size={17} />
          </IconButton>
        </span>
      ))}
    </div>,
    document.body
  )
})