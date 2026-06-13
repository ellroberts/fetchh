-- ============================================================================
-- Migration: Remove credit system
-- The credit-based purchase system has been replaced by subscription tiers.
-- RAG query limits are now tracked via rag_queries_this_period on user_profiles.
-- ============================================================================

-- ── Drop credit tables ──────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.credit_pricing CASCADE;

-- ── Drop credit functions ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.calculate_required_credits(INTEGER);
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, INTEGER, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT, JSONB);

-- ── Drop credit columns from user_profiles ──────────────────────────────────
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS credit_balance,
  DROP COLUMN IF EXISTS total_credits_purchased,
  DROP COLUMN IF EXISTS total_credits_spent;

-- ── Drop credits_used column from conversations ─────────────────────────────
ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS credits_used;
