// app/api/reminder-items/route.ts
// GET  /api/reminder-items?conversation_id=X  — list reminder items for a conversation (Chrome extension, Bearer token)
// GET  /api/reminder-items?project_id=X       — list reminder items for a project (app internal, cookie auth)
// POST /api/reminder-items                    — create a reminder item (Chrome extension)
import { createClient } from '../../../lib/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const { title, detail, source_chunk, project_id, source_conversation_ids, tags, tag_colours } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400, headers: corsHeaders })
    }

    const { data, error } = await supabase
      .from('reminder_items')
      .insert({
        user_id: user.id,
        title,
        detail: detail ?? '',
        source_chunk: source_chunk ?? null,
        project_id: project_id ?? null,
        source_conversation_ids: source_conversation_ids ?? [],
        tags: tags ?? [],
        tag_colours: tag_colours ?? null,
        status: 'open',
        completed_at: null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to insert reminder item:', error)
      return NextResponse.json({ error: 'Failed to save reminder item' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true, id: data.id }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const conversationId = searchParams.get('conversation_id')
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  // Bearer token path (Chrome extension): query by conversation_id
  if (token && conversationId) {
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }
    try {
      const { data, error } = await supabase
        .from('reminder_items')
        .select('*')
        .eq('user_id', user.id)
        .overlaps('source_conversation_ids', [conversationId])
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Failed to fetch reminder items:', error)
        return NextResponse.json({ error: 'Failed to fetch reminder items' }, { status: 500, headers: corsHeaders })
      }
      return NextResponse.json({ reminder_items: data ?? [] }, { headers: corsHeaders })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders })
    }
  }

  // Cookie-based path (app internal): query by project_id
  if (!projectId) {
    return NextResponse.json({ error: 'project_id or conversation_id is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('reminder_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch reminder items:', error)
      return NextResponse.json({ error: 'Failed to fetch reminder items' }, { status: 500 })
    }

    return NextResponse.json({ reminder_items: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
