// app/api/reminder-items/[id]/route.ts
// PATCH  /api/reminder-items/:id — update status, detail (notes), or tags
// DELETE /api/reminder-items/:id — delete a reminder item (Chrome extension)
import { createClient } from '../../../../lib/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  try {
    const { id } = await params
    const body = await request.json()

    // Bearer token path (Chrome extension) — supports detail and tags fields
    if (token) {
      const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }

      const updates: Record<string, unknown> = {}
      if ('detail' in body) updates.detail = body.detail
      if ('tags' in body) updates.tags = body.tags
      if ('tag_colours' in body) updates.tag_colours = body.tag_colours
      if ('status' in body) {
        if (body.status !== 'open' && body.status !== 'done') {
          return NextResponse.json({ error: 'status must be "open" or "done"' }, { status: 400, headers: corsHeaders })
        }
        updates.status = body.status
        updates.completed_at = body.status === 'done' ? new Date().toISOString() : null
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: corsHeaders })
      }

      const { error } = await supabase
        .from('reminder_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to update reminder item:', error)
        return NextResponse.json({ error: 'Failed to update reminder item' }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ success: true }, { headers: corsHeaders })
    }

    // Cookie-based path (app internal) — status toggle only
    const { status } = body
    if (status !== 'open' && status !== 'done') {
      return NextResponse.json({ error: 'status must be "open" or "done"' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('reminder_items')
      .update({
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update reminder item:', error)
      return NextResponse.json({ error: 'Failed to update reminder item' }, { status: 500 })
    }

    return NextResponse.json({ reminder_item: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { error } = await supabase
      .from('reminder_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete reminder item:', error)
      return NextResponse.json({ error: 'Failed to delete reminder item' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders })
  }
}
