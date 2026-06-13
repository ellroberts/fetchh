'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '../../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { UpdatePasswordCard } from '../../../components/AuthCard'
import { Loader2 } from 'lucide-react'

function readHashTokens() {
  if (typeof window === 'undefined') return { at: '', rt: '' }
  const p = new URLSearchParams(window.location.hash.slice(1))
  return { at: p.get('access_token') || '', rt: p.get('refresh_token') || '' }
}

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  
  const supabase = createSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for invite token in query params
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        if (tokenHash && type === 'invite') {
          // Handle invite link - verify the token
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'invite'
          })
          
          if (error) {
            console.error('Invite verification error:', error)
            setMessage({
              type: 'error',
              text: 'Invalid or expired invite link. Please request a new invitation.',
              dismissible: false
            })
            setCheckingSession(false)
            return
          }
          
          // Token verified, user can now set password
          setValidSession(true)
          setCheckingSession(false)
          return
        }

        // Check for password reset tokens in hash
        const { at, rt } = readHashTokens()
        if (at && rt) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          })
          if (setErr) throw setErr
          
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }

        // Check if user has a valid session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session) {
          setValidSession(true)
        } else {
          setMessage({
            type: 'error',
            text: 'Invalid or expired reset link. Please request a new password reset.',
            dismissible: false
          })
        }
      } catch (error) {
        console.error('Session check error:', error)
        setMessage({
          type: 'error',
          text: 'Error validating link. Please try again.',
          dismissible: false
        })
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [supabase.auth, searchParams])

  const handleUpdatePassword = async (password) => {
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      setMessage({ 
        type: 'success', 
        text: 'Password updated successfully! Redirecting to dashboard...',
        dismissible: false
      })
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update password. Please try again.',
        dismissible: true
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-page-bg)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-warm-600)', margin: 0 }}>Validating link...</p>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-page-bg)', padding: 'var(--spacing-4)' }}>
        <UpdatePasswordCard
          message={message}
          onBackToSignIn={() => router.push('/auth/reset-password')}
          loading={false}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <UpdatePasswordCard
        loading={loading}
        message={message}
        onSubmit={handleUpdatePassword}
        onBackToSignIn={() => router.push('/auth')}
        onDismissMessage={() => setMessage(null)}
      />
    </div>
  )
}