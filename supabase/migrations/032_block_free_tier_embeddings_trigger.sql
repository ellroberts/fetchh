-- Block free-tier users from inserting into conversation_embeddings at the database level.
-- This is a belt-and-suspenders gate: application code also checks the tier, but
-- this trigger ensures embeddings can never be written for free users regardless
-- of which code path reaches the table.
--
-- BEFORE INSERT returning NULL silently drops the row without raising an error,
-- so fire-and-forget callers won't surface an exception to the end user.

CREATE OR REPLACE FUNCTION public.block_free_tier_embeddings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT subscription_tier INTO v_tier
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  IF v_tier IS NULL OR v_tier = 'free' THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER block_free_tier_embeddings
  BEFORE INSERT ON public.conversation_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.block_free_tier_embeddings();
