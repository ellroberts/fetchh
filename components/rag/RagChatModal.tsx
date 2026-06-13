'use client';

import { useState, useRef, useEffect } from 'react';
import { useMultiSelect } from './MultiSelectContext';
import { RagChatMessage, RagSource } from '../../lib/rag-types';

interface RagChatModalProps {
  onClose?: () => void;
}

export function RagChatModal({ onClose }: RagChatModalProps) {
  const {
    isRagChatOpen,
    setIsRagChatOpen,
    selectedConversations,
    getSelectedIds,
    clearSelection,
    // Use context state for chat persistence
    chatMessages,
    addChatMessage,
    setChatMessages,
    chatSessionId,
    setChatSessionId,
    creditsRemaining,
    setCreditsRemaining,
    clearChat,
  } = useMultiSelect();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (isRagChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRagChatOpen]);

  const handleClose = () => {
    setIsRagChatOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!isRagChatOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isRagChatOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const question = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message optimistically
    const userMessage: RagChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMessage);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/multi-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_ids: getSelectedIds(),
          question,
          session_id: chatSessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to analyze');
      }

      // Add assistant message
      const assistantMessage: RagChatMessage = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
      };
      addChatMessage(assistantMessage);
      setChatSessionId(data.session_id);
      setCreditsRemaining(data.credits_remaining);
    } catch (err: any) {
      setError(err.message);
      // Remove the optimistic user message on error
      setChatMessages(chatMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSourceExpanded = (index: number) => {
    const newSet = new Set(expandedSources);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedSources(newSet);
  };

  const handleNewConversation = () => {
    clearChat();
    setError(null);
    setExpandedSources(new Set());
  };

  const handleSelectDifferent = () => {
    handleNewConversation();
    handleClose();
  };

  if (!isRagChatOpen) return null;

  const conversationList = Array.from(selectedConversations.values());

  return (
    <div onClick={handleClose} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div onClick={e => e.stopPropagation()} className="bg-background rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Multi-Chat Analysis
              {chatSessionId && (
                <span className="ml-2 text-xs font-normal text-muted-foreground/70">
                  Session: {chatSessionId.substring(0, 8)}...
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Analyzing {conversationList.length} conversation
              {conversationList.length > 1 ? 's' : ''}
              {creditsRemaining !== null && (
                <span className="ml-2">• {creditsRemaining} credits remaining</span>
              )}
              {chatMessages.length > 0 && (
                <span className="ml-2">• {chatMessages.length} messages</span>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-muted"
          >
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Selected Conversations Pills */}
        <div className="p-3 bg-muted/50 border-b overflow-x-auto">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Analyzing:
            </span>
            {conversationList.map((conv) => (
              <span
                key={conv.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 whitespace-nowrap"
              >
                {conv.title.length > 30
                  ? conv.title.substring(0, 30) + '...'
                  : conv.title}
              </span>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-muted-foreground/70 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Start Your Analysis
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ask questions about your selected conversations. The AI will search
                across all {conversationList.length} conversations and provide
                answers with source citations.
              </p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Example questions:</p>
                <ul className="space-y-1">
                  <li>• What are the main topics discussed across these chats?</li>
                  <li>• What decisions were made in these conversations?</li>
                  <li>• Are there any contradictions between the conversations?</li>
                  <li>• What problems were solved and how?</li>
                </ul>
              </div>
            </div>
          )}

          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-lg rounded-br-none'
                    : 'bg-muted text-foreground rounded-lg rounded-bl-none'
                } px-4 py-3`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Source Citations */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => toggleSourceExpanded(index)}
                      className="flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <svg
                        className={`w-4 h-4 mr-1 transition-transform ${
                          expandedSources.has(index) ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      {message.sources.length} source
                      {message.sources.length > 1 ? 's' : ''} cited
                    </button>

                    {expandedSources.has(index) && (
                      <div className="mt-2 space-y-2">
                        {message.sources.map((source, sIdx) => (
                          <SourceCitation key={sIdx} source={source} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Searching across conversations...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <div className="flex items-center text-sm text-red-700">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your conversations..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleNewConversation}
                disabled={chatMessages.length === 0}
                className="text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Chat
              </button>
              <span className="text-muted-foreground/50">|</span>
              <button
                onClick={handleSelectDifferent}
                className="text-xs text-muted-foreground hover:text-foreground/80"
              >
                Select Different Conversations
              </button>
            </div>
            <span className="text-xs text-muted-foreground/70">
              Press Enter to send, Shift+Enter for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCitation({ source }: { source: RagSource }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-background rounded border border-border p-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-medium text-foreground">
            {source.conversation_title}
          </span>
          <span className="ml-2 px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
            {Math.round(source.similarity * 100)}% match
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground/80"
        >
          {isExpanded ? 'Hide' : 'Show'} excerpt
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-foreground/80 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {source.chunk_text.length > 500
            ? source.chunk_text.substring(0, 500) + '...'
            : source.chunk_text}
        </div>
      )}
    </div>
  );
}
