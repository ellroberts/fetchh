-- Migration 021: Add reminder_items table for RAG-generated workflow/process reminders
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS

CREATE TABLE IF NOT EXISTS public.reminder_items (
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

ALTER TABLE public.reminder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_items_select_own" ON public.reminder_items;
CREATE POLICY "reminder_items_select_own" ON public.reminder_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminder_items_insert_own" ON public.reminder_items;
CREATE POLICY "reminder_items_insert_own" ON public.reminder_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminder_items_update_own" ON public.reminder_items;
CREATE POLICY "reminder_items_update_own" ON public.reminder_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminder_items_delete_own" ON public.reminder_items;
CREATE POLICY "reminder_items_delete_own" ON public.reminder_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminder_items_project_id_idx ON public.reminder_items(project_id);
CREATE INDEX IF NOT EXISTS reminder_items_user_id_idx ON public.reminder_items(user_id);
