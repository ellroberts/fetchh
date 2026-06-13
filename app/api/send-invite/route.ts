import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, waitlistId } = await request.json()

    if (!email || !waitlistId) {
      return NextResponse.json(
        { error: 'Email and waitlistId are required' },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user and send them a password reset email instead of invite
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true, // Auto-confirm their email
      user_metadata: {
        invited_from_waitlist: true
      }
    })

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Now send them a password reset link (which works like an invite)
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: 'https://www.threadcub.com/auth/update-password'
      }
    )

    if (resetError) {
      console.error('Error sending password reset:', resetError)
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      )
    }

    // Update waitlist entry
    const { error: updateError } = await supabaseAdmin
      .from('waitlist')
      .update({ 
        invited: true, 
        status: 'invited' 
      })
      .eq('id', waitlistId)

    if (updateError) {
      console.error('Error updating waitlist:', updateError)
    }

    return NextResponse.json({ 
      success: true,
      message: `Invite sent to ${email}` 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}