// app/(dashboard)/import/page.tsx
// Simplified - Layout handles nav, auth, AppLayout setup
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '../../../lib/supabase'
import FileUpload from '../../../components/import/FileUpload'

export default function ImportPage() {
  const [conversationCount, setConversationCount] = useState(0)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadConversationCount()
  }, [])

  const loadConversationCount = async () => {
    try {
      // Layout already handles auth, but we need user for count
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.error('No user found in import page')
        return
      }
      
      // Get conversation count for display/reference
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      setConversationCount(count || 0)
    } catch (err) {
      console.error('Error loading conversation count:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="p-4 md:p-8">
        <h1 className="text-4xl font-bold mb-4">Import Conversations</h1>
        <p className="text-lg mb-8 text-muted-foreground dark:text-muted-foreground/70">
          Upload your chat exports from ChatGPT, Claude, Gemini, and other AI tools.
          We'll parse and organize them into your conversation library.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <FileUpload />
          </div>
          
          <div className="space-y-6">
            <div className="bg-background dark:bg-foreground/10 rounded-lg p-6 shadow">
              <h3 className="text-xl font-semibold mb-3">Supported Formats</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  ChatGPT JSON exports
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Claude conversation exports
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-500 mr-2">○</span>
                  Gemini exports (coming soon)
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-500 mr-2">○</span>
                  Custom JSON format
                </li>
              </ul>
            </div>
            
            <div className="bg-background dark:bg-foreground/10 rounded-lg p-6 shadow">
              <h3 className="text-xl font-semibold mb-3">What happens next?</h3>
              <ol className="space-y-2 text-sm">
                <li className="flex">
                  <span className="text-blue-500 mr-2 font-bold">1.</span>
                  We analyze your file format
                </li>
                <li className="flex">
                  <span className="text-blue-500 mr-2 font-bold">2.</span>
                  Extract conversations and metadata
                </li>
                <li className="flex">
                  <span className="text-blue-500 mr-2 font-bold">3.</span>
                  Save to your private library
                </li>
                <li className="flex">
                  <span className="text-blue-500 mr-2 font-bold">4.</span>
                  Generate smart summaries
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}