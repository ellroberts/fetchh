-- Migration: Add User Onboarding Checklist Table
-- Tracks per-user progress through the getting-started steps.
-- Must be accessible to all authenticated users regardless of plan.

CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    imported_thread BOOLEAN NOT NULL DEFAULT FALSE,
    saved_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    tried_rag       BOOLEAN NOT NULL DEFAULT FALSE,
    created_project BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ
);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own onboarding row"
    ON user_onboarding FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding row"
    ON user_onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding row"
    ON user_onboarding FOR UPDATE
    USING (auth.uid() = user_id);
