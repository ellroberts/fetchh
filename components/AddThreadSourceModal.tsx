'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, CloudDownload, LayoutList } from 'lucide-react'
import { ModalHeader } from '@/components/ModalHeader'

interface AddThreadSourceModalProps {
  onClose: () => void
  onFileUpload: () => void
  onCloudDownload?: () => void
  onAddFromSaved?: () => void
}

export function AddThreadSourceModal({ onClose, onFileUpload, onCloudDownload, onAddFromSaved }: AddThreadSourceModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-source-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: 'calc(100% - var(--spacing-8))',
          maxWidth: 480,
          backgroundColor: 'var(--color-surface-raised)',
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid var(--color-border-default)',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        <ModalHeader
          id="add-source-title"
          title="Add"
          subtitle="Choose where from"
          onClose={onClose}
          divider={false}
        />

        {/* Option cards */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-3)',
          padding: 'var(--spacing-4) var(--spacing-6) var(--spacing-6)',
        }}>
          {/* File upload */}
          <button
            onClick={() => { onClose(); onFileUpload() }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-3)',
              padding: 'var(--spacing-6) var(--spacing-4)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--border-radius-lg)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-primary)',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
              e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-default)'
              e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
            }}
          >
            <Upload size={24} strokeWidth={1.5} color="var(--color-icon-default)" />
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-body)',
            }}>
              File upload
            </span>
          </button>

          {/* Cloud download — hidden when caller passes undefined (no claimable chats) */}
          {onCloudDownload && <button
            onClick={() => { onClose(); onCloudDownload() }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-3)',
              padding: 'var(--spacing-6) var(--spacing-4)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--border-radius-lg)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-primary)',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
              e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-default)'
              e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
            }}
          >
            <CloudDownload size={24} strokeWidth={1.5} color="var(--color-icon-default)" />
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-body)',
            }}>
              Sync from cloud
            </span>
          </button>}

          {/* Add from saved chats — only rendered when caller provides the handler */}
          {onAddFromSaved && (
            <button
              onClick={() => { onClose(); onAddFromSaved() }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-6) var(--spacing-4)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-lg)',
                cursor: 'pointer',
                fontFamily: 'var(--font-family-primary)',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                e.currentTarget.style.backgroundColor = 'var(--color-state-hover-bg)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)'
                e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
              }}
            >
              <LayoutList size={24} strokeWidth={1.5} color="var(--color-icon-default)" />
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-body)',
              }}>
                Add from library
              </span>
            </button>
          )}

        </div>
      </div>
    </>,
    document.documentElement
  )
}