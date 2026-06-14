'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SideNav } from './SideNav'
import type { SubscriptionTier } from '../../lib/tier-limits'
import { Alert } from '../Alert'
import { createSupabaseClient } from '../../lib/supabase'

interface SideNavItem {
  id: string
  label: string
  icon: string
  active?: boolean
  badge?: number
  onClick?: () => void
}

export interface AppLayoutProps {
  children: React.ReactNode
  navItems: SideNavItem[]
  user?: {
    name: string
    email: string
    avatar?: string
  }
  userId?: string
  appName?: string
  defaultSidebarCollapsed?: boolean
  onSidebarCollapseChange?: (collapsed: boolean) => void
  onUserClick?: () => void
  onSignOut?: () => void
  onSettingsClick?: () => void
  className?: string
  subscriptionTier?: SubscriptionTier
  conversationCount?: number
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children, navItems, user, userId, appName = 'ThreadCub',
  defaultSidebarCollapsed = false, onSidebarCollapseChange,
  onUserClick, onSignOut, onSettingsClick, className = '', subscriptionTier = 'free',
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed)
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const dragCounter = React.useRef(0)
  const pathname = usePathname()

  const sidebarWidth = sidebarCollapsed ? 64 : 280
  const cssVars = { '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties

  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    onSidebarCollapseChange?.(collapsed)
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const invalidFiles = files.filter(f => !f.name.endsWith('.json') && !f.name.endsWith('.md'))
    if (invalidFiles.length > 0) {
      showToast('error', `Unsupported file type: ${invalidFiles.map(f => f.name).join(', ')}`)
      return
    }
    try {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showToast('error', 'Not logged in.'); return }

      let conversations: any[] = []
      for (const file of files) {
        const text = await file.text()
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          const convs: any[] = Array.isArray(parsed) ? parsed : [parsed]
          convs.forEach(cv => cv._filename = file.name)
          conversations.push(...convs)
        } else {
          conversations.push({ title: file.name.replace('.md', ''), content: {}, messages: [], platform: 'import', _filename: file.name })
        }
      }

      let savedCount = 0
      let dupCount = 0
      for (const conv of conversations) {
        const platformRaw = (conv.platform || conv.source || '').toLowerCase()
        let platform = 'unknown'
        if (platformRaw.includes('claude')) platform = 'claude.ai'
        else if (platformRaw.includes('chatgpt') || platformRaw.includes('openai')) platform = 'chatgpt'
        else if (platformRaw.includes('gemini')) platform = 'gemini'
        else if (conv.platform) platform = conv.platform

        const now = new Date().toISOString()
        const messages = conv.messages || []
        const conversationData: any = {
          title: conv.title || 'Untitled Conversation',
          content: conv.content || {},
          source: conv.url || conv.source || platform,
          messages: messages,
          message_count: Array.isArray(messages) ? messages.length : 0,
          created_at: conv.created_at || now,
          updated_at: now,
          platform: platform,
          metadata: { original_filename: conv._filename || 'unknown', import_date: now },
          tags: [],
          user_id: user.id,
          session_id: null,
          project_id: null,
          summary: null,
        }
        const { data, error } = await supabase.from('conversations').insert([conversationData]).select()
        if (error) {
          if (error.code === '23505') { dupCount++; continue }
          showToast('error', 'Import failed: ' + error.message)
          return
        }
        savedCount++
      }

      window.dispatchEvent(new CustomEvent('threads-updated'))
      if (savedCount > 0 && dupCount === 0) showToast('success', `${savedCount} thread${savedCount > 1 ? 's' : ''} imported successfully.`)
      else if (savedCount > 0 && dupCount > 0) showToast('success', `${savedCount} imported, ${dupCount} already existed.`)
      else if (dupCount > 0) showToast('error', 'Already imported.')
      else showToast('error', 'Nothing was imported.')
    } catch (err) {
      showToast('error', 'Could not read file. Is it valid JSON or Markdown?')
    }
  }

  return (
    <div className={className} style={{ display: 'flex', height: '100vh', ...cssVars, backgroundColor: 'var(--color-page-bg)', padding: '8px', gap: '8px', boxSizing: 'border-box' }}>

      <div style={{
        position: 'fixed',
        left: 8,
        top: 8,
        height: 'calc(100vh - 16px)',
        width: `${sidebarWidth}px`,
        backgroundColor: 'var(--color-surface-raised)',
        borderRadius: '4px',
        zIndex: 30,
        transition: 'width 0.2s',
        overflow: 'visible',
      }}>
        <SideNav
          items={navItems} user={user} userId={userId} appName={appName}
          defaultCollapsed={sidebarCollapsed}
          onCollapseChange={handleSidebarToggle}
          onUserClick={onUserClick}
          onSignOut={onSignOut}
          onSettingsClick={onSettingsClick}
          subscriptionTier={subscriptionTier}
        />
      </div>

      <main
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface-raised)',
          borderRadius: '4px',
          marginLeft: `${sidebarWidth + 8}px`,
          transition: 'margin-left 0.2s',
          position: 'relative',
          cursor: dragOver ? 'copy' : 'auto',
        }}>

        {dragOver && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.4)',
            border: '3px dashed rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ maxWidth: 380 }}>
              <Alert type="info" size="lg" dismissible={false} shadow="lg" center>
                Drop your file to import it into ThreadCub
              </Alert>
            </div>
          </div>
        )}

        {toast && (
          <div style={{
            position: 'absolute',
            top: 'var(--spacing-4)',
            right: 'var(--spacing-4)',
            zIndex: 60,
            minWidth: 300,
            maxWidth: 420,
            animation: 'fadeInDown 0.2s ease-out',
          }}>
            <Alert type={toast.type} size="md" shadow="md" onClose={() => setToast(null)}>
              {toast.message}
            </Alert>
          </div>
        )}

        <div data-scroll-container style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppLayout
