// lib/embed-library-doc.ts
import { createClient } from '@supabase/supabase-js'
import { generateChunkEmbeddings } from './rag-embeddings'
import { DEFAULT_EMBEDDING_MODEL } from './rag-types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_CHUNK_TOKENS = 400
const OVERLAP_TOKENS = 50

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function chunkText(text: string, docTitle: string): Array<{ text: string; embedding_text: string; token_count: number; index: number }> {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const chunks: Array<{ text: string; embedding_text: string; token_count: number; index: number }> = []
  let current = ''
  let chunkIndex = 0

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para
    if (estimateTokens(candidate) > MAX_CHUNK_TOKENS && current) {
      chunks.push({
        text: current,
        embedding_text: `Document: ${docTitle}\n\n${current}`,
        token_count: estimateTokens(current),
        index: chunkIndex++,
      })
      // Overlap: keep last paragraph
      const lines = current.split('\n\n')
      current = lines.slice(-OVERLAP_TOKENS).join('\n\n') + '\n\n' + para
    } else {
      current = candidate
    }
  }

  if (current.trim()) {
    chunks.push({
      text: current.trim(),
      embedding_text: `Document: ${docTitle}\n\n${current.trim()}`,
      token_count: estimateTokens(current.trim()),
      index: chunkIndex,
    })
  }

  return chunks
}

export async function embedLibraryDoc(libraryDocId: string): Promise<void> {
  const { data: doc, error } = await supabase
    .from('library_documents')
    .select('id, title, content, user_id')
    .eq('id', libraryDocId)
    .single()

  if (error || !doc) throw new Error(`Library doc not found: ${libraryDocId}`)

  const chunks = chunkText(doc.content || '', doc.title || 'Untitled')
  if (chunks.length === 0) throw new Error('No content to embed')

  const ragChunks = chunks.map(c => ({
    text: c.text,
    embedding_text: c.embedding_text,
    token_count: c.token_count,
    metadata: { chunk_index: c.index, doc_title: doc.title } as any,
  }))

  const { embeddings } = await generateChunkEmbeddings(ragChunks)

  // Delete existing embeddings for this doc
  await supabase.from('library_embeddings').delete().eq('library_doc_id', libraryDocId)

  const records = chunks.map((chunk, i) => ({
    library_doc_id: libraryDocId,
    user_id: doc.user_id,
    chunk_text: chunk.text,
    chunk_index: chunk.index,
    token_count: chunk.token_count,
    embedding: embeddings[i],
    metadata: { doc_title: doc.title },
  }))

  const { error: insertError } = await supabase
    .from('library_embeddings')
    .insert(records)

  if (insertError) throw new Error(`Failed to store library embeddings: ${insertError.message}`)

  console.log(`✅ Embedded library doc: ${libraryDocId} (${chunks.length} chunks)`)
}
