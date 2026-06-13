# Cross-Conversation Insights (RAG) Integration Guide

## Overview

The RAG (Retrieval Augmented Generation) multi-conversation analysis feature has been successfully integrated into the ThreadCub dashboard. Users can now select multiple conversations, generate vector embeddings, and ask questions across all selected conversations with AI-powered answers and source citations.

## Files Created

### 1. **hooks/useRagAnalysis.ts**
Custom React hook that encapsulates RAG analysis functionality:
- Manages embedding generation state
- Handles toast notifications
- Provides user-friendly error messages
- Exposes methods for generating embeddings (single or batch)

**Key exports:**
- `useRagAnalysis()` - Main hook
- `Toast` interface
- `UseRagAnalysisResult` interface

### 2. **app/(dashboard)/rag/page.tsx**
Production RAG page integrated into the dashboard:
- Clean, professional UI with dark mode support
- Uses dashboard layout automatically
- Stats dashboard showing total conversations, ready conversations, and those needing embeddings
- Toast notifications for user feedback
- Selection action bar with batch embedding generation
- Comprehensive usage instructions

**Key features:**
- Production copy: "Cross-Conversation Insights" (not "RAG Multi-Chat Analysis")
- Integrated with MultiSelectProvider
- Uses useRagAnalysis hook
- Auto-enables selection mode
- Responsive grid layout

## Files Modified

### 1. **config/navigation.ts**
Added "Insights" navigation item:
```typescript
{
  id: 'insights',
  label: 'Insights',
  href: '/rag',
  icon: '<svg>...</svg>' // Pencil/edit icon
}
```

## Files Archived

### 1. **app/test-rag/page.tsx → app/_archived-test-rag/page.tsx**
The original test page has been archived (not deleted) for reference.
- Moved to `_archived-test-rag/` to prevent it from being a route
- Preserves original implementation for reference

## How to Use Cross-Conversation Insights

### From the Navigation
1. Click "Insights" in the sidebar navigation
2. You'll see all your conversations in a grid layout
3. Selection mode is automatically enabled

### The Workflow
1. **Select Conversations**: Click checkboxes on conversation cards to select 2+ conversations
2. **Generate Embeddings**: If any selected conversations need embeddings (orange badge), click "Generate Embeddings"
3. **Generate Insights**: Once all selected conversations have green badges, click "Generate Insights"
4. **Ask Questions**: In the modal, ask questions and receive AI-powered answers with source citations
5. **Conversation History**: The chat modal persists conversation history across sessions

### From the Threads Page (Future Enhancement)
The threads page is prepared for RAG integration. To enable:
1. Wrap the conversation list in `<MultiSelectProvider>`
2. Add a "Select Conversations" toggle button
3. Add a "Generate Insights" action button that:
   - Requires at least 2 conversations selected
   - Checks for embeddings
   - Opens the RAG modal

## Context & Props Required for Multi-Select Support

Any page that wants to support RAG multi-select needs:

### 1. Wrap in MultiSelectProvider
```tsx
import { MultiSelectProvider } from '../../../components/rag';

export default function YourPage() {
  return (
    <MultiSelectProvider>
      <YourContent />
    </MultiSelectProvider>
  );
}
```

### 2. Use the Hook
```tsx
import { useMultiSelect } from '../../../components/rag';
import { useRagAnalysis } from '../../../hooks/useRagAnalysis';

function YourContent() {
  const {
    isSelecting,
    setIsSelecting,
    selectedConversations,
    selectAll,
    getSelectedIds,
    getEmbeddingsReadyCount,
    setIsRagChatOpen,
  } = useMultiSelect();

  const {
    generatingEmbeddings,
    toasts,
    handleGenerateEmbedding,
    handleGenerateSelectedEmbeddings,
  } = useRagAnalysis();

  // Your component logic
}
```

### 3. Use SelectableConversationCard or Custom Implementation
```tsx
import { SelectableConversationCard, RagChatModal } from '../../../components/rag';

// In your render:
<SelectableConversationCard
  conversation={conv}
  onGenerateEmbedding={handleGenerateEmbedding}
  isGeneratingEmbedding={generatingEmbeddings.has(conv.id)}
/>

// Always render the modal (it controls its own visibility)
<RagChatModal />
```

## API Endpoints Used

The integration uses existing API routes:
- `POST /api/embeddings/generate` - Generate embeddings for a conversation
- `GET /api/embeddings/diagnose` - Run diagnostics (test page only)
- `POST /api/chat/multi-analyze` - Run RAG query across conversations
- `GET /api/embeddings/status` - Check embedding status (optional)

## Component Architecture

```
MultiSelectProvider (Context)
├── MultiSelectContext (state management)
├── useMultiSelect() (hook)
└── Components:
    ├── RagChatModal (chat interface with sources)
    ├── SelectableConversationCard (card with checkbox)
    ├── EmbeddingStatusBadge (status indicators)
    └── MultiSelectToolbar (optional toolbar)

useRagAnalysis (Custom Hook)
├── Embedding generation logic
├── Toast notifications
└── Error handling
```

## Credit System Integration

- **Embedding generation**: FREE (no credits deducted)
- **RAG queries**: 1 credit per query
- Credits are deducted via `deductCredits()` after successful analysis
- Credit balance shown in modal subtitle

## Next Steps / Future Enhancements

1. **Threads Page Integration**: Add multi-select mode to the threads page with "Generate Insights" button
2. **Project Page Integration**: Add RAG analysis scoped to project conversations
3. **Recent Insights**: Show recently analyzed conversation sets
4. **Saved Queries**: Allow users to save frequently used questions
5. **Export**: Export RAG chat sessions as markdown/PDF

## Testing Checklist

- [ ] Navigate to `/rag` and verify page loads
- [ ] Select 2+ conversations and generate embeddings
- [ ] Click "Generate Insights" and ask questions
- [ ] Verify toast notifications appear and auto-dismiss
- [ ] Verify chat history persists when closing/reopening modal
- [ ] Verify dark mode works correctly
- [ ] Verify mobile responsive layout
- [ ] Check that "Insights" appears in sidebar navigation
- [ ] Verify credits are deducted after RAG queries

## Troubleshooting

### "No results returned from RPC"
- Run diagnostics to verify pgvector setup
- Check that migration `004_add_rag_embeddings.sql` has been applied
- Verify OpenAI API key is configured

### "OpenAI API key not configured"
- Add `OPENAI_API_KEY` to `.env.local`
- Restart the development server

### Embedding generation fails
- Check server logs for detailed error messages
- Verify conversation has valid messages
- Check token limits (chunks are max 6000 tokens)

## Credits

- Built using Next.js 15 App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Supabase with pgvector for vector storage
- OpenAI text-embedding-3-small for embeddings
- Claude Sonnet 4 for RAG analysis
