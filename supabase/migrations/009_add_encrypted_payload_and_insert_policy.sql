-- Migration 009: Add encrypted_payload column and INSERT RLS policy
-- Supports the new encrypted conversation format from the Chrome extension.

-- ============================================================================
-- 1. ADD encrypted_payload COLUMN
-- ============================================================================
-- Stores the full encrypted blob sent by the extension.
-- When present, content/messages will be NULL (data is opaque to the server).

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS encrypted_payload TEXT;

COMMENT ON COLUMN public.conversations.encrypted_payload IS
'Base64-encoded encrypted conversation payload from the Chrome extension. When set, content and messages are NULL.';

-- ============================================================================
-- 2. ENSURE RLS IS ENABLED ON conversations
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. ADD INSERT POLICY FOR AUTHENTICATED USERS
-- ============================================================================
-- Allows authenticated users to insert rows only when user_id matches their
-- own auth.uid(). This is required so that the anon-key client carrying the
-- user's JWT can perform inserts through RLS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
      AND policyname = 'Authenticated users can insert own conversations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can insert own conversations"
        ON public.conversations
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END
$$;

-- ============================================================================
-- 4. ADD SELECT POLICY (if missing) SO USERS CAN READ THEIR OWN ROWS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
      AND policyname = 'Users can view own conversations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can view own conversations"
        ON public.conversations
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END
$$;
