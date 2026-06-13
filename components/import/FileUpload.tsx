'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { parseConversationFile } from '../../lib/utils/fileParser'

type FileStatus = 'pending' | 'processing' | 'success' | 'error'

interface FileWithStatus {
  file: File
  status: FileStatus
  message?: string
  conversationCount?: number
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [uploading, setUploading] = useState(false)
  const [allComplete, setAllComplete] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).map(file => ({
        file,
        status: 'pending' as FileStatus,
      }))
      setFiles(selectedFiles)
      setAllComplete(false)
    }
  }

  const updateFileStatus = (index: number, status: FileStatus, message?: string, conversationCount?: number) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status, message, conversationCount } : f
    ))
  }

  const processFile = async (fileWithStatus: FileWithStatus, index: number) => {
    const { file } = fileWithStatus
    
    try {
      updateFileStatus(index, 'processing')
      
      // Get the authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('You must be logged in to upload conversations')
      }
      
      console.log('Uploading file:', file.name, 'as user:', user.id)

      // Check conversation limit for free tier
      const [profileResult, countResult] = await Promise.all([
        supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).single(),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const tier = profileResult.data?.subscription_tier ?? 'free'
      const currentCount = countResult.count ?? 0
      const LIMITS: Record<string, number | null> = { free: 10, starter: 50, pro: 200, unlimited: null }
      const limit = LIMITS[tier]

      if (limit !== null && currentCount >= limit) {
        throw new Error(`You've reached the ${currentCount} conversation limit on the ${tier} plan. Upgrade to import more.`)
      }
      
      // Read file content
      const fileContent = await file.text()

      // Parse the conversation - this returns an ARRAY
      const parsedConversations = parseConversationFile(file, fileContent)

      console.log(`Parsed ${parsedConversations.length} conversations from ${file.name}`)

      // Save each conversation to Supabase
      let savedCount = 0
      for (const conv of parsedConversations) {
        // Type assertion to include platform and url fields added in fileParser.js
        const conversation = conv as typeof conv & { platform?: string; url?: string }

        // Detect platform - first check if platform exists in JSON, then fallback to source detection
        let platform = 'unknown'

        // CRITICAL: Check conversation.platform FIRST before falling back to source
        // The parser extracts this from JSON - do not remove!
        if (conversation.platform) {
          const platformStr = (conversation.platform || '').toLowerCase()
          if (platformStr.includes('claude')) {
            platform = 'claude.ai'
          } else if (platformStr.includes('chatgpt') || platformStr.includes('openai')) {
            platform = 'chatgpt'
          } else if (platformStr.includes('gemini')) {
            platform = 'gemini'
          } else {
            platform = conversation.platform // Use as-is if not recognized
          }
        } else {
          // Fallback to detecting from source field
          const sourceStr = (conversation.source || '').toLowerCase()
          if (sourceStr.includes('claude')) {
            platform = 'claude.ai'
          } else if (sourceStr.includes('chatgpt') || sourceStr.includes('openai')) {
            platform = 'chatgpt'
          } else if (sourceStr.includes('gemini')) {
            platform = 'gemini'
          }
        }

        const now = new Date().toISOString()

        // ✅ Calculate message_count from messages array
        const messages = conversation.messages || []
        const calculatedMessageCount = Array.isArray(messages) ? messages.length : 0

        // ✅ FIX: Create properly typed conversation data object
        const conversationData: any = {
          title: conversation.title || 'Untitled Conversation',
          content: conversation.content || {},
          source: conversation.url || conversation.source || platform,
          messages: messages,
          message_count: calculatedMessageCount, // ✅ Use calculated count
          created_at: conversation.created_at || now,
          updated_at: now,
          platform: platform,
          metadata: {
            original_filename: file.name,
            import_date: now,
            file_size: file.size,
          },
          tags: [], // ✅ Empty array for JSONB
          user_id: user.id,
          session_id: null,
          project_id: null,
          summary: null,
        }
        
        console.log('Saving conversation with data:', JSON.stringify(conversationData, null, 2))
        
        const { data, error } = await supabase
          .from('conversations')
          .insert([conversationData])
          .select()
        
        if (error) {
          console.error('Database error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          throw new Error(`Database error: ${error.message}`)
        }
        
        savedCount++
        console.log('✅ Saved conversation successfully:', data)

        // Auto-generate embeddings in the background (non-blocking)
        if (data && data[0]?.id) {
          const conversationId = data[0].id
          console.log('🧠 Triggering auto-embedding generation for conversation:', conversationId)

          // Fire and forget - don't wait for completion
          fetch('/api/embeddings/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: conversationId }),
          }).then(response => {
            if (response.ok) {
              console.log('✅ Embedding generation started for:', conversationId)
            } else {
              console.warn('⚠️ Embedding generation failed for:', conversationId)
            }
          }).catch(error => {
            console.warn('⚠️ Embedding generation error (non-critical):', error.message)
          })
        }
      }

      updateFileStatus(
        index, 
        'success', 
        `Imported ${savedCount} conversation(s)`, 
        savedCount
      )
      
    } catch (error) {
      console.error('Upload error for file:', file.name, error)
      updateFileStatus(
        index, 
        'error', 
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  const handleUploadAll = async () => {
    if (files.length === 0) return
    
    setUploading(true)
    setAllComplete(false)
    
    // Process files sequentially (one at a time)
    for (let i = 0; i < files.length; i++) {
      await processFile(files[i], i)
    }
    
    setUploading(false)
    setAllComplete(true)

    // Check if all files succeeded
    const allSucceeded = files.every(f => f.status === 'success')
    
    if (allSucceeded) {
      // Redirect to threads page after 2 seconds
      setTimeout(() => {
        router.push('/threads')
        router.refresh() // Refresh to show new data
      }, 2000)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setAllComplete(false)
  }

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'processing':
        return '⚙️'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
    }
  }

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground dark:text-muted-foreground/70'
      case 'processing':
        return 'text-blue-600 dark:text-blue-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
    }
  }

  const totalConversations = files.reduce((sum, f) => sum + (f.conversationCount || 0), 0)
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="border-2 border-dashed border-border dark:border-foreground/20 rounded-lg p-8">
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Upload Chat Exports</h3>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 mb-4">
              Select multiple ChatGPT, Claude, or other AI chat export files
            </p>
          </div>
        </div>
        
        <input
          type="file"
          accept=".json,.txt,.csv"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        
        <div className="text-center">
          <label
            htmlFor="file-upload"
            className={`inline-block bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Choose Files
          </label>
        </div>
        
        {files.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* File List */}
            <div className="bg-muted/50 dark:bg-foreground/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">
                  Selected Files ({files.length})
                </h4>
                {!uploading && !allComplete && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {files.map((fileWithStatus, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background dark:bg-foreground/20 rounded border border-border dark:border-foreground/20"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">
                      {getStatusIcon(fileWithStatus.status)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileWithStatus.file.name}
                      </p>
                      {fileWithStatus.message && (
                        <p className={`text-xs mt-1 ${getStatusColor(fileWithStatus.status)}`}>
                          {fileWithStatus.message}
                        </p>
                      )}
                      {fileWithStatus.status === 'processing' && (
                        <div className="mt-2 w-full bg-muted dark:bg-gray-600 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!uploading && fileWithStatus.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-3 text-muted-foreground/70 hover:text-red-600 dark:hover:text-red-400 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {!allComplete && (
              <div className="flex justify-center">
                <button
                  onClick={handleUploadAll}
                  disabled={uploading || files.length === 0}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                >
                  {uploading ? (
                    <span className="flex items-center space-x-2">
                      <span className="animate-spin">⚙️</span>
                      <span>Processing Files...</span>
                    </span>
                  ) : (
                    `Upload & Process ${files.length} File${files.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            )}

            {/* Summary */}
            {allComplete && (
              <div className="mt-4 p-4 rounded-lg bg-muted dark:bg-foreground/10 border border-border dark:border-foreground/30">
                <h4 className="font-semibold mb-2 text-sm">Import Complete</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-green-600 dark:text-green-400">
                    ✅ {successCount} file{successCount !== 1 ? 's' : ''} processed successfully
                  </p>
                  {errorCount > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      ❌ {errorCount} file{errorCount !== 1 ? 's' : ''} failed
                    </p>
                  )}
                  {totalConversations > 0 && (
                    <p className="text-blue-600 dark:text-blue-400">
                      💬 {totalConversations} conversation{totalConversations !== 1 ? 's' : ''} imported total
                    </p>
                  )}
                </div>
                
                {successCount > 0 && (
                  <p className="text-xs mt-3 text-muted-foreground dark:text-muted-foreground/70">
                    Generating embeddings in background... Redirecting to your conversations...
                  </p>
                )}
                
                {errorCount > 0 && successCount === 0 && (
                  <button
                    onClick={clearAll}
                    className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}