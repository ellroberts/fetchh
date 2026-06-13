// lib/rag-embeddings.ts
// OpenAI embedding generation utilities for RAG system

import OpenAI from 'openai';
import {
  EmbeddingModel,
  EMBEDDING_CONFIGS,
  DEFAULT_EMBEDDING_MODEL,
  TextChunk,
} from './rag-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(
  text: string,
  model: EmbeddingModel = DEFAULT_EMBEDDING_MODEL
): Promise<number[]> {
  const config = EMBEDDING_CONFIGS[model];

  const response = await openai.embeddings.create({
    model: config.model,
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple text strings in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  model: EmbeddingModel = DEFAULT_EMBEDDING_MODEL
): Promise<number[][]> {
  const config = EMBEDDING_CONFIGS[model];
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: config.model,
      input: batch,
      encoding_format: 'float',
    });

    const sortedEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);

    results.push(...sortedEmbeddings);
  }

  return results;
}

/**
 * Generate embeddings for text chunks.
 *
 * Uses chunk.embedding_text (context header + messages) for the OpenAI call
 * to get better quality vectors, but stores chunk.text (clean messages only)
 * as chunk_text in the DB so source previews are readable.
 */
export async function generateChunkEmbeddings(
  chunks: TextChunk[],
  model: EmbeddingModel = DEFAULT_EMBEDDING_MODEL,
  onProgress?: (processed: number, total: number) => void
): Promise<{ embeddings: number[][]; totalTokensUsed: number }> {
  const embeddings: number[][] = [];
  let totalTokensUsed = 0;

  console.log(`🔄 Generating embeddings for ${chunks.length} chunks individually...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Use embedding_text if available (includes context header for better vectors)
    // Fall back to chunk.text if not set
    const inputText = chunk.embedding_text || chunk.text;

    console.log(`📊 Processing chunk ${i + 1}/${chunks.length} (est. ${chunk.token_count} tokens)`);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_CONFIGS[model].model,
        input: inputText,
        encoding_format: 'float',
      });

      totalTokensUsed += response.usage.total_tokens;
      embeddings.push(response.data[0].embedding);

      if (onProgress) {
        onProgress(i + 1, chunks.length);
      }

      console.log(`✅ Chunk ${i + 1}/${chunks.length} complete (${response.usage.total_tokens} tokens)`);

      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`❌ Failed to generate embedding for chunk ${i + 1}:`, error.message);
      throw error;
    }
  }

  console.log(`✅ All ${chunks.length} chunks embedded, total tokens: ${totalTokensUsed}`);
  return { embeddings, totalTokensUsed };
}

/**
 * Store embeddings in the database.
 * Stores chunk.text (clean content) as chunk_text — no metadata prefix.
 */
export async function storeEmbeddings(
  supabase: any,
  conversationId: string,
  userId: string,
  chunks: TextChunk[],
  embeddings: number[][]
): Promise<void> {
  const records = chunks.map((chunk, index) => ({
    conversation_id: conversationId,
    user_id: userId,
    chunk_text: chunk.text, // Clean text only — no [Conversation:...] prefix
    chunk_index: index,
    token_count: chunk.token_count,
    embedding: embeddings[index],
    metadata: chunk.metadata,
  }));

  console.log('💾 Storing embeddings...');
  console.log(`  - Total records: ${records.length}`);

  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    console.log(`  - Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`);

    const { error } = await supabase
      .from('conversation_embeddings')
      .insert(batch);

    if (error) {
      console.error('❌ Insert error:', error);
      throw new Error(`Failed to store embeddings: ${error.message}`);
    }

    console.log(`  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} inserted successfully`);
  }

  console.log(`✅ All ${records.length} embeddings stored successfully`);
}

/**
 * Update embedding status in the database
 */
export async function updateEmbeddingStatus(
  supabase: any,
  conversationId: string,
  userId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'outdated',
  details: {
    total_chunks?: number;
    chunks_processed?: number;
    error_message?: string;
    total_tokens_embedded?: number;
    started_at?: string;
    completed_at?: string;
  } = {}
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
    ...details,
  };

  const { data: existing } = await supabase
    .from('conversation_embedding_status')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('conversation_embedding_status')
      .update(updateData)
      .eq('conversation_id', conversationId);

    if (error) throw new Error(`Failed to update embedding status: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('conversation_embedding_status')
      .insert({ conversation_id: conversationId, user_id: userId, ...updateData });

    if (error) throw new Error(`Failed to create embedding status: ${error.message}`);
  }
}

/**
 * Delete existing embeddings for a conversation (before re-embedding)
 */
export async function deleteExistingEmbeddings(
  supabase: any,
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversation_embeddings')
    .delete()
    .eq('conversation_id', conversationId);

  if (error) throw new Error(`Failed to delete existing embeddings: ${error.message}`);
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function estimateEmbeddingCost(
  totalTokens: number,
  model: EmbeddingModel = DEFAULT_EMBEDDING_MODEL
): number {
  const pricing: Record<EmbeddingModel, number> = {
    'text-embedding-3-small': 0.02,
    'text-embedding-3-large': 0.13,
    'text-embedding-ada-002': 0.10,
  };

  return (totalTokens / 1_000_000) * pricing[model];
}