-- Fix auth.uid() issue in match_conversation_chunks function
-- The SECURITY DEFINER function doesn't properly receive auth context from Next.js Route Handlers
-- Solution: Accept user_id as explicit parameter instead of relying on auth.uid()

CREATE OR REPLACE FUNCTION public.match_conversation_chunks(
  query_embedding vector(1536),
  conversation_ids UUID[],
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  requesting_user_id UUID DEFAULT NULL  -- NEW: explicit user_id parameter
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
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fallback to auth.uid()
  v_user_id := COALESCE(requesting_user_id, auth.uid());
  
  -- Security check: ensure we have a valid user_id
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User authentication required for vector search';
  END IF;

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
    ce.user_id = v_user_id  -- Use explicit variable instead of auth.uid()
    AND ce.conversation_id = ANY(conversation_ids)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_conversation_chunks IS
'Performs vector similarity search across specified conversations for RAG queries. Updated to accept explicit user_id parameter to fix auth context issues in Route Handlers.';