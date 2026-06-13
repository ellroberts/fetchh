import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/conversations/claimable
 *
 * Returns two categories of conversations merged into one list:
 *   1. Anonymous rows (user_id IS NULL, removed_at IS NULL) matching the
 *      caller's session_id and/or email — pre-login captures.
 *   2. The authenticated user's own soft-deleted rows (removed_at IS NOT NULL).
 *
 * Uses the service-role key to bypass RLS.
 *
 * Query params:
 *   sessionId  - threadcub_session_id from localStorage / cookie
 *   email      - user's email (fallback for users without a session token)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || ''
    const email = searchParams.get('email') || ''

    console.log('[claimable] Searching — sessionId:', sessionId || 'none', '| email:', email || 'none', '| userId:', user.id)

    // ── Query 1: anonymous pre-login captures ────────────────────────────────
    let anonRows: any[] = []
    let removedAtExists = true

    if (sessionId || email) {
      const anonFilters: string[] = []
      if (sessionId) anonFilters.push(`session_id.eq.${sessionId}`)
      if (email) anonFilters.push(`user_email.eq.${email}`)

      const { data, error } = await serviceClient
        .from('conversations')
        .select('id, title, platform, created_at, session_id, user_email')
        .is('user_id', null)
        .is('removed_at', null)
        .or(anonFilters.join(','))
        .order('created_at', { ascending: false })

      if (error) {
        if (error.message?.includes('removed_at')) {
          removedAtExists = false
          // Column may not exist yet — retry without the removed_at filter
          const { data: retryData, error: retryError } = await serviceClient
            .from('conversations')
            .select('id, title, platform, created_at')
            .is('user_id', null)
            .or(anonFilters.join(','))
            .order('created_at', { ascending: false })
          if (retryError) {
            console.error('[claimable] Retry error:', retryError)
            return NextResponse.json({ error: retryError.message }, { status: 500 })
          }
          anonRows = retryData || []
        } else {
          console.error('[claimable] Supabase error (anon query):', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      } else {
        anonRows = data || []
      }
    }

    // ── Query 2: user's own soft-deleted rows ────────────────────────────────
    let removedRows: any[] = []

    if (removedAtExists) {
      const { data, error } = await serviceClient
        .from('conversations')
        .select('id, title, platform, created_at')
        .eq('user_id', user.id)
        .not('removed_at', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        // Non-fatal — log and skip; anon results are still returned
        console.error('[claimable] Supabase error (removed query):', error)
      } else {
        removedRows = data || []
      }
    }

    // ── Merge, dedup by id ───────────────────────────────────────────────────
    const seen = new Set<string>()
    const merged = [...anonRows, ...removedRows].filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })

    console.log('[claimable] Found:', merged.length, '(anon:', anonRows.length, '+ removed:', removedRows.length, ')')

    // Strip internal-only fields before returning
    const result = merged.map(({ session_id: _s, user_email: _e, ...rest }) => rest)
    return NextResponse.json({ conversations: result })
  } catch (err) {
    console.error('[claimable] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/conversations/claimable
 *
 * Hard-deletes all claimable conversations for the authenticated user:
 *   1. Anonymous rows matching sessionId / email (pre-login captures)
 *   2. The user's own soft-deleted rows (removed_at IS NOT NULL)
 *
 * Same query params as GET: sessionId, email
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || ''
    const email = searchParams.get('email') || ''

    // ── Delete anonymous pre-login captures ─────────────────────────────────
    if (sessionId || email) {
      const anonFilters: string[] = []
      if (sessionId) anonFilters.push(`session_id.eq.${sessionId}`)
      if (email) anonFilters.push(`user_email.eq.${email}`)

      const { error } = await serviceClient
        .from('conversations')
        .delete()
        .is('user_id', null)
        .or(anonFilters.join(','))

      if (error) console.error('[claimable DELETE] anon rows error:', error)
    }

    // ── Hard-delete the user's own soft-deleted rows ─────────────────────────
    const { error: removedError } = await serviceClient
      .from('conversations')
      .delete()
      .eq('user_id', user.id)
      .not('removed_at', 'is', null)

    if (removedError) console.error('[claimable DELETE] removed rows error:', removedError)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[claimable DELETE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
