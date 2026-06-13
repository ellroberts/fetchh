-- ============================================================================
-- Migration 031: Block free tier from RAG queries entirely
--   Free tier limit changed from 20 → 0 (no RAG access)
--   All paid tiers unchanged.
-- ============================================================================

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

  -- Determine limit for this tier (free = 0, no access)
  v_limit := CASE v_tier
    WHEN 'starter'    THEN 150
    WHEN 'pro'        THEN 400
    WHEN 'unlimited'  THEN 800
    WHEN 'enterprise' THEN 800
    ELSE 0  -- free (and any unknown tier): no RAG access
  END;

  -- Deny if at limit (or if limit is 0)
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

GRANT EXECUTE ON FUNCTION public.check_and_increment_rag_query(UUID) TO authenticated;
