// app/(dashboard)/settings/page.tsx
// Simplified - Layout handles nav, auth, AppLayout setup
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '../../../lib/supabase'

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [conversationCount, setConversationCount] = useState(0)
  const [apiToken, setApiToken] = useState<string>('')
  const [copyLabel, setCopyLabel] = useState<string>('Copy')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Layout already handles auth, but we need user data for display
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.error('No user found in settings')
        return
      }
      
      setUserEmail(user.email || '')
      setUserId(user.id)
      
      // Get conversation count
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      setConversationCount(count || 0)

      const { data: { session } } = await supabase.auth.getSession()
      setApiToken(session?.access_token || '')
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-4 md:p-8">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔄</div>
            <div>Loading settings...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <div className="space-y-6">
          {/* Account Section */}
          <div className="bg-background dark:bg-foreground/10 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 dark:text-muted-foreground/50 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-foreground/20 rounded-md bg-muted/50 dark:bg-foreground/20 text-muted-foreground dark:text-muted-foreground/70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 dark:text-muted-foreground/50 mb-1">
                  User ID
                </label>
                <input
                  type="text"
                  value={userId}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-foreground/20 rounded-md bg-muted/50 dark:bg-foreground/20 text-muted-foreground dark:text-muted-foreground/70 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Data Section */}
          <div className="bg-background dark:bg-foreground/10 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Data</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground/80 dark:text-muted-foreground/50">Total Conversations</span>
                <span className="font-semibold">{conversationCount}</span>
              </div>
              <div className="pt-4 border-t border-border dark:border-foreground/30">
                <button
                  onClick={() => router.push('/import')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Import More Conversations
                </button>
              </div>
            </div>
          </div>

          {/* MCP / API Access Section */}
          <div className="bg-background dark:bg-foreground/10 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">MCP / API Access</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground/80 dark:text-muted-foreground/50 mb-1">
                  API Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiToken}
                    readOnly
                    className="w-full px-3 py-2 border border-border dark:border-foreground/20 rounded-md bg-muted/50 dark:bg-foreground/20 text-muted-foreground dark:text-muted-foreground/70 font-mono text-xs"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiToken)
                      setCopyLabel('Copied!')
                      setTimeout(() => setCopyLabel('Copy'), 2000)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition whitespace-nowrap"
                  >
                    {copyLabel}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground/70">
                  Use this token to connect the ThreadCub MCP plugin. Add it as <span className="font-mono">THREADCUB_TOKEN</span> in your Claude desktop config. Your token changes when you sign out and back in.
                </p>
              </div>
            </div>
          </div>

          {/* Preferences Section (Placeholder) */}
          <div className="bg-background dark:bg-foreground/10 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Preferences</h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">
              Preference settings coming soon...
            </p>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-4">Danger Zone</h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => alert('Account deletion is not yet implemented')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}