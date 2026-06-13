'use client'
import React, { useEffect } from 'react'
import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'

interface DeleteProjectModalProps {
  projectName: string
  count?: number
  isDeleting?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteProjectModal({ projectName, count = 1, isDeleting, onConfirm, onClose }: DeleteProjectModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDeleting) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, isDeleting])

  return (
    <div onClick={() => { if (!isDeleting) onClose() }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--spacing-4)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--color-border-default)' }}>

        <ModalHeader
          title="Delete project"
          subtitle={count > 1
            ? <>Are you sure you want to delete <strong style={{ color: 'var(--color-text-title)' }}>{count} projects</strong>?</>
            : <>Are you sure you want to delete <strong style={{ color: 'var(--color-text-title)' }}>"{projectName}"</strong>?</>
          }
          onClose={onClose}
          closeDisabled={isDeleting}
          divider={false}
        />

        <div style={{ padding: '0 var(--spacing-6)', marginTop: 'var(--spacing-4)' }}>
          <Alert type="warning" size="md">
            Threads in this project won't be deleted — they'll remain in your threads list.
          </Alert>
        </div>

        <ModalFooter divider={false}>
          <Button variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : count > 1 ? `Delete ${count} Projects` : 'Delete Project'}
          </Button>
        </ModalFooter>

      </div>
    </div>
  )
}