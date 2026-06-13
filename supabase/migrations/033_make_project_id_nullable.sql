-- Migration 033: Make project_id nullable on action_items and reminder_items
--
-- Allows the Chrome extension to write pawmarks without requiring a project.
-- Items created without a project_id are considered unassigned.

ALTER TABLE public.action_items ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.reminder_items ALTER COLUMN project_id DROP NOT NULL;
