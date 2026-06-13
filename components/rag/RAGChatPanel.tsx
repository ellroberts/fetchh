'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  PanelRightClose,
  PanelLeftClose,
  Clock,
  X,
  SquarePen,
  Search,
  Lightbulb,
  Link2,
  FileText,
  TrendingUp,
  BookOpen,
  CornerDownLeft,
  PawPrint,
  Trash2,
} from 'lucide-react';
import { Alert } from '../Alert';
import { createSupabaseClient } from '../../lib/supabase';
import { useRagPanel } from '../../lib/rag-panel-context';
import { RagChatMessage } from '../../lib/rag-types';
import { ScopeChip } from './ScopeChip';
import { MenuItem } from '../MenuItem';
import { IconButton } from '../IconButton';
import { UserBubble } from './UserBubble';
import { CodaBubble } from './CodaBubble';
import { RagInput } from './RagInput';

// TEMPORARILY DISABLED — highlight/save feature commented out pending fix
// import { createPortal } from 'react-dom';
// import { forwardRef, useImperativeHandle } from 'react';
// import { Highlighter, ListTodo, Bell } from 'lucide-react';
// import { SaveHighlightModal } from '../SaveHighlightModal';
// import { AddActionModal } from '../AddActionModal';
// import { AddReminderModal } from '../AddReminderModal';

interface RAGChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isExpanded: boolean;
  onExpandToggle: () => void;
}

interface RagSession {
  id: string;
  title: string;
  global_mode: boolean;
  conversation_ids: string[];
  conversation_titles: string[];
  messages: RagChatMessage[];
  created_at: string;
  project_name?: string | null;
  project_id?: string | null;
}

function formatAddedAlert(added: { actions: number; reminders: number }): string {
  const { actions, reminders } = added;
  const total = actions + reminders;
  if (total === 0) return '';
  if (actions > 0 && reminders > 0) {
    const aStr = actions === 1 ? '1 action' : `${actions} actions`;
    const rStr = reminders === 1 ? '1 reminder' : `${reminders} reminders`;
    return `I've added ${total} items — ${aStr} and ${rStr} to your tabs.`;
  }
  if (actions > 0) {
    return actions === 1
      ? "I've added 1 action item to your Actions tab."
      : `I've added ${actions} action items to your Actions tab.`;
  }
  return reminders === 1
    ? "I've added 1 reminder to your Reminders tab."
    : `I've added ${reminders} reminders to your Reminders tab.`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

// TEMPORARILY DISABLED — CSS Highlight API + selection menu
// The highlight persists correctly but is cleared when the save modal opens.
// Root cause not yet resolved. Re-enable once fixed.
//
// const RAG_HL_KEY = 'threadcub-rag-hl'
// let ragStyleInjected = false
// function injectRagHighlightStyle() { ... }
// function applyRagHighlight(selection: Selection) { ... }
// function clearRagHighlight() { ... }
// const SelectionMenuPortal = forwardRef<...>(...)

// ── Misc helpers ──────────────────────────────────────────────────────────────

interface StarterPrompt {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  text: string;
}

const BEAR_LOADING_MESSAGES = [
  'Sniffing through your threads…',
  'Picking up a scent…',
  'On the trail…',
  'Digging through your conversations…',
  'Found something worth exploring…',
  'Piecing it together…',
];

function BearLoadingIndicator() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMessageIndex(prev => (prev + 1) % BEAR_LOADING_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px' }}>
        <PawPrint className="w-4 h-4 flex-shrink-0" style={{ color: '#A26635' }} />
        <span
          className="transition-opacity duration-300"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', opacity: visible ? 1 : 0 }}
        >
          {BEAR_LOADING_MESSAGES[messageIndex]}
        </span>
      </div>
    </div>
  );
}

function getStarterPrompts(isInProject: boolean, globalMode: boolean, projectName?: string | null): StarterPrompt[] {
  if (isInProject && projectName) {
    return [
      { Icon: Search,    text: 'What are the main themes across these threads?' },
      { Icon: Lightbulb, text: 'What key insights stand out across these conversations?' },
      { Icon: Link2,     text: 'What patterns or connections can you find?' },
      { Icon: FileText,  text: "Summarise what's been discussed across these threads" },
    ];
  }
  if (!globalMode) {
    return [
      { Icon: Search,    text: 'What are the main themes across these conversations?' },
      { Icon: Lightbulb, text: 'What key insights stand out?' },
      { Icon: Link2,     text: 'What patterns or connections can you find?' },
      { Icon: FileText,  text: 'Give me a summary of these conversations' },
    ];
  }
  return [
    { Icon: TrendingUp, text: 'What topics have I discussed most?' },
    { Icon: Lightbulb,  text: 'What are my most recurring questions or problems?' },
    { Icon: Search,     text: 'Find conversations about a specific topic' },
    { Icon: BookOpen,   text: 'Summarise my recent conversations' },
  ];
}

// ── Per-message assistant row ─────────────────────────────────────────────────

interface RagAssistantMessageProps {
  msg: RagChatMessage;
  index: number;
  expandedSources: Set<number>;
  onToggleExpand: (index: number) => void;
  messages: RagChatMessage[];
}

const RagAssistantMessage = React.memo(function RagAssistantMessage({
  msg, index, expandedSources, onToggleExpand, messages,
}: RagAssistantMessageProps) {
  const handleToggle = useCallback(() => onToggleExpand(index), [onToggleExpand, index]);
  const handlePin = useCallback(() => {
    const ragQuery = index > 0 ? messages[index - 1].content : '';
    const sourceIds = msg.sources?.map(s => s.conversation_id).filter(Boolean) ?? [];
    window.dispatchEvent(new CustomEvent('threadcub:pin-insight', {
      detail: { content: msg.content, ragQuery, sourceIds },
    }));
  }, [index, messages, msg]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
      {msg.caveat && (
        <Alert type="warning" size="md" dismissible={false}>{msg.caveat}</Alert>
      )}
      <div style={{ position: 'relative' }}>
        <CodaBubble
          content={msg.content}
          timestamp={msg.timestamp}
          sources={msg.sources}
          msgIndex={index}
          isExpanded={expandedSources.has(index)}
          onToggleExpand={handleToggle}
          onPin={handlePin}
        />
      </div>
      {((msg.action_item_added?.actions ?? 0) + (msg.action_item_added?.reminders ?? 0)) > 0 && (
        <Alert type="info" size="sm" dismissible={false}>
          {formatAddedAlert(msg.action_item_added!)}
        </Alert>
      )}
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

export function RAGChatPanel({ isOpen, onClose, isExpanded, onExpandToggle }: RAGChatPanelProps) {
  const { scopedConversationIds, conversationTitles, globalMode, projectName, libraryDocIds, pendingSessionId, clearPendingSession } = useRagPanel();

  const [messages, setMessages] = useState<RagChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [resolvedCount, setResolvedCount] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<RagSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isAwaitingName, setIsAwaitingName] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const supabase = createSupabaseClient();

  const pathname = usePathname();
  const isInProject = pathname?.includes('/projects/') ?? false;
  const projectId = isInProject ? (pathname?.split('/projects/')[1]?.split('/')[0] ?? null) : null;

  const conversationTitle = messages.find(m => m.role === 'user')?.content.slice(0, 50) ?? null;
  const hasMessages = messages.length > 0;

  const toggleSourceExpanded = useCallback((index: number) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
      return newSet;
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    if (inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setExpandedSources(new Set());
      setShowHistory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setMessages([]);
    setSessionId(null);
    setResolvedCount(null);
    setError(null);
  }, [globalMode, scopedConversationIds.join(',')]);

  useEffect(() => {
    if (!isOpen) return;
    const checkDisplayName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      if (!profile?.display_name) {
        setMessages([{
          role: 'assistant',
          content: "Hey! I'm Coda. Nice to meet you. Before we dive into a chat, what should I call you?",
          timestamp: new Date().toISOString(),
        }]);
        setIsAwaitingName(true);
      }
    };
    checkDisplayName();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const canSend = globalMode ? !isLoading : !isLoading && scopedConversationIds.length > 0;

  const saveSession = async (updatedMessages: RagChatMessage[], currentSessionId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const title = updatedMessages.find(m => m.role === 'user')?.content.slice(0, 60) ?? 'Untitled session';
      const titles = globalMode ? [] : scopedConversationIds.map(id => conversationTitles.get(id) || 'Untitled');
      if (currentSessionId) {
        await supabase.from('rag_sessions').update({ messages: updatedMessages, updated_at: new Date().toISOString() }).eq('id', currentSessionId);
        return currentSessionId;
      } else {
        const basePayload = {
          user_id: user.id, title, global_mode: globalMode,
          conversation_ids: globalMode ? [] : scopedConversationIds,
          conversation_titles: titles, messages: updatedMessages,
        };
        let result = await supabase.from('rag_sessions').insert({
          ...basePayload,
          project_name: globalMode ? null : (projectName ?? null),
          project_id: globalMode ? null : (projectId ?? null),
        }).select('id').single();
        if (result.error) {
          result = await supabase.from('rag_sessions').insert(basePayload).select('id').single();
        }
        return result.data?.id ?? null;
      }
    } catch (err) {
      console.error('Failed to save RAG session:', err);
      return null;
    }
  };

  const [activeProjectIds, setActiveProjectIds] = useState<Set<string>>(new Set());

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const [{ data: sessions, error }, { data: projects }] = await Promise.all([
        supabase.from('rag_sessions').select('*').order('updated_at', { ascending: false }).limit(20),
        supabase.from('projects').select('id'),
      ]);
      if (!error && sessions) setPastSessions(sessions);
      if (projects) setActiveProjectIds(new Set(projects.map((p: { id: string }) => p.id)));
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPastSessions(prev => prev.filter(s => s.id !== id));
    await supabase.from('rag_sessions').delete().eq('id', id);
  };

  const handleLoadSession = (session: RagSession) => {
    setMessages(session.messages);
    setSessionId(session.id);
    setShowHistory(false);
    setError(null);
    setExpandedSources(new Set());
  };

  useEffect(() => {
    if (!pendingSessionId) return;
    const loadPending = async () => {
      const { data } = await supabase.from('rag_sessions').select('*').eq('id', pendingSessionId).single();
      if (data) handleLoadSession(data as RagSession);
      clearPendingSession();
    };
    loadPending();
  }, [pendingSessionId]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => prev.slice(0, -1));
  };

  const handleSend = async (overrideValue?: string) => {
    const question = (overrideValue ?? inputValue).trim();
    if (!question || (!canSend && !isAwaitingName)) return;

    if (isAwaitingName) {
      const name = question.trim();
      if (!name) return;
      setInputValue('');
      const userMsg: RagChatMessage = { role: 'user', content: name, timestamp: new Date().toISOString() };
      const replyMsg: RagChatMessage = {
        role: 'assistant',
        content: `Nice to meet you, ${name}! What would you like to explore today?`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg, replyMsg]);
      setIsAwaitingName(false);
      window.dispatchEvent(new CustomEvent('threadcub:rag-queried'));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) supabase.from('user_profiles').update({ display_name: name }).eq('id', user.id).then(() => {});
      return;
    }

    window.dispatchEvent(new CustomEvent('threadcub:rag-queried'));
    setInputValue('');
    setError(null);
    setIsExiting(true);

    const userMessage: RagChatMessage = { role: 'user', content: question, timestamp: new Date().toISOString() };
    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/multi-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_ids: libraryDocIds ? [] : (globalMode ? [] : scopedConversationIds),
          library_doc_ids: libraryDocIds ?? undefined,
          question, session_id: sessionId,
          project_name: globalMode ? null : (projectName ?? null),
          project_id: globalMode ? null : (projectId ?? null),
        }),
        signal: abortControllerRef.current?.signal,
      });
      const data = await response.json();
      if (cancelledRef.current) return;
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to analyze');

      const addedCounts = (data.action_item_added && typeof data.action_item_added === 'object')
        ? data.action_item_added as { actions: number; reminders: number }
        : { actions: 0, reminders: 0 };
      const assistantMessage: RagChatMessage = {
        role: 'assistant', content: data.answer, timestamp: new Date().toISOString(),
        sources: data.sources, caveat: data.caveat ?? null, action_item_added: addedCounts,
      };

      const updatedMessages = [...messagesWithUser, assistantMessage];
      setMessages(updatedMessages);

      if (addedCounts.actions > 0 && projectId) window.dispatchEvent(new CustomEvent('threadcub:action-item-added', { detail: { projectId } }));
      if (addedCounts.reminders > 0 && projectId) window.dispatchEvent(new CustomEvent('threadcub:reminder-item-added', { detail: { projectId } }));

      const savedId = await saveSession(updatedMessages, sessionId);
      if (savedId && !sessionId) setSessionId(savedId);
      else if (!savedId && data.session_id && !sessionId) setSessionId(data.session_id);
      if (data.credits_remaining !== undefined) setCreditsRemaining(data.credits_remaining);
      if (data.conversation_count !== undefined) setResolvedCount(data.conversation_count);
    } catch (err: any) {
      if (err.name === 'AbortError' || cancelledRef.current) return;
      setError(err.message);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      abortControllerRef.current = null;
      cancelledRef.current = false;
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setExpandedSources(new Set());
    setCreditsRemaining(null);
    setResolvedCount(null);
    setIsExiting(false);
  };

  const starterPrompts = getStarterPrompts(isInProject, globalMode, projectName);

  // ── History view ──────────────────────────────────────────────────────────
  if (showHistory) {
    return (
      <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: '4px' }}>
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--color-border-default)', padding: '16px' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(false)} style={{ color: 'var(--color-text-muted)', padding: '4px', borderRadius: 'var(--border-radius-base)', border: 'none', background: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', margin: 0 }}>Chat History</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loadingHistory ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '32px', color: 'var(--color-text-muted)', opacity: 0.7 }}>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--color-primary-500)', marginRight: '8px' }} />
              <span className="text-sm">Loading...</span>
            </div>
          ) : pastSessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '32px', fontSize: 'var(--font-size-sm)' }}>No past sessions yet</div>
          ) : (
            <div className="space-y-2">
              {pastSessions.map(session => {
                const exchanges = Math.floor(session.messages.length / 2);
                const isHovered = hoveredSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredSessionId(session.id)}
                    onMouseLeave={() => setHoveredSessionId(null)}
                  >
                    <button
                      onClick={() => handleLoadSession(session)}
                      style={{ width: '100%', textAlign: 'left', padding: '12px', paddingRight: '40px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-default)', backgroundColor: isHovered ? 'var(--color-state-hover-bg)' : 'transparent', cursor: 'pointer', transition: 'background-color 0.15s, border-color 0.15s', borderColor: isHovered ? 'var(--color-border-strong)' : 'var(--color-border-default)' }}
                    >
                      {(() => {
                        const hasProject = !session.global_mode && session.project_name;
                        const projectRemoved = !!(hasProject && session.project_id && !activeProjectIds.has(session.project_id));
                        return (
                          <>
                            {hasProject && (
                              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: projectRemoved ? 'var(--color-text-muted)' : 'var(--color-primary-500)' }}>{session.project_name}</span>
                                {projectRemoved && <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontWeight: 'var(--font-weight-regular)' }}>(removed)</span>}
                              </div>
                            )}
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{session.title}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              <span>{session.global_mode ? 'Global search' : `${session.conversation_ids.length} conversation${session.conversation_ids.length !== 1 ? 's' : ''}`}</span>
                              <span style={{ opacity: 0.5 }}>·</span>
                              <span>{exchanges} {exchanges === 1 ? 'exchange' : 'exchanges'}</span>
                              <span style={{ opacity: 0.5 }}>·</span>
                              <span suppressHydrationWarning>{formatRelativeTime(session.created_at)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </button>
                    {isHovered && (
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="Delete session"
                        style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--border-radius-base)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'color 0.15s, background-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent-rose)'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main chat view ────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: '4px' }}>

      {/* TEMPORARILY DISABLED — selection menu portal + save modals
      <SelectionMenuPortal ref={selectionMenuPortalRef} onChoose={...} />
      {ragPendingPin && createPortal(<SaveHighlightModal .../>, document.body)}
      {ragPendingPin && createPortal(<AddActionModal .../>, document.body)}
      {ragPendingPin && createPortal(<AddReminderModal .../>, document.body)}
      */}

      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <IconButton onClick={onExpandToggle} tooltip={isExpanded ? 'Collapse' : 'Expand'} tooltipPosition="bottom" size="lg">
              {isExpanded ? <PanelRightClose size={20} /> : <PanelLeftClose size={20} />}
            </IconButton>
            {hasMessages && conversationTitle && (
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conversationTitle}{conversationTitle.length === 50 ? '…' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {hasMessages && (
              <IconButton onClick={handleNewConversation} tooltip="New chat" tooltipPosition="bottom" size="lg">
                <SquarePen size={20} />
              </IconButton>
            )}
            <IconButton onClick={() => { setShowHistory(true); loadHistory(); }} tooltip="Chat history" tooltipPosition="bottom" size="lg">
              <Clock size={20} />
            </IconButton>
            <IconButton onClick={onClose} tooltip="Close" tooltipPosition="bottom" size="lg">
              <X size={20} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {messages.length === 0 && (
          <div key={isOpen ? 'open' : 'closed'} className="flex flex-col h-full">
            <style>{`
              @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              @keyframes fadeSlideDown {
                from { opacity: 1; transform: translateY(0); }
                to   { opacity: 0; transform: translateY(14px); }
              }
              .animate-entrance { animation: fadeSlideUp 0.4s ease-out both; }
              .animate-exit { animation: fadeSlideDown 0.25s ease-in both; }
            `}</style>
            <div className="flex-1" />
            <div className={`pb-2 ${isExiting ? 'animate-exit' : ''}`}>
              <h2
                className={`${!isExiting ? 'animate-entrance' : ''}`}
                style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)', marginBottom: '16px', animationDelay: '0ms' }}
              >
                How can I help today?
              </h2>
              {!isAwaitingName && (
                <div className="space-y-0.5">
                  {starterPrompts.map(({ Icon, text }, i) => (
                    <MenuItem
                      key={i}
                      onClick={() => handleSend(text)}
                      className={`rag-starter-btn${!isExiting ? ' animate-entrance' : ''}`}
                      style={{ ...(!isExiting ? { animationDelay: `${80 + i * 70}ms` } : {}) }}
                    >
                      <Icon style={{ width: '20px', height: '20px', color: 'var(--color-icon-subtle)', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{text}</span>
                      <CornerDownLeft className="rag-corner-arrow" style={{ width: '16px', height: '16px', color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    </MenuItem>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {messages.map((msg, index) =>
          msg.role === 'user' ? (
            <UserBubble key={index} content={msg.content} timestamp={msg.timestamp} />
          ) : (
            <RagAssistantMessage
              key={index}
              msg={msg}
              index={index}
              expandedSources={expandedSources}
              onToggleExpand={toggleSourceExpanded}
              messages={messages}
            />
          )
        )}

        {isLoading && <BearLoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div style={{ backgroundColor: 'var(--color-status-error-bg)', border: '1px solid var(--color-status-error-border)', borderRadius: 'var(--border-radius-md)', padding: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-status-error)' }}>{error}</div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4">
        <RagInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
          disabled={!canSend && !inputValue.trim()}
          placeholder="Ask anything..."
          scopeSlot={<ScopeChip />}
          textareaRef={inputRef}
        />
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', opacity: 0.7, marginTop: '8px', textAlign: 'center' }}>
          Coda can make mistakes.<br />
          Learn how to get the best out of him{' '}
          <a href="/help" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}>here</a>
        </p>
      </div>
    </div>
  );
}