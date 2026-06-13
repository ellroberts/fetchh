'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '../../components/Button'
import { Alert } from '../../components/Alert'
import { SocialButton } from '../../components/SocialButton'
import { Input } from '../../components/Input'
import { Loader2, MessageSquare, FolderOpen, PawPrint, Bot } from 'lucide-react'

export default function AuthPage() {
  const [step, setStep] = useState('email')
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const supabase = createSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam) setMode(modeParam)
  }, [searchParams])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && mode !== 'waitlist') router.push(searchParams.get('from') === 'extension' ? '/auth/extension-callback' : '/dashboard')
      else setCheckingAuth(false)
    }
    getUser()
  }, [mode])

  const VALUE_PROPS = [
    { icon: MessageSquare, color: 'var(--color-accent-teal)',  label: 'Never lose a breakthrough again' },
    { icon: FolderOpen,    color: 'var(--color-accent-rose)',  label: 'Continue without friction' },
    { icon: Bot,           color: 'var(--color-accent-amber)', label: 'Find what you need, fast' },
    { icon: PawPrint,      color: 'var(--color-primary-500)',  label: 'Stay in control as your AI work grows' },
  ]

  const handleSocialAuth = async (provider) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: searchParams.get('from') === 'extension' ? 'https://www.threadcub.com/auth/callback?from=extension' : 'https://www.threadcub.com/auth/callback' }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleResend = async () => {
    setOtp(['', '', '', '', '', ''])
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === 'signup' }
    })
    if (error) { setError(error.message); setLoading(false) }
    else setLoading(false)
  }

  const handleEmailSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === 'signup' }
    })
    if (error) {
      const msg = error.message.toLowerCase()
      setError(
        msg.includes('security') || msg.includes('rate')
          ? 'Sorry, you need to wait a moment. Well 16 seconds to be precise'
          : msg.includes('signups not allowed') || msg.includes('user not found')
          ? 'No account found with that email.'
          : error.message
      )
      setTimeout(() => setError(null), 3000)
      setLoading(false)
    }
    else { setStep('otp'); setLoading(false) }
  }

  const handleWaitlistSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage-waitlist' }),
      })
      const data = await res.json()
      if (data.success) {
        setWaitlistSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      document.getElementById('otp-5')?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) { setError(error.message); setLoading(false) }
    else router.push(searchParams.get('from') === 'extension' ? '/auth/extension-callback' : '/dashboard')
  }

  if (checkingAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-500)' }} />
    </div>
  )

  // ── Banner content per mode/state ──
  const renderBanner = () => {
    if (mode === 'waitlist') {
      if (waitlistSuccess) return (
        <Alert type="success" size="md" dismissible={false} style={{ width: '100%', margin: 0 }}>
          Great, See you in the den!
        </Alert>
      )
      if (error) return (
        <Alert type="error" size="md" dismissible={false} style={{ width: '100%', margin: 0 }}>{error}</Alert>
      )
      return (
        <div style={{ width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-3)', paddingRight: 'var(--spacing-4)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Already have an account?</span>
          <Button variant="neutral" size="sm" onClick={() => router.push('/auth?mode=signin')}>Sign in</Button>
        </div>
      )
    }

    if (step === 'otp') {
      if (!error) return (
        <Alert type="success" size="md" dismissible={false} style={{ width: '100%', margin: 0 }}>
          A 6-digit code has been sent to <strong>{email}</strong>
        </Alert>
      )
      if (error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')) return (
        <Alert type="warning" size="md" dismissible={false} style={{ width: '100%', margin: 0 }} action={{ label: 'Resend', onClick: handleResend, loading: loading }}>
          Ahh, the code expired. Lets get another one sent over
        </Alert>
      )
      return <Alert type="error" size="md" dismissible={false} style={{ width: '100%', margin: 0 }}>{error}</Alert>
    }

    // email step
    if (error) return (
      <Alert type="error" size="md" dismissible={false} style={{ width: '100%', margin: 0 }}>{error}</Alert>
    )

    if (mode === 'signin') return (
      <div style={{ width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-3)', paddingRight: 'var(--spacing-4)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Don't have an account?</span>
        <Button variant="neutral" size="sm" onClick={() => { setEmail(''); setError(null); setMode('signup') }}>Sign up</Button>
      </div>
    )

    // signup
    return (
      <div style={{ width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-3)', paddingRight: 'var(--spacing-4)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Already have an account?</span>
        <Button variant="neutral" size="sm" onClick={() => { setEmail(''); setError(null); setMode('signin') }}>Sign In</Button>
      </div>
    )
  }

  return (
    <>
      <div className="auth-grid" style={{ minHeight: '100vh', display: 'grid', fontFamily: 'var(--font-family-primary)' }}>

        {/* Left */}
        <div className="auth-left" style={{ minHeight: '100vh', flexDirection: 'column', justifyContent: 'center', padding: 'var(--spacing-16)', backgroundColor: 'var(--color-page-bg)' }}>
          <h1 style={{ fontSize: 'var(--font-size-5xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)', lineHeight: '56px', margin: '0 0 var(--spacing-3)', maxWidth: '480px' }}>
            Everything you need to stay in control of your AI conversations
          </h1>
          <p style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-secondary)', margin: '0 0 var(--spacing-10)', lineHeight: 1.4, maxWidth: '480px' }}>
            Long chats don't have to mean lost progress.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {VALUE_PROPS.map(({ icon: LucideIcon, color, label }) => (
              <div key={label} style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
                <span style={{ color, flexShrink: 0 }}><LucideIcon size={32} /></span>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-body)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-6)', backgroundColor: 'var(--color-page-bg)' }}>
          <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 'var(--spacing-6)', backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--border-radius-xl)', overflow: 'hidden' }}>

            {/* Banner slot — always exactly 48px */}
            <div style={{ width: '100%', minHeight: 48, flexShrink: 0 }}>
              {renderBanner()}
            </div>

            {/* Bear + form */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
              <img src="/threadcub.svg" alt="ThreadCub" style={{ width: 80, height: 80, borderRadius: '50%', marginTop: '60px', marginBottom: 'var(--spacing-8)' }} />

              <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>

                {mode === 'waitlist' ? (
                  <>
                    <Input label="Email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleWaitlistSubmit()} />
                    <Button variant="primary" size="lg" onClick={handleWaitlistSubmit} disabled={!email || loading} style={{ width: '100%' }}>
                      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Join the Waitlist'}
                    </Button>
                    <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 'var(--spacing-2) 0 0' }}>
                      By continuing, you agree to ThreadCub's{' '}
                      <a href="/terms" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Privacy Policy</a>
                    </p>
                  </>
                ) : step === 'email' ? (
                  <>
                    <Input label="Email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()} />
                    <Button variant="primary" size="lg" onClick={handleEmailSubmit} disabled={!email || loading} style={{ width: '100%' }}>
                      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : mode === 'signin' ? 'Continue' : 'Create your Account'}
                    </Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', margin: 'var(--spacing-2) 0' }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-default)' }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.05em' }}>OR</span>
                      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-default)' }} />
                    </div>
                    <SocialButton provider="google" action="continue" onClick={() => handleSocialAuth('google')} disabled={loading || checkingAuth} />
                    <SocialButton provider="github" action="continue" onClick={() => handleSocialAuth('github')} disabled={loading || checkingAuth} />
                    <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 'var(--spacing-2) 0 0' }}>
                      By continuing, you agree to ThreadCub's{' '}
                      <a href="/terms" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Privacy Policy</a>
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)' }} onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          style={{
                            width: 56, height: 56, textAlign: 'center',
                            fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)',
                            fontFamily: 'var(--font-family-primary)',
                            border: `1.5px solid ${error ? 'var(--color-status-warning-border)' : digit ? 'var(--color-primary-500)' : 'var(--color-border-strong)'}`,
                            color: error ? 'var(--color-status-warning)' : 'var(--color-text-title)',
                            borderRadius: 'var(--border-radius-md)',
                            backgroundColor: 'var(--color-surface-base)',
                            outline: 'none', transition: 'border-color 0.15s',
                          }}
                        />
                      ))}
                    </div>
                    <Button variant="primary" size="lg" onClick={handleVerify} disabled={otp.join('').length < 6 || loading} style={{ width: '100%' }}>
                      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Continue'}
                    </Button>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0, textAlign: 'center' }}>
                      Can't find the email? Might be in your spam folder
                    </p>
                    <Button variant="ghost" size="lg" onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(null) }} style={{ width: '100%' }}>
                      ← Back to email
                    </Button>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
