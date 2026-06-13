'use client'
import React, { useEffect } from 'react'
import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'

export interface DeleteConversationModalProps {
  title: string
  count?: number
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
  highlightCount?: number
  actionCount?: number
  reminderCount?: number
}

export const DeleteConversationModal: React.FC<DeleteConversationModalProps> = ({
  title,
  count = 1,
  isDeleting,
  onConfirm,
  onCancel,
  highlightCount = 0,
  actionCount = 0,
  reminderCount = 0,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDeleting) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, isDeleting])

  return (
    <div onClick={() => { if (!isDeleting) onCancel() }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--spacing-4)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--color-border-default)' }}>

        <ModalHeader
          title="Delete Conversation"
          subtitle={count > 1
            ? <>Are you sure you want to delete <strong style={{ color: 'var(--color-text-title)' }}>{count} conversations</strong>?</>
            : <>Are you sure you want to delete <strong style={{ color: 'var(--color-text-title)' }}>"{title}"</strong>?</>
          }
          onClose={onCancel}
          closeDisabled={isDeleting}
          divider={false}
        />

        <div style={{ padding: '0 var(--spacing-6) var(--spacing-6)', marginTop: 'var(--spacing-4)' }}>
          <Alert type="error" size="md">
            <div>This will remove conversations from your account. Your data remains secure and can be restored.</div>
            {(highlightCount > 0 || actionCount > 0 || reminderCount > 0) && (
              <div style={{ marginTop: 'var(--spacing-2)' }}>
                {(() => {
                  const parts: string[] = []
                  if (highlightCount > 0) parts.push(`${highlightCount} highlight${highlightCount !== 1 ? 's' : ''}`)
                  if (actionCount > 0) parts.push(`${actionCount} action item${actionCount !== 1 ? 's' : ''}`)
                  if (reminderCount > 0) parts.push(`${reminderCount} reminder${reminderCount !== 1 ? 's' : ''}`)
                  return `This chat also has ${parts.join(', ')} which will also be permanently deleted.`
                })()}
              </div>
            )}
          </Alert>
        </div>

        <ModalFooter divider={false}>
          <Button variant="tertiary" size="sm" onClick={onCancel} disabled={isDeleting}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={isDeleting}>
            {isDeleting ? 'Deleting…' : count > 1 ? `Delete ${count} Conversations` : 'Delete Conversation'}
          </Button>
        </ModalFooter>

      </div>
    </div>
  )
}
