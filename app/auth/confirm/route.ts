// @ts-nocheck
// app/auth/confirm/route.js
// This version auto-logs in the user after confirming their email AND sends welcome email

import { createClient } from '../../../lib/utils/supabase/server.js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    
    try {
      // Exchange the code for a session (this also logs them in!)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data?.session) {
        // Success! User is now confirmed AND logged in
        console.log('✅ Email confirmed for user:', data.user.email)
        
        // Send welcome email (don't block the redirect if this fails)
        try {
          const welcomeEmailResponse = await fetch(`${requestUrl.origin}/api/send-welcome-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: data.user.email
            })
          })
          
          if (welcomeEmailResponse.ok) {
            console.log('✅ Welcome email sent to:', data.user.email)
          } else {
            console.error('❌ Welcome email failed:', await welcomeEmailResponse.text())
          }
        } catch (emailError) {
          console.error('❌ Welcome email error:', emailError)
          // Don't block the user flow if email fails
        }
        
        // Redirect to dashboard with a success message
        const dashboardUrl = new URL('/dashboard', requestUrl.origin)
        dashboardUrl.searchParams.set('confirmed', 'true')
        return NextResponse.redirect(dashboardUrl)
      } else {
        console.error('Exchange code error:', error)
        // Redirect to error page with error message
        return NextResponse.redirect(
          new URL(`/auth/confirm-error?error=${encodeURIComponent(error?.message || 'Unknown error')}`, requestUrl.origin)
        )
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      return NextResponse.redirect(
        new URL('/auth/confirm-error?error=unexpected', requestUrl.origin)
      )
    }
  }

  // No code provided - redirect to error
  return NextResponse.redirect(
    new URL('/auth/confirm-error?error=missing_code', requestUrl.origin)
  )
}