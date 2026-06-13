-- Migration 030: Add is_pinned flag to highlights, action_items, reminder_items
--
-- Allows users to pin individual highlights, actions, and reminders so they
-- float to the top of their respective tab lists.

ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE public.reminder_items
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS highlights_is_pinned_idx    ON public.highlights(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS action_items_is_pinned_idx  ON public.action_items(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS reminder_items_is_pinned_idx ON public.reminder_items(user_id, is_pinned);
