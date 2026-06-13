import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Send welcome email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ThreadCub <hello@threadcub.com>',
      to: [email],
      subject: '🎯 Welcome to ThreadCub! You\'re on the waitlist',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ThreadCub!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://threadcub.com/threadcub.png" alt="ThreadCub" style="width: 80px; height: 80px; border-radius: 50%;">
            <h1 style="color: #2563eb; margin: 20px 0 10px; font-size: 28px;">Welcome to ThreadCub!</h1>
            <p style="font-size: 18px; color: #6b7280; margin: 0;">Thanks for confirming your email</p>
          </div>

          <!-- Main Content -->
          <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">🎯 You're on the waitlist!</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! Your email has been confirmed and you've been successfully added to the ThreadCub waitlist.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">⏳ What happens next:</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">We're reviewing applications in the order they were received</li>
                <li style="margin-bottom: 8px;">You'll get an email as soon as you're approved</li>
                <li style="margin-bottom: 8px;">Once approved, you'll have full access to all features</li>
                <li style="margin-bottom: 8px;">No action needed from you - just sit tight!</li>
              </ol>
            </div>
          </div>

          <!-- What You'll Get Access To -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #92400e; font-size: 18px;">🚀 What you'll get access to:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li style="margin-bottom: 8px;">Unlimited conversation analysis</li>
              <li style="margin-bottom: 8px;">Full Coda AI chat access</li>
              <li style="margin-bottom: 8px;">Bulk conversation processing</li>
              <li style="margin-bottom: 8px;">Advanced export features</li>
              <li style="margin-bottom: 8px;">Priority support</li>
            </ul>
          </div>

          <!-- Current Status -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
              📋 STATUS: On Waitlist
            </div>
          </div>

          <!-- Support -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin-bottom: 10px;">
              Questions about your waitlist status?
            </p>
            <p style="margin: 0;">
              <a href="mailto:hello@threadcub.com" style="color: #2563eb; text-decoration: none;">hello@threadcub.com</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0;">
              This email was sent because you confirmed your ThreadCub account.
            </p>
            <p style="margin: 10px 0 0;">
              ThreadCub - Making AI conversations more productive
            </p>
          </div>

        </body>
        </html>
      `,
      // Plain text version
      text: `
🎯 Welcome to ThreadCub!

Thanks for confirming your email! You're now on the ThreadCub waitlist.

What happens next:
1. We're reviewing applications in the order they were received
2. You'll get an email as soon as you're approved
3. Once approved, you'll have full access to all features
4. No action needed from you - just sit tight!

What you'll get access to:
✅ Unlimited conversation analysis
✅ Full Coda AI chat access  
✅ Bulk conversation processing
✅ Advanced export features
✅ Priority support

STATUS: On Waitlist 📋

Questions? Email us at hello@threadcub.com

ThreadCub - Making AI conversations more productive
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    console.log('Welcome email sent successfully:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}