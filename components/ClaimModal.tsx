'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'

export interface ClaimableConversation {
  id: string
  title: string
  platform?: string
  created_at: string
  message_count?: number
}

interface ClaimModalProps {
  conversations: ClaimableConversation[]
  onClaim: (selectedIds: string[]) => Promise<void>
  onCancel: () => void
  onDiscard: () => Promise<void>
  claiming: boolean
  discarding: boolean
}

function formatPlatform(platform?: string): string {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('claude') || p.includes('anthropic')) return 'Claude.ai'
  if (p.includes('chatgpt') || p.includes('openai')) return 'ChatGPT'
  if (p.includes('gemini') || p.includes('google')) return 'Gemini'
  return platform ?? 'Unknown'
}

export function ClaimModal({ conversations, onClaim, onCancel, onDiscard, claiming, discarding }: ClaimModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(conversations.map(c => c.id)))
  const allSelected = selected.size === conversations.length
  const noneSelected = selected.size === 0
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
    setSelected(allSelected ? new Set() : new Set(conversations.map(c => c.id)))
  }

  const restoreLabel = noneSelected
    ? 'Restore'
    : allSelected
    ? `Restore all ${conversations.length}`
    : `Restore ${selected.size}`

  const discardLabel = noneSelected
    ? 'Discard'
    : allSelected
    ? `Discard all ${conversations.length}`
    : `Discard ${selected.size}`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-modal-title"
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
          maxHeight: '80vh',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        <ModalHeader
          id="claim-modal-title"
          title="Restore from cloud"
          subtitle="Chats found in your browser's local storage. These were deleted or captured before you signed in and haven't been synced to your account yet."
          onClose={onCancel}
          divider={true}
        >
          {/* Select all row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
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

        {/* List */}
        <div style={{
          overflowY: 'auto',
          flexGrow: 1,
          padding: 'var(--spacing-4) var(--spacing-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
        }}>
          {conversations.map((conv) => {
            const isChecked = selected.has(conv.id)
            return (
              <button
                key={conv.id}
                onClick={() => toggle(conv.id)}
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
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)' }}
              >
                <Checkbox checked={isChecked} onChange={() => toggle(conv.id)} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-title)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {conv.title || 'Untitled thread'}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-border-default)', marginTop: 2 }}>
                    {formatPlatform(conv.platform)}
                    {conv.message_count != null && <> · {conv.message_count} messages</>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <ModalFooter divider={true}>
          <Button variant="tertiary" size="md" onClick={onCancel} disabled={claiming || discarding}>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={onDiscard} loading={discarding} disabled={noneSelected || claiming}>
            {discardLabel}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onClaim(Array.from(selected))}
            disabled={noneSelected || discarding}
            loading={claiming}
          >
            {restoreLabel}
          </Button>
        </ModalFooter>
      </div>
    </>
  )
}
