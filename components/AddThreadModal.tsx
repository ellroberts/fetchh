'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, CloudDownload } from 'lucide-react'
import { Button } from '@/components/Button'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Checkbox } from '@/components/Checkbox'
import { createSupabaseClient } from '@/lib/supabase'
import { parseConversationFile } from '@/lib/utils/fileParser'

export interface ClaimableConversation {
  id: string
  title: string
  platform?: string
  created_at: string
  message_count?: number
}

type FileStatus = 'pending' | 'processing' | 'success' | 'error'

interface FileWithStatus {
  file: File
  status: FileStatus
  message?: string
  conversationCount?: number
}

interface AddThreadModalProps {
  onClose: () => void
  onComplete: () => void
}

function formatPlatform(platform?: string): string {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('claude') || p.includes('anthropic')) return 'Claude.ai'
  if (p.includes('chatgpt') || p.includes('openai')) return 'ChatGPT'
  if (p.includes('gemini') || p.includes('google')) return 'Gemini'
  return platform ?? 'Unknown'
}

const statusIcon: Record<FileStatus, string> = {
  pending: '⏳', processing: '⚙️', success: '✅', error: '❌',
}
const statusColor: Record<FileStatus, string> = {
  pending: 'var(--color-text-muted)',
  processing: 'var(--color-accent-blue)',
  success: 'var(--color-accent-green)',
  error: 'var(--color-status-error)',
}

export function AddThreadModal({ onClose, onComplete }: AddThreadModalProps) {
  // ── Upload state ──────────────────────────────────────────────────────────
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Cloud state ───────────────────────────────────────────────────────────
  const [claimable, setClaimable] = useState<ClaimableConversation[]>([])
  const [loadingCount, setLoadingCount] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const supabase = createSupabaseClient()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const fetchClaimable = async () => {
      setLoadingCount(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('conversations')
          .select('id, title, platform, created_at, message_count')
          .is('user_id', null)
          .not('session_id', 'is', null)
        const convs = data ?? []
        setClaimable(convs)
        setSelected(new Set(convs.map((c: ClaimableConversation) => c.id)))
      } finally {
        setLoadingCount(false)
      }
    }
    fetchClaimable()
  }, [])

  // ── File helpers ──────────────────────────────────────────────────────────
  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(f => f.name.endsWith('.json') || f.name.endsWith('.md'))
    if (!valid.length) return
    setFiles(prev => [...prev, ...valid.map(file => ({ file, status: 'pending' as FileStatus }))])
    setUploadComplete(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const updateFileStatus = (index: number, status: FileStatus, message?: string, conversationCount?: number) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status, message, conversationCount } : f))
  }

  const processFile = async (fw: FileWithStatus, index: number) => {
    try {
      updateFileStatus(index, 'processing')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('You must be logged in to upload conversations')

      const [profileResult, countResult] = await Promise.all([
        supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).single(),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      const tier = profileResult.data?.subscription_tier ?? 'free'
      const currentCount = countResult.count ?? 0
      const LIMITS: Record<string, number | null> = { free: 10, starter: 50, pro: 200, unlimited: null }
      const limit = LIMITS[tier]
      if (limit !== null && currentCount >= limit) {
        throw new Error(`You've reached the ${currentCount} conversation limit on the ${tier} plan.`)
      }

      const fileContent = await fw.file.text()
      const parsedConversations = parseConversationFile(fw.file, fileContent)
      let savedCount = 0

      for (const conv of parsedConversations) {
        const conversation = conv as typeof conv & { platform?: string; url?: string }
        let platform = 'unknown'
        if (conversation.platform) {
          const p = conversation.platform.toLowerCase()
          if (p.includes('claude')) platform = 'claude.ai'
          else if (p.includes('chatgpt') || p.includes('openai')) platform = 'chatgpt'
          else if (p.includes('gemini')) platform = 'gemini'
          else platform = conversation.platform
        } else {
          const s = (conversation.source || '').toLowerCase()
          if (s.includes('claude')) platform = 'claude.ai'
          else if (s.includes('chatgpt') || s.includes('openai')) platform = 'chatgpt'
          else if (s.includes('gemini')) platform = 'gemini'
        }
        const now = new Date().toISOString()
        const messages = conversation.messages || []
        const { data, error } = await supabase.from('conversations').insert([{
          title: conversation.title || 'Untitled Conversation',
          content: conversation.content || {},
          source: conversation.url || conversation.source || platform,
          messages,
          message_count: Array.isArray(messages) ? messages.length : 0,
          created_at: conversation.created_at || now,
          updated_at: now,
          platform,
          metadata: { original_filename: fw.file.name, import_date: now, file_size: fw.file.size },
          tags: [],
          user_id: user.id,
          session_id: null,
          project_id: null,
          summary: null,
        }]).select()
        if (error) {
        if (error.code === '23505') throw new Error('Already imported')
        throw new Error(`Database error: ${error.message}`)
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
      updateFileStatus(index, 'success', `${savedCount} conversation${savedCount !== 1 ? 's' : ''} imported`, savedCount)
    } catch (error) {
      updateFileStatus(index, 'error', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleUpload = async () => {
    setUploading(true)
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') await processFile(files[i], i)
    }
    setUploading(false)
    setUploadComplete(true)
  }

  // ── Cloud helpers ─────────────────────────────────────────────────────────
  const toggleAll = () => setSelected(
    selected.size === claimable.length ? new Set() : new Set(claimable.map(c => c.id))
  )
  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const doClaim = async (ids: string[]) => {
    setClaiming(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('conversations').update({ user_id: user.id }).in('id', ids)
      setClaimable(prev => prev.filter(c => !ids.includes(c.id)))
      setSelected(new Set())
      onComplete()
      onClose()
    } finally {
      setClaiming(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingFiles = files.filter(f => f.status === 'pending')
  const allSelected = selected.size === claimable.length && claimable.length > 0
  const noneSelected = selected.size === 0
  const indeterminate = !allSelected && !noneSelected

  // Whether to show the right cloud card at all
  const showCloudCard = loadingCount || claimable.length > 0

  const cardStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--border-radius-xl)',
    overflow: 'hidden',
    fontFamily: 'var(--font-family-primary)',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: 'calc(100% - var(--spacing-8))',
          maxWidth: 720,
          backgroundColor: 'var(--color-surface-raised)',
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid var(--color-border-default)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        <ModalHeader title="Add a new thread (TEST)" onClose={onClose} divider={false} />

        <div style={{ display: 'flex', gap: 'var(--spacing-4)', padding: 'var(--spacing-3) var(--spacing-6) var(--spacing-4)', alignItems: 'stretch', minHeight: 320 }}>

          {/* ── Left: upload drop zone ── */}
          <div
            style={{
              ...cardStyle,
              border: `1.5px dashed ${dragOver ? 'var(--color-primary-500)' : 'var(--color-primary-500)'}`,
              backgroundColor: dragOver ? 'var(--color-primary-50)' : 'var(--color-surface-raised)',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {/* Top content */}
            <div style={{
              padding: 'var(--spacing-6) var(--spacing-5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-4)',
              flex: 1,
            }}>
              <Upload size={28} color="var(--color-primary-400)" strokeWidth={1.5} />

              <div>
                <div style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-body)',
                  lineHeight: 1.2,
                  marginBottom: 'var(--spacing-2)',
                }}>
                  Include your<br />Local Files
                </div>
                <div style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}>
                  Supports Markdown (.md) and JSON (.json)
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%' }}>
                <Button variant="primary" size="lg" onClick={() => inputRef.current?.click()} disabled={uploading} style={{ width: "100%" }} icon={<Upload />} iconPosition="left">
                  Upload
                </Button>
                <Button variant="tertiary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                  Or Drag &amp; Drop
                </Button>
              </div>

              <input ref={inputRef} type="file" accept=".json,.md" multiple onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)) }} style={{ display: 'none' }} />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: 'var(--spacing-3) var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', overflowY: 'auto', maxHeight: 140 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)' }}>
                    <span style={{ flexShrink: 0 }}>{statusIcon[f.status]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--color-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'var(--font-weight-medium)' }}>{f.file.name}</div>
                      {f.message && <div style={{ color: statusColor[f.status], marginTop: 2 }}>{f.message}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload action */}
            {pendingFiles.length > 0 && (
              <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderTop: '1px solid var(--color-border-subtle)', marginTop: 'auto' }}>
                <Button variant="primary" size="lg" onClick={handleUpload} loading={uploading} style={{ width: '100%' }}>
                  Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
                </Button>
              </div>
            )}

            {uploadComplete && (
              <div style={{ padding: 'var(--spacing-3)', borderTop: '1px solid var(--color-border-subtle)', fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-green)', textAlign: 'center' }}>
                ✅ Import complete
              </div>
            )}
          </div>

          {/* ── Right: cloud — only shown when there's something to claim (or still loading) ── */}
          {showCloudCard && (
            <div
              style={{
                ...cardStyle,
                border: 'none',
                backgroundColor: 'color-mix(in srgb, var(--color-accent-teal) 12%, white)',
              }}
            >
              {!showReview ? (
                <div style={{
                  padding: 'var(--spacing-6) var(--spacing-5)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-4)',
                  flex: 1,
                }}>
                  <CloudDownload size={28} color="var(--color-accent-teal)" strokeWidth={1.5} />

                  <div>
                    <div style={{
                      fontSize: 'var(--font-size-2xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-body)',
                      lineHeight: 1.2,
                      marginBottom: 'var(--spacing-2)',
                    }}>
                      Pull from<br />the Cloud
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-body)',
                      lineHeight: 1.5,
                    }}>
                      Your Threads, saved from<br />the ThreadCub extension
                    </div>
                  </div>

                  {loadingCount ? (
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-border-default)' }}>Checking…</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%' }}>
                      <Button variant="secondary" size="lg" onClick={() => doClaim(claimable.map(c => c.id))} loading={claiming} style={{ width: "100%" }}>
                        Claim all {claimable.length}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowReview(true)}>
                        Or Review first
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Review header */}
                  <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderBottom: '1px solid color-mix(in srgb, var(--color-accent-teal) 25%, transparent)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <Checkbox checked={allSelected} indeterminate={indeterminate} onChange={toggleAll} size="sm" />
                    <span onClick={toggleAll} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer', userSelect: 'none', flex: 1 }}>
                      Select all
                    </span>
                    <button
                      onClick={() => setShowReview(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-primary)' }}
                    >
                      ← Back
                    </button>
                  </div>

                  {/* Review list */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: 'var(--spacing-2) var(--spacing-3)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                    {claimable.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => toggleOne(conv.id)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
                          padding: 'var(--spacing-2)',
                          backgroundColor: 'transparent',
                          border: '1px solid color-mix(in srgb, var(--color-accent-teal) 25%, transparent)',
                          borderRadius: 'var(--border-radius-md)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-family-primary)',
                          transition: 'border-color 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-teal)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-accent-teal) 25%, transparent)' }}
                      >
                        <Checkbox checked={selected.has(conv.id)} onChange={() => toggleOne(conv.id)} size="sm" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.title || 'Untitled thread'}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {formatPlatform(conv.platform)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Claim selected */}
                  <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderTop: '1px solid color-mix(in srgb, var(--color-accent-teal) 25%, transparent)' }}>
                    <Button variant="secondary" size="lg" onClick={() => doClaim(Array.from(selected))} loading={claiming} disabled={noneSelected} style={{ width: '100%' }}>
                      {noneSelected ? 'Select threads to claim' : `Claim ${selected.size} thread${selected.size !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ModalFooter divider={false}>
          <Button variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
          {uploadComplete && <Button variant="primary" size="sm" onClick={onComplete}>Done</Button>}
        </ModalFooter>
      </div>
    </>
  )
}