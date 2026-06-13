'use client'

import React, { useState } from 'react'
import { OverflowMenu, type OverflowMenuProps } from './OverflowMenu'
import { Trash2, FileText, MessageSquare, Sparkles, Bot, Pin, PinOff, Pencil, Download, FolderInput, FileCode, FileJson } from 'lucide-react'
import { Checkbox } from '@/components/Checkbox'

export interface Project {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at?: string
}

export interface ProjectStats {
  totalConversations: number
  totalMessages: number
  totalPins: number
  totalSources: number
  lastActivity: string
  sources: string[]
}

export interface ProjectCardProps {
  project: Project
  stats: ProjectStats
  viewMode?: 'card' | 'list'
  isSelected?: boolean
  isPinned?: boolean
  hideCheckbox?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onClick?: (project: Project) => void
  onDelete?: (project: Project) => void
  onPin?: (project: Project, pinned: boolean) => void
  onRename?: (project: Project) => void
  onDownload?: (project: Project, format: 'txt' | 'markdown' | 'json') => void
  onSwitchProject?: (project: Project) => void
  className?: string
  skeleton?: boolean
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return 'Today'
  if (diffDays === 2) return 'Yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

const cardBaseStyle: React.CSSProperties = {
  borderRadius: 'var(--border-radius-lg)',
  boxShadow: 'none',
  fontFamily: 'var(--font-family-primary)',
  transition: 'var(--transition-base)',
}

function StatDot() {
  return (
    <span style={{
      width: '3px', height: '3px', borderRadius: '50%',
      backgroundColor: 'var(--color-border-subtle)', flexShrink: 0, display: 'inline-block',
    }} />
  )
}

export function ProjectCard({
  project, stats, viewMode = 'list', isSelected = false, isPinned = false,
  hideCheckbox = false, onSelect, onClick, onDelete, onPin, onRename,
  onDownload, onSwitchProject, className, skeleton = false,
}: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  if (skeleton) {
    const shimmer: React.CSSProperties = {
      backgroundColor: 'var(--color-border-subtle)',
      borderRadius: 'var(--border-radius-sm)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }
    if (viewMode === 'list') {
      return (
        <div className={className} style={{
          ...cardBaseStyle, backgroundColor: 'var(--color-surface-raised)',
          position: 'relative', display: 'flex', alignItems: 'center',
          gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--spacing-4)',
          border: '1px solid var(--color-border-subtle)', minHeight: 84,
        }}>
          {!hideCheckbox && <div style={{ ...shimmer, width: 16, height: 16, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...shimmer, width: '45%', height: 14, marginBottom: 10 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...shimmer, width: 70, height: 12, borderRadius: 10 }} />
              <StatDot />
              <div style={{ ...shimmer, width: 80, height: 12, borderRadius: 10 }} />
              <StatDot />
              <div style={{ ...shimmer, width: 55, height: 12, borderRadius: 10 }} />
              <StatDot />
              <div style={{ ...shimmer, width: 60, height: 12, borderRadius: 10 }} />
            </div>
          </div>
          <div style={{ ...shimmer, width: 20, height: 20, flexShrink: 0 }} />
        </div>
      )
    }
    return (
      <div className={className} style={{
        ...cardBaseStyle, border: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-surface-raised)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...shimmer, width: '55%', height: 15, marginBottom: 8 }} />
            <div style={{ ...shimmer, width: '30%', height: 13 }} />
          </div>
          <div style={{ ...shimmer, width: 20, height: 20 }} />
        </div>
        <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px' }}>
          <div style={{ ...shimmer, width: 16, height: 16, borderRadius: 4 }} />
          <div style={{ ...shimmer, width: 24, height: 13 }} />
          <StatDot />
          <div style={{ ...shimmer, width: 16, height: 16, borderRadius: 4 }} />
          <div style={{ ...shimmer, width: 24, height: 13 }} />
          <StatDot />
          <div style={{ ...shimmer, width: 16, height: 16, borderRadius: 4 }} />
          <div style={{ ...shimmer, width: 20, height: 13 }} />
        </div>
      </div>
    )
  }

  const overflowItems = [
    onPin && {
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
      onClick: () => onPin(project, !isPinned),
    },
    onRename && { label: 'Rename', icon: <Pencil size={14} />, onClick: () => onRename(project) },
    onSwitchProject && { label: 'Switch project', icon: <FolderInput size={14} />, onClick: () => onSwitchProject(project) },
    onDownload && {
      label: 'Download As…', icon: <Download size={14} />, chevron: true,
      submenu: [
        { label: 'Plain Text', icon: <FileText size={14} />, onClick: () => onDownload(project, 'txt') },
        { label: 'Markdown', icon: <FileCode size={14} />, onClick: () => onDownload(project, 'markdown') },
        { label: 'JSON', icon: <FileJson size={14} />, onClick: () => onDownload(project, 'json') },
      ],
    },
    onDelete && { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => onDelete(project), danger: true },
  ].filter(Boolean) as OverflowMenuProps['items']

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={className}
        style={{
          ...cardBaseStyle,
          position: 'relative', display: 'flex', alignItems: 'center',
          gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--spacing-4)',
          border: '1px solid var(--color-border-default)',
          backgroundColor: 'var(--color-surface-raised)',
          outline: isSelected ? '2px solid var(--color-primary-500)' : undefined,
          outlineOffset: isSelected ? '0px' : undefined,
          minHeight: 84,
        }}
        onMouseEnter={(e) => {
          setIsHovered(true)
          e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
          e.currentTarget.style.border = '1px solid var(--color-border-inverse)'
        }}
        onMouseLeave={(e) => {
          setIsHovered(false)
          e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
          e.currentTarget.style.border = '1px solid var(--color-border-default)'
        }}
      >
        {!hideCheckbox && (
          <div onClick={(e) => { e.stopPropagation(); onSelect?.(e) }} style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <Checkbox checked={isSelected} onChange={() => onSelect?.({ stopPropagation: () => {} } as React.MouseEvent)} size="sm" />
          </div>
        )}

        <div onClick={() => onClick?.(project)} style={{ flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
          <span style={{
            fontWeight: 600, fontSize: '14px', color: 'var(--color-text-title)',
            fontFamily: 'var(--font-family-primary)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', marginBottom: '6px',
          }}>
            {project.name}
            {isPinned && <Pin size={12} style={{ color: 'var(--color-primary-500)', marginLeft: 6, flexShrink: 0, display: 'inline', verticalAlign: 'middle' }} />}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)' }}>
              <FileText size={13} style={{ color: 'var(--color-accent-teal)' }} />{stats.totalConversations} threads
            </span>
            <StatDot />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)' }}>
              <MessageSquare size={13} style={{ color: 'var(--color-accent-blue)' }} />{stats.totalMessages} messages
            </span>
            <StatDot />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)' }}>
              <Sparkles size={13} style={{ color: 'var(--color-accent-amber)' }} />{stats.totalPins} pins
            </span>
            <StatDot />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)' }}>
              <Bot size={13} style={{ color: 'var(--color-accent-blue)' }} />{stats.totalSources} {stats.totalSources === 1 ? 'source' : 'sources'}
            </span>
          </div>
        </div>

        {overflowItems.length > 0 && (
          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            <OverflowMenu items={overflowItems} />
          </div>
        )}
      </div>
    )
  }

  // ── Card view ──────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        ...cardBaseStyle, position: 'relative', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--color-border-default)',
        backgroundColor: 'var(--color-surface-raised)',
        outline: isSelected ? '2px solid var(--color-primary-500)' : undefined,
        outlineOffset: isSelected ? '0px' : undefined,
      }}
      onMouseEnter={(e) => {
        setIsHovered(true)
        e.currentTarget.style.border = '1px solid var(--color-border-inverse)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        e.currentTarget.style.border = '1px solid var(--color-border-default)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
        {!hideCheckbox && (
          <div onClick={(e) => { e.stopPropagation(); onSelect?.(e) }} style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <Checkbox checked={isSelected} onChange={() => onSelect?.({ stopPropagation: () => {} } as React.MouseEvent)} size="sm" />
          </div>
        )}
        <div onClick={() => onClick?.(project)} style={{ flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
          <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-title)', fontFamily: 'var(--font-family-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
            {isPinned && <Pin size={12} style={{ color: 'var(--color-primary-500)', marginLeft: 6, verticalAlign: 'middle' }} />}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)', margin: '3px 0 0' }}>
            {formatDate(project.created_at)}
          </p>
        </div>
        {overflowItems.length > 0 && (
          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            <OverflowMenu items={overflowItems} />
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border-default)' }} />

      <div onClick={() => onClick?.(project)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', cursor: onClick ? 'pointer' : 'default' }}>
        <FileText size={14} style={{ color: 'var(--color-accent-teal)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-title)', fontFamily: 'var(--font-family-primary)' }}>{stats.totalConversations}</span>
        <StatDot />
        <MessageSquare size={14} style={{ color: 'var(--color-accent-blue)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-title)', fontFamily: 'var(--font-family-primary)' }}>{stats.totalMessages}</span>
        <StatDot />
        <Sparkles size={14} style={{ color: 'var(--color-accent-amber)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-title)', fontFamily: 'var(--font-family-primary)' }}>{stats.totalPins}</span>
        <StatDot />
        <Bot size={14} style={{ color: 'var(--color-accent-blue)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-title)', fontFamily: 'var(--font-family-primary)' }}>{stats.totalSources}</span>
      </div>
    </div>
  )
}

export default ProjectCard