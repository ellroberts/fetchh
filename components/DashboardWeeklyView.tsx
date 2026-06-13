// components/DashboardWeeklyView.tsx
'use client'

import React from 'react'

interface DashboardWeeklyViewProps {
  conversations: { created_at: string }[]
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekActivity(conversations: { created_at: string }[]): number[] {
  const counts = Array(7).fill(0)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  conversations.forEach(c => {
    const d = new Date(c.created_at)
    const diff = Math.floor((d.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24))
    if (diff >= 0 && diff < 7) counts[diff]++
  })
  return counts
}

function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

export const DashboardWeeklyView: React.FC<DashboardWeeklyViewProps> = ({ conversations }) => {
  const counts = getWeekActivity(conversations)
  const todayIndex = getTodayIndex()
  const max = Math.max(...counts, 1)
  const totalThisWeek = counts.reduce((a, b) => a + b, 0)

  return (
    <div style={{ fontFamily: 'var(--font-family-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
        <div>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)' }}>This week</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginLeft: 'var(--spacing-2)' }}>{totalThisWeek} {totalThisWeek === 1 ? 'chat' : 'chats'} saved</span>
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--spacing-2)' }}>
        {DAY_LABELS.map((label, i) => {
          const count = counts[i]
          const isToday = i === todayIndex
          const isFuture = i > todayIndex
          const intensity = count === 0 ? 0 : Math.ceil((count / max) * 3)
          const bgColor = isFuture
            ? 'var(--color-border-subtle)'
            : count === 0
            ? 'var(--color-state-hover-bg)'
            : intensity === 1
            ? 'var(--color-primary-light, #c7cafd)'
            : intensity === 2
            ? 'var(--color-primary-400, #7c83fb)'
            : 'var(--color-primary-500)'
          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-1)' }}>
              <div style={{ width: '100%', height: '56px', borderRadius: 'var(--border-radius-md)', backgroundColor: bgColor, border: isToday ? '2px solid var(--color-primary-500)' : '1px solid transparent', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 'var(--spacing-1)', transition: 'background-color 0.2s' }}>
                {count > 0 && <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: intensity >= 2 ? 'white' : 'var(--color-primary-500)', lineHeight: 1 }}>{count}</span>}
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: isToday ? 'var(--color-primary-500)' : 'var(--color-text-secondary)', fontWeight: isToday ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)' }}>{label}</span>
            </div>
          )
        })}
      </div>
      {totalThisWeek === 0 && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--spacing-3)' }}>No chats saved yet this week</p>}
    </div>
  )
}

export default DashboardWeeklyView
