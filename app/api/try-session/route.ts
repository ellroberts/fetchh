import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Niche = 'designers' | 'builders' | 'general'
const VALID_NICHES: Niche[] = ['designers', 'builders', 'general']

export async function POST(req: Request) {
  const body = await req.json()
  const { email, niche } = body as { email: string; niche: string }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  if (!VALID_NICHES.includes(niche as Niche)) {
    return NextResponse.json({ error: 'Invalid niche.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('try_sessions')
    .insert({ email: email.trim().toLowerCase(), niche })
    .select('token')
    .single()

  if (error || !data) {
    console.error('try_sessions insert error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }

  return NextResponse.json({ token: data.token })
}
