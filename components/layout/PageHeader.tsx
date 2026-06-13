// components/layout/PageHeader.tsx
'use client'
import { Input } from '../Input'
import { IconButton } from '../IconButton'
import React, { useState, useEffect, useRef } from 'react'
import { Route } from 'lucide-react'
import { Tooltip } from '@/components/Tooltip'
import { ThreadFilters, FilterState } from '@/components/ThreadFilters'

interface Project {
  id: string
  name: string
}

interface ViewToggleOption {
  value: string
  label: string
}

export interface PageHeaderProps {
  title?: string
  subtitle?: string
  /** When true, renders shimmer blocks in place of title, subtitle, tabs, and controls */
  loading?: boolean
  tabs?: React.ReactNode

  showSearch?: boolean
  searchQuery?: string
  searchPlaceholder?: string
  isSearching?: boolean
  onSearchChange?: (value: string) => void
  onSearchClear?: () => void

  showFilters?: boolean
  filters?: FilterState
  filterProjects?: Project[]
  filterConversations?: Array<{ tags?: any; platform?: string; source?: string }>
  onFiltersChange?: (filters: FilterState) => void
  filterContent?: React.ReactNode

  showViewToggle?: boolean
  showStorylineToggle?: boolean
  viewMode?: string
  viewOptions?: ViewToggleOption[]
  onViewModeChange?: (mode: string) => void

  showRefresh?: boolean
  filtersOpen?: boolean
  onFiltersOpenChange?: (open: boolean) => void
  isRefreshing?: boolean
  onRefresh?: () => void

  actions?: React.ReactNode

  showBack?: boolean
  onBack?: () => void
  onClose?: () => void
  /** When false, disables sticky positioning (e.g. for dashboard/non-scroll-container pages) */
  sticky?: boolean
  style?: React.CSSProperties
}

// ── Shared shimmer style helper ────────────────────────────────────────────────
const shimmer = (overrides?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: 'var(--color-border-subtle)',
  borderRadius: 'var(--border-radius-sm)',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  flexShrink: 0,
  ...overrides,
})

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  loading = false,
  showSearch = false,
  searchQuery = '',
  searchPlaceholder = 'Search...',
  isSearching = false,
  onSearchChange,
  onSearchClear,
  showFilters = false,
  filters,
  filterProjects = [],
  filterConversations = [],
  onFiltersChange,
  filterContent,
  showViewToggle = false,
  showStorylineToggle = false,
  viewMode,
  viewOptions,
  onViewModeChange,
  showRefresh = false,
  filtersOpen: filtersOpenProp = false,
  onFiltersOpenChange,
  isRefreshing = false,
  onRefresh,
  actions,
  showBack = false,
  onBack,
  onClose,
  tabs,
  sticky = true,
  style,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sticky) return
    const scrollParent = document.querySelector('[data-scroll-container]')
    if (!scrollParent) return
    const onScroll = () => setScrolled(scrollParent.scrollTop > 8)
    scrollParent.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollParent.removeEventListener('scroll', onScroll)
  }, [sticky])

  const toggleFilters = () => {
    setFiltersOpen(o => !o)
    onFiltersOpenChange?.(!filtersOpen)
  }

  const hasActiveFilters = filters
    ? filters.platforms.length > 0 ||
      filters.dateRange !== 'all' ||
      filters.projectId !== 'all' ||
      filters.topics.length > 0
    : false

  return (
    <div ref={headerRef} style={{
      position: sticky ? 'sticky' : 'static',
      top: sticky ? 0 : undefined,
      zIndex: sticky ? 10 : undefined,
      backgroundColor: 'transparent',
      paddingBottom: tabs ? '0' : 'var(--spacing-6)',
      boxShadow: sticky && scrolled ? '0 1px 0 var(--color-border-subtle), 0 4px 16px rgba(0,0,0,0.06)' : 'none',
      transition: 'box-shadow 200ms ease',
      ...style,
    }}>

      {/* ── Title + subtitle row ── */}
      {title && (
        <div style={{ paddingTop: '0', paddingBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-3)', minHeight: sticky ? 'var(--spacing-12)' : undefined }}>

            {showBack && (
              <Tooltip label="Back" position="top">
                <IconButton onClick={onBack} size="lg">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </IconButton>
              </Tooltip>
            )}

            <div style={{ flex: 1 }}>
              {/* H1 — skeleton or real */}
              {loading ? (
                <div style={shimmer({ width: 80, height: 28, borderRadius: 'var(--border-radius-md)' })} />
              ) : (
                <h1 style={{
                  fontSize: 'var(--font-size-3xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-title)',
                  fontFamily: 'var(--font-family-primary)',
                  margin: 0,
                  lineHeight: 'var(--line-height-tight)',
                }}>
                  {title}
                </h1>
              )}

              {/* Subtitle — real text or skeleton shimmer, always reserves the same space */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--spacing-3)',
                marginTop: '0',
                minHeight: 'var(--font-size-lg)',
              }}>
                {loading ? (
                  <div style={shimmer({ width: 220, height: 16, marginTop: 4 })} />
                ) : subtitle ? (
                  <p style={{
                    margin: 0,
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-lg)',
                    fontFamily: 'var(--font-family-primary)',
                    lineHeight: 'var(--line-height-normal)',
                  }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexShrink: 0 }}>
              {!tabs && showRefresh && (
                <Tooltip label="Refresh" position="top">
                  <IconButton
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    variant="ghost"
                    size="lg"
                  >
                    <svg
                      width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </IconButton>
                </Tooltip>
              )}

              {onClose ? (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: '1px solid transparent',
                  borderRadius: 'var(--border-radius-lg)',
                  padding: 'var(--spacing-1)',
                  gap: 'var(--spacing-1)',
                  backgroundColor: 'transparent',
                  marginBottom: 'var(--spacing-1)',
                }}>
                  <Tooltip label="Close" position="top">
                    <IconButton onClick={onClose} variant="ghost" size="lg">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </IconButton>
                  </Tooltip>
                </div>
              ) : (!tabs && showFilters && (
                <Tooltip label="Filters" position="top">
                  <IconButton
                    onClick={toggleFilters}
                    variant="ghost"
                    selected={filtersOpen || hasActiveFilters}
                    size="lg" style={{ position: 'relative' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="6" x2="20" y2="6"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                      <line x1="11" y1="18" x2="13" y2="18"/>
                    </svg>
                    {hasActiveFilters && (
                      <span style={{
                        position: 'absolute', top: 'var(--spacing-1)', right: 'var(--spacing-1)',
                        width: '5px', height: '5px', borderRadius: 'var(--border-radius-full)',
                        backgroundColor: 'var(--color-primary-500)',
                      }} />
                    )}
                  </IconButton>
                </Tooltip>
              ))}

              {/* View toggle — skeleton or real */}
              {showViewToggle && viewMode && onViewModeChange && (
                loading ? (
                  <div style={shimmer({
                    width: 72,
                    height: 'var(--spacing-10)',
                    borderRadius: 'var(--border-radius-lg)',
                  })} />
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: 'var(--spacing-1)',
                    gap: 'var(--spacing-1)',
                    backgroundColor: 'var(--color-surface-raised)',
                    marginBottom: 'var(--spacing-1)',
                  }}>
                    <Tooltip label="List view" position="top">
                      <IconButton onClick={() => onViewModeChange('list')} variant="ghost" selected={viewMode === 'list'} size="lg" style={{ borderRadius: 'var(--border-radius-md)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                    <Tooltip label="Grid view" position="top">
                      <IconButton onClick={() => onViewModeChange('cards')} variant="ghost" selected={viewMode === 'cards'} size="lg" style={{ borderRadius: 'var(--border-radius-md)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                    {showStorylineToggle && (
                      <Tooltip label="Storyline" position="top" align="right">
                        <IconButton onClick={() => onViewModeChange('storyline')} variant="ghost" selected={viewMode === 'storyline'} size="lg" style={{ borderRadius: 'var(--border-radius-md)' }}>
                          <Route size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                )
              )}

              {actions && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'var(--spacing-1)' }}>
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar slot + inline filter/refresh ── */}
      {tabs && (
        <div style={{ marginTop: 'var(--spacing-2)', paddingBottom: '0', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          {tabs}
          {(showFilters || showRefresh) && (
            loading ? (
              /* Skeleton placeholders for filter + refresh icons */
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexShrink: 0 }}>
                {showFilters && (
                  <div style={shimmer({
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--border-radius-lg)',
                  })} />
                )}
                {showRefresh && (
                  <div style={shimmer({
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--border-radius-lg)',
                  })} />
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexShrink: 0 }}>
                {showFilters && (
                  <Tooltip label="Filters" position="top">
                    <IconButton
                      onClick={toggleFilters}
                      variant="ghost"
                      selected={filtersOpen || hasActiveFilters}
                      size="lg" style={{ position: 'relative' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="20" y2="6"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                        <line x1="11" y1="18" x2="13" y2="18"/>
                      </svg>
                      {hasActiveFilters && (
                        <span style={{
                          position: 'absolute', top: 'var(--spacing-1)', right: 'var(--spacing-1)',
                          width: '5px', height: '5px', borderRadius: 'var(--border-radius-full)',
                          backgroundColor: 'var(--color-primary-500)',
                        }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
                {showRefresh && (
                  <Tooltip label="Refresh" position="top">
                    <IconButton
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      variant="ghost"
                      size="lg"
                    >
                      <svg
                        width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Filters panel — renders below tab bar when tabs present ── */}
      {showFilters && filtersOpen && (
        filterContent ? (
          <div style={{ paddingTop: 'var(--spacing-3)', paddingBottom: 'var(--spacing-0)' }}>{filterContent}</div>
        ) : filters && onFiltersChange ? (
          <div style={{ paddingTop: 'var(--spacing-3)' }}>
            <ThreadFilters
              filters={filters}
              onChange={onFiltersChange}
              projects={filterProjects}
              conversations={filterConversations}
            />
          </div>
        ) : null
      )}

    </div>
  )
}

export default PageHeader