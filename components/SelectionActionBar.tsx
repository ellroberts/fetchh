'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, FolderPlus, Download, Trash2, X, FileText, FileCode, FileJson } from 'lucide-react'
import { Tooltip } from '@/components/Tooltip'
import type { ExportFormat } from '@/lib/export-utils'

interface SelectionActionBarProps {
  selectedCount: number
  onAskCoda: () => void
  onAddToProject?: () => void
  onMoveToProject?: () => void
  onDownload?: (format: ExportFormat) => void
  onDelete?: () => void
  onClear: () => void
}

export function SelectionActionBar({
  selectedCount,
  onAskCoda,
  onAddToProject,
  onMoveToProject,
  onDownload,
  onDelete,
  onClear,
}: SelectionActionBarProps) {
  const [visible, setVisible] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDownloadMenu = () => {
    if (downloadCloseTimer.current) { clearTimeout(downloadCloseTimer.current); downloadCloseTimer.current = null }
    setShowDownloadMenu(true)
  }
  const startCloseDownloadMenu = () => {
    downloadCloseTimer.current = setTimeout(() => setShowDownloadMenu(false), 150)
  }

  useEffect(() => {
    setVisible(selectedCount > 0)
  }, [selectedCount])

  if (selectedCount === 0 && !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        height: '56px',
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        fontFamily: 'var(--font-family-primary)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 180ms ease, transform 180ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Selected count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        paddingInline: 'var(--spacing-5)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-title)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {selectedCount} selected
      </div>

      {/* Divider */}
      <div style={{
        width: '1px',
        alignSelf: 'stretch',
        backgroundColor: 'var(--color-border-subtle)',
        flexShrink: 0,
      }} />

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        paddingInline: 'var(--spacing-2)',
        gap: '2px',
      }}>
        <Tooltip label="Ask Coda" position="top">
          <IconButton icon={<MessageSquare size={18} />} onClick={onAskCoda}       color="var(--color-primary-500)" hoverBg="var(--color-state-hover-bg)" />
        </Tooltip>

        {onAddToProject && (
          <Tooltip label="Add to Project" position="top">
            <IconButton icon={<FolderPlus size={18} />} onClick={onAddToProject}  color="var(--color-icon-default)"    hoverBg="var(--color-state-hover-bg)" />
          </Tooltip>
        )}

        {onMoveToProject && (
          <Tooltip label="Move to Project" position="top">
            <IconButton icon={<FolderPlus size={18} />} onClick={onMoveToProject} color="var(--color-icon-default)"    hoverBg="var(--color-state-hover-bg)" />
          </Tooltip>
        )}

        {onDownload && (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={openDownloadMenu}
            onMouseLeave={startCloseDownloadMenu}
          >
            {showDownloadMenu && (
              <div
                onMouseEnter={openDownloadMenu}
                onMouseLeave={startCloseDownloadMenu}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  display: 'flex',
                  gap: '2px',
                  padding: '6px',
                  zIndex: 200,
                }}
              >
                <Tooltip label="Plain Text" position="top">
                  <IconButton icon={<FileText size={18} />} onClick={() => { onDownload('txt'); setShowDownloadMenu(false) }} color="var(--color-icon-default)" hoverBg="var(--color-state-hover-bg)" />
                </Tooltip>
                <Tooltip label="Markdown" position="top">
                  <IconButton icon={<FileCode size={18} />} onClick={() => { onDownload('markdown'); setShowDownloadMenu(false) }} color="var(--color-icon-default)" hoverBg="var(--color-state-hover-bg)" />
                </Tooltip>
                <Tooltip label="JSON" position="top">
                  <IconButton icon={<FileJson size={18} />} onClick={() => { onDownload('json'); setShowDownloadMenu(false) }} color="var(--color-icon-default)" hoverBg="var(--color-state-hover-bg)" />
                </Tooltip>
              </div>
            )}
            <Tooltip label="Download" position="top" disabled={showDownloadMenu}>
              <IconButton
                icon={<Download size={18} />}
                onClick={() => {}}
                color="var(--color-icon-default)"
                hoverBg="var(--color-state-hover-bg)"
                active={showDownloadMenu}
              />
            </Tooltip>
          </div>
        )}

        {onDelete && (
          <Tooltip label="Delete" position="top">
            <IconButton icon={<Trash2 size={18} />}     onClick={onDelete}        color="var(--color-status-error)"  hoverBg="var(--color-status-error-bg)" />
          </Tooltip>
        )}

        <Tooltip label="Clear selection" position="top">
          <IconButton icon={<X size={18} />}            onClick={onClear}         color="var(--color-icon-default)"   hoverBg="var(--color-state-hover-bg)" />
        </Tooltip>
      </div>
    </div>
  )
}

function IconButton({
  icon,
  onClick,
  color,
  hoverBg,
  active,
}: {
  icon: React.ReactNode
  onClick: () => void
  color: string
  hoverBg: string
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--spacing-11)',
        height: 'var(--spacing-11)',
        borderRadius: 'var(--border-radius-lg)',
        border: 'none',
        backgroundColor: active ? 'var(--color-state-hover-bg)' : 'transparent',
        color,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = active ? 'var(--color-state-hover-bg)' : 'transparent' }}
    >
      {icon}
    </button>
  )
}

export default SelectionActionBar
