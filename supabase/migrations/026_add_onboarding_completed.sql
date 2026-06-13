-- Migration 026: Add onboarding_completed to user_profiles
-- Tracks whether the new user onboarding modal flow has been completed.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
