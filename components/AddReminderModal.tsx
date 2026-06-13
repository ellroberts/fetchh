// components/AddReminderModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Button } from '@/components/Button'
import { TagPicker } from '@/components/TagPicker'
import { useUserTags } from '@/lib/use-user-tags'

export interface AddReminderModalProps {
  content: string
  defaultProjectId?: string
  onSave: (title: string, detail?: string, projectId?: string, tag?: string) => Promise<void>
  onCancel: () => void
}

export function AddReminderModal({ content, defaultProjectId, onSave, onCancel }: AddReminderModalProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [saving, setSaving] = useState(false)
  const { customTags, addTag } = useUserTags()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const handleSave = async () => {
    setSaving(true)
    await onSave(content.trim(), detail.trim() || undefined, defaultProjectId, selectedTag ?? undefined)
    setSaving(false)
  }

  return createPortal(
    <div
      onClick={() => { if (!saving) onCancel() }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-card-hover)', display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        <ModalHeader title="Add reminder" onClose={onCancel} closeDisabled={saving} />
        <div style={{ padding: 'var(--spacing-5) var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: 'var(--spacing-3)', background: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)' }}>
            "{content}"
          </div>
          <TagPicker
            customTags={customTags}
            selectedTag={selectedTag}
            onSelect={setSelectedTag}
            onAddTag={addTag}
            disabled={saving}
          />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2)' }}>
              Note <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              autoFocus
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Any extra context?"
              rows={3}
              style={{ width: '100%', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)', padding: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)', background: 'var(--color-surface-raised)', resize: 'vertical', fontFamily: 'var(--font-family-primary)', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Add reminder</Button>
        </ModalFooter>
      </div>
    </div>,
    document.body
  )
}