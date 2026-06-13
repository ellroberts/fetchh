'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Radio } from '@/components/Radio'
import { createPortal } from 'react-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuOptionProps {
  label: string
  /** Value used to match against Menu's selected value */
  value?: string
  icon?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  /** If set, renders a chevron and shows a flyout submenu on hover */
  submenu?: MenuOptionProps[]
}

export interface MenuProps {
  /** Render prop — receives (open, isOpen) so trigger can style itself */
  trigger: (open: (e: React.MouseEvent) => void, isOpen: boolean) => React.ReactNode
  /** Menu items */
  options: MenuOptionProps[]
  /** Horizontal alignment relative to trigger. Default: 'right' */
  align?: 'left' | 'right'
  /** Minimum width of the panel. Default: 160 */
  minWidth?: number
  /** Currently selected value — enables radio indicator on options */
  value?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Menu({ trigger, options, align = 'right', minWidth = 160, value }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const [triggerWidth, setTriggerWidth] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number>(-1)
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({})
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const submenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setFocusedIndex(-1)
  }, [])

  // Click-outside + scroll-close
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target) && !submenuRef.current?.contains(target)) close()
    }
    document.addEventListener('mousedown', handleClickOutside)

    const initialRect = triggerRef.current?.getBoundingClientRect()
    let rafId: number
    function checkPosition() {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      if (rect.top !== initialRect?.top || rect.left !== initialRect?.left) { close(); return }
      rafId = requestAnimationFrame(checkPosition)
    }
    rafId = requestAnimationFrame(checkPosition)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      cancelAnimationFrame(rafId)
    }
  }, [open, close])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      const enabled = options.filter(o => !o.disabled)
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(i => Math.min(i + 1, enabled.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        enabled[focusedIndex]?.onClick?.()
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, focusedIndex, options, close])

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow < 200 ? undefined : rect.bottom + 8
    const bottom = spaceBelow < 200 ? window.innerHeight - rect.top + 8 : undefined
    const left = align === 'left' ? rect.left : undefined
    const right = align === 'right' ? window.innerWidth - rect.right : undefined
    setTriggerWidth(rect.width)
    setMenuStyle({ position: 'fixed', top, bottom, left, right })
    setFocusedIndex(-1)
    setOpen(o => !o)
  }

  if (options.length === 0) return null

  return (
    <div ref={triggerRef} style={{ position: 'relative', display: 'flex', width: '100%' }}>
      {trigger(handleOpen, open)}
      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{
            ...menuStyle,
            zIndex: 9999,
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-card-hover)',
            minWidth: Math.max(minWidth, triggerWidth),
            overflow: 'hidden',
            fontFamily: 'var(--font-family-primary)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {options.map((opt, i) => {
            const enabledOptions = options.filter(o => !o.disabled)
            const enabledIndex = enabledOptions.indexOf(opt)
            const isFocused = !opt.disabled && enabledIndex === focusedIndex
            const hasSubmenu = !!opt.submenu?.length
            return (
              <div
                key={i}
                ref={el => { itemRefs.current[i] = el }}
                style={{ position: 'relative' }}
                onMouseEnter={() => {
                  if (submenuCloseTimer.current) { clearTimeout(submenuCloseTimer.current); submenuCloseTimer.current = null }
                  if (!opt.disabled) {
                    setFocusedIndex(enabledIndex)
                    if (hasSubmenu) {
                      const el = itemRefs.current[i]
                      if (el) {
                        const itemRect = el.getBoundingClientRect()
                        const panelRect = panelRef.current?.getBoundingClientRect()
                        const flyoutWidth = 180
                        const panelRight = panelRect?.right ?? itemRect.right
                        const panelLeft = panelRect?.left ?? itemRect.left
                        const spaceRight = window.innerWidth - panelRight
                        const openLeft = spaceRight < flyoutWidth + 8
                        // When opening left, use `right` so the flyout's right edge aligns
                        // exactly with the panel's left edge regardless of actual flyout width.
                        // When opening right, use `left` flush with the panel's right edge.
                        setSubmenuStyle(openLeft ? {
                          position: 'fixed',
                          top: itemRect.top,
                          right: window.innerWidth - panelLeft,
                          left: undefined,
                        } : {
                          position: 'fixed',
                          top: itemRect.top,
                          left: panelRight,
                          right: undefined,
                        })
                      }
                      setOpenSubmenuIndex(enabledIndex)
                    } else {
                      // Hovering a non-submenu item: close any open submenu immediately
                      setOpenSubmenuIndex(-1)
                    }
                  }
                }}
                onMouseLeave={() => {
                  // Only start close timer if a submenu is open — gives time to reach the flyout panel
                  if (openSubmenuIndex !== -1) {
                    submenuCloseTimer.current = setTimeout(() => {
                      setOpenSubmenuIndex(-1)
                    }, 150)
                  }
                }}
              >
                <button
                  role="menuitem"
                  disabled={opt.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!hasSubmenu && opt.onClick) { opt.onClick(); close() }
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.backgroundColor = opt.danger ? 'var(--color-status-error-bg)' : 'var(--color-state-hover-bg)' }}
                  onMouseUp={(e) => { e.currentTarget.style.backgroundColor = isFocused ? 'var(--color-state-hover-bg)' : 'transparent' }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-family-primary)',
                    color: opt.disabled
                      ? 'var(--color-border-default)'
                      : opt.danger ? 'var(--color-status-error)' : 'var(--color-text-body)',
                    backgroundColor: isFocused
                      ? opt.danger ? 'var(--color-status-error-bg)' : 'var(--color-state-hover-bg)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-base)',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.1s',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Leading slot — Radio if value prop present, icon otherwise */}
                  <span style={{ width: '20px', height: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {value !== undefined
                      ? <Radio checked={opt.value === value} />
                      : opt.icon ?? null}
                  </span>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {hasSubmenu && (
                    <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-icon-muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </button>
                {/* Flyout rendered via portal to escape overflow:hidden */}
                {hasSubmenu && openSubmenuIndex === enabledIndex && createPortal(
                  <div
                    ref={submenuRef}
                    onMouseEnter={() => { if (submenuCloseTimer.current) { clearTimeout(submenuCloseTimer.current); submenuCloseTimer.current = null } }}
                    onMouseLeave={() => {
                      submenuCloseTimer.current = setTimeout(() => {
                        setFocusedIndex(-1)
                        setOpenSubmenuIndex(-1)
                      }, 150)
                    }}
                    style={{
                      ...submenuStyle,
                      zIndex: 10000,
                      backgroundColor: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--border-radius-lg)',
                      boxShadow: 'var(--shadow-card-hover)',
                      minWidth: '160px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {opt.submenu!.map((sub, si) => (
                      <button
                        key={si}
                        role="menuitem"
                        onClick={(e) => { e.stopPropagation(); sub.onClick?.(); close() }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          fontSize: 'var(--font-size-sm)',
                          fontFamily: 'var(--font-family-primary)',
                          color: sub.danger ? 'var(--color-status-error)' : 'var(--color-text-body)',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--border-radius-base)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background-color 0.1s',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <span style={{ width: '20px', height: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sub.icon ?? null}
                        </span>
                        {sub.label}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Menu
