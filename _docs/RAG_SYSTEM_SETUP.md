# ThreadCub RAG System Setup Guide

This document explains how to set up and use the RAG (Retrieval Augmented Generation) system for multi-conversation analysis.

## Overview

The RAG system allows users to:
- Generate vector embeddings for their conversations
- Search across multiple conversations semantically
- Ask questions and get intelligent answers with source citations
- Efficiently handle large conversation datasets

## Database Migration

### Prerequisites

1. **Supabase Project** with pgvector support
2. **OpenAI API Key** for embedding generation
3. **Anthropic API Key** for AI responses (already configured)

### Applying the Migration

#### Option 1: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/004_add_rag_embeddings.sql`
4. Paste and run the SQL

#### Option 2: Supabase CLI

```bash
supabase db push
```

#### Option 3: Manual Migration

If using a different PostgreSQL setup, ensure you have:
1. The `vector` extension installed
2. Run the migration SQL file directly

### What the Migration Creates

#### Tables

1. **conversation_embeddings**
   - Stores chunked conversation text with 1536-dimensional vectors
   - RLS policies for user isolation
   - IVFFlat index for fast similarity search

2. **conversation_embedding_status**
   - Tracks embedding generation progress
   - Status: pending, processing, completed, failed, outdated

3. **rag_chat_sessions**
   - Stores multi-chat analysis conversation history
   - Maintains context for follow-up questions

#### Functions

- `match_conversation_chunks()` - Vector similarity search
- `get_user_embedding_stats()` - User statistics
- `delete_conversation_embeddings()` - Cleanup helper

#### Updates to Existing Tables

- `conversations` table gets `has_embeddings` and `last_embedded_at` columns
- `credit_pricing` gets RAG operation pricing (embedding generation is free, queries cost 1 credit)

## Environment Variables

Add the following to your `.env.local`:

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key

# New for RAG
OPENAI_API_KEY=your-openai-key
```

## Architecture

### Embedding Generation Flow

```
User imports conversation
        ↓
Conversation stored in DB
        ↓
User clicks "Generate Embeddings" (or auto-triggered)
        ↓
POST /api/embeddings/generate
        ↓
Conversation chunked (500-token chunks with 50-token overlap)
        ↓
Each chunk sent to OpenAI text-embedding-3-small
        ↓
Embeddings stored in conversation_embeddings table
        ↓
Status updated to "completed"
```

### RAG Query Flow

```
User selects multiple conversations
        ↓
User asks a question
        ↓
POST /api/chat/multi-analyze
        ↓
Question converted to embedding
        ↓
Vector similarity search finds relevant chunks
        ↓
Top chunks assembled into context
        ↓
Question + Context sent to Claude API
        ↓
Claude generates answer with source citations
        ↓
Response returned with sources
```

## API Endpoints

### POST /api/embeddings/generate

Generate embeddings for a conversation.

**Request:**
```json
{
  "conversation_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "uuid",
  "status": {
    "status": "completed",
    "total_chunks": 15,
    "chunks_processed": 15,
    "total_tokens_embedded": 7500
  },
  "message": "Successfully generated 15 embeddings"
}
```

### POST /api/chat/multi-analyze

Query across multiple conversations.

**Request:**
```json
{
  "conversation_ids": ["uuid1", "uuid2", "uuid3"],
  "question": "What were the main decisions made across these conversations?",
  "session_id": "optional-for-follow-ups",
  "max_chunks": 10,
  "similarity_threshold": 0.7
}
```

**Response:**
```json
{
  "answer": "Based on the conversations, the main decisions were...",
  "sources": [
    {
      "conversation_id": "uuid1",
      "conversation_title": "Project Planning",
      "chunk_index": 3,
      "chunk_text": "We decided to use...",
      "similarity": 0.85,
      "message_indices": [10, 11, 12]
    }
  ],
  "session_id": "session-uuid",
  "credits_used": 1
}
```

### GET /api/embeddings/status

Check embedding status for conversations.

**Request:**
```
GET /api/embeddings/status?ids=uuid1,uuid2,uuid3
```

**Response:**
```json
{
  "statuses": [
    {
      "conversation_id": "uuid1",
      "has_embeddings": true,
      "status": {
        "status": "completed",
        "total_chunks": 15
      }
    }
  ]
}
```

## Chunking Strategy

The system uses intelligent chunking:

1. **Chunk Size**: 500 tokens (approximately 375 words)
2. **Overlap**: 50 tokens between chunks for context continuity
3. **Message Grouping**: Keeps user-assistant pairs together when possible
4. **Metadata Preservation**: Stores message indices and roles for source tracking

## Credit System Integration

- **Embedding Generation**: FREE (0 credits)
- **Multi-Chat Query**: 1 credit per query
- **Pricing is configurable** in the `credit_pricing` table

## Security

- **Row Level Security (RLS)**: Users can only access their own data
- **SECURITY DEFINER functions**: Controlled access to cross-table operations
- **User ID isolation**: All queries scoped to authenticated user

## Performance Considerations

1. **Vector Index**: Uses IVFFlat with 100 lists for efficient similarity search
2. **Batch Processing**: Can process multiple chunks in parallel
3. **Caching**: Embeddings stored permanently, regenerated only if conversation changes
4. **Token Limits**: Chunks sized to fit within API limits

## Troubleshooting

### Common Issues

1. **"pgvector extension not found"**
   - Ensure your Supabase plan supports pgvector (Pro plan or higher)
   - Or enable manually: `CREATE EXTENSION IF NOT EXISTS vector;`

2. **"Insufficient credits"**
   - RAG queries cost 1 credit each
   - Embedding generation is free

3. **"No embeddings found"**
   - Generate embeddings first before querying
   - Check status in conversation_embedding_status table

4. **Slow queries**
   - Increase IVFFlat lists parameter for larger datasets
   - Consider using text-embedding-3-large for better accuracy (requires schema change)

## Future Enhancements

- [ ] Automatic re-embedding when conversation is updated
- [ ] Streaming responses for large answers
- [ ] Batch embedding generation for multiple conversations
- [ ] Export RAG sessions as reports
- [ ] Webhook for async embedding generation
- [ ] Custom embedding models support
