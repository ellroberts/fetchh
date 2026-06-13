'use client';

import { useMultiSelect } from './MultiSelectContext';
import { EmbeddingStatusBadge } from './EmbeddingStatusBadge';

interface Conversation {
  id: string;
  title: string;
  platform?: string;
  created_at: string;
  message_count?: number;
  has_embeddings?: boolean;
}

interface SelectableConversationCardProps {
  conversation: Conversation;
  onGenerateEmbedding?: (conversationId: string) => void;
  isGeneratingEmbedding?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function SelectableConversationCard({
  conversation,
  onGenerateEmbedding,
  isGeneratingEmbedding = false,
  onClick,
  children,
}: SelectableConversationCardProps) {
  const { isSelecting, selectedConversations, toggleConversation } =
    useMultiSelect();

  const isSelected = selectedConversations.has(conversation.id);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleConversation({
      id: conversation.id,
      title: conversation.title || 'Untitled',
      has_embeddings: conversation.has_embeddings || false,
      message_count: conversation.message_count,
    });
  };

  const handleCardClick = () => {
    if (isSelecting) {
      toggleConversation({
        id: conversation.id,
        title: conversation.title || 'Untitled',
        has_embeddings: conversation.has_embeddings || false,
        message_count: conversation.message_count,
      });
    } else if (onClick) {
      onClick();
    }
  };

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'claude':
        return 'bg-purple-100 text-purple-700';
      case 'chatgpt':
        return 'bg-blue-100 text-blue-700';
      case 'gemini':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-muted text-foreground/80';
    }
  };

  return (
    <div
      className={`relative bg-background rounded-lg shadow-md hover:shadow-lg transition-all duration-200 h-48 ${
        isSelecting ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox (visible in select mode) */}
      {isSelecting && (
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={handleSelect}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-background border-border hover:border-indigo-500'
            }`}
          >
            {isSelected && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Embedding Status Badge (top right) */}
      <div className="absolute top-3 right-3 z-10">
        <EmbeddingStatusBadge
          hasEmbeddings={conversation.has_embeddings || false}
          createdAt={conversation.created_at}
          onGenerate={
            onGenerateEmbedding
              ? () => onGenerateEmbedding(conversation.id)
              : undefined
          }
          isGenerating={isGeneratingEmbedding}
        />
      </div>

      <div className="p-4 h-full flex flex-col">
        {/* Title with padding for checkbox */}
        <h3
          className={`font-semibold text-foreground mb-2 line-clamp-2 ${
            isSelecting ? 'pl-8' : ''
          }`}
        >
          {conversation.title || 'Untitled Conversation'}
        </h3>

        {/* Custom content or default */}
        {children ? (
          <div className="flex-1 overflow-hidden">{children}</div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {conversation.platform && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${getSourceColor(
                  conversation.platform
                )}`}
              >
                {conversation.platform}
              </span>
            )}
            {conversation.message_count && (
              <span className="text-xs text-muted-foreground">
                {conversation.message_count} msgs
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground/70">
            {new Date(conversation.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// List view variant
export function SelectableConversationListItem({
  conversation,
  onGenerateEmbedding,
  isGeneratingEmbedding = false,
  onClick,
  children,
}: SelectableConversationCardProps) {
  const { isSelecting, selectedConversations, toggleConversation } =
    useMultiSelect();

  const isSelected = selectedConversations.has(conversation.id);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleConversation({
      id: conversation.id,
      title: conversation.title || 'Untitled',
      has_embeddings: conversation.has_embeddings || false,
      message_count: conversation.message_count,
    });
  };

  const handleRowClick = () => {
    if (isSelecting) {
      toggleConversation({
        id: conversation.id,
        title: conversation.title || 'Untitled',
        has_embeddings: conversation.has_embeddings || false,
        message_count: conversation.message_count,
      });
    } else if (onClick) {
      onClick();
    }
  };

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'claude':
        return 'bg-purple-100 text-purple-700';
      case 'chatgpt':
        return 'bg-blue-100 text-blue-700';
      case 'gemini':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-muted text-foreground/80';
    }
  };

  return (
    <div
      className={`flex items-center p-4 bg-background rounded-lg hover:bg-muted/50 transition-colors ${
        isSelecting ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-indigo-500' : 'border border-border'}`}
      onClick={handleRowClick}
    >
      {/* Selection Checkbox */}
      {isSelecting && (
        <div className="mr-3">
          <button
            onClick={handleSelect}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-background border-border hover:border-indigo-500'
            }`}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-foreground truncate">
            {conversation.title || 'Untitled Conversation'}
          </h4>
          {conversation.platform && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getSourceColor(
                conversation.platform
              )}`}
            >
              {conversation.platform}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
          {conversation.message_count && (
            <span>{conversation.message_count} messages</span>
          )}
          <span>{new Date(conversation.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Embedding Status */}
      <div className="ml-3">
        <EmbeddingStatusBadge
          hasEmbeddings={conversation.has_embeddings || false}
          createdAt={conversation.created_at}
          onGenerate={
            onGenerateEmbedding
              ? () => onGenerateEmbedding(conversation.id)
              : undefined
          }
          isGenerating={isGeneratingEmbedding}
          showLabel
        />
      </div>

      {/* Custom actions */}
      {children && <div className="ml-3">{children}</div>}
    </div>
  );
}
