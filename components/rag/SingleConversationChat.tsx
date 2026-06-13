'use client';

import { useState, useRef, useEffect } from 'react';
import { RagChatMessage, RagSource } from '../../lib/rag-types';
import { SUGGESTED_QUESTIONS } from '../../lib/pinned-insights-types';
import { createSupabaseClient } from '../../lib/supabase';

interface SingleConversationChatProps {
  conversationId: string;
  conversationTitle?: string;
  onPinResponse?: (content: string, question: string) => void;
}

/**
 * Single Conversation RAG Chat
 *
 * Features:
 * - Chat interface scoped to a single conversation
 * - Suggested question buttons for quick access
 * - Pin responses to build customized insights page
 * - Session persistence for returning users
 * - Source citations from vector search
 */
export function SingleConversationChat({
  conversationId,
  conversationTitle = 'Conversation',
  onPinResponse,
}: SingleConversationChatProps) {
  const [messages, setMessages] = useState<RagChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing chat session for this conversation on mount
  useEffect(() => {
    loadExistingSession();
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadExistingSession = async () => {
    try {
      setLoadingSession(true);
      const supabase = createSupabaseClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('❌ Not authenticated, skipping session load');
        return;
      }

      console.log('🔍 Loading session for conversation:', conversationId);
      console.log('👤 User ID:', user.id);

      // Query for all sessions for this user
      const { data: allSessions, error: allSessionsError } = await supabase
        .from('rag_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (allSessionsError) {
        console.error('❌ Error loading sessions:', allSessionsError);
        return;
      }

      console.log(`📊 Found ${allSessions?.length || 0} total sessions for user`);

      if (allSessions && allSessions.length > 0) {
        // Debug: Log all sessions
        allSessions.forEach((s: any, idx: number) => {
          console.log(`  Session ${idx + 1}:`, {
            id: s.id.substring(0, 8) + '...',
            conversation_ids: s.conversation_ids,
            message_count: s.messages?.length || 0,
            last_message: s.last_message_at,
          });
        });

        // Find the first session that contains ONLY this conversation
        const singleConvSession = allSessions.find(
          (s: any) =>
            Array.isArray(s.conversation_ids) &&
            s.conversation_ids.length === 1 &&
            s.conversation_ids[0] === conversationId
        );

        if (singleConvSession && singleConvSession.messages) {
          console.log('✅ Loaded existing session:', singleConvSession.id);
          console.log('  - Messages:', singleConvSession.messages.length);
          setSessionId(singleConvSession.id);
          setMessages(singleConvSession.messages);
        } else {
          console.log('ℹ️ No existing session found for this conversation');
          console.log('  Looking for conversation_ids array containing only:', conversationId);
        }
      }
    } catch (err: any) {
      console.error('❌ Error loading existing session:', err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSend = async (question?: string) => {
    const queryText = question || inputValue.trim();
    if (!queryText || isLoading) return;

    if (!question) {
      setInputValue('');
    }
    setError(null);

    console.log('📤 Sending question:', queryText);
    console.log('🔑 Current session ID:', sessionId || 'none (will create new)');

    // Add user message optimistically
    const userMessage: RagChatMessage = {
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Check if embeddings exist — auto-generate if not
      const supabase = createSupabaseClient();
      const { data: conv } = await supabase
        .from('conversations')
        .select('has_embeddings')
        .eq('id', conversationId)
        .single();

      if (!conv?.has_embeddings) {
        setIsIndexing(true);
        setIsLoading(false); // pause the loading dots while indexing
        try {
          const embedRes = await fetch('/api/embeddings/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: conversationId }),
          });
          if (!embedRes.ok) throw new Error('Indexing failed');
        } catch {
          setError('Failed to index this conversation. Please try again.');
          setMessages((prev) => prev.slice(0, -1));
          setIsIndexing(false);
          setIsLoading(false);
          return;
        } finally {
          setIsIndexing(false);
          setIsLoading(true);
        }
      }

      const requestBody = {
        conversation_ids: [conversationId], // Single conversation mode
        question: queryText,
        session_id: sessionId,
        similarity_threshold: 0.15, // Lower threshold for single-conversation mode (more lenient)
      };

      console.log('📨 Request body:', requestBody);

      const response = await fetch('/api/chat/multi-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to analyze');
      }

      console.log('✅ Response received');
      console.log('  - Session ID from response:', data.session_id);
      console.log('  - Credits remaining:', data.credits_remaining);

      // Add assistant message
      const assistantMessage: RagChatMessage = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSessionId(data.session_id);

      console.log('💾 Session ID saved to state:', data.session_id);
      console.log('📝 Total messages in state:', messages.length + 2); // +2 for user and assistant messages just added

      if (data.credits_remaining !== undefined) {
        setCreditsRemaining(data.credits_remaining);
      }
    } catch (err: any) {
      console.error('❌ Error sending message:', err);
      setError(err.message);
      // Remove optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
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
    setMessages([]);
    setSessionId(null);
    setError(null);
    setExpandedSources(new Set());
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    handleSend(question);
  };

  const handlePinMessage = (messageIndex: number) => {
    const message = messages[messageIndex];
    if (message.role === 'assistant' && onPinResponse) {
      // Find the corresponding user question
      const userMessage = messages[messageIndex - 1];
      const question = userMessage?.role === 'user' ? userMessage.content : '';
      onPinResponse(message.content, question);
    }
  };

  return (
    <div className="bg-background rounded-lg border border-border shadow-sm">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ask Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Search this conversation with AI • 1 credit per query
              {creditsRemaining !== null && (
                <span className="ml-2 font-medium">{creditsRemaining} credits remaining</span>
              )}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              className="text-sm text-muted-foreground hover:text-foreground/80 px-3 py-1 rounded hover:bg-muted transition"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-border bg-background">
          <p className="text-xs font-medium text-muted-foreground mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((sq, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(sq.question)}
                disabled={isLoading || isIndexing}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sq.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {loadingSession && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading chat history...</p>
          </div>
        )}

        {!loadingSession && messages.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3"
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
            <p className="text-muted-foreground text-sm">
              Ask questions about this conversation and pin responses to build your insights page.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setHoveredMessageIndex(index)}
            onMouseLeave={() => setHoveredMessageIndex(null)}
          >
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`
                  rounded-lg px-4 py-3 text-sm relative
                  ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-muted text-foreground'
                  }
                `}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>

                {/* Pin button for assistant messages */}
                {message.role === 'assistant' && onPinResponse && hoveredMessageIndex === index && (
                  <button
                    onClick={() => handlePinMessage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-background rounded-md shadow-sm hover:shadow-md transition text-muted-foreground hover:text-indigo-600"
                    title="Pin to page"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                )}

                {/* Sources for assistant messages */}
                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => toggleSourceExpanded(index)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${
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
                      {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                    </button>
                    {expandedSources.has(index) && (
                      <div className="mt-2 space-y-1">
                        {message.sources.map((source, sourceIdx) => (
                          <div
                            key={sourceIdx}
                            className="text-xs bg-background border border-border rounded p-2"
                          >
                            <div className="font-medium text-foreground/80 mb-1">
                              {source.conversation_title}
                              <span className="ml-2 px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                                {Math.round(source.similarity * 100)}% match
                              </span>
                            </div>
                            <div className="text-muted-foreground line-clamp-3">
                              {source.chunk_text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground/70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {(isLoading || isIndexing) && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm">{isIndexing ? 'Indexing conversation...' : 'Analyzing...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 pb-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-muted/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this conversation..."
            disabled={isLoading || isIndexing}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="self-end px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}