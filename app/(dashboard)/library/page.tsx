'use client'
import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '../../../lib/supabase'
import { useRagPanel } from '@/lib/rag-panel-context'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { LibraryBig } from 'lucide-react'
import { LibraryCard, type LibraryDoc } from '@/components/LibraryCard'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { Checkbox } from '@/components/Checkbox'
import { LibraryDrawer } from '@/components/LibraryDrawer'

interface LibraryDocumentFull extends LibraryDoc {
  content: string
}



const PREVIEW_WIDTH = 480

export default function LibraryPage() {
  const supabase = createSupabaseClient()
  const { setLibraryScope, clearLibraryScope, openSmart } = useRagPanel()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<LibraryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [docDrawer, setDocDrawer] = useState<LibraryDocumentFull | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const allSelected = docs.length > 0 && docs.every(d => selectedIds.has(d.id))
  const someSelected = docs.some(d => selectedIds.has(d.id))
  const selectAll = () => setSelectedIds(new Set(docs.map(d => d.id)))
  const clearAll = () => setSelectedIds(new Set())

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchDocs = async () => {
    const { data } = await supabase
      .from('library_documents')
      .select('id, title, file_name, file_type, word_count, tags, created_at')
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  const selectDoc = async (doc: LibraryDoc) => {
    if (docDrawer?.id === doc.id) return
    const { data } = await supabase
      .from('library_documents')
      .select('*')
      .eq('id', doc.id)
      .single()
    setDocDrawer(data || null)
  }
  const closeDrawer = () => setDocDrawer(null)
  const handleDownloadDoc = async (doc: LibraryDoc) => {
    const { data } = await supabase
      .from('library_documents')
      .select('content, file_name')
      .eq('id', doc.id)
      .single()
    if (!data?.content) return showNotification('Could not fetch document content')
    const blob = new Blob([data.content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = data.file_name
    a.click()
    URL.revokeObjectURL(a.href)
    showNotification('Download started')
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    await supabase.from('library_documents').delete().in('id', ids)
    clearAll()
    closeDrawer()
    await fetchDocs()
    showNotification(`${ids.length} document${ids.length !== 1 ? 's' : ''} deleted`)
  }

  const handleDeleteDoc = async (doc: LibraryDoc) => {
    await supabase.from('library_documents').delete().eq('id', doc.id)
    closeDrawer()
    await fetchDocs()
    showNotification('Document deleted')
  }

  useEffect(() => {
    fetchDocs()
    const handler = () => fetchDocs()
    window.addEventListener('library-updated', handler)
    return () => window.removeEventListener('library-updated', handler)
  }, [])

  useEffect(() => {
    const ids = selectedIds.size > 0
      ? docs.filter(d => selectedIds.has(d.id)).map(d => d.id)
      : docs.map(d => d.id)
    if (ids.length > 0) setLibraryScope(ids)
  }, [docs, selectedIds])

  useEffect(() => {
    return () => clearLibraryScope()
  }, [])

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    let saved = 0
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/documents/parse', { method: 'POST', body: formData })
      if (res.ok) saved++
      else {
        const { error } = await res.json()
        showNotification(`Failed: ${error}`)
      }
    }
    if (saved > 0) showNotification(`${saved} document${saved > 1 ? 's' : ''} added to Library`)
    await fetchDocs()
    setUploading(false)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <div className="px-8 shrink-0" style={{
        paddingTop: '32px',
        position: 'relative',
        zIndex: 1,
        boxShadow: scrolled && !docDrawer ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        transition: 'box-shadow 200ms ease',
      }}>
        <PageHeader
          title="Library"
          subtitle={docDrawer ? docDrawer.title : `${docs.length} document${docs.length !== 1 ? 's' : ''}`}
          showViewToggle={!docDrawer}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m as 'cards' | 'list')}
          onClose={docDrawer ? closeDrawer : undefined}
        />
      </div>

      {notification && (
        <div style={{
          position: 'fixed', top: 'var(--spacing-4)', right: 'var(--spacing-4)',
          backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-3) var(--spacing-4)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100,
          fontSize: 'var(--font-size-sm)', color: 'var(--color-text-body)',
        }}>{notification}</div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.docx"
        multiple
        style={{ display: 'none' }}
        onChange={async (e) => {
          const files = Array.from(e.target.files || [])
          e.target.value = ''
          await handleFiles(files)
        }}
      />

      {docDrawer ? (
        <LibraryDrawer
          doc={docDrawer}
          onClose={closeDrawer}
          onDeleted={async () => {
            closeDrawer()
            await fetchDocs()
            showNotification('Document deleted')
          }}
        />
      ) : (
      <div
        ref={scrollRef}
        onScroll={() => setScrolled((scrollRef.current?.scrollTop ?? 0) > 0)}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-4) var(--spacing-6)',
        }}
      >
        {loading ? null : docs.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <EmptyState
              size="page"
              icon={LibraryBig}
              iconColor="var(--color-bear-500)"
              title="Your library is empty."
              subtitle="Import text files, markdown, or Word documents to build your knowledge base."
              action={{ label: '+ Add document', onClick: () => fileInputRef.current?.click(), variant: 'primary' }}
            />
          </div>
        ) : (
          <>
            <Checkbox
              label="Select all"
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={(checked) => checked ? selectAll() : clearAll()}
              style={{ marginBottom: 'var(--spacing-3)' }}
            />
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc: LibraryDoc) => { const isSelected = selectedIds.has(doc.id); return <LibraryCard key={doc.id} doc={doc} viewMode="card" selectable={true} isSelected={isSelected} onSelect={() => toggleSelection(doc.id)} onOpen={selectDoc} onDownload={handleDownloadDoc} onDelete={handleDeleteDoc} /> })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {docs.map((doc: LibraryDoc) => { const isSelected = selectedIds.has(doc.id); return <LibraryCard key={doc.id} doc={doc} viewMode="list" selectable={true} isSelected={isSelected} onSelect={() => toggleSelection(doc.id)} onOpen={selectDoc} onDownload={handleDownloadDoc} onDelete={handleDeleteDoc} /> })}
              </div>
            )}
            <SelectionActionBar
              selectedCount={selectedIds.size}
              onAskCoda={() => openSmart()}
              onDownload={async () => { for (const id of selectedIds) { const doc = docs.find(d => d.id === id); if (doc) await handleDownloadDoc(doc) } }}
              onDelete={handleBulkDelete}
              onClear={clearAll}
            />
          </>
        )}
      </div>
      )}

      {!docDrawer && docs.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '40px',
          left: 'calc(var(--sidebar-width, 280px) + 48px)',
          zIndex: 40, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        }}>
          <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : '+ Add'}
          </Button>
        </div>
      )}

    </div>
  )
}