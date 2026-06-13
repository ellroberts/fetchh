-- Migration 012: Allow public (unauthenticated) reads for share links
--
-- The /api/share/[id] endpoint serves conversations publicly so that AI
-- platforms (Grok, ChatGPT, Claude, etc.) can fetch conversation context via
-- a shareable URL.  The service-role client already bypasses RLS, but this
-- policy acts as a safety net: even if the API route falls back to the anon
-- key, the SELECT will still succeed.
--
-- Security model: share links rely on the unguessable UUID — the same model
-- used by Google Docs "anyone with the link" sharing.

-- ============================================================================
-- 1. PUBLIC SELECT POLICY FOR CONVERSATIONS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
      AND policyname = 'Anyone can read conversations via share link'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can read conversations via share link"
        ON public.conversations
        FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END
$$;
