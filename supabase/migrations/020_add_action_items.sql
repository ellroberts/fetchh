-- Migration 020: Add action_items table for RAG-generated action detection
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS

CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  source_chunk TEXT,
  source_conversation_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_items_select_own" ON public.action_items;
CREATE POLICY "action_items_select_own" ON public.action_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_items_insert_own" ON public.action_items;
CREATE POLICY "action_items_insert_own" ON public.action_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_items_update_own" ON public.action_items;
CREATE POLICY "action_items_update_own" ON public.action_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_items_delete_own" ON public.action_items;
CREATE POLICY "action_items_delete_own" ON public.action_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS action_items_project_id_idx ON public.action_items(project_id);
CREATE INDEX IF NOT EXISTS action_items_user_id_idx ON public.action_items(user_id);
