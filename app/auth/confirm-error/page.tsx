// app/auth/confirm-error/page.tsx
'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { Heading } from '@/components/Heading'
import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'
import { XCircle, Mail } from 'lucide-react'

export default function ConfirmErrorPage() {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()

  const error = searchParams.get('error') || 'unknown'

  const getErrorMessage = () => {
    switch (error) {
      case 'missing_code':
        return 'No confirmation code was provided. Please check your email for the correct link.'
      case 'unexpected':
        return 'An unexpected error occurred. Please try again.'
      default:
        return error
    }
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        const { error } = await supabase.auth.resend({ type: 'signup', email: session.user.email })
        if (error) {
          setResendMessage({ type: 'error', text: error.message })
        } else {
          setResendMessage({ type: 'success', text: 'Confirmation email sent! Please check your inbox.' })
        }
      } else {
        setResendMessage({ type: 'info', text: 'Please sign up first to receive a confirmation email.' })
        setTimeout(() => router.push('/auth'), 2000)
      }
    } catch {
      setResendMessage({ type: 'error', text: 'Failed to resend email. Please try again.' })
    } finally {
      setIsResending(false)
    }
  }

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--border-radius-xl)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    padding: 'var(--spacing-12) var(--spacing-10)',
    width: '100%',
    maxWidth: '480px',
    minWidth: '480px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6)',
    boxSizing: 'border-box' as const,
  }

  const commonIssues = [
    'The link may have expired (valid for 24 hours)',
    'You may have already confirmed your email',
    'The link may have been clicked before',
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-page-bg)', padding: 'var(--spacing-16) var(--spacing-4)' }}>
      <div style={cardStyles}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ margin: '0 auto var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
            <Logo size="xl" />
          </div>
          <Heading level={1} align="center" margin="sm">Email confirmation</Heading>
        </div>

        {/* Error icon + message */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: 'var(--border-radius-full)',
            backgroundColor: 'var(--color-coral-50, #FFF1F0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <XCircle size={28} style={{ color: 'var(--color-coral, #E05252)' }} />
          </div>
          <p style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)', margin: 0 }}>
            Confirmation failed
          </p>
          <p style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {getErrorMessage()}
          </p>
        </div>

        {/* Common issues */}
        <Alert type="warning" dismissible={false}>
          <p style={{ margin: '0 0 var(--spacing-2)', fontWeight: 'var(--font-weight-semibold)' }}>Common issues:</p>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            {commonIssues.map((issue, i) => (
              <li key={i} style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family-primary)' }}>{issue}</li>
            ))}
          </ul>
        </Alert>

        {/* Resend feedback */}
        {resendMessage && (
          <Alert type={resendMessage.type} dismissible={false}>
            {resendMessage.text}
          </Alert>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <Button
            variant="primary"
            size="lg"
            icon={<Mail />}
            disabled={isResending}
            onClick={handleResendEmail}
            style={{ width: '100%' }}
          >
            {isResending ? 'Sending...' : 'Resend confirmation email'}
          </Button>
          <Button
            variant="tertiary"
            size="lg"
            onClick={() => router.push('/auth')}
            style={{ width: '100%' }}
          >
            Back to sign in
          </Button>
        </div>

        {/* Support note */}
        <p style={{
          fontFamily: 'var(--font-family-primary)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          margin: 0
        }}>
          Still having trouble? Contact us at{' '}
          <a href="mailto:support@threadcub.com" style={{ color: 'var(--color-primary-500)', textDecoration: 'none' }}>
            support@threadcub.com
          </a>
        </p>

      </div>
    </div>
  )
}
