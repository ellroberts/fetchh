import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '../../../../lib/utils/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await supabaseAdmin.from('user_tags').delete().eq('user_id', userId)

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteAuthError) return NextResponse.json({ error: deleteAuthError.message }, { status: 500 })

  // Explicit cleanup in case there is no FK cascade
  await supabaseAdmin.from('user_profiles').delete().eq('id', userId)

  return NextResponse.json({ ok: true })
}
