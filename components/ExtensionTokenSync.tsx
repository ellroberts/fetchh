'use client'
import { useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export function ExtensionTokenSync() {
  useEffect(() => {
    const supabase = createSupabaseClient()
    const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID

    const pushTokenToExtension = async (accessToken: string): Promise<void> => {
      try {
        const chromeGlobal = typeof window !== 'undefined' ? (window as any).chrome : undefined
        if (!chromeGlobal?.runtime || !extensionId) return

        let encryptionKey: string | null = null
        try {
          const keyRes = await fetch('/api/user/encryption-key', {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          if (keyRes.ok) {
            const keyData = await keyRes.json()
            encryptionKey = keyData.encryptionKey || null
          }
        } catch { /* encryption key is optional */ }

        await new Promise<void>((resolve) => {
          try {
            chromeGlobal.runtime.sendMessage(
              extensionId,
              { action: 'storeAuthToken', token: accessToken, encryptionKey },
              () => {
                if (chromeGlobal.runtime.lastError) { /* extension inactive, ignore */ }
                resolve()
              }
            )
          } catch {
            resolve()
          }
        })
      } catch { /* never surface errors from this component */ }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        pushTokenToExtension(session.access_token)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (session?.access_token) {
        pushTokenToExtension(session.access_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
