-- Migration 025: Add display_name to user_profiles
-- Used by the onboarding "Say hi to Coda" step so users can set
-- a preferred name without creating a separate table.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;
