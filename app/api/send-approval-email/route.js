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

    // Send approval email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ThreadCub <hello@threadcub.com>',
      to: [email],
      subject: 'You\'re approved for ThreadCub!',
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
            <p style="font-size: 18px; color: #6b7280; margin: 0;">You're now approved for full access</p>
          </div>

          <!-- Main Content -->
          <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! Your waitlist application has been approved. You now have full access to all ThreadCub features.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #059669; font-size: 18px;">✅ What's unlocked:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Unlimited conversation analysis</li>
                <li style="margin-bottom: 8px;">Full Coda AI chat access</li>
                <li style="margin-bottom: 8px;">Bulk conversation processing</li>
                <li style="margin-bottom: 8px;">Advanced export features</li>
                <li style="margin-bottom: 8px;">Priority support</li>
              </ul>
            </div>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://threadcub.com/auth" 
               style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Sign in now
            </a>
          </div>

          <!-- Getting Started Tips -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #92400e; font-size: 18px;">💡 Getting Started Tips:</h3>
            <ol style="margin: 0; padding-left: 20px; color: #92400e;">
              <li style="margin-bottom: 8px;">Install our Chrome extension to save conversations</li>
              <li style="margin-bottom: 8px;">Try analyzing your first conversation for AI insights</li>
              <li style="margin-bottom: 8px;">Use Coda AI to get help with your conversations</li>
              <li style="margin-bottom: 8px;">Explore the bulk analysis feature for multiple conversations</li>
            </ol>
          </div>

          <!-- Support -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin-bottom: 10px;">
              Need help getting started? We're here for you!
            </p>
            <p style="margin: 0;">
              <a href="mailto:hello@threadcub.com" style="color: #2563eb; text-decoration: none;">hello@threadcub.com</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0;">
              This email was sent because you were approved for ThreadCub access.
            </p>
            <p style="margin: 10px 0 0;">
              ThreadCub - Making AI conversations more productive
            </p>
          </div>

        </body>
        </html>
      `,
      // Also include a plain text version
      text: `
🎉 Welcome to ThreadCub!

Congratulations! Your waitlist application has been approved. You now have full access to all ThreadCub features.

What's unlocked:
✅ Unlimited conversation analysis
✅ Full Coda AI chat access  
✅ Bulk conversation processing
✅ Advanced export features
✅ Priority support

Access your dashboard: https://threadcub.com/auth

Getting Started Tips:
1. Install our Chrome extension to save conversations
2. Try analyzing your first conversation for AI insights
3. Use Coda AI to get help with your conversations
4. Explore the bulk analysis feature for multiple conversations

Need help? Email us at hello@threadcub.com

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

    console.log('Approval email sent successfully:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error sending approval email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}