// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-session-id',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(req) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400, headers: corsHeaders });
  }

  try {
    const { data: conversation, error: fetchError } = await serviceClient
      .from('conversations')
      .select('id, user_id, session_id')
      .eq('id', id)
      .single();

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404, headers: corsHeaders });
    }

    if (conversation.user_id === null) {
      // Guest delete — verify session_id
      const sessionId = req.headers.get('x-session-id') || new URL(req.url).searchParams.get('session_id');
      if (!sessionId || sessionId !== conversation.session_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
    } else {
      // Authenticated delete — verify bearer token
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
      if (authError || !user || user.id !== conversation.user_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
    }

    // Soft delete — clear user_id and set removed_at so the row stays claimable
    const { error: deleteError } = await serviceClient
      .from('conversations')
      .update({ user_id: null, removed_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('[delete] Supabase soft delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500, headers: corsHeaders });
    }

    // Cascade: hard-delete associated content for this conversation
    await Promise.all([
      serviceClient.from('highlights').delete().eq('conversation_id', id),
      serviceClient.from('action_items').delete().contains('source_conversation_ids', [id]),
      serviceClient.from('reminder_items').delete().contains('source_conversation_ids', [id]),
    ]);

    console.log(`[delete] Conversation ${id} soft deleted (removed_at set, user_id cleared); associated highlights/actions/reminders deleted`);
    return NextResponse.json({ success: true, deleted: id }, { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('[delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}