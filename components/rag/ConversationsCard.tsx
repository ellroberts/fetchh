'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'

interface Conversation {
  id: string
  title: string
  platform: string
  message_count: number
  created_at: string
  has_embeddings?: boolean
  project_id?: string | null
}

interface ConversationCardProps {
  conversation: Conversation
  isSelected: boolean
  onSelect: () => void
  onAnalyze: (conversation: Conversation) => void
  onContinue: (conversation: Conversation) => void
  onViewDetails: (id: string) => void
  onAddToProject: (conversation: Conversation) => void
  onDelete: (conversation: Conversation) => void
  isAnalyzing?: boolean
  viewMode: 'card' | 'list'
}

const platformStyles: Record<string, string> = {
  claude: 'bg-purple-100 text-purple-700',
  chatgpt: 'bg-green-100 text-green-700',
  gemini: 'bg-blue-100 text-blue-700',
}

function getPlatformStyle(platform: string) {
  const key = platform?.toLowerCase()
  if (key?.includes('claude')) return platformStyles.claude
  if (key?.includes('chatgpt') || key?.includes('openai')) return platformStyles.chatgpt
  if (key?.includes('gemini')) return platformStyles.gemini
  return 'bg-muted text-foreground/80'
}

function EmbeddingBadge({ hasEmbeddings, createdAt }: { hasEmbeddings: boolean; createdAt?: string }) {
  const [almostReady, setAlmostReady] = useState(false)

  useEffect(() => {
    if (!createdAt) { setAlmostReady(false); return }
    setAlmostReady(Date.now() - new Date(createdAt).getTime() < 90000)
  }, [createdAt])

  if (hasEmbeddings) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 whitespace-nowrap">
        <span>✓</span> Ready
      </span>
    )
  }
  if (almostReady) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-600 whitespace-nowrap">
        <span>◌</span> Almost ready!
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground whitespace-nowrap">
      <span>○</span> On hold
    </span>
  )
}

function SelectCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
        checked
          ? 'bg-indigo-600 border-indigo-600'
          : 'bg-background border-border hover:border-indigo-400'
      }`}
      aria-label={checked ? 'Deselect conversation' : 'Select conversation'}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}

export function ConversationCard({
  conversation,
  isSelected,
  onSelect,
  onAnalyze,
  onContinue,
  onViewDetails,
  onAddToProject,
  onDelete,
  isAnalyzing = false,
  viewMode,
}: ConversationCardProps) {
  const date = new Date(conversation.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (viewMode === 'list') {
    return (
      <Card className={`flex items-center gap-3 px-4 py-3 transition-all ${
        isSelected ? 'ring-2 ring-indigo-500' : ''
      }`}>
        {/* Checkbox */}
        <SelectCheckbox checked={isSelected} onChange={onSelect} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground text-sm truncate">
              {conversation.title || 'Untitled Conversation'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getPlatformStyle(conversation.platform)}`}>
              {conversation.platform}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{conversation.message_count} messages</span>
            <span>{date}</span>
          </div>
        </div>

        {/* Embedding badge */}
        <EmbeddingBadge hasEmbeddings={conversation.has_embeddings || false} createdAt={conversation.created_at} />

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onAddToProject(conversation)}
            className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors whitespace-nowrap"
          >
            Project
          </button>
          <button
            onClick={() => onAnalyze(conversation)}
            disabled={isAnalyzing}
            className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            onClick={() => onContinue(conversation)}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
          >
            Continue
          </button>
          <button
            onClick={() => onViewDetails(conversation.id)}
            className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors whitespace-nowrap"
          >
            Details
          </button>
          <button
            onClick={() => onDelete(conversation)}
            className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 transition-colors whitespace-nowrap"
          >
            Delete
          </button>
        </div>
      </Card>
    )
  }

  // Card view
  return (
    <Card className={`flex flex-col transition-all ${
      isSelected ? 'ring-2 ring-indigo-500' : ''
    }`}>
      {/* Header: checkbox + title + embedding badge */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <SelectCheckbox checked={isSelected} onChange={onSelect} />
        <p className="flex-1 font-semibold text-foreground text-sm leading-snug line-clamp-2 min-w-0">
          {conversation.title || 'Untitled Conversation'}
        </p>
        <div className="flex-shrink-0">
          <EmbeddingBadge hasEmbeddings={conversation.has_embeddings || false} createdAt={conversation.created_at} />
        </div>
      </div>

      {/* Meta: platform + message count + date */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${getPlatformStyle(conversation.platform)}`}>
          {conversation.platform}
        </span>
        <span className="text-xs text-muted-foreground">{conversation.message_count} messages</span>
        <span className="text-xs text-muted-foreground/70 ml-auto">{date}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Actions */}
      <div className="flex flex-col gap-1.5 p-3">
        <button
          onClick={() => onAddToProject(conversation)}
          className="w-full px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors text-left"
        >
          Project
        </button>
        <button
          onClick={() => onAnalyze(conversation)}
          disabled={isAnalyzing}
          className="w-full px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
        <button
          onClick={() => onContinue(conversation)}
          className="w-full px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium text-center"
        >
          Continue
        </button>
        <button
          onClick={() => onViewDetails(conversation.id)}
          className="w-full px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors text-left"
        >
          Details
        </button>
        <button
          onClick={() => onDelete(conversation)}
          className="w-full px-3 py-1.5 text-xs text-red-500 hover:text-red-700 transition-colors text-left"
        >
          Delete
        </button>
      </div>
    </Card>
  )
}