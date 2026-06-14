-- Migration 036: Create digest_signups table for Niche Digest signup capture

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.digest_signups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  channels   text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE public.digest_signups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. INSERT POLICY — anonymous users (public signup, no auth required)
-- ============================================================================
-- The API route uses the service-role key which bypasses RLS entirely.
-- This policy exists as a safety net if the anon key is ever used directly.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'digest_signups'
      AND policyname = 'Anyone can insert a signup'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can insert a signup"
        ON public.digest_signups
        FOR INSERT
        TO anon
        WITH CHECK (true)
    $policy$;
  END IF;
END
$$;
