import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const RATING_LABELS: Record<number, string> = {
  1: 'Not helpful',
  2: 'A little helpful',
  3: 'Helpful',
  4: 'Very helpful',
}

export async function POST(req: Request) {
  const body = await req.json()
  const { token, rating, comment } = body as { token: string; rating: number | null; comment: string }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const ratingLabel = rating ? RATING_LABELS[rating] ?? String(rating) : 'No rating given'
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: 'elliot.roberts@gmail.com',
      subject: `Digestt feedback — ${ratingLabel}`,
      text: `Token: ${token}\nRating: ${ratingLabel}\n\nComment:\n${comment || '(none)'}`,
    })
  } catch (err) {
    console.error('try-feedback email error:', err)
  }

  return NextResponse.json({ success: true })
}
