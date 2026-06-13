-- Migration 028: Prevent duplicate initial saves of the same native chat per user
--
-- BEFORE APPLYING: verify no existing duplicates would violate the constraint:
--   SELECT chat_id, user_id, COUNT(*)
--   FROM conversations
--   WHERE chat_id IS NOT NULL AND parent_conversation_id IS NULL
--   GROUP BY chat_id, user_id
--   HAVING COUNT(*) > 1;
-- If any rows are returned, deduplicate them first.
--
-- We use a PARTIAL unique index rather than a plain UNIQUE constraint because
-- "Continue chat" saves legitimately create a second row with the same
-- (chat_id, user_id) pair — those rows always have parent_conversation_id set.
-- The WHERE clause excludes them so the constraint only blocks true duplicates.
--
-- PostgreSQL treats NULL as distinct in unique indexes, so rows where chat_id
-- IS NULL (conversations without a native chat ID) are unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_chat_per_user
  ON public.conversations (chat_id, user_id)
  WHERE parent_conversation_id IS NULL;
