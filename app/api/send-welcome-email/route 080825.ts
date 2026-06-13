// /app/api/send-welcome-email/route.ts
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error: resendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: "You're on the ThreadCub waitlist! 🐻",
      html: `<p>Thanks for joining the ThreadCub waitlist!</p>`,
    })

    // Capture the status from Resend's response
    const emailStatus = resendError ? 'Bounced' : 'Delivered'
    
    // Insert the new entry into Supabase with the email status
    const { error: supabaseError } = await supabase.from('waitlist').insert({
      email: email,
      source: 'landing-page',
      status: emailStatus,
    })

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      return NextResponse.json({ error: 'Failed to save waitlist entry' }, { status: 500 })
    }

    if (resendError) {
      console.error('Resend error:', resendError)
      // We still return success here because the entry was saved to the database
      // The status column will show 'Bounced'
      return NextResponse.json({ success: true, message: 'Email failed to send but waitlist entry was saved' })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}