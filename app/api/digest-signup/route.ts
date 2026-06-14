import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const { email, channels } = body as { email: string; channels: string[] }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  if (!Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ error: 'Add at least one YouTube channel URL.' }, { status: 400 })
  }

  if (channels.length > 15) {
    return NextResponse.json({ error: 'Maximum 15 channels allowed.' }, { status: 400 })
  }

  const trimmed = channels.map((c) => c.trim()).filter(Boolean)

  const { error } = await supabase
    .from('digest_signups')
    .insert({ email: email.trim().toLowerCase(), channels: trimmed })

  if (error) {
    console.error('digest_signups insert error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const channelList = trimmed.map((c) => `• ${c}`).join('\n')
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email.trim().toLowerCase(),
      subject: "You're signed up for Digestt",
      text: `You're on the list!\n\nEvery Monday you'll get a digest of the latest from your channels:\n\n${channelList}\n\nSee you Monday.\n— Digestt`,
    })
  } catch (emailError) {
    console.error('Resend email error:', emailError)
  }

  return NextResponse.json({ success: true })
}
