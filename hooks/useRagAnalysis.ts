// hooks/useRagAnalysis.ts
// Custom hook for RAG multi-conversation analysis

import { useState, useCallback } from 'react';
import { createSupabaseClient } from '../lib/supabase';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface UseRagAnalysisResult {
  generatingEmbeddings: Set<string>;
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  handleGenerateEmbedding: (conversationId: string, conversationTitle?: string) => Promise<void>;
  handleGenerateSelectedEmbeddings: (
    selectedIds: string[],
    selectedConversations: Map<string, { id: string; title: string; has_embeddings?: boolean }>
  ) => Promise<void>;
  updateConversation: (conversationId: string, updates: any) => void;
  conversations: any[];
  setConversations: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useRagAnalysis(): UseRagAnalysisResult {
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  const supabase = createSupabaseClient();

  // Toast management
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // User-friendly error messages
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

  // Update conversation in state
  const updateConversation = useCallback((conversationId: string, updates: any) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, ...updates }
          : conv
      )
    );
  }, []);

  // Generate embeddings for a single conversation
  const handleGenerateEmbedding = useCallback(async (conversationId: string, conversationTitle?: string) => {
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

      // Update local state
      updateConversation(conversationId, {
        has_embeddings: true,
        last_embedded_at: new Date().toISOString(),
      });

      addToast(
        'success',
        `Generated ${data.status.total_chunks} chunk${data.status.total_chunks > 1 ? 's' : ''} for "${conversationTitle || 'conversation'}"`
      );
    } catch (err: any) {
      const message = err.message || 'Failed to generate embeddings';
      addToast('error', `${conversationTitle || 'Conversation'}: ${message}`);
      throw err;
    } finally {
      setGeneratingEmbeddings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  }, [addToast, updateConversation]);

  // Generate embeddings for all selected conversations that need them
  const handleGenerateSelectedEmbeddings = useCallback(async (
    selectedIds: string[],
    selectedConversations: Map<string, { id: string; title: string; has_embeddings?: boolean }>
  ) => {
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
      const conv = selectedConversations.get(id);
      try {
        await handleGenerateEmbedding(id, conv?.title);
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
  }, [addToast, handleGenerateEmbedding]);

  return {
    generatingEmbeddings,
    toasts,
    addToast,
    removeToast,
    handleGenerateEmbedding,
    handleGenerateSelectedEmbeddings,
    updateConversation,
    conversations,
    setConversations,
  };
}
