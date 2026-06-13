-- Script to retroactively detect platforms for existing conversations
-- Run this in Supabase SQL Editor to update all conversations with 'unknown' platform

-- Update ChatGPT conversations (have 'mapping' in content)
UPDATE conversations
SET
  platform = 'chatgpt',
  source = 'chatgpt',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{platform_detection}',
    '"retroactive"'
  )
WHERE
  (platform = 'unknown' OR platform IS NULL)
  AND content::text LIKE '%"mapping"%';

-- Update Claude conversations (have 'uuid' or 'sender' in content)
UPDATE conversations
SET
  platform = 'claude',
  source = 'claude',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{platform_detection}',
    '"retroactive"'
  )
WHERE
  (platform = 'unknown' OR platform IS NULL)
  AND (
    content::text LIKE '%"uuid"%'
    OR content::text LIKE '%"sender":"human"%'
    OR content::text LIKE '%"sender":"assistant"%'
  );

-- Update Gemini conversations (have 'candidates' in content)
UPDATE conversations
SET
  platform = 'gemini',
  source = 'gemini',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{platform_detection}',
    '"retroactive"'
  )
WHERE
  (platform = 'unknown' OR platform IS NULL)
  AND content::text LIKE '%"candidates"%';

-- Show summary of what was updated
SELECT
  platform,
  COUNT(*) as conversation_count
FROM conversations
GROUP BY platform
ORDER BY conversation_count DESC;
