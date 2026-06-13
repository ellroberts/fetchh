'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { Input } from '@/components/Input'
import { TabPill } from '@/components/TabPill'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'

export interface SelectableThread {
  id: string
  title: string
  platform?: string
  created_at: string
  message_count?: number
  project_id?: string | null
  projectName?: string | null
}

interface ThreadSelectModalProps {
  threads: SelectableThread[]
  onConfirm: (selectedIds: string[]) => Promise<void>
  onCancel: () => void
  confirming: boolean
  subtitle?: string
  defaultTab?: 'unassigned' | 'in-project'
}

function formatPlatform(platform?: string): string {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('claude') || p.includes('anthropic')) return 'Claude.ai'
  if (p.includes('chatgpt') || p.includes('openai')) return 'ChatGPT'
  if (p.includes('gemini') || p.includes('google')) return 'Gemini'
  return platform ?? 'Unknown'
}

export function ThreadSelectModal({ threads, onConfirm, onCancel, confirming, defaultTab = 'unassigned' }: ThreadSelectModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'unassigned' | 'in-project'>(defaultTab)

  // Reset search when switching tabs
  const switchTab = (tab: 'unassigned' | 'in-project') => {
    setFilterTab(tab)
    setQuery('')
  }

  // Apply tab filter first, then search
  const tabFiltered = filterTab === 'unassigned'
    ? threads.filter(t => !t.projectName)
    : threads.filter(t => !!t.projectName)

  const visible = query.trim()
    ? tabFiltered.filter(t => t.title?.toLowerCase().includes(query.toLowerCase()))
    : tabFiltered

  const allSelected = visible.length > 0 && visible.every(t => selected.has(t.id))
  const noneSelected = selected.size === 0 || visible.every(t => !selected.has(t.id))
  const indeterminate = !allSelected && !noneSelected

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        visible.forEach(t => next.delete(t.id))
        return next
      })
    } else {
      setSelected(prev => new Set([...prev, ...visible.map(t => t.id)]))
    }
  }

  const selectedCount = visible.filter(t => selected.has(t.id)).length
  const confirmLabel = selectedCount === 0
    ? 'Add threads'
    : selectedCount === visible.length
    ? `Add all ${selectedCount}`
    : `Add ${selectedCount}`

  const subtitle = filterTab === 'unassigned'
    ? `${visible.length} unassigned chat${visible.length !== 1 ? 's' : ''}. Selected chats will be moved into this project.`
    : `${visible.length} chat${visible.length !== 1 ? 's' : ''} in other projects. Selected chats will be moved here.`

  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-select-modal-title"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: 'calc(100% - var(--spacing-8))',
          maxWidth: 520,
          backgroundColor: 'var(--color-surface-raised)',
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid var(--color-border-default)',
          display: 'flex',
          flexDirection: 'column',
          height: '85vh',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        <ModalHeader
          id="thread-select-modal-title"
          title="Add threads to this project"
          subtitle={subtitle}
          onClose={onCancel}
          divider={false}
        >
          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 'var(--spacing-1)', marginTop: 'var(--spacing-2)' }}>
            <TabPill
              label="Unassigned"
              selected={filterTab === 'unassigned'}
              onClick={() => switchTab('unassigned')}
            />
            <TabPill
              label="From a project"
              selected={filterTab === 'in-project'}
              onClick={() => switchTab('in-project')}
            />
          </div>

          {/* Search */}
          <div style={{ marginTop: 'var(--spacing-3)' }}>
            <Input
              type="search"
              placeholder="Search chats..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClear={() => setQuery('')}
            />
          </div>

          {/* Select all */}
           <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
            <Checkbox
              checked={allSelected}
              indeterminate={indeterminate}
              onChange={toggleAll}
              size="sm"
            />
            <span
              onClick={toggleAll}
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Select all
            </span>
          </div>
        </ModalHeader>

        {/* Divider below header */}
        <div style={{ height: 1, backgroundColor: 'var(--color-border-default)', flexShrink: 0 }} />

        {/* Thread list — flex-1 keeps footer anchored */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          padding: 'var(--spacing-3) var(--spacing-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
        }}>
          {threads.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
              No threads in your library yet.
            </p>
          ) : visible.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
              {query.trim() ? 'No chats match your search.' : filterTab === 'unassigned' ? 'All chats are already in a project.' : 'No chats are in other projects.'}
            </p>
          ) : visible.map((thread) => {
            const isChecked = selected.has(thread.id)
            return (
              <button
                key={thread.id}
                onClick={() => toggle(thread.id)}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-1) var(--spacing-4)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--border-radius-lg)',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-base)',
                  minHeight: 56,
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)' }}
              >
                <Checkbox checked={isChecked} onChange={() => toggle(thread.id)} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-title)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {thread.title || 'Untitled thread'}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-border-default)', marginTop: 2 }}>
                    {formatPlatform(thread.platform)}
                    {thread.message_count != null && <> · {thread.message_count} messages</>}
                    {thread.projectName && (
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>
                        · in <em>{thread.projectName}</em>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <ModalFooter divider={true}>
          <Button variant="tertiary" size="md" onClick={onCancel} disabled={confirming}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onConfirm(Array.from(selected))}
            disabled={noneSelected}
            loading={confirming}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </div>
    </>
  )
}
