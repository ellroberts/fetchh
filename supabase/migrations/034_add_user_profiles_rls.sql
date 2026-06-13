-- Migration 034: Grant access and add RLS policies on user_profiles
--
-- Two distinct problems were preventing authenticated users from reading
-- their own profile row via the browser (anon) client:
--
--   1. The 'authenticated' role had no GRANT on user_profiles — so the role
--      could not even attempt to access the table, regardless of RLS.
--
--   2. No RLS SELECT policy existed for authenticated users — so even with
--      a GRANT, the row-level filter blocked every read.
--
-- Both must be fixed together. Safe to re-run.

-- ── 1. Grant table-level access to the authenticated role ────────────────────

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- ── 2. Enable RLS and add per-row policies ───────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
