import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { sessionId, email, ids, projectId } = body

    // Require at least one way to identify what to claim/restore
    const hasIdentifiers = !!(sessionId || email)
    const hasIds = Array.isArray(ids) && ids.length > 0
    if (!hasIdentifiers && !hasIds) {
      return NextResponse.json({ error: 'Missing sessionId, email, or ids' }, { status: 400 })
    }

    const updatePayload: Record<string, string | null> = { user_id: user.id }
    if (projectId && typeof projectId === 'string') updatePayload.project_id = projectId

    const claimed: string[] = []

    // ── Pass 1: claim anonymous rows (user_id IS NULL) ───────────────────────
    if (hasIdentifiers) {
      const identifiers: Array<{ column: string; value: string }> = []
      if (sessionId) identifiers.push({ column: 'session_id', value: sessionId })
      if (email) identifiers.push({ column: 'user_email', value: email })

      for (const { column, value } of identifiers) {
        let query = serviceClient
          .from('conversations')
          .update(updatePayload)
          .is('user_id', null)
          .eq(column, value)

        if (hasIds) query = query.in('id', ids)

        const { data, error } = await query.select('id')

        if (error) {
          console.error(`[claim] Supabase error on ${column}:`, error)
          continue // Don't hard-fail — try the next identifier
        }

        if (data) claimed.push(...data.map((r: { id: string }) => r.id))
      }
    }

    // ── Pass 2: restore user's own soft-deleted rows ─────────────────────────
    // Clear removed_at for any selected IDs that already belong to this user
    if (hasIds) {
      let restoreQuery = serviceClient
        .from('conversations')
        .update({ removed_at: null })
        .eq('user_id', user.id)
        .not('removed_at', 'is', null)
        .in('id', ids)

      const { data: restored, error: restoreError } = await restoreQuery.select('id')

      if (restoreError) {
        console.error('[claim] Supabase error (restore pass):', restoreError)
      } else if (restored) {
        claimed.push(...restored.map((r: { id: string }) => r.id))
      }
    }

    return NextResponse.json({ claimed: claimed.length, ids: claimed })
  } catch (err) {
    console.error('[claim] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}