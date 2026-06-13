'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { RagChatMessage } from '../../lib/rag-types';

interface SelectedConversation {
  id: string;
  title: string;
  has_embeddings: boolean;
  message_count?: number;
}

interface MultiSelectContextType {
  isSelecting: boolean;
  setIsSelecting: (value: boolean) => void;
  selectedConversations: Map<string, SelectedConversation>;
  toggleConversation: (conversation: SelectedConversation) => void;
  selectAll: (conversations: SelectedConversation[]) => void;
  clearSelection: () => void;
  removeConversation: (id: string) => void;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
  getEmbeddingsReadyCount: () => number;
  isRagChatOpen: boolean;
  setIsRagChatOpen: (value: boolean) => void;
  // Chat state persistence
  chatMessages: RagChatMessage[];
  setChatMessages: (messages: RagChatMessage[]) => void;
  addChatMessage: (message: RagChatMessage) => void;
  chatSessionId: string | null;
  setChatSessionId: (id: string | null) => void;
  creditsRemaining: number | null;
  setCreditsRemaining: (credits: number | null) => void;
  clearChat: () => void;
}

const MultiSelectContext = createContext<MultiSelectContextType | null>(null);

export function MultiSelectProvider({ children }: { children: ReactNode }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Map<string, SelectedConversation>>(
    new Map()
  );
  const [isRagChatOpen, setIsRagChatOpen] = useState(false);

  // Chat state persistence
  const [chatMessages, setChatMessages] = useState<RagChatMessage[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const toggleConversation = (conversation: SelectedConversation) => {
    const newMap = new Map(selectedConversations);
    if (newMap.has(conversation.id)) {
      newMap.delete(conversation.id);
    } else {
      newMap.set(conversation.id, conversation);
    }
    setSelectedConversations(newMap);
  };

  const selectAll = (conversations: SelectedConversation[]) => {
    const newMap = new Map<string, SelectedConversation>();
    for (const conv of conversations) {
      newMap.set(conv.id, conv);
    }
    setSelectedConversations(newMap);
  };

  const clearSelection = () => {
    setSelectedConversations(new Map());
    setIsSelecting(false);
  };

  const removeConversation = (id: string) => {
    const newMap = new Map(selectedConversations);
    newMap.delete(id);
    setSelectedConversations(newMap);
  };

  const getSelectedCount = () => selectedConversations.size;

  const getSelectedIds = () => Array.from(selectedConversations.keys());

  const getEmbeddingsReadyCount = () => {
    let count = 0;
    for (const conv of selectedConversations.values()) {
      if (conv.has_embeddings) count++;
    }
    return count;
  };

  const addChatMessage = (message: RagChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatSessionId(null);
  };

  return (
    <MultiSelectContext.Provider
      value={{
        isSelecting,
        setIsSelecting,
        selectedConversations,
        toggleConversation,
        selectAll,
        clearSelection,
        removeConversation,
        getSelectedCount,
        getSelectedIds,
        getEmbeddingsReadyCount,
        isRagChatOpen,
        setIsRagChatOpen,
        // Chat state
        chatMessages,
        setChatMessages,
        addChatMessage,
        chatSessionId,
        setChatSessionId,
        creditsRemaining,
        setCreditsRemaining,
        clearChat,
      }}
    >
      {children}
    </MultiSelectContext.Provider>
  );
}

export function useMultiSelect() {
  const context = useContext(MultiSelectContext);
  if (!context) {
    throw new Error('useMultiSelect must be used within MultiSelectProvider');
  }
  return context;
}
