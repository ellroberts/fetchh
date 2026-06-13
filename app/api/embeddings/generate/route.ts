import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/utils/supabase/server'
import { embedConversation } from '../../../../lib/embed-conversation'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier ?? 'free'

    if (tier === 'free') {
      return NextResponse.json({ error: 'Not available on free plan', upgrade_required: true }, { status: 402 })
    }

    const body = await req.json()
    const conversationId = body.conversationId || body.conversation_id
    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })
    }
    await embedConversation(conversationId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Embedding error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
