'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/Button'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'

interface RenameConversationModalProps {
  currentTitle: string
  onSave: (newTitle: string) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

export function RenameConversationModal({
  currentTitle,
  onSave,
  onCancel,
  saving = false,
}: RenameConversationModalProps) {
  const [value, setValue] = useState(currentTitle)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const handleSave = () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === currentTitle) { onCancel(); return }
    onSave(trimmed)
  }

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
        aria-labelledby="rename-modal-title"
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
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        <ModalHeader
          id="rename-modal-title"
          title="Rename chat"
          onClose={onCancel}
          closeDisabled={saving}
          divider={false}
        />

        <div style={{ padding: 'var(--spacing-4) var(--spacing-6) var(--spacing-6)' }}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            disabled={saving}
            style={{
              width: '100%',
              padding: '10px var(--spacing-3)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family-primary)',
              color: 'var(--color-text-body)',
              backgroundColor: 'transparent',
              WebkitBoxShadow: '0 0 0 1000px white inset',
              border: '1.5px solid var(--color-accent-blue)',
              borderRadius: 'var(--border-radius-md)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <ModalFooter divider={false}>
          <Button variant="tertiary" size="md" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!value.trim() || value.trim() === currentTitle}
            loading={saving}
          >
            Save
          </Button>
        </ModalFooter>
      </div>
    </>
  )
}
