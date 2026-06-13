// components/ConversationListItem.tsx
// Shared component for displaying conversations consistently across pages
'use client'

import { useState } from 'react'
import { Button } from '../Button'

interface Conversation {
  id: string
  title: string
  platform: string
  message_count: number
  created_at: string
  user_id: string | null
  source?: string
  summary?: string
  content?: any
  project_id?: string | null
}

interface ConversationListItemProps {
  conversation: Conversation
  onAnalyze?: (conversation: Conversation) => void
  onContinue?: (conversation: Conversation) => void
  onViewDetails?: (conversationId: string) => void
  onAddToProject?: (conversation: Conversation) => void
  isAnalyzing?: boolean
  showProjectButton?: boolean
  viewMode?: 'card' | 'list'
  isPending?: boolean
}

export function ConversationListItem({
  conversation,
  onAnalyze,
  onContinue,
  onViewDetails,
  onAddToProject,
  isAnalyzing = false,
  showProjectButton = false,
  viewMode = 'card',
  isPending = false
}: ConversationListItemProps) {
  const [showProjectModal, setShowProjectModal] = useState(false)
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPreviewText = (): string => {
    if (conversation.summary) return conversation.summary
    
    try {
      if (conversation.content && typeof conversation.content === 'object') {
        const firstMessage = conversation.content.messages?.[0]?.content
        if (firstMessage) {
          return firstMessage.substring(0, 150) + (firstMessage.length > 150 ? '...' : '')
        }
      }
    } catch (e) {
      console.error('Error extracting preview:', e)
    }
    
    return 'Click to view conversation details'
  }

  const handleAnalyze = () => {
    if (onAnalyze) {
      onAnalyze(conversation)
    }
  }

  const handleContinue = () => {
    if (onContinue) {
      onContinue(conversation)
    }
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(conversation.id)
    }
  }

  const handleAddToProject = () => {
    if (onAddToProject) {
      onAddToProject(conversation)
    }
  }

  if (viewMode === 'list') {
    return (
      <div className="px-6 py-4 hover:bg-muted/50 dark:hover:bg-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-foreground dark:text-white truncate">
              {conversation.title || 'Untitled Conversation'}
            </h3>
            <div className="mt-2 flex items-center text-sm text-muted-foreground dark:text-muted-foreground/70">
              <span>Source: {conversation.platform || conversation.source || 'Unknown'}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(conversation.created_at)}</span>
              {conversation.message_count && (
                <>
                  <span className="mx-2">•</span>
                  <span>{conversation.message_count} messages</span>
                </>
              )}
              {conversation.project_id && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-blue-600">In Project</span>
                </>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground/70 line-clamp-2">
              {getPreviewText()}
            </p>
          </div>
          <div className="ml-4 flex items-center space-x-2">
            {showProjectButton && !conversation.project_id && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddToProject}
                title="Add to project"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isPending}
              loading={isAnalyzing}
            >
              Analyze
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleContinue}
            >
              Continue
            </Button>
            {onViewDetails && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewDetails}
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Card view (default)
  return (
    <div className="bg-background dark:bg-foreground/10 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">
            {conversation.title || 'Untitled Conversation'}
          </h3>
          <div className="flex items-center text-sm text-muted-foreground dark:text-muted-foreground/70 space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {conversation.platform || conversation.source || 'Unknown'}
            </span>
            <span>{formatDate(conversation.created_at)}</span>
            <span>• {conversation.message_count || 0} messages</span>
            {conversation.project_id && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                In Project
              </span>
            )}
          </div>
        </div>
        {showProjectButton && !conversation.project_id && (
          <button
            onClick={handleAddToProject}
            className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            title="Add to project"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/>
              <path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"/>
              <path d="M15 2v5h5"/>
              <path d="M12 11v6M9 14h6"/>
            </svg>
          </button>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 mb-4 line-clamp-3">
        {getPreviewText()}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isPending}
            loading={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
        {onViewDetails && (
          <button
            onClick={handleViewDetails}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium hover:underline"
          >
            View Details →
          </button>
        )}
      </div>
    </div>
  )
}

export default ConversationListItem