// lib/embed-conversation.ts
// Shared utility — call directly instead of HTTP to /api/embeddings/generate

import { createClient } from '@supabase/supabase-js'
import { processConversationForEmbedding, extractMessages } from './rag-chunking'
import { generateChunkEmbeddings, storeEmbeddings, deleteExistingEmbeddings } from './rag-embeddings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function embedConversation(conversationId: string): Promise<void> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, title, content, messages, summary, platform, source, user_id')
    .eq('id', conversationId)
    .single()

  if (error || !conversation) throw new Error('Conversation not found')

  const parsedContent = typeof conversation.content === 'string'
    ? (() => { try { return JSON.parse(conversation.content) } catch { return {} } })()
    : (conversation.content || {})

  const parsedConversation = { ...conversation, content: parsedContent }
  const messages = extractMessages(parsedConversation)

  if (messages.length === 0) throw new Error('No messages found in conversation')

  const platform = conversation.platform || conversation.source || 'unknown'
  const chunks = processConversationForEmbedding(messages, conversation.title || 'Untitled', platform)
  const { embeddings } = await generateChunkEmbeddings(chunks)

  await deleteExistingEmbeddings(supabase, conversationId)
  await storeEmbeddings(supabase, conversationId, conversation.user_id, chunks, embeddings)

  await supabase
    .from('conversations')
    .update({ has_embeddings: true, last_embedded_at: new Date().toISOString() })
    .eq('id', conversationId)

  console.log(`✅ Embedded conversation: ${conversationId} (${chunks.length} chunks)`)
}