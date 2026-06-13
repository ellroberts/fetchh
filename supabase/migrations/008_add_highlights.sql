-- Create highlights table for Chrome extension sync
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Source information
  source_url TEXT NOT NULL,
  source_chat_id TEXT,
  source_title TEXT,
  source_platform TEXT NOT NULL,

  -- Highlight content
  highlighted_text TEXT NOT NULL,
  surrounding_context TEXT,
  message_role TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Future features
  tags TEXT[],
  notes TEXT,
  is_archived BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX highlights_user_id_idx ON highlights(user_id);
CREATE INDEX highlights_conversation_id_idx ON highlights(conversation_id);
CREATE INDEX highlights_source_chat_id_idx ON highlights(source_chat_id);
CREATE INDEX highlights_created_at_idx ON highlights(created_at DESC);

-- RLS policies
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own highlights"
  ON highlights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own highlights"
  ON highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights"
  ON highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON highlights FOR DELETE
  USING (auth.uid() = user_id);

-- Function to link highlights when a conversation is imported
CREATE OR REPLACE FUNCTION link_highlights_to_conversation(
  p_conversation_id UUID,
  p_source_chat_id TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE highlights
  SET
    conversation_id = p_conversation_id,
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND conversation_id IS NULL
    AND source_chat_id = p_source_chat_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
