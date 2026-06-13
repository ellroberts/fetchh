-- ThreadCub RAG System Migration
-- This migration adds support for multi-conversation RAG (Retrieval Augmented Generation):
-- - Enables pgvector extension for vector similarity search
-- - Creates conversation_embeddings table for storing text chunks with embeddings
-- - Adds vector similarity search functions for RAG queries
-- - Adds RLS policies for secure multi-tenant access

-- ============================================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ============================================================================
-- pgvector provides vector similarity search capabilities for embeddings
-- Using vector(1536) to support OpenAI text-embedding-3-small

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. CREATE CONVERSATION_EMBEDDINGS TABLE
-- ============================================================================
-- Stores chunked conversation text with vector embeddings for RAG queries

CREATE TABLE IF NOT EXISTS public.conversation_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER, -- Approximate token count for the chunk

  -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536),

  -- Metadata for chunk context
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "message_indices": [0, 1, 2],  -- Which messages this chunk contains
  --   "roles": ["user", "assistant"], -- Roles in this chunk
  --   "start_message_index": 0,       -- First message index
  --   "end_message_index": 2,         -- Last message index
  --   "chunk_type": "conversation",   -- Type: conversation, summary, etc.
  --   "platform": "chatgpt"           -- Source platform
  -- }

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments describing the table and key columns
COMMENT ON TABLE public.conversation_embeddings IS
'Stores chunked conversation text with vector embeddings for RAG-based multi-conversation analysis';

COMMENT ON COLUMN public.conversation_embeddings.embedding IS
'1536-dimensional vector from OpenAI text-embedding-3-small for semantic similarity search';

COMMENT ON COLUMN public.conversation_embeddings.chunk_text IS
'Text content of the chunk, typically 500-1000 tokens of conversation messages';

COMMENT ON COLUMN public.conversation_embeddings.metadata IS
'JSON metadata including message indices, roles, platform, and chunk context information';

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding all chunks of a conversation
CREATE INDEX idx_conversation_embeddings_conversation_id
  ON public.conversation_embeddings(conversation_id);

-- Index for user-based queries (RLS performance)
CREATE INDEX idx_conversation_embeddings_user_id
  ON public.conversation_embeddings(user_id);

-- Index for ordering chunks
CREATE INDEX idx_conversation_embeddings_chunk_index
  ON public.conversation_embeddings(conversation_id, chunk_index);

-- Vector similarity search index using IVFFlat
-- Lists = number of partitions (sqrt of expected rows is a good default)
-- Adjust lists parameter based on expected data volume
CREATE INDEX idx_conversation_embeddings_vector
  ON public.conversation_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Composite index for timestamp queries
CREATE INDEX idx_conversation_embeddings_created_at
  ON public.conversation_embeddings(created_at DESC);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.conversation_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own embeddings
CREATE POLICY "Users can view own conversation embeddings"
  ON public.conversation_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own embeddings
CREATE POLICY "Users can insert own conversation embeddings"
  ON public.conversation_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own embeddings
CREATE POLICY "Users can update own conversation embeddings"
  ON public.conversation_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own embeddings
CREATE POLICY "Users can delete own conversation embeddings"
  ON public.conversation_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE EMBEDDING STATUS TABLE
-- ============================================================================
-- Track embedding generation status for conversations

CREATE TABLE IF NOT EXISTS public.conversation_embedding_status (
  conversation_id UUID PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'outdated')),
  total_chunks INTEGER DEFAULT 0,
  chunks_processed INTEGER DEFAULT 0,
  error_message TEXT,

  -- Metadata
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  total_tokens_embedded INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.conversation_embedding_status IS
'Tracks the status of embedding generation for each conversation';

-- Indexes for status table
CREATE INDEX idx_embedding_status_user_id
  ON public.conversation_embedding_status(user_id);

CREATE INDEX idx_embedding_status_status
  ON public.conversation_embedding_status(status);

-- Enable RLS
ALTER TABLE public.conversation_embedding_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embedding status"
  ON public.conversation_embedding_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embedding status"
  ON public.conversation_embedding_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own embedding status"
  ON public.conversation_embedding_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own embedding status"
  ON public.conversation_embedding_status FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. CREATE VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================================================
-- Function to find similar chunks across multiple conversations

CREATE OR REPLACE FUNCTION public.match_conversation_chunks(
  query_embedding vector(1536),
  conversation_ids UUID[],
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.conversation_id,
    ce.chunk_text,
    ce.chunk_index,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM public.conversation_embeddings ce
  WHERE
    ce.user_id = auth.uid()
    AND ce.conversation_id = ANY(conversation_ids)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_conversation_chunks IS
'Performs vector similarity search across specified conversations for RAG queries. Returns chunks ordered by similarity.';

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get embedding statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_embedding_stats(target_user_id UUID)
RETURNS TABLE (
  total_conversations_embedded BIGINT,
  total_chunks BIGINT,
  total_tokens BIGINT,
  conversations_pending BIGINT,
  conversations_processing BIGINT,
  conversations_failed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: users can only query their own stats
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only view your own statistics';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(CASE WHEN ces.status = 'completed' THEN 1 END)::BIGINT AS total_conversations_embedded,
    COALESCE(SUM(ces.total_chunks), 0)::BIGINT AS total_chunks,
    COALESCE(SUM(ces.total_tokens_embedded), 0)::BIGINT AS total_tokens,
    COUNT(CASE WHEN ces.status = 'pending' THEN 1 END)::BIGINT AS conversations_pending,
    COUNT(CASE WHEN ces.status = 'processing' THEN 1 END)::BIGINT AS conversations_processing,
    COUNT(CASE WHEN ces.status = 'failed' THEN 1 END)::BIGINT AS conversations_failed
  FROM public.conversation_embedding_status ces
  WHERE ces.user_id = target_user_id;
END;
$$;

-- Function to delete embeddings for a conversation (useful for re-embedding)
CREATE OR REPLACE FUNCTION public.delete_conversation_embeddings(target_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the conversation's user_id to verify ownership
  SELECT user_id INTO v_user_id
  FROM public.conversations
  WHERE id = target_conversation_id;

  -- Security check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF auth.uid() != v_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only delete your own embeddings';
  END IF;

  -- Delete embeddings
  DELETE FROM public.conversation_embeddings
  WHERE conversation_id = target_conversation_id;

  -- Reset status
  DELETE FROM public.conversation_embedding_status
  WHERE conversation_id = target_conversation_id;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 8. UPDATE CONVERSATIONS TABLE
-- ============================================================================
-- Add column to track if conversation has been embedded

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS has_embeddings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_embedded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.conversations.has_embeddings IS
'Whether this conversation has been processed for RAG embeddings';

COMMENT ON COLUMN public.conversations.last_embedded_at IS
'Timestamp of when embeddings were last generated for this conversation';

-- Index for filtering conversations with embeddings
CREATE INDEX IF NOT EXISTS idx_conversations_has_embeddings
  ON public.conversations(has_embeddings);

-- ============================================================================
-- 9. CREATE RAG CHAT SESSIONS TABLE (Optional - for conversation history)
-- ============================================================================
-- Store multi-chat analysis sessions for follow-up questions

CREATE TABLE IF NOT EXISTS public.rag_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Selected conversations for this session
  conversation_ids UUID[] NOT NULL,

  -- Chat history
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Expected structure: [{ "role": "user"|"assistant", "content": "...", "timestamp": "...", "sources": [...] }]

  -- Session metadata
  title TEXT,
  total_messages INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.rag_chat_sessions IS
'Stores multi-conversation RAG chat sessions with message history and source tracking';

-- Indexes
CREATE INDEX idx_rag_chat_sessions_user_id
  ON public.rag_chat_sessions(user_id);

CREATE INDEX idx_rag_chat_sessions_last_message
  ON public.rag_chat_sessions(last_message_at DESC);

-- Enable RLS
ALTER TABLE public.rag_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own RAG sessions"
  ON public.rag_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RAG sessions"
  ON public.rag_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RAG sessions"
  ON public.rag_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RAG sessions"
  ON public.rag_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_embedding_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_embedding_status_updated_at
  BEFORE UPDATE ON public.conversation_embedding_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_embedding_status_updated_at();

CREATE TRIGGER update_conversation_embeddings_updated_at
  BEFORE UPDATE ON public.conversation_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_embedding_status_updated_at();

CREATE TRIGGER update_rag_chat_sessions_updated_at
  BEFORE UPDATE ON public.rag_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_embedding_status_updated_at();

-- ============================================================================
-- 11. ADD CREDIT PRICING FOR RAG OPERATIONS (Optional)
-- ============================================================================
-- Add pricing tiers for RAG-specific operations

INSERT INTO public.credit_pricing (
  id,
  operation_type,
  credits_required,
  description,
  min_threshold,
  max_threshold,
  is_active
) VALUES
  (gen_random_uuid(), 'rag_embedding_generation', 0, 'Generate embeddings for conversation (free)', NULL, NULL, TRUE),
  (gen_random_uuid(), 'rag_multi_chat_query', 1, 'Query across multiple conversations using RAG', NULL, NULL, TRUE)
ON CONFLICT (operation_type) DO UPDATE SET
  credits_required = EXCLUDED.credits_required,
  description = EXCLUDED.description;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- 1. Enabled pgvector extension for vector similarity search
-- 2. Created conversation_embeddings table with 1536-dim vectors
-- 3. Created conversation_embedding_status table for tracking
-- 4. Added RLS policies for all new tables
-- 5. Created match_conversation_chunks function for RAG queries
-- 6. Added helper functions for stats and maintenance
-- 7. Updated conversations table with embedding tracking columns
-- 8. Created rag_chat_sessions table for conversation history
-- 9. Added triggers for automatic timestamp updates
-- 10. Added credit pricing for RAG operations
