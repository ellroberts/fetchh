// src/components/AuthCard.tsx
import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Logo } from './Logo'
import { Heading } from './Heading'
import { Input } from './Input'
import { Button } from './Button'
import { Divider } from './Divider'
import { SocialButton } from './SocialButton'
import { Alert } from './Alert'
import { Checkbox } from './Checkbox'

// AuthCard component interface
export interface AuthCardProps {
  mode?: 'signin' | 'signup'
  onToggleMode?: () => void
  onSubmit?: (data: { email: string; password: string; mode: 'signin' | 'signup' }) => Promise<void>
  onGoogleAuth?: () => void
  onGithubAuth?: () => void
  onForgotPassword?: () => void
  loading?: boolean
  message?: {
    type: 'success' | 'error' | 'info' | 'warning'
    text: string
    dismissible?: boolean
  } | null
  onDismissMessage?: () => void
  showRememberMe?: boolean
  rememberMe?: boolean
  onRememberMeChange?: (checked: boolean) => void
  showToggle?: boolean
  maxWidth?: string
  minWidth?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  shadow?: 'sm' | 'md' | 'lg' | 'none'
  hideTitle?: boolean
  hideSubtitle?: boolean
}

// AuthCard Component
export const AuthCard: React.FC<AuthCardProps> = ({
  mode = 'signin',
  onToggleMode,
  onSubmit,
  onGoogleAuth,
  onGithubAuth,
  onForgotPassword,
  loading = false,
  message = null,
  onDismissMessage,
  showRememberMe = false,
  rememberMe = false,
  onRememberMeChange,
  showToggle = true,
  maxWidth = '480px',
  minWidth = '480px',
  padding = 'lg',
  shadow = 'md',
  hideTitle = false,
  hideSubtitle = false
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [touched, setTouched] = useState({
    email: false,
    password: false
  })

  // Validation functions
  const validateEmail = (email: string) => {
    if (!email) return { isValid: false, message: 'Email is required' }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' }
    }
    return { isValid: true, message: '' }
  }

  const validatePassword = (password: string) => {
    if (!password) return { isValid: false, message: 'Password is required' }
    if (mode === 'signup' && password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' }
    }
    if (mode === 'signin' && password.length < 1) {
      return { isValid: false, message: 'Password is required' }
    }
    return { isValid: true, message: '' }
  }

  // Get current validation states
  const emailValidation = validateEmail(formData.email)
  const passwordValidation = validatePassword(formData.password)

  // Show errors only if field has been touched and is invalid
  const showEmailError = touched.email && !emailValidation.isValid
  const showPasswordError = touched.password && !passwordValidation.isValid

  // Check if form is valid for button state
  const isFormValid = emailValidation.isValid && passwordValidation.isValid

  // Padding variants using design tokens
  const paddingVariants = {
    sm: 'var(--spacing-6)',
    md: 'var(--spacing-8)',
    lg: 'var(--spacing-10)',
    xl: 'var(--spacing-12) var(--spacing-10)'
  }

  // Shadow variants using design tokens
  const shadowVariants = {
    none: 'none',
    sm: 'var(--shadow-card)',
    md: '0 4px 16px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)'
  }

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--border-radius-xl)',
    boxShadow: shadowVariants[shadow],
    padding: paddingVariants[padding],
    width: '100%',
    maxWidth: maxWidth,
    minWidth: minWidth,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6)',
    boxSizing: 'border-box'
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })

    if (!isFormValid) {
      return
    }

    if (onSubmit) {
      await onSubmit({
        email: formData.email,
        password: formData.password,
        mode
      })
    }
  }

  // Handle toggle mode
  const handleToggleMode = () => {
    setFormData({ email: '', password: '' })
    setTouched({ email: false, password: false })
    if (onToggleMode) {
      onToggleMode()
    }
  }

  // Content based on mode
  const getContent = () => {
    if (mode === 'signup') {
      return {
        title: 'Get started',
        subtitle: 'Create a new account',
        buttonText: loading ? 'Creating account...' : 'Get started',
        socialGoogleText: 'Sign up with Google',
        socialGithubText: 'Sign up with GitHub'
      }
    } else {
      return {
        title: 'Welcome back',
        subtitle: 'Sign in',
        buttonText: loading ? 'Signing in...' : 'Sign In',
        socialGoogleText: 'Sign in with Google',
        socialGithubText: 'Sign in with GitHub'
      }
    }
  }

  const content = getContent()

  const linkStyle: React.CSSProperties = {
    color: 'var(--color-text-title)',
    textDecoration: 'none',
    fontWeight: 'var(--font-weight-normal)',
    transition: 'text-decoration var(--transition-base)'
  }

  const buttonLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-primary-500)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family-primary)',
    fontWeight: 'var(--font-weight-normal)',
    textDecoration: 'none',
    padding: 0,
    transition: 'text-decoration var(--transition-base)'
  }

  // Render
  return (
    <div style={cardStyles}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          margin: '0 auto var(--spacing-4)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Logo size="xl" />
        </div>
        {!hideTitle && (
          <Heading level={1} align="center" margin="sm">
            {content.title}
          </Heading>
        )}
        {showToggle && (
          <p style={{
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family-primary)',
            color: 'var(--color-text-secondary)',
            margin: '0 0 var(--spacing-8) 0'
          }}>
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={handleToggleMode} style={buttonLinkStyle}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={handleToggleMode} style={buttonLinkStyle}>
                  Sign in
                </button>
              </>
            )}
          </p>
        )}
        {!showToggle && !hideSubtitle && (
          <p style={{
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family-primary)',
            color: 'var(--color-text-secondary)',
            margin: '0 0 var(--spacing-8) 0'
          }}>
            {content.subtitle}
          </p>
        )}
      </div>

      {/* Global card message (Alert) */}
      {message && (
        <Alert
          type={message.type}
          size="md"
          dismissible={message.dismissible !== false && !!onDismissMessage}
          onClose={message.dismissible !== false ? onDismissMessage : undefined}
        >
          {message.text}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        <Input
          label="Email*"
          type="email"
          placeholder="Enter your email"
          trailingIcon={true}
          error={showEmailError}
          errorMessage={emailValidation.message}
          hintText={showEmailError ? emailValidation.message : ''}
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
        />

        <div>
          <Input
            label="Password*"
            type="password"
            placeholder="Enter your password"
            trailingIcon={true}
            error={showPasswordError}
            errorMessage={passwordValidation.message}
              hintText={showPasswordError ? passwordValidation.message : ''}
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
          />

          {/* Fixed height row — prevents layout shift between signin/signup */}
          <div style={{ height: '36px', marginTop: 'var(--spacing-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {mode === 'signup' && (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-primary)' }}>
                Must be at least 8 characters.
              </span>
            )}
            {mode === 'signin' && showRememberMe && (
              <>
                <Checkbox
                  label="Keep me signed in"
                  checked={rememberMe}
                  onChange={onRememberMeChange}
                  size="md"
                />
                {onForgotPassword && (
                  <button type="button" onClick={onForgotPassword} style={buttonLinkStyle}>
                    Forgot password?
                  </button>
                )}
              </>
            )}
            {mode === 'signin' && !showRememberMe && onForgotPassword && (
              <button type="button" onClick={onForgotPassword} style={{ ...buttonLinkStyle, marginLeft: 'auto' }}>
                Forgot password?
              </button>
            )}
          </div>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isFormValid || loading}
          style={{ width: '100%' }}
        >
          {content.buttonText}
        </Button>
      </form>

      {/* Social authentication */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        <Divider text="OR" color="light" bg="var(--color-surface-raised)" />

        <SocialButton
          provider="google"
          text={content.socialGoogleText}
          disabled={loading}
          onClick={onGoogleAuth}
        />

        <SocialButton
          provider="github"
          text={content.socialGithubText}
          disabled={loading}
          onClick={onGithubAuth}
        />
      </div>

      {/* Toggle mode and terms */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        {/* Terms and Privacy disclaimer */}
        <div style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          fontFamily: 'var(--font-family-primary)',
          lineHeight: 'var(--line-height-normal)'
        }}>
          By continuing, you agree to ThreadCub's <br />
          <a href="/terms" style={linkStyle}>
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/privacy" style={linkStyle}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// ResetPasswordCard
// ============================================================
export interface ResetPasswordCardProps {
  loading?: boolean
  message?: { type: 'success' | 'error' | 'info' | 'warning'; text: string } | null
  onDismissMessage?: () => void
  onSubmit?: (email: string) => void
  onBackToSignIn?: () => void
  shadow?: 'sm' | 'md' | 'lg' | 'none'
  maxWidth?: string
  minWidth?: string
  padding?: 'sm' | 'md' | 'lg'
}

export const ResetPasswordCard: React.FC<ResetPasswordCardProps> = ({
  loading = false,
  message,
  onDismissMessage,
  onSubmit,
  onBackToSignIn,
  shadow = 'md',
  maxWidth = '480px',
  minWidth = '480px',
  padding = 'lg',
}) => {
  const [email, setEmail] = React.useState('')
  const [touched, setTouched] = React.useState(false)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const showError = touched && !isValidEmail

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!isValidEmail) return
    onSubmit?.(email)
  }

  const paddingVariants = { sm: 'var(--spacing-6)', md: 'var(--spacing-8)', lg: 'var(--spacing-10)', xl: 'var(--spacing-12) var(--spacing-10)' }
  const shadowVariants = {
    none: 'none',
    sm: 'var(--shadow-card)',
    md: '0 4px 16px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)'
  }

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--border-radius-xl)',
    boxShadow: shadowVariants[shadow],
    padding: paddingVariants[padding],
    width: '100%',
    maxWidth,
    minWidth,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6)',
    boxSizing: 'border-box' as const,
  }

  const buttonLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family-primary)',
    fontWeight: 'var(--font-weight-normal)',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-1)',
  }

  return (
    <div style={cardStyles}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ margin: '0 auto var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
          <Logo size="xl" />
        </div>
        <Heading level={1} align="center" margin="sm">Reset password</Heading>
        <p style={{
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-family-primary)',
          color: 'var(--color-text-secondary)',
          margin: '0 0 var(--spacing-8) 0'
        }}>
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {message && (
        <Alert
          type={message.type}
          size="md"
          dismissible={!!onDismissMessage}
          onClose={onDismissMessage}
        >
          {message.text}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        <Input
          label="Email*"
          type="email"
          placeholder="Enter your email"
          trailingIcon={true}
          error={showError}
          errorMessage="Please enter a valid email address"
          hintText={showError ? 'Please enter a valid email address' : ''}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading || !isValidEmail}
          style={{ width: '100%' }}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      {onBackToSignIn && (
        <div style={{ textAlign: 'center' }}>
          <Button variant="tertiary" size="sm" icon={<ArrowLeft />} iconPosition="left" onClick={onBackToSignIn}>
            Back to sign in
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// UpdatePasswordCard
// ============================================================
export interface UpdatePasswordCardProps {
  loading?: boolean
  message?: { type: 'success' | 'error' | 'info' | 'warning'; text: string; dismissible?: boolean } | null
  onDismissMessage?: () => void
  onSubmit?: (password: string) => void
  onBackToSignIn?: () => void
  shadow?: 'sm' | 'md' | 'lg' | 'none'
  maxWidth?: string
  minWidth?: string
  padding?: 'sm' | 'md' | 'lg'
}

export const UpdatePasswordCard: React.FC<UpdatePasswordCardProps> = ({
  loading = false,
  message,
  onDismissMessage,
  onSubmit,
  onBackToSignIn,
  shadow = 'md',
  maxWidth = '480px',
  minWidth = '480px',
  padding = 'lg',
}) => {
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [touched, setTouched] = React.useState({ password: false, confirm: false })

  const passwordValid = password.length >= 8
  const confirmValid = confirm === password && confirm.length > 0
  const showPasswordError = touched.password && !passwordValid
  const showConfirmError = touched.confirm && !confirmValid

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ password: true, confirm: true })
    if (!passwordValid || !confirmValid) return
    onSubmit?.(password)
  }

  const paddingVariants = { sm: 'var(--spacing-6)', md: 'var(--spacing-8)', lg: 'var(--spacing-10)' }
  const shadowVariants = {
    none: 'none',
    sm: 'var(--shadow-card)',
    md: '0 4px 16px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)'
  }

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--border-radius-xl)',
    boxShadow: shadowVariants[shadow],
    padding: paddingVariants[padding],
    width: '100%',
    maxWidth,
    minWidth,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6)',
    boxSizing: 'border-box' as const,
  }

  const buttonLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family-primary)',
    fontWeight: 'var(--font-weight-normal)',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-1)',
  }

  const showForm = !message || message.type !== 'error' || message.dismissible !== false

  return (
    <div style={cardStyles}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ margin: '0 auto var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
          <Logo size="xl" />
        </div>
        <Heading level={1} align="center" margin="sm">Set new password</Heading>
        <p style={{
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-family-primary)',
          color: 'var(--color-text-secondary)',
          margin: '0 0 var(--spacing-8) 0'
        }}>
          Choose a strong password for your account.
        </p>
      </div>

      {message && (
        <Alert
          type={message.type}
          size="md"
          dismissible={message.dismissible !== false && !!onDismissMessage}
          onClose={message.dismissible !== false ? onDismissMessage : undefined}
        >
          {message.text}
        </Alert>
      )}

      {showForm && onSubmit && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          <Input
            label="New password*"
            type="password"
            placeholder="Min. 8 characters"
            trailingIcon={true}
            error={showPasswordError}
            errorMessage="Password must be at least 8 characters"
            hintText={showPasswordError ? 'Password must be at least 8 characters' : 'Must be at least 8 characters.'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
          />
          <Input
            label="Confirm password*"
            type="password"
            placeholder="Repeat your password"
            trailingIcon={true}
            error={showConfirmError}
            errorMessage="Passwords do not match"
            hintText={showConfirmError ? 'Passwords do not match' : ''}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, confirm: true }))}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      )}

      {onBackToSignIn && (
        <div style={{ textAlign: 'center' }}>
          <Button variant="tertiary" size="sm" icon={<ArrowLeft />} iconPosition="left" onClick={onBackToSignIn}>
            Back to sign in
          </Button>
        </div>
      )}
    </div>
  )
}
