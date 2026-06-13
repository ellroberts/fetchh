// lib/rag-chunking.ts
// Utilities for chunking conversations into embeddable pieces

import {
  ConversationMessage,
  TextChunk,
  ChunkMetadata,
  ChunkingOptions,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './rag-types';

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function countTokens(text: string): number {
  const words = text.split(/\s+/).length;
  const punctuation = (text.match(/[.,!?;:'"()\[\]{}]/g) || []).length;
  return Math.ceil(words * 1.3 + punctuation * 0.5);
}

/**
 * Format a single message for embedding
 */
function formatMessage(message: ConversationMessage, index: number): string {
  const role = message.role.toUpperCase();
  const content = message.content.trim();
  return `[${role}]: ${content}`;
}

/**
 * Split a single long message into smaller pieces
 */
function splitLongMessage(
  message: ConversationMessage,
  maxTokens: number = 1500
): ConversationMessage[] {
  const content = message.content.trim();
  const estimatedTokens = estimateTokenCount(content);

  if (estimatedTokens <= maxTokens) {
    return [message];
  }

  const sentences = content.split(/(?<=[.!?])\s+/);
  const chunks: ConversationMessage[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);

    if (sentenceTokens > maxTokens) {
      if (currentChunk) {
        chunks.push({ ...message, content: currentChunk.trim() });
        currentChunk = '';
        currentTokens = 0;
      }

      const words = sentence.split(/\s+/);
      let wordChunk = '';
      let wordTokens = 0;

      for (const word of words) {
        const wordTokenCount = estimateTokenCount(word + ' ');
        if (wordTokens + wordTokenCount > maxTokens && wordChunk) {
          chunks.push({ ...message, content: wordChunk.trim() });
          wordChunk = word + ' ';
          wordTokens = wordTokenCount;
        } else {
          wordChunk += word + ' ';
          wordTokens += wordTokenCount;
        }
      }
      if (wordChunk) {
        currentChunk = wordChunk;
        currentTokens = wordTokens;
      }
    } else if (currentTokens + sentenceTokens > maxTokens) {
      if (currentChunk) {
        chunks.push({ ...message, content: currentChunk.trim() });
      }
      currentChunk = sentence + ' ';
      currentTokens = sentenceTokens;
    } else {
      currentChunk += sentence + ' ';
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ ...message, content: currentChunk.trim() });
  }

  return chunks;
}

/**
 * Chunk a conversation into smaller pieces suitable for embedding.
 *
 * IMPORTANT: chunk.text is the CLEAN message content only (no metadata header).
 * The embedding_text field includes the context header for better vector quality,
 * but chunk_text stored in the DB is clean so source previews are readable.
 */
export function chunkConversation(
  messages: ConversationMessage[],
  conversationTitle: string,
  platform: string = 'unknown',
  options: Partial<ChunkingOptions> = {}
): TextChunk[] {
  const {
    max_tokens_per_chunk = DEFAULT_CHUNK_SIZE,
    overlap_tokens = DEFAULT_CHUNK_OVERLAP,
    include_context = true,
  } = options;

  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  let currentMessageIndices: number[] = [];
  let currentRoles: Set<string> = new Set();

  // Context header is used for embedding quality but NOT stored in chunk_text
  const contextHeader = include_context
    ? `[Conversation: ${conversationTitle}] [Platform: ${platform}]\n\n`
    : '';
  const contextTokens = estimateTokenCount(contextHeader);

  const maxMessageTokens = Math.floor(max_tokens_per_chunk * 0.8);
  const processedMessages: { message: ConversationMessage; originalIndex: number }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const splitMessages = splitLongMessage(messages[i], maxMessageTokens);
    for (const splitMsg of splitMessages) {
      processedMessages.push({ message: splitMsg, originalIndex: i });
    }
  }

  const saveChunk = () => {
    if (currentChunk.length === 0) return;

    // Clean text — just the messages, no metadata prefix
    const cleanText = currentChunk.join('\n\n');

    chunks.push({
      // text = clean message content (stored in DB as chunk_text)
      text: cleanText,
      // embedding_text = context header + clean text (used for generating embeddings)
      embedding_text: contextHeader + cleanText,
      metadata: {
        message_indices: [...currentMessageIndices],
        roles: Array.from(currentRoles),
        start_message_index: currentMessageIndices[0],
        end_message_index: currentMessageIndices[currentMessageIndices.length - 1],
        chunk_type: 'conversation',
        platform,
        conversation_title: conversationTitle,
      },
      token_count: estimateTokenCount(cleanText),
    });
  };

  for (let i = 0; i < processedMessages.length; i++) {
    const { message, originalIndex } = processedMessages[i];
    const formattedMessage = formatMessage(message, originalIndex);
    const messageTokens = estimateTokenCount(formattedMessage);

    if (
      currentTokenCount + messageTokens + contextTokens > max_tokens_per_chunk &&
      currentChunk.length > 0
    ) {
      saveChunk();

      // Overlap: carry last few messages into next chunk
      const overlapMessages: string[] = [];
      const overlapIndices: number[] = [];
      const overlapRoles: Set<string> = new Set();
      let overlapTokens = 0;

      for (let j = currentChunk.length - 1; j >= 0 && overlapTokens < overlap_tokens; j--) {
        const overlapMessage = currentChunk[j];
        const overlapMsgTokens = estimateTokenCount(overlapMessage);
        if (overlapTokens + overlapMsgTokens <= overlap_tokens) {
          overlapMessages.unshift(overlapMessage);
          const overlapIdx = currentMessageIndices[j];
          overlapIndices.unshift(overlapIdx);
          const originalMsg = messages[overlapIdx];
          if (originalMsg) overlapRoles.add(originalMsg.role);
          overlapTokens += overlapMsgTokens;
        } else {
          break;
        }
      }

      currentChunk = overlapMessages;
      currentMessageIndices = overlapIndices;
      currentRoles = overlapRoles;
      currentTokenCount = overlapTokens;
    }

    currentChunk.push(formattedMessage);
    currentMessageIndices.push(originalIndex);
    currentRoles.add(message.role);
    currentTokenCount += messageTokens;
  }

  saveChunk();

  return chunks;
}

/**
 * Create a summary chunk for the entire conversation
 */
export function createSummaryChunk(
  messages: ConversationMessage[],
  conversationTitle: string,
  platform: string = 'unknown',
  maxMessages: number = 50
): TextChunk {
  const sampledMessages: ConversationMessage[] = [];
  const sampledIndices: number[] = [];

  if (messages.length <= maxMessages) {
    sampledMessages.push(...messages);
    sampledIndices.push(...messages.map((_, i) => i));
  } else {
    const first = Math.floor(maxMessages * 0.3);
    const middle = Math.floor(maxMessages * 0.4);
    const last = maxMessages - first - middle;

    for (let i = 0; i < first; i++) {
      sampledMessages.push(messages[i]);
      sampledIndices.push(i);
    }

    const middleStart = Math.floor((messages.length - middle) / 2);
    for (let i = 0; i < middle; i++) {
      sampledMessages.push(messages[middleStart + i]);
      sampledIndices.push(middleStart + i);
    }

    const lastStart = messages.length - last;
    for (let i = 0; i < last; i++) {
      sampledMessages.push(messages[lastStart + i]);
      sampledIndices.push(lastStart + i);
    }
  }

  const cleanText = sampledMessages
    .map((msg, idx) => formatMessage(msg, sampledIndices[idx]))
    .join('\n\n');

  const embeddingText =
    `[Conversation Summary: ${conversationTitle}] [Platform: ${platform}] [Total Messages: ${messages.length}]\n\n` +
    cleanText;

  return {
    text: cleanText,
    embedding_text: embeddingText,
    metadata: {
      message_indices: sampledIndices,
      roles: Array.from(new Set(sampledMessages.map(m => m.role))),
      start_message_index: 0,
      end_message_index: messages.length - 1,
      chunk_type: 'summary',
      platform,
      conversation_title: conversationTitle,
    },
    token_count: estimateTokenCount(cleanText),
  };
}

/**
 * Main function to process a conversation into chunks
 */
export function processConversationForEmbedding(
  messages: ConversationMessage[],
  conversationTitle: string,
  platform: string = 'unknown',
  options: Partial<ChunkingOptions> = {}
): TextChunk[] {
  const chunks = chunkConversation(messages, conversationTitle, platform, options);

  const maxTokensPerChunk = options.max_tokens_per_chunk || 6000;
  const validatedChunks: TextChunk[] = [];

  for (const chunk of chunks) {
    if (chunk.token_count <= maxTokensPerChunk) {
      validatedChunks.push(chunk);
    } else {
      console.warn(`⚠️ Chunk too large (${chunk.token_count} tokens), splitting further...`);
      const text = chunk.text;
      const maxChars = maxTokensPerChunk * 4;
      let startIndex = 0;

      while (startIndex < text.length) {
        const endIndex = Math.min(startIndex + maxChars, text.length);
        const subText = text.substring(startIndex, endIndex);

        validatedChunks.push({
          text: subText,
          embedding_text: (chunk.embedding_text || text).substring(startIndex, endIndex),
          metadata: { ...chunk.metadata, chunk_type: 'conversation' },
          token_count: estimateTokenCount(subText),
        });

        startIndex = endIndex;
      }
    }
  }

  return validatedChunks;
}

/**
 * Extract messages from various conversation formats
 */
export function extractMessages(conversation: any): ConversationMessage[] {
  let rawMessages: any[] = [];

  if (conversation.content?.messages) {
    rawMessages = conversation.content.messages;
  } else if (conversation.messages) {
    rawMessages = conversation.messages;
  } else if (Array.isArray(conversation)) {
    rawMessages = conversation;
  }

  return rawMessages.map((msg: any) => ({
    role: (msg.role || msg.author || 'user').toLowerCase(),
    content: msg.content || msg.text || msg.message || '',
    timestamp: msg.timestamp || msg.created_at || msg.create_time,
  }));
}

export function validateChunks(chunks: TextChunk[], maxTokens: number = 8191): boolean {
  return chunks.every(chunk => chunk.token_count <= maxTokens);
}

export function getTotalTokenCount(chunks: TextChunk[]): number {
  return chunks.reduce((total, chunk) => total + chunk.token_count, 0);
}