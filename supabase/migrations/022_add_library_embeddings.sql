-- Library embeddings table
CREATE TABLE IF NOT EXISTS library_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_doc_id UUID NOT NULL REFERENCES library_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS library_embeddings_doc_idx ON library_embeddings(library_doc_id);
CREATE INDEX IF NOT EXISTS library_embeddings_user_idx ON library_embeddings(user_id);

ALTER TABLE library_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own library embeddings"
  ON library_embeddings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION match_library_chunks(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  library_doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  library_doc_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.library_doc_id,
    le.chunk_text,
    le.chunk_index,
    le.metadata,
    1 - (le.embedding <=> query_embedding) AS similarity
  FROM library_embeddings le
  WHERE
    le.user_id = auth.uid()
    AND (library_doc_ids IS NULL OR le.library_doc_id = ANY(library_doc_ids))
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
