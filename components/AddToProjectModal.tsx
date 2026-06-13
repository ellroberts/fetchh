'use client'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Plus } from 'lucide-react'

interface Project {
  id: string
  name: string
}

interface AddToProjectModalProps {
  conversationTitle: string
  count?: number
  projects: Project[]
  selectedProjectId: string
  onChangeProject: (id: string) => void
  onConfirm: () => void
  onCreateProject?: (name: string) => Promise<string | null>
  onClose: () => void
  title?: string
  confirmLabel?: string
}

export function AddToProjectModal({
  conversationTitle,
  count = 1,
  projects,
  selectedProjectId,
  onChangeProject,
  onConfirm,
  onCreateProject,
  onClose,
  title = 'Add to Project',
  confirmLabel,
}: AddToProjectModalProps) {
  const [step, setStep] = useState<'select' | 'create'>('select')
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !creating) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, creating])

  const handleCreate = async () => {
    if (!newProjectName.trim() || !onCreateProject) return
    setCreating(true)
    const newId = await onCreateProject(newProjectName.trim())
    setCreating(false)
    if (newId) {
      onChangeProject(newId)
      setStep('select')
      setNewProjectName('')
    }
  }

  const handleBack = () => {
    setStep('select')
    setNewProjectName('')
  }

  const subtitle = count > 1
    ? `Select a project for ${count} conversations`
    : `Select a project for "${conversationTitle}"`

  const modalShell = (children: React.ReactNode) => (
    <div onClick={() => { if (!creating) onClose() }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--spacing-4)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--color-border-default)' }}>
        {children}
      </div>
    </div>
  )

  if (step === 'create') {
    return modalShell(
      <>
        <ModalHeader
          title="New project"
          subtitle="Give your project a name, then add your conversations to it."
          onClose={onClose}
          divider={false}
        />
        <div style={{ padding: '0 var(--spacing-6)', marginTop: 'var(--spacing-4)' }}>
          <Input
            type="text"
            label="Project name"
            placeholder="e.g. ThreadCub rebrand"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') handleBack()
            }}
            autoFocus
          />
        </div>
        <ModalFooter divider={false}>
          <Button variant="tertiary" size="sm" onClick={handleBack}>Back</Button>
          <Button variant="primary" size="sm" onClick={handleCreate} loading={creating} disabled={!newProjectName.trim()}>
            Create project
          </Button>
        </ModalFooter>
      </>
    )
  }

  return modalShell(
    <>
      <ModalHeader
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        divider={false}
      />
      <div style={{ padding: '0 var(--spacing-6)', marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        <Input
          type="select"
          value={selectedProjectId}
          onChange={(e) => onChangeProject(e.target.value)}
          selectPlaceholder="Select a project..."
          options={projects.map(p => ({ value: p.id, label: p.name }))}
        />
        {onCreateProject && (
          <button
            onClick={() => setStep('create')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-primary-600)', fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family-primary)', fontWeight: 'var(--font-weight-medium)',
              padding: 'var(--spacing-1) 0',
            }}
          >
            <Plus size={14} />
            New project
          </button>
        )}
      </div>
      <ModalFooter divider={false}>
        <Button variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={onConfirm} disabled={!selectedProjectId}>
          {confirmLabel ?? (count > 1 ? `Add ${count} to Project` : title)}
        </Button>
      </ModalFooter>
    </>
  )
}