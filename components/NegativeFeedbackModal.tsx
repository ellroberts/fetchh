// components/NegativeFeedbackModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Button } from '@/components/Button'

const ISSUE_CATEGORIES = [
  'Did not fully follow my request',
  'Not factually correct',
  'Incomplete response',
  'Missed relevant context from my threads',
  'Too vague or generic',
  'Harmful or inappropriate',
  'Other',
] as const

interface NegativeFeedbackModalProps {
  onSubmit: (category: string, detail: string) => Promise<void>
  onCancel: () => void
}

export function NegativeFeedbackModal({ onSubmit, onCancel }: NegativeFeedbackModalProps) {
  const [category, setCategory] = useState('')
  const [detail, setDetail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const handleSubmit = async () => {
    setSaving(true)
    await onSubmit(category, detail.trim())
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
        <ModalHeader title="Give negative feedback" onClose={onCancel} closeDisabled={saving} />

        <div style={{ padding: 'var(--spacing-5) var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2)' }}>
              What type of issue do you wish to report? <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={saving}
              style={{ width: '100%', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)', padding: 'var(--spacing-2) var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: category ? 'var(--color-text-body)' : 'var(--color-text-muted)', background: 'var(--color-surface-input)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
            >
              <option value="">Select…</option>
              {ISSUE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2)' }}>
              Please provide details: <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              autoFocus
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="What was unsatisfying about this response?"
              rows={4}
              disabled={saving}
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
