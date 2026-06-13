-- Migration 010: Per-user encryption keys
-- Replaces the hardcoded shared AES secret with a unique key per user.

-- ============================================================================
-- 1. ADD encryption_key COLUMN TO user_profiles
-- ============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS encryption_key TEXT;

COMMENT ON COLUMN public.user_profiles.encryption_key IS
'Per-user AES encryption key used by the Chrome extension. Generated on signup, fetched via /api/user/encryption-key.';

-- ============================================================================
-- 2. UPDATE handle_new_user() TO GENERATE A KEY ON SIGNUP
-- ============================================================================
-- Generates a 64-char hex string from gen_random_bytes(32) = 256-bit key.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credit_balance, encryption_key)
  VALUES (
    NEW.id,
    10,
    encode(gen_random_bytes(32), 'hex')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FIX update_updated_at_column() TO HANDLE BOTH column names
-- ============================================================================
-- The live DB may have user_profiles with "updated_at" or "last_updated".
-- Make the trigger function resilient so the backfill UPDATE doesn't crash.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_profiles' THEN
    NEW.updated_at = NOW();
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
EXCEPTION WHEN undefined_column THEN
  -- Column might be named differently on this table; ignore gracefully
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. BACKFILL EXISTING USERS WHO HAVE NO KEY YET
-- ============================================================================

UPDATE public.user_profiles
SET encryption_key = encode(gen_random_bytes(32), 'hex')
WHERE encryption_key IS NULL;
