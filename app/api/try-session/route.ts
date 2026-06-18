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
  const { name, niche } = body as { name: string; niche: string }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }

  if (!VALID_NICHES.includes(niche as Niche)) {
    return NextResponse.json({ error: 'Invalid niche.' }, { status: 400 })
  }

  const identifier = name.trim()

  // Reuse existing session for this identifier
  const { data: existing } = await supabase
    .from('try_sessions')
    .select('token, try_count')
    .eq('email', identifier)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    if (existing.try_count >= 3) {
      return NextResponse.json({ error: 'limit_reached' }, { status: 403 })
    }
    return NextResponse.json({ token: existing.token })
  }

  const { data, error } = await supabase
    .from('try_sessions')
    .insert({ email: identifier, niche })
    .select('token')
    .single()

  if (error || !data) {
    console.error('try_sessions insert error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }

  return NextResponse.json({ token: data.token })
}
