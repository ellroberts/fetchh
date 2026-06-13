'use client'

// components/JumpBackCard.tsx
import React, { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ConversationCard, type Conversation } from '@/components/ConversationCard'
import { PawmarkCard } from '@/components/PawmarkCard'
import { EditNoteTagModal } from '@/components/EditNoteTagModal'
import { ProjectCard, type ProjectStats, type Project } from '@/components/ProjectCard'
import { SectionHeader } from '@/components/SectionHeader'
import { createSupabaseClient } from '@/lib/supabase'

export interface JumpBackItem {
  id: string
  title: string
  subtitle?: string
  note?: string
  sourceId?: string
  tag?: string
  status?: 'open' | 'done'
  meta?: string
  timeAgo: string
  createdAt: string
  platform?: string
  message_count?: number
  tags?: string[]
  conversationCount?: number
  exchangeCount?: number
  projectName?: string | null
  isGlobal?: boolean
}

export type JumpBackType =
  | 'chats'
  | 'thread-groups'
  | 'projects'
  | 'highlights'
  | 'actions'
  | 'reminders'
  | 'questions'

export interface JumpBackCardProps {
  items: JumpBackItem[]
  activeType?: JumpBackType
  onItemClick?: (id: string) => void
  onContinue?: (conversation: Conversation) => void
  onRename?: (conversation: Conversation) => void
  onDelete?: (conversation: Conversation) => void
  onDownload?: (conversation: Conversation, format?: import('@/lib/export-utils').ExportFormat) => void
  onAddToProject?: (conversation: Conversation) => void
  pinCounts?: Record<string, number>
  isLoading?: boolean
  projectStats?: Record<string, ProjectStats>
  onProjectRename?: (project: Project) => void
  onProjectDelete?: (project: Project) => void
  onProjectDownload?: (project: Project, format: 'txt' | 'markdown' | 'json') => void
  onRefresh?: () => void
}

type EditableItemType = 'highlights' | 'actions' | 'reminders'

interface EditingState {
  id: string
  type: EditableItemType
  mode: 'note' | 'tag'
  currentNote?: string
  currentTag?: string
}

type GroupLabel = 'Today' | 'Yesterday' | 'Last week' | 'Last month' | 'Older'

const getGroupLabel = (createdAt: string): GroupLabel => {
  const now = new Date()
  const date = new Date(createdAt)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfLastWeek = new Date(startOfToday)
  startOfLastWeek.setDate(startOfToday.getDate() - 7)
  const startOfLastMonth = new Date(startOfToday)
  startOfLastMonth.setDate(startOfToday.getDate() - 30)
  if (date >= startOfToday) return 'Today'
  if (date >= startOfYesterday) return 'Yesterday'
  if (date >= startOfLastWeek) return 'Last week'
  if (date >= startOfLastMonth) return 'Last month'
  return 'Older'
}

const GROUP_ORDER: GroupLabel[] = ['Today', 'Yesterday', 'Last week', 'Last month', 'Older']

export const ALL_TYPE_OPTIONS: { label: string; value: JumpBackType; adminOnly?: boolean }[] = [
  { label: 'Chats',          value: 'chats' },
  { label: 'Thread groups',  value: 'thread-groups', adminOnly: true },
  { label: 'Projects',       value: 'projects' },
  { label: 'Highlights',     value: 'highlights' },
  { label: 'Actions',        value: 'actions' },
  { label: 'Reminders',      value: 'reminders' },
  { label: 'Questions asked', value: 'questions' },
]

function SkeletonItemRow() {
  const shimmer: React.CSSProperties = {
    backgroundColor: 'var(--color-border-subtle)',
    borderRadius: 'var(--border-radius-sm)',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--spacing-3) var(--spacing-4)',
      borderBottom: '1px solid var(--color-border-subtle)', gap: 'var(--spacing-3)',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ ...shimmer, height: 14, width: '60%' }} />
        <div style={{ ...shimmer, height: 12, width: '35%' }} />
      </div>
      <div style={{ ...shimmer, height: 12, width: 40, flexShrink: 0 }} />
    </div>
  )
}

function ItemRow({ item, onClick }: { item: JumpBackItem; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const metaParts: string[] = []
  if (item.isGlobal) metaParts.push('Global search')
  else if (item.projectName) metaParts.push(item.projectName)
  if ((item.conversationCount ?? 0) > 0) metaParts.push(`${item.conversationCount} conversation${item.conversationCount === 1 ? '' : 's'}`)
  if ((item.exchangeCount ?? 0) > 0) metaParts.push(`${item.exchangeCount} exchange${item.exchangeCount === 1 ? '' : 's'}`)
  const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : (item.subtitle ?? '')

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--spacing-3) var(--spacing-4)',
      borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer',
      backgroundColor: hovered ? 'var(--color-state-hover-bg)' : 'transparent',
      transition: 'background-color 0.15s ease',
    }}>
      <div style={{ flex: 1, minWidth: 0, marginRight: 'var(--spacing-4)' }}>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title}
        </div>
        {metaLine && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>{metaLine}</div>
        )}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {item.timeAgo}
      </div>
    </div>
  )
}

const CARD_TYPES = new Set<JumpBackType>(['chats', 'projects', 'highlights', 'actions', 'reminders'])

const DEFAULT_PROJECT_STATS: ProjectStats = {
  totalConversations: 0, totalMessages: 0, totalPins: 0,
  totalSources: 0, lastActivity: '', sources: [],
}

export const JumpBackCard: React.FC<JumpBackCardProps> = ({
  items, activeType, onItemClick, onContinue, onRename, onDelete, onDownload,
  onAddToProject, pinCounts, isLoading = false, projectStats,
  onProjectRename, onProjectDelete, onProjectDownload, onRefresh,
}) => {
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (label: string) => setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }))

  const handleEditSave = async (value: string | null) => {
    if (!editing) return
    const supabase = createSupabaseClient()
    const table = editing.type === 'highlights' ? 'highlights' : editing.type === 'actions' ? 'action_items' : 'reminder_items'
    if (editing.mode === 'note') {
      await supabase.from(table).update({ [editing.type === 'highlights' ? 'notes' : 'detail']: value }).eq('id', editing.id)
    } else {
      await supabase.from(table).update({ tags: value ? [value] : null }).eq('id', editing.id)
    }
    setEditing(null)
    onRefresh?.()
  }

  const grouped: Partial<Record<GroupLabel, JumpBackItem[]>> = {}
  for (const item of items) {
    const label = getGroupLabel(item.createdAt)
    if (!grouped[label]) grouped[label] = []
    grouped[label]!.push(item)
  }
  const groups = GROUP_ORDER.filter(label => grouped[label]?.length)

  return (
    <div style={{
      height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-family-primary)', backgroundColor: 'var(--color-surface-default)',
      paddingLeft: '32px', paddingRight: '32px', boxSizing: 'border-box',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ paddingTop: 'var(--spacing-8)', paddingBottom: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            {activeType === 'chats' && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-lg)' }}>
                <ConversationCard skeleton viewMode="list" hideCheckbox />
              </div>
            ))}
            {activeType === 'projects' && Array.from({ length: 5 }).map((_, i) => (
              <ProjectCard key={i} skeleton viewMode="list" project={{ id: '', name: '', created_at: '' }} stats={DEFAULT_PROJECT_STATS} />
            ))}
            {(activeType === 'highlights' || activeType === 'actions' || activeType === 'reminders') && (
              <div className="jump-row-card-list">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PawmarkCard key={i} skeleton type={activeType === 'highlights' ? 'highlight' : activeType === 'actions' ? 'action' : 'reminder'} />
                ))}
              </div>
            )}
            {(activeType === 'thread-groups' || activeType === 'questions' || !activeType) && Array.from({ length: 5 }).map((_, i) => (
              <SkeletonItemRow key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing here yet" subtitle="Items will appear as you use ThreadCub." style={{ height: '100%' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: 'var(--spacing-8)', paddingBottom: 'var(--spacing-8)' }}>
            {groups.map(label => {
              const collapsed = !!collapsedGroups[label]
              const groupItems = grouped[label]!
              return (
                <div key={label}>
                  <SectionHeader
                    label={label.toUpperCase()}
                    count={groupItems.length}
                    collapsed={collapsed}
                    onToggle={() => toggleGroup(label)}
                  />
                  {!collapsed && (
                    <div className={activeType && CARD_TYPES.has(activeType) ? 'jump-row-card-list' : undefined}>
                      {groupItems.map(item => {
                        if (activeType === 'chats') {
                          const conversation: Conversation = {
                            id: item.id, title: item.title, platform: item.platform,
                            message_count: item.message_count, created_at: item.createdAt, has_embeddings: true,
                          }
                          return (
                            <div key={item.id} style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-lg)' }}>
                              <ConversationCard
                                conversation={conversation} viewMode="list" selectable={false} hideCheckbox={true}
                                pinCount={pinCounts?.[item.id] ?? 0} onViewDetails={onItemClick}
                                onContinue={onContinue} onRename={onRename} onDelete={onDelete}
                                onDownload={onDownload} onAddToProject={onAddToProject} showJumpBack={true}
                              />
                            </div>
                          )
                        }
                        if (activeType === 'projects') {
                          const stats = projectStats?.[item.id] ?? DEFAULT_PROJECT_STATS
                          const project: Project = { id: item.id, name: item.title, created_at: item.createdAt }
                          return (
                            <ProjectCard
                              key={item.id}
                              project={project}
                              stats={stats}
                              viewMode="list"
                              isSelected={false}
                              hideCheckbox={true}
                              onClick={() => onItemClick?.(item.id)}
                              onRename={onProjectRename}
                              onDelete={onProjectDelete}
                              onDownload={onProjectDownload}
                            />
                          )
                        }
                        if (activeType === 'highlights') {
                          return (
                            <PawmarkCard key={item.id} type="highlight" id={item.id} content={item.title}
                              note={item.note} tag={item.tag} sourceTitle={item.subtitle}
                              createdAt={item.createdAt} timeAgo={item.timeAgo}
                              onViewDetails={onItemClick ? () => onItemClick(item.id) : undefined}
                              onJumpBack={onItemClick ? () => onItemClick(item.id) : undefined}
                              onNote={() => setEditing({ id: item.id, type: 'highlights', mode: 'note', currentNote: item.note, currentTag: item.tag })}
                              onTag={() => setEditing({ id: item.id, type: 'highlights', mode: 'tag', currentNote: item.note, currentTag: item.tag })}
                            />
                          )
                        }
                        if (activeType === 'actions') {
                          return (
                            <PawmarkCard key={item.id} type="action" id={item.id} content={item.title}
                              note={item.note} tag={item.tag} sourceTitle={item.subtitle} status={item.status}
                              createdAt={item.createdAt} timeAgo={item.timeAgo}
                              onViewDetails={onItemClick ? () => onItemClick(item.id) : undefined}
                              onJumpBack={onItemClick ? () => onItemClick(item.id) : undefined}
                              onNote={() => setEditing({ id: item.id, type: 'actions', mode: 'note', currentNote: item.note, currentTag: item.tag })}
                              onTag={() => setEditing({ id: item.id, type: 'actions', mode: 'tag', currentNote: item.note, currentTag: item.tag })}
                            />
                          )
                        }
                        if (activeType === 'reminders') {
                          return (
                            <PawmarkCard key={item.id} type="reminder" id={item.id} content={item.title}
                              note={item.note} tag={item.tag} sourceTitle={item.subtitle} status={item.status}
                              createdAt={item.createdAt} timeAgo={item.timeAgo}
                              onViewDetails={onItemClick ? () => onItemClick(item.id) : undefined}
                              onJumpBack={onItemClick ? () => onItemClick(item.id) : undefined}
                              onNote={() => setEditing({ id: item.id, type: 'reminders', mode: 'note', currentNote: item.note, currentTag: item.tag })}
                              onTag={() => setEditing({ id: item.id, type: 'reminders', mode: 'tag', currentNote: item.note, currentTag: item.tag })}
                            />
                          )
                        }
                        return <ItemRow key={item.id} item={item} onClick={onItemClick ? () => onItemClick(item.id) : undefined} />
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <EditNoteTagModal
          mode={editing.mode} defaultNote={editing.currentNote} defaultTag={editing.currentTag}
          onSave={handleEditSave} onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

export default JumpBackCard