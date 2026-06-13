-- Migration: Add User Insights Cache
-- Stores pre-computed AI insights per user, refreshed on demand

CREATE TABLE IF NOT EXISTS user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    sample_items JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, insight_type)
);

CREATE INDEX idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX idx_user_insights_generated_at ON user_insights(generated_at DESC);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
    ON user_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
    ON user_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
    ON user_insights FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
    ON user_insights FOR DELETE
    USING (auth.uid() = user_id);
