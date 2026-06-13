// components/PositiveFeedbackModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Button } from '@/components/Button'

interface PositiveFeedbackModalProps {
  onSubmit: (detail: string) => Promise<void>
  onCancel: () => void
}

export function PositiveFeedbackModal({ onSubmit, onCancel }: PositiveFeedbackModalProps) {
  const [detail, setDetail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const handleSubmit = async () => {
    setSaving(true)
    await onSubmit(detail.trim())
    setSaving(false)
  }

  return createPortal(
    <div
      onClick={() => { if (!saving) onCancel() }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-card-hover)', display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        <ModalHeader title="Give positive feedback" onClose={onCancel} closeDisabled={saving} />

        <div style={{ padding: 'var(--spacing-5) var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2)' }}>
              Please provide details: <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              autoFocus
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="What was satisfying about this response?"
              rows={4}
              style={{ width: '100%', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)', padding: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)', background: 'var(--color-surface-input)', resize: 'vertical', fontFamily: 'var(--font-family-primary)', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Your feedback helps improve Coda's responses over time.
          </p>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>Submit</Button>
        </ModalFooter>
      </div>
    </div>,
    document.body
  )
}
