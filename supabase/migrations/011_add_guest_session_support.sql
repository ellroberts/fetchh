-- Migration 011: Guest / anonymous session support
-- Allows unauthenticated extension users to save conversations with a
-- session_id instead of a user_id.

-- ============================================================================
-- 1. ADD session_id COLUMN
-- ============================================================================

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS session_id TEXT;

COMMENT ON COLUMN public.conversations.session_id IS
'Client-generated session identifier for guest (unauthenticated) saves. Stored in chrome.storage.local by the extension.';

CREATE INDEX IF NOT EXISTS idx_conversations_session_id
  ON public.conversations (session_id)
  WHERE session_id IS NOT NULL;

-- ============================================================================
-- 2. MAKE user_id NULLABLE
-- ============================================================================
-- Existing rows all have a user_id; guest rows will have user_id = NULL.

ALTER TABLE public.conversations
ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- 3. ADD RLS POLICY FOR ANONYMOUS INSERTS
-- ============================================================================
-- The service-role client is used for guest inserts, so this policy targets
-- the anon role with a simple check: user_id must be NULL and session_id
-- must be provided.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
      AND policyname = 'Guest users can insert with session_id'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Guest users can insert with session_id"
        ON public.conversations
        FOR INSERT
        TO anon
        WITH CHECK (user_id IS NULL AND session_id IS NOT NULL)
    $policy$;
  END IF;
END
$$;
