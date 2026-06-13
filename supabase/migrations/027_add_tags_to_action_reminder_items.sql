-- Migration 027: Add tags column to action_items and reminder_items
-- Mirrors the TEXT[] tags pattern used by the highlights table.
-- Safe to re-run: uses IF NOT EXISTS / column existence check.

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE public.reminder_items
  ADD COLUMN IF NOT EXISTS tags TEXT[];
