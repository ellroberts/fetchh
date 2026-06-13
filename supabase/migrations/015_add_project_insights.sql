-- Migration 012: Add project_insights table
-- Documents an existing table created directly in Supabase.
-- project_insights stores user-pinned RAG responses scoped to a project.

CREATE TABLE IF NOT EXISTS public.project_insights (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id             TEXT NOT NULL,
  content                TEXT NOT NULL,
  tag                    TEXT NOT NULL,
  source_conversation_ids UUID[] DEFAULT '{}',
  rag_query              TEXT,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_insights_user_id    ON public.project_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_project_insights_project_id ON public.project_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_project_insights_created_at ON public.project_insights(created_at DESC);

-- Row Level Security
ALTER TABLE public.project_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project insights"
  ON public.project_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project insights"
  ON public.project_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project insights"
  ON public.project_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project insights"
  ON public.project_insights FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_project_insights_updated_at
  BEFORE UPDATE ON public.project_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_insights TO authenticated;
