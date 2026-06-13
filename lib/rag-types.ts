// lib/rag-types.ts
// Type definitions for ThreadCub RAG (Retrieval Augmented Generation) system

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface ConversationEmbedding {
  id: string;
  conversation_id: string;
  user_id: string;
  chunk_text: string;
  chunk_index: number;
  token_count?: number;
  embedding?: number[]; // 1536-dimensional vector
  metadata: ChunkMetadata;
  created_at: string;
  updated_at: string;
}

export interface ChunkMetadata {
  message_indices: number[];
  roles: string[];
  start_message_index: number;
  end_message_index: number;
  chunk_type: 'conversation' | 'summary' | 'context';
  platform?: string;
  conversation_title?: string;
}

export interface ConversationEmbeddingStatus {
  conversation_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'outdated';
  total_chunks: number;
  chunks_processed: number;
  error_message?: string;
  embedding_model: string;
  total_tokens_embedded: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RagChatSession {
  id: string;
  user_id: string;
  conversation_ids: string[];
  messages: RagChatMessage[];
  title?: string;
  total_messages: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface RagChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: RagSource[];
  caveat?: string | null;
  action_item_added?: { actions: number; reminders: number };
}

export interface RagSource {
  conversation_id: string;
  conversation_title: string;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
  message_indices: number[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GenerateEmbeddingsRequest {
  conversation_id: string;
}

export interface GenerateEmbeddingsResponse {
  success: boolean;
  conversation_id: string;
  status: ConversationEmbeddingStatus;
  message: string;
}

export interface MultiChatAnalysisRequest {
  conversation_ids: string[];
  question: string;
  session_id?: string;
  max_chunks?: number;
  similarity_threshold?: number;
}

export interface MultiChatAnalysisResponse {
  answer: string;
  sources: RagSource[];
  session_id: string;
  tokens_used?: number;
}

export interface EmbeddingStatusRequest {
  conversation_ids: string[];
}

export interface EmbeddingStatusResponse {
  statuses: {
    conversation_id: string;
    has_embeddings: boolean;
    status?: ConversationEmbeddingStatus;
  }[];
}

export interface UserEmbeddingStats {
  total_conversations_embedded: number;
  total_chunks: number;
  total_tokens: number;
  conversations_pending: number;
  conversations_processing: number;
  conversations_failed: number;
}

// ============================================================================
// CHUNKING TYPES
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface TextChunk {
  text: string;           // Clean message content — stored as chunk_text in DB
  embedding_text?: string; // Context header + text — used for generating embeddings (better quality)
  metadata: ChunkMetadata;
  token_count: number;
}

export interface ChunkingOptions {
  max_tokens_per_chunk: number;
  overlap_tokens: number;
  include_context: boolean;
}

// ============================================================================
// VECTOR SEARCH TYPES
// ============================================================================

export interface VectorSearchResult {
  id: string;
  conversation_id: string;
  chunk_text: string;
  chunk_index: number;
  metadata: ChunkMetadata;
  similarity: number;
}

export interface VectorSearchOptions {
  query_embedding: number[];
  conversation_ids: string[];
  match_threshold?: number;
  match_count?: number;
}

// ============================================================================
// FRONTEND STATE TYPES
// ============================================================================

export interface ConversationSelectionState {
  selected_ids: string[];
  total_count: number;
  embeddings_ready_count: number;
  embeddings_pending_count: number;
}

export interface RagChatState {
  session_id?: string;
  messages: RagChatMessage[];
  selected_conversations: {
    id: string;
    title: string;
    has_embeddings: boolean;
    embedding_status?: ConversationEmbeddingStatus['status'];
  }[];
  is_loading: boolean;
  error?: string;
}

export interface EmbeddingGenerationProgress {
  conversation_id: string;
  conversation_title: string;
  status: ConversationEmbeddingStatus['status'];
  progress: number;
  error_message?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';

export interface EmbeddingConfig {
  model: EmbeddingModel;
  dimensions: number;
  max_input_tokens: number;
}

export const EMBEDDING_CONFIGS: Record<EmbeddingModel, EmbeddingConfig> = {
  'text-embedding-3-small': {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    max_input_tokens: 8191,
  },
  'text-embedding-3-large': {
    model: 'text-embedding-3-large',
    dimensions: 3072,
    max_input_tokens: 8191,
  },
  'text-embedding-ada-002': {
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    max_input_tokens: 8191,
  },
};

export const DEFAULT_EMBEDDING_MODEL: EmbeddingModel = 'text-embedding-3-small';
export const DEFAULT_CHUNK_SIZE = 500;
export const DEFAULT_CHUNK_OVERLAP = 50;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.35;
export const DEFAULT_MAX_CHUNKS = 40;