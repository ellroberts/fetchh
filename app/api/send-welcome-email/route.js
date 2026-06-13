import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side inserts
)

export async function POST(request) {
  try {
    const { email, source } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 1. Insert into Supabase waitlist table
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waitlist')
      .insert({
        email,
        source: source || 'landing-page',
        status: 'pending'
      })
      .select()
      .single()

    if (waitlistError) {
      console.error('Supabase insert error:', waitlistError)
      return NextResponse.json(
        { error: 'Failed to add to waitlist' },
        { status: 500 }
      )
    }

    // 2. Send welcome email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'ThreadCub <hello@threadcub.com>',
      to: [email],
      subject: 'Welcome to ThreadCub! You\'re on the waitlist',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ThreadCub!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://threadcub.com/threadcub.png" alt="ThreadCub" style="width: 80px; height: 80px; border-radius: 50%;">
            <h1 style="color: #2563eb; margin: 20px 0 10px; font-size: 28px;">Welcome to ThreadCub!</h1>
            <p style="font-size: 18px; color: #6b7280; margin: 0;">Thanks for joining the waitlist</p>
          </div>

          <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">You're on the waitlist!</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We're working on something special to help you manage long AI conversations. You'll be among the first to know when we launch.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">What happens next:</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">We're reviewing applications in the order received</li>
                <li style="margin-bottom: 8px;">You'll get an email when you're approved</li>
                <li style="margin-bottom: 8px;">Early access to all features</li>
                <li style="margin-bottom: 8px;">No action needed - just sit tight!</li>
              </ol>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              STATUS: On Waitlist
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin-bottom: 10px;">
              Questions?
            </p>
            <p style="margin: 0;">
              <a href="mailto:hello@threadcub.com" style="color: #2563eb; text-decoration: none;">hello@threadcub.com</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px;">
            <p style="margin: 10px 0 0;">
              ThreadCub - Making AI conversations more manageable
            </p>
          </div>

        </body>
        </html>
      `,
      text: `
Welcome to ThreadCub!

Thanks for joining the waitlist! You're now signed up.

What happens next:
1. We're reviewing applications in the order received
2. You'll get an email when you're approved
3. Early access to all features
4. No action needed - just sit tight!

STATUS: On Waitlist

Questions? Email us at hello@threadcub.com

ThreadCub - Making AI conversations more manageable
      `
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      // Email failed but they're in the waitlist, so don't fail the request
    }

    console.log('Waitlist entry created:', waitlistData)
    return NextResponse.json({ success: true, data: waitlistData })

  } catch (error) {
    console.error('Error in waitlist signup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}