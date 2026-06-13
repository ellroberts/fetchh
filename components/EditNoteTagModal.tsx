'use client'

// components/EditNoteTagModal.tsx
import { useState, useEffect } from 'react'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Button } from '@/components/Button'
import { TagPicker } from '@/components/TagPicker'
import { useUserTags } from '@/lib/use-user-tags'

export type EditNoteTagMode = 'note' | 'tag'

export interface EditNoteTagModalProps {
  mode: EditNoteTagMode
  /** Pre-populated note text when editing an existing note */
  defaultNote?: string
  /** Pre-selected tag value when editing an existing tag */
  defaultTag?: string
  /** Called with the new value. For note: null clears it. For tag: null clears it. */
  onSave: (value: string | null) => Promise<void>
  onCancel: () => void
}

export function EditNoteTagModal({
  mode,
  defaultNote,
  defaultTag,
  onSave,
  onCancel,
}: EditNoteTagModalProps) {
  const [note, setNote] = useState(defaultNote ?? '')
  const [selectedTag, setSelectedTag] = useState<string | null>(defaultTag ?? null)
  const [saving, setSaving] = useState(false)
  const { customTags, addTag } = useUserTags()

  const isEditing = mode === 'note' ? !!defaultNote : !!defaultTag
  const title = mode === 'note'
    ? (isEditing ? 'Edit note' : 'Add note')
    : (isEditing ? 'Edit tag' : 'Add tag')
  const saveLabel = isEditing ? 'Update' : 'Save'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const handleSave = async () => {
    setSaving(true)
    if (mode === 'note') {
      await onSave(note.trim() || null)
    } else {
      await onSave(selectedTag)
    }
    setSaving(false)
  }

  return (
    <div
      onClick={() => { if (!saving) onCancel() }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-card-hover)', display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        <ModalHeader title={title} onClose={onCancel} closeDisabled={saving} />
        <div style={{ padding: 'var(--spacing-5) var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {mode === 'note' ? (
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note…"
              rows={4}
              disabled={saving}
              style={{ width: '100%', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)', padding: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)', background: 'var(--color-surface-raised)', resize: 'vertical', fontFamily: 'var(--font-family-primary)', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
          ) : (
            <TagPicker
              customTags={customTags}
              selectedTag={selectedTag}
              onSelect={setSelectedTag}
              onAddTag={addTag}
              disabled={saving}
            />
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>{saveLabel}</Button>
        </ModalFooter>
      </div>
    </div>
  )
}
