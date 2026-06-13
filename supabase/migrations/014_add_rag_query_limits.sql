-- ============================================================================
-- Migration 011: Monthly RAG Query Limits
-- Switches from daily to monthly query allowances per pricing model:
--   Free     →    25 queries/month
--   Starter  →   400 queries/month
--   Pro      →   800 queries/month
--   Unlimited → 1,250 queries/month
-- ============================================================================

-- ── 1. Fix subscription_tier constraint (add starter + unlimited) ───────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'starter', 'pro', 'unlimited', 'enterprise'));

-- ── 2. Add RAG query tracking columns to user_profiles ─────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS rag_queries_this_period INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rag_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ── 3. Create the RPC function ──────────────────────────────────────────────
-- Returns TRUE if query is allowed (and increments counter)
-- Returns FALSE if monthly limit is reached
-- Auto-resets counter if 30 days have passed since rag_period_start

CREATE OR REPLACE FUNCTION public.check_and_increment_rag_query(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier          TEXT;
  v_queries_used  INTEGER;
  v_period_start  TIMESTAMP WITH TIME ZONE;
  v_limit         INTEGER;
BEGIN
  -- Fetch current profile state
  SELECT
    subscription_tier,
    rag_queries_this_period,
    rag_period_start
  INTO
    v_tier,
    v_queries_used,
    v_period_start
  FROM public.user_profiles
  WHERE id = p_user_id;

  -- If no profile found, deny
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Reset period if 30 days have elapsed
  IF v_period_start IS NULL OR NOW() > v_period_start + INTERVAL '30 days' THEN
    UPDATE public.user_profiles
    SET
      rag_queries_this_period = 0,
      rag_period_start        = NOW(),
      updated_at              = NOW()
    WHERE id = p_user_id;

    v_queries_used := 0;
  END IF;

  -- Determine limit for this tier
  v_limit := CASE v_tier
    WHEN 'starter'   THEN 400
    WHEN 'pro'       THEN 800
    WHEN 'unlimited' THEN 1250
    WHEN 'enterprise'THEN 1250
    ELSE 25  -- free (and any unknown tier)
  END;

  -- Deny if at limit
  IF v_queries_used >= v_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment and allow
  UPDATE public.user_profiles
  SET
    rag_queries_this_period = rag_queries_this_period + 1,
    updated_at              = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Index for fast lookups ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_rag_period
  ON public.user_profiles(id, rag_period_start);

-- ── 5. Grant execute to authenticated users ─────────────────────────────────
GRANT EXECUTE ON FUNCTION public.check_and_increment_rag_query(UUID) TO authenticated;
