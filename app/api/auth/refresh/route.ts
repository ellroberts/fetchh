import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json()
    if (!refresh_token) return NextResponse.json({ error: 'No refresh token' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.refreshSession({ refresh_token })
    if (error || !data.session) return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
