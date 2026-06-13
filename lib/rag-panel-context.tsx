'use client'

// lib/rag-panel-context.tsx
import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

interface RagPanelState {
  isOpen: boolean
  scopedConversationIds: string[]
  conversationTitles: Map<string, string>
  globalMode: boolean
  projectName: string | null
  libraryDocIds: string[] | null
}

interface ProjectScope {
  ids: string[]
  titles: Map<string, string>
  name: string
}

interface RagPanelContextValue extends RagPanelState {
  openGlobal: () => void
  openScoped: (ids: string[], titles?: Map<string, string>, projectName?: string) => void
  openSmart: () => void
  openToSession: (sessionId: string) => void
  setProjectScope: (ids: string[], titles: Map<string, string>, name: string) => void
  clearProjectScope: () => void
  setLibraryScope: (docIds: string[]) => void
  clearLibraryScope: () => void
  close: () => void
  pendingSessionId: string | null
  clearPendingSession: () => void
}

const RagPanelContext = createContext<RagPanelContextValue | null>(null)

export function RagPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RagPanelState>({
    isOpen: false,
    scopedConversationIds: [],
    conversationTitles: new Map(),
    globalMode: true,
    projectName: null,
    libraryDocIds: null,
  })

  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)

  const projectScopeRef = useRef<ProjectScope | null>(null)

  const openGlobal = useCallback(() => {
    setState({
      isOpen: true,
      scopedConversationIds: [],
      conversationTitles: new Map(),
      globalMode: true,
      projectName: null,
      libraryDocIds: null,
    })
  }, [])

  const openToSession = useCallback((sessionId: string) => {
    setPendingSessionId(sessionId)
    openGlobal()
  }, [openGlobal])

  const openScoped = useCallback((ids: string[], titles?: Map<string, string>, projectName?: string) => {
    setState({
      isOpen: true,
      scopedConversationIds: ids,
      conversationTitles: titles ?? new Map(),
      globalMode: ids.length === 0 && !projectName,
      projectName: projectName ?? null,
      libraryDocIds: null,
    })
  }, [])

  const openSmart = useCallback(() => {
    const scope = projectScopeRef.current
    if (scope) {
      setState(prev => ({
        ...prev,
        isOpen: true,
        scopedConversationIds: scope.ids,
        conversationTitles: scope.titles,
        globalMode: false,
        projectName: scope.name,
        libraryDocIds: prev.libraryDocIds,
      }))
    } else {
      setState(prev => ({
        ...prev,
        isOpen: true,
        scopedConversationIds: [],
        conversationTitles: new Map(),
        globalMode: prev.libraryDocIds ? false : true,
        projectName: prev.libraryDocIds ? 'Library' : null,
        libraryDocIds: prev.libraryDocIds,
      }))
    }
  }, [])

  const setProjectScope = useCallback((ids: string[], titles: Map<string, string>, name: string) => {
    // Only write to ref — state is updated when panel is actually opened via openSmart
    projectScopeRef.current = { ids, titles, name }
  }, [])

  const clearProjectScope = useCallback(() => {
    projectScopeRef.current = null
    setState(prev => ({
      ...prev,
      projectName: null,
      scopedConversationIds: [],
      conversationTitles: new Map(),
      globalMode: true,
    }))
  }, [])

  const setLibraryScope = useCallback((docIds: string[]) => {
    projectScopeRef.current = null
    setState(prev => ({
      ...prev,
      libraryDocIds: docIds,
      scopedConversationIds: [],
      conversationTitles: new Map(),
      globalMode: false,
      projectName: 'Library',
    }))
  }, [])
  const clearLibraryScope = useCallback(() => {
    setState(prev => ({ ...prev, libraryDocIds: null }))
  }, [])
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Allow any component to open the panel via a custom event
  // (useful in pages that don't have direct access to useRagPanel)
  useEffect(() => {
    const handler = () => openSmart()
    window.addEventListener('open-rag-panel', handler)
    return () => window.removeEventListener('open-rag-panel', handler)
  }, [openSmart])

  return (
    <RagPanelContext.Provider value={{
      ...state,
      openGlobal,
      openScoped,
      openSmart,
      openToSession,
      setProjectScope,
      clearProjectScope,
      setLibraryScope,
      clearLibraryScope,
      close,
      pendingSessionId,
      clearPendingSession: () => setPendingSessionId(null),
    }}>
      {children}
    </RagPanelContext.Provider>
  )
}

export function useRagPanel() {
  const ctx = useContext(RagPanelContext)
  if (!ctx) throw new Error('useRagPanel must be used within RagPanelProvider')
  return ctx
}