-- Migration: Fix RLS policies on user_onboarding
-- Safe to re-run: drops policies before recreating them so this works
-- whether the table was created manually (before 023) or via migration.

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own onboarding row" ON user_onboarding;
DROP POLICY IF EXISTS "Users can insert own onboarding row" ON user_onboarding;
DROP POLICY IF EXISTS "Users can update own onboarding row" ON user_onboarding;

CREATE POLICY "Users can select own onboarding row"
    ON user_onboarding FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding row"
    ON user_onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding row"
    ON user_onboarding FOR UPDATE
    USING (auth.uid() = user_id);
