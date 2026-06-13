'use client';

/**
 * RAG Test Page - Multi-Conversation Analysis
 *
 * This page demonstrates the RAG system integration, allowing users to:
 * 1. View all their conversations with embedding status
 * 2. Select multiple conversations for analysis
 * 3. Generate embeddings for conversations that need them
 * 4. Ask questions across selected conversations and receive AI-powered answers with citations
 *
 * Path: /test-rag
 */

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '../../lib/supabase';
import {
  MultiSelectProvider,
  useMultiSelect,
  RagChatModal,
  SelectableConversationCard,
} from '../../components/rag';

// Conversation type matching the database schema
interface Conversation {
  id: string;
  title: string;
  platform?: string;
  created_at: string;
  message_count?: number;
  has_embeddings?: boolean;
  last_embedded_at?: string;
}

// Toast notification type
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// Main page wrapper with provider
export default function TestRagPage() {
  return (
    <MultiSelectProvider>
      <RAGTestContent />
    </MultiSelectProvider>
  );
}

// Inner component that uses the multi-select context
function RAGTestContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  const {
    isSelecting,
    setIsSelecting,
    selectedConversations,
    selectAll,
    getSelectedIds,
    getEmbeddingsReadyCount,
    setIsRagChatOpen,
  } = useMultiSelect();

  const supabase = createSupabaseClient();

  // Always enable selection mode for RAG test page
  useEffect(() => {
    setIsSelecting(true);
  }, [setIsSelecting]);

  // Toast management
  const addToast = useCallback((type: Toast['type'], message: string) => {
    // Generate truly unique ID using timestamp + random number
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch conversations from Supabase
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('id, title, platform, created_at, message_count, has_embeddings, last_embedded_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setConversations(data || []);

      if (!data || data.length === 0) {
        addToast('info', 'No conversations found. Import some conversations first to test RAG analysis.');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to fetch conversations';
      setError(message);
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [supabase, addToast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Helper function to provide user-friendly error messages
  const getUserFriendlyErrorMessage = (error: string): string => {
    if (error.includes('maximum context length') || error.includes('too many tokens')) {
      return 'Conversation is very long. Splitting into smaller chunks and retrying...';
    }
    if (error.includes('rate limit') || error.includes('429')) {
      return 'API rate limit reached. Please wait a moment and try again.';
    }
    if (error.includes('OpenAI API key')) {
      return 'OpenAI API key not configured. Please check server configuration.';
    }
    if (error.includes('Unauthorized') || error.includes('401')) {
      return 'Please sign in to generate embeddings.';
    }
    if (error.includes('not found') || error.includes('404')) {
      return 'Conversation not found. It may have been deleted.';
    }
    return error;
  };

  // Generate embeddings for a single conversation
  const handleGenerateEmbedding = async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    setGeneratingEmbeddings((prev) => new Set(prev).add(conversationId));

    try {
      const response = await fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to generate embeddings';
        throw new Error(getUserFriendlyErrorMessage(errorMessage));
      }

      // Update local state to reflect new embeddings
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                has_embeddings: true,
                last_embedded_at: new Date().toISOString()
              }
            : conv
        )
      );

      // Also update the selected conversations if this one is selected
      if (selectedConversations.has(conversationId)) {
        const selected = selectedConversations.get(conversationId);
        if (selected) {
          selectedConversations.set(conversationId, {
            ...selected,
            has_embeddings: true
          });
        }
      }

      addToast(
        'success',
        `Generated ${data.status.total_chunks} chunk${data.status.total_chunks > 1 ? 's' : ''} for "${conversation.title}"`
      );
    } catch (err: any) {
      const message = err.message || 'Failed to generate embeddings';
      addToast('error', `${conversation.title}: ${message}`);
    } finally {
      setGeneratingEmbeddings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  };

  // Generate embeddings for all selected conversations that need them
  const handleGenerateSelectedEmbeddings = async () => {
    const selectedIds = getSelectedIds();
    const needsEmbeddings = selectedIds.filter((id) => {
      const conv = selectedConversations.get(id);
      return conv && !conv.has_embeddings;
    });

    if (needsEmbeddings.length === 0) {
      addToast('info', 'All selected conversations already have embeddings');
      return;
    }

    addToast('info', `Generating embeddings for ${needsEmbeddings.length} conversation(s)...`);

    let successCount = 0;
    let failCount = 0;

    for (const id of needsEmbeddings) {
      try {
        await handleGenerateEmbedding(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount > 0) {
      addToast('error', `${failCount} embedding generation(s) failed`);
    }
    if (successCount > 0) {
      addToast('success', `Successfully generated embeddings for ${successCount} conversation(s)`);
    }
  };

  // Select all conversations
  const handleSelectAll = () => {
    const allConvs = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || 'Untitled',
      has_embeddings: conv.has_embeddings || false,
      message_count: conv.message_count,
    }));
    selectAll(allConvs);
  };

  // Run diagnostics to check RAG system setup
  const handleRunDiagnostics = async () => {
    setDiagnosing(true);
    setDiagnosticResults(null);

    try {
      const response = await fetch('/api/embeddings/diagnose');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Diagnostic failed');
      }

      setDiagnosticResults(data);

      if (data.overall_status === 'healthy') {
        addToast('success', 'RAG system diagnostics passed! All checks successful.');
      } else {
        addToast('error', 'RAG system has issues. Check the diagnostic results below.');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to run diagnostics';
      addToast('error', message);
      setDiagnosticResults({ error: message });
    } finally {
      setDiagnosing(false);
    }
  };

  // Get stats
  const embeddingsReadyCount = conversations.filter((c) => c.has_embeddings).length;
  const totalConversations = conversations.length;

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : toast.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm ${
                toast.type === 'success' ? 'text-green-800' :
                toast.type === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="ml-3 flex-shrink-0 text-muted-foreground/70 hover:text-muted-foreground p-1 rounded hover:bg-muted"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">RAG Multi-Chat Analysis</h1>
              <p className="mt-2 text-muted-foreground">
                Select multiple conversations to analyze them together using AI
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={fetchConversations}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-background hover:bg-muted/50 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 bg-background rounded-lg shadow p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalConversations}</div>
                <div className="text-sm text-muted-foreground">Total Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{embeddingsReadyCount}</div>
                <div className="text-sm text-muted-foreground">Ready for Analysis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalConversations - embeddingsReadyCount}</div>
                <div className="text-sm text-muted-foreground">Need Embeddings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Cost Info */}
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="font-medium text-indigo-900">Credit Usage:</span>
                <span className="ml-2 text-indigo-700">
                  Embedding generation is <strong>FREE</strong>. Each RAG query costs <strong>1 credit</strong>.
                </span>
              </div>
            </div>
            <button
              onClick={handleRunDiagnostics}
              disabled={diagnosing}
              className="inline-flex items-center px-3 py-1.5 border border-border rounded-md text-sm font-medium text-foreground/80 bg-background hover:bg-muted/50 disabled:opacity-50"
            >
              {diagnosing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Run Diagnostics
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diagnostic Results */}
        {diagnosticResults && (
          <div className={`mb-6 border rounded-lg p-4 ${
            diagnosticResults.overall_status === 'healthy'
              ? 'bg-green-50 border-green-200'
              : diagnosticResults.error
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">
                RAG System Diagnostics
              </h3>
              <button
                onClick={() => setDiagnosticResults(null)}
                className="text-muted-foreground/70 hover:text-muted-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {diagnosticResults.error ? (
              <p className="text-red-700">{diagnosticResults.error}</p>
            ) : (
              <div className="space-y-3">
                {/* Overall Status */}
                <div className={`flex items-center ${
                  diagnosticResults.overall_status === 'healthy'
                    ? 'text-green-700'
                    : 'text-yellow-700'
                }`}>
                  <svg className={`w-5 h-5 mr-2 ${
                    diagnosticResults.overall_status === 'healthy'
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {diagnosticResults.overall_status === 'healthy' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    )}
                  </svg>
                  <span className="font-medium">
                    {diagnosticResults.overall_status === 'healthy'
                      ? 'All checks passed!'
                      : 'Issues detected'}
                  </span>
                </div>

                {/* Individual Checks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(diagnosticResults.checks || {}).map(([checkName, result]: [string, any]) => (
                    <div
                      key={checkName}
                      className={`p-3 rounded ${
                        result.success ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <span className={`text-xs font-mono ${
                          result.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {result.success ? '✓' : '✗'} {checkName.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.error && <div className="text-red-600">Error: {result.error}</div>}
                        {result.total_embeddings !== undefined && (
                          <div>Total embeddings: {result.total_embeddings}</div>
                        )}
                        {result.conversations_with_embeddings !== undefined && (
                          <div>Conversations ready: {result.conversations_with_embeddings}</div>
                        )}
                        {result.results_count !== undefined && (
                          <div>Search results: {result.results_count}</div>
                        )}
                        {result.top_similarities && (
                          <div>
                            Top similarity: {(result.top_similarities[0]?.similarity * 100).toFixed(1)}%
                          </div>
                        )}
                        {result.message && <div>{result.message}</div>}
                        {result.fix && <div className="text-red-600 mt-1">Fix: {result.fix}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {diagnosticResults.recommendations && diagnosticResults.recommendations.length > 0 && (
                  <div className="mt-3 bg-background border border-yellow-300 rounded p-3">
                    <h4 className="font-medium text-yellow-800 mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                      {diagnosticResults.recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selection Action Bar - Shows when conversations are selected */}
        {selectedConversations.size > 0 && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-indigo-900">
                    {selectedConversations.size} selected
                  </span>
                  <span className="ml-3 text-sm text-indigo-600">
                    ({getEmbeddingsReadyCount()} ready, {selectedConversations.size - getEmbeddingsReadyCount()} need embeddings)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {selectedConversations.size - getEmbeddingsReadyCount() > 0 && (
                  <button
                    onClick={handleGenerateSelectedEmbeddings}
                    disabled={generatingEmbeddings.size > 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingEmbeddings.size > 0 ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Generate Embeddings ({selectedConversations.size - getEmbeddingsReadyCount()})
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setIsRagChatOpen(true)}
                  disabled={selectedConversations.size < 2 || getEmbeddingsReadyCount() < selectedConversations.size}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    selectedConversations.size < 2
                      ? 'Select at least 2 conversations'
                      : getEmbeddingsReadyCount() < selectedConversations.size
                      ? 'Generate embeddings first'
                      : `Analyze ${selectedConversations.size} conversations`
                  }
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Analyze ({selectedConversations.size})
                </button>
              </div>
            </div>

            {getEmbeddingsReadyCount() < selectedConversations.size && (
              <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                <strong>Note:</strong> Generate embeddings for all selected conversations before analysis.
              </div>
            )}
          </div>
        )}

        {/* Select All Button */}
        {conversations.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Select All ({conversations.length})
            </button>
            <span className="text-sm text-muted-foreground">
              Click checkboxes to select conversations for analysis
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="font-medium text-red-900">Error loading conversations:</span>
                <span className="ml-2 text-red-700">{error}</span>
              </div>
            </div>
            <button
              onClick={fetchConversations}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && conversations.length === 0 && (
          <div className="text-center py-16 bg-background rounded-lg shadow">
            <svg className="w-16 h-16 text-muted-foreground/70 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">No Conversations Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You need to import some AI chat conversations first before you can use the RAG analysis feature.
            </p>
            <a
              href="/import"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Import Conversations
            </a>
          </div>
        )}

        {/* Conversation Grid */}
        {!loading && conversations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {conversations.map((conv) => (
              <SelectableConversationCard
                key={conv.id}
                conversation={conv}
                onGenerateEmbedding={handleGenerateEmbedding}
                isGeneratingEmbedding={generatingEmbeddings.has(conv.id)}
                onClick={() => {
                  // Optional: Navigate to conversation detail
                  // router.push(`/threads/${conv.id}`);
                }}
              >
                {/* Custom card content - preview text or other info */}
                <div className="mt-2">
                  {conv.last_embedded_at && (
                    <p className="text-xs text-muted-foreground/70">
                      Last embedded: {new Date(conv.last_embedded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </SelectableConversationCard>
            ))}
          </div>
        )}

        {/* Usage Instructions */}
        {!loading && conversations.length > 0 && (
          <div className="mt-12 bg-background rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">How to Use RAG Analysis</h2>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">1</span>
                <span>Click <strong>"Select for Multi-Chat Analysis"</strong> to enter selection mode</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">2</span>
                <span>Click on conversation cards or checkboxes to select 2+ conversations</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">3</span>
                <span>If any conversations need embeddings (orange badge), click <strong>"Generate Embeddings"</strong></span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">4</span>
                <span>Once all selected conversations have green badges, click <strong>"Analyze (X)"</strong></span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">5</span>
                <span>Ask questions in the chat modal and receive AI-powered answers with source citations</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* RAG Chat Modal - Always rendered, visibility controlled by context */}
      <RagChatModal />
    </div>
  );
}
