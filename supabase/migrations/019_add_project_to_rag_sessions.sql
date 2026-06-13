-- Add project_name and project_id to rag_sessions
-- This lets the history view show which project a session belongs to
-- and detect when a project has since been removed.

ALTER TABLE public.rag_sessions
  ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID DEFAULT NULL;
