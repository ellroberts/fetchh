'use client';

/**
 * RAG Integration Example
 *
 * This file demonstrates how to integrate the RAG multi-select system
 * into your existing conversations page. You can use this as a reference
 * for adding multi-chat analysis capabilities to your app.
 */

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../../lib/supabase';
import {
  MultiSelectProvider,
  useMultiSelect,
  MultiSelectToolbar,
  RagChatModal,
  SelectableConversationCard,
} from './index';

interface Conversation {
  id: string;
  title: string;
  platform?: string;
  created_at: string;
  message_count?: number;
  has_embeddings?: boolean;
}

// Main wrapper component
export function RAGEnabledConversations() {
  return (
    <MultiSelectProvider>
      <ConversationsWithRAG />
    </MultiSelectProvider>
  );
}

// Inner component that uses the multi-select context
function ConversationsWithRAG() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState<Set<string>>(
    new Set()
  );

  const {
    isSelecting,
    selectedConversations,
    selectAll,
    getSelectedIds,
    isRagChatOpen,
  } = useMultiSelect();

  const supabase = createSupabaseClient();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          'id, title, platform, created_at, message_count, has_embeddings'
        )
        .order('created_at', { ascending: false });

      if (!error && data) {
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEmbedding = async (conversationId: string) => {
    setGeneratingEmbeddings((prev) => new Set(prev).add(conversationId));

    try {
      const response = await fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, has_embeddings: true }
              : conv
          )
        );
        alert(`Successfully generated ${data.status.total_chunks} embeddings!`);
      } else {
        alert(`Failed to generate embeddings: ${data.error}`);
      }
    } catch (err) {
      console.error('Embedding generation failed:', err);
      alert('Failed to generate embeddings');
    } finally {
      setGeneratingEmbeddings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  };

  const handleGenerateSelectedEmbeddings = async () => {
    const selectedIds = getSelectedIds();
    const needsEmbeddings = selectedIds.filter((id) => {
      const conv = selectedConversations.get(id);
      return conv && !conv.has_embeddings;
    });

    for (const id of needsEmbeddings) {
      await handleGenerateEmbedding(id);
    }
  };

  const handleSelectAll = () => {
    const allConvs = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || 'Untitled',
      has_embeddings: conv.has_embeddings || false,
      message_count: conv.message_count,
    }));
    selectAll(allConvs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Multi-Select Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Conversations</h1>

        <div className="flex items-center space-x-2">
          {isSelecting && conversations.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Select All ({conversations.length})
            </button>
          )}
        </div>
      </div>

      {/* Multi-Select Toolbar */}
      <MultiSelectToolbar
        onGenerateEmbeddings={handleGenerateSelectedEmbeddings}
        isGenerating={generatingEmbeddings.size > 0}
      />

      {/* Conversation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conversations.map((conv) => (
          <SelectableConversationCard
            key={conv.id}
            conversation={conv}
            onGenerateEmbedding={handleGenerateEmbedding}
            isGeneratingEmbedding={generatingEmbeddings.has(conv.id)}
            onClick={() => {
              // Navigate to conversation detail or open side panel
              console.log('Open conversation:', conv.id);
            }}
          />
        ))}
      </div>

      {conversations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No conversations found</p>
        </div>
      )}

      {/* RAG Chat Modal */}
      <RagChatModal />
    </div>
  );
}

/**
 * How to use this in your existing page:
 *
 * 1. Wrap your conversations page with MultiSelectProvider:
 *
 * ```tsx
 * import { MultiSelectProvider } from '@/components/rag';
 *
 * export default function ConversationsPage() {
 *   return (
 *     <MultiSelectProvider>
 *       <YourExistingContent />
 *     </MultiSelectProvider>
 *   );
 * }
 * ```
 *
 * 2. Add the toolbar and modal to your page:
 *
 * ```tsx
 * import { MultiSelectToolbar, RagChatModal } from '@/components/rag';
 *
 * function YourExistingContent() {
 *   return (
 *     <div>
 *       <MultiSelectToolbar />
 *       <YourConversationsList />
 *       <RagChatModal />
 *     </div>
 *   );
 * }
 * ```
 *
 * 3. Use SelectableConversationCard for each conversation:
 *
 * ```tsx
 * import { SelectableConversationCard } from '@/components/rag';
 *
 * {conversations.map(conv => (
 *   <SelectableConversationCard
 *     key={conv.id}
 *     conversation={conv}
 *     onGenerateEmbedding={handleGenerate}
 *   />
 * ))}
 * ```
 *
 * 4. Add has_embeddings to your Supabase query:
 *
 * ```tsx
 * const { data } = await supabase
 *   .from('conversations')
 *   .select('id, title, platform, created_at, message_count, has_embeddings')
 * ```
 */
