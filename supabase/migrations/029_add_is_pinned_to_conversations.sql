-- Migration 029: Add is_pinned flag to conversations
--
-- Allows users to pin conversations so they always appear at the
-- top of the Chats page in a dedicated PINNED section.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL;
