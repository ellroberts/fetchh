// lib/rag-search.ts
// Vector similarity search utilities for RAG system

import { generateEmbedding } from './rag-embeddings';
import {
  VectorSearchResult,
  RagSource,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_MAX_CHUNKS,
  DEFAULT_EMBEDDING_MODEL,
} from './rag-types';

/**
 * Simple synonym dictionary for query expansion
 * Expands common terms to catch more relevant chunks
 */
const SYNONYMS: Record<string, string[]> = {
  shortcut: ['hotkey', 'keybinding', 'key combination', 'keyboard shortcut'],
  hotkey: ['shortcut', 'keybinding', 'key combination'],
  error: ['bug', 'issue', 'problem', 'exception', 'failure'],
  bug: ['error', 'issue', 'problem', 'defect'],
  fix: ['resolve', 'solution', 'patch', 'repair'],
  build: ['compile', 'deploy', 'run', 'execute'],
  deploy: ['launch', 'release', 'publish', 'ship'],
  function: ['method', 'procedure', 'fn', 'func'],
  component: ['widget', 'element', 'module'],
  style: ['css', 'design', 'theme', 'appearance'],
  database: ['db', 'supabase', 'storage', 'table'],
  user: ['account', 'profile', 'person'],
  search: ['query', 'find', 'lookup', 'filter'],
  image: ['photo', 'picture', 'screenshot', 'graphic'],
  file: ['document', 'attachment', 'upload'],
  code: ['script', 'snippet', 'implementation'],
  test: ['spec', 'check', 'verify', 'validate'],
};

/**
 * Expand query terms using synonym dictionary
 */
function expandQueryWithSynonyms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  const expanded = new Set<string>(terms);

  for (const term of terms) {
    const synonyms = SYNONYMS[term];
    if (synonyms) {
      for (const syn of synonyms) {
        syn.split(' ').forEach(w => w.length > 2 && expanded.add(w));
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Re-rank search results using Cohere Rerank API
 * Takes merged vector + keyword results and re-scores them for relevance
 */
async function rerankWithCohere(
  query: string,
  chunks: VectorSearchResult[],
  topN: number = 10
): Promise<VectorSearchResult[]> {
  const apiKey = process.env.COHERE_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ COHERE_API_KEY not set — skipping re-ranking');
    return chunks;
  }

  if (chunks.length === 0) {
    return chunks;
  }

  console.log(`🔁 Re-ranking ${chunks.length} chunks with Cohere...`);

  try {
    const response = await fetch('https://api.cohere.com/v2/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'rerank-v3.5',
        query,
        documents: chunks.map(chunk => chunk.chunk_text),
        top_n: Math.min(topN, chunks.length),
        return_documents: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Cohere rerank error:', error);
      return chunks; // Fall back to original order
    }

    const data = await response.json();
    console.log(`✅ Cohere re-ranked to top ${data.results?.length || 0} chunks`);

    // Map reranked results back to original chunks
    // Cohere returns indices into our documents array + relevance scores
    return data.results.map((result: { index: number; relevance_score: number }) => ({
      ...chunks[result.index],
      similarity: result.relevance_score, // Replace similarity with Cohere's relevance score
    }));
  } catch (err) {
    console.error('❌ Cohere rerank failed, falling back to original order:', err);
    return chunks; // Graceful fallback
  }
}

/**
 * Perform keyword-based full-text search across conversation chunks
 * This catches exact matches that vector search might miss (non-fuzzy)
 */
export async function keywordSearchChunks(
  supabase: any,
  query: string,
  conversationIds: string[],
  matchCount: number = DEFAULT_MAX_CHUNKS
): Promise<VectorSearchResult[]> {
  console.log('🔤 Starting keyword search...');
  console.log('  - Query:', query);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User authentication required for keyword search');
  }

  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "was", "are", "were", "what", "how", "why", "when", "where", "which", "who", "did", "do", "does", "i", "you", "me", "my", "your"]);
  const expandedTerms = expandQueryWithSynonyms(query);
  const terms = expandedTerms.filter(t => !stopWords.has(t));

  if (terms.length === 0) {
    console.log("  - No meaningful terms after filtering, skipping keyword search");
    return [];
  }

  console.log("  - Search terms (with synonyms):", terms);

  const ilikeConditions = terms.map(term => `chunk_text.ilike.%${term}%`).join(',');

  const { data, error } = await supabase
    .from('conversation_embeddings')
    .select('id, conversation_id, chunk_text, chunk_index, metadata')
    .in('conversation_id', conversationIds)
    .eq('user_id', user.id)
    .or(ilikeConditions)
    .limit(matchCount);

  if (error) {
    console.error('❌ Keyword search error:', error);
    return [];
  }

  console.log(`✅ Keyword search returned ${data?.length || 0} results`);

  return (data || []).map((row: any) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    chunk_text: row.chunk_text,
    chunk_index: row.chunk_index,
    similarity: 0.5,
    metadata: row.metadata,
  })) as VectorSearchResult[];
}

/**
 * Merge vector search results and keyword search results
 * Deduplicates by chunk id, boosts chunks that appear in both
 */
export function mergeSearchResults(
  vectorResults: VectorSearchResult[],
  keywordResults: VectorSearchResult[],
  maxResults: number = DEFAULT_MAX_CHUNKS
): VectorSearchResult[] {
  const merged = new Map<string, VectorSearchResult>();

  for (const result of vectorResults) {
    merged.set(result.id, result);
  }

  for (const result of keywordResults) {
    if (merged.has(result.id)) {
      const existing = merged.get(result.id)!;
      merged.set(result.id, {
        ...existing,
        similarity: Math.min(1.0, existing.similarity + 0.15),
      });
    } else {
      merged.set(result.id, result);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

/**
 * Perform hybrid search: vector similarity + keyword matching + Cohere re-ranking
 * This is the main search function to use
 */
export async function hybridSearchChunks(
  supabase: any,
  query: string,
  conversationIds: string[],
  options: {
    matchThreshold?: number;
    matchCount?: number;
    rerankTopN?: number;
  } = {}
): Promise<VectorSearchResult[]> {
  const {
    matchThreshold = 0.35,
    matchCount = DEFAULT_MAX_CHUNKS,
    rerankTopN = 25,
  } = options;

  console.log('🔀 Starting hybrid search (vector + keyword + rerank)...');

  // Step 1: Run vector and keyword searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    searchSimilarChunks(supabase, query, conversationIds, { matchThreshold, matchCount }),
    keywordSearchChunks(supabase, query, conversationIds, matchCount),
  ]);

  console.log(`📊 Vector: ${vectorResults.length} results, Keyword: ${keywordResults.length} results`);

  // Step 2: Merge and deduplicate
  // Fetch more candidates than needed so re-ranker has enough to work with
  const merged = mergeSearchResults(vectorResults, keywordResults, matchCount * 2);

  console.log(`📊 Merged to ${merged.length} candidates for re-ranking`);

  // Step 3: Re-rank with Cohere to get the most relevant chunks
  const reranked = await rerankWithCohere(query, merged, rerankTopN);

  console.log(`✅ Final result: ${reranked.length} re-ranked chunks`);

  return reranked;
}

/**
 * Perform vector similarity search across selected conversations
 */
export async function searchSimilarChunks(
  supabase: any,
  query: string,
  conversationIds: string[],
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<VectorSearchResult[]> {
  const {
    matchThreshold = 0.35,
    matchCount = DEFAULT_MAX_CHUNKS,
  } = options;

  console.log('🔍 Starting vector similarity search...');
  console.log('  - Query:', query.substring(0, 100) + '...');
  console.log('  - Conversation IDs:', conversationIds);
  console.log('  - Match threshold:', matchThreshold);
  console.log('  - Max chunks:', matchCount);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User authentication required for vector search');
  }
  console.log('  - User ID:', user.id);

  const { count: actualCount, error: actualCountError } = await supabase
    .from('conversation_embeddings')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', conversationIds);

  console.log(`📊 Actual chunk count: ${actualCount || 0}`);
  if (actualCountError) {
    console.error('❌ Count error:', actualCountError);
  }

  console.log('🧠 Generating query embedding...');
  const queryEmbedding = await generateEmbedding(query, DEFAULT_EMBEDDING_MODEL);
  console.log(`✅ Query embedding generated (${queryEmbedding.length} dimensions)`);

  const embeddingString = `[${queryEmbedding.join(',')}]`;

  const { data, error } = await supabase.rpc('match_conversation_chunks', {
    query_embedding: embeddingString,
    conversation_ids: conversationIds,
    match_threshold: matchThreshold,
    match_count: matchCount,
    requesting_user_id: user.id,
  });

  if (error) {
    console.error('❌ Vector search RPC error:', error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`✅ RPC returned ${data?.length || 0} results`);

  if (data && data.length > 0) {
    console.log('📋 Top results:');
    data.slice(0, 3).forEach((result: any, idx: number) => {
      console.log(`  ${idx + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%, Conv: ${result.conversation_id.substring(0, 8)}...`);
    });
  }

  return (data || []) as VectorSearchResult[];
}

/**
 * Build context from search results for Claude prompt
 */
export function buildContextFromChunks(
  chunks: VectorSearchResult[],
  conversationTitles: Map<string, string>
): string {
  if (chunks.length === 0) {
    return 'No relevant context found in the selected conversations.';
  }

  const contextParts: string[] = [];

  const chunksByConversation = new Map<string, VectorSearchResult[]>();
  for (const chunk of chunks) {
    const existing = chunksByConversation.get(chunk.conversation_id) || [];
    existing.push(chunk);
    chunksByConversation.set(chunk.conversation_id, existing);
  }

  for (const [convId, convChunks] of chunksByConversation) {
    const title = conversationTitles.get(convId) || 'Unknown Conversation';
    contextParts.push(`\n--- From "${title}" ---`);

    convChunks.sort((a, b) => a.chunk_index - b.chunk_index);

    for (const chunk of convChunks) {
      contextParts.push(chunk.chunk_text);
    }
  }

  return contextParts.join('\n');
}

/**
 * Convert search results to source citations
 * Deduplicates by conversation — one source entry per conversation,
 * keeping the chunk with the highest similarity score.
 */
export function buildSourceCitations(
  chunks: VectorSearchResult[],
  conversationTitles: Map<string, string>
): RagSource[] {
  // Deduplicate by conversation — keep highest similarity score per conversation
  const byConversation = new Map<string, VectorSearchResult>();

  for (const chunk of chunks) {
    const existing = byConversation.get(chunk.conversation_id);
    if (!existing || chunk.similarity > existing.similarity) {
      byConversation.set(chunk.conversation_id, chunk);
    }
  }

  return Array.from(byConversation.values()).map(chunk => ({
    conversation_id: chunk.conversation_id,
    conversation_title: conversationTitles.get(chunk.conversation_id) || 'Unknown',
    chunk_index: chunk.chunk_index,
    chunk_text: chunk.chunk_text,
    similarity: chunk.similarity,
    message_indices: chunk.metadata?.message_indices || [],
  }));
}

/**
 * Fetch conversation titles for a list of conversation IDs
 */
export async function getConversationTitles(
  supabase: any,
  conversationIds: string[]
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title')
    .in('id', conversationIds);

  if (error) {
    console.error('Failed to fetch conversation titles:', error);
    return new Map();
  }

  const titles = new Map<string, string>();
  for (const conv of data || []) {
    titles.set(conv.id, conv.title || 'Untitled Conversation');
  }

  return titles;
}

/**
 * Verify all conversations have embeddings
 */
export async function verifyEmbeddingsReady(
  supabase: any,
  conversationIds: string[]
): Promise<{
  ready: boolean;
  missingIds: string[];
  status: Map<string, boolean>;
}> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, has_embeddings')
    .in('id', conversationIds);

  if (error) {
    throw new Error(`Failed to check embeddings: ${error.message}`);
  }

  const status = new Map<string, boolean>();
  const missingIds: string[] = [];

  for (const conv of data || []) {
    const hasEmbeddings = conv.has_embeddings || false;
    status.set(conv.id, hasEmbeddings);
    if (!hasEmbeddings) {
      missingIds.push(conv.id);
    }
  }

  const foundIds = new Set((data || []).map((c: any) => c.id));
  for (const id of conversationIds) {
    if (!foundIds.has(id)) {
      status.set(id, false);
      missingIds.push(id);
    }
  }

  return {
    ready: missingIds.length === 0,
    missingIds,
    status,
  };
}

/**
 * Create or update a RAG chat session
 */
export async function saveRagChatSession(
  supabase: any,
  userId: string,
  sessionId: string | null,
  conversationIds: string[],
  messages: any[]
): Promise<string> {
  if (sessionId) {
    const { error } = await supabase
      .from('rag_chat_sessions')
      .update({
        messages,
        total_messages: messages.length,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update chat session: ${error.message}`);
    }

    return sessionId;
  } else {
    const { data, error } = await supabase
      .from('rag_chat_sessions')
      .insert({
        user_id: userId,
        conversation_ids: conversationIds,
        messages,
        total_messages: messages.length,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return data.id;
  }
}

/**
 * Load an existing RAG chat session
 */
export async function loadRagChatSession(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<{
  conversation_ids: string[];
  messages: any[];
} | null> {
  const { data, error } = await supabase
    .from('rag_chat_sessions')
    .select('conversation_ids, messages')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    conversation_ids: data.conversation_ids,
    messages: data.messages || [],
  };
}

/**
 * Estimate token count for context
 */
export function estimateContextTokens(context: string): number {
  return Math.ceil(context.length / 4);
}

/**
 * Trim context to fit within token budget
 */
export function trimContextToTokenBudget(
  chunks: VectorSearchResult[],
  conversationTitles: Map<string, string>,
  maxTokens: number = 50000
): VectorSearchResult[] {
  const result: VectorSearchResult[] = [];
  let currentTokens = 0;

  const sortedChunks = [...chunks].sort((a, b) => b.similarity - a.similarity);

  for (const chunk of sortedChunks) {
    const chunkContext = buildContextFromChunks([chunk], conversationTitles);
    const chunkTokens = estimateContextTokens(chunkContext);

    if (currentTokens + chunkTokens <= maxTokens) {
      result.push(chunk);
      currentTokens += chunkTokens;
    } else {
      break;
    }
  }

  return result;
}