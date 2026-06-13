'use client'
import React, { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { CheckSquare, Square, Plus } from 'lucide-react'
import type { ActionItem } from './projects/ActionItemCard'
import type { ReminderItem } from './projects/ReminderCard'
import { AddActionModal } from './AddActionModal'
import { AddReminderModal } from './AddReminderModal'

type Tab = 'actions' | 'reminders'
type Filter = 'all' | 'completed'

interface Project { id: string; name: string }
interface GroupedItems<T> { project: Project | null; items: T[] }

export const DashboardActionsWidget: React.FC = () => {
  const supabase = createSupabaseClient()
  const [tab, setTab] = useState<Tab>('actions')
  const [filter, setFilter] = useState<Filter>('all')
  const [actions, setActions] = useState<ActionItem[]>([])
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [addingType, setAddingType] = useState<'action' | 'reminder' | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [actRes, remRes, projRes] = await Promise.all([
        supabase.from('action_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reminder_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name').eq('user_id', user.id).order('name'),
      ])
      setActions((actRes.data ?? []) as ActionItem[])
      setReminders((remRes.data ?? []) as ReminderItem[])
      setProjects((projRes.data ?? []) as Project[])
      setLoading(false)
    }
    load()
  }, [])

  const toggleAction = async (id: string, current: 'open' | 'done') => {
    const next = current === 'done' ? 'open' : 'done'
    await supabase.from('action_items').update({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: next, completed_at: next === 'done' ? new Date().toISOString() : null } : a))
  }

  const toggleReminder = async (id: string, current: 'open' | 'done') => {
    const next = current === 'done' ? 'open' : 'done'
    await supabase.from('reminder_items').update({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }).eq('id', id)
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: next, completed_at: next === 'done' ? new Date().toISOString() : null } : r))
  }

  const handleSaveAction = async (title: string, detail?: string, projectId?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, project_id: projectId || null, title, detail: detail || '', source_chunk: null, source_conversation_ids: [], status: 'open', completed_at: null }
    const { data } = await supabase.from('action_items').insert(payload).select().single()
    if (data) setActions(prev => [data as ActionItem, ...prev])
    setAddingType(null)
  }

  const handleSaveReminder = async (title: string, detail?: string, projectId?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, project_id: projectId || null, title, detail: detail || '', source_chunk: null, source_conversation_ids: [], status: 'open', completed_at: null }
    const { data } = await supabase.from('reminder_items').insert(payload).select().single()
    if (data) setReminders(prev => [data as ReminderItem, ...prev])
    setAddingType(null)
  }

  const getProjectName = (id: string | null) => projects.find(p => p.id === id)?.name ?? 'No project'

  function groupItems<T extends { project_id: string; status: string }>(items: T[]): GroupedItems<T>[] {
    const filtered = filter === 'completed' ? items.filter(i => i.status === 'done') : items.filter(i => i.status === 'open')
    const map = new Map<string, T[]>()
    filtered.forEach(item => {
      const key = item.project_id ?? '__none__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return Array.from(map.entries()).map(([key, items]) => ({
      project: key === '__none__' ? null : (projects.find(p => p.id === key) ?? null),
      items
    }))
  }

  const grouped = tab === 'actions' ? groupItems(actions) : groupItems(reminders)
  const totalActive = tab === 'actions' ? actions.filter(a => a.status === 'open').length : reminders.filter(r => r.status === 'open').length

  return (
    <div style={{ fontFamily: 'var(--font-family-primary)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
          {(['actions', 'reminders'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '4px 14px', borderRadius: 'var(--border-radius-md)', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-base)', fontWeight: tab === t ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)', backgroundColor: tab === t ? 'var(--color-state-hover-bg)' : 'transparent', color: tab === t ? 'var(--color-text-title)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)', transition: 'all 0.15s' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}{tab === t && totalActive > 0 ? ` (${totalActive})` : ''}
            </button>
          ))}
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as Filter)} style={{ fontSize: 'var(--font-size-sm)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--border-radius-md)', padding: '4px 28px 4px 10px', backgroundColor: 'var(--color-card-default)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
          <option value="all">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-8)' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid var(--color-border-default)', borderTopColor: 'var(--color-primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-6) 0', margin: 0 }}>
            {filter === 'completed' ? 'Nothing completed yet' : `No ${tab} yet`}
          </p>
        ) : grouped.map((group, gi) => (
          <div key={gi}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-accent-amber)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--spacing-2)' }}>
              {group.project?.name ?? 'No project'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {group.items.map(item => (
                <div key={item.id} onClick={() => tab === 'actions' ? toggleAction(item.id, (item as ActionItem).status) : toggleReminder(item.id, (item as ReminderItem).status)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--color-state-hover-bg)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-default)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'}
                >
                  {item.status === 'done'
                    ? <CheckSquare size={16} style={{ color: 'var(--color-primary-500)', flexShrink: 0 }} />
                    : <Square size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 'var(--font-size-sm)', color: item.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text-primary)', textDecoration: item.status === 'done' ? 'line-through' : 'none', flex: 1 }}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'var(--spacing-3)', position: 'relative', display: 'inline-block' }}>
        <button onClick={() => setShowTypePicker(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', padding: 'var(--spacing-2) var(--spacing-4)', borderRadius: 'var(--border-radius-md)', border: 'none', backgroundColor: 'var(--color-primary-500)', color: 'white', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}>
          <Plus size={16} /> Add
        </button>
        {showTypePicker && (
          <div style={{ position: 'absolute', bottom: '110%', left: 0, backgroundColor: 'var(--color-card-default)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', zIndex: 50, minWidth: '140px' }}>
            {(['action', 'reminder'] as const).map(type => (
              <button key={type} onClick={() => { setAddingType(type); setShowTypePicker(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', backgroundColor: 'transparent', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-state-hover-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {addingType === 'action' && (
        <AddActionModal content="" onSave={handleSaveAction} onCancel={() => setAddingType(null)} />
      )}
      {addingType === 'reminder' && (
        <AddReminderModal content="" onSave={handleSaveReminder} onCancel={() => setAddingType(null)} />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default DashboardActionsWidget
