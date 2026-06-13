'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SideNav } from './SideNav'
import { RAGChatPanel } from '../rag/RAGChatPanel'
import { useRagPanel } from '../../lib/rag-panel-context'
import type { SubscriptionTier } from '../../lib/tier-limits'
import { RAGFloatingButton } from '../rag/RAGFloatingButton'
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

const RAG_COMPACT_WIDTH = 400

export const AppLayout: React.FC<AppLayoutProps> = ({
  children, navItems, user, userId, appName = 'ThreadCub',
  defaultSidebarCollapsed = false, onSidebarCollapseChange,
  onUserClick, onSignOut, onSettingsClick, className = '', subscriptionTier = 'free',
  conversationCount,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed)
  const [ragExpanded, setRagExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const dragCounter = React.useRef(0)

  const { isOpen: ragOpen, openSmart, close } = useRagPanel()
  const pathname = usePathname()

  useEffect(() => { setRagExpanded(false) }, [pathname])
  useEffect(() => { if (!ragOpen) setRagExpanded(false) }, [ragOpen])
  useEffect(() => {
    const handler = () => openSmart()
    window.addEventListener('open-rag-panel', handler)
    return () => window.removeEventListener('open-rag-panel', handler)
  }, [openSmart])

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

    const isLibrary = pathname === '/library'
    const docExts = ['.txt', '.md', '.docx']
    const docFiles = files.filter(f => docExts.some(ext => f.name.endsWith(ext)))

    if (isLibrary && docFiles.length > 0) {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showToast('error', 'Not logged in.'); return }
      let saved = 0
      for (const file of docFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/documents/parse', { method: 'POST', body: formData })
        if (res.ok) saved++
        else {
          const { error } = await res.json()
          showToast('error', `Failed: ${error}`)
        }
      }
      if (saved > 0) {
        showToast('success', `${saved} document${saved > 1 ? 's' : ''} added to Library`)
        window.dispatchEvent(new CustomEvent('library-updated'))
      }
      return
    }

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
        if (data?.[0]?.id) {
          fetch('/api/embeddings/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: data[0].id }),
          }).catch(() => {})
        }
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

  const [hideRagButton, setHideRagButton] = useState(false)

  useEffect(() => {
    const showHandler = () => setHideRagButton(false)
    const hideHandler = () => setHideRagButton(true)
    window.addEventListener('rag-button-show', showHandler)
    window.addEventListener('rag-button-hide', hideHandler)
    return () => {
      window.removeEventListener('rag-button-show', showHandler)
      window.removeEventListener('rag-button-hide', hideHandler)
    }
  }, [])

  // ── Panel style — uses `right` instead of `transform: translateX()` so that
  //    no stacking context is created. The CSS Highlight API cannot paint through
  //    a transform stacking context, which was killing the RAG panel highlights. ──
  const panelStyle: React.CSSProperties = ragExpanded
    ? {
        position: 'fixed',
        left: `${sidebarWidth + 16}px`,
        right: 8,
        top: 8,
        height: 'calc(100vh - 16px)',
        width: 'auto',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        transition: 'left 0.2s ease-in-out',
        zIndex: 20,
      }
    : {
        position: 'fixed',
        top: 8,
        height: 'calc(100vh - 16px)',
        width: `${RAG_COMPACT_WIDTH}px`,
        backgroundColor: 'transparent',
        borderRadius: '4px',
        right: ragOpen ? 8 : -(RAG_COMPACT_WIDTH + 8),
        transition: 'right 0.2s ease-in-out, width 0.2s ease-in-out',
        zIndex: 20,
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
          marginRight: ragOpen && !ragExpanded ? `${RAG_COMPACT_WIDTH + 8}px` : '0',
          transition: 'margin-left 0.2s, margin-right 0.2s',
          position: 'relative',
          cursor: dragOver ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%236C74FB' stroke='white' stroke-width='1'%3E%3Cellipse cx='11' cy='11' rx='2.5' ry='3.5'/%3E%3Cellipse cx='6' cy='9.5' rx='1.8' ry='2.5'/%3E%3Cellipse cx='16' cy='9.5' rx='1.8' ry='2.5'/%3E%3Cellipse cx='3.5' cy='13.5' rx='1.5' ry='2'/%3E%3Cellipse cx='18.5' cy='13.5' rx='1.5' ry='2'/%3E%3Cpath d='M11 13.5c-4 0-6.5 2-6.5 4.5 0 2 2 3 6.5 3s6.5-1 6.5-3c0-2.5-2.5-4.5-6.5-4.5z'/%3E%3C/svg%3E") 16 16, copy` : 'auto',
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

      {!ragOpen && !hideRagButton && conversationCount !== undefined && conversationCount > 0 && (
        <RAGFloatingButton
          onClick={openSmart}
          hasReadyConversations={true}
        />
      )}

      <div style={panelStyle}>
        <RAGChatPanel
          isOpen={ragOpen}
          onClose={close}
          isExpanded={ragExpanded}
          onExpandToggle={() => setRagExpanded(prev => !prev)}
        />
      </div>
    </div>
  )
}

export default AppLayout