import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDigestForUser } from '@/lib/digest-pipeline'

export const maxDuration = 300

export async function GET(req: Request) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: signups, error } = await supabase
    .from('digest_signups')
    .select('email, channels')

  if (error) {
    console.error('[cron/digest] Failed to read signups:', error)
    return NextResponse.json({ error: 'Failed to read signups' }, { status: 500 })
  }

  const results: Array<{ email: string; cards: number; status: 'ok' | 'empty' | 'error'; error?: string }> = []

  for (const signup of signups ?? []) {
    const { email, channels } = signup
    const log = (msg: string) => console.log(`[cron/digest] [${email}] ${msg}`)

    if (!channels?.length) {
      log('No channels — skipping')
      results.push({ email, cards: 0, status: 'empty' })
      continue
    }

    try {
      const result = await runDigestForUser(email, channels, log)
      if (result) {
        results.push({ email, cards: result.cards.length, status: 'ok' })
      } else {
        log('No transcribable videos in the last 7 days')
        results.push({ email, cards: 0, status: 'empty' })
      }
    } catch (err) {
      const message = (err as Error).message
      console.error(`[cron/digest] [${email}] Fatal error:`, message)
      results.push({ email, cards: 0, status: 'error', error: message })
    }
  }

  const summary = {
    processed: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    empty: results.filter(r => r.status === 'empty').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  }

  console.log('[cron/digest] Complete:', JSON.stringify(summary))
  return NextResponse.json(summary)
}
