-- Migration: Add Pinned Insights for Conversational Page Building
-- Description: Allows users to pin RAG chat responses to build customized insight pages

-- Create pinned_insights table
CREATE TABLE IF NOT EXISTS pinned_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL CHECK (section_type IN ('summary', 'decisions', 'actions', 'insights', 'problems', 'custom')),
    custom_title TEXT,
    content TEXT NOT NULL,
    display_style TEXT NOT NULL DEFAULT 'card' CHECK (display_style IN ('card', 'list', 'highlight', 'collapsed')),
    "order" INTEGER NOT NULL DEFAULT 0,
    source_question TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_pinned_insights_conversation_id ON pinned_insights(conversation_id);
CREATE INDEX idx_pinned_insights_user_id ON pinned_insights(user_id);
CREATE INDEX idx_pinned_insights_order ON pinned_insights("order");
CREATE INDEX idx_pinned_insights_created_at ON pinned_insights(created_at DESC);

-- Enable Row Level Security
ALTER TABLE pinned_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own pinned insights
CREATE POLICY "Users can view own pinned insights"
    ON pinned_insights
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own pinned insights
CREATE POLICY "Users can insert own pinned insights"
    ON pinned_insights
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own pinned insights
CREATE POLICY "Users can update own pinned insights"
    ON pinned_insights
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own pinned insights
CREATE POLICY "Users can delete own pinned insights"
    ON pinned_insights
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pinned_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row updates
CREATE TRIGGER trigger_update_pinned_insights_updated_at
    BEFORE UPDATE ON pinned_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_pinned_insights_updated_at();

-- Add comment for documentation
COMMENT ON TABLE pinned_insights IS 'Stores pinned RAG chat responses for building customized insight pages per conversation';
COMMENT ON COLUMN pinned_insights.section_type IS 'Type of section: summary, decisions, actions, insights, problems, or custom';
COMMENT ON COLUMN pinned_insights.display_style IS 'How the insight should be displayed: card, list, highlight, or collapsed';
COMMENT ON COLUMN pinned_insights."order" IS 'Display order for the pinned insight (lower numbers appear first)';
COMMENT ON COLUMN pinned_insights.source_question IS 'The original RAG chat question that generated this insight';
