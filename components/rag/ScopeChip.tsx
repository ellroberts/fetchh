'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseClient } from '../../lib/supabase';
import { useRagPanel } from '../../lib/rag-panel-context';

interface Project {
  id: string;
  name: string;
}

export function ScopeChip() {
  const { globalMode, projectName, openScoped, openGlobal, libraryDocIds } = useRagPanel();

  // All hooks must be declared before any conditional returns
  const [embeddingCount, setEmbeddingCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseClient();

  // On mount: count how many indexed conversations this user has
  useEffect(() => {
    const checkCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEmbeddingCount(0); return; }
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('has_embeddings', true);
      setEmbeddingCount(count ?? 0);
    };
    checkCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset local selection when context goes back to global
  useEffect(() => {
    if (globalMode) setSelectedProject(null);
  }, [globalMode]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fetchProjects = useCallback(async () => {
    if (projects.length > 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setProjects(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [projects.length]);

  // ── Conditional renders (after all hooks) ────────────────────────────────

  // Loading — render nothing to avoid a flash of the chip
  if (embeddingCount === null) return null;

  // Library mode — render a locked chip, no dropdown
  if (libraryDocIds && libraryDocIds.length > 0) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px 3px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 500,
          border: '1.5px solid #0d9488',
          backgroundColor: '#f0fdfa',
          color: '#0f766e',
          cursor: 'default',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h12v10H2zM2 6h12" strokeLinecap="round"/>
          <path d="M5 9h6M5 11.5h3" strokeLinecap="round"/>
        </svg>
        Library ({libraryDocIds.length} doc{libraryDocIds.length !== 1 ? 's' : ''})
      </div>
    );
  }

  // No indexed threads and not on a project page — hide the chip entirely
  if (embeddingCount === 0 && !projectName) return null;

  // ── Normal chip ───────────────────────────────────────────────────────────

  // On a project page the chip is locked — no dropdown
  const isLocked = !globalMode && !!projectName;

  const handleToggle = () => {
    if (isLocked) return;
    if (!open) fetchProjects();
    setOpen(prev => !prev);
  };

  const handleSelectProject = async (project: Project) => {
    setOpen(false);
    setSelectedProject(project); // update label immediately
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('project_id', project.id)
        .eq('has_embeddings', true);

      if (!convs || convs.length === 0) {
        // No indexed conversations — revert label
        setSelectedProject(null);
        openGlobal();
        return;
      }
      const ids = convs.map((c: any) => c.id);
      const titles = new Map<string, string>(convs.map((c: any) => [c.id, c.title]));
      openScoped(ids, titles);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    setOpen(false);
    setSelectedProject(null);
    openGlobal();
  };

  // Label priority: locked project page name > manually selected project > global
  const label = isLocked
    ? projectName!
    : selectedProject
      ? selectedProject.name
      : 'All threads';

  const isScoped = !globalMode || !!selectedProject;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px 3px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 500,
          border: '1.5px solid',
          cursor: isLocked ? 'default' : 'pointer',
          transition: 'all 0.15s',
          borderColor: isScoped ? '#6366f1' : '#d1d5db',
          backgroundColor: isScoped ? '#eef2ff' : '#f9fafb',
          color: isScoped ? '#4338ca' : '#6b7280',
        }}
      >
        {/* Icon */}
        {isScoped ? (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6"/>
            <path d="M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12M2 8h12" strokeLinecap="round"/>
          </svg>
        )}

        {label}

        {/* Dropdown arrow — only when not locked */}
        {!isLocked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft: '1px' }}
          >
            <path d="M1.5 3.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            minWidth: '220px',
            padding: '6px',
            overflow: 'hidden',
          }}
        >
          {/* All threads option */}
          {(() => {
            const isActive = globalMode && !selectedProject;
            return (
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive ? '#eef2ff' : 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#4338ca' : '#374151',
                  textAlign: 'left',
                }}
                className="hover:bg-muted/50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="8" cy="8" r="6"/>
                  <path d="M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12M2 8h12" strokeLinecap="round"/>
                </svg>
                All threads
                {isActive && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4338ca" strokeWidth="2" style={{ marginLeft: 'auto' }}>
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })()}

          {/* Divider */}
          {projects.length > 0 && (
            <div style={{ height: '1px', background: '#f3f4f6', margin: '4px 6px' }} />
          )}

          {/* Projects */}
          {loading ? (
            <div style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            projects.map(project => {
              const isActive = selectedProject?.id === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelectProject(project)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    background: isActive ? '#eef2ff' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#4338ca' : '#374151',
                    textAlign: 'left',
                  }}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={isActive ? '#4338ca' : 'currentColor'} strokeWidth="1.8">
                    <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {project.name}
                  </span>
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4338ca" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })
          )}

          {!loading && projects.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: '12px', color: '#9ca3af' }}>
              No projects yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
