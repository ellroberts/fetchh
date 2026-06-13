// components/TabFilterPanel.tsx
'use client'
import React from 'react'
import { Input } from '@/components/Input'
import { Checkbox } from '@/components/Checkbox'

export type TabType = 'threads' | 'highlights' | 'actions' | 'reminders'

export interface TabFilterState {
  filterBy: 'all' | 'project' | 'platform'
  filterValue: string          // project id, platform slug, or '' for all
  sortBy: 'date-added' | 'last-opened' | 'alphabetical' | 'message-count' | 'last-modified'
  viewAll: boolean
  viewCompleted: boolean
}

export const DEFAULT_TAB_FILTER_STATE: TabFilterState = {
  filterBy: 'all',
  filterValue: '',
  sortBy: 'date-added',
  viewAll: true,
  viewCompleted: false,
}

export interface Project {
  id: string
  name: string
}

export interface TabFilterPanelProps {
  state: TabFilterState
  onChange: (state: TabFilterState) => void
  activeTab?: TabType
  projects?: Project[]
  platforms?: string[]
}

export function TabFilterPanel({
  state,
  onChange,
  activeTab = 'threads',
  projects = [],
  platforms = [],
}: TabFilterPanelProps) {
  const set = (patch: Partial<TabFilterState>) => onChange({ ...state, ...patch })

  // ── Filter by options ────────────────────────────────────────────────────────

  const showFilterBy = activeTab === 'threads'

  const filterByOptions = [
    { value: 'all', label: 'All threads' },
    ...(projects.length > 0
      ? [
          { value: 'no-project', label: 'No project' },
          ...projects.map(p => ({ value: `project:${p.id}`, label: p.name })),
        ]
      : [{ value: 'no-project', label: 'No project' }]),
    ...(platforms.length > 0
      ? platforms.map(p => ({ value: `platform:${p}`, label: platformLabel(p) }))
      : []),
  ]

  // Combine filterBy + filterValue into a single select value for simplicity
  const filterSelectValue =
    state.filterBy === 'all' ? 'all'
    : state.filterBy === 'project' && state.filterValue === 'none' ? 'no-project'
    
    : state.filterBy === 'project' ? `project:${state.filterValue}`
    : state.filterBy === 'platform' ? `platform:${state.filterValue}`
    : 'all'

  const handleFilterChange = (raw: string) => {
    if (raw === 'all') {
      set({ filterBy: 'all', filterValue: '' })
    } else if (raw === 'no-project') {
      set({ filterBy: 'project', filterValue: 'none' })
    } else if (raw.startsWith('project:')) {
      set({ filterBy: 'project', filterValue: raw.replace('project:', '') })
    } else if (raw.startsWith('platform:')) {
      set({ filterBy: 'platform', filterValue: raw.replace('platform:', '') })
    }
  }

  // ── Sort by options ──────────────────────────────────────────────────────────

  const sortOptions: Record<TabType, { value: string; label: string }[]> = {
    threads: [
      { value: 'date-added', label: 'Date added' },
      { value: 'last-opened', label: 'Last opened' },
      { value: 'alphabetical', label: 'Alphabetically' },
      { value: 'message-count', label: 'Message count' },
    ],
    highlights: [
      { value: 'date-added', label: 'Date saved' },
      { value: 'alphabetical', label: 'Alphabetically' },
    ],
    actions: [
      { value: 'date-added', label: 'Date added' },
      { value: 'last-modified', label: 'Last modified' },
      { value: 'alphabetical', label: 'Alphabetically' },
    ],
    reminders: [
      { value: 'date-added', label: 'Date added' },
      { value: 'last-modified', label: 'Last modified' },
      { value: 'alphabetical', label: 'Alphabetically' },
    ],
  }

  const currentSortOptions = sortOptions[activeTab]

  // If current sortBy isn't valid for this tab, reset to first option
  const validSortValue = currentSortOptions.find(o => o.value === state.sortBy)
    ? state.sortBy
    : currentSortOptions[0].value

  // ── View all / View Completed — only on actions + reminders ─────────────────

  const showStatusFilter = activeTab === 'actions' || activeTab === 'reminders'

  return (
    <div className="tab-filter-panel">
      <div className="tab-filter-panel__left">
        {showFilterBy && (
          <div className="tab-filter-panel__field">
            <span className="tab-filter-panel__label">Filter by</span>
            <Input
              type="select"
              value={filterSelectValue}
              onChange={e => handleFilterChange(e.target.value)}
              options={filterByOptions}
              style={{ width: 180 }}
            />
          </div>
        )}
        <div className="tab-filter-panel__field">
          <span className="tab-filter-panel__label">Sort by</span>
          <Input
            type="select"
            value={validSortValue}
            onChange={e => set({ sortBy: e.target.value as TabFilterState['sortBy'] })}
            options={currentSortOptions}
            style={{ width: 160 }}
          />
        </div>
      </div>
      {showStatusFilter && (
        <div className="tab-filter-panel__right">
          <Checkbox
            label="View all"
            checked={state.viewAll}
            size="md"
            onChange={checked => set({ viewAll: checked, viewCompleted: checked ? false : state.viewCompleted })}
          />
          <Checkbox
            label="View Completed"
            checked={state.viewCompleted}
            size="md"
            onChange={checked => set({ viewCompleted: checked, viewAll: checked ? false : state.viewAll })}
          />
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function platformLabel(slug: string): string {
  const map: Record<string, string> = {
    claude: 'Claude', 'claude.ai': 'Claude',
    chatgpt: 'ChatGPT', openai: 'ChatGPT',
    gemini: 'Gemini',
  }
  return map[slug.toLowerCase()] ?? (slug.charAt(0).toUpperCase() + slug.slice(1))
}

// ── Time grouping ─────────────────────────────────────────────────────────────

export type TimeGroupLabel = 'TODAY' | 'YESTERDAY' | 'LAST WEEK' | 'OLDER'
export const TIME_GROUP_ORDER: TimeGroupLabel[] = ['TODAY', 'YESTERDAY', 'LAST WEEK', 'OLDER']

export function groupByTime<T>(
  items: T[],
  getDate: (item: T) => string,
): { label: TimeGroupLabel; items: T[] }[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const MS = 86400000
  const startOfYesterday = new Date(startOfToday.getTime() - MS)
  const startOfLastWeek = new Date(startOfToday.getTime() - 7 * MS)

  const groups: Record<TimeGroupLabel, T[]> = {
    'TODAY': [], 'YESTERDAY': [], 'LAST WEEK': [], 'OLDER': [],
  }
  for (const item of items) {
    const d = new Date(getDate(item))
    if (d >= startOfToday) groups['TODAY'].push(item)
    else if (d >= startOfYesterday) groups['YESTERDAY'].push(item)
    else if (d >= startOfLastWeek) groups['LAST WEEK'].push(item)
    else groups['OLDER'].push(item)
  }
  return TIME_GROUP_ORDER
    .filter(l => groups[l].length > 0)
    .map(l => ({ label: l, items: groups[l] }))
}

// ── applyTabFilter ────────────────────────────────────────────────────────────

export function applyTabFilter<T extends {
  created_at: string
  status?: string
  completed_at?: string | null
  title?: string
  message_count?: number
  platform?: string
  source?: string
  project_id?: string | null
}>(
  items: T[],
  filterState: TabFilterState,
): T[] {
  let result = [...items]

  // Project / platform filter (threads only — other tabs don't have these fields)
  if (filterState.filterBy === 'project') {
    if (filterState.filterValue === 'none') {
      result = result.filter(item => !item.project_id)
    } else if (filterState.filterValue) {
      result = result.filter(item => item.project_id === filterState.filterValue)
    }
  } else if (filterState.filterBy === 'platform' && filterState.filterValue) {
    result = result.filter(item => {
      const p = (item.platform || item.source || '').toLowerCase()
      return p === filterState.filterValue.toLowerCase() ||
        p.includes(filterState.filterValue.toLowerCase())
    })
  }

  // Status filter (actions + reminders only)
  const hasStatus = result.some(item => item.status !== undefined)
  if (hasStatus && !filterState.viewAll) {
    if (filterState.viewCompleted) {
      result = result.filter(item => item.status === 'done')
    } else {
      result = result.filter(item => item.status !== 'done' && item.status !== undefined)
    }
  }

  // Sort
  result.sort((a, b) => {
    switch (filterState.sortBy) {
      case 'alphabetical':
        return (a.title ?? '').localeCompare(b.title ?? '')
      case 'message-count':
        return (b.message_count ?? 0) - (a.message_count ?? 0)
      case 'last-modified':
        return new Date(b.completed_at || b.created_at).getTime() -
               new Date(a.completed_at || a.created_at).getTime()
      case 'last-opened':
      case 'date-added':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return result
}