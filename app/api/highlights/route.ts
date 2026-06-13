// app/api/highlights/route.ts
// POST /api/highlights — create a highlight from the Chrome extension
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id is required' }, { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  try {
    const { data: highlights, error } = await supabase
      .from('highlights')
      .select('*')
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch highlights:', error)
      return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ highlights: highlights ?? [] }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const {
      highlighted_text,
      source_url,
      source_title,
      source_platform,
      surrounding_context,
      source_chat_id,
      conversation_id,
      msg_index,
      notes,
      tags,
      tag_colours,
    } = body

    if (!highlighted_text || !source_url || !source_platform) {
      return NextResponse.json(
        { error: 'highlighted_text, source_url, and source_platform are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { data, error } = await supabase
      .from('highlights')
      .insert({
        user_id: user.id,
        highlighted_text,
        source_url,
        source_title: source_title ?? null,
        source_platform,
        surrounding_context: surrounding_context ?? null,
        source_chat_id: source_chat_id ?? null,
        conversation_id: conversation_id ?? null,
        msg_index: msg_index ?? null,
        notes: notes ?? '',
        tags: tags ?? [],
        tag_colours: tag_colours ?? null,
        is_archived: false,
        is_pinned: false,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to insert highlight:', error)
      return NextResponse.json({ error: 'Failed to save highlight' }, { status: 500, headers: corsHeaders })
    }

    // Upsert conversation record if we have a conversation_id
    if (conversation_id) {
      const { error: upsertError } = await supabase
        .from('conversations')
        .upsert(
          {
            id: conversation_id,
            user_id: user.id,
            platform: source_platform,
            source: source_url,
            title: source_title ?? null,
            capture_method: 'highlight',
            updated_at: new Date().toISOString(),
            is_pinned: false,
          },
          {
            onConflict: 'id',
            ignoreDuplicates: false,
          }
        )

      if (upsertError) {
        // Log but don't fail the request — highlight was saved successfully
        console.error('Failed to upsert conversation:', upsertError)
      }
    }

    return NextResponse.json({ success: true, id: data.id }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders })
  }
}