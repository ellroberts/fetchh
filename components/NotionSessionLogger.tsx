'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NotebookPen, X, Check, Loader } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { ModalHeader } from '@/components/ModalHeader'

interface Field {
  key: string
  label: string
  placeholder: string
  rows?: number
}

const FIELDS: Field[] = [
  { key: 'epic',        label: 'Epic / Area',       placeholder: 'e.g. RAG Components, Auth, Projects page', rows: 1 },
  { key: 'task',        label: 'Task',               placeholder: 'Short summary of what was done', rows: 2 },
  { key: 'story',       label: 'Story / Feature',    placeholder: 'More detail on the feature or fix', rows: 3 },
  { key: 'filesTouched',label: 'Files touched',      placeholder: 'e.g. components/rag/CodaTrail.tsx, app/api/...', rows: 2 },
  { key: 'notes',       label: 'Notes',              placeholder: 'Anything extra worth remembering', rows: 2 },
]

type Status = 'idle' | 'loading' | 'success' | 'error'

export function NotionSessionLogger() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [notionUrl, setNotionUrl] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({
    epic: '', task: '', story: '', filesTouched: '', notes: '',
  })

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const set = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!fields.epic.trim() || !fields.task.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const res = await fetch('/api/notion-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to log')
      setNotionUrl(data.url || '')
      setStatus('success')
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleClose = () => {
    setOpen(false)
    setStatus('idle')
    setErrorMsg('')
    setNotionUrl('')
    setFields({ epic: '', task: '', story: '', filesTouched: '', notes: '' })
  }

  if (!mounted) return null

  return (
    <>
      {/* Trigger button — bottom-right corner */}
      <button
        onClick={() => setOpen(true)}
        title="Log session to Notion"
        style={{
          position: 'fixed',
          bottom: 40,
          right: 32,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          backgroundColor: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--border-radius-lg)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family-primary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-body)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--color-border-strong)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.14)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-border-default)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
        }}
      >
        <NotebookPen size={16} strokeWidth={1.5} />
        Log session
      </button>

      {open && createPortal(
        <>
          <div
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notion-logger-title"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 71,
              width: 'calc(100% - var(--spacing-8))',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: 'var(--border-radius-xl)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border-default)',
              fontFamily: 'var(--font-family-primary)',
            }}
          >
            <ModalHeader
              id="notion-logger-title"
              title="Log session to Notion"
              subtitle="Adds a new row to your App Backlog"
              onClose={handleClose}
              divider
            />

            {status === 'success' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-4)',
                padding: 'var(--spacing-8) var(--spacing-6)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: 'var(--color-accent-teal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={24} color="white" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', marginBottom: 4 }}>
                    Logged to Notion
                  </div>
                  {notionUrl && (
                    <a
                      href={notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-500)' }}
                    >
                      Open in Notion →
                    </a>
                  )}
                </div>
                <Button variant="tertiary" size="sm" onClick={handleClose}>Close</Button>
              </div>
            ) : (
              <div style={{ padding: 'var(--spacing-5) var(--spacing-6) var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-body)',
                      marginBottom: 'var(--spacing-1)',
                    }}>
                      {f.label}
                      {(f.key === 'epic' || f.key === 'task') && (
                        <span style={{ color: 'var(--color-accent-rose)', marginLeft: 2 }}>*</span>
                      )}
                    </label>
                    <textarea
                      rows={f.rows ?? 2}
                      value={fields[f.key]}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        fontSize: 'var(--font-size-sm)',
                        fontFamily: 'var(--font-family-primary)',
                        color: 'var(--color-text-body)',
                        backgroundColor: 'var(--color-surface-page)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--border-radius-md)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        lineHeight: 1.5,
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary-500)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)' }}
                    />
                  </div>
                ))}

                {status === 'error' && (
                  <div style={{
                    padding: 'var(--spacing-3)',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-accent-rose)',
                  }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', paddingTop: 'var(--spacing-2)' }}>
                  <Button variant="tertiary" size="md" onClick={handleClose} disabled={status === 'loading'}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSubmit}
                    disabled={!fields.epic.trim() || !fields.task.trim() || status === 'loading'}
                    loading={status === 'loading'}
                  >
                    {status === 'loading' ? 'Logging…' : 'Log to Notion'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>,
        document.documentElement
      )}
    </>
  )
}
