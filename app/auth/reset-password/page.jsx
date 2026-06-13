'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResetPasswordCard } from '../../../components/AuthCard'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-page-bg)', padding: 'var(--spacing-4)' }}>
      <ResetPasswordCard
        loading={loading}
        message={message}
        onDismissMessage={() => setMessage(null)}
        onSubmit={async (email) => {
          setLoading(true)
          setMessage(null)
          try {
            const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.threadcub.com'
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${site}/auth/callback`,
            })
            if (error) throw new Error(error.message || 'Something went wrong.')
            setMessage({ type: 'success', text: 'Check your email for reset instructions.' })
          } catch (err) {
            setMessage({ type: 'error', text: err.message })
          } finally {
            setLoading(false)
          }
        }}
        onBackToSignIn={() => router.push('/auth')}
      />
    </div>
  )
}